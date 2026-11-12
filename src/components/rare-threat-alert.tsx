"use client";

import { useEffect, useState } from "react";
import { oddsText, rarityTitle, type ThreatRarity } from "@/lib/threat-rarity";

const SHOW_MS = 2600;

// Each rare threat is announced once per match and round, also across reloads of the page.
const shown = new Set<string>();
const STORAGE_KEY = "o-mega.rare-threat-alerts";

function alreadyShown(key: string): boolean {
  if (shown.has(key)) return true;
  try {
    const stored: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(stored) && stored.includes(key);
  } catch {
    return false;
  }
}

function markShown(key: string) {
  shown.add(key);
  try {
    const stored: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "[]");
    const list = Array.isArray(stored) ? stored.filter((k): k is string => typeof k === "string").slice(-40) : [];
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...list, key]));
  } catch {
    // Without storage the alert may show again after a reload: harmless.
  }
}

/**
 * A rare threat is revealed (SPEC §5.15): for a moment the whole screen says so,
 * with its tier and how rare it is, and the phone vibrates where it can. A tap
 * closes it sooner. `alertKey` names the reveal (match and round).
 */
export function RareThreatAlert({ alertKey, rarity, name }: { alertKey: string; rarity: ThreatRarity | null | undefined; name: string }) {
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!rarity || alreadyShown(alertKey)) return;
    markShown(alertKey);
    // Shown from an effect: the key comes from the server's state, after the first render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(alertKey);
    try {
      navigator.vibrate?.([120, 60, 120, 60, 260]);
    } catch {
      // Not every browser lets a page vibrate (iPhone Safari does not).
    }
    const timer = window.setTimeout(() => setOpen(null), SHOW_MS);
    return () => window.clearTimeout(timer);
  }, [alertKey, rarity]);

  if (!rarity || open !== alertKey) return null;
  return (
    <button
      type="button"
      onClick={() => setOpen(null)}
      aria-label={`${rarityTitle(rarity)}: ${name}. Tocca per chiudere.`}
      className="animate-panel-fade fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 overflow-hidden bg-black/90 px-6 text-center"
      style={{ ["--glow-color" as string]: rarity.color }}
    >
      <span
        aria-hidden
        className="animate-rare-burst pointer-events-none absolute left-1/2 top-1/2 -ml-24 -mt-24 h-48 w-48 rounded-full [animation-iteration-count:3]"
        style={{ background: `${rarity.color}66` }}
      />
      <svg viewBox="0 0 200 40" aria-hidden className="animate-seismograph relative h-10 w-64" style={{ color: rarity.color }}>
        <path
          d="M0 20 H40 L48 4 L56 36 L64 2 L72 38 L80 8 L88 32 L96 0 L104 40 L112 6 L120 30 L128 14 L136 26 L144 20 H200"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      </svg>
      <p className="relative font-display text-2xl uppercase leading-7 text-foreground">Il sismografo è fuori scala</p>
      <p
        className="animate-rare-title text-sfx relative font-display text-4xl uppercase leading-10"
        style={{ color: rarity.color }}
      >
        {rarityTitle(rarity)}
      </p>
      <p className="relative font-display text-3xl uppercase leading-8 text-foreground">{name}</p>
      <p className="relative text-sm font-bold text-muted">{oddsText(rarity.one_in)}</p>
    </button>
  );
}
