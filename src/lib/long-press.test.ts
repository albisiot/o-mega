import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLongPress } from "@/lib/long-press";

function setup() {
  const controller = createLongPress({
    delayMs: 450,
    tolerancePx: 10,
    setTimer: (run, ms) => setTimeout(run, ms) as unknown as number,
    clearTimer: (id) => clearTimeout(id),
  });
  const fired = vi.fn();
  const changes: boolean[] = [];
  const down = (x = 0, y = 0, button = 0, pointerId = 1) =>
    controller.down({ pointerId, clientX: x, clientY: y, button }, fired, (pressing) => changes.push(pressing));
  return { controller, fired, changes, down };
}

describe("long press", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("fires once after the delay, ending the press first", () => {
    const { controller, fired, changes, down } = setup();
    expect(down()).toBe(true);
    expect(changes).toEqual([true]);
    vi.advanceTimersByTime(449);
    expect(fired).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fired).toHaveBeenCalledTimes(1);
    expect(changes).toEqual([true, false]);
    expect(controller.isPressing()).toBe(false);
    vi.advanceTimersByTime(2000);
    expect(fired).toHaveBeenCalledTimes(1);
  });

  it("does nothing when lifted early (a tap)", () => {
    const { controller, fired, changes, down } = setup();
    down();
    vi.advanceTimersByTime(200);
    controller.cancel();
    vi.advanceTimersByTime(1000);
    expect(fired).not.toHaveBeenCalled();
    expect(changes).toEqual([true, false]);
  });

  it("is called off by a scroll or a drag, not by a finger that trembles", () => {
    const { controller, fired, down } = setup();
    down(100, 100);
    controller.move({ pointerId: 1, clientX: 106, clientY: 107 });
    expect(controller.isPressing()).toBe(true);
    controller.move({ pointerId: 1, clientX: 100, clientY: 112 });
    expect(controller.isPressing()).toBe(false);
    vi.advanceTimersByTime(1000);
    expect(fired).not.toHaveBeenCalled();
  });

  it("ignores another finger's movement", () => {
    const { controller, fired, down } = setup();
    down(0, 0, 0, 1);
    controller.move({ pointerId: 2, clientX: 300, clientY: 300 });
    vi.advanceTimersByTime(450);
    expect(fired).toHaveBeenCalledTimes(1);
  });

  it("leaves the right button (and others) alone", () => {
    const { controller, fired, changes, down } = setup();
    expect(down(0, 0, 2)).toBe(false);
    expect(controller.isPressing()).toBe(false);
    expect(changes).toEqual([]);
    vi.advanceTimersByTime(1000);
    expect(fired).not.toHaveBeenCalled();
  });

  it("starts afresh when a new press begins before the old one ended", () => {
    const { fired, changes, down } = setup();
    down();
    vi.advanceTimersByTime(300);
    down();
    expect(changes).toEqual([true, false, true]);
    vi.advanceTimersByTime(300);
    expect(fired).not.toHaveBeenCalled();
    vi.advanceTimersByTime(150);
    expect(fired).toHaveBeenCalledTimes(1);
  });
});
