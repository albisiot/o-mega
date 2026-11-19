import { describe, expect, it } from "vitest";
import type { StoryChapter, StoryMission } from "@/lib/story";
import { playedMission, storyPlace } from "@/lib/story-place";

function mission(chapter: number, ord: number, completed: boolean, unlocked: boolean): StoryMission {
  return {
    code: `C${chapter}M${ord}`,
    ord,
    title: "Missione",
    intro: "",
    opponent: "Bot",
    bot_difficulty: "easy",
    threat_levels: [],
    reward_coins: 20,
    reward_card: null,
    completed,
    unlocked,
    star_coins: 10,
    stars: [],
    star_rarities: [],
    star_rarity_names: [],
    star_traits: [],
    star_traits_text: [],
  };
}

/** Three chapters of three missions: `done` missions completed, the next one unlocked. */
function story(done: number): StoryChapter[] {
  return [1, 2, 3].map((chapter) => ({
    chapter,
    season: 1,
    season_title: "Stagione",
    number: chapter,
    title: `Capitolo ${chapter}`,
    intro: "",
    outro: null,
    season_ending: null,
    missions: [1, 2, 3].map((ord) => {
      const index = (chapter - 1) * 3 + ord - 1;
      return mission(chapter, ord, index < done, index <= done);
    }),
  }));
}

describe("storyPlace, opened afresh", () => {
  it("opens the chapter with the next mission to play, that mission open", () => {
    expect(storyPlace(story(4), null, null)).toEqual({ chapter: 2, mission: "C2M2" });
  });

  it("opens the chapter asked, with its next mission to play if it has one", () => {
    expect(storyPlace(story(4), 2, null)).toEqual({ chapter: 2, mission: "C2M2" });
    expect(storyPlace(story(4), 1, null)).toEqual({ chapter: 1, mission: null });
  });

  it("ignores a chapter that does not exist", () => {
    expect(storyPlace(story(4), 9, null)).toEqual({ chapter: 2, mission: "C2M2" });
  });

  it("opens the last chapter's list once everything is done", () => {
    expect(storyPlace(story(9), null, null)).toEqual({ chapter: 3, mission: null });
  });

  it("has no place without chapters", () => {
    expect(storyPlace([], null, null)).toBeNull();
    expect(storyPlace([], null, playedMission("C1M1"))).toBeNull();
  });
});

describe("storyPlace, coming back", () => {
  it("reopens an old mission just replayed, not the next one to play", () => {
    expect(storyPlace(story(7), null, playedMission("C1M2"))).toEqual({ chapter: 1, mission: "C1M2" });
  });

  it("keeps the mission just won open when it unlocked the next one", () => {
    // C2M2 was won for the first time: C2M3 is now the next one to play.
    expect(storyPlace(story(5), null, playedMission("C2M2"))).toEqual({ chapter: 2, mission: "C2M2" });
    // The last mission of a chapter: the next chapter opened, the player stays on it.
    expect(storyPlace(story(6), null, playedMission("C2M3"))).toEqual({ chapter: 2, mission: "C2M3" });
  });

  it("reopens a mission lost, the one still to play", () => {
    expect(storyPlace(story(4), null, playedMission("C2M2"))).toEqual({ chapter: 2, mission: "C2M2" });
  });

  it("finds the mission's chapter whatever chapter it was left with", () => {
    expect(storyPlace(story(7), null, { chapter: 3, mission: "C1M1" })).toEqual({ chapter: 1, mission: "C1M1" });
  });

  it("wins over the chapter asked in the address", () => {
    expect(storyPlace(story(7), 3, playedMission("C1M3"))).toEqual({ chapter: 1, mission: "C1M3" });
  });

  it("reopens a chapter's list left open", () => {
    expect(storyPlace(story(7), null, { chapter: 1, mission: null })).toEqual({ chapter: 1, mission: null });
  });

  it("shows the list of a mission that is locked", () => {
    expect(storyPlace(story(1), null, { chapter: 1, mission: "C1M3" })).toEqual({ chapter: 1, mission: null });
  });

  it("falls back to its chapter, then to a fresh opening, when the mission is gone", () => {
    expect(storyPlace(story(7), null, { chapter: 1, mission: "C9M9" })).toEqual({ chapter: 1, mission: null });
    expect(storyPlace(story(7), null, playedMission("C9M9"))).toEqual({ chapter: 3, mission: "C3M2" });
    expect(storyPlace(story(7), null, { chapter: 8, mission: null })).toEqual({ chapter: 3, mission: "C3M2" });
  });

  it("ignores what an older page left in the session", () => {
    expect(storyPlace(story(7), null, "C1M1")).toEqual({ chapter: 3, mission: "C3M2" });
    expect(storyPlace(story(7), null, { shown: 0, open: "C1M1" })).toEqual({ chapter: 3, mission: "C3M2" });
    expect(storyPlace(story(7), null, { chapter: "1", mission: 2 })).toEqual({ chapter: 3, mission: "C3M2" });
  });
});
