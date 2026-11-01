"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { CardView } from "@/components/card-view";
import { PackArt } from "@/components/comic-parts";
import {
  MAX_CARGO,
  PRACTICE,
  SAMPLE_CARD,
  SAMPLE_LEVELS,
  scoreOn,
  THREAT_EXAMPLES,
  TONY_RONDA,
  TUTORIAL_ABILITIES,
  TUTORIAL_FAMILIES,
  TUTORIAL_MODES,
  TUTORIAL_POWERS,
  TUTORIAL_RARITIES,
  TUTORIAL_STEPS,
  type TutorialStepKey,
} from "@/config/tutorial";
import { withBasePath } from "@/lib/base-path";
import { rarityFrame, rarityLetter } from "@/lib/rarity-theme";

const SEEN_KEY = "o-mega.tutorial-seen";

function hasSeenTutorial() {
  try {
    return localStorage.getItem(SEEN_KEY) !== null;
  } catch {
    return true;
  }
}

function markTutorialSeen() {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Without storage the tutorial simply shows again on the next visit.
  }
}

/** Shown once per device, right after the world intro. */
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

/** Row that replays the tutorial, for the Play and Profile screens. */
export function TutorialButton() {
  const [replaying, setReplaying] = useState(false);

  return (
    <>
      {replaying && <TutorialPanels onClose={() => setReplaying(false)} />}
      <button type="button" onClick={() => setReplaying(true)} className="row-link w-full text-left">
        <span className="font-display text-xl uppercase">Come si gioca</span>
        <span className="font-display text-2xl text-comic-yellow" aria-hidden>
          →
        </span>
      </button>
    </>
  );
}

function TutorialPanels({ onClose: close }: { onClose: () => void }) {
  const [step, setStep] = useState(0);

  const panel = TUTORIAL_STEPS[step];
  const last = step === TUTORIAL_STEPS.length - 1;

  return (
    <div role="dialog" aria-modal="true" aria-label={panel.title} className="fixed inset-0 z-30 flex flex-col bg-background">
      <header className="flex flex-col gap-2 border-b-[3px] border-foreground px-4 pb-2 pt-[calc(var(--safe-top)+8px)]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-muted">
            {step + 1} di {TUTORIAL_STEPS.length}
          </p>
          <button type="button" onClick={close} className="btn btn-ghost">
            {last ? "Chiudi" : "Salta"}
          </button>
        </div>
        <div className="flex gap-1" aria-hidden>
          {TUTORIAL_STEPS.map((item, index) => (
            <span key={item.key} className={`h-2 flex-1 -skew-x-8 ${index <= step ? "bg-comic-yellow" : "bg-panel-raised"}`} />
          ))}
        </div>
      </header>

      {/* The key restarts the scroll and the fade at every step. */}
      <main key={panel.key} className="animate-panel-fade flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 py-4">
        <h2 className="-skew-x-8 font-display text-4xl uppercase text-comic-yellow [text-shadow:3px_3px_0_var(--comic-magenta)]">
          {panel.title}
        </h2>
        {panel.points.map((point) => (
          <p key={point} className="text-base font-semibold">
            {point}
          </p>
        ))}
        <StepDemo step={panel.key} onClose={close} />
      </main>

      <footer className="flex gap-2 border-t-[3px] border-foreground px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3">
        {step > 0 && (
          <button type="button" onClick={() => setStep(step - 1)} className="btn btn-ghost">
            Indietro
          </button>
        )}
        <button type="button" onClick={last ? close : () => setStep(step + 1)} className="btn btn-primary flex-1">
          {last ? "Inizia" : "Avanti"}
        </button>
      </footer>
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
      {VERBS.map((verb) => (
        <li key={verb.name} className={`px-4 py-2.5 text-black ${verb.color}`}>
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
        const fighters = [MAX_CARGO, TONY_RONDA].map((card) => ({ card, score: scoreOn(card, threat) }));
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
                  {card.name} <span className="text-muted">({card === MAX_CARGO ? "specialista" : "generalista"})</span>
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
  const score = scoreOn(TONY_RONDA, threat);
  return (
    <div className="flex flex-col gap-1 bg-panel px-3 py-2">
      <p className="font-display text-lg uppercase">{threat.name}</p>
      <AbilityChips codes={threat.abilities} />
      <p className="mt-1 text-sm font-semibold">
        {TONY_RONDA.name}: {threat.abilities.map((code) => `${code} ${TONY_RONDA.stats[code]}`).join(" + ")} ={" "}
        <span className="font-display text-2xl text-comic-yellow">{score}</span>
      </p>
    </div>
  );
}

function PracticeDemo() {
  const { threat, opponent, team } = PRACTICE;
  const [choice, setChoice] = useState<(typeof team)[number] | null>(null);
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
        <section ref={result} className={`flex flex-col gap-1 p-3 text-black ${won ? "bg-comic-cyan" : "bg-comic-magenta"}`} aria-live="polite">
          <p className="font-display text-2xl uppercase">{won ? "Round vinto!" : "Round perso"}</p>
          <p className="text-sm font-bold">
            {choice.card.name} {myScore} – {opponentScore} {opponent.name}
          </p>
          <p className="text-sm font-semibold">{choice.feedback}</p>
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
      {TUTORIAL_MODES.map((mode) => (
        <li key={mode.name} className={`px-4 py-3 text-black ${mode.color}`}>
          <p className="-skew-x-8 font-display text-2xl uppercase">{mode.name}</p>
          <p className="mt-1 text-sm font-bold">{mode.text}</p>
        </li>
      ))}
    </ul>
  );
}
