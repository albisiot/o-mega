"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { CardView, type CardData } from "@/components/card-view";
import { HoldToConfirmButton } from "@/components/hold-to-confirm-button";
import { useBannerHold } from "@/lib/banner-hold";
import { fetchAbilities, seenAbilities, type AbilityInfo } from "@/lib/catalog";
import { playSound } from "@/lib/comic-sound";
import { lookWith } from "@/lib/cosmetic-preview";
import { COSMETIC_INFO, applyCosmetic, type CardCosmetics, type CosmeticKind, type EffectCode, type FrameCode } from "@/lib/cosmetics";
import { describeServerError } from "@/lib/errors";
import { isFoil } from "@/lib/rarity-theme";
import { SceneRun, between, boxIn, clamp01, flyAlong, prefersReducedMotion, settled } from "@/lib/scene-run";
import { keepCosmetics } from "@/lib/use-cosmetics";

// Two short scenes for the Schegge (SPEC §4.8), shown only after the server answered and with
// its numbers: a duplicate variant that turns to dust and gathers into a crystal («Polvere di
// cristallo»), and the Schegge spent that become a seal of crystal, which breaks open on the
// frame or effect bought, worn by one of the player's characters («Sigillo di cristallo»).
// A tap jumps to the end; with reduced motion the end shows at once.

const MAGENTA = "#ff2e6c";

/** The scenes' card: the large CardView, scaled to leave room around it on a phone. */
const CARD_ZOOM = "[zoom:0.6] short:[zoom:0.5]";

function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Not every browser lets a page vibrate (iPhone Safari does not).
  }
}

function rgbOf(color: string): [number, number, number] {
  const hex = /^#([0-9a-f]{6})$/i.exec(color.trim())?.[1];
  if (!hex) return [255, 248, 231];
  const n = parseInt(hex, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** The 12 abilities the large card shows; `ready` once they arrived or failed. */
function useAbilities(): { abilities: AbilityInfo[] | null; ready: boolean } {
  const [state, setState] = useState(() => {
    const seen = seenAbilities();
    return { abilities: seen ?? null, ready: Boolean(seen) };
  });
  useEffect(() => {
    if (state.ready) return;
    let live = true;
    fetchAbilities().then(
      (abilities) => live && setState({ abilities, ready: true }),
      () => live && setState({ abilities: null, ready: true }),
    );
    return () => {
      live = false;
    };
  }, [state.ready]);
  return state;
}

/** A full-screen modal over everything, the sheets included (the top layer). Escape closes it. */
function SceneDialog({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  // No in-app banner over the scene (SPEC §11.1).
  useBannerHold(true);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={label}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="rays-dark m-0 h-dvh max-h-none w-full max-w-none overflow-hidden border-0 p-0 text-foreground backdrop:bg-black"
    >
      {children}
    </dialog>
  );
}

function ShardCounter({ value, counterRef }: { value: number; counterRef: RefObject<HTMLParagraphElement | null> }) {
  return (
    <p
      ref={counterRef}
      className="absolute right-3 top-[calc(env(safe-area-inset-top)+12px)] z-20 flex -skew-x-8 items-center gap-1.5 bg-comic-magenta px-2.5 font-display text-3xl tabular-nums text-black"
    >
      <span aria-hidden className="sx-counter-icon" />
      <span className="sr-only">Schegge: </span>
      {value}
    </p>
  );
}

function bump(run: SceneRun, node: Element | null) {
  if (node) run.animate(node, [{ scale: 1.35 }, { scale: 1 }], { duration: 240, easing: "cubic-bezier(.2,1.6,.4,1)", fill: "none" });
}

function crystal(run: SceneRun, stage: HTMLElement, color: string, foil: boolean, size: number): HTMLSpanElement {
  const node = run.own(document.createElement("span"));
  node.className = `sx-crystal${foil ? " sx-foil" : ""}`;
  node.style.setProperty("--sx-color", color);
  node.style.width = `${size}px`;
  node.style.height = `${Math.round(size * 1.35)}px`;
  node.append(document.createElement("i"));
  stage.append(node);
  return node;
}

function bursts(run: SceneRun, stage: HTMLElement, x: number, y: number, color: string) {
  for (let i = 0; i < 2; i++) {
    const ring = run.own(document.createElement("span"));
    ring.className = "sx-burst";
    Object.assign(ring.style, { left: `${x}px`, top: `${y}px`, background: color });
    stage.append(ring);
    run.animate(ring, [{ transform: "scale(.2)", opacity: 0.85 }, { transform: "scale(4)", opacity: 0 }], {
      delay: i * 220,
      duration: 700,
      easing: "ease-out",
    });
  }
}

/** A blade of light across a box of the scene, with a flash of the element under it. */
function sweep(run: SceneRun, stage: HTMLElement, target: HTMLElement, delay: number) {
  const box = boxIn(target, stage);
  const frame = run.own(document.createElement("span"));
  frame.className = "sx-sweep";
  Object.assign(frame.style, { left: `${box.left - 6}px`, top: `${box.top - 6}px`, width: `${box.width + 12}px`, height: `${box.height + 12}px` });
  const blade = document.createElement("i");
  frame.append(blade);
  stage.append(frame);
  run.animate(blade, [{ transform: "translateX(-110%)" }, { transform: "translateX(260%)" }], { delay, duration: 380, easing: "ease-in-out" });
  run.animate(target, [{ filter: "brightness(1)" }, { filter: "brightness(1.8)", offset: 0.3 }, { filter: "brightness(1)" }], {
    delay,
    duration: 420,
    fill: "none",
  });
}

/* ---------------------------------------------------------------------------------------------
 * Polvere di cristallo: the copies broken dissolve from the top into the pixels of their drawing,
 * which take the rarity's color and gather into one crystal; the crystal flies into the counter.
 * ------------------------------------------------------------------------------------------- */

export type ShardBreakScene = {
  /** The variant broken, as its card shows it (the variant's drawing and name). */
  card: CardData;
  copies: number;
  /** Schegge the server gave, and the balance it returned. */
  shards: number;
  balance: number;
};

const DUST = { start: 250, span: 600, gather: 900, born: 1200, fly: 1500, arrive: 1880 };

export function ShardDust({ scene, onClose }: { scene: ShardBreakScene; onClose: () => void }) {
  const { abilities, ready } = useAbilities();
  const [reduced] = useState(prefersReducedMotion);
  const [done, setDone] = useState(reduced);
  const [count, setCount] = useState(reduced ? scene.balance : scene.balance - scene.shards);
  const stage = useRef<HTMLDivElement>(null);
  const slot = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const counter = useRef<HTMLParagraphElement>(null);
  const runRef = useRef<SceneRun | null>(null);

  useEffect(() => {
    if (reduced || !ready || !stage.current || !slot.current || !canvas.current) return;
    const els = { stage: stage.current, slot: slot.current, canvas: canvas.current, counter: counter.current };
    const run = new SceneRun();
    runRef.current = run;
    // The drawing must be there before it turns to dust.
    void settled(els.slot.querySelector("[data-front] img")).then(() => {
      if (run.stopped) return;
      run.start();
      playDust(run, els, scene, {
        arrived: () => {
          setCount(scene.balance);
          setDone(true);
        },
      });
    });
    return () => run.stop();
  }, [reduced, ready, scene]);

  function tap() {
    if (done) return onClose();
    runRef.current?.stop();
    setCount(scene.balance);
    setDone(true);
  }

  const name = scene.card.variant ? `${scene.card.name} ★ ${scene.card.variant.name}` : scene.card.name;
  const copies = Array.from({ length: Math.min(scene.copies, 3) }, (_, i) => i).reverse();
  return (
    <SceneDialog label={`Rotta in Schegge: ${name}`} onClose={onClose}>
      <div ref={stage} className="relative h-full w-full cursor-pointer select-none" onClick={tap}>
        <ShardCounter value={count} counterRef={counter} />
        {!done && (
          <div ref={slot} className="absolute left-1/2 top-[48%] -translate-x-1/2 -translate-y-1/2">
            {copies.map((i) => (
              <div
                key={i}
                data-front={i === 0 ? "" : undefined}
                className={`${i === 0 ? "relative" : "absolute inset-0"} ${CARD_ZOOM}`}
                style={{ zIndex: 3 - i, transform: i ? `translate(${i * 16}px,${-i * 16}px) rotate(${i * 3}deg)` : undefined }}
              >
                <CardView card={scene.card} abilities={abilities} priority />
              </div>
            ))}
            {scene.copies > 1 && (
              <span className="absolute -bottom-3 -right-3 z-10 rotate-[-6deg] border-2 border-black bg-comic-yellow px-2 font-display text-2xl text-black">
                ×{scene.copies}
              </span>
            )}
          </div>
        )}
        {!done && <canvas ref={canvas} aria-hidden className="pointer-events-none absolute inset-0 z-10 h-full w-full" />}
        {done && (
          <>
            <div role="status" className="absolute left-1/2 top-[46%] z-20 flex w-[300px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2 text-center">
              <p className="animate-sx-stamp">
                <span className="block -rotate-3 -skew-x-8 border-[3px] border-black bg-comic-yellow px-4 pb-2 pt-1 font-display text-5xl uppercase text-black shadow-[5px_5px_0_var(--comic-magenta)]">
                  <span className="text-comic-magenta [-webkit-text-stroke:1.5px_#000]">+{scene.shards}</span>{" "}
                  {scene.shards === 1 ? "Scheggia" : "Schegge"}
                </span>
              </p>
              <p className="bg-black px-2.5 py-1 text-sm font-bold">
                {scene.copies === 1 ? "Rotta 1 copia" : `Rotte ${scene.copies} copie`} di {name}
                <br />
                Ne resta 1 · ora hai {scene.balance} Schegge
              </p>
            </div>
            <p className="absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+24px)] text-center text-sm font-bold">
              Tocca per continuare
            </p>
          </>
        )}
      </div>
    </SceneDialog>
  );
}

function playDust(
  run: SceneRun,
  els: { stage: HTMLElement; slot: HTMLElement; canvas: HTMLCanvasElement; counter: HTMLElement | null },
  scene: ShardBreakScene,
  on: { arrived: () => void },
) {
  const { stage, slot, canvas } = els;
  const rarity = scene.card.rarity;
  const color = rarity.color;
  const tint = rgbOf(color);
  const front = slot.querySelector<HTMLElement>("[data-front]") ?? slot;
  const card = boxIn(front, stage);

  // The front card, drawn small on a canvas of its own: its frame, its panel, its drawing.
  const width = Math.max(1, Math.round(card.width));
  const height = Math.max(1, Math.round(card.height));
  const sample = document.createElement("canvas");
  sample.width = width;
  sample.height = height;
  const pen = sample.getContext("2d");
  let pixels: Uint8ClampedArray | null = null;
  if (pen) {
    pen.fillStyle = color;
    pen.fillRect(0, 0, width, height);
    pen.fillStyle = "#23232b";
    pen.fillRect(5, 5, width - 10, height - 10);
    const art = front.querySelector("img");
    if (art?.complete && art.naturalWidth) {
      const box = boxIn(art, stage);
      try {
        pen.drawImage(art, box.left - card.left, box.top - card.top, box.width, box.height);
      } catch {
        // Without the drawing the dust keeps the card's colors.
      }
    }
    try {
      pixels = pen.getImageData(0, 0, width, height).data;
    } catch {
      pixels = null;
    }
  }

  const STEP = 6;
  type Mote = { x0: number; y0: number; c: [number, number, number]; t0: number; vx: number; vy: number; ph: number; d: number; lx?: number; ly?: number; sx?: number; sy?: number };
  const motes: Mote[] = [];
  for (let y = 0; y < height; y += STEP) {
    for (let x = 0; x < width; x += STEP) {
      const i = (y * width + x) * 4;
      motes.push({
        x0: card.left + x,
        y0: card.top + y,
        c: pixels ? [pixels[i], pixels[i + 1], pixels[i + 2]] : tint,
        t0: DUST.start + (y / height) * DUST.span + between(0, 50),
        vx: between(-0.07, 0.07),
        vy: -between(0.03, 0.12),
        ph: between(0, 6.28),
        d: between(0, 140),
      });
    }
  }
  const centre = { x: card.x, y: card.y };

  const scale = Math.min(2, window.devicePixelRatio || 1);
  const sceneWidth = stage.clientWidth;
  const sceneHeight = stage.clientHeight;
  canvas.width = Math.round(sceneWidth * scale);
  canvas.height = Math.round(sceneHeight * scale);
  const ink = canvas.getContext("2d");

  // The card lights up, then a line of light runs down it and leaves dust behind.
  run.animate(slot, [{ filter: "brightness(1)" }, { filter: "brightness(1.35) saturate(1.3)" }], { duration: DUST.start, easing: "ease-in" });
  run.animate(slot, [{ clipPath: "inset(-60px -60px 0 -60px)" }, { clipPath: "inset(100% -60px 0 -60px)" }], {
    delay: DUST.start,
    duration: DUST.span,
  });
  const scan = run.own(document.createElement("span"));
  scan.className = "sx-scan";
  scan.style.setProperty("--sx-color", color);
  Object.assign(scan.style, { left: `${card.left - 14}px`, top: `${card.top}px`, width: `${card.width + 28}px`, right: "auto" });
  stage.append(scan);
  run.animate(
    scan,
    [
      { transform: "translateY(0)", opacity: 1 },
      { transform: `translateY(${card.height}px)`, opacity: 1, offset: 0.95 },
      { transform: `translateY(${card.height}px)`, opacity: 0 },
    ],
    { delay: DUST.start, duration: DUST.span },
  );
  run.at(DUST.start, () => playSound("dust"));

  if (ink) {
    ink.scale(scale, scale);
    run.loop((t) => {
      ink.clearRect(0, 0, sceneWidth, sceneHeight);
      ink.globalCompositeOperation = "lighter";
      ink.globalAlpha = 0.85;
      for (const m of motes) {
        if (t < m.t0) continue;
        const age = t - m.t0;
        let x: number;
        let y: number;
        let size = 2.8;
        if (t < DUST.gather) {
          x = m.x0 + m.vx * age + Math.sin(age * 0.012 + m.ph) * 4;
          y = m.y0 + m.vy * age;
          m.lx = x;
          m.ly = y;
        } else {
          m.sx ??= m.lx ?? m.x0;
          m.sy ??= m.ly ?? m.y0;
          const k = clamp01((t - DUST.gather - m.d) / 280);
          if (k >= 1) continue;
          const e = k * k * k;
          x = m.sx + (centre.x - m.sx) * e;
          y = m.sy + (centre.y - m.sy) * e;
          size *= 1 - 0.6 * e;
        }
        const mix = clamp01(age / 420);
        ink.fillStyle = `rgb(${(m.c[0] * (1 - mix) + tint[0] * mix) | 0},${(m.c[1] * (1 - mix) + tint[1] * mix) | 0},${(m.c[2] * (1 - mix) + tint[2] * mix) | 0})`;
        ink.fillRect(x, y, size, size);
      }
      if (t > DUST.gather + 440) {
        ink.clearRect(0, 0, sceneWidth, sceneHeight);
        return false;
      }
      return true;
    });
  }

  // The crystal, with what it is worth under it.
  const big = run.own(document.createElement("span"));
  big.className = "absolute z-20";
  Object.assign(big.style, { left: `${centre.x - 23}px`, top: `${centre.y - 31}px`, width: "46px", height: "62px" });
  const gem = crystal(run, big, color, isFoil(rarity), 46);
  gem.classList.add("sx-big");
  const plus = document.createElement("span");
  plus.className = "sx-plus";
  plus.style.setProperty("--sx-color", color);
  plus.textContent = `+${scene.shards}`;
  big.append(plus);
  stage.append(big);
  run.animate(
    big,
    [
      { transform: "scale(0)", opacity: 0 },
      { transform: "scale(1.35)", opacity: 1, offset: 0.6 },
      { transform: "scale(1)", opacity: 1 },
    ],
    { delay: DUST.born, duration: 260, easing: "cubic-bezier(.2,1.4,.4,1)" },
  );
  run.at(DUST.born, () => {
    playSound("reveal");
    vibrate(30);
    if (rarity.rank >= 4) bursts(run, stage, centre.x, centre.y, color);
  });

  // Into the counter.
  run.at(DUST.fly, () => {
    const target = els.counter ? boxIn(els.counter, stage) : { x: sceneWidth - 40, y: 30 };
    plus.remove();
    flyAlong(run, gem, { x: 23, y: 31 }, { x: target.x - centre.x + 23, y: target.y - centre.y + 31 }, 0, DUST.arrive - DUST.fly, {
      to: 0.35,
      spin: 160,
    });
  });
  run.at(DUST.arrive, () => {
    big.remove();
    bump(run, els.counter);
    playSound("up");
    on.arrived();
  });
}

/* ---------------------------------------------------------------------------------------------
 * Sigillo di cristallo: the Schegge spent leave the counter and fuse into a seal; the seal cracks
 * three times and bursts, and a line of light draws the frame around a character of the player's
 * (or a blade of light lays the effect over it). Then «Applica».
 * ------------------------------------------------------------------------------------------- */

export type SealScene = {
  item: { code: FrameCode | EffectCode; kind: CosmeticKind; name: string; serial: number };
  /** Schegge the purchase cost, and the balance the server returned. */
  cost: number;
  balance: number;
  /** The character it is tried on (cosmetic-preview.ts), with the look it has now. */
  preview: { card: CardData & { id: string }; look: CardCosmetics | null } | null;
};

const SEAL = { born: 420, cracks: 560, burst: 900, draw: 1020, lit: 1400, title: 1460, done: 1950 };

export function CosmeticSeal({
  scene,
  onClose,
  onApplied,
}: {
  scene: SealScene;
  onClose: () => void;
  /** Called once the server applied the look to the preview character. */
  onApplied?: (characterName: string) => void;
}) {
  const { abilities, ready } = useAbilities();
  const [reduced] = useState(prefersReducedMotion);
  const [done, setDone] = useState(reduced);
  const [lit, setLit] = useState(reduced);
  const [count, setCount] = useState(reduced ? scene.balance : scene.balance + scene.cost);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const cardBox = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const after = useRef<HTMLDivElement>(null);
  const counter = useRef<HTMLParagraphElement>(null);
  const runRef = useRef<SceneRun | null>(null);
  const { item, preview } = scene;

  useEffect(() => {
    if (reduced || !ready || !stage.current || !cardBox.current || !title.current || !after.current) return;
    const els = { stage: stage.current, card: cardBox.current, title: title.current, after: after.current, counter: counter.current };
    const run = new SceneRun();
    runRef.current = run;
    // Out of sight while the scene gets ready; then its animations hide them until their turn.
    const waiting = [els.title, els.after, els.card];
    const reveal = () => waiting.forEach((node) => node.style.removeProperty("opacity"));
    waiting.forEach((node) => (node.style.opacity = "0"));
    run.onStop(reveal);
    void settled(els.card.querySelector("img")).then(() => {
      if (run.stopped) return;
      run.start();
      playSeal(run, els, scene, {
        spent: () => setCount(scene.balance),
        light: () => setLit(true),
        done: () => setDone(true),
      });
      reveal();
    });
    return () => run.stop();
  }, [reduced, ready, scene]);

  function tap() {
    if (done) return;
    runRef.current?.stop();
    setCount(scene.balance);
    setLit(true);
    setDone(true);
  }

  async function apply() {
    if (!preview) return;
    setBusy(true);
    setMessage(null);
    try {
      keepCosmetics(await applyCosmetic(preview.card.id, item.code));
      setMessage({ text: `${item.name} applicat${item.kind === "frame" ? "a" : "o"} a ${preview.card.name}!`, isError: false });
      onApplied?.(preview.card.name);
      window.setTimeout(onClose, 900);
    } catch (cause) {
      setMessage({ text: describeServerError(cause), isError: true });
      setBusy(false);
    }
  }

  const what = item.kind === "frame" ? "Cornice" : "Effetto";
  const look = preview ? (lit ? lookWith(preview.look, item) : preview.look) : null;
  const applied = message !== null && !message.isError;
  return (
    <SceneDialog label={`${what} ${item.name}`} onClose={onClose}>
      <div
        ref={stage}
        className="relative flex h-full w-full select-none flex-col items-center gap-2.5 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-[calc(env(safe-area-inset-top)+64px)] short:gap-1.5 short:pt-[calc(env(safe-area-inset-top)+56px)]"
        onClick={tap}
      >
        <ShardCounter value={count} counterRef={counter} />
        <h2 ref={title} className="flex min-h-11 items-center">
          <span className="inline-block -rotate-2 -skew-x-8 font-display text-[32px] uppercase leading-tight text-comic-yellow [text-shadow:3px_3px_0_var(--comic-magenta)]">
            {what} {item.name}!
          </span>
        </h2>
        <div ref={cardBox} className={`relative z-[2] shrink-0 ${CARD_ZOOM}`}>
          {preview && <CardView card={preview.card} abilities={abilities} cosmetics={look} priority />}
        </div>
        <div ref={after} className={`flex w-full max-w-sm flex-col items-center gap-2 ${done ? "" : "pointer-events-none"}`}>
          <p className="text-center text-[13px] font-semibold leading-snug text-muted">
            {COSMETIC_INFO[item.code]?.note}
            {preview && (
              <>
                <br />
                <span className="text-faint">
                  Anteprima su {preview.card.name}: tieni premuto per applicarl{item.kind === "frame" ? "a" : "o"}, si consuma.
                </span>
              </>
            )}
          </p>
          {message && (
            <p role="status" className={`text-sm font-bold ${message.isError ? "text-comic-magenta" : "text-comic-cyan"}`}>
              {message.text}
            </p>
          )}
          <div className="flex w-full gap-2">
            {preview && (
              <HoldToConfirmButton
                onConfirm={apply}
                disabled={busy || applied}
                hint=""
                fillColor="var(--comic-magenta)"
                className="btn btn-primary min-h-12 flex-1 disabled:opacity-60"
              >
                {busy ? "Un attimo…" : `Applica a ${preview.card.name}`}
              </HoldToConfirmButton>
            )}
            <Link href="/collezione" className="btn btn-outline min-h-12 flex-1" onClick={onClose}>
              Un&apos;altra carta
            </Link>
          </div>
          <button type="button" onClick={onClose} className="min-h-10 px-4 text-sm font-bold underline">
            {applied ? "Chiudi" : "Più tardi"}
          </button>
        </div>
      </div>
    </SceneDialog>
  );
}

function playSeal(
  run: SceneRun,
  els: { stage: HTMLElement; card: HTMLElement; title: HTMLElement; after: HTMLElement; counter: HTMLElement | null },
  scene: SealScene,
  on: { spent: () => void; light: () => void; done: () => void },
) {
  const { stage, card } = els;
  const centre = boxIn(card, stage);
  const from = els.counter ? boxIn(els.counter, stage) : { x: stage.clientWidth - 40, y: 30, left: stage.clientWidth - 70, top: 16 };

  // Hidden until their turn.
  run.animate(els.title, [{ opacity: 0 }, { opacity: 0 }], { duration: SEAL.title, fill: "none" });
  run.animate(els.after, [{ opacity: 0 }, { opacity: 0 }], { duration: SEAL.title + 160, fill: "none" });
  run.animate(card, [{ opacity: 0 }, { opacity: 0 }], { duration: SEAL.burst, fill: "none" });

  // The Schegge leave the counter.
  run.at(60, () => {
    on.spent();
    bump(run, els.counter);
    const minus = run.own(document.createElement("span"));
    minus.className = "sx-minus";
    minus.textContent = `−${scene.cost}`;
    Object.assign(minus.style, { left: `${from.left - 30}px`, top: `${from.top + 6}px` });
    stage.append(minus);
    run.animate(minus, [{ transform: "translateY(0)", opacity: 1 }, { transform: "translateY(26px)", opacity: 0 }], { duration: 700, easing: "ease-out" });
  });
  for (let k = 0; k < 7; k++) {
    const node = crystal(run, stage, MAGENTA, false, 14);
    node.style.transform = `translate(${from.x}px,${from.y}px) scale(0)`;
    const at = 60 + k * 45;
    flyAlong(run, node, { x: from.x + between(-10, 10), y: from.y + 6 }, { x: centre.x + between(-14, 14), y: centre.y + between(-14, 14) }, at, 380, {
      from: 0.8,
      to: 1,
      easing: "cubic-bezier(.3,0,.6,1)",
    });
    run.at(at + 380, () => {
      node.remove();
      playSound("tick", k);
    });
  }

  // The seal, its light, its three cracks.
  const glow = run.own(document.createElement("span"));
  glow.className = "sx-glow";
  const seal = run.own(document.createElement("div"));
  seal.className = "sx-seal-wrap";
  seal.innerHTML =
    '<div class="sx-seal"></div><svg viewBox="0 0 132 132"><path pathLength="1" d="M66 66L40 30L46 14"/><path pathLength="1" d="M66 66L104 58L124 70"/><path pathLength="1" d="M66 66L58 100L70 124"/></svg>';
  for (const node of [glow, seal]) Object.assign(node.style, { left: `${centre.x}px`, top: `${centre.y}px` });
  stage.append(glow, seal);
  const face = seal.querySelector<HTMLElement>(".sx-seal")!;
  run.animate(
    seal,
    [
      { transform: "scale(0) rotate(-30deg)" },
      { transform: "scale(1.15) rotate(4deg)", offset: 0.7 },
      { transform: "scale(1) rotate(0deg)" },
    ],
    { delay: SEAL.born, duration: 260, easing: "cubic-bezier(.2,1.3,.4,1)" },
  );
  run.at(SEAL.born, () => playSound("pop"));
  run.animate(
    glow,
    [
      { opacity: 0, transform: "scale(.4)" },
      { opacity: 0.5, transform: "scale(.7)", offset: 0.4 },
      { opacity: 0.8, transform: "scale(.85)", offset: 0.8 },
      { opacity: 1, transform: "scale(1.6)" },
    ],
    { delay: SEAL.born + 30, duration: SEAL.burst - SEAL.born - 30, easing: "ease-in" },
  );
  seal.querySelectorAll("path").forEach((path, i) => {
    run.animate(path, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { delay: SEAL.cracks + i * 110, duration: 90, easing: "ease-out" });
    run.at(SEAL.cracks + i * 110, () => playSound("tink"));
  });
  run.animate(
    face,
    [
      { transform: "none" },
      { transform: "translate(-2px,1px)" },
      { transform: "translate(3px,-1px)" },
      { transform: "translate(-4px,2px)" },
      { transform: "translate(5px,-2px)" },
      { transform: "translate(-6px,1px)" },
      { transform: "none" },
    ],
    { delay: SEAL.cracks, duration: SEAL.burst - SEAL.cracks },
  );

  // It bursts: six pieces fly off, the card appears.
  run.at(SEAL.burst, () => {
    face.style.visibility = "hidden";
    seal.querySelector("svg")?.remove();
    const corners = [[25, 3], [75, 3], [100, 50], [75, 97], [25, 97], [0, 50]];
    corners.forEach((p, i) => {
      const q = corners[(i + 1) % 6];
      const piece = face.cloneNode() as HTMLElement;
      piece.style.visibility = "visible";
      piece.style.clipPath = `polygon(50% 50%, ${p[0]}% ${p[1]}%, ${q[0]}% ${q[1]}%)`;
      seal.append(piece);
      const angle = Math.atan2((p[1] + q[1]) / 2 - 50, (p[0] + q[0]) / 2 - 50);
      run.animate(
        piece,
        [
          { transform: "none", opacity: 1 },
          { transform: `translate(${Math.cos(angle) * 140}px,${Math.sin(angle) * 140}px) rotate(${between(-160, 160)}deg) scale(.5)`, opacity: 0 },
        ],
        { duration: 520, easing: "cubic-bezier(.1,.7,.3,1)" },
      );
    });
    run.animate(glow, [{ opacity: 1, transform: "scale(1.6)" }, { opacity: 0, transform: "scale(2.6)" }], { duration: 450, easing: "ease-out" });
    bursts(run, stage, centre.x, centre.y, MAGENTA);
    playSound("shatter");
    vibrate([20, 30, 40]);
  });
  run.animate(card, [{ scale: 0.82 }, { scale: 1.04, offset: 0.6 }, { scale: 1 }], {
    delay: SEAL.burst,
    duration: 300,
    easing: "cubic-bezier(.2,1.3,.4,1)",
  });

  if (scene.item.kind === "frame") {
    // A line of light runs around the card, then the frame lights.
    run.at(SEAL.draw, () => {
      const box = boxIn(card, stage);
      const svg = run.own(document.createElementNS("http://www.w3.org/2000/svg", "svg"));
      svg.setAttribute("class", "sx-drawn");
      svg.setAttribute("width", `${box.width + 12}`);
      svg.setAttribute("height", `${box.height + 12}`);
      svg.style.left = `${box.left - 6}px`;
      svg.style.top = `${box.top - 6}px`;
      svg.style.setProperty("--sx-color", FRAME_LIGHT[scene.item.code] ?? "#ffd45e");
      svg.innerHTML = `<rect x="3" y="3" width="${box.width + 6}" height="${box.height + 6}" rx="14" pathLength="1"/>`;
      stage.append(svg);
      run.animate(svg.querySelector("rect")!, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: SEAL.lit - SEAL.draw, easing: "ease-in-out" });
      run.animate(svg, [{ opacity: 1 }, { opacity: 0 }], { delay: SEAL.lit - SEAL.draw + 20, duration: 260 });
    });
    run.at(SEAL.lit - 40, () => sweep(run, stage, card, 0));
    run.at(SEAL.lit, () => {
      on.light();
      playSound("reveal");
    });
  } else {
    // A blade of light lays the effect over the drawing.
    run.at(SEAL.draw - 20, () => sweep(run, stage, card, 0));
    run.at(SEAL.draw, () => on.light());
    run.at(SEAL.draw + 30, () => {
      card.querySelectorAll(`.fx-${scene.item.code}, .fx-number`).forEach((layer) =>
        run.animate(layer, [{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)" }], {
          duration: SEAL.lit - SEAL.draw,
          easing: "ease-in-out",
          fill: "none",
        }),
      );
    });
    run.at(SEAL.lit - 100, () => playSound("reveal"));
  }

  // The name, then what to do with it.
  run.animate(
    els.title,
    [
      { transform: "scale(1.9)", opacity: 0 },
      { transform: "scale(.94)", opacity: 1, offset: 0.65 },
      { transform: "scale(1)", opacity: 1 },
    ],
    { delay: SEAL.title, duration: 320, easing: "cubic-bezier(.2,1.2,.4,1)" },
  );
  run.animate(els.after, [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], {
    delay: SEAL.title + 160,
    duration: 280,
    easing: "ease-out",
  });
  run.at(SEAL.done, on.done);
}

/** The color of the light that draws each frame. */
const FRAME_LIGHT: Partial<Record<string, string>> = {
  gold: "#ffd45e",
  silver: "#e9ecf0",
  prism: "#b45cff",
  neon: "#16c8ff",
  magma: "#ff6a00",
  ice: "#8cdcff",
  circuit: "#39ffa0",
  void: "#9b5cff",
  comic: "#ffd60a",
};
