"use client";

import { useState, type SyntheticEvent } from "react";
import { createPortal } from "react-dom";

// The page behind (a comic page, a long-pressable tile) must not see these taps: a tap on the
// «i» or in its balloon neither turns the page nor opens a card. React events bubble through
// the portal to the page, so every handler stops them.
const stop = (event: SyntheticEvent) => event.stopPropagation();

/**
 * A small «i» on the box where a round ended on equal totals: a tap tells what settled it
 * (SPEC §5.6). The balloon closes with its X or a tap anywhere else. Show it only once the
 * round's outcome is on screen, never before.
 */
export function TieInfo({ text, className = "" }: { text: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          stop(event);
          setOpen(true);
        }}
        onPointerDown={stop}
        aria-label="Perché il pareggio è finito così"
        aria-haspopup="dialog"
        className={`grid h-9 w-9 place-items-center ${className}`}
      >
        <span
          aria-hidden
          className="grid h-5 w-5 place-items-center rounded-full border-2 border-black bg-comic-yellow font-display text-[13px] leading-none text-black shadow-[1px_1px_0_#000]"
        >
          i
        </span>
      </button>
      {open &&
        createPortal(
          <div onClick={stop} onPointerDown={stop} className="fixed inset-0 z-50">
            <button type="button" aria-label="Chiudi" onClick={() => setOpen(false)} className="absolute inset-0 cursor-default bg-black/50" />
            <div
              role="dialog"
              aria-label="Pareggio"
              className="absolute inset-x-4 top-1/3 mx-auto flex max-w-sm items-start gap-2 border-[3px] border-black bg-foreground py-2 pl-3 pr-1 text-black shadow-[4px_4px_0_#000]"
            >
              <p className="min-w-0 flex-1 py-1.5 text-sm font-semibold leading-5">
                <span className="block font-display text-lg uppercase leading-5">Pareggio</span>
                {text}
              </p>
              <button
                type="button"
                aria-label="Chiudi"
                onClick={() => setOpen(false)}
                className="grid h-11 w-11 shrink-0 place-items-center"
              >
                <svg viewBox="0 0 14 14" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth={2.6} aria-hidden>
                  <path d="M2 2l10 10M12 2 2 12" />
                </svg>
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
