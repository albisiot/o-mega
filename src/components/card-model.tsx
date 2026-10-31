"use client";

import { useEffect, useRef, useState } from "react";
import { withBasePath } from "@/lib/base-path";

/** Cards that have a 3D model in public/models. */
const CARD_MODELS = new Set(["P001", "P030", "P060"]);
const PRELOAD_DELAY_MS = 600;

/** The button that opens a card's 3D model. Purely decorative: other cards show nothing. */
export function CardModelButton({ code, name }: { code: string; name: string }) {
  const sheet = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const hasModel = CARD_MODELS.has(code);

  // Starts the download as soon as the page is quiet, so that the button feels instant.
  useEffect(() => {
    if (!hasModel) return;
    const timer = setTimeout(() => {
      void import("@/lib/card-model").catch(() => {});
      void fetch(withBasePath(`/models/${code}.glb`)).catch(() => {});
    }, PRELOAD_DELAY_MS);
    return () => clearTimeout(timer);
  }, [code, hasModel]);

  if (!hasModel) return null;
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => {
          setOpen(true);
          sheet.current?.showModal();
        }}
        className="btn btn-primary w-full max-w-sm"
      >
        Guarda in 3D
      </button>
      <dialog
        ref={sheet}
        aria-label={`${name} in 3D`}
        onClose={() => setOpen(false)}
        // The sheet's content fills it: a click on the dialog itself is on the backdrop.
        onClick={(event) => {
          if (event.target === sheet.current) sheet.current.close();
        }}
        className="m-0 mt-auto w-full max-w-none border-0 border-t-[3px] border-foreground bg-panel p-0 text-foreground backdrop:bg-black/70"
      >
        <div className="flex flex-col gap-2 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="min-w-0 truncate font-display text-2xl uppercase text-comic-yellow">{name}</h2>
            <button type="button" onClick={() => sheet.current?.close()} className="btn btn-ghost">
              Chiudi
            </button>
          </div>
          {open && <ModelStage code={code} />}
        </div>
      </dialog>
    </>
  );
}

function ModelStage({ code }: { code: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let unmount: (() => void) | undefined;
    // Three.js and the model are downloaded only when the player asks for them.
    import("@/lib/card-model")
      .then(({ mountCardModel }) => {
        if (cancelled) return;
        unmount = mountCardModel(
          canvas,
          withBasePath(`/models/${code}.glb`),
          () => setStatus("ready"),
          () => setStatus("failed"),
        );
      })
      .catch((cause: unknown) => {
        console.error("Card model failed", cause);
        setStatus("failed");
      });
    return () => {
      cancelled = true;
      unmount?.();
    };
  }, [code]);

  return (
    <div className="relative">
      <canvas ref={canvasRef} aria-hidden className="block h-[62svh] w-full cursor-grab touch-pan-y" />
      {status !== "ready" && (
        <p
          className={`absolute inset-0 flex items-center justify-center text-sm font-semibold ${
            status === "failed" ? "text-comic-magenta" : "text-muted"
          }`}
        >
          {status === "failed" ? "Modello non disponibile." : "Caricamento…"}
        </p>
      )}
      <p className="text-center text-xs font-semibold text-muted">Trascina per girarlo</p>
    </div>
  );
}
