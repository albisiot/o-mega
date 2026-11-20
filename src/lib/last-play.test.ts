import { describe, expect, it } from "vitest";
import { balance } from "@/config/balance";
import {
  describeLastPlay,
  describePlayBlock,
  FIRST_PLAY,
  lastPlayHref,
  parseLastPlay,
  playBlock,
  rematchOf,
  type LastPlay,
} from "@/lib/last-play";

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

describe("a Sfida a tema online", () => {
  const play = { mode: "queue", format: "classic", challenge: { id: "c2", title: "Solo Cattivi" } } as const;

  it("the random queue and a friend code remember it", () => {
    expect(parseLastPlay(JSON.parse(JSON.stringify(play)))).toEqual(play);
    expect(lastPlayHref(play)).toBe("/squadra/?sfida=c2&mode=queue");
    expect(describeLastPlay(play).title).toBe("Solo Cattivi");
    const lobby = { mode: "lobby", format: "boss", challenge: { id: "c2", title: "Solo Cattivi" } } as const;
    expect(parseLastPlay(JSON.parse(JSON.stringify(lobby)))).toEqual(lobby);
    expect(lastPlayHref(lobby)).toBe("/squadra/?sfida=c2&mode=lobby&format=boss");
    expect(describeLastPlay(lobby)).toEqual({
      title: "Solo Cattivi",
      detail: "Sfida a tema · Grande Minaccia amichevole, codice per un amico",
    });
  });

  it("the Classificata never has one", () => {
    expect(parseLastPlay({ mode: "ranked", format: "classic", challenge: { id: "c2", title: "Solo Cattivi" } })).toEqual({
      mode: "ranked",
      format: "classic",
    });
  });
});

describe("rematchOf: «Rivincita» and «Gioca ancora» after a match", () => {
  const sfida = { id: "c1", title: "Notte dei Figli", color: "#ffcc00", daily_limit: 3, plays_today: 1 };

  it("against a bot: the same mode, grid and level", () => {
    expect(rematchOf({ mode: "bot", format: "classic", bot_difficulty: "hard" }, null)).toEqual({
      mode: "bot",
      format: "classic",
      difficulty: "hard",
    });
    const quadrant = rematchOf({ mode: "bot", format: "quadrant_shifting", bot_difficulty: "super_pro" }, FIRST_PLAY);
    expect(lastPlayHref(quadrant)).toBe("/squadra/?format=quadrant_shifting&difficulty=super_pro");
    // A match from before the other modes: a Classica.
    expect(lastPlayHref(rematchOf({ mode: "bot", bot_difficulty: "medium" }, null))).toBe("/squadra/?difficulty=medium");
  });

  it("keeps the Sfida a tema, against a bot and online (until 20 November 2026 a bot rematch dropped it)", () => {
    const bot = rematchOf({ mode: "bot", format: "boss", bot_difficulty: "medium", challenge: sfida }, null);
    expect(bot).toEqual({ mode: "bot", format: "boss", difficulty: "medium", challenge: { id: "c1", title: "Notte dei Figli" } });
    expect(lastPlayHref(bot)).toBe("/squadra/?sfida=c1&format=boss&difficulty=medium");
    // The opponent the server found in the challenge's queue: the queue again.
    const online = rematchOf({ mode: "friendly", format: "triple", bot_difficulty: null, challenge: sfida }, null);
    expect(lastPlayHref(online)).toBe("/squadra/?sfida=c1&mode=queue&format=triple");
  });

  it("the Classificata and the Conquista stay themselves", () => {
    expect(lastPlayHref(rematchOf({ mode: "ranked", format: "quadrant", bot_difficulty: null }, FIRST_PLAY))).toBe(
      "/squadra/?mode=ranked&format=quadrant",
    );
    expect(lastPlayHref(rematchOf({ mode: "conquest", format: "classic", bot_difficulty: null }, null))).toBe("/squadra/?mode=conquest");
    // Conquista against the bot of §6.5: still the Conquista.
    expect(rematchOf({ mode: "conquest", format: "classic", bot_difficulty: "medium" }, null)).toEqual({ mode: "conquest", format: "classic" });
  });

  it("online: a friend code again when this device set off one for this match, else the random queue", () => {
    const lobby: LastPlay = { mode: "lobby", format: "boss" };
    expect(rematchOf({ mode: "friendly", format: "boss", bot_difficulty: null }, lobby)).toEqual(lobby);
    expect(rematchOf({ mode: "friendly", format: "boss", bot_difficulty: null }, { mode: "queue", format: "boss" })).toEqual({
      mode: "queue",
      format: "boss",
    });
    // The device's last play is another one (another mode, another challenge, none): the queue.
    expect(rematchOf({ mode: "friendly", format: "classic", bot_difficulty: null }, lobby).mode).toBe("queue");
    expect(rematchOf({ mode: "friendly", format: "boss", bot_difficulty: null, challenge: sfida }, lobby).mode).toBe("queue");
    expect(
      rematchOf({ mode: "friendly", format: "boss", bot_difficulty: null }, { ...lobby, challenge: { id: "c1", title: "x" } }).mode,
    ).toBe("queue");
    expect(rematchOf({ mode: "friendly", format: "boss", bot_difficulty: null }, null).mode).toBe("queue");
    const challengeLobby: LastPlay = { mode: "lobby", format: "classic", challenge: { id: "c1", title: "Notte dei Figli" } };
    expect(
      lastPlayHref(rematchOf({ mode: "friendly", format: "classic", bot_difficulty: null, challenge: sfida }, challengeLobby)),
    ).toBe("/squadra/?sfida=c1&mode=lobby");
  });
});

describe("playBlock: a play that cannot be set off again", () => {
  const now = Date.parse("2026-11-20T12:00:00Z");
  const running = { id: "c1", starts_at: "2026-11-18T00:00:00Z", ends_at: "2026-11-25T00:00:00Z", daily_limit: 3, plays_today: 1 };
  const play: LastPlay = { mode: "bot", format: "classic", difficulty: "easy", challenge: { id: "c1", title: "Notte dei Figli" } };
  const open = { unlocked: true, completed_matches: 12, level: 6, cards_lost_today: 2 };
  const conquest: LastPlay = { mode: "conquest", format: "classic" };

  it("lets a running challenge and an open Conquista through", () => {
    expect(playBlock(play, { now, challenges: [running], conquest: null })).toBeNull();
    expect(playBlock(conquest, { now, challenges: null, conquest: open })).toBeNull();
    expect(playBlock(FIRST_PLAY, { now, challenges: [], conquest: null })).toBeNull();
  });

  it("stops nothing it does not know yet", () => {
    expect(playBlock(play, { now, challenges: null, conquest: null })).toBeNull();
    expect(playBlock(conquest, { now, challenges: null, conquest: null })).toBeNull();
  });

  it("a challenge over or gone from the list; one not yet begun is the server's to refuse", () => {
    expect(playBlock(play, { now, challenges: [{ ...running, ends_at: "2026-11-20T11:00:00Z" }], conquest: null })).toEqual({
      kind: "challenge_over",
    });
    expect(playBlock(play, { now, challenges: [{ ...running, starts_at: "2026-11-21T00:00:00Z" }], conquest: null })).toBeNull();
    const queue: LastPlay = { mode: "queue", format: "classic", challenge: { id: "c1", title: "x" } };
    expect(playBlock(queue, { now, challenges: [], conquest: null })).toEqual({ kind: "challenge_over" });
  });

  it("a challenge with today's matches used up", () => {
    const block = playBlock(play, { now, challenges: [{ ...running, plays_today: 3 }], conquest: null });
    expect(block).toEqual({ kind: "challenge_daily_limit", limit: 3 });
    expect(describePlayBlock(block!).short).toBe("Partite di oggi finite (3/3)");
    expect(playBlock(play, { now, challenges: [{ ...running, daily_limit: null, plays_today: 40 }], conquest: null })).toBeNull();
  });

  it("a Conquista locked or closed for the day", () => {
    const { unlockAfterMatches, unlockAtLevel, maxCardsLostPerDay } = balance.conquest;
    const locked = playBlock(conquest, { now, challenges: null, conquest: { ...open, unlocked: false, completed_matches: 2 } });
    expect(locked).toEqual({ kind: "conquest_locked", completed: 2 });
    expect(describePlayBlock(locked!).long).toBe(
      `La Conquista si sblocca dopo ${unlockAfterMatches} partite (2/${unlockAfterMatches}) o al livello ${unlockAtLevel}.`,
    );
    const limit = playBlock(conquest, { now, challenges: null, conquest: { ...open, cards_lost_today: maxCardsLostPerDay } });
    expect(limit).toEqual({ kind: "conquest_limit" });
    expect(describePlayBlock(limit!).short).toBe("Conquista: riapre a mezzanotte");
  });

  it("never touches the plays without a challenge, nor the Classificata", () => {
    const over = [{ ...running, ends_at: "2026-11-19T00:00:00Z" }];
    expect(playBlock({ mode: "ranked", format: "boss" }, { now, challenges: over, conquest: null })).toBeNull();
    const hard: LastPlay = { mode: "bot", format: "classic", difficulty: "hard" };
    expect(playBlock(hard, { now, challenges: over, conquest: { ...open, unlocked: false } })).toBeNull();
  });
});
