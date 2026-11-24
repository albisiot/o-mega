"use client";

import { useState, type FormEvent } from "react";
import { BackLink } from "@/components/comic-parts";
import { ModeGate } from "@/components/mode-gate";
import { describeServerError } from "@/lib/errors";
import { toRomeInput } from "@/lib/events";
import {
  draftAsRow,
  GAME_MODES,
  MODE_LABEL_MAX,
  MODE_LABEL_PRESETS,
  MODE_UNAVAILABLE,
  modeDraftProblem,
  modeStatus,
  romeInputToInstant,
  saveModeAvailability,
  type AdminModes,
  type GameModeKey,
  type ModeAvailability,
  type ModeDraft,
  type ModeState,
} from "@/lib/mode-availability";
import { useLockedScreen } from "@/lib/use-locked-screen";
import { useNow } from "@/lib/use-now";

/** Each mode's button colors, as Gioca draws it. */
const MODE_LOOKS: Record<GameModeKey, string> = {
  classic: "bg-comic-magenta",
  boss: "bg-comic-orange",
  triple: "bg-comic-yellow",
  quadrant: "bg-comic-cyan",
  quadrant_shifting: "bg-comic-cyan",
  ranked: "rays-gold",
  conquest: "bg-comic-magenta",
  story: "rays-gold",
  emergency: "bg-foreground",
  emergency_week: "bg-foreground",
  coop: "bg-comic-cyan",
  raid: "bg-comic-orange",
  combat: "bg-comic-yellow",
};

const STATES: { key: ModeState; label: string }[] = [
  { key: "on", label: "Sempre attiva" },
  { key: "window", label: "Da data a data" },
  { key: "off", label: "Spenta" },
];

const romeShort = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Europe/Rome",
});

/** "3 dic 18:00", Rome time. */
function shortRome(iso: string): string {
  return romeShort.format(new Date(iso)).replace(",", "").replace(".", "");
}

/** The state in a few words, for the list. */
function describeState(row: ModeAvailability | undefined): string {
  if (!row || row.state === "on") return "Sempre attiva";
  if (row.state === "off") return "Spenta";
  return row.starts_at && row.ends_at ? `${shortRome(row.starts_at)} → ${shortRome(row.ends_at)}` : "Da data a data";
}

function draftOf(key: GameModeKey, row: ModeAvailability | undefined): ModeDraft {
  return {
    key,
    state: row?.state ?? "on",
    startsAt: row?.starts_at ? toRomeInput(row.starts_at) : "",
    endsAt: row?.ends_at ? toRomeInput(row.ends_at) : "",
    label: row?.label ?? "",
  };
}

/** A mode's button as the players see it now: its colors, the veil when closed, the label. */
function ButtonPreview({ name, look, row, now, large = false }: { name: string; look: string; row: ModeAvailability | undefined; now: number; large?: boolean }) {
  const status = modeStatus(row, now);
  return (
    <span
      className={`cut-both speed-lines relative flex shrink-0 flex-col justify-center overflow-hidden text-left text-black ${look} ${
        large ? "min-h-16 px-4 py-2" : "h-12 w-28 px-2 py-1"
      }`}
    >
      <span className={`-skew-x-8 font-display uppercase ${large ? "text-[26px] leading-7" : "line-clamp-2 text-[15px] leading-[17px]"}`}>{name}</span>
      <ModeGate status={status} compact={!large} />
    </span>
  );
}

/**
 * EDITOR → Modalità di gioco: when each mode is open and the label on its button. The page fits
 * the phone and never scrolls: the list scrolls inside, and a mode opens its form in its place.
 * The server checks the admin and every value, and refuses every start in a closed mode.
 */
export function ModeAdmin({ initial }: { initial: AdminModes }) {
  useLockedScreen(true);
  const now = useNow(30_000);
  const [rows, setRows] = useState<ModeAvailability[]>(initial.modes);
  const [editing, setEditing] = useState<GameModeKey | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const byKey = Object.fromEntries(rows.map((row) => [row.key, row])) as Partial<Record<GameModeKey, ModeAvailability>>;
  const mode = editing ? GAME_MODES.find((item) => item.key === editing) : null;

  return (
    <div className="game-shell">
      <header className="flex shrink-0 items-center gap-2.5 px-3 pb-1 pt-2">
        <BackLink href="/editor" />
        <div className="min-w-0">
          <h1 className="truncate font-display text-[32px] uppercase leading-9 text-comic-yellow">Modalità</h1>
          <p className="text-xs font-semibold leading-4 text-muted">Quando si gioca, e l&apos;etichetta sul pulsante. Ora italiana.</p>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col gap-2 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-1">
        {mode ? (
          <ModeForm
            key={mode.key}
            name={mode.name}
            detail={mode.detail}
            look={MODE_LOOKS[mode.key]}
            initial={draftOf(mode.key, byKey[mode.key])}
            now={now}
            onBack={() => setEditing(null)}
            onSaved={(next) => {
              setRows(next.modes);
              setSaved(mode.name);
              setEditing(null);
            }}
          />
        ) : (
          <>
            <div aria-live="polite" className="shrink-0 empty:hidden">
              {saved && <p className="bg-panel px-3 py-2 text-sm font-bold">{saved}: salvata, vale da subito.</p>}
            </div>
            <ul aria-label="Modalità di gioco" className="-mx-1 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto overscroll-contain px-1 pb-1">
              {GAME_MODES.map((item) => {
                const row = byKey[item.key];
                const status = modeStatus(row, now);
                return (
                  <li key={item.key} className={item.parent ? "pl-5" : undefined}>
                    <button
                      type="button"
                      onClick={() => {
                        setSaved(null);
                        setEditing(item.key);
                      }}
                      className="flex min-h-14 w-full items-center gap-2.5 bg-panel px-2 py-1.5 text-left active:translate-x-px active:translate-y-px"
                    >
                      <ButtonPreview name={item.name} look={MODE_LOOKS[item.key]} row={row} now={now} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-extrabold leading-5">{describeState(row)}</span>
                        <span className={`block truncate text-xs font-bold leading-4 ${status.open ? "text-comic-cyan" : "text-comic-magenta"}`}>
                          {status.open ? "Si gioca ora" : "Chiusa ora"}
                          {row?.label ? ` · «${row.label}»` : ""}
                        </span>
                      </span>
                      <span className="font-display text-xl text-comic-yellow" aria-hidden>
                        →
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="shrink-0 text-[11px] font-semibold leading-[14px] text-muted">
              Una modalità chiusa resta visibile, sotto un velo: al tocco dice «{MODE_UNAVAILABLE}» Le partite già iniziate finiscono.
            </p>
          </>
        )}
      </main>
    </div>
  );
}

function ModeForm({
  name,
  detail,
  look,
  initial,
  now,
  onBack,
  onSaved,
}: {
  name: string;
  detail: string;
  look: string;
  initial: ModeDraft;
  now: number;
  onBack: () => void;
  onSaved: (next: AdminModes) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const problem = modeDraftProblem(draft);
  const changed = JSON.stringify(draft) !== JSON.stringify(initial);
  const preview = draftAsRow(draft, romeInputToInstant);
  const status = modeStatus(preview, now);
  const set = (patch: Partial<ModeDraft>) => {
    setError(null);
    setDraft((current) => ({ ...current, ...patch }));
  };

  function pickState(state: ModeState) {
    // A first period: from the next full hour, for a week.
    if (state === "window" && (!draft.startsAt || !draft.endsAt)) {
      const start = toRomeInput(Math.ceil(now / 3_600_000) * 3_600_000);
      const end = toRomeInput(Math.ceil(now / 3_600_000) * 3_600_000 + 7 * 86_400_000);
      set({ state, startsAt: draft.startsAt || start, endsAt: draft.endsAt || end });
    } else {
      set({ state });
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (problem) return;
    setBusy(true);
    setError(null);
    try {
      onSaved(await saveModeAvailability(draft));
    } catch (cause) {
      setError(describeServerError(cause));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="flex min-h-0 flex-1 flex-col gap-2">
      <button type="button" onClick={onBack} className="flex min-h-9 shrink-0 items-center gap-1.5 self-start text-sm font-bold underline">
        ← Tutte le modalità
      </button>
      <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-1 pb-1">
        <section className="flex shrink-0 flex-col gap-1.5 bg-panel p-2.5" aria-label="Anteprima">
          <h2 className="text-[11px] font-extrabold uppercase leading-4 text-muted">Anteprima · {detail}</h2>
          <ButtonPreview name={name} look={look} row={preview} now={now} large />
          <p className={`text-xs font-bold leading-4 ${status.open ? "text-comic-cyan" : "text-comic-magenta"}`}>
            {status.open
              ? status.label
                ? "Si gioca ora: l'etichetta non blocca nulla."
                : "Si gioca ora."
              : `Chiusa ora: al tocco «${MODE_UNAVAILABLE}»`}
            {status.auto ? " L'etichetta la mette il gioco: scrivine una per cambiarla." : ""}
          </p>
        </section>

        <fieldset className="flex shrink-0 flex-col gap-1.5">
          <legend className="mb-1 text-sm font-bold">Quando si gioca</legend>
          <div role="radiogroup" aria-label="Stato" className="grid grid-cols-3 gap-1.5">
            {STATES.map((option) => (
              <button
                key={option.key}
                type="button"
                role="radio"
                aria-checked={draft.state === option.key}
                onClick={() => pickState(option.key)}
                className={`min-h-11 px-1 font-display text-[15px] uppercase leading-[17px] ${
                  draft.state === option.key ? "bg-foreground text-black" : "bg-panel text-foreground"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {draft.state === "window" && (
            <div className="grid grid-cols-2 gap-1.5">
              <label className="flex min-w-0 flex-col gap-1 text-xs font-bold">
                Dal
                <input
                  type="datetime-local"
                  value={draft.startsAt}
                  onChange={(event) => set({ startsAt: event.target.value })}
                  className="input-comic min-w-0 px-1.5 text-sm"
                />
              </label>
              <label className="flex min-w-0 flex-col gap-1 text-xs font-bold">
                Al
                <input
                  type="datetime-local"
                  value={draft.endsAt}
                  onChange={(event) => set({ endsAt: event.target.value })}
                  className="input-comic min-w-0 px-1.5 text-sm"
                />
              </label>
              <p className="col-span-2 text-[11px] font-semibold leading-[14px] text-muted">
                Ora italiana. Prima dell&apos;inizio e dopo la fine è chiusa, come spenta.
              </p>
            </div>
          )}
        </fieldset>

        <fieldset className="flex shrink-0 flex-col gap-1.5">
          <legend className="mb-1 text-sm font-bold">Etichetta sul pulsante</legend>
          <div className="flex flex-wrap gap-1.5">
            {["", ...MODE_LABEL_PRESETS].map((preset) => {
              const chosen = draft.label.trim() === preset;
              return (
                <button
                  key={preset || "none"}
                  type="button"
                  aria-pressed={chosen}
                  onClick={() => set({ label: preset })}
                  className={`min-h-9 px-2.5 text-sm font-extrabold ${chosen ? "bg-comic-yellow text-black" : "bg-panel text-foreground"}`}
                >
                  {preset || "Nessuna"}
                </button>
              );
            })}
          </div>
          <label className="flex items-center gap-2">
            <input
              value={draft.label}
              onChange={(event) => set({ label: event.target.value })}
              maxLength={MODE_LABEL_MAX}
              placeholder="Oppure scrivila tu"
              aria-label="Etichetta"
              className="input-comic min-w-0 flex-1"
            />
            <span className="w-11 shrink-0 text-right text-xs font-bold text-muted">
              {draft.label.trim().length}/{MODE_LABEL_MAX}
            </span>
          </label>
          <p className="text-[11px] font-semibold leading-[14px] text-muted">
            Vale in ogni stato: «Nuova» su una attiva, «Prossimamente» su una spenta. Senza etichetta, una modalità chiusa
            mostra «Dal 3 dic», «Finita» o «Non attiva».
          </p>
        </fieldset>
      </div>

      <div className="flex shrink-0 flex-col gap-1">
        {(error ?? problem) && (
          <p role="alert" className="text-sm font-semibold text-comic-magenta">
            {error ?? problem}
          </p>
        )}
        <button type="submit" disabled={!changed || problem !== null || busy} className="btn btn-primary min-h-12 disabled:opacity-60">
          {busy ? "Salvataggio…" : changed ? `Salva ${name}` : "Nessuna modifica"}
        </button>
      </div>
    </form>
  );
}
