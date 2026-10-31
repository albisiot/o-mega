"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRequireSignedIn } from "@/components/auth-provider";
import { PageHeader } from "@/components/comic-parts";
import { LoadingScreen } from "@/components/loading-screen";
import { describeServerError } from "@/lib/errors";
import { DIFFICULTY_LABELS, fetchMatchHistory, type MatchHistoryEntry } from "@/lib/match";

const RESULT_STYLES = {
  win: { label: "Vittoria", className: "text-comic-cyan" },
  loss: { label: "Sconfitta", className: "text-comic-magenta" },
  draw: { label: "Pareggio", className: "text-muted" },
} as const;

const dateTime = new Intl.DateTimeFormat("it-IT", { dateStyle: "short", timeStyle: "short" });

export default function HistoryPage() {
  const { session } = useRequireSignedIn();
  const [history, setHistory] = useState<MatchHistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    fetchMatchHistory()
      .then((entries) => {
        if (!cancelled) setHistory(entries);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(describeServerError(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  if (!history && !error) return <LoadingScreen />;

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader backHref="/profilo" backLabel="Profilo" title="Storico partite" />

      <main className="flex flex-1 flex-col gap-2 px-3 pb-6">
        {error && <p className="text-sm font-semibold text-comic-magenta">{error}</p>}
        {history?.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm font-medium text-muted">Non hai ancora finito nessuna partita.</p>
            <Link href="/gioca" className="btn btn-primary px-6">
              Gioca
            </Link>
          </div>
        )}
        <ul className="flex flex-col gap-2">
          {history?.map((entry) => (
            <li key={entry.id}>
              <HistoryRow entry={entry} />
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}

function HistoryRow({ entry }: { entry: MatchHistoryEntry }) {
  const result = RESULT_STYLES[entry.result];
  const mode =
    entry.mode === "bot"
      ? `Bot ${DIFFICULTY_LABELS[entry.bot_difficulty ?? "easy"]}`
      : `${entry.mode === "conquest" ? "Conquista" : "Amichevole"} · ${
          entry.bot_difficulty ? `Bot ${DIFFICULTY_LABELS[entry.bot_difficulty]}` : (entry.opponent ?? "giocatore rimosso")
        }`;

  return (
    <Link href={`/partita/?id=${entry.id}`} className="row-link">
      <div className="min-w-0">
        <p className="truncate text-sm font-bold">{mode}</p>
        <p className="text-xs font-medium text-muted">
          {dateTime.format(new Date(entry.finished_at))}
          {entry.end_reason === "forfeit" && " · abbandono"}
        </p>
        <ConquestLine entry={entry} />
      </div>
      <div className="shrink-0 text-right">
        <p className={`font-display text-lg uppercase ${result.className}`}>{result.label}</p>
        <p className="font-display text-base">
          {entry.rounds_me} – {entry.rounds_opponent}
        </p>
        {entry.coins > 0 && <p className="text-xs font-bold text-comic-yellow">+{entry.coins} monete</p>}
      </div>
    </Link>
  );
}

function ConquestLine({ entry }: { entry: MatchHistoryEntry }) {
  const conquest = entry.conquest;
  if (!conquest) return null;
  if (conquest.pending) return <p className="text-xs font-medium text-muted">Scelta della carta in corso…</p>;
  if (conquest.card_name) {
    return (
      <p className="truncate text-xs font-medium text-muted">
        {conquest.won ? "Conquistata: " : "Persa: "}
        <span className="font-semibold" style={{ color: conquest.card_color ?? undefined }}>
          {conquest.card_name}
        </span>
      </p>
    );
  }
  return conquest.won && conquest.bonus_coins > 0 ? (
    <p className="text-xs font-bold text-comic-yellow">Nessuna carta conquistabile: +{conquest.bonus_coins} monete</p>
  ) : null;
}
