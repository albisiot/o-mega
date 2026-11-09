"use client";

import { useRef, useState } from "react";
import { ArtMotion } from "@/components/art-motion";
import { fullArtUrl } from "@/lib/art";
import { withBasePath } from "@/lib/base-path";

/** A button that opens the whole vertical drawing of a card, full screen. */
export function ArtViewerButton({
  artUrl,
  name,
  label = "Guarda il disegno",
  className = "w-full max-w-sm",
}: {
  artUrl: string;
  name: string;
  label?: string;
  /** Sizes the button where it sits. */
  className?: string;
}) {
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
        className={`btn btn-outline ${className}`}
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
            <div className="min-h-0 flex-1 pb-[env(safe-area-inset-bottom)]">
              <div className="relative h-full">
                {/* Plain <img>: the static export has no image optimization. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`Disegno di ${name}`}
                  onError={() => setFallback(true)}
                  className="h-full w-full object-contain"
                />
                {/* An animated drawing plays its loop over the still one. */}
                <ArtMotion artUrl={artUrl} className="absolute inset-0 h-full w-full object-contain" />
              </div>
            </div>
          )}
        </div>
      </dialog>
    </>
  );
}
