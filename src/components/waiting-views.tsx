"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ComicBurst, PageHeader } from "@/components/comic-parts";
import { GoBackLink } from "@/components/return-link";
import { balance } from "@/config/balance";
import { WORLD_SEARCH_LINES } from "@/config/world";
import type { Lobby, MatchFormat, QueueMode } from "@/lib/match";
import { QUADRANT_GRID_LABELS } from "@/lib/quadrant";
import { formatCountdown } from "@/lib/use-now";

const SEARCH_LINE_SECONDS = 4;

/**
 * The waiting page (/attesa) fits the phone and never scrolls (see .game-shell): its
 * content stays centred, and only a window too short for it scrolls inside, from the top.
 * Its way back leads to the team picker it was opened from.
 */
export function WaitingShell({ lobby, ranked, children }: { lobby: boolean; ranked: boolean; children: ReactNode }) {
  return (
    <div className="game-shell">
      <PageHeader
        backHref={ranked ? "/classificata" : "/gioca"}
        title={lobby ? "Sfida un amico" : "Ricerca avversario"}
        centered
      />
      {children}
    </div>
  );
}

/** The scrolling box of the page, with its content centred while it fits. */
export function WaitingMain({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-[calc(env(safe-area-inset-bottom)+16px)] text-center">
      <div className="m-auto flex flex-col items-center gap-5 short:gap-3">{children}</div>
    </main>
  );
}

/** What is being searched for, in words. */
function searchTitle(queueMode: QueueMode, format: MatchFormat): string {
  if (queueMode === "conquest") return "Ricerca di un avversario per la Conquista…";
  const where =
    format === "boss"
      ? " per la Grande Minaccia"
      : format === "triple"
        ? " per Allarme Triplo"
        : format === "quadrant" || format === "quadrant_shifting"
          ? ` per Quadrante (${QUADRANT_GRID_LABELS[format].toLowerCase()})`
          : "";
  return `Ricerca di un avversario${queueMode === "ranked" ? " in Classificata" : ""}${where}…`;
}

/** The queue: the spinning rays, the burst, the seconds waited and what to do meanwhile. */
export function QueueWaitView({
  queueMode,
  format,
  waited,
  error,
  challenge = null,
}: {
  queueMode: QueueMode;
  format: MatchFormat;
  /** Seconds since the page opened. */
  waited: number;
  error: string | null;
  /**
   * A Sfida a tema online (SPEC §8.8): its name. Nobody free in a while, the server finds the
   * opponent, as in the Classificata: the page says nothing of it.
   */
  challenge?: { title: string; color: string } | null;
}) {
  const line = Math.floor(waited / SEARCH_LINE_SECONDS);
  return (
    <WaitingMain>
      <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden">
        <div className="rays-dark animate-rays-spin absolute left-1/2 top-1/2 h-[200vmax] w-[200vmax] -translate-x-1/2 -translate-y-1/2" />
      </div>
      <ComicBurst
        fill="#ffd60a"
        className="animate-search-burst relative h-32 w-32 shrink-0 short:h-24 short:w-24"
        textClassName="text-[30px] tracking-wide short:text-[24px]"
      >
        CERCO!
      </ComicBurst>
      <div>
        {challenge && (
          <p className="font-sfx text-lg leading-6 tracking-wide" style={{ color: challenge.color }}>
            ★ {challenge.title}
          </p>
        )}
        <p className="font-display text-[28px] uppercase leading-8 short:text-2xl short:leading-7">{searchTitle(queueMode, format)}</p>
        <p className="mt-1 font-display text-2xl text-comic-yellow">{waited} s</p>
        <p key={line} className="animate-panel-fade mt-1 text-sm font-semibold text-comic-cyan">
          {WORLD_SEARCH_LINES[line % WORLD_SEARCH_LINES.length]}
        </p>
      </div>
      {error && <p className="text-sm font-semibold text-comic-magenta">{error}</p>}
      {queueMode === "conquest" && (
        <p className="max-w-xs text-sm font-semibold">
          Se non arriva nessuno, dopo {balance.matchmaking.conquestBotAfterSeconds} secondi sfiderai un bot a caso. Le
          carte restano in palio: puoi vincerne una o perderla.
        </p>
      )}
      {queueMode === "ranked" && (
        <p className="max-w-xs text-sm font-semibold">Classificata: chi vince guadagna Fama. Nessuna carta in gioco.</p>
      )}
      {challenge && <p className="max-w-xs text-sm font-semibold">Sfida a tema: entrambe le squadre rispettano le sue regole.</p>}
      {queueMode === "friendly" && !challenge && waited >= balance.matchmaking.suggestBotAfterSeconds && (
        <div className="flex items-center gap-3 bg-panel px-3 py-2 text-left">
          <p className="text-sm font-semibold leading-5">Nessun avversario disponibile al momento.</p>
          <Link href="/gioca" replace className="btn btn-outline shrink-0">
            Contro un bot
          </Link>
        </div>
      )}
      <GoBackLink fallback={queueMode === "ranked" ? "/classificata" : "/gioca"} className="btn btn-ghost">
        {() => "Annulla"}
      </GoBackLink>
    </WaitingMain>
  );
}

/** A friend code: no code, or one expired. */
export function LobbyMissingView({ expired }: { expired: boolean }) {
  return (
    <WaitingMain>
      <p className="text-sm font-semibold">{expired ? "Il codice è scaduto." : "Nessun codice attivo."}</p>
      <Link href="/squadra/?mode=lobby" className="btn btn-outline">
        Crea un nuovo codice
      </Link>
    </WaitingMain>
  );
}

/** A friend code waiting for the friend: the code, its time left, share and cancel. */
export function LobbyWaitView({
  lobby,
  remaining,
  notice,
  onShare,
  onCancel,
}: {
  lobby: Lobby;
  /** Milliseconds the code is still valid. */
  remaining: number;
  notice: string | null;
  onShare: () => void;
  onCancel: () => void;
}) {
  return (
    <WaitingMain>
      <p className="text-base font-semibold">
        {lobby.format === "boss"
          ? "Grande Minaccia: dai questo codice al tuo amico:"
          : lobby.format === "triple"
            ? `Allarme Triplo: dai questo codice al tuo amico (gli servono ${balance.triple.rounds * balance.triple.threats} carte):`
            : lobby.format === "quadrant" || lobby.format === "quadrant_shifting"
              ? `Quadrante, ${QUADRANT_GRID_LABELS[lobby.format].toLowerCase()}: dai questo codice al tuo amico (gli servono ${balance.quadrant.deckSize} carte):`
              : "Dai questo codice al tuo amico:"}
      </p>
      <p className="-skew-x-8 select-all bg-comic-yellow px-5 py-2 font-display text-5xl tracking-[0.15em] text-black shadow-[5px_5px_0_var(--comic-magenta)]">
        {lobby.code}
      </p>
      <p className="text-sm font-medium text-muted">Valido ancora {formatCountdown(remaining)}</p>
      <button type="button" onClick={onShare} className="btn btn-primary px-6">
        Condividi il codice
      </button>
      {notice && <p className="text-sm font-semibold text-comic-cyan">{notice}</p>}
      <div className="flex items-center gap-2 text-sm font-semibold text-muted">
        <span className="h-2 w-2 animate-pulse rounded-full bg-comic-yellow" aria-hidden />
        In attesa che il tuo amico entri…
      </div>
      <button type="button" onClick={onCancel} className="btn btn-ghost">
        Annulla
      </button>
    </WaitingMain>
  );
}
