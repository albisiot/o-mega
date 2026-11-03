"use client";

import { useState } from "react";

/** A small "i" that shows a note on tap, for text that would cost a line on a full screen. */
export function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((shown) => !shown)}
        aria-expanded={open}
        aria-label={text}
        className="-my-2.5 -mr-2.5 flex h-11 w-11 items-center justify-center"
      >
        <span
          aria-hidden
          className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-faint text-xs font-extrabold text-faint"
        >
          i
        </span>
      </button>
      {open && (
        <span
          role="status"
          className="absolute bottom-full right-0 z-30 mb-1 w-56 bg-foreground px-3 py-2 text-xs font-semibold text-black shadow-[4px_4px_0_#000]"
        >
          {text}
        </span>
      )}
    </span>
  );
}
