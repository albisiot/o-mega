"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Silhouette } from "@/components/card-view";
import { WinnerName } from "@/components/winner-name";
import type { AbilityChip } from "@/lib/ability-marks";
import { artSrcSet } from "@/lib/art";
import { withBasePath } from "@/lib/base-path";
import { setSoundOn, useSoundOn } from "@/lib/comic-sound";
import { powerFamily, type PowerFamily } from "@/lib/effect-families";
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
  /** The rule's ribbons fall on the cards (factions, rarities, who is behind). */
  flags: paced(450),
  /** A cut-in across the page, for a distinctive or decisive power. */
  cutIn: paced(780),
  /** The scores stand level before Implacabile speaks. */
  level: paced(450),
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

/**
 * The phone buzzes with the verdict where it can (not Safari on iPhone). `onVerdict` hears it
 * too, played or skipped to: the match strip waits for it to show the outcome.
 */
export function useVerdictBuzz(verdict: boolean, tone: "win" | "lose" | "void", onVerdict?: () => void) {
  const announce = useEffectEvent(() => onVerdict?.());
  useEffect(() => {
    if (verdict) announce();
  }, [verdict]);
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

// The balloons of the powers, one shape per family (effect-families.ts): a yellow burst for
// a charge, a jagged black one for a strike, a hexagon for a shield, a thick-edged sign for a
// stop, an arrow for what goes on to the next card, a dashed one for what only shows.
const BALLOON_PATH: Record<PowerFamily, string> = {
  charge: SHOUT_PATH,
  strike: "M6 10 30 2 44 14 70 0 84 16 110 4 120 20 154 12 146 40 158 58 140 70 152 96 120 88 104 102 80 90 56 104 44 88 14 98 18 74 2 62 16 44Z",
  shield: "M24 2H136L158 52 136 102H24L2 52Z",
  stop: "M20 2H140Q158 2 158 20V84Q158 102 140 102H20Q2 102 2 84V20Q2 2 20 2Z",
  tiebreak: "M2 2H158V102H2Z",
  forward: "M2 2H128L158 52 128 102H2Z",
  copy: "M20 2H140Q158 2 158 20V84Q158 102 140 102H20Q2 102 2 84V20Q2 2 20 2Z",
  reveal: "M20 2H140Q158 2 158 20V84Q158 102 140 102H20Q2 102 2 84V20Q2 2 20 2Z",
};

const FAMILY_ICON: Record<PowerFamily, ReactNode> = {
  charge: <path d="M12 20V5M5 12l7-7 7 7" />,
  strike: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
  shield: <path d="M12 2 21 7v10l-9 5-9-5V7z" />,
  stop: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M6 6l12 12" />
    </>
  ),
  tiebreak: <path d="M5 9h14M5 15h14" />,
  forward: <path d="M5 6l6 6-6 6M13 6l6 6-6 6" />,
  copy: (
    <>
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="10.5" />
    </>
  ),
  reveal: (
    <>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
};

export function FamilyIcon({ family, className = "h-[15px] w-[15px]" }: { family: PowerFamily; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} shrink-0`} fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {FAMILY_ICON[family]}
    </svg>
  );
}

const LOCK = (
  <svg viewBox="0 0 24 24" className="h-[30px] w-[30px] rounded-full border-2 border-foreground bg-black p-1.5 text-foreground" fill="none" stroke="currentColor" strokeWidth={2.6} aria-hidden>
    <rect x="5" y="11" width="14" height="10" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

/**
 * One power speaking, in its family's balloon. `harm`: its points hurt the card that gets
 * them (a bonus under Rovescio), so it takes the colours of a strike. A cancelled power
 * shows sealed (Silenzio della tomba) or stamped out (Annullatore).
 */
export function PowerBalloon({
  note,
  side,
  fxName,
  harm = false,
  decisive = false,
}: {
  note: PowerNote;
  side: "me" | "opponent";
  fxName?: string;
  harm?: boolean;
  decisive?: boolean;
}) {
  const family = powerFamily(note.code);
  const tone = harm && family === "charge" ? "strike" : family;
  return (
    <div
      data-fx={fxName}
      className={`comic-pop comic-balloon comic-balloon-${tone} ${side === "opponent" ? "comic-balloon-flip" : ""} ${
        note.cancelled === "nullified" ? "comic-balloon-dead" : note.cancelled === "silenced" ? "comic-balloon-sealed" : ""
      } relative min-w-[124px] max-w-full px-5 pb-4 pt-3.5 text-center`}
    >
      <svg viewBox="0 0 160 104" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
        <path d={BALLOON_PATH[tone]} vectorEffect="non-scaling-stroke" />
      </svg>
      <p className="comic-balloon-text relative leading-none">
        <span className="flex items-center justify-center gap-1 font-sfx text-[18px] tracking-wide">
          <FamilyIcon family={family} />
          {note.name}!
        </span>
        {note.effect && <span className="mt-0.5 block text-[11px] font-extrabold leading-3">{note.effect}</span>}
      </p>
      {note.cancelled === "nullified" && (
        <span className="comic-stamp absolute left-1/2 top-1/2 z-[3] -translate-x-1/2 -translate-y-1/2 -rotate-12 border-[3px] border-comic-magenta bg-black px-1.5 font-display text-[16px] leading-6 tracking-wide text-comic-magenta">
          ANNULLATO
        </span>
      )}
      {note.cancelled === "silenced" && <span className="comic-pop absolute inset-0 z-[3] grid place-items-center">{LOCK}</span>}
      {decisive && (
        <span className="comic-pop absolute -right-1 -top-2 z-[4] rotate-6 border-2 border-black bg-white px-1 font-sfx text-[13px] leading-4 tracking-wide text-black">
          Decisivo!
        </span>
      )}
    </div>
  );
}

const PILL_TONE: Record<PowerFamily, string> = {
  charge: "bg-comic-yellow text-black",
  strike: "bg-black text-comic-magenta",
  shield: "bg-comic-cyan text-black",
  stop: "bg-white text-black",
  tiebreak: "bg-comic-orange text-black",
  forward: "bg-comic-orange text-black",
  copy: "bg-white text-black",
  reveal: "bg-white text-black",
};

/** A power as a small label in its family's colours, where a whole balloon would not fit. */
export function PowerPill({ note, delay }: { note: PowerNote; delay?: number }) {
  const family = powerFamily(note.code);
  const idle = !note.active && note.cancelled !== "blocked";
  return (
    <span
      className={`comic-pop inline-flex max-w-full items-center gap-1 border-2 border-black px-1 text-[10px] font-extrabold uppercase leading-4 ${PILL_TONE[family]} ${
        idle ? "opacity-50 grayscale" : ""
      } ${family === "reveal" ? "border-dashed" : ""}`}
      style={delay !== undefined ? { animationDelay: `${delay}s` } : undefined}
    >
      <FamilyIcon family={family} className="h-3 w-3" />
      <span className="truncate">
        {note.name}
        {note.effect ? ` ${note.effect}` : ""}
      </span>
    </span>
  );
}

/** What a chip shows: the ability, the value, the rule's mark and Sabotatore's. */
export type ComicChip = AbilityChip & { ghost?: boolean };

/**
 * The card's abilities on the threat, one chip each. The rule's marks show once the rule
 * has landed (`ruled`), Sabotatore's once the strike has (`struck`); before Al buio has
 * lifted (`hidden`) they are question marks.
 */
export function AbilityChips({
  side,
  chips,
  ruled,
  struck,
  hidden = false,
}: {
  side: "me" | "opponent";
  chips: ComicChip[];
  ruled: boolean;
  struck: boolean;
  hidden?: boolean;
}) {
  return (
    <p data-fx={`${side}-chips`} className={`flex flex-wrap gap-[3px] ${side === "opponent" ? "justify-end" : ""}`}>
      {chips.map((chip, index) => {
        const marks = [
          ...(ruled && chip.mark ? [chip.mark] : []),
          ...(struck && chip.malus > 0 ? [{ text: `−${chip.malus}`, tone: "down" as const }] : []),
        ];
        return (
          <span
            key={chip.code + index}
            data-fx={`${side}-chip-${index}`}
            className={`comic-chip relative bg-black px-1 text-[10.5px] font-extrabold leading-4 text-foreground ${
              hidden ? "" : "comic-chip-open"
            } ${ruled && chip.mark?.tone === "ice" ? "comic-chip-ice" : ""} ${ruled && chip.mark?.tone === "off" ? "comic-chip-off" : ""} ${
              struck && chip.malus > 0 ? "comic-chip-hit" : ""
            }`}
          >
            {hidden ? "? ?" : (
              <>
                {chip.code} <b className="text-comic-yellow">{struck ? chip.value : chip.raw}</b>
              </>
            )}
            {!hidden &&
              marks.map((mark, n) => (
                <span
                  key={mark.text + n}
                  className={`comic-pop comic-mark comic-mark-${mark.tone} absolute left-1/2 -translate-x-1/2 whitespace-nowrap border-2 border-black px-1 font-sfx text-[12px] leading-[14px] tracking-wide`}
                  style={{ bottom: `calc(100% + ${2 + n * 17}px)` }}
                >
                  {mark.text}
                </span>
              ))}
          </span>
        );
      })}
    </p>
  );
}

/** A ribbon the threat drops on a card: its faction, its rarity, or being behind. */
export function RuleRibbon({ side, text, help }: { side: "me" | "opponent"; text: string; help: boolean }) {
  return (
    <span
      className={`comic-ribbon absolute top-[70px] z-[7] border-[3px] border-black px-3 py-1 font-display text-[16px] uppercase leading-5 text-black shadow-[3px_3px_0_#000] ${
        side === "me" ? "right-1.5" : "left-1.5"
      } ${help ? "bg-comic-yellow" : "bg-comic-magenta"}`}
    >
      {text}
    </span>
  );
}

/** The hexagon in front of a card's abilities: Schermato or Riflesso stopped a strike there. */
export function ShieldPlate({ side }: { side: "me" | "opponent" }) {
  return (
    <span data-fx={`${side}-shield`} className="comic-pop comic-shield absolute inset-x-0 bottom-0 z-[7] h-[86px]" aria-hidden>
      <svg viewBox="0 0 170 104" preserveAspectRatio="none" className="h-full w-full">
        <path d="M26 4H144L166 52 144 100H26L4 52Z" vectorEffect="non-scaling-stroke" />
      </svg>
    </span>
  );
}

/**
 * The cut-in: a band across the page with the card and its power, for a distinctive power
 * or the one that decides the round. It slides in and out by itself.
 */
export function CutIn({ card, side, title, text, harm }: { card: MatchCard | null; side: "me" | "opponent"; title: string; text: string | null; harm: boolean }) {
  return (
    <div aria-hidden className={`comic-cutin ${side === "me" ? "comic-cutin-me" : "comic-cutin-opponent"} ${harm ? "comic-cutin-harm" : ""}`}>
      <div className="comic-cutin-speed" />
      <div className={`comic-cutin-inner ${side === "opponent" ? "flex-row-reverse text-right" : ""}`}>
        {card && <ComicArt card={card} className="comic-cutin-art" />}
        <div className="flex min-w-0 flex-col">
          <span className="comic-cutin-title font-sfx">{title}</span>
          {text && <span className="text-[14px] font-extrabold leading-4">{text}</span>}
        </div>
      </div>
    </div>
  );
}

/** Sounds on or off, for every result page; a tap here never moves the page on. */
export function SoundToggle() {
  const on = useSoundOn();
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? "Suoni attivi: tocca per spegnerli" : "Suoni spenti: tocca per accenderli"}
      onClick={(event) => {
        event.stopPropagation();
        setSoundOn(!on);
      }}
      className="grid h-8 w-8 shrink-0 place-items-center text-black"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
        {on ? <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" /> : <path d="M17 9l5 6M22 9l-5 6" />}
      </svg>
    </button>
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
