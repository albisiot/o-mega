"use client";

import { useEffect, useMemo, useRef, type CSSProperties, type ReactNode } from "react";
import type { ThreatModifier } from "@o-mega/game-engine";
import { comicFx, FxLayer, useComicFx, type ComicFx } from "@/components/comic-fx";
import {
  AbilityChips,
  BEAT_MS,
  ComicArt,
  Crack,
  CutIn,
  paced,
  pageStyle,
  isCompact,
  NoteStack,
  PowerBalloon,
  prefersReducedMotion,
  Rolling,
  SoundToggle,
  ThinkBalloon,
  useBeats,
  useVerdictBuzz,
  VerdictPanel,
  type ComicChip,
} from "@/components/comic-page";
import { playSound } from "@/lib/comic-sound";
import { chargeSource, pointsHelp, powerFamily, powerSfx, ruleSfx } from "@/lib/effect-families";
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
  /** The abilities as chips, with the marks of a rare threat's rule. */
  chips?: ComicChip[];
  /** A rare threat's rule, worded, and the tier's colour. */
  twist?: { name: string; text: string } | null;
  rule?: ThreatModifier | null;
  tierColor?: string | null;
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

type Beat = { at: number; kind: "target" | "base" | "idle" | "verdict" | "after" } | { at: number; kind: "note" | "cutin"; index: number };

const carriedIn = (note: EmergencyNote) => note.source === "carried" || note.source === "pack";

function planBeats(notes: EmergencyNote[], decisive: number | null): Beat[] {
  const beats: Beat[] = [{ at: BEAT_MS.twist, kind: "target" }];
  let at = BEAT_MS.twist + BEAT_MS.base;
  beats.push({ at, kind: "base" });
  at += BEAT_MS.baseCount;
  // The bonus carried from the card before first, then the card's own power.
  const order = notes
    .map((note, index) => ({ note, index }))
    .filter(({ note }) => note.active && note.timing !== "after")
    .sort((a, b) => Number(carriedIn(b.note)) - Number(carriedIn(a.note)));
  for (const { index } of order) {
    // The power that saved the threat gets a cut-in across the page.
    if (index === decisive && !prefersReducedMotion()) {
      beats.push({ at, kind: "cutin", index });
      at += Math.round(BEAT_MS.cutIn * 0.8);
    }
    beats.push({ at, kind: "note", index });
    at += BEAT_MS.power + (notes[index].threshold ? paced(150) : 0);
  }
  if (notes.some((note) => !note.active)) {
    beats.push({ at, kind: "idle" });
    at += BEAT_MS.power / 2;
  }
  at += BEAT_MS.verdict;
  beats.push({ at, kind: "verdict" });
  if (notes.some((note) => note.active && note.timing === "after")) beats.push({ at: at + BEAT_MS.after, kind: "after" });
  return beats;
}

/** The effects of a beat as it plays (effect-families.ts): there is no opponent, so what hits, hits the threshold. */
function playBeat(beat: Beat, props: EmergencyComicProps, fx: ComicFx) {
  if (beat.kind === "target") {
    const word = ruleSfx(props.rule);
    if (props.rule) playSound("threat");
    if (word) fx.word("rule", word, "rule", { above: true, dx: 80, size: 30 });
    (props.chips ?? [])
      .map((chip, index) => ({ chip, index }))
      .filter(({ chip }) => chip.mark)
      .slice(0, 4)
      .forEach(({ chip, index }) => fx.token("rule", `me-chip-${index}`, chip.mark!.text, chip.mark!.tone === "down" ? "harm" : "rule", { arc: 10 }));
    return;
  }
  if (beat.kind === "verdict") {
    playSound(props.passed ? "win" : "lose");
    return;
  }
  if (beat.kind === "cutin") {
    playSound("cutin");
    return;
  }
  if (beat.kind === "after") {
    props.notes.forEach((note, index) => {
      if (note.active && note.timing === "after") {
        fx.token("panel", "counter", note.effect?.split(" ")[0] ?? "", "forward", { arc: 60, duration: 700 });
        fx.word(`note-${index}`, powerSfx(note.code), "forward", { above: true, size: 30, dx: 50 });
      }
    });
    playSound("whoosh");
    return;
  }
  if (beat.kind !== "note") return;
  const note = props.notes[beat.index];
  if (!note) return;
  const points = note.effect?.split(" ")[0] ?? "";
  if (carriedIn(note)) {
    fx.token("counter", "score", points, "forward", { arc: -10 });
    playSound("whoosh");
    return;
  }
  const family = powerFamily(note.code);
  if (note.threshold) {
    // Sabotatore and Implacabile lower the threshold: the line takes the hit.
    if (family === "strike") fx.bolt(`note-${beat.index}`, "line");
    fx.word("line", powerSfx(note.code), family === "strike" ? "harm" : "tie", { dx: -60, dy: -30 });
    playSound(family === "strike" ? "down" : "hit");
    return;
  }
  if (family === "reveal" || family === "copy") {
    fx.word(`note-${beat.index}`, powerSfx(note.code), "info", { above: true, size: 30, dx: 50 });
    playSound("reveal");
    return;
  }
  const help = note.points === undefined || pointsHelp(note.points, props.rule);
  const source = chargeSource(note.code);
  fx.token(source === "threat" ? "threat-abs" : source === "round" ? "counter" : "name", "score", points, help ? "help" : "harm");
  window.setTimeout(() => {
    fx.word("score", powerSfx(note.code), help ? "help" : "harm", { dx: -76, dy: -4, size: 34 });
    fx.sparks("score", help ? "help" : "harm");
  }, paced(480));
  playSound(help ? "up" : "down");
}

/** The result of an Emergenza play as a comic page. */
export function EmergencyComic(props: EmergencyComicProps) {
  const { notes, score, target, required, passed } = props;
  // A new play is a new page.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const beats = useMemo(() => planBeats(notes, props.decisive?.index ?? null), [props.number]);
  const { fired, done, skipped, complete } = useBeats(beats);
  const has = (kind: Beat["kind"]) => fired.some((beat) => beat.kind === kind);
  const verdict = has("verdict");
  useVerdictBuzz(verdict, passed ? "win" : "lose", props.onVerdict);
  const { layer } = useComicFx();
  const played = useRef(0);
  useEffect(() => {
    const fresh = fired.slice(played.current);
    played.current = fired.length;
    if (skipped) return;
    const fx = comicFx(layer.current);
    fresh.forEach((beat) => playBeat(beat, props, fx));
    // Only the beats count: the props of a page do not change while it plays.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fired.length, skipped]);
  const order = fired.flatMap((beat) => (beat.kind === "note" ? [beat.index] : []));
  const cut = skipped ? undefined : [...fired].reverse().find((beat) => beat.kind === "cutin");
  const cutNote = cut && "index" in cut ? notes[cut.index] : null;

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
  const idle = notes.filter((note) => !note.active);
  const after = notes.map((note, index) => ({ note, index })).filter(({ note }) => note.active && note.timing === "after");

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
        <p data-fx="counter" className="inline-block border-2 border-black bg-comic-yellow px-2 text-[11px] font-extrabold uppercase leading-5">
          Minaccia {props.number} di {props.of} · {props.passedBefore} {props.passedBefore === 1 ? "superata" : "superate"} ·{" "}
          {props.failedBefore} {props.failedBefore === 1 ? "fallita" : "fallite"}
        </p>
        <div className="mt-1 max-w-[calc(100%-96px)]">
          <p className="font-display text-[28px] uppercase leading-[30px]">{props.threatName}</p>
          <p data-fx="threat-abs" className="mt-1 flex flex-wrap gap-1">
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
        {props.twist && (
          <p
            data-fx="rule"
            className={`comic-twist comic-rule relative mt-1.5 max-w-[calc(100%-96px)] border-[3px] border-black bg-white px-2.5 py-1 text-[12px] font-semibold leading-4 shadow-[4px_4px_0_#000] ${
              props.rule?.code === "tomb_silence" ? "comic-rule-dark" : ""
            } ${has("target") ? "comic-on" : ""}`}
            style={props.tierColor ? ({ "--rule-color": props.tierColor } as CSSProperties) : undefined}
          >
            <span className="font-display uppercase">{props.twist.name}!</span> {props.twist.text}
          </p>
        )}
        {props.lastChance && (
          <p className={`comic-twist mt-1.5 inline-block border-2 border-black bg-comic-magenta px-2 text-[11px] font-extrabold uppercase leading-5 ${has("target") ? "comic-on" : ""}`}>
            Alla prossima fallita finisce
          </p>
        )}
      </section>

      <section
        {...props.press}
        data-fx="panel"
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
            data-fx="line"
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

        <div data-fx="score" className="comic-dim absolute right-2.5 top-1.5 z-[4] grid h-[62px] w-[62px] place-items-center rounded-full border-[3px] border-foreground bg-black font-display text-[30px] tabular-nums text-comic-yellow">
          {scoreShown === null ? "–" : <Rolling value={scoreShown} instant={skipped} />}
        </div>

        {/* The balloons fill the room above the chips, and never go under them. */}
        <div className="absolute bottom-1.5 left-1.5 top-[70px] flex w-[calc(68%-12px)] flex-col gap-1">
          <NoteStack side="me" className="z-[7]">
            {(squeeze) => {
              const count = order.length + (has("after") ? after.length : 0);
              return (
                <>
                  {order.map((index, position) => (
                    <PowerBalloon
                      key={index}
                      note={notes[index]}
                      side="me"
                      fxName={`note-${index}`}
                      harm={Boolean(notes[index].points) && !pointsHelp(notes[index].points!, props.rule)}
                      decisive={verdict && props.decisive?.index === index}
                      compact={isCompact(squeeze, position, count)}
                    />
                  ))}
                  {has("after") &&
                    after.map(({ note, index }, position) => (
                      <PowerBalloon
                        key={`after-${index}`}
                        note={note}
                        side="me"
                        fxName={`note-${index}`}
                        compact={isCompact(squeeze, order.length + position, count)}
                      />
                    ))}
                  {has("idle") && <ThinkBalloon notes={idle} compact={squeeze > 0} />}
                </>
              );
            }}
          </NoteStack>

          <div className="relative z-[3] flex shrink-0 flex-col gap-1">
            {props.chips && (
              <div className="comic-dim">
                <AbilityChips side="me" chips={props.chips} ruled={has("target")} struck={false} />
              </div>
            )}
            <div data-fx="name" className="comic-dim border-2 border-black bg-comic-yellow px-2 py-0.5">
              <p className="text-[10px] font-extrabold uppercase leading-3">Tu</p>
              <p className="truncate font-display text-[20px] uppercase leading-[22px]">{props.card?.name ?? "?"}</p>
              {!props.chips && <p className="text-[11px] font-extrabold leading-[13px]">{props.stats}</p>}
            </div>
          </div>
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

      <div className="flex shrink-0 items-center gap-1 px-1.5 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-0.5" onClick={(event) => event.stopPropagation()}>
        <div className="min-w-0 flex-1">{props.action(done, complete)}</div>
        <SoundToggle />
      </div>
      {cut && cutNote && (
        <CutIn key={`cut-${props.number}`} card={props.card} side="me" title={`${cutNote.name}!`} text={cutNote.effect} harm={powerFamily(cutNote.code) === "strike"} />
      )}
      <FxLayer layerRef={layer} />
    </main>
  );
}
