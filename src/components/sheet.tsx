"use client";

import type { ReactNode, RefObject } from "react";

/**
 * A dialog that rises from the bottom over the dimmed page, for what a screen that fits the
 * phone keeps out of sight. A tap beside it or on "Chiudi" closes it; long content scrolls
 * inside, under its title. Open it with `sheetRef.current?.showModal()`.
 */
export function Sheet({
  sheetRef,
  title,
  onClose,
  children,
}: {
  sheetRef: RefObject<HTMLDialogElement | null>;
  title: string;
  onClose?: () => void;
  children: ReactNode;
}) {
  return (
    <dialog
      ref={sheetRef}
      aria-label={title}
      onClose={onClose}
      // The sheet's content fills it: a click on the dialog itself is on the backdrop.
      onClick={(event) => {
        if (event.target === sheetRef.current) sheetRef.current.close();
      }}
      className="m-0 mt-auto w-full max-w-none overflow-y-auto overflow-x-hidden overscroll-contain border-0 border-t-[3px] border-foreground bg-background p-0 text-foreground backdrop:bg-black/70"
    >
      <div className="sticky top-0 z-10 bg-background">
        <div className="mx-auto flex max-w-sm items-center justify-between gap-3 px-4 pb-2 pt-3">
          <h2 className="min-w-0 truncate font-display text-2xl uppercase text-comic-yellow">{title}</h2>
          <button type="button" onClick={() => sheetRef.current?.close()} className="btn btn-ghost shrink-0">
            Chiudi
          </button>
        </div>
      </div>
      <div className="mx-auto flex max-w-sm flex-col gap-3 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-1">{children}</div>
    </dialog>
  );
}
