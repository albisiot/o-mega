"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { ArtMotion } from "@/components/art-motion";
import { CardArtEffects } from "@/components/card-effects";
import { FrameShell, ringFrame } from "@/components/card-frames";
import { fullArtUrl } from "@/lib/art";
import { withBasePath } from "@/lib/base-path";
import type { CardCosmetics } from "@/lib/cosmetics";

/** The character a drawing belongs to: its frame's colors, the Gradata's label, the signature. */
type ArtCard = { name: string; code?: string; faction: string; rarity: { name: string; rank: number; color: string } };

/** A button that opens the whole vertical drawing of a card, full screen. */
export function ArtViewerButton({
  artUrl,
  name,
  label = "Guarda il disegno",
  className = "w-full max-w-sm",
  card,
  cosmetics = null,
}: {
  artUrl: string;
  name: string;
  label?: string;
  /** Sizes the button where it sits. */
  className?: string;
  /** With `cosmetics`: the character, so the drawing opens in its frame and effect. */
  card?: ArtCard;
  /** The frame and the effect the owner applied to the character and left visible (SPEC §4.8). */
  cosmetics?: CardCosmetics | null;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  // Older drawings have no larger copy; one that fails to load also falls back to the card image.
  const full = fullArtUrl(artUrl);
  const [fallback, setFallback] = useState(false);
  const src = withBasePath(fallback || !full ? artUrl : full);
  const dressable = Boolean(card && (cosmetics?.frame || cosmetics?.effect));
  // It opens dressed; the switch shows the bare drawing until the viewer closes.
  const [plain, setPlain] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => {
          setPlain(false);
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
        // Any tap closes it: there is nothing to interact with but the picture (and the switch).
        onClick={() => dialog.current?.close()}
        className="m-0 h-dvh max-h-none w-full max-w-none border-0 bg-black p-0 text-foreground backdrop:bg-black"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3 px-4 pb-2 pt-[calc(env(safe-area-inset-top)+8px)]">
            <p className="min-w-0 flex-1 truncate font-display text-2xl uppercase">{name}</p>
            {dressable && (
              <button
                type="button"
                role="switch"
                aria-checked={plain}
                aria-label="Disegno pulito, senza cornice né effetto"
                onClick={(event) => {
                  event.stopPropagation();
                  setPlain(!plain);
                }}
                className="flex min-h-11 shrink-0 items-center gap-1.5 text-sm font-bold"
              >
                <span aria-hidden className={`relative h-5 w-9 shrink-0 rounded-full border-2 border-black ${plain ? "bg-comic-cyan" : "bg-panel-raised"}`}>
                  <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-black transition-[left] ${plain ? "left-[18px]" : "left-0.5"}`} />
                </span>
                Pulito
              </button>
            )}
            <button type="button" onClick={() => dialog.current?.close()} className="btn btn-ghost shrink-0">
              Chiudi
            </button>
          </div>
          {open && (
            <div className="min-h-0 flex-1 pb-[env(safe-area-inset-bottom)]">
              {dressable && card && cosmetics && !plain ? (
                <DressedArt
                  src={src}
                  artUrl={artUrl}
                  alt={`Disegno di ${name}`}
                  card={card}
                  cosmetics={cosmetics}
                  onError={() => setFallback(true)}
                />
              ) : (
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
              )}
            </div>
          )}
        </div>
      </dialog>
    </>
  );
}

/** Width the dressed drawing is laid out at, the card's: the frames are drawn for it. */
const LAYOUT_WIDTH = 300;
/** Room left around a frame, so its shadow and glow are not cut by the screen's edge. */
const FRAME_MARGIN = 14;

/**
 * The whole drawing in the character's frame and under its effect, as large as its place allows.
 * It is laid out at the card's width, so every frame keeps the look it has on the card, then
 * scaled up to fit: the larger copy of the drawing keeps it sharp.
 */
export function DressedArt({
  src,
  artUrl,
  alt,
  card,
  cosmetics,
  onError,
}: {
  src: string;
  artUrl: string;
  alt: string;
  card: ArtCard;
  cosmetics: CardCosmetics;
  onError?: () => void;
}) {
  const area = useRef<HTMLDivElement>(null);
  const block = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  // Drawings are 3:4; an older one of other proportions keeps its own once it has loaded.
  const [ratio, setRatio] = useState(3 / 4);
  const margin = cosmetics.frame ? FRAME_MARGIN : 0;

  // Sizes are read without the scale (offsetWidth ignores transforms), before the first paint.
  useLayoutEffect(() => {
    const areaElement = area.current;
    const blockElement = block.current;
    if (!areaElement || !blockElement) return;
    const fit = () => {
      const width = blockElement.offsetWidth;
      const height = blockElement.offsetHeight;
      if (!width || !height) return;
      setScale(Math.min((areaElement.clientWidth - 2 * margin) / width, (areaElement.clientHeight - 2 * margin) / height));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(areaElement);
    observer.observe(blockElement);
    return () => observer.disconnect();
  }, [margin]);

  const art = (
    <div className="@container relative w-full overflow-hidden" style={{ aspectRatio: ratio }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onLoad={(event) => {
          const { naturalWidth, naturalHeight } = event.currentTarget;
          if (naturalWidth && naturalHeight) setRatio(naturalWidth / naturalHeight);
        }}
        onError={onError}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <ArtMotion artUrl={artUrl} className="absolute inset-0 h-full w-full object-cover" />
      <CardArtEffects
        effects={cosmetics.effect ? [cosmetics.effect] : []}
        artUrl={artUrl}
        signature={card.name}
        serial={cosmetics.serial}
      />
    </div>
  );

  // In a frame, the drawing keeps the rarity's border inside it, as on the card.
  let dressed = art;
  if (cosmetics.frame) {
    const ring = ringFrame(card.rarity, cosmetics.frame, "lg");
    dressed = (
      <FrameShell frame={cosmetics.frame} size="lg" card={card}>
        <div className={`card-frame card-frame-lg w-[300px] rounded-xl ${ring.className}`} style={ring.style}>
          <div className="card-face overflow-hidden rounded-md">{art}</div>
        </div>
      </FrameShell>
    );
  }

  const style: CSSProperties = {
    width: LAYOUT_WIDTH,
    transform: `translate(-50%, -50%) scale(${scale})`,
    visibility: scale ? "visible" : "hidden",
  };
  return (
    <div ref={area} className="relative h-full overflow-hidden">
      <div ref={block} className="absolute left-1/2 top-1/2" style={style}>
        {dressed}
      </div>
    </div>
  );
}
