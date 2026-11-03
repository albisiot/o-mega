"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRequireSignedIn } from "@/components/auth-provider";
import { CardView } from "@/components/card-view";
import { PageHeader } from "@/components/comic-parts";
import { LoadingScreen } from "@/components/loading-screen";
import { describeServerError } from "@/lib/errors";
import { DIFFICULTY_LABELS } from "@/lib/match";
import { fetchStory, type StoryChapter, type StoryMission } from "@/lib/story";

export default function StoryPage() {
  const { session } = useRequireSignedIn();
  const [chapters, setChapters] = useState<StoryChapter[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    fetchStory()
      .then((next) => {
        if (cancelled) return;
        setChapters(next);
        // The next mission to play starts open.
        setOpen(next.flatMap((c) => c.missions).find((m) => m.unlocked && !m.completed)?.code ?? null);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(describeServerError(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

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

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader backHref="/gioca" backLabel="Gioca" title="Storia" />
      <main className="flex flex-1 flex-col gap-6 px-3 pb-6">
        {chapters.map((chapter) => {
          const done = chapter.missions.filter((m) => m.completed).length;
          return (
            <section key={chapter.chapter} className="flex flex-col gap-3">
              <div className="cut-bottom relative overflow-hidden bg-comic-magenta px-4 pb-6 pt-3 text-black">
                <div aria-hidden className="halftone absolute inset-0 [mask-image:linear-gradient(135deg,transparent_45%,#000_100%)]" />
                <div className="relative">
                  <p className="text-sm font-extrabold">
                    Capitolo {chapter.chapter} · {done}/{chapter.missions.length} missioni
                  </p>
                  <h2 className="font-display text-[34px] uppercase leading-10">{chapter.title}</h2>
                  <p className="mt-1 text-sm font-semibold">{chapter.intro}</p>
                </div>
              </div>
              <ol className="flex flex-col gap-1.5">
                {chapter.missions.map((mission) => (
                  <MissionRow
                    key={mission.code}
                    mission={mission}
                    open={open === mission.code}
                    onToggle={() => setOpen(open === mission.code ? null : mission.code)}
                  />
                ))}
              </ol>
            </section>
          );
        })}
        <p className="text-xs font-medium text-faint">
          Il premio di una missione si riceve una volta sola, alla prima vittoria. Le carte ricevute sono normali e si
          possono perdere in Conquista.
        </p>
      </main>
    </div>
  );
}

function MissionRow({ mission, open, onToggle }: { mission: StoryMission; open: boolean; onToggle: () => void }) {
  const state = mission.completed ? "Completata" : mission.unlocked ? "Da giocare" : "Bloccata";
  return (
    <li className={`bg-panel ${mission.unlocked ? "" : "opacity-60"}`}>
      <button
        type="button"
        onClick={onToggle}
        disabled={!mission.unlocked}
        aria-expanded={open}
        className="flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left"
      >
        <span
          className={`flex h-9 w-9 shrink-0 -skew-x-8 items-center justify-center font-display text-xl ${
            mission.completed ? "bg-comic-cyan text-black" : mission.unlocked ? "bg-comic-yellow text-black" : "bg-panel-raised text-faint"
          }`}
        >
          {mission.completed ? "✓" : mission.ord}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-xl uppercase">{mission.title}</span>
          <span className="block truncate text-xs font-semibold text-muted">
            {mission.opponent} · {DIFFICULTY_LABELS[mission.bot_difficulty]}
          </span>
        </span>
        <span className={`shrink-0 text-xs font-bold uppercase ${mission.completed ? "text-comic-cyan" : "text-muted"}`}>
          {mission.unlocked ? state : "🔒"}
        </span>
      </button>
      {!mission.unlocked && <p className="px-3 pb-2 text-xs font-medium text-muted">Completa la missione precedente.</p>}
      {open && mission.unlocked && (
        <div className="flex flex-col gap-3 px-3 pb-3">
          <p className="text-sm font-medium">{mission.intro}</p>
          <div className="flex flex-wrap items-center gap-1.5" aria-label="Livelli delle Minacce">
            <span className="text-xs font-bold text-muted">Minacce:</span>
            {mission.threat_levels.map((level, i) => (
              <span key={i} className="-skew-x-8 bg-black px-2 font-display text-lg text-comic-yellow">
                {level}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {mission.reward_card && (
              <div className="w-24 shrink-0">
                <CardView card={mission.reward_card} size="sm" thumbSizes="88px" />
              </div>
            )}
            <p className="text-sm font-bold">
              {mission.completed
                ? "Premio già ottenuto: puoi rigiocarla senza premi."
                : `Premio: ${mission.reward_coins} monete${mission.reward_card ? ` e la carta ${mission.reward_card.name}` : ""}.`}
            </p>
          </div>
          <Link href={`/squadra/?story=${mission.code}`} className="btn btn-primary">
            Scegli la squadra
          </Link>
        </div>
      )}
    </li>
  );
}
