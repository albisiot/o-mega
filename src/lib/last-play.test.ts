import { describe, expect, it } from "vitest";
import { describeLastPlay, FIRST_PLAY, lastPlayHref, parseLastPlay } from "@/lib/last-play";

describe("lastPlayHref", () => {
  it("opens the team screen as Gioca's own links do", () => {
    expect(lastPlayHref(FIRST_PLAY)).toBe("/squadra/?difficulty=easy");
    expect(lastPlayHref({ mode: "bot", format: "quadrant_shifting", difficulty: "hard" })).toBe(
      "/squadra/?format=quadrant_shifting&difficulty=hard",
    );
    expect(lastPlayHref({ mode: "queue", format: "classic" })).toBe("/squadra/?mode=queue");
    expect(lastPlayHref({ mode: "lobby", format: "triple" })).toBe("/squadra/?mode=lobby&format=triple");
    expect(lastPlayHref({ mode: "ranked", format: "boss" })).toBe("/squadra/?mode=ranked&format=boss");
    expect(lastPlayHref({ mode: "conquest", format: "classic" })).toBe("/squadra/?mode=conquest");
  });
});

describe("parseLastPlay", () => {
  it("keeps a valid play", () => {
    expect(parseLastPlay({ mode: "bot", format: "boss", difficulty: "medium" })).toEqual({
      mode: "bot",
      format: "boss",
      difficulty: "medium",
    });
    expect(parseLastPlay({ mode: "ranked", format: "quadrant" })).toEqual({ mode: "ranked", format: "quadrant" });
  });

  it("drops what is not a play", () => {
    expect(parseLastPlay(null)).toBeNull();
    expect(parseLastPlay("bot")).toBeNull();
    expect(parseLastPlay({ mode: "bot", format: "classic" })).toBeNull();
    expect(parseLastPlay({ mode: "bot", format: "chess", difficulty: "easy" })).toBeNull();
    expect(parseLastPlay({ mode: "join", format: "classic" })).toBeNull();
    expect(parseLastPlay({ mode: "story", format: "classic" })).toBeNull();
  });

  it("keeps the Conquista classic", () => {
    expect(parseLastPlay({ mode: "conquest", format: "triple" })).toEqual({ mode: "conquest", format: "classic" });
  });
});

describe("describeLastPlay", () => {
  it("names the mode and how it is played", () => {
    expect(describeLastPlay(FIRST_PLAY)).toEqual({ title: "Classica", detail: "Contro il bot Facile" });
    expect(describeLastPlay({ mode: "bot", format: "quadrant_shifting", difficulty: "super_pro" })).toEqual({
      title: "Quadrante",
      detail: "Griglia mobile · contro il bot Super Pro",
    });
    expect(describeLastPlay({ mode: "ranked", format: "triple" })).toEqual({
      title: "Allarme Triplo",
      detail: "Classificata, la Fama in gioco",
    });
  });
});

describe("a Sfida a tema", () => {
  const play = { mode: "bot", format: "triple", difficulty: "medium", challenge: { id: "c1", title: "Notte dei Figli" } } as const;

  it("is remembered, opened and named", () => {
    expect(parseLastPlay(JSON.parse(JSON.stringify(play)))).toEqual(play);
    expect(lastPlayHref(play)).toBe("/squadra/?sfida=c1&format=triple&difficulty=medium");
    expect(describeLastPlay(play)).toEqual({ title: "Notte dei Figli", detail: "Sfida a tema · Allarme Triplo contro il bot Medio" });
  });

  it("a broken challenge is dropped, the play kept", () => {
    expect(parseLastPlay({ mode: "bot", format: "classic", difficulty: "easy", challenge: { id: 3 } })).toEqual({
      mode: "bot",
      format: "classic",
      difficulty: "easy",
    });
  });
});
