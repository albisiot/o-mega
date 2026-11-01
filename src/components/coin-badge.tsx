"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const COUNT_MS = 700;

// Outlives the badge: coins earned elsewhere count up on the return to the home.
let lastShown: number | null = null;

/** The balance on screen, running up or down to `target` when it changes. */
function useCountingBalance(target: number | null) {
  const [shown, setShown] = useState(() => lastShown ?? target);

  useEffect(() => {
    if (target === null) return;
    const from = lastShown ?? target;
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : COUNT_MS;
    let start: number | null = null;
    let frame = requestAnimationFrame(function step(time) {
      start ??= time;
      const progress = duration > 0 ? Math.min((time - start) / duration, 1) : 1;
      lastShown = Math.round(from + (target - from) * (1 - (1 - progress) ** 3));
      setShown(lastShown);
      if (progress < 1) frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return shown;
}

/** Coin balance chip; links to the shop. */
export function CoinBadge({ balance }: { balance: number | null }) {
  const shown = useCountingBalance(balance);
  const counting = balance !== null && shown !== balance;

  return (
    <Link
      href="/negozio"
      aria-label={`Monete: ${balance ?? "…"}. Apri il negozio`}
      className="flex min-h-11 items-center"
    >
      <span
        className={`flex h-9 -skew-x-8 items-center gap-1.5 border-2 border-comic-yellow bg-black px-2.5 text-sm font-extrabold tabular-nums text-comic-yellow ${
          counting ? "animate-coin-bump" : ""
        }`}
      >
        <span
          aria-hidden
          className="flex h-4 w-4 items-center justify-center rounded-full bg-comic-yellow text-[10px] font-black text-black"
        >
          Ω
        </span>
        {shown ?? "…"}
      </span>
    </Link>
  );
}
