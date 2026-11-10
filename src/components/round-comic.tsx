"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Silhouette } from "@/components/card-view";
import { WinnerName } from "@/components/winner-name";
import { artSrcSet } from "@/lib/art";
import { withBasePath } from "@/lib/base-path";
import type { MatchCard } from "@/lib/match";
import type { PowerNote } from "@/lib/round-powers";
import { LONG_PRESS_CLASS, type LongPressHandlers } from "@/lib/use-long-press";

// A round result told as a comic page, read in order (direction D of the clash drafts):
// the threat with its twist, the two cards with their powers speaking one at a time in
// balloons, then the last panel with the winner breaking out of its frame. The loser greys
// out and its panel cracks. A tap jumps to the end; reduced motion shows the end at once.
const BEAT_MS = {
  /** The twist caption stamps on the threat panel. */
  twist: 350,
  /** The scores start counting up, without the powers' points. */
  base: 450,
  /** How long the base count takes. */
  baseCount: 450,
  /** Between one power and the next. */
  power: 400,
  /** A pause before the verdict. */
  verdict: 350,
  /** After the verdict, the powers that act on the next card. */
  after: 450,
} as const;

export type ComicKey = "me" | "opponent";

export type ComicSide = {
  /** "Tu" or the opponent's name. */
  label: string;
  card: MatchCard | null;
  /** The abilities of the threat with this card's values. */
  stats: string;
  score: number;
  notes: PowerNote[];
  press?: LongPressHandlers;
};

export type RoundComicProps = {
  round: number;
  level: number;
  threatName: string;
  abilities: string[];
  /** The threat modifier, already worded: shown as the twist caption. */
  twist: { name: string; text: string } | null;
  me: ComicSide;
  opponent: ComicSide;
  winner: ComicKey | "none";
  /** The power note that changed the result, if any. */
  decisive: { side: ComicKey; index: number; text: string } | null;
  /** One line under the verdict: who beat whom, or why nobody did. */
  resultLine: string;
  /** Short notices (time up, a tie nobody could settle). */
  notices: string[];
  /** The hint at the bottom; it changes once the page is complete. */
  hint: (complete: boolean) => ReactNode;
  onContinue: () => void;
};

type Beat =
  | { at: number; kind: "twist" | "base" | "idle" | "verdict" | "after" }
  | { at: number; kind: "note"; side: ComicKey; index: number };

const SIDES: ComicKey[] = ["me", "opponent"];

/** The beats of the page, in time order. */
function planBeats(props: Pick<RoundComicProps, "twist" | "me" | "opponent">): Beat[] {
  const beats: Beat[] = [];
  let at = 0;
  if (props.twist) {
    beats.push({ at: BEAT_MS.twist, kind: "twist" });
    at = BEAT_MS.twist;
  }
  at += BEAT_MS.base;
  beats.push({ at, kind: "base" });
  at += BEAT_MS.baseCount;
  // Powers that act in the round, mine first; then the ones that did nothing, together.
  for (const side of SIDES) {
    props[side].notes.forEach((note, index) => {
      if (note.active && !note.timing) {
        beats.push({ at, kind: "note", side, index });
        at += BEAT_MS.power;
      }
    });
  }
  if (SIDES.some((side) => props[side].notes.some((note) => !note.active))) {
    beats.push({ at, kind: "idle" });
    at += BEAT_MS.power / 2;
  }
  // Implacabile speaks once the scores stand level.
  for (const side of SIDES) {
    props[side].notes.forEach((note, index) => {
      if (note.active && note.timing === "tie") {
        at += BEAT_MS.verdict;
        beats.push({ at, kind: "note", side, index });
      }
    });
  }
  at += BEAT_MS.verdict;
  beats.push({ at, kind: "verdict" });
  if (SIDES.some((side) => props[side].notes.some((note) => note.active && note.timing === "after"))) {
    beats.push({ at: at + BEAT_MS.after, kind: "after" });
  }
  return beats;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Plays the beats one after the other; `complete` jumps to the end. */
function useBeats(beats: Beat[]) {
  const [fired, setFired] = useState(() => (prefersReducedMotion() ? beats.length : 0));
  useEffect(() => {
    if (fired >= beats.length) return;
    const start = performance.now();
    const timers = beats.map((beat, index) =>
      index < fired ? 0 : window.setTimeout(() => setFired((n) => Math.max(n, index + 1)), Math.max(0, beat.at - (performance.now() - start))),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
    // Scheduled once per page: later beats are already counted in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beats]);
  const [skipped, setSkipped] = useState(false);
  const complete = useCallback(() => {
    setSkipped(true);
    setFired(beats.length);
  }, [beats.length]);
  return { fired: beats.slice(0, fired), done: fired >= beats.length, skipped, complete };
}

/** A number that climbs to its value; at once when skipped. */
function Rolling({ value, instant }: { value: number; instant: boolean }) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (instant || prefersReducedMotion()) {
      from.current = value;
      return;
    }
    const start = performance.now();
    const origin = from.current;
    let frame = 0;
    const step = (time: number) => {
      const progress = Math.min(1, (time - start) / BEAT_MS.baseCount);
      const next = Math.round(origin + (value - origin) * progress);
      from.current = next;
      setShown(next);
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, instant]);
  return <>{instant || prefersReducedMotion() ? value : shown}</>;
}

/** The crack across the loser's panel, drawn when the page gives the verdict. */
function Crack() {
  return (
    <svg className="comic-crack" viewBox="0 0 100 140" preserveAspectRatio="none" aria-hidden>
      <path className="comic-crack-ink" vectorEffect="non-scaling-stroke" d="M60 0 L47 24 L63 44 L43 66 L61 88 L45 112 L56 140" />
      <path className="comic-crack-light" vectorEffect="non-scaling-stroke" d="M60 0 L47 24 L63 44 L43 66 L61 88 L45 112 L56 140" />
    </svg>
  );
}

const SHOUT_PATH =
  "M80 4 92 16 108 6 114 22 134 16 132 34 154 36 142 52 156 66 136 70 140 88 118 82 108 98 94 86 80 100 70 86 50 98 46 80 22 88 28 70 4 64 20 52 6 38 28 34 26 16 48 22 54 6 68 16Z";

function Art({ card, className }: { card: MatchCard; className: string }) {
  if (!card.art_url) {
    return (
      <div className={`${className} bg-black`}>
        <Silhouette faction={card.faction} accent={card.rarity.color} className="absolute bottom-0 left-1/2 h-full -translate-x-1/2" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={withBasePath(card.art_url)}
      srcSet={artSrcSet(card.art_url)}
      sizes="50vw"
      alt=""
      decoding="async"
      className={`${className} object-cover object-top`}
    />
  );
}

function CardPanel({
  side,
  data,
  shown,
  scoreShown,
  instant,
  showIdle,
  showAfter,
  outcome,
  decisiveIndex,
  verdict,
}: {
  side: ComicKey;
  data: ComicSide;
  /** The notes whose balloon has appeared. */
  shown: Set<number>;
  scoreShown: number | null;
  instant: boolean;
  showIdle: boolean;
  showAfter: boolean;
  outcome: "won" | "lost" | "void" | null;
  decisiveIndex: number | null;
  verdict: boolean;
}) {
  const isMe = side === "me";
  const shouts = data.notes.map((note, index) => ({ note, index })).filter(({ note, index }) => note.active && note.timing !== "after" && shown.has(index));
  const idle = data.notes.filter((note) => !note.active);
  const after = data.notes.filter((note) => note.active && note.timing === "after");
  return (
    <section
      {...data.press}
      aria-label={isMe ? "La tua giocata" : `La giocata di ${data.label}`}
      className={`comic-panel ${isMe ? "bg-comic-cyan" : "halftone bg-comic-magenta"} ${
        outcome === "lost" ? "comic-lost" : outcome === "void" ? "comic-void" : outcome === "won" ? "comic-won" : ""
      } ${LONG_PRESS_CLASS} relative min-h-0 overflow-hidden text-black`}
      style={{ animationDelay: isMe ? "80ms" : "160ms" }}
    >
      {data.card && <Art card={data.card} className="comic-dim absolute inset-0 h-full w-full" />}
      <div
        className={`comic-dim absolute top-1.5 z-[4] grid h-14 w-14 place-items-center rounded-full border-[3px] border-foreground bg-black font-display text-[28px] tabular-nums text-comic-yellow ${
          isMe ? "left-1.5" : "right-1.5"
        }`}
      >
        {scoreShown === null ? "–" : <Rolling value={scoreShown} instant={instant} />}
      </div>

      <div className={`absolute inset-x-1 top-[66px] z-[5] flex flex-col gap-1.5 ${isMe ? "items-start" : "items-end"}`}>
        {shouts.length > 0 && (
          <div className="comic-shout relative min-w-[132px] max-w-full px-7 py-5 text-center">
            <svg viewBox="0 0 160 104" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
              <path d={SHOUT_PATH} fill="#fff" stroke="#000" strokeWidth={3} strokeLinejoin="round" />
            </svg>
            {shouts.map(({ note, index }) => (
              <p key={index} className="comic-pop relative leading-none">
                <span className="block font-sfx text-[19px] tracking-wide">{note.name}!</span>
                {note.effect && <span className="block text-[11px] font-extrabold leading-3">{note.effect}</span>}
                {decisiveIndex === index && verdict && (
                  <span className="comic-pop mt-0.5 inline-block -rotate-3 border-2 border-black bg-comic-yellow px-1 font-sfx text-[13px] tracking-wide">
                    Decisivo!
                  </span>
                )}
              </p>
            ))}
          </div>
        )}
        {showIdle && idle.length > 0 && (
          <div className="comic-pop max-w-[150px] rounded-[50%] border-[3px] border-black bg-white px-3 py-2 text-center text-[11px] font-bold italic leading-[13px] text-[#444]">
            {idle.map((note, index) => (
              <span key={index} className="block">
                {note.name}… {note.effect ?? "non stavolta"}
              </span>
            ))}
          </div>
        )}
      </div>

      {showAfter && after.length > 0 && (
        <div className={`absolute bottom-[70px] z-[6] flex flex-col gap-1 ${isMe ? "left-1.5 items-start" : "right-1.5 items-end"}`}>
          {after.map((note, index) => (
            <span key={index} className="comic-pop border-2 border-black bg-comic-yellow px-1.5 text-[11px] font-extrabold uppercase leading-5">
              {note.name} {note.effect}
            </span>
          ))}
        </div>
      )}

      <div className={`comic-dim absolute inset-x-1.5 bottom-1.5 z-[3] border-2 border-black bg-comic-yellow px-2 py-0.5 ${isMe ? "" : "text-right"}`}>
        <p className="truncate text-[10px] font-extrabold uppercase leading-3">{data.label}</p>
        <p className="truncate font-display text-[20px] uppercase leading-[22px]">{data.card?.name ?? "?"}</p>
        <p className="text-[11px] font-extrabold leading-[13px]">{data.stats}</p>
      </div>
      <Crack />
    </section>
  );
}

/** The round result as a comic page. */
export function RoundComic(props: RoundComicProps) {
  const { me, opponent, winner, twist } = props;
  // The beats depend only on the round: a new round is a new page.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const beats = useMemo(() => planBeats({ twist, me, opponent }), [props.round]);
  const { fired, done, skipped, complete } = useBeats(beats);
  const has = (kind: Beat["kind"]) => fired.some((beat) => beat.kind === kind);
  const verdict = has("verdict");

  const shown = (side: ComicKey) =>
    new Set(fired.flatMap((beat) => (beat.kind === "note" && beat.side === side ? [beat.index] : [])));
  // The score climbs from the abilities alone, then each power adds its points as it speaks.
  const scoreOf = (side: ComicKey) => {
    if (!has("base")) return null;
    const data = props[side];
    const visible = shown(side);
    const pending = data.notes.reduce((sum, note, index) => sum + (note.points && !visible.has(index) ? note.points : 0), 0);
    return data.score - pending;
  };
  const outcomeOf = (side: ComicKey) =>
    !verdict ? null : winner === "none" ? ("void" as const) : winner === side ? ("won" as const) : ("lost" as const);

  // The phone buzzes with the verdict where it can (not Safari on iPhone).
  const buzzed = useRef(false);
  useEffect(() => {
    if (!verdict || buzzed.current) return;
    buzzed.current = true;
    // Browsers allow it only after a tap, which a match always had.
    if (!navigator.userActivation?.hasBeenActive) return;
    try {
      navigator.vibrate?.(winner === "me" ? [30, 40, 70] : winner === "opponent" ? [140] : [25]);
    } catch {
      // Not supported: the page shakes anyway.
    }
  }, [verdict, winner]);

  const winnerSide = winner === "none" ? null : props[winner];
  const title = winner === "me" ? "Round vinto!" : winner === "opponent" ? "Round perso" : "Round nullo";
  const sfx = winner === "me" ? "SBAM!" : winner === "opponent" ? "KRAK!" : "PARI!";

  return (
    <main
      className="comic-page relative mt-1 flex min-h-0 flex-1 cursor-pointer flex-col gap-1.5 overflow-hidden px-1.5 pb-[calc(env(safe-area-inset-bottom)+4px)] pt-1.5"
      onClick={() => (done ? props.onContinue() : complete())}
    >
      <section aria-label={`Round ${props.round}: ${props.threatName}`} className="comic-panel halftone relative shrink-0 bg-comic-orange px-3 pb-2.5 pt-2 text-black">
        <p className="inline-block border-2 border-black bg-comic-yellow px-2 text-[11px] font-extrabold uppercase leading-5">
          Round {props.round} · Livello {props.level}
        </p>
        <p className="mt-1 font-display text-[28px] uppercase leading-[30px]">{props.threatName}</p>
        <p className="mt-1 flex flex-wrap gap-1">
          {props.abilities.map((code) => (
            <span key={code} className="bg-black px-1.5 text-[11px] font-extrabold leading-[18px] text-foreground">
              {code}
            </span>
          ))}
        </p>
        {twist && (
          <p className={`comic-twist relative mt-2 border-[3px] border-black bg-white px-2.5 py-1 text-[13px] font-semibold leading-4 shadow-[4px_4px_0_#000] ${has("twist") ? "comic-on" : ""}`}>
            <span className="font-display uppercase">{twist.name}!</span> {twist.text}
          </p>
        )}
      </section>

      <div className="grid min-h-[230px] flex-1 grid-cols-2 gap-1.5">
        {SIDES.map((side) => {
          const data = props[side];
          const decisive = props.decisive?.side === side ? props.decisive.index : null;
          return (
            <CardPanel
              key={side}
              side={side}
              data={data}
              shown={shown(side)}
              scoreShown={scoreOf(side)}
              instant={skipped}
              showIdle={has("idle")}
              showAfter={has("after")}
              outcome={outcomeOf(side)}
              decisiveIndex={decisive}
              verdict={verdict}
            />
          );
        })}
      </div>

      <section
        aria-live="polite"
        aria-label={title}
        className={`comic-panel comic-verdict relative h-[156px] shrink-0 overflow-visible ${
          !verdict ? "bg-panel-raised" : winner === "me" ? "rays-gold" : winner === "opponent" ? "halftone bg-comic-magenta" : "bg-[#cfc6ad]"
        }`}
      >
        {verdict && (
          <>
            {winnerSide?.card && (
              <div className="comic-hero absolute -top-3 left-2.5 z-10 h-[150px] w-[104px] -rotate-[5deg] border-4 border-black bg-black shadow-[6px_6px_0_#000]">
                <Art card={winnerSide.card} className="relative h-full w-full" />
              </div>
            )}
            <span
              className={`comic-stamp text-sfx absolute z-[11] -rotate-[8deg] leading-none ${
                winnerSide?.card ? "left-[24px] top-[64px] text-[34px]" : "left-3 top-2 text-[40px]"
              } ${winner === "me" ? "text-comic-magenta" : "text-foreground"}`}
            >
              {sfx}
            </span>
            <div className={`absolute bottom-2 right-2 top-1.5 z-[4] flex flex-col justify-end gap-1 ${winnerSide?.card ? "left-[124px]" : "left-2"}`}>
              {winnerSide?.card && (
                <WinnerName key={`${props.round}-${winnerSide.card.code}`} card={winnerSide.card} delay={0.15} className="h-[52px] min-h-0 shrink" />
              )}
              <div className="comic-fade border-[3px] border-black bg-white px-2.5 py-1 text-black">
                <p className="font-display text-[20px] uppercase leading-[22px]">{title}</p>
                <p className="text-[12px] font-bold leading-[15px]">
                  {props.resultLine}
                  {props.decisive && ` ${props.decisive.text}`}
                </p>
                {props.notices.map((notice) => (
                  <p key={notice} className="text-[11px] font-semibold leading-[14px] text-[#444]">
                    {notice}
                  </p>
                ))}
              </div>
            </div>
          </>
        )}
      </section>

      <div className="flex shrink-0 justify-center">{props.hint(done)}</div>
    </main>
  );
}
