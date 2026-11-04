"use client";

import { useEffect, useRef, useState } from "react";
import { withBasePath } from "@/lib/base-path";

/** Cards that have a 3D model in public/models. */
const CARD_MODELS = new Set(["P001", "P030", "P060"]);

/** Three.js and the viewer: downloaded only by players who ask for a model. */
const loadViewer = () => import("@/lib/card-model");

/** The model's bytes, reporting the share received so far when the size is known. */
async function downloadModel(url: string, signal: AbortSignal, onProgress: (share: number) => void): Promise<ArrayBuffer> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Model download failed: ${response.status}`);
  const total = Number(response.headers.get("content-length"));
  if (!response.body || !total) return response.arrayBuffer();
  const reader = response.body.getReader();
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    onProgress(Math.min(1, received / total));
  }
  return new Blob(chunks).arrayBuffer();
}

/** The button that opens a card's 3D model. Purely decorative: other cards show nothing. */
export function CardModelButton({ code, name }: { code: string; name: string }) {
  const sheet = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  if (!CARD_MODELS.has(code)) return null;
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        // The press comes a moment before the tap: enough to start fetching the viewer's code.
        onPointerDown={() => void loadViewer().catch(() => {})}
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
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let unmount: (() => void) | undefined;
    const download = new AbortController();
    // The model and the viewer download side by side, once the player has asked for them.
    Promise.all([
      loadViewer(),
      downloadModel(withBasePath(`/models/${code}.glb`), download.signal, (share) => {
        if (!cancelled) setProgress(share);
      }),
    ])
      .then(([{ mountCardModel }, model]) => {
        if (cancelled) return;
        unmount = mountCardModel(
          canvas,
          model,
          () => setStatus("ready"),
          () => setStatus("failed"),
        );
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        console.error("Card model failed", cause);
        setStatus("failed");
      });
    return () => {
      cancelled = true;
      download.abort();
      unmount?.();
    };
  }, [code]);

  return (
    <div className="relative">
      <canvas ref={canvasRef} aria-hidden className="block h-[62svh] w-full cursor-grab touch-pan-y" />
      {status === "failed" && (
        <p className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-comic-magenta">
          Modello non disponibile.
        </p>
      )}
      {status === "loading" && (
        <div role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-10">
          <p className="text-sm font-semibold text-muted">Caricamento del modello…</p>
          <div className="h-1 w-full max-w-48 bg-panel-raised" aria-hidden>
            <div className="h-full bg-comic-magenta transition-[width] duration-200" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
      )}
      <p className="text-center text-xs font-semibold text-muted">Trascina per girarlo</p>
    </div>
  );
}
