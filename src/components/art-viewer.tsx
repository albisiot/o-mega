"use client";

import { useRef, useState } from "react";
import { fullArtUrl } from "@/lib/art";
import { withBasePath } from "@/lib/base-path";

/** A button that opens the whole vertical drawing of a card, full screen. */
export function ArtViewerButton({ artUrl, name, label = "Guarda il disegno" }: { artUrl: string; name: string; label?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  // Older drawings have no larger copy; one that fails to load also falls back to the card image.
  const full = fullArtUrl(artUrl);
  const [fallback, setFallback] = useState(false);
  const src = withBasePath(fallback || !full ? artUrl : full);

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => {
          setOpen(true);
          dialog.current?.showModal();
        }}
        className="btn btn-outline w-full max-w-sm"
      >
        {label}
      </button>
      <dialog
        ref={dialog}
        aria-label={`Disegno di ${name}`}
        onClose={() => setOpen(false)}
        // Any tap closes it: there is nothing to interact with but the picture.
        onClick={() => dialog.current?.close()}
        className="m-0 h-dvh max-h-none w-full max-w-none border-0 bg-black p-0 text-foreground backdrop:bg-black"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-[calc(env(safe-area-inset-top)+8px)]">
            <p className="min-w-0 truncate font-display text-2xl uppercase">{name}</p>
            <button type="button" onClick={() => dialog.current?.close()} className="btn btn-ghost shrink-0">
              Chiudi
            </button>
          </div>
          {open && (
            // Plain <img>: the static export has no image optimization.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={`Disegno di ${name}`}
              onError={() => setFallback(true)}
              className="min-h-0 w-full flex-1 object-contain pb-[env(safe-area-inset-bottom)]"
            />
          )}
        </div>
      </dialog>
    </>
  );
}
