"use client";

import { useEffect, useEffectEvent, useRef, useState, type CSSProperties } from "react";
import { abilityMalusOn, modifierPoints, scoreMalusOn, type Threat } from "@o-mega/game-engine";
import { useCardDetail } from "@/components/card-detail";
import { useCardLooks } from "@/components/card-looks";
import { prefersReducedMotion } from "@/components/comic-page";
import { RoundComic } from "@/components/round-comic";
import { balance } from "@/config/balance";
import { abilityChips, chipsTotal } from "@/lib/ability-marks";
import { useBannerHold } from "@/lib/banner-hold";
import { withBasePath } from "@/lib/base-path";
import { FACTION_LABELS, type AbilityInfo } from "@/lib/catalog";
import { DISTRICTS, MAP_HEIGHT, MAP_WIDTH, placeThreats } from "@/lib/city-districts";
import { toCharacter, type MatchCard } from "@/lib/match";
import {
  calmedBy,
  decisiveNote,
  flipBefore,
  playsBefore,
  resultPowers,
  tieBreakReason,
  tieWonByRelentless,
  wasNullified,
  wasSilenced,
  wonBehindByRelentless,
} from "@/lib/round-powers";
import { describeThreatModifier } from "@/lib/threat-modifiers";
import { roundPoints, type TripleContest, type TripleRound, type TripleView } from "@/lib/triple";
import { contestNotes } from "@/lib/triple-powers";

// An Allarme Triplo round told on the map of Nuova Megara: the three threats light up in
// their districts, the camera moves to each in turn, the clash rises from its pin as a comic
// page of its own (round-comic.tsx, the same balloons, effects and verdict), closes back into
// the pin, which takes the colour of who won, and the whole map comes back with the totals.
// Nothing here decides anything.

const TITLES = { win: "Minaccia presa!", lose: "Minaccia persa", void: "Minaccia pari" };

/** One threat of a resolved round as a comic page. */
function ContestComic({
  view,
  round,
  contest,
  position,
  count,
  rival,
  abilities,
  onContinue,
  onDone,
}: {
  view: TripleView;
  round: TripleRound;
  contest: TripleContest;
  /** Which page of the round this is, from 0, and how many there are. */
  position: number;
  count: number;
  rival: string;
  abilities: AbilityInfo[];
  onContinue: () => void;
  onDone: () => void;
}) {
  const detail = useCardDetail();
  const looks = useCardLooks();
  const threat = view.threats[contest.slot];
  const laneRule = threat?.modifier ?? null;
  const mine = view.my_deck.find((card) => card.instance_id === contest.my_play?.instance_id) ?? null;
  const theirs = contest.opponent_play;
  const myPlay = contest.my_play;
  const laneThreat: Threat = { id: `lane-${contest.slot}`, level: threat?.level ?? 0, abilities: threat?.abilities ?? [], modifier: laneRule };

  // What each side placed on this threat in the round before (Annullatore ritardato), the player's view.
  const previousLane = view.rounds.find((r) => r.round === round.round - 1 && r.resolved)?.contests.find((c) => c.slot === contest.slot);
  const before = playsBefore(
    view.my_deck.find((card) => card.instance_id === previousLane?.my_play?.instance_id) ?? null,
    previousLane?.opponent_play ?? null,
    laneThreat,
  );
  // Calma piatta: the lane's rule did not count in this round, so the page tells it without.
  const modifier = calmedBy(mine, theirs, laneRule, before) ? null : laneRule;
  const ruleThreat: Threat = { ...laneThreat, modifier };
  const beforeOf = (card: MatchCard | null | undefined) => (card === mine ? before : flipBefore(before));
  // As the cards played: an Annullatore (also one of the round before), or Silenzio della tomba, takes the power away.
  const powerless = (card: MatchCard, other: MatchCard | null) =>
    wasNullified(card, other, modifier, beforeOf(card)) || wasSilenced(card, modifier);
  const asPlayed = (card: MatchCard | null, other: MatchCard | null) => {
    if (!card) return null;
    const character = toCharacter(card, card.definition_id);
    return powerless(card, other) ? { ...character, power: null } : character;
  };
  const myCharacter = asPlayed(mine, theirs);
  const theirCharacter = asPlayed(theirs, mine);

  // Each card's abilities as chips: the rule's marks and what Sabotatore took.
  const mirror = modifier?.code === "mirror";
  const chipsOf = (card: MatchCard | null, other: MatchCard | null, malus: number) =>
    // A card covered by Nebbia has no values to show, and under Specchio neither has the card facing it.
    card && threat && !threat.hidden && !card.hidden && !(mirror && other?.hidden)
      ? abilityChips(mirror && other ? other.stats : card.stats, ruleThreat, malus).map((chip) =>
          mirror ? { ...chip, mark: { text: "⇄", tone: "ok" as const } } : chip,
        )
      : undefined;
  const myChips = chipsOf(mine, theirs, myCharacter && theirCharacter ? abilityMalusOn(myCharacter, theirCharacter, ruleThreat) : 0);
  const theirChips = chipsOf(theirs, mine, myCharacter && theirCharacter ? abilityMalusOn(theirCharacter, myCharacter, ruleThreat) : 0);
  const struckPoints = (chips: typeof myChips, card: MatchCard | null, other: MatchCard | null) =>
    chips && card ? chipsTotal(chipsOf(card, other, 0) ?? []) - chipsTotal(chips) : 0;
  // The ribbon a rule drops on a card: its faction or its rarity.
  const flagOf = (card: MatchCard | null, character: ReturnType<typeof asPlayed>, parts: { modifier: number } | null | undefined) => {
    if (!card || card.hidden || !character || !modifier) return null;
    const points = parts ? parts.modifier : modifierPoints(character, ruleThreat);
    if (!points) return null;
    const who = modifier.code === "hostile_ground" ? (FACTION_LABELS[card.faction] ?? card.faction) : modifier.code === "long_count" ? "Chi è sotto" : card.rarity.name;
    return { text: `${who} ${points > 0 ? "+" : "−"}${Math.abs(points)}`, points };
  };

  const families = Object.fromEntries(abilities.map((a) => [a.code, a.family.code]));
  const myNotes = contestNotes(view, round, contest, "me", families);
  const theirNotes = contestNotes(view, round, contest, "opponent", families);
  const results = resultPowers(myPlay, theirs, mine, theirs, contest.winner, modifier, before);
  const winner = contest.winner ?? "none";
  const myScore = myPlay?.score ?? 0;
  const theirScore = theirs?.score ?? 0;
  const winnerCard = winner === "me" ? mine : winner === "opponent" ? theirs : null;
  const loserCard = winner === "me" ? theirs : winner === "opponent" ? mine : null;
  const winnerPlay = winner === "me" ? myPlay : winner === "opponent" ? theirs : null;
  const loserPlay = winner === "me" ? theirs : winner === "opponent" ? myPlay : null;
  const isTie = Boolean(myPlay && theirs && myPlay.score === theirs.score);
  const tieWonBy = isTie && winnerCard && tieWonByRelentless(winnerCard, loserCard, modifier, beforeOf(winnerCard)) ? winnerCard.name : null;
  const wonBehind = winnerCard ? wonBehindByRelentless(winnerPlay, loserPlay, winnerCard, loserCard, modifier, beforeOf(winnerCard)) : 0;
  const decisive =
    winner === "none" || !winnerPlay || !loserPlay || !loserCard
      ? null
      : decisiveNote(winner, winner === "me" ? myNotes : theirNotes, winnerPlay, loserPlay, loserCard.name, modifier);
  // On equal totals the line says what settled it (SPEC §5.6), to both players.
  const resultLine =
    winner === "none"
      ? myPlay
        ? results.wall
          ? `${myScore} a ${theirScore}: con Muro di ${(results.wall === "me" ? mine : theirs)?.name ?? ""} il confronto è nullo.`
          : `Pari ${myScore} a ${theirScore} e ${tieBreakReason(null, myPlay, modifier)}.`
        : ""
      : !winnerCard || !loserCard || !winnerPlay || !loserPlay
        ? ""
        : isTie
          ? `Pari ${winnerPlay.score} a ${loserPlay.score}: ${tieBreakReason(winnerPlay, loserPlay, modifier, tieWonBy)}.`
          : results.upset
            ? `${winnerCard.name} batte ${loserCard.name} · ${winnerPlay.score} a ${loserPlay.score}: con Ribaltone vince da molto sotto.`
            : wonBehind
            ? `${winnerCard.name} batte ${loserCard.name} · ${winnerPlay.score} a ${loserPlay.score}: con Implacabile vince anche sotto di ${wonBehind}.`
            : `${winnerCard.name} batte ${loserCard.name} · ${winnerPlay.score} a ${loserPlay.score}.`;
  const notices = [
    ...(myPlay?.auto_played ? ["Tempo scaduto: il server ha piazzato la tua carta."] : []),
    ...(theirs?.auto_played ? [`${rival} non ha piazzato in tempo.`] : []),
  ];

  const nameOf = (code: string) => abilities.find((a) => a.code === code)?.name ?? code;
  const twist = modifier && threat ? describeThreatModifier(modifier, nameOf(threat.abilities[0]), nameOf) : null;
  const statsOf = (card: MatchCard | null) => (card && threat ? threat.abilities.map((code) => `${code} ${card.hidden ? "?" : (card.stats[code] ?? 0)}`).join(" · ") : "");
  const spied = (view.spied_cards ?? []).filter((card) => card.round === round.round);
  const last = position === count - 1;

  return (
    <RoundComic
      round={round.round}
      level={threat?.level ?? 0}
      threatName={threat?.name ?? ""}
      abilities={threat?.abilities ?? []}
      caption={`R${round.round} · Minaccia ${position + 1}/${count} · Lv ${threat?.level ?? 0}`}
      titles={TITLES}
      twist={twist}
      rule={modifier}
      tierColor={threat?.rarity?.color ?? null}
      me={{
        label: "Tu",
        card: mine,
        stats: statsOf(mine),
        chips: myChips,
        score: myScore,
        notes: myNotes,
        flag: flagOf(mine, myCharacter, myPlay?.parts),
        struckPoints: struckPoints(myChips, mine, theirs) + (myCharacter && theirCharacter ? scoreMalusOn(myCharacter, theirCharacter) : 0),
        press: mine ? detail.press(mine, looks(mine.definition_id, "me")) : undefined,
      }}
      opponent={{
        label: rival,
        card: theirs,
        stats: statsOf(theirs),
        chips: theirChips,
        score: theirScore,
        notes: theirNotes,
        flag: flagOf(theirs, theirCharacter, theirs?.parts),
        struckPoints: struckPoints(theirChips, theirs, mine) + (myCharacter && theirCharacter ? scoreMalusOn(theirCharacter, myCharacter) : 0),
        press: theirs ? detail.press(theirs, looks(theirs.definition_id, "opponent")) : undefined,
      }}
      winner={winner}
      decisive={decisive}
      revealed={spied.length > 0 ? { foreseen: [], spied } : null}
      resultLine={resultLine}
      notices={notices}
      onContinue={onContinue}
      onDone={onDone}
      hint={(complete) => (
        <span className="flex h-8 items-center px-3 text-xs font-extrabold uppercase tracking-wide text-black">
          {!complete ? "Tocca per saltare" : last ? "Tocca per il riepilogo" : "Tocca per la prossima Minaccia"}
        </span>
      )}
    />
  );
}

type Step =
  | { kind: "overview" }
  | { kind: "back" }
  | { kind: "final" }
  | { kind: "pan" | "page" | "close" | "settle"; i: number };

/** The steps of a round on the map, in order. */
function planSteps(count: number): Step[] {
  const steps: Step[] = [{ kind: "overview" }];
  for (let i = 0; i < count; i++) {
    for (const kind of ["pan", "page", "close", "settle"] as const) steps.push({ kind, i });
  }
  // The camera goes back to the whole map, then the totals land.
  steps.push({ kind: "back" }, { kind: "final" });
  return steps;
}

/** How long each step lasts by itself (ms); the page waits for its comic instead. */
const STEP_MS: Record<"overview" | "pan" | "close" | "settle" | "back", number> = { overview: 1400, pan: 850, close: 420, settle: 750, back: 850 };
/** How close the camera comes to a threat. */
const ZOOM = 1.8;
const PIN_TONE = { me: "bg-comic-cyan", opponent: "bg-comic-magenta", none: "bg-[#cfc6ad]" } as const;
const stampText = (winner: "me" | "opponent" | "none", rival: string) =>
  winner === "me" ? "+1 a te" : winner === "opponent" ? `+1 a ${rival}` : "Pari";

/**
 * The round on the map. A tap skips a camera move; on a page it skips to the end of the
 * clash, then moves on. Once the totals are on the map, `onVerdict` and `onDone` (the time
 * to read starts), and a tap is `onContinue`.
 */
export function TripleMapReveal({
  view,
  round,
  rival,
  abilities,
  finished,
  onVerdict,
  onDone,
  onContinue,
}: {
  view: TripleView;
  round: TripleRound;
  rival: string;
  abilities: AbilityInfo[];
  finished: boolean;
  onVerdict: () => void;
  onDone: () => void;
  onContinue: () => void;
}) {
  // No in-app banner over the result (SPEC §11.1).
  useBannerHold();
  const contests = [...round.contests].sort((a, b) => a.slot - b.slot).filter((c) => c.my_play || c.opponent_play);
  const threats = contests.map((c) => view.threats[c.slot]);
  const placed = placeThreats(threats.map((t) => ({ name: t?.name ?? "", district: t?.district })));
  const [steps] = useState(() => planSteps(contests.length));
  const [at, setAt] = useState(0);
  const [pageDone, setPageDone] = useState<number | null>(null);
  // Once a page has risen over the whole map, the map underneath is hidden until it closes.
  const [covered, setCovered] = useState<number | null>(null);
  const step = steps[Math.min(at, steps.length - 1)];
  const still = prefersReducedMotion();
  const next = () => setAt((n) => Math.min(n + 1, steps.length - 1));

  // The stage's size, for where the map's points fall on screen.
  const stage = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const element = stage.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => setSize({ w: element.clientWidth, h: element.clientHeight }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  // The whole map fits the stage (object-fit: contain), the sea around it.
  const scale = Math.min(size.w / MAP_WIDTH, size.h / MAP_HEIGHT) || 1;
  const ox = (size.w - MAP_WIDTH * scale) / 2;
  const oy = (size.h - MAP_HEIGHT * scale) / 2;
  const onMap = (x: number, y: number) => ({ left: x * scale + ox, top: y * scale + oy });

  // Steps that last by themselves move on by themselves.
  useEffect(() => {
    if (step.kind === "page" || step.kind === "final") return;
    const ms = STEP_MS[step.kind];
    const timer = setTimeout(next, still ? Math.min(ms, 400) : ms);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [at]);
  // Once the page has risen (0.45 s), the map underneath it is hidden.
  useEffect(() => {
    if (step.kind !== "page") return;
    const page = step.i;
    const timer = setTimeout(() => setCovered(page), still ? 200 : 480);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [at]);
  // A page moves on once it is over and there was time to read it.
  useEffect(() => {
    if (step.kind !== "page" || pageDone !== step.i) return;
    const timer = setTimeout(next, balance.triple.contestReadSeconds * 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [at, pageDone]);
  // The totals are on the map: the strip may show them, the time to read starts.
  const landed = step.kind === "final";
  const tellVerdict = useEffectEvent(() => {
    onVerdict();
    onDone();
  });
  useEffect(() => {
    if (landed) tellVerdict();
  }, [landed]);

  // Where the camera looks: the whole map, or a threat in the middle of the screen.
  const focus = step.kind === "overview" || step.kind === "back" || step.kind === "final" ? null : step.i;
  const focusSpot = focus === null ? null : placed[focus];
  // The threat as near the middle as the map allows: the camera never shows past its edges.
  const camera: CSSProperties = (() => {
    if (!focusSpot || still) return { transform: "none" };
    const p = onMap(focusSpot.x, focusSpot.y);
    // Where the zoomed map is smaller than the screen, it stays in the middle.
    const clamp = (value: number, min: number, max: number) => (min > max ? (min + max) / 2 : Math.min(max, Math.max(min, value)));
    const tx = clamp(size.w / 2 - p.left * ZOOM, size.w - (ox + MAP_WIDTH * scale) * ZOOM, -ox * ZOOM);
    const ty = clamp(size.h / 2 - p.top * ZOOM, size.h - (oy + MAP_HEIGHT * scale) * ZOOM, -oy * ZOOM);
    return { transform: `translate(${tx}px, ${ty}px) scale(${ZOOM})` };
  })();
  // How many threats are settled, and so show who won.
  const settledUpTo =
    step.kind === "final" || step.kind === "back" ? contests.length : step.kind === "settle" ? step.i + 1 : step.kind === "overview" ? 0 : step.i;

  const points = roundPoints(round);
  const totals = view.rounds
    .filter((r) => r.resolved && r.round <= round.round)
    .map(roundPoints)
    .reduce((sum, p) => ({ me: sum.me + p.me, opponent: sum.opponent + p.opponent }), { me: 0, opponent: 0 });
  const auto = contests.some((c) => c.my_play?.auto_played);
  const theirAuto = contests.some((c) => c.opponent_play?.auto_played);
  const omega = onMap(350, 498);
  const cityName = onMap(8, 584);

  return (
    <div
      ref={stage}
      role="button"
      tabIndex={0}
      aria-label={`Round ${round.round} sulla mappa di Nuova Megara: tu ${points.me}, ${rival} ${points.opponent}`}
      className="relative mt-1 min-h-0 flex-1 cursor-pointer overflow-hidden bg-[#1d4a63] bg-[repeating-linear-gradient(170deg,transparent_0_12px,rgb(47_106_135/0.35)_12px_14px)]"
      onClick={() => {
        if (step.kind === "page") return; // the page has its own taps
        if (step.kind === "final") onContinue();
        else next();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        if (step.kind === "final") onContinue();
        else if (step.kind !== "page") next();
      }}
    >
      <div
        className={`absolute inset-0 origin-top-left ${step.kind === "page" && covered === step.i ? "invisible" : ""}`}
        style={{ ...camera, transition: still ? "none" : "transform 0.8s cubic-bezier(0.5, 0, 0.2, 1)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={withBasePath("/world/mappa-megara.svg")} alt="" className="absolute inset-0 h-full w-full object-contain" />
        <span
          aria-hidden
          className="absolute -translate-x-1/2 -translate-y-1/2 font-display leading-none text-black"
          style={{ left: omega.left, top: omega.top, fontSize: 14 * scale }}
        >
          Ω
        </span>
        {DISTRICTS.map((district) => {
          const p = onMap(district.label[0], district.label[1]);
          return (
            <span
              key={district.id}
              aria-hidden
              className="absolute -translate-y-full whitespace-nowrap border-2 border-black bg-white font-display uppercase leading-none text-black"
              style={{ left: p.left, top: p.top, fontSize: 11 * scale, padding: `${2 * scale}px ${4 * scale}px` }}
            >
              {district.name}
            </span>
          );
        })}
        <span
          aria-hidden
          className={`absolute -rotate-[4deg] whitespace-nowrap bg-black px-2 font-sfx tracking-wide text-comic-yellow transition-opacity duration-300 ${
            landed ? "opacity-0" : ""
          }`}
          style={{ left: cityName.left, top: cityName.top - 26 * scale, fontSize: 22 * scale, lineHeight: `${28 * scale}px` }}
        >
          Nuova Megara
        </span>
        {contests.map((contest, i) => {
          const spot = placed[i];
          const threat = threats[i];
          if (!spot || !threat) return null;
          const done = i < settledUpTo;
          const winner = contest.winner ?? "none";
          const active = focus === i && !done;
          return (
            <div
              key={contest.slot}
              className={`absolute z-[2] flex -translate-y-full flex-col gap-0.5 ${
                spot.x > MAP_WIDTH * 0.72 ? "-translate-x-[calc(100%-16px)] items-end" : spot.x < MAP_WIDTH * 0.28 ? "-translate-x-[16px] items-start" : "-translate-x-1/2 items-center"
              }`}
              style={onMap(spot.x, spot.y)}
            >
              <span
                className={`max-w-[150px] border-2 border-black bg-white px-1.5 py-0.5 text-center text-black shadow-[2px_2px_0_#000] ${
                  active ? "outline outline-2 outline-comic-yellow" : ""
                }`}
              >
                <span className="block text-[8px] font-extrabold uppercase leading-[10px] tracking-wide">
                  Minaccia {i + 1} · Lv {threat.level}
                </span>
                <span className="block truncate font-display text-[12px] uppercase leading-[14px]">{threat.name}</span>
              </span>
              {/* The pin, with the result stamped beside it on the side of the map with room. */}
              <span className="relative">
                <span
                  className={`grid h-7 w-7 -rotate-45 place-items-center rounded-[50%_50%_50%_0] border-[3px] border-black transition-colors duration-300 ${
                    done ? PIN_TONE[winner] : "bg-comic-yellow"
                  }`}
                  style={threat.rarity ? { boxShadow: `0 0 0 3px ${threat.rarity.color}` } : undefined}
                >
                  <span className="rotate-45 font-display text-[14px] leading-none text-black">{i + 1}</span>
                </span>
                {done && (
                  <span
                    className={`comic-stamp absolute top-0.5 -rotate-6 whitespace-nowrap border-[3px] border-black px-1 font-display text-[13px] uppercase leading-[18px] shadow-[2px_2px_0_#000] ${
                      spot.x > MAP_WIDTH * 0.6 ? "right-[calc(100%+4px)]" : "left-[calc(100%+4px)]"
                    } ${winner === "me" ? "bg-comic-cyan text-black" : winner === "opponent" ? "bg-comic-magenta text-black" : "bg-black text-comic-yellow"}`}
                  >
                    {stampText(winner, rival)}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {(step.kind === "page" || step.kind === "close") && contests[step.i] && (
        <div
          key={`page-${step.i}`}
          className="absolute inset-0 z-20 flex flex-col bg-background"

          style={{
            animation: still
              ? "panel-fade 0.2s ease-out both"
              : step.kind === "close"
                ? "map-page-out 0.4s ease-in both"
                : "map-page-in 0.45s cubic-bezier(0.2, 1.3, 0.4, 1) both",
          }}
        >
          <ContestComic
            view={view}
            round={round}
            contest={contests[step.i]}
            position={step.i}
            count={contests.length}
            rival={rival}
            abilities={abilities}
            onContinue={() => {
              if (step.kind === "page") next();
            }}
            onDone={() => setPageDone(step.i)}
          />
        </div>
      )}

      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-1 px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-8 transition-opacity duration-300 ${
          landed ? "opacity-100" : "opacity-0"
        }`}
        style={{ background: "linear-gradient(transparent, rgb(0 0 0 / 0.78) 40%)" }}
      >
        <p className="-skew-x-8 bg-black px-3 py-1 font-display text-2xl uppercase text-comic-yellow">
          Round {points.me}–{points.opponent} · Totale {totals.me}–{totals.opponent}
        </p>
        {auto && <p className="text-xs font-extrabold text-foreground">Tempo scaduto: il server ha piazzato le tue carte a caso.</p>}
        {theirAuto && <p className="text-xs font-extrabold text-foreground">{rival} non ha piazzato in tempo.</p>}
        <p className="text-xs font-extrabold uppercase tracking-wide text-foreground">{finished ? "Tocca per il risultato" : "Tocca per continuare"}</p>
      </div>
      {!landed && step.kind !== "page" && step.kind !== "close" && (
        <p className="pointer-events-none absolute inset-x-0 bottom-2 z-10 text-center text-[10px] font-extrabold uppercase tracking-widest text-foreground/80">
          Tocca per andare avanti
        </p>
      )}
    </div>
  );
}
