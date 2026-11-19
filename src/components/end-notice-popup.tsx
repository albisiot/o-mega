"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useAuth } from "@/components/auth-provider";
import { PlayerAvatar } from "@/components/player-avatar";
import { balance } from "@/config/balance";
import { bannersHeld, subscribeBannerHolds, useBannerHold } from "@/lib/banner-hold";
import {
  endBoardEntryParts,
  endBoardPlaceBelow,
  endNoticeEyebrow,
  endNoticeHeadline,
  endNoticeName,
  endNoticeNotes,
  endNoticePrizeLink,
  endNoticeSummary,
  enqueueEndNotices,
  fetchEndNotices,
  markEndNoticeSeen,
  type EndBoardEntry,
  type EndNotice,
} from "@/lib/end-notices";

/** Screens the notice never covers: a match or a run being played, a pack being opened, the editors. */
const QUIET_PATHS = ["/partita", "/attesa", "/emergenza", "/pacchetto", "/editor", "/prova-tavole", "/prova-fine"];

/**
 * What ended while the player was away (SPEC §11.7): an event, a Sfida a tema, the Emergenza
 * della settimana, a Mandato. Over whatever screen the player is in, one at a time, the
 * oldest end first. Waits like the banners for the splash, a round result, a rare threat, a
 * pack and the Emergenza's prizes, and never opens during a match.
 */
export function EndNoticePopup() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return userId ? <EndNotices key={userId} /> : null;
}

function EndNotices() {
  const pathname = usePathname();
  const router = useRouter();
  const [queue, setQueue] = useState<EndNotice[]>([]);
  const [shownId, setShownId] = useState<string | null>(null);
  // Shown in this visit: not queued again while the server catches up.
  const done = useRef<string[]>([]);
  const marked = useRef(new Set<string>());
  const held = useSyncExternalStore(subscribeBannerHolds, bannersHeld, () => true);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetchEndNotices()
        .then((items) => {
          if (!cancelled) setQueue((current) => enqueueEndNotices(current, items, done.current));
        })
        .catch(() => {
          // The next check tries again.
        });
    };
    load();
    const timer = window.setInterval(load, balance.endNotices.recheckMs);
    const onVisible = () => {
      if (!document.hidden) load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const quiet = QUIET_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const next = queue[0] ?? null;
  const notice = next && shownId === next.id && !quiet ? next : null;
  // Once open, its own hold keeps the banners and the other popups waiting.
  useBannerHold(Boolean(notice));

  // It opens when nothing else holds the screen, a moment later: another popup that decides
  // to open at the same time (the Emergenza's prizes) holds the screen first, and this waits.
  const nextId = next?.id ?? null;
  useEffect(() => {
    if (!nextId || quiet || held || shownId === nextId) return;
    const timer = window.setTimeout(() => {
      if (!bannersHeld()) setShownId(nextId);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [nextId, quiet, held, shownId]);

  // Seen once it is on screen: it does not come back, here or on another device.
  const noticeId = notice?.id ?? null;
  useEffect(() => {
    if (!noticeId || marked.current.has(noticeId)) return;
    const target = queue.find((item) => item.id === noticeId);
    if (!target) return;
    marked.current.add(noticeId);
    markEndNoticeSeen(target).catch(() => {
      // Not recorded: the next opening of the app shows it again.
      marked.current.delete(noticeId);
    });
  }, [noticeId, queue]);

  if (!notice) return null;

  const close = () => {
    done.current = [...done.current, notice.id].slice(-50);
    const rest = queue.filter((item) => item.id !== notice.id);
    setQueue(rest);
    // The next one in line follows straight away, without giving the screen up.
    setShownId(rest[0]?.id ?? null);
  };

  return (
    <EndNoticeDialog
      key={notice.id}
      notice={notice}
      waiting={queue.length - 1}
      onClose={close}
      onOpen={(href) => {
        close();
        router.push(href);
      }}
    />
  );
}

/**
 * The notice itself: what ended, the player's result, then (on request) the final
 * leaderboard. Fits a 375×667 screen. Exported for the test page /prova-fine.
 */
export function EndNoticeDialog({
  notice,
  waiting,
  onClose,
  onOpen,
  initialView = "result",
}: {
  notice: EndNotice;
  /** Notices in line after this one. */
  waiting: number;
  onClose: () => void;
  /** Leaves for another page (the Classificata, for a prize). */
  onOpen: (href: string) => void;
  /** The test page opens straight on the leaderboard. */
  initialView?: "result" | "board";
}) {
  const [view, setView] = useState<"result" | "board">(initialView);
  const board = view === "board" ? notice.board : null;
  const { name, period } = endNoticeName(notice);
  const headline = endNoticeHeadline(notice);
  const prize = endNoticePrizeLink(notice);
  const closeLabel = waiting > 0 ? "Avanti" : "OK";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="end-notice-title"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-[calc(env(safe-area-inset-top)+12px)]"
    >
      <div className="rays-gold relative flex max-h-full w-full max-w-sm flex-col items-center gap-2 overflow-hidden border-[3px] border-black px-4 pb-4 pt-3 text-center text-black shadow-[6px_6px_0_#000]">
        {notice.color && <span aria-hidden className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: notice.color }} />}
        <p className="relative -skew-x-8 bg-black px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-comic-yellow">
          {endNoticeEyebrow(notice)}
        </p>
        <div className="relative flex flex-col items-center">
          <p className="font-display text-2xl uppercase leading-6">{name}</p>
          {period && <p className="text-[12px] font-bold leading-4">{period}</p>}
        </div>

        {board ? (
          <>
            <h2 id="end-notice-title" className="text-sfx relative text-4xl uppercase leading-[0.9] text-comic-magenta">
              Classifica finale
            </h2>
            <p className="relative text-[12px] font-bold leading-4">
              {board.players === 1 ? "1 giocatore" : `${board.players} giocatori`}
            </p>
            <BoardList notice={notice} top={board.top} below={endBoardPlaceBelow(board)} />
          </>
        ) : (
          <>
            <h2
              id="end-notice-title"
              className={`text-sfx relative uppercase leading-[0.9] text-comic-magenta ${headline.length > 10 ? "text-5xl" : "text-6xl"}`}
            >
              {headline}
            </h2>
            <p className="relative text-[13px] font-bold leading-4">{endNoticeSummary(notice)}</p>
            {endNoticeNotes(notice).map((note) => (
              <p key={note} className="relative -skew-x-8 bg-black px-2 py-0.5 text-[12px] font-bold leading-4 text-comic-yellow">
                {note}
              </p>
            ))}
            {prize && (
              <button
                type="button"
                onClick={() => onOpen(prize.href)}
                className="btn relative w-full border-2 border-black bg-transparent font-display text-lg uppercase text-black"
              >
                {prize.label} →
              </button>
            )}
          </>
        )}

        <div className="relative mt-1 flex w-full shrink-0 gap-2">
          {notice.board && (
            <button
              type="button"
              onClick={() => setView(view === "board" ? "result" : "board")}
              className="btn min-w-0 flex-1 border-2 border-black bg-transparent font-display text-lg uppercase text-black"
            >
              {view === "board" ? "Indietro" : "Classifica"}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="btn min-h-14 min-w-0 flex-[2] bg-black font-display text-2xl uppercase text-comic-yellow"
          >
            {closeLabel}
          </button>
        </div>
        {waiting > 0 && (
          <p className="relative -mt-1 text-[11px] font-extrabold uppercase">
            {waiting === 1 ? "Ancora 1 avviso" : `Ancora ${waiting} avvisi`}
          </p>
        )}
      </div>
    </div>
  );
}

const MEDALS = ["bg-comic-yellow", "bg-[#c9d1d9]", "bg-[#d08b4f]"];

/** The first places, the player's row in magenta; their place below when lower. Never teams or cards. */
function BoardList({ notice, top, below }: { notice: EndNotice; top: EndBoardEntry[]; below: EndBoardEntry | null }) {
  if (top.length === 0) {
    return <p className="relative text-[13px] font-bold">Nessuno in classifica.</p>;
  }
  return (
    <div className="relative flex min-h-0 w-full flex-col gap-0.5 text-left">
      <ol className="flex min-h-0 flex-col gap-0.5 overflow-y-auto overscroll-contain" aria-label="Classifica finale">
        {top.map((entry) => (
          <BoardRow key={entry.rank} notice={notice} entry={entry} />
        ))}
      </ol>
      {below && (
        <>
          {below.rank > top.length + 1 && (
            <p aria-hidden className="text-center font-display leading-3 tracking-[0.4em]">
              ···
            </p>
          )}
          <ol start={below.rank} aria-label="La tua posizione">
            <BoardRow notice={notice} entry={below} />
          </ol>
        </>
      )}
    </div>
  );
}

function BoardRow({ notice, entry }: { notice: EndNotice; entry: EndBoardEntry }) {
  const parts = endBoardEntryParts(notice, entry);
  const medal = entry.rank <= 3 && !entry.is_me ? MEDALS[entry.rank - 1] : null;
  return (
    <li
      aria-current={entry.is_me ? "true" : undefined}
      className={`flex min-h-8 shrink-0 items-center justify-between gap-2 px-2 py-px text-[13px] font-semibold ${
        entry.is_me ? "bg-comic-magenta text-white" : "bg-black text-foreground"
      }`}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span
          className={`flex h-5 min-w-6 shrink-0 items-center justify-center px-0.5 font-display text-base leading-none ${
            medal ? `${medal} -skew-x-8 text-black` : ""
          }`}
        >
          {entry.rank}
        </span>
        <PlayerAvatar username={entry.username} avatarUrl={entry.avatar_url} size="xs" />
        <span className="flex min-w-0 flex-col">
          <span className="truncate leading-4">
            {entry.username}
            {entry.is_me && <span className="ml-1.5 text-[10px] font-extrabold uppercase">Tu</span>}
          </span>
          {parts.detail && (
            <span className={`truncate text-[11px] font-bold leading-3 ${entry.is_me ? "text-white/80" : "text-muted"}`}>
              {parts.detail}
            </span>
          )}
        </span>
      </span>
      <span className="shrink-0 font-display text-base leading-5">
        {parts.value}
        <span className="ml-1 font-sans text-[11px] font-bold">{parts.unit}</span>
      </span>
    </li>
  );
}
