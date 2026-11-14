// Browsing a character's page to the next or previous one, as in a photo gallery: which
// card comes next in the album as it was shown, and when a finger's drag is a swipe.
// Pure: the page binds it to pointer events and to the URL.

/** +1 is the next card (finger moving left), -1 the previous one (finger moving right). */
export type SwipeStep = 1 | -1;

/** Where the card sits in the list the album showed, if it is there. */
export function browsePosition(ids: readonly string[], current: string): { index: number; total: number } | null {
  const index = ids.indexOf(current);
  return index === -1 ? null : { index, total: ids.length };
}

/** The card one step away in the list; none past either end (no wrapping around). */
export function neighbourId(ids: readonly string[], current: string, step: SwipeStep): string | null {
  const index = ids.indexOf(current);
  if (index === -1) return null;
  return ids[index + step] ?? null;
}

/** How far a finger moves before its direction is judged: a tap wobbles less than this. */
export const SWIPE_SLOP_PX = 10;
/** A drag is horizontal only when it moves this many times more sideways than up or down. */
const HORIZONTAL_RATIO = 1.5;

export type DragAxis = "pending" | "horizontal" | "vertical";

/**
 * What a drag is, from how far it has gone since the finger came down. Anything not
 * clearly sideways is left to the page's own vertical scroll, and stays that way.
 */
export function classifyDrag(dx: number, dy: number): DragAxis {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (Math.max(ax, ay) < SWIPE_SLOP_PX) return "pending";
  return ax > ay * HORIZONTAL_RATIO ? "horizontal" : "vertical";
}

/** A sideways drag turns the card past this share of the screen's width… */
const DISTANCE_SHARE = 0.25;
/** …but never for less than this many pixels… */
const MIN_DISTANCE_PX = 60;
/** …or after a quick flick: at least this far, at least this fast (px per ms). */
const FLICK_DISTANCE_PX = 30;
const FLICK_SPEED = 0.5;

/**
 * Whether a horizontal drag, once released, turns the card: far enough, or a quick flick.
 * `dx` is the whole sideways move, `ms` how long the finger was down, `width` the screen's.
 */
export function swipeStep(dx: number, ms: number, width: number): SwipeStep | null {
  const distance = Math.abs(dx);
  const far = distance >= Math.max(MIN_DISTANCE_PX, width * DISTANCE_SHARE);
  const flick = distance >= FLICK_DISTANCE_PX && distance / Math.max(ms, 1) >= FLICK_SPEED;
  if (!far && !flick) return null;
  return dx < 0 ? 1 : -1;
}

/** Past either end the card still follows the finger, but reluctantly, and springs back. */
const EDGE_RESISTANCE = 0.3;
const EDGE_MAX_PX = 60;

/** Where the card is drawn while the finger drags it `dx` sideways. */
export function dragOffset(dx: number, canMove: boolean): number {
  if (canMove) return dx;
  const pulled = dx * EDGE_RESISTANCE;
  return Math.max(-EDGE_MAX_PX, Math.min(EDGE_MAX_PX, pulled));
}
