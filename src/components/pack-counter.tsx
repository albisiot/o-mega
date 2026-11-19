"use client";

import { useEffect, useState } from "react";

/** At least this many digits, like a mechanical counter: 0142. */
const MIN_DIGITS = 4;
/** How long the «+1» stays after the digits roll. */
const GAIN_MS = 1800;

// Outlives the counter: packs opened elsewhere roll on at the return to the shop.
let lastShown: number | null = null;

/**
 * The packs the player has opened, as a counter whose digits roll (see .pack-counter-strip in
 * globals.css). It opens on the number shown last time and rolls to `count` when it is higher.
 */
export function PackCounter({ count }: { count: number | null }) {
  const [shown, setShown] = useState<number | null>(() => lastShown ?? count);
  const [gain, setGain] = useState<number | null>(null);

  useEffect(() => {
    if (count === null) return;
    // A frame later, so the old digits are on screen before they roll.
    let timer = 0;
    const frame = requestAnimationFrame(() => {
      const before = lastShown;
      lastShown = count;
      setShown(count);
      if (before !== null && count > before) {
        setGain(count - before);
        timer = window.setTimeout(() => setGain(null), GAIN_MS);
      }
    });
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [count]);

  const digits = shown === null ? Array<null>(MIN_DIGITS).fill(null) : [...String(shown).padStart(MIN_DIGITS, "0")].map(Number);

  return (
    <div className="relative flex items-center gap-1.5">
      <span aria-hidden className="text-[10px] font-extrabold uppercase leading-[11px] text-muted">
        Pacchetti
        <br />
        aperti
      </span>
      <span className="sr-only">{shown === null ? "Pacchetti aperti: …" : `Pacchetti aperti: ${shown}`}</span>
      <span aria-hidden className="flex -skew-x-8 gap-0.5 border-2 border-black bg-black p-0.5">
        {digits.map((digit, index) => (
          // Keyed from the right: the units stay the units when the number grows a digit.
          <Digit key={digits.length - index} value={digit} />
        ))}
      </span>
      {gain !== null && (
        <span aria-hidden className="animate-new-pop absolute -right-3 -top-2.5 bg-comic-magenta px-1 font-display text-sm leading-[18px] text-black">
          +{gain}
        </span>
      )}
    </div>
  );
}

/** 0 to 9 twice: a wheel going from 8 to 1 rolls on through 9 and 0, never backwards. */
const WHEEL = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/** One wheel of the counter: the digits in a column, moved to show `value`. */
function Digit({ value }: { value: number | null }) {
  // `at`: the place in WHEEL on show. A smaller digit is reached in the second run of ten, then
  // the wheel jumps, unseen, to the same digit in the first.
  const [wheel, setWheel] = useState({ value, at: value ?? 0, rolling: false });
  if (value !== null && value !== wheel.value) {
    const from = wheel.at % 10;
    setWheel({ value, at: value >= from ? value : value + 10, rolling: wheel.value !== null });
  }

  return (
    <span className="relative block h-[22px] w-[15px] overflow-hidden bg-panel-raised">
      {value === null ? (
        <span className="flex h-full items-center justify-center font-display text-lg leading-none text-faint">–</span>
      ) : (
        <span
          className={`flex flex-col ${wheel.rolling ? "pack-counter-strip" : ""}`}
          style={{ transform: `translateY(-${wheel.at * 5}%)` }}
          onTransitionEnd={() => setWheel((current) => ({ ...current, at: current.at % 10, rolling: false }))}
        >
          {WHEEL.map((n, index) => (
            <span key={index} className="flex h-[22px] items-center justify-center font-display text-lg leading-none text-comic-yellow">
              {n}
            </span>
          ))}
        </span>
      )}
    </span>
  );
}
