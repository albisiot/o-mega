"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useCardDetail } from "@/components/card-detail";
import { useCardLooks } from "@/components/card-looks";
import { prefersReducedMotion } from "@/components/comic-page";
import { EmergencyComic } from "@/components/emergency-comic";
import { PlayerAvatar } from "@/components/player-avatar";
import { balance } from "@/config/balance";
import { useBannerHold } from "@/lib/banner-hold";
import { withBasePath } from "@/lib/base-path";
import { DISTRICTS, MAP_HEIGHT, MAP_WIDTH, placeThreats } from "@/lib/city-districts";
import type { RaidCard, RaidMember, RaidPlayView, RaidRound, RaidView } from "@/lib/raid";
import type { PowerNote } from "@/lib/round-powers";

// A round of a hunt told on the map of Nuova Megara (SPEC §5.18), as the Operazioni do: the
// round's threat lights up in its district, the camera goes to it, it rises as the Emergenza's
// comic page against the Attack (the highest card leads, the friends' cards are balloons that add
// their points), closes back into its pin with the stamp of the result (the damage, or the
// Defences lost), and the whole map comes back with the Boss's Life. Nothing here decides anything.

type Step = { kind: "overview" | "pan" | "page" | "close" | "settle" | "back" | "final" };

const STEPS: Step["kind"][] = ["overview", "pan", "page", "close", "settle", "back", "final"];
const STEP_MS: Record<"overview" | "pan" | "close" | "settle" | "back", number> = { overview: 1000, pan: 800, close: 420, settle: 750, back: 800 };
const ZOOM = 1.8;

type Played = { play: RaidPlayView; card: RaidCard | undefined; member: RaidMember | undefined };

/** The cards of the round, the one that counted most first, with who put them down. */
function playedIn(view: RaidView, round: RaidRound): Played[] {
  const cards = new Map<string, { card: RaidCard; member: RaidMember }>();
  for (const member of view.members) for (const card of member.squad ?? []) cards.set(card.instance_id, { card, member });
  return [...(round.plays ?? [])]
    .sort((a, b) => b.counted - a.counted || a.seat - b.seat)
    .map((play) => ({ play, card: cards.get(play.instance_id)?.card, member: cards.get(play.instance_id)?.member }));
}

/** "Tu", or the friend's name. */
function nameOf(view: RaidView, member: RaidMember | undefined): string {
  return !member ? "?" : member.user_id === view.me ? "Tu" : member.username;
}

/** The stamp of a round on the map. */
export function raidStamp(round: RaidRound): string {
  const result = round.result;
  if (!result) return "";
  if (!result.held) return `−${result.defenses_lost} ${result.defenses_lost === 1 ? "Difesa" : "Difese"}`;
  return result.damage > 0 ? `−${result.damage} Vita` : "Retto";
}

/**
 * A resolved round on the map. A tap skips a camera move; the page has its own taps. Once the
 * Boss's Life is on the map, a tap (or the button) is `onContinue`.
 */
export function RaidMapReveal({ view, round, onContinue }: { view: RaidView; round: RaidRound; onContinue: () => void }) {
  useBannerHold();
  const detail = useCardDetail();
  const looks = useCardLooks();
  const threat = round.threat;
  const result = round.result;
  const played = playedIn(view, round);
  const lead = played[0];
  const [placed] = useState(() => placeThreats([{ name: threat?.name ?? "", district: threat?.district ?? view.boss.district }]));
  const spot = placed[0];
  const [at, setAt] = useState(0);
  const [pageDone, setPageDone] = useState(false);
  const [covered, setCovered] = useState(false);
  const step = STEPS[Math.min(at, STEPS.length - 1)];
  const still = prefersReducedMotion();
  const next = () => setAt((n) => Math.min(n + 1, STEPS.length - 1));

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
    if (step === "page" || step === "final") return;
    const ms = STEP_MS[step];
    const timer = setTimeout(next, still ? Math.min(ms, 400) : ms);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [at]);
  useEffect(() => {
    if (step !== "page") return;
    const timer = setTimeout(() => setCovered(true), still ? 200 : 480);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [at]);
  useEffect(() => {
    if (step !== "page" || !pageDone) return;
    const timer = setTimeout(next, balance.triple.contestReadSeconds * 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [at, pageDone]);

  const landed = step === "final";
  const zoomed = step === "pan" || step === "page" || step === "close" || step === "settle";
  const camera: CSSProperties = (() => {
    if (!zoomed || !spot || still) return { transform: "none" };
    const p = onMap(spot.x, spot.y);
    const clamp = (value: number, min: number, max: number) => (min > max ? (min + max) / 2 : Math.min(max, Math.max(min, value)));
    const tx = clamp(size.w / 2 - p.left * ZOOM, size.w - (ox + MAP_WIDTH * scale) * ZOOM, -ox * ZOOM);
    const ty = clamp(size.h / 2 - p.top * ZOOM, size.h - (oy + MAP_HEIGHT * scale) * ZOOM, -oy * ZOOM);
    return { transform: `translate(${tx}px, ${ty}px) scale(${ZOOM})` };
  })();
  const settled = step === "settle" || step === "back" || step === "final";

  // The team's record before this round (the Emergenza page's counters).
  const before = view.rounds.filter((r) => r.resolved && r.round < round.round);
  const heldBefore = before.filter((r) => r.result?.held).length;
  const lostBefore = before.length - heldBefore;
  const defensesBefore = (result?.defenses ?? 0) + (result?.defenses_lost ?? 0);
  const heavy = round.move === "heavy" && !result?.cancelled;
  const notes: PowerNote[] = played.slice(1).map(({ play, card, member }) => ({
    name: `Carta di ${nameOf(view, member) === "Tu" ? "te" : nameOf(view, member)}`,
    effect: `+${play.counted} (${card?.name ?? "?"})`,
    active: true,
    points: play.counted,
    code: "support",
  }));
  const statsOf = (card: RaidCard | undefined) => (card && threat ? threat.abilities.map((code) => `${code} ${card.stats[code] ?? 0}`).join(" · ") : "");
  const press = lead?.card ? detail.press(lead.card, looks(lead.card.definition_id, lead.member?.user_id === view.me ? "me" : "opponent")) : undefined;
  const finished = view.status !== "active";
  const cityName = onMap(8, 584);
  const held = Boolean(result?.held);

  return (
    <div
      ref={stage}
      role="button"
      tabIndex={0}
      aria-label={`Round ${round.round} sulla mappa: ${raidStamp(round)}; Vita del Boss ${result?.vita ?? 0} su ${view.vita_max}`}
      className="relative min-h-0 flex-1 cursor-pointer overflow-hidden bg-[#1d4a63] bg-[repeating-linear-gradient(170deg,transparent_0_12px,rgb(47_106_135/0.35)_12px_14px)]"
      onClick={() => {
        if (step === "page") return;
        if (step === "final") onContinue();
        else next();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        if (step === "final") onContinue();
        else if (step !== "page") next();
      }}
    >
      <div
        className={`absolute inset-0 origin-top-left ${step === "page" && covered ? "invisible" : ""}`}
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
          {view.boss.name}
        </span>
        {spot && threat && (
          <div
            className={`absolute z-[2] flex -translate-y-full flex-col gap-0.5 ${
              spot.x > MAP_WIDTH * 0.72 ? "-translate-x-[calc(100%-16px)] items-end" : spot.x < MAP_WIDTH * 0.28 ? "-translate-x-[16px] items-start" : "-translate-x-1/2 items-center"
            }`}
            style={onMap(spot.x, spot.y)}
          >
            <span className={`max-w-[150px] border-2 border-black bg-white px-1.5 py-0.5 text-center text-black shadow-[2px_2px_0_#000] ${zoomed && !settled ? "outline outline-2 outline-comic-yellow" : ""}`}>
              <span className="block text-[8px] font-extrabold uppercase leading-[10px] tracking-wide">
                Round {round.round} · Lv {round.level}
              </span>
              <span className="block truncate font-display text-[12px] uppercase leading-[14px]">{threat.name}</span>
            </span>
            <span className="relative flex items-center gap-1">
              <span
                className={`grid h-7 w-7 -rotate-45 place-items-center rounded-[50%_50%_50%_0] border-[3px] border-black transition-colors duration-300 ${
                  settled ? (held ? "bg-comic-cyan" : "bg-comic-magenta") : "bg-comic-yellow"
                }`}
              >
                <span className="rotate-45 font-display text-[14px] leading-none text-black">{round.round}</span>
              </span>
              {settled && lead?.member && <PlayerAvatar username={lead.member.username} avatarUrl={lead.member.avatar_url} size="2xs" />}
              {settled && (
                <span
                  className={`comic-stamp absolute top-0.5 -rotate-6 whitespace-nowrap border-[3px] border-black px-1 font-display text-[13px] uppercase leading-[18px] shadow-[2px_2px_0_#000] ${
                    spot.x > MAP_WIDTH * 0.6 ? "right-[calc(100%+4px)]" : "left-[calc(100%+4px)]"
                  } ${held ? "bg-comic-cyan text-black" : "bg-comic-magenta text-black"}`}
                >
                  {raidStamp(round)}
                </span>
              )}
            </span>
          </div>
        )}
      </div>

      {(step === "page" || step === "close") && threat && result && (
        <div
          className="absolute inset-0 z-20 flex flex-col bg-background"
          style={{
            animation: still ? "panel-fade 0.2s ease-out both" : step === "close" ? "map-page-out 0.4s ease-in both" : "map-page-in 0.45s cubic-bezier(0.2, 1.3, 0.4, 1) both",
          }}
        >
          <EmergencyComic
            number={round.round}
            of={view.rounds.length}
            passedBefore={heldBefore}
            failedBefore={lostBefore}
            lastChance={defensesBefore <= (heavy ? balance.raid.heavyDefenses : 1)}
            threatName={threat.name}
            level={threat.level}
            abilities={threat.abilities}
            rule={round.modifier ?? null}
            card={lead?.card ?? null}
            stats={statsOf(lead?.card)}
            score={result.total}
            target={round.attack}
            required={result.required}
            passed={held}
            notes={notes}
            decisive={null}
            ended={finished && round.round === Math.max(...view.rounds.filter((r) => r.resolved).map((r) => r.round))}
            press={press}
            onContinue={() => {
              if (step === "page") next();
            }}
            onVerdict={() => setPageDone(true)}
            action={(complete, skip) => (
              <button type="button" onClick={complete ? () => next() : skip} className="btn btn-primary w-full">
                {complete ? "Sulla mappa" : "Salta"}
              </button>
            )}
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
          {raidStamp(round)} · Vita {result?.vita ?? 0}/{view.vita_max}
        </p>
        <p className="text-xs font-extrabold text-foreground">
          Difese {result?.defenses ?? view.defenses}/{view.defenses_max}
          {result && result.healed > 0 ? ` · il Boss recupera ${result.healed} di Vita` : ""}
        </p>
        <p className="text-xs font-extrabold uppercase tracking-wide text-foreground">{finished ? "Tocca per com'è finita" : "Tocca per il riepilogo"}</p>
      </div>
      {!landed && step !== "page" && step !== "close" && (
        <p className="pointer-events-none absolute inset-x-0 bottom-2 z-10 text-center text-[10px] font-extrabold uppercase tracking-widest text-foreground/80">
          Tocca per andare avanti
        </p>
      )}
    </div>
  );
}
