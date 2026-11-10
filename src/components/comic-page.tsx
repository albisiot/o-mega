"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Silhouette } from "@/components/card-view";
import { WinnerName } from "@/components/winner-name";
import { artSrcSet } from "@/lib/art";
import { withBasePath } from "@/lib/base-path";
import type { MatchCard } from "@/lib/match";
import type { PowerNote } from "@/lib/round-powers";

// The pieces every result told as a comic page shares (direction D of the clash drafts):
// the pace, the beats, the climbing score, the balloons, the crack and the verdict panel.
// A tap jumps to the end; reduced motion shows the end at once.

// The whole page plays at this pace: 0.75 is a little slower than the drafts. The CSS
// animations read it too, through --comic-pace on the page.
const SPEED = 0.75;
export const PACE = 1 / SPEED;
export const paced = (ms: number) => Math.round(ms * PACE);
export const pageStyle = { "--comic-pace": PACE } as CSSProperties;

export const BEAT_MS = {
  /** The twist caption (or the threshold) stamps on the threat panel. */
  twist: paced(350),
  /** The scores start counting up, without the powers' points. */
  base: paced(450),
  /** How long the base count takes. */
  baseCount: paced(450),
  /** Between one power and the next. */
  power: paced(400),
  /** A pause before the verdict. */
  verdict: paced(350),
  /** After the verdict, the powers that act on the next card. */
  after: paced(450),
} as const;

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Plays the beats one after the other; `complete` jumps to the end. */
export function useBeats<T extends { at: number }>(beats: T[]) {
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

/** The phone buzzes with the verdict where it can (not Safari on iPhone). */
export function useVerdictBuzz(verdict: boolean, tone: "win" | "lose" | "void") {
  const buzzed = useRef(false);
  useEffect(() => {
    if (!verdict || buzzed.current) return;
    buzzed.current = true;
    // Browsers allow it only after a tap, which a match always had.
    if (!navigator.userActivation?.hasBeenActive) return;
    try {
      navigator.vibrate?.(tone === "win" ? [30, 40, 70] : tone === "lose" ? [140] : [25]);
    } catch {
      // Not supported: the page shakes anyway.
    }
  }, [verdict, tone]);
}

/** A number that climbs to its value; at once when skipped. */
export function Rolling({ value, instant }: { value: number; instant: boolean }) {
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
export function Crack() {
  return (
    <svg className="comic-crack" viewBox="0 0 100 140" preserveAspectRatio="none" aria-hidden>
      <path className="comic-crack-ink" vectorEffect="non-scaling-stroke" d="M60 0 L47 24 L63 44 L43 66 L61 88 L45 112 L56 140" />
      <path className="comic-crack-light" vectorEffect="non-scaling-stroke" d="M60 0 L47 24 L63 44 L43 66 L61 88 L45 112 L56 140" />
    </svg>
  );
}

const SHOUT_PATH =
  "M80 4 92 16 108 6 114 22 134 16 132 34 154 36 142 52 156 66 136 70 140 88 118 82 108 98 94 86 80 100 70 86 50 98 46 80 22 88 28 70 4 64 20 52 6 38 28 34 26 16 48 22 54 6 68 16Z";

/** A card's art filling its box, or its silhouette when it has none. */
export function ComicArt({ card, className }: { card: MatchCard; className: string }) {
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
      sizes="60vw"
      alt=""
      decoding="async"
      className={`${className} object-cover object-top`}
    />
  );
}

/** The powers that acted, shouting one line each; the decisive one gets its tag with the verdict. */
export function ShoutBalloon({
  notes,
  decisiveIndex,
  verdict,
}: {
  notes: { note: PowerNote; index: number }[];
  decisiveIndex: number | null;
  verdict: boolean;
}) {
  if (notes.length === 0) return null;
  return (
    <div className="comic-shout relative min-w-[132px] max-w-full px-7 py-5 text-center text-black">
      <svg viewBox="0 0 160 104" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
        <path d={SHOUT_PATH} fill="#fff" stroke="#000" strokeWidth={3} strokeLinejoin="round" />
      </svg>
      {notes.map(({ note, index }) => (
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
  );
}

/** The powers that did nothing, as a thought. */
export function ThinkBalloon({ notes }: { notes: PowerNote[] }) {
  if (notes.length === 0) return null;
  return (
    <div className="comic-pop max-w-[150px] rounded-[50%] border-[3px] border-black bg-white px-3 py-2 text-center text-[11px] font-bold italic leading-[13px] text-[#444]">
      {notes.map((note, index) => (
        <span key={index} className="block">
          {note.name}… {note.effect ?? "non stavolta"}
        </span>
      ))}
    </div>
  );
}

/**
 * The last panel: empty until the verdict, then the winner breaking out of its frame
 * with its 3D name, the sound effect and the result in words.
 */
export function VerdictPanel({
  verdict,
  tone,
  hero,
  heroKey,
  sfx,
  title,
  children,
}: {
  verdict: boolean;
  tone: "win" | "lose" | "void";
  /** The card that breaks out of the frame, if any. */
  hero: MatchCard | null;
  heroKey: string;
  sfx: string;
  title: string;
  /** The lines under the title. */
  children: ReactNode;
}) {
  return (
    <section
      aria-live="polite"
      aria-label={title}
      className={`comic-panel comic-verdict relative h-[156px] shrink-0 overflow-visible ${
        !verdict ? "bg-panel-raised" : tone === "win" ? "rays-gold" : tone === "lose" ? "halftone bg-comic-magenta" : "bg-[#cfc6ad]"
      }`}
    >
      {verdict && (
        <>
          {hero && (
            <div className="comic-hero absolute -top-3 left-2.5 z-10 h-[150px] w-[104px] -rotate-[5deg] border-4 border-black bg-black shadow-[6px_6px_0_#000]">
              <ComicArt card={hero} className="relative h-full w-full" />
            </div>
          )}
          <span
            className={`comic-stamp text-sfx absolute z-[11] -rotate-[8deg] leading-none ${
              hero ? "left-[24px] top-[64px] text-[34px]" : "left-3 top-2 text-[40px]"
            } ${tone === "win" ? "text-comic-magenta" : "text-foreground"}`}
          >
            {sfx}
          </span>
          <div className={`absolute bottom-2 right-2 top-1.5 z-[4] flex flex-col justify-end gap-1 ${hero ? "left-[124px]" : "left-2"}`}>
            {hero && <WinnerName key={heroKey} card={hero} delay={0.15} className="h-[52px] min-h-0 shrink" />}
            <div className="comic-fade border-[3px] border-black bg-white px-2.5 py-1 text-black">
              <p className="font-display text-[20px] uppercase leading-[22px]">{title}</p>
              {children}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
