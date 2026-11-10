"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { describeServerError } from "@/lib/errors";
import {
  DIFFICULTY_LABELS,
  claimDailyObjective,
  claimableCount,
  describeObjectiveReward,
  fetchDailyObjectives,
  isClaimable,
  refreshDailyObjective,
  seenDailyObjectives,
  summarizeObjectives,
  type DailyObjective,
  type DailyObjectives,
  type ObjectiveDifficulty,
} from "@/lib/objectives";
import { packRevealHref } from "@/lib/packs";
import { formatCountdown, useNow } from "@/lib/use-now";

const DIFFICULTY_COLORS: Record<ObjectiveDifficulty, string> = {
  easy: "bg-comic-cyan",
  medium: "bg-comic-yellow",
  hard: "bg-comic-magenta",
};

/** Today's objectives: what was last seen at once, then the server's fresh answer. */
export function useDailyObjectives() {
  const [objectives, setObjectives] = useState<DailyObjectives | null>(() => seenDailyObjectives());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchDailyObjectives()
      .then((next) => {
        if (!cancelled) setObjectives(next);
      })
      .catch((reason: unknown) => {
        console.error("Daily objectives failed", reason);
        if (!cancelled) setError(describeServerError(reason));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { objectives, setObjectives, error };
}

/** On the home: a slim bar to the objectives, bright when a reward waits to be claimed. */
export function HomeObjectivesBar() {
  const { objectives } = useDailyObjectives();
  const toClaim = claimableCount(objectives);

  return (
    <Link
      href="/obiettivi/"
      className={`flex min-h-11 shrink-0 items-center justify-between gap-3 px-3.5 py-1 short:min-h-10 ${
        toClaim > 0 ? "bg-comic-yellow text-black" : "bg-panel"
      }`}
    >
      <span className="min-w-0">
        <span className="block font-display text-[17px] uppercase leading-5">Obiettivi del giorno</span>
        <span className={`block truncate text-[13px] font-bold leading-4 ${toClaim > 0 ? "" : "text-muted"}`}>
          {objectives ? summarizeObjectives(objectives) : "…"}
        </span>
      </span>
      {toClaim > 0 ? (
        <span className="relative shrink-0 -skew-x-8 bg-black px-2.5 py-1 font-display text-base uppercase text-comic-yellow">
          Riscatta
          <span aria-hidden className="absolute -right-1 -top-1 size-2.5 animate-ping rounded-full bg-comic-magenta" />
          <span aria-hidden className="absolute -right-1 -top-1 size-2.5 rounded-full bg-comic-magenta" />
        </span>
      ) : (
        <span aria-hidden className="shrink-0 font-display text-[22px]">
          →
        </span>
      )}
    </Link>
  );
}

/** The objectives page: progress, rewards to claim and swaps left. */
export function DailyObjectivesView() {
  const router = useRouter();
  const { objectives, setObjectives, error: loadError } = useDailyObjectives();
  const now = useNow(30_000);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ id: string; text: string; failed: boolean } | null>(null);

  if (!objectives) {
    return <p className="text-sm font-semibold text-muted">{loadError ?? "Caricamento degli obiettivi…"}</p>;
  }

  const claim = (objective: DailyObjective) => {
    setBusy(objective.id);
    setMessage(null);
    claimDailyObjective(objective.id)
      .then((result) => {
        if (result.opening_ids.length > 0) {
          router.push(packRevealHref(result.opening_ids));
          return;
        }
        setMessage({ id: objective.id, text: `+${result.coins} monete!`, failed: false });
        return fetchDailyObjectives().then(setObjectives);
      })
      .catch((reason: unknown) => setMessage({ id: objective.id, text: describeServerError(reason), failed: true }))
      .finally(() => setBusy(null));
  };

  const refresh = (objective: DailyObjective) => {
    setBusy(objective.id);
    setMessage(null);
    refreshDailyObjective(objective.id)
      .then(setObjectives)
      .catch((reason: unknown) => setMessage({ id: objective.id, text: describeServerError(reason), failed: true }))
      .finally(() => setBusy(null));
  };

  const resetsIn = Date.parse(objectives.resets_at) - now;

  return (
    <>
      <section className="flex shrink-0 items-end justify-between gap-3">
        <p className="font-display text-xl uppercase leading-6 text-comic-yellow">
          Nuovi tra {formatCountdown(Math.max(0, resetsIn))}
        </p>
        <p className="text-right text-[13px] font-bold leading-4">
          Cambi rimasti
          <span className="ml-1.5 font-display text-xl text-comic-cyan">
            {objectives.refreshes_left}/{objectives.refreshes_per_day}
          </span>
        </p>
      </section>

      <ol className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain">
        {objectives.objectives.map((objective) => (
          <ObjectiveCard
            key={objective.id}
            objective={objective}
            busy={busy === objective.id}
            disabled={busy !== null}
            canRefresh={objectives.refreshes_left > 0}
            message={message?.id === objective.id ? message : null}
            onClaim={() => claim(objective)}
            onRefresh={() => refresh(objective)}
          />
        ))}
        {objectives.objectives.length === 0 && (
          <li className="text-sm font-semibold text-muted">Nessun obiettivo oggi: torna domani.</li>
        )}
      </ol>

      <p className="shrink-0 text-xs font-medium leading-4 text-muted">
        Il progresso avanza da solo giocando; le partite abbandonate non contano. Obiettivi e premi non riscattati scadono a
        mezzanotte. Puoi cambiare solo gli obiettivi non ancora completati.
      </p>
    </>
  );
}

function ObjectiveCard({
  objective,
  busy,
  disabled,
  canRefresh,
  message,
  onClaim,
  onRefresh,
}: {
  objective: DailyObjective;
  busy: boolean;
  disabled: boolean;
  canRefresh: boolean;
  message: { text: string; failed: boolean } | null;
  onClaim: () => void;
  onRefresh: () => void;
}) {
  const claimable = isClaimable(objective);
  const fraction = Math.min(1, objective.progress / objective.target);

  return (
    <li
      className={`flex shrink-0 flex-col gap-1.5 px-3 py-2.5 ${
        claimable ? "bg-comic-yellow text-black" : objective.claimed ? "bg-panel opacity-70" : "bg-panel"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`-skew-x-8 px-1.5 py-0.5 text-[11px] font-extrabold uppercase leading-4 ${
            claimable ? "bg-black text-comic-yellow" : `${DIFFICULTY_COLORS[objective.difficulty]} text-black`
          }`}
        >
          {DIFFICULTY_LABELS[objective.difficulty]}
        </span>
        <span className={`text-right text-[13px] font-extrabold leading-4 ${claimable ? "" : "text-comic-yellow"}`}>
          {describeObjectiveReward(objective)}
        </span>
      </div>

      <p className="font-display text-[21px] uppercase leading-6">{objective.title}</p>

      <div className="flex items-center gap-2">
        <div className="h-2.5 flex-1 bg-black" aria-hidden>
          <div
            className={`h-full ${claimable || objective.claimed ? "bg-comic-magenta" : "bg-comic-yellow"}`}
            style={{ width: `${Math.round(fraction * 100)}%` }}
          />
        </div>
        <span className="w-12 text-right text-[13px] font-extrabold tabular-nums">
          {objective.progress}/{objective.target}
        </span>
      </div>

      {message && (
        <p className={`text-[13px] font-bold leading-4 ${message.failed ? "text-comic-magenta" : ""}`} role="status">
          {message.text}
        </p>
      )}

      {claimable ? (
        <button type="button" onClick={onClaim} disabled={disabled} className="btn btn-primary min-h-11">
          {busy ? "Riscatto…" : "Riscatta il premio"}
        </button>
      ) : objective.claimed ? (
        <p className="text-[13px] font-extrabold uppercase leading-4 text-comic-cyan">Premio riscattato ✓</p>
      ) : (
        <button
          type="button"
          onClick={onRefresh}
          disabled={disabled || !canRefresh}
          className="min-h-11 self-end px-2 text-[13px] font-extrabold uppercase text-comic-cyan underline decoration-2 underline-offset-4 disabled:text-muted disabled:no-underline"
        >
          {busy ? "Cambio…" : canRefresh ? "↻ Cambia obiettivo" : "Nessun cambio rimasto"}
        </button>
      )}
    </li>
  );
}
