"use client";

// Fixed scenes to try every way back without an account (src/lib/nav-history.ts). A
// development-only page: next.config.ts serves *.dev.tsx pages in `next dev` only, so it is
// never part of the published site. Each scene stands for a page of the app, with the same back
// controls; nothing is sent to the server.
//   /prova-indietro/?p=home    links to the other scenes
//   ?p=squadra                 "Avvia contro il bot" replaces it with the match, "Cerca" opens the wait
//   ?p=attesa                  a step the history steps over (as /attesa); "Trovato!" starts the match
//   ?p=storia                  the real Storia view on fixed chapters (as /storia, from Gioca)
//   ?p=squadra-storia&m=C1M2   a mission's team picker: "Inizia la missione" replaces it with the match
//   ?p=partita-storia&m=C1M2   the mission's result: "Torna alla Storia" reopens that mission
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { BackLink, PageHeader } from "@/components/comic-parts";
import { GoBackLink, ReturnLink } from "@/components/return-link";
import { StoryView, useStoryPlace } from "@/components/story-view";
import { navHistory, usePreviousPage } from "@/lib/nav-history";
import type { StoryChapter } from "@/lib/story";
import { STORY_PLACE, playedMission } from "@/lib/story-place";
import type { StoryStar } from "@/lib/story-stars";
import { useLockedScreen } from "@/lib/use-locked-screen";

const PAGE = "/prova-indietro/";
const at = (scene: string) => `${PAGE}?p=${scene}`;

export default function BackTrialPage() {
  return (
    <Suspense fallback={null}>
      <Scene />
    </Suspense>
  );
}

/** The page a scene's back arrow falls back to. */
const PARENTS: Record<string, string> = { squadra: "gioca", "squadra-storia": "storia", "partita-storia": "storia" };

function Scene() {
  const params = useSearchParams();
  const scene = params.get("p") ?? "home";
  const missionCode = params.get("m") ?? "C1M2";
  const router = useRouter();
  const previous = usePreviousPage();
  const [record, setRecord] = useState("");

  useEffect(() => {
    // The waiting page is a step the history steps over.
    if (scene === "attesa") navHistory()?.consumeCurrent();
  }, [scene]);

  useEffect(() => {
    const show = () => {
      const nav = navHistory();
      setRecord(`qui ${nav?.current() ?? "?"} · indietro → ${nav?.previous() ?? "nessuna (fallback)"} · voci ${window.history.length}`);
    };
    show();
    return navHistory()?.subscribe(show);
  }, [scene]);

  const link = "block bg-panel px-4 py-2 font-bold underline";
  if (scene === "storia") return <StoryScene />;
  return (
    <div className="game-shell">
      {scene === "bestiario" || scene === "storico" || scene === "attesa" ? (
        <PageHeader backHref={at(scene === "storico" ? "profilo" : scene === "attesa" ? "gioca" : "collezione")} title={scene} />
      ) : (
        <header className="flex items-center gap-2.5 px-3 py-1">
          {scene !== "home" && <BackLink href={at(PARENTS[scene] ?? "home")} />}
          <h1 className="font-display text-[28px] uppercase text-comic-yellow">{scene}</h1>
        </header>
      )}
      <main className="flex flex-col gap-2 px-4">
        <p data-testid="record" className="text-xs text-muted">
          {record} · prima pagina: {previous ?? "—"}
        </p>
        {scene === "home" && (
          <>
            <Link className={link} href={at("profilo")}>Profilo</Link>
            <Link className={link} href={at("gioca")}>Gioca</Link>
            <Link className={link} href={at("collezione")}>Collezione</Link>
          </>
        )}
        {scene === "profilo" && (
          <>
            <Link className={link} href={at("bestiario")}>Bestiario</Link>
            <Link className={link} href={at("storico")}>Storico</Link>
          </>
        )}
        {scene === "collezione" && (
          <Link className={link} href={at("bestiario")}>Bestiario</Link>
        )}
        {scene === "storico" && <Link className={link} href={at("partita")}>Partita finita</Link>}
        {scene === "gioca" && (
          <>
            <Link className={link} href={at("squadra")}>Squadra</Link>
            <Link className={link} href={at("storia")}>Storia</Link>
          </>
        )}
        {scene === "squadra-storia" && (
          <button type="button" className="btn btn-primary" onClick={() => router.replace(at(`partita-storia&m=${missionCode}`))}>
            Inizia la missione {missionCode}
          </button>
        )}
        {scene === "partita-storia" && (
          <>
            <p className="font-bold">Fine della missione {missionCode}</p>
            <ReturnLink href={at("storia")} state={{ [STORY_PLACE]: playedMission(missionCode) }} className="btn btn-primary">
              Torna alla Storia
            </ReturnLink>
            <ReturnLink href={at("home")} className="btn btn-ghost">
              Torna alla home
            </ReturnLink>
          </>
        )}
        {scene === "squadra" && (
          <>
            <button type="button" className="btn btn-primary" onClick={() => router.replace(at("partita"))}>
              Avvia contro il bot
            </button>
            <button type="button" className="btn btn-outline" onClick={() => router.push(at("attesa"))}>
              Cerca un avversario
            </button>
          </>
        )}
        {scene === "attesa" && (
          <>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                navHistory()?.consumePrevious("/prova-indietro");
                router.replace(at("partita"));
              }}
            >
              Trovato!
            </button>
            <GoBackLink fallback={at("gioca")} className="btn btn-ghost">
              {() => "Annulla"}
            </GoBackLink>
          </>
        )}
        {scene === "partita" && (
          <>
            <ReturnLink href={at("squadra")} onward className="btn btn-primary">
              Rivincita
            </ReturnLink>
            <ReturnLink href={at("gioca")} onward className="btn btn-outline">
              Gioca ancora
            </ReturnLink>
            <ReturnLink href={at("home")} className="btn btn-ghost">
              Torna alla home
            </ReturnLink>
          </>
        )}
      </main>
    </div>
  );
}

/**
 * Placeholder chapters: the first two done with a few stars, the third at its second mission.
 * Old missions to replay are in chapters 1 and 2.
 */
function storyChapters(): StoryChapter[] {
  return [1, 2, 3].map((chapter) => ({
    chapter,
    season: 1,
    season_title: "Stagione di prova",
    number: chapter,
    title: `Capitolo di prova ${chapter}`,
    intro: "Testo segnaposto del capitolo.",
    outro: chapter < 3 ? "Finale segnaposto del capitolo." : null,
    season_ending: null,
    missions: [1, 2, 3, 4, 5].map((ord) => {
      const completed = chapter < 3 || ord === 1;
      const stars: StoryStar[] = !completed ? [] : ord % 2 ? ["flawless", "rarities"] : ["traits"];
      return {
        code: `C${chapter}M${ord}`,
        ord,
        title: `Missione ${chapter}.${ord}`,
        intro: "Testo segnaposto della missione.",
        opponent: "Avversario di prova",
        bot_difficulty: "easy" as const,
        threat_levels: [1, 2, 3, 4, 5],
        reward_coins: 20,
        reward_card: null,
        completed,
        unlocked: completed || (chapter === 3 && ord === 2),
        star_coins: 10,
        stars,
        star_rarities: ["delta", "gamma"],
        star_rarity_names: ["Delta", "Gamma"],
        star_traits: ["group.custodi"],
        star_traits_text: [{ category: "Gruppo", traits: ["Custodi"] }],
      };
    }),
  }));
}

/** The Storia as the page shows it: the chapters arrive a moment after the page, as from the server. */
function StoryScene() {
  const [chapters, setChapters] = useState<StoryChapter[] | null>(null);
  const { place, setPlace, settle } = useStoryPlace();
  useLockedScreen(true);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve(storyChapters()).then((next) => {
      if (cancelled) return;
      setChapters(next);
      settle(next, null);
    });
    return () => {
      cancelled = true;
    };
  }, [settle]);

  if (!chapters) return null;
  return (
    <StoryView
      chapters={chapters}
      abilities={null}
      place={place}
      onPlace={setPlace}
      backHref={at("gioca")}
      teamHref={(code) => at(`squadra-storia&m=${code}`)}
    />
  );
}
