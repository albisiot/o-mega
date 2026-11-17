"use client";

import { useEffect, useState } from "react";
import { useRequireSignedIn } from "@/components/auth-provider";
import { EventBanner } from "@/components/event-banner";
import { LoadingScreen } from "@/components/loading-screen";
import { PlayMenuView, type EmergencyToday } from "@/components/play-menu";
import { fetchEmergencyLeaderboard } from "@/lib/emergency";
import { describeServerError } from "@/lib/errors";
import { readLastPlay, type LastPlay } from "@/lib/last-play";
import { fetchActiveMatch, fetchConquestStatus, forfeitMatch, type ActiveMatch, type ConquestStatus } from "@/lib/match";
import { fetchMyRanked, type MyRanked } from "@/lib/ranked";
import { fetchStory, seenStory, type StoryChapter } from "@/lib/story";
import { useLockedScreen } from "@/lib/use-locked-screen";
import { useNow } from "@/lib/use-now";

export default function PlayPage() {
  const { session } = useRequireSignedIn();
  const [active, setActive] = useState<ActiveMatch | null | undefined>(undefined);
  const [conquest, setConquest] = useState<ConquestStatus | null>(null);
  const [ranked, setRanked] = useState<MyRanked | null>(null);
  const [emergency, setEmergency] = useState<EmergencyToday>(undefined);
  const [story, setStory] = useState<StoryChapter[] | null>(() => seenStory());
  // On this device only: read once, the page is left to start a match anyway.
  const [lastPlay] = useState<LastPlay | null>(() => readLastPlay());
  const [error, setError] = useState<string | null>(null);
  const [confirmForfeit, setConfirmForfeit] = useState(false);
  // For the «Nuovo» badges: a minute is precise enough.
  const now = useNow(60_000);
  // The page fits the screen above the bottom bar and never scrolls (see .home-shell).
  useLockedScreen(true);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    // What blocks the modes: without it the page shows an error.
    Promise.all([fetchActiveMatch(), fetchConquestStatus()])
      .then(([match, status]) => {
        if (cancelled) return;
        setActive(match);
        setConquest(status);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(describeServerError(cause));
      });
    // The states on the tiles: without them the tiles still work.
    fetchMyRanked()
      .then((next) => {
        if (!cancelled) setRanked(next);
      })
      .catch((cause: unknown) => console.error("Ranked failed", cause));
    // Today's Emergenza is done once the player is on today's board (finished runs only).
    fetchEmergencyLeaderboard()
      .then((board) => {
        if (!cancelled) setEmergency(board.me ? { passed: board.me.passed, rank: board.me.rank } : null);
      })
      .catch((cause: unknown) => console.error("Emergency board failed", cause));
    fetchStory()
      .then((next) => {
        if (!cancelled) setStory(next);
      })
      .catch((cause: unknown) => console.error("Story failed", cause));
    return () => {
      cancelled = true;
    };
  }, [session]);

  async function forfeit(matchId: string) {
    try {
      await forfeitMatch(matchId);
      setActive(null);
      setConfirmForfeit(false);
    } catch (cause) {
      setError(describeServerError(cause));
      setConfirmForfeit(false);
    }
  }

  if (!session) return <LoadingScreen />;

  return (
    <>
      <PlayMenuView
        active={active}
        error={error}
        conquest={conquest}
        ranked={ranked}
        emergency={emergency}
        story={story}
        lastPlay={lastPlay}
        event={<EventBanner compact />}
        now={now}
        onForfeit={() => setConfirmForfeit(true)}
      />

      {/* Abandoning asks first, from the bottom like during a match. */}
      {confirmForfeit && active && (
        <>
          <button
            type="button"
            aria-label="Annulla"
            onClick={() => setConfirmForfeit(false)}
            className="fixed inset-0 z-30 bg-black/60"
          />
          <div
            role="alertdialog"
            aria-label="Abbandonare la partita?"
            className="fixed inset-x-0 bottom-0 z-40 flex flex-col gap-2 bg-comic-magenta px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 text-black"
          >
            <p className="text-sm font-bold">Abbandonare conta come sconfitta, senza monete.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => forfeit(active.id)}
                className="btn flex-1 bg-black font-display text-lg uppercase tracking-wide text-comic-yellow"
              >
                Abbandona
              </button>
              <button type="button" onClick={() => setConfirmForfeit(false)} className="btn btn-ghost">
                Annulla
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
