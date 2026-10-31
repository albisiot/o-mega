"use client";

import { useState } from "react";
import { WORLD_FACTIONS, WORLD_INTRO } from "@/config/world";
import { withBasePath } from "@/lib/base-path";

const SEEN_KEY = "o-mega.world-intro-seen";

function hasSeenIntro() {
  try {
    return localStorage.getItem(SEEN_KEY) !== null;
  } catch {
    return true;
  }
}

function markIntroSeen() {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Without storage the intro simply shows again on the next visit.
  }
}

/** Full-screen story shown once per device, above the home screen. */
export function WorldIntro() {
  const [open, setOpen] = useState(() => !hasSeenIntro());
  const [step, setStep] = useState(0);

  if (!open) return null;

  const panel = WORLD_INTRO[step];
  const last = step === WORLD_INTRO.length - 1;

  function close() {
    markIntroSeen();
    setOpen(false);
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={panel.title} className="fixed inset-0 z-30 flex flex-col bg-black">
      <div className="relative min-h-0 flex-1">
        <img src={withBasePath(panel.image)} alt="" className="absolute inset-0 h-full w-full object-cover object-top" />
        <button
          type="button"
          onClick={close}
          className="btn btn-ghost absolute right-3 top-[calc(env(safe-area-inset-top)+12px)]"
        >
          Salta
        </button>
      </div>

      <div className="flex flex-col gap-3 border-t-[3px] border-foreground px-5 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4">
        <h2 className="-skew-x-8 font-display text-4xl uppercase text-comic-yellow [text-shadow:3px_3px_0_var(--comic-magenta)]">
          {panel.title}
        </h2>
        <p className="min-h-30 text-base font-semibold">{panel.text}</p>
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-2" aria-hidden>
            {WORLD_INTRO.map((item, index) => (
              <span key={item.title} className={`h-2.5 w-6 -skew-x-8 ${index === step ? "bg-comic-yellow" : "bg-panel-raised"}`} />
            ))}
          </div>
          <button
            type="button"
            onClick={last ? close : () => setStep(step + 1)}
            className="btn btn-primary flex-1"
          >
            {last ? "Inizia" : "Avanti"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** The same story as a reading page, with the factions, for the profile. */
export function WorldGuide() {
  return (
    <div className="mt-2 flex flex-col gap-0.5">
      {WORLD_INTRO.map((panel) => (
        <div key={panel.title} className="bg-panel">
          <img src={withBasePath(panel.image)} alt="" loading="lazy" className="h-44 w-full object-cover object-top" />
          <div className="px-4 py-3">
            <h3 className="font-display text-lg uppercase text-comic-yellow">{panel.title}</h3>
            <p className="mt-1 text-sm font-medium text-muted">{panel.text}</p>
          </div>
        </div>
      ))}
      {WORLD_FACTIONS.map((faction) => (
        <div key={faction.name} className="bg-panel px-4 py-3">
          <h3 className="font-display text-lg uppercase text-comic-yellow">{faction.name}</h3>
          <ul className="mt-1 flex flex-col gap-1 text-sm font-medium text-muted">
            {faction.groups.map((group) => (
              <li key={group.name}>
                <span className="font-bold text-foreground">{group.name}:</span> {group.text}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
