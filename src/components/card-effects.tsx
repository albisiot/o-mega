"use client";

import { useEffect, useRef, type PointerEvent } from "react";
import { withBasePath } from "@/lib/base-path";
import type { CardEffect } from "@/lib/card-effects";

function trackPointer(event: PointerEvent<HTMLElement>) {
  const element = event.currentTarget;
  const box = element.getBoundingClientRect();
  const x = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
  const y = Math.min(1, Math.max(0, (event.clientY - box.top) / box.height));
  element.classList.add("fx-touching");
  element.style.setProperty("--fx-x", `${x * 100}%`);
  element.style.setProperty("--fx-y", `${y * 100}%`);
  element.style.setProperty("--fx-ry", `${(x - 0.5) * 26}deg`);
  element.style.setProperty("--fx-rx", `${(0.5 - y) * 22}deg`);
}

function releasePointer(event: PointerEvent<HTMLElement>) {
  event.currentTarget.classList.remove("fx-touching");
}

/** Finger or mouse position drives the reflections and the tilt. Vertical scrolling stays free (see .fx-tilt). */
export const CARD_TOUCH_HANDLERS = {
  onPointerDown: trackPointer,
  onPointerMove: trackPointer,
  onPointerUp: (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== "mouse") releasePointer(event);
  },
  onPointerLeave: releasePointer,
  onPointerCancel: releasePointer,
};

/** The layers an effect paints over the art. */
export function CardArtEffects({ effects, artUrl }: { effects: CardEffect[]; artUrl?: string | null }) {
  return (
    <>
      {effects.includes("glitch") && artUrl && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={withBasePath(artUrl)} alt="" loading="lazy" className="fx-glitch fx-glitch-a" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={withBasePath(artUrl)} alt="" loading="lazy" className="fx-glitch fx-glitch-b" />
        </>
      )}
      {effects.includes("holo") && <span aria-hidden className="fx-layer fx-holo" />}
      {effects.includes("flash") && <span aria-hidden className="fx-layer fx-flash" />}
      {effects.includes("tilt") && <span aria-hidden className="fx-layer fx-glare" />}
      {effects.includes("bolts") && <EffectCanvas draw={drawBolts} />}
      {effects.includes("embers") && <EffectCanvas draw={drawEmbers} />}
    </>
  );
}

type Draw = (context: CanvasRenderingContext2D, width: number, height: number, time: number, state: EffectState) => void;
type Spark = { x: number; life: number; span: number; rise: number; size: number; seed: number };
type Bolt = { born: number; ttl: number; path: [number, number][] };
type EffectState = { sparks?: Spark[]; bolts?: Bolt[]; nextBolt?: number };

function EffectCanvas({ draw }: { draw: Draw }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const state: EffectState = {};
    let visible = false;
    let frame = 0;
    const tick = (time: number) => {
      frame = requestAnimationFrame(tick);
      if (!visible) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      draw(context, width, height, time, state);
    };
    // Only what is on screen gets drawn, to spare the phone's battery.
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    observer.observe(canvas);
    frame = requestAnimationFrame(tick);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [draw]);

  return <canvas ref={canvasRef} aria-hidden className="fx-layer h-full w-full" />;
}

function newSpark(width: number, anywhere: boolean): Spark {
  return {
    x: Math.random() * width,
    life: anywhere ? Math.random() : 0,
    span: 1.4 + Math.random() * 2,
    rise: 0.6 + Math.random() * 0.45,
    size: 1 + Math.random() * 2.4,
    seed: Math.random() * 10,
  };
}

const drawEmbers: Draw = (context, width, height, time, state) => {
  const scale = width / 300;
  const sparks = (state.sparks ??= Array.from({ length: 34 }, () => newSpark(width, true)));
  context.globalCompositeOperation = "lighter";
  context.shadowColor = "rgb(255 120 0 / 0.9)";
  context.shadowBlur = 8 * scale;
  for (const spark of sparks) {
    spark.life += 0.016 / spark.span;
    if (spark.life >= 1) Object.assign(spark, newSpark(width, false));
    const y = height - spark.life * height * spark.rise;
    const x = spark.x + Math.sin(time / 500 + spark.seed) * 10 * scale;
    context.fillStyle = `rgb(255 ${Math.round(120 + 100 * (1 - spark.life))} 20 / ${Math.sin(Math.PI * spark.life)})`;
    context.beginPath();
    context.arc(x, y, spark.size * scale * (1 - spark.life * 0.5), 0, Math.PI * 2);
    context.fill();
  }
};

/** A jagged line from one edge of the art towards the inside. */
function newBoltPath(width: number, height: number): [number, number][] {
  const side = Math.floor(Math.random() * 4);
  let x = side === 0 ? 0 : side === 1 ? width : Math.random() * width;
  let y = side === 2 ? 0 : side === 3 ? height : Math.random() * height;
  const steps = 7;
  const reach = (0.45 + Math.random() * 0.45) / steps;
  const stepX = (width * (0.25 + Math.random() * 0.5) - x) * reach;
  const stepY = (height * (0.25 + Math.random() * 0.5) - y) * reach;
  const jitter = width * 0.05;
  const path: [number, number][] = [[x, y]];
  for (let step = 0; step < steps; step++) {
    x += stepX + (Math.random() - 0.5) * jitter;
    y += stepY + (Math.random() - 0.5) * jitter;
    path.push([x, y]);
  }
  return path;
}

const drawBolts: Draw = (context, width, height, time, state) => {
  const scale = width / 300;
  if (time > (state.nextBolt ?? 0)) {
    (state.bolts ??= []).push({ born: time, ttl: 90 + Math.random() * 130, path: newBoltPath(width, height) });
    state.nextBolt = time + 120 + Math.random() * 620;
  }
  state.bolts = (state.bolts ?? []).filter((bolt) => time - bolt.born < bolt.ttl);
  context.lineJoin = "round";
  for (const bolt of state.bolts) {
    const fade = 1 - (time - bolt.born) / bolt.ttl;
    context.beginPath();
    bolt.path.forEach(([x, y], index) => (index ? context.lineTo(x, y) : context.moveTo(x, y)));
    context.shadowColor = "#16c8ff";
    context.shadowBlur = 12 * scale;
    context.strokeStyle = `rgb(22 200 255 / ${fade})`;
    context.lineWidth = 3 * scale;
    context.stroke();
    context.shadowBlur = 0;
    context.strokeStyle = `rgb(255 248 231 / ${fade})`;
    context.lineWidth = 1.2 * scale;
    context.stroke();
  }
};
