import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { WORLD_SPLASH_LINES } from "@/config/world";
import { nextSplashLine, SPLASH_LINE_KEY, SPLASH_LINE_SCRIPT } from "./splash-line";

const COUNT = WORLD_SPLASH_LINES.length;
const RANDOMS = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 0.999999];

describe("nextSplashLine", () => {
  it("never shows the same line twice in a row, and can reach every other one", () => {
    for (let last = 0; last < COUNT; last++) {
      const seen = new Set<number>();
      for (let step = 0; step < 1000; step++) {
        const pick = nextSplashLine(String(last), COUNT, step / 1000);
        expect(pick).not.toBe(last);
        expect(pick).toBeGreaterThanOrEqual(0);
        expect(pick).toBeLessThan(COUNT);
        seen.add(pick);
      }
      expect(seen.size).toBe(COUNT - 1);
    }
  });

  it("picks any line when there is no valid last one", () => {
    for (const previous of [null, "", "abc", "-1", "2.5", String(COUNT), "Infinity"]) {
      const seen = new Set(RANDOMS.map((random) => nextSplashLine(previous, COUNT, random)));
      expect(seen.has(0)).toBe(true);
      expect(seen.has(COUNT - 1)).toBe(true);
    }
  });

  it("shows the only line there is", () => {
    expect(nextSplashLine("0", 1, 0.7)).toBe(0);
    expect(nextSplashLine(null, 1, 0.7)).toBe(0);
  });
});

function runScript({ stored, random, path = "/", storage = true }: { stored: string | null; random: number; path?: string; storage?: boolean }) {
  const saved = new Map<string, string>();
  if (stored !== null) saved.set(SPLASH_LINE_KEY, stored);
  const styles: string[] = [];
  const context = {
    localStorage: {
      getItem: (key: string) => {
        if (!storage) throw new Error("blocked");
        return saved.get(key) ?? null;
      },
      setItem: (key: string, value: string) => {
        if (!storage) throw new Error("blocked");
        saved.set(key, value);
      },
    },
    location: { pathname: path },
    document: {
      createElement: () => ({ textContent: "" }),
      head: { appendChild: (style: { textContent: string }) => styles.push(style.textContent) },
    },
    Math: { ...Math, random: () => random, floor: Math.floor, min: Math.min },
    Number,
    String,
    NaN,
  };
  runInNewContext(SPLASH_LINE_SCRIPT, context);
  const shown = styles.length ? Number(/nth-child\((\d+)\)/.exec(styles[0])?.[1]) - 1 : null;
  return { shown, stored: saved.get(SPLASH_LINE_KEY) ?? null, styles };
}

describe("SPLASH_LINE_SCRIPT", () => {
  it("shows the line nextSplashLine picks and stores it for the next opening", () => {
    for (const previous of [null, "0", "3", String(COUNT - 1), "junk"]) {
      for (const random of RANDOMS) {
        const expected = nextSplashLine(previous, COUNT, random);
        const result = runScript({ stored: previous, random });
        expect(result.shown).toBe(expected);
        expect(result.stored).toBe(String(expected));
      }
    }
  });

  it("hides every other line", () => {
    const { styles } = runScript({ stored: "2", random: 0 });
    expect(styles).toEqual([
      ".splash-lines>.splash-line{display:none}.splash-lines>.splash-line:nth-child(1){display:inline}",
    ]);
  });

  it("still shows a line when the device keeps no storage", () => {
    const result = runScript({ stored: null, random: 0.5, storage: false });
    expect(result.shown).toBe(nextSplashLine(null, COUNT, 0.5));
  });

  it("does nothing on the return from Google, which has no splash", () => {
    const result = runScript({ stored: "4", random: 0.5, path: "/o-mega/auth/callback/" });
    expect(result.styles).toEqual([]);
    expect(result.stored).toBe("4");
  });
});
