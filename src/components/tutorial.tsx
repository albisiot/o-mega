"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { CardView, type CardData } from "@/components/card-view";
import { ComicBurst, PackArt } from "@/components/comic-parts";
import { RoundComic } from "@/components/round-comic";
import {
  DOGWATCH,
  GANTRY,
  POWER_EXAMPLE,
  PRACTICE,
  SAMPLE_CARD,
  SAMPLE_LEVELS,
  scoreOn,
  THREAT_EXAMPLES,
  TUTORIAL_ABILITIES,
  TUTORIAL_FAMILIES,
  TUTORIAL_MODES,
  TUTORIAL_POWERS,
  TUTORIAL_RARITIES,
  TUTORIAL_STEPS,
  type TutorialStepKey,
} from "@/config/tutorial";
import { withBasePath } from "@/lib/base-path";
import type { MatchCard } from "@/lib/match";
import { rarityFrame, rarityLetter } from "@/lib/rarity-theme";
import { hasSeenTutorial, markTutorialSeen } from "@/lib/tutorial-seen";

/** Shown once per device, right after the world intro. The home loads it only when needed. */
export function FirstRunTutorial() {
  const [open, setOpen] = useState(() => !hasSeenTutorial());

  if (!open) return null;

  return (
    <TutorialPanels
      onClose={() => {
        markTutorialSeen();
        setOpen(false);
      }}
    />
  );
}

/** Replays the tutorial: a row on the Profile screen, a header button (`compact`) on the Play one. */
export function TutorialButton({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  const [replaying, setReplaying] = useState(false);

  return (
    <>
      {replaying && <TutorialPanels onClose={() => setReplaying(false)} />}
      {compact ? (
        <button type="button" onClick={() => setReplaying(true)} className="btn btn-outline shrink-0">
          Come si gioca
        </button>
      ) : (
        <button type="button" onClick={() => setReplaying(true)} className={`row-link w-full text-left ${className}`}>
          <span className="font-display text-xl uppercase">Come si gioca</span>
          <span className="font-display text-2xl text-comic-yellow" aria-hidden>
            →
          </span>
        </button>
      )}
    </>
  );
}

/** The sound effect stamped next to the title of the key pages. */
const STEP_SFX: Partial<Record<TutorialStepKey, { text: string; fill: string }>> = {
  welcome: { text: "WOW!", fill: "#16c8ff" },
  pack: { text: "ZIP!", fill: "#ff2e6c" },
  threats: { text: "BRRR!", fill: "#ff8a00" },
  win: { text: "POW!", fill: "#16c8ff" },
  conquest: { text: "ZAC!", fill: "#ff2e6c" },
  done: { text: "VIA!", fill: "#16c8ff" },
};

/** Pages where Omi is amazed rather than smiling. */
const OMI_WOW: readonly TutorialStepKey[] = ["welcome", "threats", "conquest", "done"];

function TutorialPanels({ onClose: close }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"next" | "prev">("next");

  const panel = TUTORIAL_STEPS[step];
  const last = step === TUTORIAL_STEPS.length - 1;
  const sfx = STEP_SFX[panel.key];
  const [first, ...others] = panel.points;

  const go = (to: number) => {
    setDirection(to > step ? "next" : "prev");
    setStep(to);
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={panel.title} className="rays-dark fixed inset-0 z-30 flex flex-col overflow-hidden">
      <header className="flex flex-col gap-2 border-b-[3px] border-black bg-background px-4 pb-2.5 pt-[calc(var(--safe-top)+8px)]">
        <div className="flex items-center justify-between gap-3">
          <p className="-skew-x-8 bg-comic-yellow px-2 py-0.5 font-display text-sm uppercase text-black">
            Pagina {step + 1} di {TUTORIAL_STEPS.length}
          </p>
          <button type="button" onClick={close} className="btn btn-ghost">
            {last ? "Chiudi" : "Salta"}
          </button>
        </div>
        {/* The pages as a strip of panels: the ones read in yellow, this one in magenta. */}
        <div className="flex h-5 items-end gap-1" aria-hidden>
          {TUTORIAL_STEPS.map((item, index) => (
            <span
              key={index === step ? `${item.key}-now` : item.key}
              className={`flex-1 -skew-x-8 border-2 border-black ${
                index === step ? "tut-tick h-5 bg-comic-magenta" : index < step ? "h-3 bg-comic-yellow" : "h-3 bg-panel-raised"
              }`}
            />
          ))}
        </div>
      </header>

      {/* The key restarts the scroll and the entrance at every page. */}
      <main
        key={panel.key}
        className={`tut-whip-${direction} flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-4`}
      >
        <div className="flex items-start justify-between gap-2">
          <h2 className="-skew-x-8 border-[3px] border-black bg-comic-yellow px-3 py-0.5 font-display text-[32px] uppercase leading-10 text-black shadow-[5px_5px_0_var(--comic-magenta)]">
            {panel.title}
          </h2>
          {sfx && (
            <ComicBurst fill={sfx.fill} className="tut-sfx relative -mr-1 -mt-1 h-20 w-20 shrink-0" textClassName="text-2xl">
              {sfx.text}
            </ComicBurst>
          )}
        </div>

        {first && (
          <div className="mt-1 flex items-start gap-3">
            <Omi wow={OMI_WOW.includes(panel.key)} className="tut-omi h-[72px] w-[72px] shrink-0 -rotate-6" />
            <p className="tut-balloon tut-balloon-tail tut-pop min-w-0 flex-1 px-3 py-2 text-[15px] font-semibold leading-5">{first}</p>
          </div>
        )}
        {others.map((point, index) => (
          <p
            key={point}
            className="tut-balloon tut-pop px-3 py-2 text-[15px] font-semibold leading-5"
            style={{ animationDelay: `${0.12 * (index + 1)}s` }}
          >
            {point}
          </p>
        ))}
        <StepDemo step={panel.key} onClose={close} />
      </main>

      <footer className="flex gap-2 border-t-[3px] border-black bg-background px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3">
        {step > 0 && (
          <button type="button" onClick={() => go(step - 1)} className="btn btn-ghost">
            Indietro
          </button>
        )}
        <button type="button" onClick={last ? close : () => go(step + 1)} className="btn btn-primary flex-1">
          {last ? "Inizia" : "Avanti"}
        </button>
      </footer>

      {last && <Confetti />}
    </div>
  );
}

/** Omi, the Ω that narrates the tutorial: smiling, or amazed with `wow`. */
function Omi({ wow = false, className = "" }: { wow?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <path
        d="M50 8C27 8 12 25 12 46c0 14 7 25 17 31H16v13h30V75c-10-4-17-15-17-28 0-14 9-25 21-25s21 11 21 25c0 13-7 24-17 28v15h30V77H71c10-6 17-17 17-31C88 25 73 8 50 8Z"
        fill="#ffd60a"
        stroke="#000"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <ellipse cx="40" cy="44" rx="6" ry={wow ? 9 : 8} fill="#000" />
      <ellipse cx="60" cy="44" rx="6" ry={wow ? 9 : 8} fill="#000" />
      <circle cx="42" cy="41" r="2.2" fill="#fff" />
      <circle cx="62" cy="41" r="2.2" fill="#fff" />
      {wow ? (
        <ellipse cx="50" cy="61" rx="5" ry="6" fill="#000" />
      ) : (
        <path d="M41 58q9 8 18 0" fill="none" stroke="#000" strokeWidth="4" strokeLinecap="round" />
      )}
    </svg>
  );
}

const CONFETTI_COLORS = ["#ffd60a", "#ff2e6c", "#16c8ff", "#ff8a00", "#fff8e7"];

/** One shower of confetti on the last page: fixed positions, so it looks the same each time. */
function Confetti() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden>
      {Array.from({ length: 36 }, (_, index) => (
        <span
          key={index}
          className="tut-confetti"
          style={
            {
              left: `${(index * 37) % 100}%`,
              background: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
              borderRadius: index % 3 === 0 ? "50%" : 0,
              "--delay": `${(index % 9) * 0.12}s`,
              "--fall": `${2.2 + (index % 5) * 0.35}s`,
              "--drift": `${((index * 53) % 80) - 40}px`,
              "--spin": `${index % 2 ? 540 : -480}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

function StepDemo({ step, onClose }: { step: TutorialStepKey; onClose: () => void }) {
  switch (step) {
    case "welcome":
      return <WelcomeDemo />;
    case "pack":
      return <PackArt body="#ff2e6c" omega="#ffd60a" className="h-48 shrink-0 rotate-[6deg] self-center" />;
    case "card":
      return (
        <div className="flex justify-center">
          <CardView card={SAMPLE_CARD} abilities={TUTORIAL_ABILITIES} />
        </div>
      );
    case "abilities":
      return <AbilitiesDemo />;
    case "rarity":
      return <RarityDemo />;
    case "team":
      return <TeamDemo />;
    case "threats":
      return <ThreatsDemo />;
    case "round":
      return <RoundDemo />;
    case "practice":
      return <PracticeDemo />;
    case "powers":
      return <PowersDemo />;
    case "modes":
      return <ModesDemo />;
    case "done":
      return (
        <Link href="/squadra/?difficulty=easy" onClick={onClose} className="btn btn-outline">
          Allenati col bot Facile
        </Link>
      );
    default:
      return null;
  }
}

const VERBS = [
  { name: "Apri", text: "un pacchetto gratis al giorno", color: "bg-comic-yellow" },
  { name: "Colleziona", text: "eroi, cattivi e neutrali", color: "bg-comic-cyan" },
  { name: "Gioca", text: "sfide 1 contro 1 da 3 minuti", color: "bg-comic-magenta" },
  { name: "Conquista", text: "le carte di chi batti", color: "bg-foreground" },
];

function WelcomeDemo() {
  return (
    <ul className="flex flex-col gap-2">
      {VERBS.map((verb, index) => (
        <li key={verb.name} className={`tut-pop px-4 py-2.5 text-black ${verb.color}`} style={{ animationDelay: `${0.25 + 0.1 * index}s` }}>
          <p className="-skew-x-8 font-display text-3xl uppercase">{verb.name}</p>
          <p className="text-sm font-bold">{verb.text}</p>
        </li>
      ))}
    </ul>
  );
}

function AbilitiesDemo() {
  return (
    <div className="grid grid-cols-2 gap-2">
      {TUTORIAL_FAMILIES.map((family) => (
        <div key={family.code} className="bg-panel px-3 py-2">
          <p className="font-display text-lg uppercase" style={{ color: family.color }}>
            {family.name}
          </p>
          <ul className="text-sm font-semibold">
            {family.abilities.map(([code, name]) => (
              <li key={code}>
                <span className="font-extrabold">{code}</span> <span className="text-muted">{name}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function RarityDemo() {
  return (
    <ol className="flex gap-1.5" aria-label="Dalla più comune alla più rara">
      {TUTORIAL_RARITIES.map((rarity) => (
        <li key={rarity.name} className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <span
            className="flex h-10 w-full -skew-x-8 items-center justify-center font-sans text-xl font-black text-black"
            style={{ background: rarityFrame(rarity) }}
          >
            {rarityLetter(rarity)}
          </span>
          <span className="font-display text-xs uppercase" style={{ color: rarity.color }}>
            {rarity.name}
          </span>
        </li>
      ))}
    </ol>
  );
}

function TeamDemo() {
  return (
    <div className="flex gap-1.5" aria-hidden>
      {[1, 2, 3, 4, 5].map((slot) => (
        <span
          key={slot}
          className="flex h-16 min-w-0 flex-1 -skew-x-8 items-center justify-center border-2 border-dashed border-line bg-panel font-display text-xl text-faint"
        >
          {slot}
        </span>
      ))}
    </div>
  );
}

function ThreatsDemo() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-bold text-muted">Esempio di partita</p>
        <ol className="flex gap-1.5">
          {SAMPLE_LEVELS.map((level, index) => (
            <li
              key={index}
              aria-label={`Livello ${level}`}
              className="flex h-10 flex-1 -skew-x-8 items-center justify-center border-2 border-line font-display text-[22px]"
            >
              {level}
            </li>
          ))}
        </ol>
      </div>
      {THREAT_EXAMPLES.map((threat) => {
        const fighters = [GANTRY, DOGWATCH].map((card) => ({ card, score: scoreOn(card, threat) }));
        const best = Math.max(...fighters.map((fighter) => fighter.score));
        return (
          <section key={threat.id} className="flex flex-col gap-1 bg-panel px-3 py-2">
            <p className="font-display text-lg uppercase">
              {threat.name} · livello {threat.level}
            </p>
            <AbilityChips codes={threat.abilities} />
            {fighters.map(({ card, score }) => (
              <p key={card.name} className="flex items-center justify-between text-sm font-semibold">
                <span>
                  {card.name} <span className="text-muted">({card === GANTRY ? "specialista" : "generalista"})</span>
                </span>
                <span className={`font-display text-2xl leading-6 ${score === best ? "text-comic-yellow" : "text-muted"}`}>{score}</span>
              </p>
            ))}
          </section>
        );
      })}
    </div>
  );
}

function AbilityChips({ codes }: { codes: readonly string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {codes.map((code) => {
        const ability = TUTORIAL_ABILITIES.find((item) => item.code === code);
        return (
          <span key={code} className="bg-black px-2 py-1 text-[13px] font-extrabold" style={{ color: ability?.family.color }}>
            {ability?.name ?? code}
          </span>
        );
      })}
    </div>
  );
}

function RoundDemo() {
  const { threat } = PRACTICE;
  const score = scoreOn(DOGWATCH, threat);
  return (
    <div className="flex flex-col gap-1 bg-panel px-3 py-2">
      <p className="font-display text-lg uppercase">{threat.name}</p>
      <AbilityChips codes={threat.abilities} />
      <p className="mt-1 text-sm font-semibold">
        {DOGWATCH.name}: {threat.abilities.map((code) => `${code} ${DOGWATCH.stats[code]}`).join(" + ")} ={" "}
        <span className="font-display text-2xl text-comic-yellow">{score}</span>
      </p>
    </div>
  );
}

function PracticeDemo() {
  const { threat, opponent, team } = PRACTICE;
  const [choice, setChoice] = useState<(typeof team)[number] | null>(null);
  const [replay, setReplay] = useState(0);
  const opponentScore = scoreOn(opponent, threat);
  const myScore = choice ? scoreOn(choice.card, threat) : 0;
  const won = myScore > opponentScore;
  const result = useRef<HTMLElement>(null);

  // The result appears below the choices: on a phone it would stay off screen.
  useEffect(() => {
    result.current?.scrollIntoView({ block: "nearest" });
  }, [choice]);

  return (
    <div className="flex flex-col gap-3">
      <section className="cut-bottom bg-comic-magenta px-4 pb-6 pt-3 text-black">
        <p className="text-sm font-extrabold">Round 1 · Livello {threat.level}</p>
        <p className="mb-2 font-display text-[34px] uppercase leading-10">{threat.name}</p>
        <AbilityChips codes={threat.abilities} />
      </section>

      <ul className="flex flex-col gap-2">
        {team.map((member) => {
          const selected = choice === member;
          return (
            <li key={member.card.name}>
              <button
                type="button"
                onClick={() => setChoice(member)}
                aria-pressed={selected}
                className={`flex w-full items-center gap-3 border-[3px] bg-panel p-2 text-left ${
                  selected ? "border-comic-yellow shadow-[4px_4px_0_var(--comic-magenta)]" : "border-panel-raised"
                }`}
              >
                <CardThumb src={member.card.art_url} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-xl uppercase">{member.card.name}</span>
                  <span className="block text-xs font-semibold text-muted">
                    {threat.abilities.map((code) => `${code} ${member.card.stats[code]}`).join(" · ")}
                  </span>
                </span>
                <span className={`font-display text-4xl ${selected ? "text-comic-yellow" : ""}`}>{scoreOn(member.card, threat)}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {choice && (
        <section ref={result} className="flex flex-col gap-2" aria-live="polite">
          {/* The result as a real match shows it; a tap at the end plays it again. */}
          <DemoComic
            key={`${choice.card.name}-${replay}`}
            round={1}
            threat={threat}
            me={{ card: choice.card, score: myScore }}
            opponent={{ card: opponent, score: opponentScore, label: "Avversario" }}
            winner={won ? "me" : "opponent"}
            resultLine={`${won ? choice.card.name : opponent.name} batte ${won ? opponent.name : choice.card.name} · ${Math.max(myScore, opponentScore)} a ${Math.min(myScore, opponentScore)}.`}
            onReplay={() => setReplay((n) => n + 1)}
          />
          <p className={`p-3 text-sm font-semibold text-black ${won ? "bg-comic-cyan" : "bg-comic-magenta"}`}>{choice.feedback}</p>
        </section>
      )}
    </div>
  );
}

function CardThumb({ src }: { src?: string | null }): ReactNode {
  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={withBasePath(src)} alt="" className="h-14 w-11 shrink-0 border-2 border-black object-cover object-top" />;
}

function PowersDemo() {
  const [replay, setReplay] = useState(0);
  const { threat, round, me, opponent, decisive } = POWER_EXAMPLE;
  const myScore = scoreOn(me, threat) + me.bonus;
  const theirScore = scoreOn(opponent, threat);
  return (
    <>
      <DemoComic
        key={replay}
        round={round}
        threat={threat}
        me={{ card: me, score: myScore, notes: [{ name: me.power?.name ?? "", effect: `+${me.bonus}`, active: true, points: me.bonus }] }}
        opponent={{ card: opponent, score: theirScore, label: "Avversario" }}
        winner="me"
        resultLine={`${me.name} batte ${opponent.name} · ${myScore} a ${theirScore}.`}
        decisive={{ side: "me", index: 0, text: decisive }}
        onReplay={() => setReplay((n) => n + 1)}
      />
      <PowersList />
    </>
  );
}

/** A card of the tutorial as the round result reads it. */
function demoCard(card: CardData, power: MatchCard["power"] = null): MatchCard {
  return {
    definition_id: card.name,
    code: card.code ?? card.name,
    name: card.name,
    faction: card.faction,
    flavor: card.flavor,
    art_url: card.art_url ?? null,
    stats: card.stats,
    rarity: { code: card.rarity.name.toLowerCase(), ...card.rarity },
    power,
  };
}

/** The round result of a real match, with made-up plays: it teaches how to read it. */
function DemoComic({
  round,
  threat,
  me,
  opponent,
  winner,
  resultLine,
  decisive = null,
  onReplay,
}: {
  round: number;
  threat: { name: string; level: number; abilities: string[] };
  me: { card: CardData; score: number; notes?: { name: string; effect: string; active: boolean; points?: number }[] };
  opponent: { card: CardData; score: number; label: string };
  winner: "me" | "opponent";
  resultLine: string;
  decisive?: { side: "me" | "opponent"; index: number; text: string } | null;
  onReplay: () => void;
}) {
  const stats = (card: CardData) => threat.abilities.map((code) => `${code} ${card.stats[code] ?? 0}`).join(" · ");
  return (
    <div className="flex h-[min(600px,82dvh)] shrink-0 flex-col">
      <RoundComic
        round={round}
        level={threat.level}
        threatName={threat.name}
        abilities={threat.abilities}
        twist={null}
        me={{ label: "Tu", card: demoCard(me.card), stats: stats(me.card), score: me.score, notes: me.notes ?? [] }}
        opponent={{ label: opponent.label, card: demoCard(opponent.card), stats: stats(opponent.card), score: opponent.score, notes: [] }}
        winner={winner}
        decisive={decisive}
        resultLine={resultLine}
        notices={[]}
        onContinue={onReplay}
        hint={(complete) => (
          <p className="py-1 text-xs font-extrabold uppercase tracking-wide text-black">{complete ? "Tocca per rivederlo" : "Tocca per saltare"}</p>
        )}
      />
    </div>
  );
}

function PowersList() {
  return (
    <ul className="flex flex-col gap-0.5">
      {TUTORIAL_POWERS.map((power) => (
        <li key={power.name} className="bg-panel px-3 py-2">
          <p className="font-display text-lg uppercase text-comic-yellow">{power.name}</p>
          <p className="text-sm font-medium text-muted">{power.text}</p>
        </li>
      ))}
    </ul>
  );
}

function ModesDemo() {
  return (
    <ul className="flex flex-col gap-2">
      {TUTORIAL_MODES.map((mode, index) => (
        <li key={mode.name} className={`tut-pop px-4 py-3 text-black ${mode.color}`} style={{ animationDelay: `${0.25 + 0.1 * index}s` }}>
          <p className="text-xs font-extrabold uppercase tracking-wide">{mode.group}</p>
          <p className="-skew-x-8 font-display text-2xl uppercase leading-7">{mode.name}</p>
          <p className="mt-1 text-sm font-bold">{mode.text}</p>
        </li>
      ))}
    </ul>
  );
}
