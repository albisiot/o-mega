"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useCardDetail } from "@/components/card-detail";
import { useCardLooks } from "@/components/card-looks";
import { prefersReducedMotion } from "@/components/comic-page";
import { EmergencyComic } from "@/components/emergency-comic";
import { PlayerAvatar } from "@/components/player-avatar";
import { RoundComic } from "@/components/round-comic";
import { balance } from "@/config/balance";
import { useBannerHold } from "@/lib/banner-hold";
import { withBasePath } from "@/lib/base-path";
import { DISTRICTS, MAP_HEIGHT, MAP_WIDTH, placeThreats } from "@/lib/city-districts";
import type { CoopCard, CoopMember, CoopPlay, CoopRound, CoopThreat, CoopView } from "@/lib/coop";
import type { PowerNote } from "@/lib/round-powers";

// A round of an operation told on the map of Nuova Megara (SPEC §5.17), as the Allarme Triplo
// does: the threats light up in their districts, the camera goes to each in turn, the threat
// the team played on rises as a comic page (the Emergenza's against a target, a round's against
// the rival's Eco), closes back into its pin, which takes the colour of the result, and the whole
// map comes back with the Panic. A threat nobody played on gets only its stamp. Nothing here
// decides anything.

type Step = { kind: "overview" } | { kind: "back" } | { kind: "final" } | { kind: "pan" | "page" | "close" | "settle"; i: number };

/** The steps of a round on the map: a page only where the team played. */
function planSteps(played: boolean[]): Step[] {
  const steps: Step[] = [{ kind: "overview" }];
  played.forEach((hasPage, i) => {
    steps.push({ kind: "pan", i });
    if (hasPage) steps.push({ kind: "page", i }, { kind: "close", i });
    steps.push({ kind: "settle", i });
  });
  steps.push({ kind: "back" }, { kind: "final" });
  return steps;
}

const STEP_MS: Record<"overview" | "pan" | "close" | "settle" | "back", number> = { overview: 1200, pan: 800, close: 420, settle: 750, back: 800 };
const ZOOM = 1.8;

type Played = { play: CoopPlay; card: CoopCard | undefined; member: CoopMember | undefined };

/** The cards of the round on one threat, the lead first, with who put them there. */
function playedOn(view: CoopView, round: CoopRound, slot: number): Played[] {
  const cards = new Map<string, { card: CoopCard; member: CoopMember }>();
  for (const member of view.members) for (const card of member.squad ?? []) cards.set(card.instance_id, { card, member });
  return (round.plays ?? [])
    .filter((play) => play.slot === slot)
    .sort((a, b) => Number(b.role === "lead") - Number(a.role === "lead"))
    .map((play) => ({ play, card: cards.get(play.instance_id)?.card, member: cards.get(play.instance_id)?.member }));
}

/** Who led, as the page names them: "Tu" or the ally's name. */
function nameOf(view: CoopView, member: CoopMember | undefined): string {
  return !member ? "?" : member.user_id === view.me ? "Tu" : member.username;
}

/** What the supports added, as notes on the lead's side: each speaks and adds its value. */
function supportNotes(view: CoopView, played: Played[]): PowerNote[] {
  return played
    .filter(({ play }) => play.role === "support")
    .map(({ play, card, member }) => ({
      name: `Aiuto di ${nameOf(view, member) === "Tu" ? "te" : nameOf(view, member)}`,
      effect: `+${play.highest} (${card?.name ?? "?"})`,
      active: true,
      points: play.highest,
      code: "support",
    }));
}

/** One threat of the round as a comic page. */
function ThreatComic({
  view,
  round,
  threat,
  position,
  count,
  stoppedBefore,
  leftBefore,
  onContinue,
  onDone,
}: {
  view: CoopView;
  round: CoopRound;
  threat: CoopThreat;
  position: number;
  count: number;
  /** The team's threats stopped and lost so far in the operation, before this one. */
  stoppedBefore: number;
  leftBefore: number;
  onContinue: () => void;
  onDone: () => void;
}) {
  const detail = useCardDetail();
  const looks = useCardLooks();
  const result = round.results?.find((r) => r.slot === threat.slot);
  const played = playedOn(view, round, threat.slot);
  const lead = played[0];
  const stopped = Boolean(result?.stopped);
  const notes = supportNotes(view, played);
  const statsOf = (card: CoopCard | undefined) => (card ? threat.abilities.map((code) => `${code} ${card.stats[code] ?? 0}`).join(" · ") : "");
  const leadName = nameOf(view, lead?.member);
  const press = lead?.card ? detail.press(lead.card, looks(lead.card.definition_id, lead.member?.user_id === view.me ? "me" : "opponent")) : undefined;
  const reinforced = threat.slot === round.reinforced_slot && round.eco;

  if (reinforced && round.eco) {
    const eco = round.eco;
    const helped = notes.length ? `, con l'aiuto di ${played.length - 1}` : "";
    return (
      <RoundComic
        round={round.round}
        level={threat.level}
        threatName={threat.name}
        abilities={threat.abilities}
        caption={`${round.boss ? "Boss" : `R${round.round}`} · Minaccia ${position + 1}/${count} · Lv ${threat.level} · del rivale`}
        titles={{ win: round.boss ? "Fronte sfondato!" : "Fermata!", lose: "L'Eco tiene", void: "L'Eco tiene" }}
        twist={null}
        me={{
          label: leadName,
          card: lead?.card ?? null,
          stats: statsOf(lead?.card),
          score: result?.total ?? 0,
          notes,
          press,
        }}
        opponent={{
          label: view.operation.rival_name,
          card: eco,
          stats: threat.abilities.map((code) => `${code} ${eco.stats[code] ?? 0}`).join(" · "),
          score: eco.score.total,
          notes: [],
          press: detail.press(eco, looks(eco.definition_id, "opponent")),
        }}
        winner={stopped ? "me" : "opponent"}
        decisive={null}
        resultLine={
          stopped
            ? `${lead?.card?.name ?? "La squadra"}${helped} fa ${result?.total ?? 0} e batte l'Eco ${eco.name} (${eco.score.total}).`
            : `L'Eco ${eco.name} fa ${eco.score.total}: la squadra si ferma a ${result?.total ?? 0}.`
        }
        notices={played.some(({ play }) => play.auto_played) ? ["Tempo scaduto: il server ha messo alcune carte."] : []}
        onContinue={onContinue}
        onDone={onDone}
        hint={(complete) => (
          <span className="flex h-8 items-center px-3 text-xs font-extrabold uppercase tracking-wide text-black">
            {complete ? (position === count - 1 ? "Tocca per il riepilogo" : "Tocca per la prossima Minaccia") : "Tocca per saltare"}
          </span>
        )}
      />
    );
  }

  return (
    <EmergencyComic
      number={position + 1}
      of={count}
      passedBefore={stoppedBefore}
      failedBefore={leftBefore}
      lastChance={false}
      threatName={threat.name}
      level={threat.level}
      abilities={threat.abilities}
      card={lead?.card ?? null}
      stats={statsOf(lead?.card)}
      score={result?.total ?? 0}
      target={threat.target}
      required={result?.required ?? threat.target}
      passed={stopped}
      notes={notes}
      decisive={null}
      ended={false}
      press={press}
      onContinue={onContinue}
      onVerdict={onDone}
      action={(complete, skip) => (
        <button type="button" onClick={complete ? onContinue : skip} className="btn btn-primary w-full">
          {!complete ? "Salta" : position === count - 1 ? "Il riepilogo" : "Prossima Minaccia"}
        </button>
      )}
    />
  );
}

/**
 * A resolved round on the map. A tap skips a camera move; a page has its own taps. Once the
 * Panic is on the map, a tap (or the button) is `onContinue`.
 */
export function CoopMapReveal({
  view,
  round,
  onContinue,
}: {
  view: CoopView;
  round: CoopRound;
  onContinue: () => void;
}) {
  useBannerHold();
  const threats = round.threats ?? [];
  const placed = placeThreats(threats.map((t) => ({ name: t.name, district: t.district })));
  const played = threats.map((t) => (round.plays ?? []).some((p) => p.slot === t.slot));
  const [steps] = useState(() => planSteps(played));
  const [at, setAt] = useState(0);
  const [pageDone, setPageDone] = useState<number | null>(null);
  const [covered, setCovered] = useState<number | null>(null);
  const step = steps[Math.min(at, steps.length - 1)];
  const still = prefersReducedMotion();
  const next = () => setAt((n) => Math.min(n + 1, steps.length - 1));

  const stage = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const element = stage.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => setSize({ w: element.clientWidth, h: element.clientHeight }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const scale = Math.min(size.w / MAP_WIDTH, size.h / MAP_HEIGHT) || 1;
  const ox = (size.w - MAP_WIDTH * scale) / 2;
  const oy = (size.h - MAP_HEIGHT * scale) / 2;
  const onMap = (x: number, y: number) => ({ left: x * scale + ox, top: y * scale + oy });

  useEffect(() => {
    if (step.kind === "page" || step.kind === "final") return;
    const ms = STEP_MS[step.kind];
    const timer = setTimeout(next, still ? Math.min(ms, 400) : ms);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [at]);
  useEffect(() => {
    if (step.kind !== "page") return;
    const page = step.i;
    const timer = setTimeout(() => setCovered(page), still ? 200 : 480);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [at]);
  useEffect(() => {
    if (step.kind !== "page" || pageDone !== step.i) return;
    const timer = setTimeout(next, balance.triple.contestReadSeconds * 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [at, pageDone]);
  const landed = step.kind === "final";

  const focus = step.kind === "overview" || step.kind === "back" || step.kind === "final" ? null : step.i;
  const focusSpot = focus === null ? null : placed[focus];
  const camera: CSSProperties = (() => {
    if (!focusSpot || still) return { transform: "none" };
    const p = onMap(focusSpot.x, focusSpot.y);
    const clamp = (value: number, min: number, max: number) => (min > max ? (min + max) / 2 : Math.min(max, Math.max(min, value)));
    const tx = clamp(size.w / 2 - p.left * ZOOM, size.w - (ox + MAP_WIDTH * scale) * ZOOM, -ox * ZOOM);
    const ty = clamp(size.h / 2 - p.top * ZOOM, size.h - (oy + MAP_HEIGHT * scale) * ZOOM, -oy * ZOOM);
    return { transform: `translate(${tx}px, ${ty}px) scale(${ZOOM})` };
  })();
  const settledUpTo =
    step.kind === "final" || step.kind === "back" ? threats.length : step.kind === "settle" ? step.i + 1 : step.kind === "overview" ? 0 : step.i;

  // The team's record before each threat of this round (the Emergenza page's counters).
  const earlier = view.rounds.filter((r) => r.resolved && r.round < round.round);
  const tally = (records: { stopped: boolean; slot: number }[], plays: { slot: number }[] | null) =>
    records.filter((r) => (plays ?? []).some((p) => p.slot === r.slot));
  const before = earlier.flatMap((r) => tally(r.results ?? [], r.plays));
  const stoppedBefore = (i: number) =>
    before.filter((r) => r.stopped).length + tally((round.results ?? []).slice(0, i), round.plays).filter((r) => r.stopped).length;
  const leftBefore = (i: number) =>
    before.filter((r) => !r.stopped).length + tally((round.results ?? []).slice(0, i), round.plays).filter((r) => !r.stopped).length;

  const broken = round.results?.filter((r) => r.stopped).length ?? 0;
  const finished = view.status !== "active";
  const cityName = onMap(8, 584);

  return (
    <div
      ref={stage}
      role="button"
      tabIndex={0}
      aria-label={
        round.boss
          ? `Il Boss sulla mappa: ${broken} fronti sfondati su ${threats.length}`
          : `Round ${round.round} sulla mappa: Panico +${round.panic ?? 0}, ora ${view.panic} su ${view.panic_limit}`
      }
      className="relative min-h-0 flex-1 cursor-pointer overflow-hidden bg-[#1d4a63] bg-[repeating-linear-gradient(170deg,transparent_0_12px,rgb(47_106_135/0.35)_12px_14px)]"
      onClick={() => {
        if (step.kind === "page") return;
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
          className={`absolute -rotate-[4deg] whitespace-nowrap bg-black px-2 font-sfx tracking-wide text-comic-yellow transition-opacity duration-300 ${landed ? "opacity-0" : ""}`}
          style={{ left: cityName.left, top: cityName.top - 26 * scale, fontSize: 22 * scale, lineHeight: `${28 * scale}px` }}
        >
          {round.boss ? view.operation.boss_name : "Nuova Megara"}
        </span>
        {threats.map((threat, i) => {
          const spot = placed[i];
          if (!spot) return null;
          const result = round.results?.find((r) => r.slot === threat.slot);
          const done = i < settledUpTo;
          const stopped = Boolean(result?.stopped);
          const lead = playedOn(view, round, threat.slot)[0];
          const stamp = stopped ? (round.boss ? "Sfondato" : "Fermata") : round.boss ? "Regge" : `+${result?.panic ?? 0} Panico`;
          return (
            <div
              key={threat.slot}
              className={`absolute z-[2] flex -translate-y-full flex-col gap-0.5 ${
                spot.x > MAP_WIDTH * 0.72 ? "-translate-x-[calc(100%-16px)] items-end" : spot.x < MAP_WIDTH * 0.28 ? "-translate-x-[16px] items-start" : "-translate-x-1/2 items-center"
              }`}
              style={onMap(spot.x, spot.y)}
            >
              <span
                className={`max-w-[150px] border-2 border-black bg-white px-1.5 py-0.5 text-center text-black shadow-[2px_2px_0_#000] ${
                  focus === i && !done ? "outline outline-2 outline-comic-yellow" : ""
                }`}
              >
                <span className="block text-[8px] font-extrabold uppercase leading-[10px] tracking-wide">
                  {threat.slot === round.reinforced_slot ? "Del rivale · " : ""}Lv {threat.level}
                </span>
                <span className="block truncate font-display text-[12px] uppercase leading-[14px]">{threat.name}</span>
              </span>
              <span className="relative flex items-center gap-1">
                <span
                  className={`grid h-7 w-7 -rotate-45 place-items-center rounded-[50%_50%_50%_0] border-[3px] border-black transition-colors duration-300 ${
                    done ? (stopped ? "bg-comic-cyan" : "bg-comic-magenta") : "bg-comic-yellow"
                  }`}
                >
                  <span className="rotate-45 font-display text-[14px] leading-none text-black">{i + 1}</span>
                </span>
                {done && lead?.member && <PlayerAvatar username={lead.member.username} avatarUrl={lead.member.avatar_url} size="2xs" />}
                {done && (
                  <span
                    className={`comic-stamp absolute top-0.5 -rotate-6 whitespace-nowrap border-[3px] border-black px-1 font-display text-[13px] uppercase leading-[18px] shadow-[2px_2px_0_#000] ${
                      spot.x > MAP_WIDTH * 0.6 ? "right-[calc(100%+4px)]" : "left-[calc(100%+4px)]"
                    } ${stopped ? "bg-comic-cyan text-black" : "bg-comic-magenta text-black"}`}
                  >
                    {stamp}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {(step.kind === "page" || step.kind === "close") && threats[step.i] && (
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
          <ThreatComic
            view={view}
            round={round}
            threat={threats[step.i]}
            position={step.i}
            count={threats.length}
            stoppedBefore={stoppedBefore(step.i)}
            leftBefore={leftBefore(step.i)}
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
        <p className="-skew-x-8 bg-black px-3 py-1 text-center font-display text-2xl uppercase text-comic-yellow">
          {round.boss
            ? `Fronti sfondati ${broken} su ${threats.length}`
            : `Panico +${round.panic ?? 0} · ${view.panic}/${view.panic_limit}`}
        </p>
        {round.boss && <p className="text-xs font-extrabold text-foreground">Ne servivano {view.players}, uno a testa.</p>}
        <p className="text-xs font-extrabold uppercase tracking-wide text-foreground">
          {finished ? "Tocca per com'è finita" : "Tocca per il prossimo round"}
        </p>
      </div>
      {!landed && step.kind !== "page" && step.kind !== "close" && (
        <p className="pointer-events-none absolute inset-x-0 bottom-2 z-10 text-center text-[10px] font-extrabold uppercase tracking-widest text-foreground/80">
          Tocca per andare avanti
        </p>
      )}
    </div>
  );
}

