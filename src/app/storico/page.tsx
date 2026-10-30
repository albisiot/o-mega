"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRequireSignedIn } from "@/components/auth-provider";
import { LoadingScreen } from "@/components/loading-screen";
import { describeServerError } from "@/lib/errors";
import { DIFFICULTY_LABELS, fetchMatchHistory, type MatchHistoryEntry } from "@/lib/match";

const RESULT_STYLES = {
  win: { label: "Vittoria", className: "text-emerald-300" },
  loss: { label: "Sconfitta", className: "text-red-300" },
  draw: { label: "Pareggio", className: "text-zinc-300" },
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
      <header className="flex items-center justify-between px-5 py-4">
        <Link href="/profilo" className="text-sm text-zinc-300">
          ← Profilo
        </Link>
        <h1 className="text-base font-semibold">Storico partite</h1>
        <span className="w-12" />
      </header>

      <main className="flex flex-1 flex-col gap-2 px-5 pb-6">
        {error && <p className="text-sm text-red-400">{error}</p>}
        {history?.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm text-zinc-400">Non hai ancora finito nessuna partita.</p>
            <Link href="/gioca" className="rounded-full bg-amber-400 px-5 py-2 text-sm font-bold text-zinc-950">
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
      : `${entry.mode === "conquest" ? "Conquista" : "Amichevole"} · ${entry.opponent ?? "giocatore rimosso"}`;

  return (
    <Link
      href={`/partita/?id=${entry.id}`}
      className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{mode}</p>
        <p className="text-xs text-zinc-400">
          {dateTime.format(new Date(entry.finished_at))}
          {entry.end_reason === "forfeit" && " · abbandono"}
        </p>
        <ConquestLine entry={entry} />
      </div>
      <div className="shrink-0 text-right">
        <p className={`text-sm font-bold ${result.className}`}>{result.label}</p>
        <p className="text-xs tabular-nums text-zinc-400">
          {entry.rounds_me} – {entry.rounds_opponent}
        </p>
        {entry.coins > 0 && <p className="text-xs text-amber-200">+{entry.coins} monete</p>}
      </div>
    </Link>
  );
}

function ConquestLine({ entry }: { entry: MatchHistoryEntry }) {
  const conquest = entry.conquest;
  if (!conquest) return null;
  if (conquest.pending) return <p className="text-xs text-zinc-400">Scelta della carta in corso…</p>;
  if (conquest.card_name) {
    return (
      <p className="truncate text-xs text-zinc-300">
        {conquest.won ? "Conquistata: " : "Persa: "}
        <span className="font-semibold" style={{ color: conquest.card_color ?? undefined }}>
          {conquest.card_name}
        </span>
      </p>
    );
  }
  return conquest.won && conquest.bonus_coins > 0 ? (
    <p className="text-xs text-amber-200">Nessuna carta conquistabile: +{conquest.bonus_coins} monete</p>
  ) : null;
}
