import { useEffect, useRef, useSyncExternalStore } from "react";

// A screen inside a page that is not a page of its own: an edit form opened from a list, the
// second step of a form, a kit opened in the editor. While one is open, the back arrow at the top
// of the page (GoBackLink) closes it and shows what was under it, one level at a time, instead of
// leaving the page and the work in it.

type Step = { close: () => void };

let steps: Step[] = [];
const listeners = new Set<() => void>();

function changed() {
  for (const listener of listeners) listener();
}

/**
 * While `open`, the back arrow runs `close` instead of leaving the page. A screen opened from
 * another one registers after it, so the arrow closes the innermost first.
 */
export function useBackStep(open: boolean, close: () => void) {
  const latest = useRef(close);
  useEffect(() => {
    latest.current = close;
  });
  useEffect(() => {
    if (!open) return;
    const step: Step = { close: () => latest.current() };
    steps = [...steps, step];
    changed();
    return () => {
      steps = steps.filter((entry) => entry !== step);
      changed();
    };
  }, [open]);
}

/** Closes the innermost open screen: true when there was one, so the page must stay. */
export function takeBackStep(): boolean {
  const step = steps.at(-1);
  if (!step) return false;
  step.close();
  return true;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Whether the back arrow would close a screen inside the page rather than leave it. */
export function useBackStepOpen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => steps.length > 0,
    () => false,
  );
}
