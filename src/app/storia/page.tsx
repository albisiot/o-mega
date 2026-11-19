"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useRequireSignedIn } from "@/components/auth-provider";
import { LoadingScreen } from "@/components/loading-screen";
import { ReturnLink } from "@/components/return-link";
import { StoryView, useStoryPlace } from "@/components/story-view";
import { fetchAbilities, seenAbilities, type AbilityInfo } from "@/lib/catalog";
import { describeServerError } from "@/lib/errors";
import { fetchStory, type StoryChapter } from "@/lib/story";
import { useLockedScreen } from "@/lib/use-locked-screen";

// /storia/?capitolo=<n> opens that chapter: query string, see CLAUDE.md (static export).
export default function StoryPage() {
  return (
    <Suspense fallback={<LoadingScreen label="Apertura della Storia…" />}>
      <StoryPageContent />
    </Suspense>
  );
}

function StoryPageContent() {
  const { session } = useRequireSignedIn();
  const asked = Number(useSearchParams().get("capitolo")) || null;
  const [chapters, setChapters] = useState<StoryChapter[] | null>(null);
  const [abilities, setAbilities] = useState<AbilityInfo[] | null>(() => seenAbilities() ?? null);
  const [error, setError] = useState<string | null>(null);
  // The chapter and the mission open: coming back from a mission's match, the one just played.
  const { place, setPlace, settle } = useStoryPlace();
  // The page fits the screen and never scrolls (see .game-shell).
  useLockedScreen(true);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    fetchStory()
      .then((next) => {
        if (cancelled) return;
        setChapters(next);
        // Coming back, the mission just played or the place left; opened afresh, the chapter
        // chosen or the one with the next mission to play, that mission open (see storyPlace).
        settle(next, asked);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(describeServerError(cause));
      });
    // Only the whole card of a prize needs them, once it is tapped.
    fetchAbilities()
      .then((next) => {
        if (!cancelled) setAbilities(next);
      })
      .catch((cause: unknown) => console.error("Abilities failed", cause));
    return () => {
      cancelled = true;
    };
  }, [session, asked, settle]);

  if (error) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm font-semibold text-comic-magenta">{error}</p>
        <ReturnLink href="/gioca" className="flex min-h-11 items-center text-sm font-bold underline">
          Torna a Gioca
        </ReturnLink>
      </main>
    );
  }
  if (!chapters) return <LoadingScreen label="Apertura della Storia…" />;
  return <StoryView chapters={chapters} abilities={abilities} place={place} onPlace={setPlace} />;
}
