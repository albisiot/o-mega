/**
 * The timeline of a short scene (the Schegge scenes, shard-scenes.tsx): its steps, animations,
 * frame loop and the elements it adds, so that a tap stops everything at once and the scene can
 * show its end. Times are in milliseconds from `start()`.
 *
 * Steps and animations share one clock, the document timeline's: when the phone is busy for a
 * moment (a drawing decoding, a first paint), both jump ahead together instead of drifting apart.
 */
export class SceneRun {
  private queue: { at: number; fn: () => void }[] = [];
  private animations: Animation[] = [];
  private nodes: Element[] = [];
  private draws: ((ms: number) => boolean)[] = [];
  private cleanups: (() => void)[] = [];
  private frame = 0;
  private origin = 0;
  /** The scene time a step runs at: the animations it starts count from there. */
  private cursor = 0;
  private started = false;
  stopped = false;

  /** Starts the clock now. */
  start() {
    this.origin = timelineNow();
    this.started = true;
    this.wake();
  }

  /** Runs `fn` at `ms` of the scene, unless the scene stopped first. */
  at(ms: number, fn: () => void) {
    const index = this.queue.findIndex((step) => step.at > ms);
    this.queue.splice(index < 0 ? this.queue.length : index, 0, { at: ms, fn });
    this.wake();
  }

  /** A Web Animation on the scene's clock, holding its first frame before its delay and its last after (fill: both). */
  animate(node: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions & { duration: number }): Animation {
    const animation = node.animate(keyframes, { fill: "both", ...options });
    animation.startTime = this.origin + this.cursor;
    this.animations.push(animation);
    return animation;
  }

  /** Calls `draw` at every frame with the scene time, until it returns false. */
  loop(draw: (ms: number) => boolean) {
    this.draws.push(draw);
    this.wake();
  }

  /** Something to undo when the scene stops. */
  onStop(fn: () => void) {
    this.cleanups.push(fn);
  }

  /** An element the scene added: it goes when the scene stops. */
  own<T extends Element>(node: T): T {
    this.nodes.push(node);
    return node;
  }

  stop() {
    this.stopped = true;
    this.queue = [];
    this.draws = [];
    this.animations.forEach((animation) => animation.cancel());
    cancelAnimationFrame(this.frame);
    this.nodes.forEach((node) => node.remove());
    this.cleanups.forEach((fn) => fn());
  }

  private wake() {
    if (this.started && !this.stopped && !this.frame) this.frame = requestAnimationFrame(this.tick);
  }

  private tick = () => {
    this.frame = 0;
    if (this.stopped) return;
    const now = timelineNow() - this.origin;
    while (this.queue.length && this.queue[0].at <= now && !this.stopped) {
      const step = this.queue.shift()!;
      this.cursor = step.at;
      step.fn();
    }
    this.cursor = now;
    this.draws = this.draws.filter((draw) => !this.stopped && draw(now));
    this.cursor = 0;
    if (this.queue.length || this.draws.length) this.wake();
  };
}

function timelineNow(): number {
  const time = document.timeline?.currentTime;
  return typeof time === "number" ? time : performance.now();
}

/**
 * Waits until a scene can start smoothly: its drawing decoded (at most `limit` ms) and two frames
 * painted, so the first moments are not spent on the first paint.
 */
export async function settled(image: HTMLImageElement | null, limit = 800): Promise<void> {
  if (image && !(image.complete && image.naturalWidth)) {
    await Promise.race([image.decode().catch(() => undefined), new Promise((done) => window.setTimeout(done, limit))]);
  }
  await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
}

export const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const between = (low: number, high: number) => low + Math.random() * (high - low);
export const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

/** Where an element is inside the scene, in px: its centre and its box. */
export function boxIn(node: Element, stage: Element) {
  const scene = stage.getBoundingClientRect();
  const box = node.getBoundingClientRect();
  return {
    x: box.left - scene.left + box.width / 2,
    y: box.top - scene.top + box.height / 2,
    left: box.left - scene.left,
    top: box.top - scene.top,
    width: box.width,
    height: box.height,
  };
}

/** An element flying from p0 to p1 along a curve that rises first, turning and shrinking. */
export function flyAlong(
  run: SceneRun,
  node: HTMLElement,
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  delay: number,
  duration: number,
  { from = 1, to = 0.45, spin = 200, easing = "cubic-bezier(.45,0,.85,.55)" } = {},
): Animation {
  const half = { w: node.offsetWidth / 2, h: node.offsetHeight / 2 };
  const cx = p0.x + (p1.x - p0.x) * 0.2 + between(-50, 50);
  const cy = Math.min(p0.y, p1.y) - between(50, 120);
  const keyframes: Keyframe[] = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    const x = (1 - t) ** 2 * p0.x + 2 * (1 - t) * t * cx + t * t * p1.x;
    const y = (1 - t) ** 2 * p0.y + 2 * (1 - t) * t * cy + t * t * p1.y;
    keyframes.push({
      transform: `translate(${x - half.w}px,${y - half.h}px) rotate(${spin * t}deg) scale(${from + (to - from) * t})`,
      offset: t,
    });
  }
  return run.animate(node, keyframes, { delay, duration, easing, fill: "forwards" });
}
