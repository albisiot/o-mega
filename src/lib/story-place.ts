// Where the Storia page stands: the chapter on screen and the mission open on it. It is
// remembered (src/lib/place-memory.ts), so the way back from a mission's match reopens the
// mission just played, not the next one to play.
import type { StoryChapter } from "@/lib/story";

/** The name the Storia page remembers its place under (useRememberedState). */
export const STORY_PLACE = "story-place";

/**
 * The chapter on screen (`StoryChapter.chapter`) and the mission open on it, null for the
 * chapter's list. A place to come back to may name the mission alone (chapter null): it is
 * found in its chapter.
 */
export type StoryPlace = { chapter: number | null; mission: string | null };

/** The place a mission's match leads back to: that mission, open. */
export function playedMission(code: string): StoryPlace {
  return { chapter: null, mission: code };
}

/**
 * Where the Storia opens.
 * - Coming back (`back`, the place it was left at or the mission just played): that mission,
 *   open in its chapter, while it is unlocked; otherwise that chapter's list. A mission just
 *   won stays open even when it unlocked the next one: its stars are what the player sees.
 * - Opened afresh, or with nothing of `back` left: the chapter asked (/storia/?capitolo=), or
 *   the one with the next mission to play (all done: the last), with that mission open.
 * Null only without chapters.
 */
export function storyPlace(chapters: StoryChapter[], asked: number | null, back: unknown): StoryPlace | null {
  if (chapters.length === 0) return null;
  // Read back from the session's storage: it may come from an older version of the page.
  const place = back && typeof back === "object" ? (back as Partial<Record<keyof StoryPlace, unknown>>) : null;
  if (typeof place?.mission === "string") {
    const code = place.mission;
    const chapter = chapters.find((c) => c.missions.some((m) => m.code === code));
    const mission = chapter?.missions.find((m) => m.code === code);
    if (chapter && mission) return { chapter: chapter.chapter, mission: mission.unlocked ? code : null };
  }
  if (typeof place?.chapter === "number" && chapters.some((c) => c.chapter === place.chapter)) {
    return { chapter: place.chapter, mission: null };
  }
  const chosen = chapters.find((c) => c.chapter === asked);
  const playing = chapters.find((c) => c.missions.some((m) => m.unlocked && !m.completed));
  const chapter = chosen ?? playing ?? chapters[chapters.length - 1];
  return { chapter: chapter.chapter, mission: chapter.missions.find((m) => m.unlocked && !m.completed)?.code ?? null };
}
