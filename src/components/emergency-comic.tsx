"use client";

import { useMemo, type ReactNode } from "react";
import {
  BEAT_MS,
  ComicArt,
  Crack,
  pageStyle,
  Rolling,
  ShoutBalloon,
  ThinkBalloon,
  useBeats,
  useVerdictBuzz,
  VerdictPanel,
} from "@/components/comic-page";
import type { EmergencyNote } from "@/lib/emergency-powers";
import type { MatchCard } from "@/lib/match";
import { LONG_PRESS_CLASS, type LongPressHandlers } from "@/lib/use-long-press";

// An Emergenza play told as a comic page (direction D, like a match round): the threat
// with the score it needs, the card with a gauge climbing toward the threshold line while
// its powers speak, then SUPERATA with the character breaking out of the frame, or
// FALLITA with the card greyed out, cracked, and the missing points striped.

export type EmergencyComicProps = {
  /** 1-based number of the threat in the run. */
  number: number;
  of: number;
  passedBefore: number;
  failedBefore: number;
  /** A failure now ends the run. */
  lastChance: boolean;
  threatName: string;
  level: number;
  abilities: string[];
  card: MatchCard | null;
  stats: string;
  score: number;
  /** The level's score, before the powers that lower it. */
  target: number;
  /** What this card needed, after them (from the server). */
  required: number;
  passed: boolean;
  notes: EmergencyNote[];
  /** The power that made the difference, if any. */
  decisive: { index: number; text: string } | null;
  /** The run ends with this play. */
  ended: boolean;
  press?: LongPressHandlers;
  /** The button under the page; it changes once the page is complete. */
  action: (complete: boolean, skip: () => void) => ReactNode;
  onContinue: () => void;
  /** The verdict is out, played or skipped to. */
  onVerdict?: () => void;
};

type Beat = { at: number; kind: "target" | "base" | "idle" | "verdict" | "after" } | { at: number; kind: "note"; index: number };

function planBeats(notes: EmergencyNote[]): Beat[] {
  const beats: Beat[] = [{ at: BEAT_MS.twist, kind: "target" }];
  let at = BEAT_MS.twist + BEAT_MS.base;
  beats.push({ at, kind: "base" });
  at += BEAT_MS.baseCount;
  notes.forEach((note, index) => {
    if (note.active && note.timing !== "after") {
      beats.push({ at, kind: "note", index });
      at += BEAT_MS.power;
    }
  });
  if (notes.some((note) => !note.active)) {
    beats.push({ at, kind: "idle" });
    at += BEAT_MS.power / 2;
  }
  at += BEAT_MS.verdict;
  beats.push({ at, kind: "verdict" });
  if (notes.some((note) => note.active && note.timing === "after")) beats.push({ at: at + BEAT_MS.after, kind: "after" });
  return beats;
}

/** The result of an Emergenza play as a comic page. */
export function EmergencyComic(props: EmergencyComicProps) {
  const { notes, score, target, required, passed } = props;
  // A new play is a new page.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const beats = useMemo(() => planBeats(notes), [props.number]);
  const { fired, done, skipped, complete } = useBeats(beats);
  const has = (kind: Beat["kind"]) => fired.some((beat) => beat.kind === kind);
  const verdict = has("verdict");
  useVerdictBuzz(verdict, passed ? "win" : "lose", props.onVerdict);

  const shown = new Set(fired.flatMap((beat) => (beat.kind === "note" ? [beat.index] : [])));
  // The score climbs from the abilities, then each power adds its points as it speaks;
  // a power that lowers the threshold moves the line down instead.
  const pending = notes.reduce((sum, note, index) => sum + (note.points && !shown.has(index) ? note.points : 0), 0);
  const scoreShown = has("base") ? score - pending : null;
  const lowered = notes.reduce((sum, note, index) => sum + (note.threshold && shown.has(index) ? note.threshold : 0), 0);
  // The server's required score is the truth; the line reaches it with the last discount.
  const line = notes.some((note, index) => note.threshold && !shown.has(index)) ? target - lowered : required;

  const max = Math.max(target, score) + 4;
  const percent = (value: number) => `${Math.max(0, Math.min(100, (value / max) * 100))}%`;
  const missing = required - score;
  const shouts = notes.map((note, index) => ({ note, index })).filter(({ note, index }) => note.active && note.timing !== "after" && shown.has(index));
  const idle = notes.filter((note) => !note.active);
  const after = notes.filter((note) => note.active && note.timing === "after");

  return (
    <main
      className="comic-page relative mt-1 flex min-h-0 flex-1 cursor-pointer flex-col gap-1.5 overflow-hidden px-1.5 pt-1.5"
      style={pageStyle}
      onClick={() => (done ? props.onContinue() : complete())}
    >
      <section
        aria-label={`Minaccia ${props.number}: ${props.threatName}`}
        className="comic-panel halftone relative shrink-0 bg-comic-orange px-3 pb-2.5 pt-2 text-black"
      >
        <p className="inline-block border-2 border-black bg-comic-yellow px-2 text-[11px] font-extrabold uppercase leading-5">
          Minaccia {props.number} di {props.of} · {props.passedBefore} {props.passedBefore === 1 ? "superata" : "superate"} ·{" "}
          {props.failedBefore} {props.failedBefore === 1 ? "fallita" : "fallite"}
        </p>
        <div className="mt-1 max-w-[calc(100%-96px)]">
          <p className="font-display text-[28px] uppercase leading-[30px]">{props.threatName}</p>
          <p className="mt-1 flex flex-wrap gap-1">
            {props.abilities.map((code) => (
              <span key={code} className="bg-black px-1.5 text-[11px] font-extrabold leading-[18px] text-foreground">
                {code}
              </span>
            ))}
          </p>
        </div>
        <div
          className={`comic-twist absolute right-2.5 top-8 grid h-[84px] w-[84px] place-items-center content-center rounded-full border-[3px] border-foreground bg-black text-comic-yellow shadow-[4px_4px_0_#000] ${
            has("target") ? "comic-on" : ""
          }`}
        >
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-foreground">Serve</span>
          <span className="font-display text-[40px] leading-[40px]">{target}</span>
        </div>
        {props.lastChance && (
          <p className={`comic-twist mt-1.5 inline-block border-2 border-black bg-comic-magenta px-2 text-[11px] font-extrabold uppercase leading-5 ${has("target") ? "comic-on" : ""}`}>
            Alla prossima fallita finisce
          </p>
        )}
      </section>

      <section
        {...props.press}
        aria-label="La tua giocata"
        className={`comic-panel ${verdict && !passed ? "comic-lost" : ""} ${LONG_PRESS_CLASS} relative min-h-[220px] flex-1 overflow-hidden bg-comic-cyan text-black`}
        style={{ animationDelay: "100ms" }}
      >
        {props.card && <ComicArt card={props.card} className="comic-dim absolute inset-y-0 left-0 h-full w-[68%]" />}

        {/* The gauge: the score climbs toward the threshold line. */}
        <div className="absolute bottom-3 right-4 top-[78px] z-[2] w-12 border-[3px] border-black bg-white">
          <div
            className="absolute inset-x-0 bottom-0 border-t-[3px] border-black bg-comic-yellow transition-[height] duration-500 ease-out"
            style={{ height: percent(scoreShown ?? 0) }}
          />
          {verdict && !passed && missing > 0 && (
            <div
              className="comic-fade absolute inset-x-0 bg-[repeating-linear-gradient(45deg,var(--comic-magenta)_0_6px,#000_6px_12px)]"
              style={{ bottom: percent(score), height: `calc(${percent(required)} - ${percent(score)})` }}
            >
              <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 border-2 border-black bg-comic-magenta px-1 font-display text-[15px] leading-[18px]">
                −{missing}
              </span>
            </div>
          )}
          <div
            className={`absolute -left-4 -right-2 z-[3] h-0 border-t-4 transition-[bottom] duration-500 ${
              has("target") ? "opacity-100" : "opacity-0"
            } ${verdict && passed ? "border-solid border-comic-magenta" : "border-dashed border-black"}`}
            style={{ bottom: percent(line) }}
          >
            <span
              className={`absolute right-[calc(100%+2px)] top-[-14px] px-1 font-display text-[17px] leading-6 ${
                verdict && passed ? "bg-comic-magenta text-black" : "bg-black text-comic-yellow"
              }`}
            >
              {line === target ? target : `${target}→${line}`}
            </span>
          </div>
        </div>

        <div className="comic-dim absolute right-2.5 top-1.5 z-[4] grid h-[62px] w-[62px] place-items-center rounded-full border-[3px] border-foreground bg-black font-display text-[30px] tabular-nums text-comic-yellow">
          {scoreShown === null ? "–" : <Rolling value={scoreShown} instant={skipped} />}
        </div>

        <div className="absolute left-1.5 top-[70px] z-[5] flex max-w-[64%] flex-col items-start gap-1.5">
          <ShoutBalloon notes={shouts} decisiveIndex={props.decisive?.index ?? null} verdict={verdict} />
          {has("idle") && <ThinkBalloon notes={idle} />}
        </div>

        {has("after") && after.length > 0 && (
          <div className="absolute bottom-[74px] left-1.5 z-[6] flex flex-col items-start gap-1">
            {after.map((note, index) => (
              <span key={index} className="comic-pop border-2 border-black bg-comic-yellow px-1.5 text-[11px] font-extrabold uppercase leading-5">
                {note.name} {note.effect}
              </span>
            ))}
          </div>
        )}

        <div className="comic-dim absolute bottom-1.5 left-1.5 z-[3] w-[calc(68%-12px)] border-2 border-black bg-comic-yellow px-2 py-0.5">
          <p className="text-[10px] font-extrabold uppercase leading-3">Tu</p>
          <p className="truncate font-display text-[20px] uppercase leading-[22px]">{props.card?.name ?? "?"}</p>
          <p className="text-[11px] font-extrabold leading-[13px]">{props.stats}</p>
        </div>
        <Crack />
      </section>

      <VerdictPanel
        verdict={verdict}
        tone={passed ? "win" : "lose"}
        hero={passed ? props.card : null}
        heroKey={`${props.number}-${props.card?.code ?? "none"}`}
        sfx={passed ? "SBAM!" : "KRAK!"}
        title={passed ? "Superata!" : "Fallita"}
      >
        <p className="text-[12px] font-bold leading-[15px]">
          {passed
            ? `${score} su ${required}.${props.decisive ? ` ${props.decisive.text}` : ""}`
            : `${score} su ${required}: ${missing === 1 ? "mancava 1 punto" : `mancavano ${missing} punti`}.`}
        </p>
        {props.ended && !passed && (
          <p className="text-[11px] font-semibold leading-[14px] text-[#444]">L&apos;Emergenza finisce qui.</p>
        )}
      </VerdictPanel>

      <div className="shrink-0 px-1.5 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-0.5" onClick={(event) => event.stopPropagation()}>
        {props.action(done, complete)}
      </div>
    </main>
  );
}
