"use client";

import { useEffect, useState } from "react";
import { useRequireSignedIn } from "@/components/auth-provider";
import { EventBanner } from "@/components/event-banner";
import { LoadingScreen } from "@/components/loading-screen";
import { PlayMenuView, type EmergencyThisWeek, type EmergencyToday } from "@/components/play-menu";
import { fetchChallenges, seenChallenges, type Challenge } from "@/lib/challenges";
import { fetchCoop, seenCoop, type CoopCatalog } from "@/lib/coop";
import {
  fetchEmergencyLeaderboard,
  fetchEmergencyWeekLeaderboard,
  seenEmergencyLeaderboard,
  seenEmergencyWeekLeaderboard,
  type EmergencyLeaderboard,
  type EmergencyWeekLeaderboard,
} from "@/lib/emergency";
import { describeServerError } from "@/lib/errors";
import { readLastPlay, type LastPlay } from "@/lib/last-play";
import { useModeAvailability } from "@/lib/mode-availability";
import { fetchRaid, seenRaid, type RaidCatalog } from "@/lib/raid";
import {
  fetchActiveMatch,
  fetchConquestStatus,
  forfeitMatch,
  seenActiveMatch,
  seenConquestStatus,
  type ActiveMatch,
  type ConquestStatus,
} from "@/lib/match";
import { fetchMyRanked, seenRanked, type MyRanked } from "@/lib/ranked";
import { fetchStory, seenStory, type StoryChapter } from "@/lib/story";
import { useLockedScreen } from "@/lib/use-locked-screen";
import { useNow } from "@/lib/use-now";

/** Today's Emergenza is done once the player is on today's board (finished runs only). */
function emergencyToday(board: EmergencyLeaderboard): EmergencyToday {
  return board.me ? { passed: board.me.passed, rank: board.me.rank } : null;
}

/** This week's Emergenza: the days left and the player's own run, finished or not. */
function emergencyThisWeek(board: EmergencyWeekLeaderboard): EmergencyThisWeek {
  return { endsAt: board.ends_at, threats: board.threats_per_run, run: board.my_run, rank: board.me?.rank ?? null };
}

export default function PlayPage() {
  const { session } = useRequireSignedIn();
  // What the server said last time shows at once (seen on the home or a visit before), and the
  // fresh answers replace it. The modes wait only when there is nothing to show.
  const [active, setActive] = useState<ActiveMatch | null | undefined>(seenActiveMatch);
  const [conquest, setConquest] = useState<ConquestStatus | null>(seenConquestStatus);
  const [ranked, setRanked] = useState<MyRanked | null>(seenRanked);
  const [emergency, setEmergency] = useState<EmergencyToday>(() => {
    const board = seenEmergencyLeaderboard();
    return board ? emergencyToday(board) : undefined;
  });
  const [emergencyWeek, setEmergencyWeek] = useState<EmergencyThisWeek>(() => {
    const board = seenEmergencyWeekLeaderboard();
    return board ? emergencyThisWeek(board) : undefined;
  });
  const [story, setStory] = useState<StoryChapter[] | null>(() => seenStory());
  // The Sfide a tema (SPEC §8.8): their ribbons on the modes.
  const [challenges, setChallenges] = useState<Challenge[] | null>(() => seenChallenges()?.challenges ?? null);
  // The Operazioni (SPEC §5.17): the chapter and the room the player is in.
  const [coop, setCoop] = useState<CoopCatalog | null | undefined>(() => seenCoop() ?? undefined);
  // The Caccia grossa (SPEC §5.18): the room the player is in, on the same tile «Insieme».
  const [raid, setRaid] = useState<RaidCatalog | null | undefined>(() => seenRaid() ?? undefined);
  // On this device only: read once, the page is left to start a match anyway.
  const [lastPlay] = useState<LastPlay | null>(() => readLastPlay());
  // When each mode is open (EDITOR): a closed one stays, under its veil.
  const modes = useModeAvailability(Boolean(session));
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
    fetchEmergencyLeaderboard()
      .then((board) => {
        if (!cancelled) setEmergency(emergencyToday(board));
      })
      .catch((cause: unknown) => console.error("Emergency board failed", cause));
    fetchEmergencyWeekLeaderboard()
      .then((board) => {
        if (!cancelled) setEmergencyWeek(emergencyThisWeek(board));
      })
      .catch((cause: unknown) => {
        console.error("Weekly Emergency board failed", cause);
        if (!cancelled) setEmergencyWeek(null);
      });
    fetchStory()
      .then((next) => {
        if (!cancelled) setStory(next);
      })
      .catch((cause: unknown) => console.error("Story failed", cause));
    fetchChallenges()
      .then((next) => {
        if (!cancelled) setChallenges(next.challenges);
      })
      .catch((cause: unknown) => console.error("Challenges failed", cause));
    fetchCoop()
      .then((next) => {
        if (!cancelled) setCoop(next);
      })
      .catch((cause: unknown) => {
        console.error("Operations failed", cause);
        if (!cancelled) setCoop(null);
      });
    fetchRaid()
      .then((next) => {
        if (!cancelled) setRaid(next);
      })
      .catch((cause: unknown) => {
        console.error("Hunt failed", cause);
        if (!cancelled) setRaid(null);
      });
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
        emergencyWeek={emergencyWeek}
        story={story}
        lastPlay={lastPlay}
        event={<EventBanner compact narrow />}
        challenges={challenges}
        coop={coop}
        raid={raid}
        modes={modes}
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
