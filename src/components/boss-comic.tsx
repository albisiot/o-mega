"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { comicFx, FxLayer, useComicFx, type ComicFx } from "@/components/comic-fx";
import {
  BEAT_MS,
  ComicArt,
  Crack,
  isCompact,
  NextSlot,
  NoteStack,
  paced,
  pageStyle,
  PowerBalloon,
  Rolling,
  SoundToggle,
  ThinkBalloon,
  useBeats,
  useVerdictBuzz,
  useWhenDone,
} from "@/components/comic-page";
import type { BossEntry, BossSide } from "@/lib/boss-powers";
import { playSound } from "@/lib/comic-sound";
import { chargeSource, powerFamily, powerSfx } from "@/lib/effect-families";
import { tieBreakReason } from "@/lib/round-powers";
import { LONG_PRESS_CLASS, type LongPressHandlers } from "@/lib/use-long-press";

// A Grande Minaccia turn told as a comic page (direction D): the boss with its five
// fronts and the hot ones lighting up, one panel per entry (who arrives, on which front,
// against whom, its powers speaking), then the fronts paying one by one and whose turn
// it was. A turn is two clashes, so the beats are tighter than in a match round.
const BOSS_MS = {
  hot: paced(300),
  firstEntry: paced(450),
  base: paced(100),
  power: paced(330),
  result: paced(250),
  nextEntry: paced(150),
  payout: paced(250),
  total: paced(300),
} as const;

export type BossFrontInfo = { name: string; level: number };

export type BossComicProps = {
  turn: number;
  turns: number;
  bossName: string;
  fronts: BossFrontInfo[];
  /** This turn's value of each front. */
  values: number[];
  holdersBefore: (BossSide | null)[];
  holdersAfter: (BossSide | null)[];
  rivalName: string;
  entries: Record<BossSide, BossEntry>;
  /** Stats of each entering card on its front's abilities. */
  stats: Record<BossSide, string>;
  press: Record<BossSide, LongPressHandlers | undefined>;
  points: Record<BossSide, number>;
  totals: Record<BossSide, number>;
  notices: string[];
  hint: (complete: boolean) => ReactNode;
  onContinue: () => void;
  /** The turn's totals are out, played or skipped to. */
  onVerdict?: () => void;
  /** Every beat has played (or the page was skipped to the end): the time to read it starts. */
  onDone?: () => void;
};

type Beat =
  | { at: number; kind: "hot" | "payout" | "total" }
  | { at: number; kind: "in" | "base" | "idle" | "result"; side: BossSide }
  | { at: number; kind: "note"; side: BossSide; index: number };

const SIDES: BossSide[] = ["me", "opponent"];

function planBeats(entries: Record<BossSide, BossEntry>): Beat[] {
  const beats: Beat[] = [{ at: BOSS_MS.hot, kind: "hot" }];
  let at = BOSS_MS.firstEntry;
  for (const side of SIDES) {
    const notes = entries[side].notes;
    beats.push({ at, kind: "in", side });
    at += BOSS_MS.base;
    beats.push({ at, kind: "base", side });
    at += BEAT_MS.baseCount;
    notes
      .map((note, index) => ({ note, index }))
      .filter(({ note }) => (note.active && !note.timing) || note.cancelled)
      .sort((a, b) => Number(Boolean(b.note.source && b.note.source !== "own")) - Number(Boolean(a.note.source && a.note.source !== "own")))
      .forEach(({ index }) => {
        beats.push({ at, kind: "note", side, index });
        at += BOSS_MS.power;
      });
    if (notes.some((note) => !note.active && !note.cancelled)) beats.push({ at, kind: "idle", side });
    notes.forEach((note, index) => {
      if (note.active && note.timing === "tie") {
        at += BOSS_MS.power;
        beats.push({ at, kind: "note", side, index });
      }
    });
    at += BOSS_MS.result;
    beats.push({ at, kind: "result", side });
    at += BOSS_MS.nextEntry;
  }
  at += BOSS_MS.payout;
  beats.push({ at, kind: "payout" });
  beats.push({ at: at + BOSS_MS.total, kind: "total" });
  return beats;
}

/**
 * The effects of a beat as it plays (effect-families.ts). An entry's strike hits the card
 * already on the front, or the one arriving with it; its charges fly into its score.
 */
function playBeat(beat: Beat, entries: Record<BossSide, BossEntry>, fx: ComicFx) {
  // Once an entry is settled, what it passes to the next turn (Riscossa, Slancio) flies to its slot.
  if (beat.kind === "result") {
    const passed = entries[beat.side].notes.find((n) => n.active && n.timing === "after");
    if (passed) {
      fx.token(`${beat.side}-panel`, `${beat.side}-slot`, passed.effect?.split(" ")[0] ?? "", "forward", { arc: 60, duration: 700 });
      playSound("whoosh");
    }
    return;
  }
  if (beat.kind !== "note") return;
  const entry = entries[beat.side];
  const note = entry.notes[beat.index];
  if (!note) return;
  const side = beat.side;
  const self = `${side}-note-${beat.index}`;
  const score = `${side}-score`;
  const points = note.effect?.split(" ")[0] ?? "";
  if (note.cancelled) {
    playSound(note.cancelled === "blocked" ? "down" : "hit");
    return;
  }
  if (note.source === "carried" || note.source === "pack") {
    fx.token(`${side}-slot`, score, points, "forward", { arc: -10 });
    playSound("whoosh");
    return;
  }
  const family = powerFamily(note.code);
  switch (family) {
    case "strike":
    case "stop":
      fx.bolt(self, `${side}-facing`);
      fx.word(`${side}-facing`, powerSfx(note.code), family === "stop" ? "stop" : "harm", { size: 28 });
      fx.shake(`${side}-facing`, 6);
      playSound(family === "stop" ? "stop" : "down");
      return;
    case "shield":
      fx.word(self, powerSfx(note.code), "shield", { above: true, size: 26, dx: side === "me" ? 40 : -40 });
      if (note.points) fx.token(self, score, points, "shield", { arc: 20 });
      playSound("shield");
      return;
    case "tiebreak":
      fx.word(score, powerSfx(note.code), "tie", { dx: side === "me" ? 64 : -64, size: 30 });
      playSound("hit");
      return;
    case "reveal":
    case "copy":
      fx.word(self, powerSfx(note.code), "info", { above: true, size: 26, dx: side === "me" ? 40 : -40 });
      playSound("reveal");
      return;
    case "forward":
      fx.word(self, powerSfx(note.code), "forward", { above: true, size: 26, dx: side === "me" ? 40 : -40 });
      playSound("whoosh");
      return;
    default: {
      const source = chargeSource(note.code);
      fx.token(source === "threat" ? "fronts" : source === "rival" ? `${side}-facing` : `${side}-label`, score, points, "help");
      window.setTimeout(() => {
        fx.word(score, powerSfx(note.code), "help", { dx: side === "me" ? 64 : -64, size: 30 });
        fx.sparks(score);
      }, paced(480));
      playSound("up");
    }
  }
}

/** The power without which the entry would not have taken (or kept) its front. */
function decisiveIndex(entry: BossEntry): number | null {
  const facing = entry.facing;
  if (!facing || entry.holder !== entry.side) return null;
  for (const [index, note] of entry.notes.entries()) {
    if (!note.active) continue;
    if (note.timing === "tie") return entry.highest > facing.highest ? null : index;
    if (note.timing || !note.points || note.points <= 0) continue;
    const without = entry.score - note.points;
    if (without < facing.score || (without === facing.score && entry.highest <= facing.highest)) return index;
  }
  return null;
}

/** What the sticker on an entry says once its front is settled, and whether it is good news. */
function sticker(entry: BossEntry): { text: string; good: boolean } {
  const mine = entry.side === "me";
  if (entry.holder === null) return { text: "Pari: nessuno", good: false };
  if (!entry.facing) return mine ? { text: "Da solo: è tuo", good: true } : { text: "Da solo: è suo", good: false };
  // Equal scores: the front went to the highest single value (or to Implacabile, whose balloon says so).
  if (entry.facing.score === entry.score) {
    if (entry.holder === entry.side) return mine ? { text: "Spareggio vinto!", good: true } : { text: "Spareggio perso", good: false };
    return mine ? { text: "Spareggio perso", good: false } : { text: "Spareggio vinto!", good: true };
  }
  if (entry.holder === entry.side) return mine ? { text: "Fronte preso!", good: true } : { text: "Fronte perso", good: false };
  return mine ? { text: "Non basta", good: false } : { text: "Il tuo tiene!", good: true };
}

function EntryPanel({
  entry,
  label,
  frontName,
  stats,
  press,
  fired,
  instant,
}: {
  entry: BossEntry;
  label: string;
  frontName: string;
  stats: string;
  press?: LongPressHandlers;
  fired: Beat[];
  instant: boolean;
}) {
  const side = entry.side;
  const mine = side === "me";
  const mark = (kind: Beat["kind"]) => fired.some((beat) => beat.kind === kind && "side" in beat && beat.side === side);
  const shown = new Set(fired.flatMap((beat) => (beat.kind === "note" && beat.side === side ? [beat.index] : [])));
  const settled = mark("result");
  const pending = entry.notes.reduce((sum, note, index) => sum + (note.points && !shown.has(index) ? note.points : 0), 0);
  const lost = settled && entry.holder !== null && entry.holder !== side;
  const facingLost = settled && entry.facing !== null && entry.holder === side;
  const voided = settled && entry.holder === null;
  const decisive = decisiveIndex(entry);
  const note = sticker(entry);
  const after = entry.notes.map((n, index) => ({ note: n, index })).filter(({ note: n }) => n.active && n.timing === "after");
  const order = fired.flatMap((beat) => (beat.kind === "note" && beat.side === side ? [beat.index] : []));

  if (!mark("in")) {
    return <section aria-hidden className="comic-panel relative min-h-[132px] flex-1 bg-panel-raised" />;
  }
  return (
    <section
      {...press}
      data-fx={`${side}-panel`}
      aria-label={`${label}: ${entry.card?.name ?? "?"} su ${frontName}`}
      className={`comic-panel ${mine ? "bg-comic-cyan" : "halftone bg-comic-magenta"} ${lost ? "comic-lost" : voided ? "comic-void" : ""} ${LONG_PRESS_CLASS} relative min-h-[132px] flex-1 overflow-hidden text-black`}
    >
      {entry.card && <ComicArt card={entry.card} className={`comic-dim absolute inset-y-0 h-full w-[40%] ${mine ? "left-0" : "right-0"}`} />}
      <div
        data-fx={`${side}-score`}
        className={`comic-dim absolute top-1.5 z-[4] grid h-[50px] w-[50px] place-items-center rounded-full border-[3px] border-foreground bg-black font-display text-[24px] tabular-nums text-comic-yellow ${
          mine ? "left-1.5" : "right-1.5"
        }`}
      >
        {mark("base") ? <Rolling value={entry.score - pending} instant={instant} /> : "–"}
      </div>
      <span
        className={`comic-dim absolute bottom-1.5 z-[3] max-w-[38%] truncate border-2 border-black bg-comic-yellow px-1.5 font-display text-[16px] uppercase leading-5 ${
          mine ? "left-1.5" : "right-1.5"
        }`}
      >
        {entry.card?.name ?? "?"}
      </span>

      <div className={`absolute top-1.5 ${mine ? "left-[calc(40%+8px)] right-1.5" : "left-1.5 right-[calc(40%+8px)]"}`}>
        <p data-fx={`${side}-label`} className="text-[10px] font-extrabold uppercase leading-3">{label} su</p>
        <p className="font-display text-[18px] uppercase leading-5">{frontName}</p>
        <p className="text-[10.5px] font-extrabold leading-3">{stats}</p>
      </div>

      {entry.facing && (
        <div
          className={`absolute bottom-1.5 z-[2] w-[72px] ${mine ? "right-2.5 rotate-[3deg]" : "left-2.5 -rotate-[3deg]"} ${
            facingLost ? "comic-lost" : ""
          }`}
        >
          <div data-fx={`${side}-facing`} className="relative h-[66px] border-[3px] border-black bg-black shadow-[3px_3px_0_#000]">
            {entry.facing.card && <ComicArt card={entry.facing.card} className="comic-dim absolute inset-0 h-full w-full" />}
            {/* On the art, not above it: above, on a short panel, it covered the front's abilities. */}
            <p className="absolute inset-x-0 bottom-0 z-[1] border-t-2 border-black bg-white px-1 text-[9px] font-bold leading-[10px]">
              <b className="block truncate uppercase">{entry.facing.card?.name ?? "?"}</b>
              {entry.facing.together ? "arriva insieme" : `c'è dal turno ${entry.facing.since}`}
            </p>
            <span className="comic-dim absolute -right-2 -top-2 z-[2] grid h-8 w-8 place-items-center rounded-full border-2 border-foreground bg-black font-display text-[16px] text-foreground">
              {entry.facing.score}
            </span>
            <Crack />
          </div>
        </div>
      )}

      {/* The balloons keep clear of the card's name and of the sticker at the bottom. */}
      <div className={`absolute bottom-10 top-[58px] flex w-[58%] flex-col ${mine ? "left-1" : "right-1"}`}>
        <NoteStack side={side} className="z-[7]">
          {(squeeze) => {
            const count = order.length + (settled ? after.length : 0);
            return (
              <>
                {order.map((index, position) => (
                  <PowerBalloon
                    key={index}
                    note={entry.notes[index]}
                    side={side}
                    fxName={`${side}-note-${index}`}
                    decisive={settled && decisive === index}
                    compact={isCompact(squeeze, position, count)}
                  />
                ))}
                {settled &&
                  after.map(({ note: n, index }, position) => (
                    <PowerBalloon
                      key={`after-${index}`}
                      note={n}
                      side={side}
                      fxName={`${side}-note-${index}`}
                      compact={isCompact(squeeze, order.length + position, count)}
                    />
                  ))}
                {mark("idle") && <ThinkBalloon notes={entry.notes.filter((n) => !n.active && !n.cancelled)} compact={squeeze > 0} />}
              </>
            );
          }}
        </NoteStack>
      </div>
      {settled && (
        <span
          className={`comic-stamp absolute bottom-2 z-[8] border-[3px] px-2 font-display text-[19px] uppercase leading-7 shadow-[3px_3px_0_#000] ${
            mine ? "left-[calc(40%-24px)] -rotate-[4deg]" : "right-[calc(40%-24px)] rotate-[4deg]"
          } ${note.good ? "border-black bg-comic-yellow text-black" : "border-foreground bg-black text-comic-magenta"}`}
        >
          {note.text}
        </span>
      )}
      {/* The crack splits the card's art, not the front's name and abilities beside it. */}
      <div className={`pointer-events-none absolute inset-y-0 w-[40%] ${mine ? "left-0" : "right-0"}`}>
        <Crack />
      </div>
    </section>
  );
}

/** The entry's front as [front, line] when two equal scores met there; none otherwise. */
function tieLine(entry: BossEntry, frontName: string): [number, string][] {
  const facing = entry.facing;
  if (!facing || facing.score !== entry.score) return [];
  const prefix = `${frontName}, pari ${entry.score} a ${facing.score}`;
  if (entry.holder === null) return [[entry.front, `${prefix} e ${tieBreakReason(null, entry, null)}.`]];
  const won = entry.holder === entry.side;
  const [winner, loser] = won ? [entry, facing] : [facing, entry];
  // Implacabile comes before the highest value: the entry's own note tells it, or a highest value that could not have won.
  const relentless =
    (won && entry.notes.some((note) => note.active && note.timing === "tie")) || winner.highest <= loser.highest
      ? (winner.card?.name ?? "?")
      : null;
  return [[entry.front, `${prefix}: ${tieBreakReason(winner, loser, null, relentless)}.`]];
}

/** A Grande Minaccia turn as a comic page. */
export function BossComic(props: BossComicProps) {
  const { entries, values, points } = props;
  // A new turn is a new page.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const beats = useMemo(() => planBeats(entries), [props.turn]);
  const { fired, done, skipped, complete } = useBeats(beats);
  const has = (kind: Beat["kind"]) => fired.some((beat) => beat.kind === kind);
  const { layer } = useComicFx();
  const played = useRef(0);
  useEffect(() => {
    const fresh = fired.slice(played.current);
    played.current = fired.length;
    if (skipped) return;
    const fx = comicFx(layer.current);
    fresh.forEach((beat) => {
      if (beat.kind === "total") playSound(points.me > points.opponent ? "win" : points.opponent > points.me ? "lose" : "void");
      else playBeat(beat, entries, fx);
    });
    // Only the beats count: the props of a page do not change while it plays.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fired.length, skipped]);
  const settledOn = (side: BossSide) => fired.some((beat) => beat.kind === "result" && beat.side === side);
  const lowest = Math.min(...values);
  // Slots on the boss panel: a bonus waiting from the turn before, or passed on to the next.
  const slots = SIDES.flatMap((side) => {
    const notes = entries[side].notes;
    const spoke = new Set(fired.flatMap((beat) => (beat.kind === "note" && beat.side === side ? [beat.index] : [])));
    const carriedIndex = notes.findIndex((n) => n.source === "carried" || n.source === "pack");
    const passed = notes.find((n) => n.active && n.timing === "after");
    if (carriedIndex < 0 && !passed) return [];
    const slot = {
      carried: carriedIndex >= 0 && !spoke.has(carriedIndex) ? `+${notes[carriedIndex].points ?? 0}` : null,
      passed: passed && settledOn(side) ? (passed.effect?.split(" ")[0] ?? "") : null,
    };
    // On the last turn there is no next one: once the bonus is in, the empty slot goes.
    if (props.turn === props.turns && !slot.carried && !slot.passed) return [];
    return [{ side, slot }];
  });
  const turnWinner: BossSide | null = points.me > points.opponent ? "me" : points.opponent > points.me ? "opponent" : null;
  useVerdictBuzz(has("total"), turnWinner === "me" ? "win" : turnWinner === "opponent" ? "lose" : "void", props.onVerdict);
  useWhenDone(done, props.onDone);

  // A front's stripe takes the new holder's colour once its entry is settled.
  const holderNow = (front: number) => {
    for (const side of [...SIDES].reverse()) {
      if (entries[side].front === front && settledOn(side)) return props.holdersAfter[front];
    }
    return has("payout") ? props.holdersAfter[front] : props.holdersBefore[front];
  };
  // Fronts settled on equal scores: what settled them (SPEC §5.6), once per front.
  const tieLines = [...new Map(SIDES.flatMap((side) => tieLine(entries[side], props.fronts[entries[side].front]?.name ?? ""))).values()];
  const behind = props.totals.opponent - props.totals.me;
  const left = props.turns - props.turn;
  const standing =
    left === 0
      ? ""
      : `${behind > 0 ? `Sei sotto di ${behind}` : behind < 0 ? `Sei avanti di ${-behind}` : "Siete pari"}, ${left === 1 ? "manca 1 turno" : `mancano ${left} turni`}.`;

  return (
    <main
      className="comic-page relative mt-1 flex min-h-0 flex-1 cursor-pointer flex-col gap-1.5 overflow-hidden px-1.5 pb-[calc(env(safe-area-inset-bottom)+4px)] pt-1.5"
      style={pageStyle}
      onClick={() => (done ? props.onContinue() : complete())}
    >
      <section aria-label={props.bossName} className="comic-panel halftone relative shrink-0 bg-comic-orange px-2 pb-2 pt-1.5 text-black">
        <p className="inline-block border-2 border-black bg-comic-yellow px-2 text-[11px] font-extrabold uppercase leading-5">
          Turno {props.turn} di {props.turns} · ogni fronte occupato paga
        </p>
        {/* The slots beside the name, never over it: a padding guessed their width, and was short. */}
        <div className="mt-0.5 flex items-start gap-1">
          <p className="min-w-0 flex-1 font-display text-[22px] uppercase leading-6">{props.bossName}</p>
          {slots.length > 0 && (
            <div className="flex shrink-0 gap-1">
              {slots.map(({ side, slot }) => (
                <NextSlot key={side} side={side} number={props.turn} carried={slot.carried} passed={slot.passed} unit="T" />
              ))}
            </div>
          )}
        </div>
        <ol data-fx="fronts" className="mt-1 grid grid-cols-5 gap-1">
          {props.fronts.map((front, index) => {
            const hot = values[index] > lowest;
            const holder = holderNow(index);
            return (
              <li
                key={index}
                className={`relative flex h-[70px] flex-col border-2 border-black px-1 pb-2 pt-0.5 transition-[background-color,box-shadow] duration-300 ${
                  hot && has("hot") ? "bg-comic-yellow" : "bg-white"
                } ${holder === "me" ? "shadow-[inset_0_-7px_0_var(--comic-cyan)]" : holder === "opponent" ? "shadow-[inset_0_-7px_0_var(--comic-magenta)]" : ""}`}
              >
                <span className="line-clamp-3 break-words text-[9.5px] font-extrabold leading-[10px] [hyphens:auto]" lang="it">
                  {front.name}
                </span>
                <span className="mt-auto flex items-baseline justify-between">
                  <span className="font-display text-[18px] leading-none">+{values[index]}</span>
                  <span className="text-[8px] font-bold">Lv{front.level}</span>
                </span>
                {hot && has("hot") && (
                  <i className="comic-stamp absolute bottom-0 left-1/2 z-[1] -translate-x-1/2 translate-y-1/2 -rotate-3 bg-black px-1 font-sfx text-[11px] not-italic leading-[14px] tracking-wide text-comic-yellow">
                    Caldo!
                  </i>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      {SIDES.map((side) => (
        <EntryPanel
          key={side}
          entry={entries[side]}
          label={side === "me" ? "Tu entri" : `${props.rivalName} entra`}
          frontName={props.fronts[entries[side].front]?.name ?? ""}
          stats={props.stats[side]}
          press={props.press[side]}
          fired={fired}
          instant={skipped}
        />
      ))}

      <section
        aria-live="polite"
        aria-label="Il pagamento del turno"
        className={`comic-panel comic-verdict relative h-[124px] shrink-0 overflow-hidden ${
          !has("payout") ? "bg-panel-raised" : turnWinner === "me" ? "rays-gold" : turnWinner === "opponent" ? "halftone bg-comic-magenta" : "bg-[#cfc6ad]"
        }`}
      >
        {has("payout") && (
          <ol className="relative z-[2] mx-1.5 mt-1.5 grid grid-cols-5 gap-1">
            {props.holdersAfter.map((holder, index) => (
              <li
                key={index}
                className={`comic-pop flex h-10 flex-col items-center justify-center border-2 border-black ${
                  holder === "me" ? "bg-comic-cyan text-black" : holder === "opponent" ? "bg-comic-magenta text-black" : "bg-[#3a3a44] text-faint"
                }`}
                style={{ animationDelay: `${paced(index * 70)}ms` }}
              >
                <span className="font-display text-[17px] leading-none">+{values[index]}</span>
                <span className="text-[8.5px] font-extrabold uppercase">{holder === "me" ? "a te" : holder === "opponent" ? "al rivale" : "nessuno"}</span>
              </li>
            ))}
          </ol>
        )}
        {has("total") && (
          <>
            <span className="comic-stamp text-sfx absolute left-2.5 top-[52px] z-[5] -rotate-[5deg] text-[30px] leading-none text-foreground">
              {turnWinner === "me" ? "Turno tuo!" : turnWinner === "opponent" ? "Turno suo" : "Pari!"}
            </span>
            <div className="comic-fade absolute bottom-1.5 right-1.5 z-[4] w-[56%] border-[3px] border-black bg-white px-2 py-0.5 text-black">
              <p className="font-display text-[17px] uppercase leading-5">
                Tu +{points.me} · {props.rivalName} +{points.opponent}
              </p>
              <p className="text-[11px] font-bold leading-[13px]">
                Totale {props.totals.me} – {props.totals.opponent}. {standing}
              </p>
              {[...tieLines, ...props.notices].map((notice) => (
                <p key={notice} className="text-[10px] font-semibold leading-3 text-[#444]">
                  {notice}
                </p>
              ))}
            </div>
          </>
        )}
      </section>

      <div className="flex shrink-0 items-center justify-center gap-2">
        {props.hint(done)}
        <SoundToggle />
      </div>
      <FxLayer layerRef={layer} />
    </main>
  );
}
