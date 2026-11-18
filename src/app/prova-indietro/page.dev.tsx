"use client";

// Fixed scenes to try every way back without an account (src/lib/nav-history.ts). A
// development-only page: next.config.ts serves *.dev.tsx pages in `next dev` only, so it is
// never part of the published site. Each scene stands for a page of the app, with the same back
// controls; nothing is sent to the server.
//   /prova-indietro/?p=home    links to the other scenes
//   ?p=squadra                 "Avvia contro il bot" replaces it with the match, "Cerca" opens the wait
//   ?p=attesa                  a step the history steps over (as /attesa); "Trovato!" starts the match
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { BackLink, PageHeader } from "@/components/comic-parts";
import { GoBackLink, ReturnLink } from "@/components/return-link";
import { navHistory, usePreviousPage } from "@/lib/nav-history";

const PAGE = "/prova-indietro/";
const at = (scene: string) => `${PAGE}?p=${scene}`;

export default function BackTrialPage() {
  return (
    <Suspense fallback={null}>
      <Scene />
    </Suspense>
  );
}

function Scene() {
  const scene = useSearchParams().get("p") ?? "home";
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
  return (
    <div className="game-shell">
      {scene === "bestiario" || scene === "storico" || scene === "attesa" ? (
        <PageHeader backHref={at(scene === "storico" ? "profilo" : scene === "attesa" ? "gioca" : "collezione")} title={scene} />
      ) : (
        <header className="flex items-center gap-2.5 px-3 py-1">
          {scene !== "home" && <BackLink href={at(scene === "squadra" ? "gioca" : "home")} />}
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
        {scene === "gioca" && <Link className={link} href={at("squadra")}>Squadra</Link>}
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
