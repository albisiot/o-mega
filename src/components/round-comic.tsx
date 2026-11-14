"use client";

import { useEffect, useMemo, useRef, type CSSProperties, type ReactNode } from "react";
import type { ThreatModifier } from "@o-mega/game-engine";
import { comicFx, FxLayer, useComicFx, type ComicFx, type FxTone } from "@/components/comic-fx";
import {
  AbilityChips,
  BEAT_MS,
  ComicArt,
  Crack,
  CutIn,
  isCompact,
  NextSlot,
  NoteStack,
  paced,
  pageStyle,
  PowerBalloon,
  prefersReducedMotion,
  RevealStrip,
  Rolling,
  RuleRibbon,
  ShieldPlate,
  SoundToggle,
  ThinkBalloon,
  useBeats,
  useVerdictBuzz,
  useWhenDone,
  VerdictPanel,
  type ComicChip,
} from "@/components/comic-page";
import type { MarkTone } from "@/lib/ability-marks";
import { playSound } from "@/lib/comic-sound";
import {
  chargeSource,
  familyOrder,
  isDistinctive,
  pointsHelp,
  powerFamily,
  powerSfx,
  rulePageEffect,
  ruleSfx,
} from "@/lib/effect-families";
import type { MatchCard } from "@/lib/match";
import type { PowerNote } from "@/lib/round-powers";
import { LONG_PRESS_CLASS, type LongPressHandlers } from "@/lib/use-long-press";

// A round result told as a comic page, read in order (direction D of the clash drafts), with
// the special abilities shown by family (effect-families.ts): the threat's rule lands as a
// caption and marks the abilities it touches, then the scores count, the bonus carried from
// the round before flies in, the stops, strikes and shields, the charges, Implacabile on a
// tie, the verdict, and what goes on to the next round. Points fly from what set them off to
// the score; distinctive or decisive powers get a cut-in across the page. The shared pieces
// are in comic-page.tsx and comic-fx.tsx.

export type ComicKey = "me" | "opponent";

export type ComicSide = {
  /** "Tu" or the opponent's name. */
  label: string;
  card: MatchCard | null;
  /** The abilities of the threat with this card's values, as one line (when there are no chips). */
  stats: string;
  /** The abilities as chips, with the marks of the rule and of Sabotatore. */
  chips?: ComicChip[];
  score: number;
  /** Annotated notes (roundPowerNotes with annotate) get their family's balloon and effects. */
  notes: PowerNote[];
  /** Points the threat's rule gave or took (factions, rarities, who is behind), as a ribbon. */
  flag?: { text: string; points: number } | null;
  /** Points Sabotatore took from this card: the score counts them first and drops when the strike lands. */
  struckPoints?: number;
  press?: LongPressHandlers;
};

export type RoundComicProps = {
  round: number;
  level: number;
  threatName: string;
  abilities: string[];
  /** The threat modifier, already worded: shown as the twist caption. */
  twist: { name: string; text: string } | null;
  /** The modifier itself, for its effects on the page. */
  rule?: ThreatModifier | null;
  /** A rare threat's tier colour: the caption's stripes take it. */
  tierColor?: string | null;
  me: ComicSide;
  opponent: ComicSide;
  winner: ComicKey | "none";
  /** The power note that changed the result, if any. */
  decisive: { side: ComicKey; index: number; text: string } | null;
  /**
   * What the viewer's Veggente or Spia showed in this round: the next threats, the opposing
   * characters still to come. Shown when that power speaks, after the verdict.
   */
  revealed?: { foreseen: { round: number; level: number; name: string }[]; spied: MatchCard[] } | null;
  /** One line under the verdict: who beat whom, or why nobody did. */
  resultLine: string;
  /** Short notices (time up, a tie nobody could settle). */
  notices: string[];
  /** The hint at the bottom; it changes once the page is complete. */
  hint: (complete: boolean) => ReactNode;
  onContinue: () => void;
  /** The verdict is out (SBAM!), played or skipped to. */
  onVerdict?: () => void;
  /** Every beat has played (or the page was skipped to the end): the time to read it starts. */
  onDone?: () => void;
};

type Beat =
  | { at: number; kind: "twist" | "base" | "flags" | "level" | "idle" | "verdict" }
  | { at: number; kind: "note" | "cutin"; side: ComicKey; index: number };

type CutBeat = { at: number; kind: "cutin"; side: ComicKey; index: number };

const SIDES: ComicKey[] = ["me", "opponent"];
const other = (side: ComicKey): ComicKey => (side === "me" ? "opponent" : "me");
const MAX_CUT_INS = 2;

/** Where a note speaks on the page: before the verdict, on a tie, after it. */
function phase(note: PowerNote): "before" | "tie" | "after" | "idle" {
  if (note.cancelled) return "before";
  if (!note.active) return "idle";
  if (note.timing === "tie") return "tie";
  if (note.timing === "after" || powerFamily(note.code) === "reveal") return "after";
  return "before";
}

/** The order of a note before the verdict: silenced powers, bonus carried in, then by family. */
function rank(note: PowerNote): number {
  if (note.cancelled === "silenced") return -2;
  if (note.source === "carried" || note.source === "pack") return -1;
  // An Annullatore's victim right after the stop.
  if (note.cancelled === "nullified") return familyOrder("stop") + 0.5;
  // A strike a shield stopped still speaks, as a strike.
  return familyOrder(powerFamily(note.code));
}

/** The notes that get a cut-in: the decisive one first, then distinctive powers, at most two. */
function cutIns(props: Pick<RoundComicProps, "me" | "opponent" | "decisive">): Set<string> {
  if (prefersReducedMotion()) return new Set();
  const keys: string[] = [];
  if (props.decisive) keys.push(`${props.decisive.side}-${props.decisive.index}`);
  for (const side of SIDES) {
    props[side].notes.forEach((note, index) => {
      if (note.source === "own" && note.active && !note.cancelled && phase(note) === "before" && isDistinctive(note.code)) {
        keys.push(`${side}-${index}`);
      }
    });
  }
  return new Set([...new Set(keys)].slice(0, MAX_CUT_INS));
}

/** The beats of the page, in time order. */
function planBeats(props: Pick<RoundComicProps, "twist" | "rule" | "me" | "opponent" | "decisive">, cuts: Set<string>): Beat[] {
  const beats: Beat[] = [];
  let at = 0;
  if (props.twist) {
    at = BEAT_MS.twist;
    beats.push({ at, kind: "twist" });
    // The page turns over under Rovescio: the count waits for it.
    if (rulePageEffect(props.rule) === "flip") at += paced(500);
  }
  at += BEAT_MS.base;
  beats.push({ at, kind: "base" });
  at += BEAT_MS.baseCount;

  const before = SIDES.flatMap((side) =>
    props[side].notes.flatMap((note, index) => (phase(note) === "before" ? [{ side, index, note }] : [])),
  ).sort((a, b) => rank(a.note) - rank(b.note) || SIDES.indexOf(a.side) - SIDES.indexOf(b.side) || a.index - b.index);
  const flagsAt = SIDES.some((side) => props[side].flag) ? before.findIndex(({ note }) => rank(note) >= 0) : -1;
  const pushFlags = () => {
    beats.push({ at, kind: "flags" });
    at += BEAT_MS.flags;
  };
  before.forEach(({ side, index, note }, n) => {
    if (n === flagsAt) pushFlags();
    if (cuts.has(`${side}-${index}`)) {
      beats.push({ at, kind: "cutin", side, index });
      at += Math.round(BEAT_MS.cutIn * 0.8);
    }
    beats.push({ at, kind: "note", side, index });
    // A strike or a shield needs the time for the bolt to land.
    const family = powerFamily(note.code);
    at += BEAT_MS.power + (family === "strike" || family === "shield" ? paced(150) : 0);
  });
  if (flagsAt === -1 && SIDES.some((side) => props[side].flag)) pushFlags();

  if (SIDES.some((side) => props[side].notes.some((note) => phase(note) === "idle"))) {
    beats.push({ at, kind: "idle" });
    at += BEAT_MS.power / 2;
  }
  // Implacabile speaks once the scores stand level.
  const ties = SIDES.flatMap((side) => props[side].notes.flatMap((note, index) => (phase(note) === "tie" ? [{ side, index }] : [])));
  if (ties.length > 0) {
    at += BEAT_MS.verdict;
    beats.push({ at, kind: "level" });
    for (const { side, index } of ties) {
      at += BEAT_MS.level;
      beats.push({ at, kind: "note", side, index });
    }
  }
  at += BEAT_MS.verdict;
  beats.push({ at, kind: "verdict" });
  // Then what goes on to the next round, and what only shows something.
  for (const side of SIDES) {
    props[side].notes.forEach((note, index) => {
      if (phase(note) === "after") {
        at += BEAT_MS.after;
        beats.push({ at, kind: "note", side, index });
      }
    });
  }
  return beats;
}

const MARK_TONE: Record<MarkTone, FxTone> = { up: "rule", down: "harm", ice: "ice", off: "info", ok: "info" };

/** The effects of a beat as it plays. */
function playBeat(beat: Beat, props: RoundComicProps, fx: ComicFx) {
  switch (beat.kind) {
    case "twist": {
      playSound("threat");
      const word = ruleSfx(props.rule);
      if (word) fx.word("rule", word, rulePageEffect(props.rule) === "frost" ? "ice" : "rule", { above: true, dx: 90, size: 30 });
      for (const side of SIDES) {
        (props[side].chips ?? [])
          .map((chip, index) => ({ chip, index }))
          .filter(({ chip }) => chip.mark)
          .slice(0, 4)
          .forEach(({ chip, index }) => fx.token("rule", `${side}-chip-${index}`, chip.mark!.text, MARK_TONE[chip.mark!.tone], { arc: 10 }));
      }
      // Specchio: each card's values cross to the other side.
      if (props.rule?.code === "mirror") {
        fx.token("me-chips", "opponent-chips", "⇄", "info", { arc: 40, duration: 700 });
        fx.token("opponent-chips", "me-chips", "⇄", "info", { arc: -30, duration: 700 });
      }
      return;
    }
    case "flags": {
      const flag = props.me.flag ?? props.opponent.flag;
      if (flag) playSound(pointsHelp(props.me.flag?.points ?? 0, props.rule) ? "up" : "down");
      return;
    }
    case "cutin":
      playSound("cutin");
      return;
    case "verdict":
      playSound(props.winner === "me" ? "win" : props.winner === "opponent" ? "lose" : "void");
      return;
    case "note":
      playNote(beat.side, beat.index, props, fx);
      return;
    default:
  }
}

function playNote(side: ComicKey, index: number, props: RoundComicProps, fx: ComicFx) {
  const note = props[side].notes[index];
  if (!note) return;
  const rival = other(side);
  const self = `${side}-note-${index}`;
  const score = `${side}-score`;
  const points = note.effect?.split(" ")[0] ?? "";
  if (note.cancelled) {
    playSound(note.cancelled === "silenced" ? "stop" : note.cancelled === "blocked" ? "down" : "hit");
    return;
  }
  if (note.source === "carried" || note.source === "pack") {
    fx.token(`${side}-slot`, score, points, "forward", { arc: -10 });
    playSound("whoosh");
    return;
  }
  const family = powerFamily(note.code);
  const help = note.points === undefined || pointsHelp(note.points, props.rule);
  switch (family) {
    case "charge": {
      const source = chargeSource(note.code);
      const from = source === "threat" ? "threat-abs" : source === "round" ? "round-cap" : source === "rival" ? `${rival}-panel` : `${side}-name`;
      fx.token(from, score, points, help ? "help" : "harm");
      window.setTimeout(() => {
        fx.word(score, powerSfx(note.code), help ? "help" : "harm", { dx: side === "me" ? 76 : -76, dy: -4, size: 34 });
        fx.sparks(score, help ? "help" : "harm");
      }, paced(480));
      playSound(help ? "up" : "down");
      return;
    }
    case "strike":
      fx.bolt(self, `${rival}-chips`);
      fx.word(`${rival}-chips`, powerSfx(note.code), "harm", { above: true, size: 34, dy: -28 });
      fx.shake(`${rival}-panel`, 7);
      playSound("down");
      return;
    case "shield":
      if (note.code === "reflect") {
        fx.bolt(`${side}-shield`, `${rival}-chips`, "shield");
        fx.word(`${side}-shield`, powerSfx(note.code), "shield", { above: true, size: 32 });
        fx.shake(`${rival}-panel`, 6);
      } else {
        fx.bolt(`${rival}-panel`, `${side}-shield`);
        fx.word(`${side}-shield`, powerSfx(note.code), "shield", { above: true, size: 32 });
        if (note.points) window.setTimeout(() => fx.token(`${side}-shield`, score, points, "shield", { arc: 20 }), paced(250));
      }
      playSound("shield");
      return;
    case "stop":
      fx.word(self, powerSfx(note.code), "stop", { above: true, size: 30, dx: side === "me" ? 50 : -50 });
      fx.token(self, `${rival}-panel`, "STOP", "stop", { arc: 30 });
      playSound("stop");
      return;
    case "tiebreak":
      fx.word("eq", powerSfx(note.code), "tie", { dy: -44 });
      fx.shake("eq", 5);
      playSound("hit");
      return;
    case "forward":
      fx.token(`${side}-panel`, `${side}-slot`, points, "forward", { arc: 80, duration: 700 });
      fx.sparks(`${side}-panel`, "forward");
      fx.word(self, powerSfx(note.code), "forward", { above: true, size: 30, dx: side === "me" ? 50 : -50 });
      playSound("whoosh");
      return;
    case "copy":
      fx.token("round-cap", self, "×", "info", { arc: 20 });
      fx.word(self, powerSfx(note.code), "info", { above: true, size: 30, dx: side === "me" ? 50 : -50 });
      if (note.points) window.setTimeout(() => fx.token(self, score, points, "help", { arc: 20 }), paced(300));
      playSound("reveal");
      return;
    case "reveal":
      fx.word(self, powerSfx(note.code), "info", { above: true, size: 30, dx: side === "me" ? 50 : -50 });
      if (side === "me") window.setTimeout(() => fx.token(self, "reveal", "?", "info", { arc: 30 }), paced(150));
      playSound("reveal");
      return;
  }
}

function CardPanel({
  side,
  data,
  shown,
  scoreShown,
  instant,
  showIdle,
  showFlag,
  struck,
  shielded,
  ruled,
  hidden,
  harmful,
  outcome,
  decisiveIndex,
  verdict,
  lowerWins,
}: {
  side: ComicKey;
  data: ComicSide;
  /** Rovescio: the lower score wins, and the score says so. */
  lowerWins: boolean;
  /** The notes whose balloon has appeared, in the order they spoke. */
  shown: number[];
  scoreShown: number | null;
  instant: boolean;
  showIdle: boolean;
  showFlag: boolean;
  struck: boolean;
  shielded: boolean;
  ruled: boolean;
  hidden: boolean;
  harmful: (note: PowerNote) => boolean;
  outcome: "won" | "lost" | "void" | null;
  decisiveIndex: number | null;
  verdict: boolean;
}) {
  const isMe = side === "me";
  const idle = data.notes.filter((note) => phase(note) === "idle");
  return (
    <section
      {...data.press}
      data-fx={`${side}-panel`}
      aria-label={isMe ? "La tua giocata" : `La giocata di ${data.label}`}
      className={`comic-panel ${isMe ? "bg-comic-cyan" : "halftone bg-comic-magenta"} ${
        outcome === "lost" ? "comic-lost" : outcome === "void" ? "comic-void" : outcome === "won" ? "comic-won" : ""
      } ${LONG_PRESS_CLASS} relative min-h-0 overflow-hidden text-black`}
      style={{ animationDelay: `${paced(isMe ? 80 : 160)}ms` }}
    >
      {data.card && <ComicArt card={data.card} className="comic-dim absolute inset-0 h-full w-full" />}
      <div
        data-fx={`${side}-score`}
        className={`comic-dim absolute top-1.5 z-[4] grid h-14 w-14 place-items-center rounded-full border-[3px] border-foreground bg-black font-display text-[28px] tabular-nums text-comic-yellow ${
          isMe ? "left-1.5" : "right-1.5"
        }`}
      >
        {scoreShown === null ? "–" : <Rolling value={scoreShown} instant={instant} />}
      </div>
      {lowerWins && (
        <span
          className={`comic-pop absolute top-[22px] z-[5] -rotate-3 border-2 border-black bg-[var(--rule-color,var(--comic-orange))] px-1 font-display text-[13px] uppercase leading-4 text-black ${
            isMe ? "left-[64px]" : "right-[64px]"
          }`}
        >
          ▼ meno
        </span>
      )}
      {showFlag && data.flag && <RuleRibbon side={side} text={data.flag.text} help={!harmful({ name: "", effect: null, active: true, points: data.flag.points })} />}

      {/* The balloons fill the room between the score and the chips, and never go under them. */}
      <div className="absolute inset-x-1 bottom-1.5 top-[66px] flex flex-col gap-1">
        <NoteStack side={side} className="z-[7]">
          {(squeeze) => (
            <>
              {shown.map((index, position) => {
                const note = data.notes[index];
                return (
                  <PowerBalloon
                    key={index}
                    note={note}
                    side={side}
                    fxName={`${side}-note-${index}`}
                    harm={harmful(note)}
                    decisive={verdict && decisiveIndex === index}
                    compact={isCompact(squeeze, position, shown.length)}
                  />
                );
              })}
              {showIdle && idle.length > 0 && <ThinkBalloon notes={idle} compact={squeeze > 0} />}
            </>
          )}
        </NoteStack>

        <div className="relative z-[3] mx-0.5 flex shrink-0 flex-col gap-1">
          {/* The chips sit above the name, so the rule's marks rise over the art, never over the name. */}
          {data.chips && (
            <div className="comic-dim">
              <AbilityChips side={side} chips={data.chips} ruled={ruled} struck={struck} hidden={hidden} />
            </div>
          )}
          <div data-fx={`${side}-name`} className={`comic-dim border-2 border-black bg-comic-yellow px-2 py-0.5 ${isMe ? "" : "text-right"}`}>
            <p className="truncate text-[10px] font-extrabold uppercase leading-3">{data.label}</p>
            <p className="truncate font-display text-[20px] uppercase leading-[22px]">{data.card?.name ?? "?"}</p>
            {!data.chips && <p className="text-[11px] font-extrabold leading-[13px]">{data.stats}</p>}
          </div>
        </div>
      </div>
      {shielded && <ShieldPlate side={side} />}
      <Crack />
    </section>
  );
}

/** The round result as a comic page. */
export function RoundComic(props: RoundComicProps) {
  const { me, opponent, winner, twist, rule } = props;
  // The beats depend only on the round: a new round is a new page.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cuts = useMemo(() => cutIns(props), [props.round]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const beats = useMemo(() => planBeats({ twist, rule, me, opponent, decisive: props.decisive }, cuts), [props.round]);
  const { fired, done, skipped, complete } = useBeats(beats);
  const has = (kind: Beat["kind"]) => fired.some((beat) => beat.kind === kind);
  const verdict = has("verdict");
  const ruled = !twist || has("twist");
  const { layer } = useComicFx();

  // The travelling effects of each beat, as it plays; none once the page is skipped.
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

  const shownList = (side: ComicKey) =>
    fired.flatMap((beat) => (beat.kind === "note" && beat.side === side ? [beat.index] : []));
  const shown = (side: ComicKey) => new Set(shownList(side));
  // The score climbs from the abilities alone, then each power and ribbon adds its points as it lands.
  const scoreOf = (side: ComicKey) => {
    if (!has("base")) return null;
    const data = props[side];
    const visible = shown(side);
    const pending = data.notes.reduce((sum, note, index) => sum + (note.points && !visible.has(index) ? note.points : 0), 0);
    const flag = data.flag && !has("flags") ? data.flag.points : 0;
    const struck = struckOn(side) ? 0 : (data.struckPoints ?? 0);
    return data.score - pending - flag + struck;
  };
  const outcomeOf = (side: ComicKey) =>
    !verdict ? null : winner === "none" ? ("void" as const) : winner === side ? ("won" as const) : ("lost" as const);
  // A side's abilities are hit when the other side's Sabotatore (or its Riflesso) has spoken.
  const struckOn = (side: ComicKey) => {
    const rival = props[other(side)];
    const seen = shown(other(side));
    return rival.notes.some((note, index) => (note.code === "sabotage" || note.code === "reflect") && note.active && seen.has(index));
  };
  const shieldedOn = (side: ComicKey) => {
    const seen = shown(side);
    return props[side].notes.some((note, index) => powerFamily(note.code) === "shield" && note.active && !note.cancelled && seen.has(index));
  };
  const harmful = (note: PowerNote) => Boolean(note.points) && !pointsHelp(note.points!, rule);

  // Slots on the threat panel: a bonus waiting from the round before, or passed on to the next.
  const slotOf = (side: ComicKey) => {
    const data = props[side];
    const visible = shown(side);
    const carriedIndex = data.notes.findIndex((note) => note.source === "carried" || note.source === "pack");
    const passedIndex = data.notes.findIndex((note) => note.active && note.timing === "after");
    if (carriedIndex < 0 && passedIndex < 0) return null;
    const carried = carriedIndex >= 0 && !visible.has(carriedIndex) ? `+${data.notes[carriedIndex].points ?? 0}` : null;
    const passed = passedIndex >= 0 && visible.has(passedIndex) ? (data.notes[passedIndex].effect?.split(" ")[0] ?? "") : null;
    return { carried, passed };
  };

  const page = rulePageEffect(rule);
  const pageClass = !has("twist") || !page ? "" : page === "flip" || page === "mirror" ? (skipped ? "" : `fx-${page}`) : `fx-${page}`;
  const tieNote = SIDES.flatMap((side) => props[side].notes.flatMap((note, index) => (phase(note) === "tie" && shown(side).has(index) ? [side] : [])))[0];
  const cut = !skipped
    ? [...fired].reverse().find((beat): beat is CutBeat => beat.kind === "cutin")
    : undefined;
  const cutNote = cut ? props[cut.side].notes[cut.index] : null;

  useVerdictBuzz(verdict, winner === "me" ? "win" : winner === "opponent" ? "lose" : "void", props.onVerdict);
  useWhenDone(done, props.onDone);

  const winnerSide = winner === "none" ? null : props[winner];
  const title = winner === "me" ? "Round vinto!" : winner === "opponent" ? "Round perso" : "Round nullo";
  const sfx = winner === "me" ? "SBAM!" : winner === "opponent" ? "KRAK!" : "PARI!";
  const slots = SIDES.map((side) => ({ side, slot: slotOf(side) })).filter((s) => s.slot);
  // Veggente and Spia: once the viewer's card has spoken, what it saw stays pinned between the panels.
  const revealSpoke = (code: string) => props.me.notes.some((note, index) => note.code === code && note.active && shown("me").has(index));
  const foreseen = revealSpoke("foresight") ? (props.revealed?.foreseen ?? []) : [];
  const spied = revealSpoke("spy") ? (props.revealed?.spied ?? []) : [];
  const revealStrip =
    foreseen.length > 0 ? (
      <RevealStrip title="Prossime Minacce" lines={foreseen.map((t) => `R${t.round} · Lv ${t.level} · ${t.name}`)} />
    ) : spied.length > 0 ? (
      <RevealStrip title={`${props.opponent.label} ha ancora`} lines={[]} cards={spied} />
    ) : null;

  return (
    <main
      className={`comic-page relative mt-1 flex min-h-0 flex-1 cursor-pointer flex-col gap-1.5 overflow-hidden px-1.5 pb-[calc(env(safe-area-inset-bottom)+4px)] pt-1.5 ${pageClass}`}
      style={props.tierColor ? ({ ...pageStyle, "--rule-color": props.tierColor } as CSSProperties) : pageStyle}
      onClick={() => (done ? props.onContinue() : complete())}
    >
      <section aria-label={`Round ${props.round}: ${props.threatName}`} className="comic-panel halftone relative shrink-0 bg-comic-orange px-3 pb-2.5 pt-2 text-black">
        <p data-fx="round-cap" className="inline-block border-2 border-black bg-comic-yellow px-2 text-[11px] font-extrabold uppercase leading-5">
          Round {props.round} · Livello {props.level}
        </p>
        {slots.length > 0 && (
          // In a row on the round's line: stacked, the second one covered the threat's name.
          <div className="absolute right-2 top-1.5 z-[2] flex items-center gap-1">
            {slots.map(({ side, slot }) => (
              <NextSlot key={side} side={side} number={props.round} carried={slot!.carried} passed={slot!.passed} />
            ))}
          </div>
        )}
        <p className="mt-1 font-display text-[28px] uppercase leading-[30px]">{props.threatName}</p>
        <p data-fx="threat-abs" className="mt-1 flex flex-wrap gap-1">
          {props.abilities.map((code) => (
            <span key={code} className="bg-black px-1.5 text-[11px] font-extrabold leading-[18px] text-foreground">
              {rule?.code === "blind" && !has("twist") ? "?" : code}
            </span>
          ))}
        </p>
        {twist && (
          <p
            data-fx="rule"
            className={`comic-twist comic-rule relative mt-2 border-[3px] border-black bg-white px-2.5 py-1 text-[13px] font-semibold leading-4 shadow-[4px_4px_0_#000] ${
              rule?.code === "tomb_silence" ? "comic-rule-dark" : ""
            } ${has("twist") ? "comic-on" : ""}`}
            style={props.tierColor ? ({ "--rule-color": props.tierColor } as CSSProperties) : undefined}
          >
            <span className="font-display uppercase">{twist.name}!</span> {twist.text}
          </p>
        )}
      </section>

      <div className="relative grid min-h-[230px] flex-1 grid-cols-2 gap-1.5">
        {SIDES.map((side) => {
          const data = props[side];
          return (
            <CardPanel
              key={side}
              side={side}
              data={data}
              shown={shownList(side)}
              scoreShown={scoreOf(side)}
              instant={skipped}
              showIdle={has("idle")}
              showFlag={has("flags")}
              struck={struckOn(side)}
              shielded={shieldedOn(side)}
              ruled={ruled}
              hidden={rule?.code === "blind" && !has("twist")}
              harmful={harmful}
              outcome={outcomeOf(side)}
              decisiveIndex={props.decisive?.side === side ? props.decisive.index : null}
              verdict={verdict}
              lowerWins={rule?.code === "reverse" && has("twist")}
            />
          );
        })}
        {revealStrip}
        {has("level") && (
          <span
            data-fx="eq"
            className={`comic-eq absolute left-1/2 top-[44%] z-[8] -translate-x-1/2 border-4 border-black px-3 pb-1 font-display text-[40px] leading-[44px] text-black shadow-[4px_4px_0_#000] ${
              tieNote ? "bg-comic-orange" : "bg-foreground"
            }`}
            key={tieNote ?? "level"}
          >
            {tieNote === "me" ? ">" : tieNote === "opponent" ? "<" : "="}
          </span>
        )}
      </div>

      <VerdictPanel
        verdict={verdict}
        tone={winner === "me" ? "win" : winner === "opponent" ? "lose" : "void"}
        hero={winnerSide?.card ?? null}
        heroKey={`${props.round}-${winnerSide?.card?.code ?? "none"}`}
        sfx={sfx}
        title={title}
      >
        <p className="text-[12px] font-bold leading-[15px]">
          {props.resultLine}
          {props.decisive && ` ${props.decisive.text}`}
        </p>
        {props.notices.map((notice) => (
          <p key={notice} className="text-[11px] font-semibold leading-[14px] text-[#444]">
            {notice}
          </p>
        ))}
      </VerdictPanel>

      <div className="flex shrink-0 items-center justify-center gap-2">
        {props.hint(done)}
        <SoundToggle />
      </div>

      {cut && cutNote && (
        <CutIn
          key={`${cut.side}-${cut.index}`}
          card={props[cut.side].card}
          side={cut.side}
          title={`${cutNote.name}!`}
          text={cutNote.effect}
          harm={powerFamily(cutNote.code) === "strike" || harmful(cutNote)}
        />
      )}
      <FxLayer layerRef={layer} />
    </main>
  );
}
