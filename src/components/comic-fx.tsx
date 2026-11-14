"use client";

import { useRef, type RefObject } from "react";
import { paced, prefersReducedMotion } from "@/components/comic-page";

// The effects that travel across a result page: points flying from where a power takes
// them to the score, bolts from a card to the abilities it hits, sound effect words, sparks.
// They are drawn on a layer over the page and find their ends by name: an element with
// data-fx="me-score" is the anchor "me-score". Nothing here changes what the page says:
// skipped, or with reduced motion, the page shows the same result without them.

export type FxTone = "help" | "harm" | "shield" | "forward" | "rule" | "ice" | "info" | "stop" | "tie";

type Anchor = string | Element | null | undefined;

export type ComicFx = {
  /** A chip that flies from one anchor to another, or breaks halfway (`breakAt`, 0-1). */
  token: (from: Anchor, to: Anchor, text: string, tone: FxTone, options?: { arc?: number; duration?: number; breakAt?: number }) => void;
  /** A jagged bolt between two anchors. */
  bolt: (from: Anchor, to: Anchor, tone?: FxTone) => void;
  /** A sound effect word stamped on an anchor, that fades after a moment. */
  /**
   * `above`: the word sits over the anchor's top edge instead of its centre, so a balloon's
   * text stays readable under it.
   */
  word: (at: Anchor, text: string, tone: FxTone, options?: { dx?: number; dy?: number; size?: number; above?: boolean }) => void;
  /** A ring of sparks around an anchor. */
  sparks: (at: Anchor, tone?: FxTone) => void;
  /** A short shake of an anchor. */
  shake: (at: Anchor, strength?: number) => void;
};

/**
 * The layer the effects are drawn on: put it inside the page, and draw with
 * comicFx(layer.current) from an effect, once the page is on screen.
 */
export function useComicFx() {
  return { layer: useRef<HTMLDivElement>(null) };
}

/** The layer itself: over the whole page, never in the way of a tap. */
export function FxLayer({ layerRef }: { layerRef: RefObject<HTMLDivElement | null> }) {
  return <div ref={layerRef} aria-hidden className="comic-fx-layer" />;
}

/** The functions that draw on a layer. */
export function comicFx(layerElement: HTMLDivElement | null): ComicFx {
  const getLayer = () => layerElement;
  const find = (anchor: Anchor): Element | null => {
    if (!anchor) return null;
    if (typeof anchor !== "string") return anchor;
    return getLayer()?.parentElement?.querySelector(`[data-fx="${anchor}"]`) ?? null;
  };
  const centre = (element: Element) => {
    const box = getLayer()!.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    return { x: rect.left + rect.width / 2 - box.left, y: rect.top + rect.height / 2 - box.top };
  };
  const ready = () => Boolean(getLayer()) && !prefersReducedMotion();
  const add = <K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text = "") => {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = text;
    getLayer()!.append(element);
    return element;
  };

  return {
    token(from, to, text, tone, options = {}) {
      const a = find(from);
      const b = find(to);
      if (!ready() || !a || !b) return;
      const start = centre(a);
      const end = centre(b);
      const chip = add("span", `fx-token fx-${tone}`, text);
      chip.style.left = `${start.x}px`;
      chip.style.top = `${start.y}px`;
      const share = options.breakAt ?? 1;
      const dx = (end.x - start.x) * share;
      const dy = (end.y - start.y) * share;
      const lift = Math.min(start.y, end.y) - (options.arc ?? 50) - start.y;
      const flight = chip.animate(
        [
          { transform: "translate(0, 0) scale(0.4)", opacity: 0 },
          { transform: `translate(${dx / 2}px, ${lift}px) scale(1.15)`, opacity: 1, offset: 0.5 },
          { transform: `translate(${dx}px, ${dy}px) scale(0.9)`, opacity: 1 },
        ],
        { duration: paced(options.duration ?? 520), easing: "cubic-bezier(0.4, 0, 0.3, 1)", fill: "forwards" },
      );
      flight.onfinish = () => {
        if (options.breakAt === undefined) {
          chip.remove();
          return;
        }
        chip.className = "fx-token fx-broken";
        chip.textContent = "✕";
        chip
          .animate(
            [
              { transform: `translate(${dx}px, ${dy}px) rotate(0)`, opacity: 1 },
              { transform: `translate(${dx}px, ${dy + 60}px) rotate(40deg) scale(0.6)`, opacity: 0 },
            ],
            { duration: paced(420), fill: "forwards" },
          )
          .onfinish = () => chip.remove();
      };
    },

    bolt(from, to, tone = "harm") {
      const a = find(from);
      const b = find(to);
      if (!ready() || !a || !b) return;
      const start = centre(a);
      const end = centre(b);
      const steps = 7;
      const points = Array.from({ length: steps + 1 }, (_, i) => {
        const t = i / steps;
        const jitter = i > 0 && i < steps ? (Math.random() - 0.5) * 28 : 0;
        return `${(start.x + (end.x - start.x) * t + jitter).toFixed(1)},${(start.y + (end.y - start.y) * t + jitter * 0.6).toFixed(1)}`;
      }).join(" ");
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", `fx-bolt fx-${tone}`);
      svg.innerHTML = `<polyline points="${points}" class="fx-bolt-ink"/><polyline points="${points}" class="fx-bolt-light"/>`;
      getLayer()!.append(svg);
      svg
        .animate([{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 1, offset: 0.6 }, { opacity: 0 }], {
          duration: paced(520),
          fill: "forwards",
        })
        .onfinish = () => svg.remove();
    },

    word(at, text, tone, options = {}) {
      const anchor = find(at);
      if (!getLayer() || !anchor) return;
      const point = centre(anchor);
      if (options.above) {
        // From the anchor's own height, not its box on screen: a balloon still popping in is scaled down.
        const height = anchor instanceof HTMLElement ? anchor.offsetHeight : anchor.getBoundingClientRect().height;
        point.y = point.y - height / 2 - (options.size ?? 40) / 2;
      }
      const word = add("span", `fx-word fx-${tone}`, text);
      word.style.left = `${point.x + (options.dx ?? 0)}px`;
      word.style.top = `${point.y + (options.dy ?? 0)}px`;
      if (options.size) word.style.fontSize = `${options.size}px`;
      const still = prefersReducedMotion();
      word
        .animate(
          still
            ? [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }]
            : [
                { opacity: 0, transform: "scale(3)" },
                { opacity: 1, transform: "scale(0.92)", offset: 0.2 },
                { opacity: 1, transform: "scale(1)", offset: 0.3 },
                { opacity: 1, transform: "scale(1)", offset: 0.8 },
                { opacity: 0, transform: "scale(1.1)" },
              ],
          { duration: paced(1100), fill: "forwards", easing: "ease-out" },
        )
        .onfinish = () => word.remove();
    },

    sparks(at, tone = "help") {
      const anchor = find(at);
      if (!ready() || !anchor) return;
      const point = centre(anchor);
      for (let i = 0; i < 10; i++) {
        const spark = add("span", `fx-spark fx-${tone}`);
        spark.style.left = `${point.x}px`;
        spark.style.top = `${point.y}px`;
        const angle = (i / 10) * Math.PI * 2;
        const reach = 46 + Math.random() * 30;
        spark
          .animate(
            [
              { transform: "translate(0, 0) rotate(45deg) scale(1)", opacity: 1 },
              { transform: `translate(${Math.cos(angle) * reach}px, ${Math.sin(angle) * reach}px) rotate(45deg) scale(0.3)`, opacity: 0 },
            ],
            { duration: paced(520), easing: "cubic-bezier(0.2, 0.8, 0.3, 1)", fill: "forwards" },
          )
          .onfinish = () => spark.remove();
      }
    },

    shake(at, strength = 8) {
      const anchor = find(at);
      if (!ready() || !anchor) return;
      const s = strength;
      anchor.animate(
        [
          { transform: "translate(0, 0)" },
          { transform: `translate(${-s}px, ${s / 2}px)` },
          { transform: `translate(${s}px, ${-s / 2}px)` },
          { transform: `translate(${-s / 2}px, 0)` },
          { transform: "translate(0, 0)" },
        ],
        { duration: paced(320) },
      );
    },
  };
}
