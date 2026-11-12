"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useRequireSignedIn } from "@/components/auth-provider";
import { PrizeCard, ZoomHint } from "@/components/card-zoom";
import { BackLink } from "@/components/comic-parts";
import { LoadingScreen } from "@/components/loading-screen";
import { fetchAbilities, seenAbilities, type AbilityInfo } from "@/lib/catalog";
import { describeServerError } from "@/lib/errors";
import { DIFFICULTY_LABELS } from "@/lib/match";
import { chapterUnlocked, fetchStory, type StoryChapter, type StoryMission } from "@/lib/story";
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
  const [shown, setShown] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  // The page fits the screen and never scrolls (see .game-shell): one chapter at a time, and
  // an open mission takes the place of the list, with its row on top as the way back.
  useLockedScreen(true);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    fetchStory()
      .then((next) => {
        if (cancelled) return;
        setChapters(next);
        // The chapter chosen in Gioca, or the one with the next mission to play; with all done, the last one.
        // Its next mission to play starts open.
        const chosen = next.findIndex((c) => c.chapter === asked);
        const playing = next.findIndex((c) => c.missions.some((m) => m.unlocked && !m.completed));
        const index = chosen !== -1 ? chosen : playing !== -1 ? playing : Math.max(0, next.length - 1);
        setShown(index);
        setOpen(next[index]?.missions.find((m) => m.unlocked && !m.completed)?.code ?? null);
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
  }, [session, asked]);

  if (error) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm font-semibold text-comic-magenta">{error}</p>
        <Link href="/gioca" className="flex min-h-11 items-center text-sm font-bold underline">
          Torna a Gioca
        </Link>
      </main>
    );
  }
  if (!chapters) return <LoadingScreen label="Apertura della Storia…" />;

  const chapter = chapters[shown];
  const mission = chapter?.missions.find((m) => m.code === open && m.unlocked) ?? null;
  const allDone = chapters.every((c) => c.missions.every((m) => m.completed));
  const firstLocked = chapter?.missions.find((m) => !m.unlocked)?.code;

  return (
    <div className="game-shell">
      <header className="flex shrink-0 items-center gap-2.5 px-3 pb-1 pt-2">
        <BackLink href="/gioca" label="Torna a Gioca" />
        <h1 className="font-display text-4xl uppercase text-comic-yellow">Storia</h1>
      </header>

      {/* What a short window cannot fit scrolls inside, rather than being cut. */}
      <main data-keep-scroll="main" className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-1">
        {chapter && (
          <ChapterBanner
            chapter={chapter}
            compact={mission !== null}
            onPrev={!mission && shown > 0 ? () => setShown(shown - 1) : undefined}
            onNext={!mission && shown < chapters.length - 1 ? () => setShown(shown + 1) : undefined}
            paged={!mission && chapters.length > 1}
          />
        )}
        {mission ? (
          <MissionDetail mission={mission} abilities={abilities} onClose={() => setOpen(null)} />
        ) : (
          <>
            <ol className="flex flex-col gap-1">
              {chapter?.missions.map((m) => (
                <li key={m.code} className={`bg-panel ${m.unlocked ? "" : "opacity-60"}`}>
                  <MissionRow mission={m} open={false} onToggle={() => setOpen(m.code)} />
                  {/* Once, under the first locked one: the others wait behind it. */}
                  {m.code === firstLocked && (
                    <p className="-mt-1 pb-1.5 pl-15 pr-3 text-xs font-medium leading-4 text-muted">
                      {m.ord === 1 && shown > 0
                        ? `Completa il Capitolo ${chapters[shown - 1].chapter} per sbloccarlo.`
                        : "Completa la missione precedente."}
                    </p>
                  )}
                </li>
              ))}
            </ol>
            {/* The server sends it only once every mission of the chapter is completed. */}
            {chapter?.outro && (
              <section className="shrink-0 bg-panel px-3 py-2.5">
                <p className="text-xs font-extrabold uppercase text-comic-yellow">Com&apos;è finita</p>
                <p className="mt-1 text-sm font-medium">{chapter.outro}</p>
              </section>
            )}
            {allDone && shown === chapters.length - 1 && (
              <p className="text-sm font-semibold text-comic-cyan">
                {/* Season 1 is the whole story for now: change this when a season 2 chapter comes out. */}
                Hai finito la Stagione 1, Il Rintocco. La prossima stagione arriva presto.
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}

/** The chapter on screen. Open on a mission it keeps to its name; with several chapters, arrows page through them. */
function ChapterBanner({
  chapter,
  compact,
  paged,
  onPrev,
  onNext,
}: {
  chapter: StoryChapter;
  compact: boolean;
  paged: boolean;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const done = chapter.missions.filter((m) => m.completed).length;
  const progress = chapterUnlocked(chapter) ? `${done}/${chapter.missions.length} missioni` : "da sbloccare 🔒";
  return (
    <div className={`cut-bottom relative shrink-0 overflow-hidden bg-comic-magenta px-4 text-black ${compact ? "pb-5 pt-2" : "pb-6 pt-3"}`}>
      <div aria-hidden className="halftone absolute inset-0 [mask-image:linear-gradient(135deg,transparent_45%,#000_100%)]" />
      <div className="relative">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-extrabold">
            Capitolo {chapter.chapter} · {progress}
          </p>
          {paged && (
            <div className="-my-1 flex shrink-0 gap-1.5">
              <PageArrow label="Capitolo precedente" path="M12 3 5 10l7 7" onClick={onPrev} />
              <PageArrow label="Capitolo successivo" path="m8 3 7 7-7 7" onClick={onNext} />
            </div>
          )}
        </div>
        <h2 className={`font-display uppercase ${compact ? "text-[28px] leading-8" : "text-[34px] leading-10"}`}>{chapter.title}</h2>
        {!compact && <p className="mt-1 text-sm font-semibold">{chapter.intro}</p>}
      </div>
    </div>
  );
}

function PageArrow({ label, path, onClick }: { label: string; path: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={!onClick}
      className="flex h-11 w-11 -skew-x-8 items-center justify-center bg-black text-comic-yellow disabled:opacity-30"
    >
      <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={3} aria-hidden>
        <path d={path} strokeLinejoin="round" />
      </svg>
    </button>
  );
}

/** A mission on the list: a tap opens it in place of the list. Open, it stays on top as the way back. */
function MissionRow({ mission, open, onToggle }: { mission: StoryMission; open: boolean; onToggle: () => void }) {
  const state = mission.completed ? "Completata" : "Da giocare";
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={!mission.unlocked}
      aria-expanded={open}
      aria-label={open ? `${mission.title}: torna alle missioni` : undefined}
      className="flex min-h-12 w-full items-center gap-3 px-3 py-1 text-left"
    >
      <span
        className={`flex h-9 w-9 shrink-0 -skew-x-8 items-center justify-center font-display text-xl ${
          mission.completed ? "bg-comic-cyan text-black" : mission.unlocked ? "bg-comic-yellow text-black" : "bg-panel-raised text-faint"
        }`}
      >
        {mission.completed ? "✓" : mission.ord}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block font-display text-xl uppercase leading-[26px] ${open ? "" : "truncate"}`}>{mission.title}</span>
        <span className="block truncate text-xs font-semibold leading-4 text-muted">
          {mission.opponent} · {DIFFICULTY_LABELS[mission.bot_difficulty]}
        </span>
      </span>
      {open ? (
        <svg viewBox="0 0 14 14" className="h-5 w-5 shrink-0" stroke="currentColor" strokeWidth={2.6} aria-hidden>
          <path d="M1 1l12 12M13 1 1 13" />
        </svg>
      ) : (
        <span className={`shrink-0 text-xs font-bold uppercase ${mission.completed ? "text-comic-cyan" : "text-muted"}`}>
          {mission.unlocked ? state : "🔒"}
        </span>
      )}
    </button>
  );
}

/** An open mission: its story, the Threats, the prize and the way to play it, filling the room under the chapter. */
function MissionDetail({
  mission,
  abilities,
  onClose,
}: {
  mission: StoryMission;
  abilities: AbilityInfo[] | null;
  onClose: () => void;
}) {
  const state = mission.completed ? "Completata" : "Da giocare";
  const prize = (
    <div className="flex flex-col gap-1.5">
      <p className={`text-xs font-extrabold uppercase ${mission.completed ? "text-comic-cyan" : "text-comic-yellow"}`}>{state}</p>
      <p className="text-sm font-bold">
        {mission.completed
          ? "Premio già ottenuto: puoi rigiocarla senza premi."
          : `Premio: ${mission.reward_coins} monete${mission.reward_card ? ` e la carta ${mission.reward_card.name}` : ""}.`}
      </p>
      <p className="text-xs font-medium text-faint">
        Il premio di una missione si riceve una volta sola, alla prima vittoria. Le carte ricevute sono normali e si
        possono perdere in Conquista.
      </p>
    </div>
  );

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-panel">
      <MissionRow mission={mission} open onToggle={onClose} />
      <div className="flex min-h-0 flex-1 flex-col gap-3 px-3 pb-3 pt-1">
        <p className="shrink-0 text-sm font-medium">{mission.intro}</p>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5" aria-label="Livelli delle Minacce">
          <span className="text-xs font-bold text-muted">Minacce:</span>
          {mission.threat_levels.map((level, i) => (
            <span key={i} className="-skew-x-8 bg-black px-2 font-display text-lg text-comic-yellow">
              {level}
            </span>
          ))}
        </div>
        {mission.reward_card ? (
          <PrizeCard card={mission.reward_card} abilities={abilities} backLabel="Torna alla missione" className="flex-[1_1_0]">
            {prize}
            <ZoomHint />
          </PrizeCard>
        ) : (
          <div className="flex-[1_1_0]">{prize}</div>
        )}
        <Link href={`/squadra/?story=${mission.code}`} className="btn btn-primary shrink-0">
          Scegli la squadra
        </Link>
      </div>
    </section>
  );
}
