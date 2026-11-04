"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { resolveEmergencyPlay, type AbilityFamilies, type EmergencyRules } from "@o-mega/game-engine";
import { Silhouette } from "@/components/card-view";
import { BackLink, ComicBurst } from "@/components/comic-parts";
import { HandCard } from "@/components/hand-card";
import { InfoTip } from "@/components/info-tip";
import { LoadingScreen } from "@/components/loading-screen";
import { PlayerAvatar } from "@/components/player-avatar";
import { TeamPicker } from "@/components/team-picker";
import { ThreatDiorama } from "@/components/threat-diorama";
import { balance } from "@/config/balance";
import { thumbArtUrl } from "@/lib/art";
import { withBasePath } from "@/lib/base-path";
import { fetchAbilities, type AbilityInfo } from "@/lib/catalog";
import { fetchCatalog, type CatalogCard } from "@/lib/collection";
import {
  fetchEmergencyLeaderboard,
  openEmergency,
  playEmergency,
  startEmergency,
  type EmergencyLeaderboard,
  type EmergencyPlay,
  type EmergencyRank,
  type EmergencyRun,
  type EmergencyView,
} from "@/lib/emergency";
import { describeServerError } from "@/lib/errors";
import { fetchInstanceDefinitions, fetchOwnedInstances, toCharacter, type VariantCopy } from "@/lib/match";
import { rarityFrame, rarityLetter } from "@/lib/rarity-theme";
import { useLockedScreen } from "@/lib/use-locked-screen";

/** Today's challenge from the levels to the final result. */
export function EmergencyScreen({ initial }: { initial: EmergencyView }) {
  const [view, setView] = useState(initial);
  const [revealing, setRevealing] = useState<EmergencyPlay | null>(null);
  const [abilities, setAbilities] = useState<AbilityInfo[]>([]);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    fetchAbilities()
      .then(setAbilities)
      .catch((cause: unknown) => console.error("Abilities failed", cause));
  }, []);

  function applyPlay(next: EmergencyView) {
    setView(next);
    setRevealing(next.run?.plays.at(-1) ?? null);
  }

  const run = view.run;
  // Every step fits the screen: nothing scrolls. Before and after the attempt the page
  // has its title; while playing, one strip with the levels replaces it.
  const titled = run ? !revealing && run.status === "finished" : !picking;
  useLockedScreen(true);

  return (
    <div className="game-shell">
      {titled ? (
        <>
          <header className="flex items-center gap-2.5 px-3 py-1">
            <BackLink href="/gioca" label="Torna a Gioca" />
            <h1 className="font-display text-[25px] uppercase leading-7 text-comic-yellow">Emergenza</h1>
            <p className="ml-auto max-w-[8.5rem] text-right text-[11px] font-bold leading-[13px] text-muted">
              La sfida di oggi, uguale per tutti
            </p>
          </header>
          <LevelTrack view={view} abilities={abilities} />
        </>
      ) : (
        <header className="relative flex items-center gap-1.5 px-3 py-1">
          <BackLink href="/gioca" label="Torna a Gioca" />
          <LevelTrack view={view} abilities={abilities} inline />
        </header>
      )}
      {!run ? (
        <Briefing view={view} picking={picking} onPick={() => setPicking(true)} onStarted={setView} />
      ) : revealing ? (
        <PlayReveal
          play={revealing}
          run={run}
          maxFailures={view.rules.max_failures}
          onContinue={() => setRevealing(null)}
        />
      ) : run.status === "finished" ? (
        <RunResult run={run} rules={view.rules} />
      ) : (
        <ChoosePhase view={view} run={run} abilities={abilities} onPlayed={applyPlay} onStale={setView} />
      )}
    </div>
  );
}

/**
 * The day's levels. `inline` puts them in the choice strip; a threat foreseen with a
 * power gets an eye on its cell, and a tap shows it.
 */
function LevelTrack({ view, abilities, inline = false }: { view: EmergencyView; abilities: AbilityInfo[]; inline?: boolean }) {
  const run = view.run;
  // An open cell closes by itself when the run moves on.
  const phase = `${run?.status}:${run?.current_round}`;
  const [opened, setOpened] = useState<{ cell: number; phase: string } | null>(null);
  const open = opened?.phase === phase ? opened.cell : null;
  const openThreat = open === null ? null : (run?.foreseen_threats.find((t) => t.round === open + 1) ?? null);
  const abilityName = (code: string) => abilities.find((a) => a.code === code)?.name ?? code;

  return (
    <div className={inline ? "min-w-0 flex-1" : "relative px-3"}>
      <ol className="flex gap-1" aria-label="Livelli delle Minacce">
        {view.threat_levels.map((level, i) => {
          const play = run?.plays.find((p) => p.round === i + 1);
          const foreseen = run?.foreseen_threats.find((t) => t.round === i + 1);
          const isCurrent = run?.status === "active" && run.current_round === i + 1;
          const style = isCurrent
            ? "bg-comic-yellow text-black"
            : play?.passed
              ? "bg-comic-cyan text-black"
              : play
                ? "bg-comic-magenta text-black"
                : "border-2 border-line text-foreground";
          const outcome = play ? (play.passed ? ", superata" : ", fallita") : "";
          const label = `Livello ${level}${outcome}${foreseen ? `, Minaccia prevista: ${foreseen.name}` : ""}`;
          const cell = `relative flex w-full -skew-x-8 items-center justify-center font-display ${
            inline ? "h-11 text-lg" : "h-10 text-[20px]"
          } ${style}`;
          return (
            <li key={i} className="min-w-0 flex-1">
              {foreseen ? (
                <button
                  type="button"
                  onClick={() => setOpened(open === i ? null : { cell: i, phase })}
                  aria-expanded={open === i}
                  aria-label={label}
                  className={cell}
                >
                  {level}
                  <svg viewBox="0 0 16 10" className="absolute right-0.5 top-0.5 h-2.5 w-4" aria-hidden>
                    <path d="M1 5c2-3 4.5-4 7-4s5 1 7 4c-2 3-4.5 4-7 4S3 8 1 5z" fill="currentColor" />
                    <circle cx="8" cy="5" r="2" fill="var(--background)" />
                  </svg>
                </button>
              ) : (
                <span aria-label={label} className={cell}>
                  {level}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      {openThreat && (
        <>
          <button type="button" aria-label="Chiudi" onClick={() => setOpened(null)} className="fixed inset-0 z-20 cursor-default" />
          <div
            role="status"
            className="absolute right-3 top-full z-30 mt-1 w-60 bg-foreground px-3 py-2 text-xs font-semibold text-black shadow-[4px_4px_0_#000]"
          >
            <span className="block text-[11px] font-extrabold text-black/60">
              {openThreat.round}ª Minaccia · Livello {openThreat.level} · prevista
            </span>
            <span className="block font-display text-base uppercase">{openThreat.name}</span>
            {openThreat.abilities.map(abilityName).join(" · ")}
          </div>
        </>
      )}
    </div>
  );
}

type Collection = {
  catalog: CatalogCard[];
  owned: Map<string, string>;
  variantCopies: Map<string, VariantCopy[]>;
  instanceDefinitions: Map<string, string>;
};

/** Before the attempt: the rules, the day's levels, then the squad. */
function Briefing({
  view,
  picking,
  onPick,
  onStarted,
}: {
  view: EmergencyView;
  picking: boolean;
  onPick: () => void;
  onStarted: (next: EmergencyView) => void;
}) {
  const [collection, setCollection] = useState<Collection | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { threats_per_run: size, max_failures: maxFailures, targets, rewards } = view.rules;

  useEffect(() => {
    if (!picking || collection) return;
    let cancelled = false;
    Promise.all([fetchCatalog(), fetchOwnedInstances(), fetchInstanceDefinitions()])
      .then(([catalog, { owned, variantCopies }, instanceDefinitions]) => {
        if (!cancelled) setCollection({ catalog, owned, variantCopies, instanceDefinitions });
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(describeServerError(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [picking, collection]);

  async function start(cardInstanceIds: string[]) {
    setStarting(true);
    setError(null);
    try {
      onStarted(await startEmergency(cardInstanceIds));
    } catch (cause) {
      setError(describeServerError(cause));
      setStarting(false);
    }
  }

  if (picking) {
    return (
      <main className="flex min-h-0 flex-1 flex-col gap-2 px-3 pt-1.5">
        <p className="text-xs font-medium text-muted">
          Scegli {size} personaggi diversi guardando i livelli qui sopra: ognuno affronterà una sola Minaccia. Una volta
          iniziata, la squadra non si cambia e il tentativo di oggi è quello.
        </p>
        {error && <p className="text-sm font-semibold text-comic-magenta">{error}</p>}
        {collection ? (
          <TeamPicker
            catalog={collection.catalog}
            owned={collection.owned}
            variantCopies={collection.variantCopies}
            instanceDefinitions={collection.instanceDefinitions}
            formations={[]}
            onFormationsChanged={() => {}}
            startLabel="Inizia l'Emergenza"
            starting={starting}
            onStart={start}
            squadSize={size}
          />
        ) : (
          !error && <LoadingScreen label="Caricamento della collezione…" />
        )}
      </main>
    );
  }

  // The rules keep their size; the ranking takes the room left and scrolls inside it.
  return (
    <>
      <main className="flex min-h-0 flex-1 flex-col gap-3 px-3 pt-3 short:gap-2 short:pt-2">
        <section className="flex shrink-0 flex-col gap-1.5 text-[13px] font-medium leading-[18px] text-muted short:gap-1">
          <p>
            {size} Minacce colpiscono Nuova Megara, le stesse per tutti. Per ora conosci solo i loro livelli. Scegli{" "}
            {size} personaggi, poi mandane uno contro ogni Minaccia che si svela.
          </p>
          <p>
            Ogni Minaccia chiede un punteggio minimo. Alla {maxFailures}ª fallita l&apos;Emergenza finisce. Non rischi
            nessuna carta, ma hai un solo tentativo al giorno.
          </p>
        </section>

        <section className="flex shrink-0 flex-col gap-1">
          <h2 className="section-title">Punteggio richiesto</h2>
          <ul className="grid grid-cols-6 gap-1">
            {Object.entries(targets).map(([level, target]) => (
              <li key={level} className="flex flex-col items-center bg-panel py-1 short:py-0.5">
                <span className="text-xs font-semibold text-muted">Liv. {level}</span>
                <span className="font-display text-xl leading-6">{target}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex shrink-0 flex-col gap-1">
          <h2 className="section-title">Premi</h2>
          <ul className="grid grid-cols-3 gap-1">
            {rewards.map((reward) => (
              <li key={reward.passed} className="flex flex-col items-center bg-panel py-1 short:py-0.5">
                <span className="text-xs font-semibold text-muted">{reward.passed} Minacce superate</span>
                <span className="font-display text-xl leading-6 text-comic-yellow">
                  +{reward.coins} <span className="font-sans text-xs font-bold">monete</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <Leaderboard />
      </main>

      <div className="px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-2">
        <button type="button" onClick={onPick} className="btn btn-primary w-full">
          Scegli la squadra
        </button>
      </div>
    </>
  );
}

function ChoosePhase({
  view,
  run,
  abilities,
  onPlayed,
  onStale,
}: {
  view: EmergencyView;
  run: EmergencyRun;
  abilities: AbilityInfo[];
  onPlayed: (next: EmergencyView) => void;
  onStale: (next: EmergencyView) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const threat = run.current_threat!;

  const families: AbilityFamilies = useMemo(
    () => Object.fromEntries(abilities.map((a) => [a.code, a.family.code])),
    [abilities],
  );
  const rules: EmergencyRules = {
    threatsPerRun: view.rules.threats_per_run,
    maxFailures: view.rules.max_failures,
    targets: view.rules.targets,
    threatLevels: { ...balance.match.threatLevels, ...balance.emergency.threatLevels },
  };
  const squad = run.squad.map((card) => toCharacter(card, card.instance_id));
  const attempts = run.plays.map((play) => ({
    character: squad.find((c) => c.id === play.instance_id)!,
    passed: play.passed,
  }));
  const previews = run.squad
    .filter((card) => card.played_round === null)
    .map((card) => ({
      card,
      outcome: resolveEmergencyPlay({
        character: toCharacter(card, card.instance_id),
        threat: { id: threat.id, level: threat.level, abilities: threat.abilities },
        squad,
        attempts,
        rules,
        families,
      }),
    }))
    .sort((a, b) => b.outcome.score.total - b.outcome.required - (a.outcome.score.total - a.outcome.required));
  const chosen = previews.find(({ card }) => card.instance_id === selected)?.card;
  const abilityName = (code: string) => abilities.find((a) => a.code === code);
  const baseTarget = view.rules.targets[String(threat.level)];

  async function play() {
    if (!chosen) return;
    setBusy(true);
    setError(null);
    try {
      onPlayed(await playEmergency(threat.round, chosen.instance_id));
    } catch (cause) {
      // Another tab or device was faster: reload the state.
      if (cause instanceof Error && ["round_already_resolved", "emergency_already_played"].includes(cause.message)) {
        onStale(await openEmergency());
      } else {
        setError(describeServerError(cause));
      }
    } finally {
      setBusy(false);
    }
  }

  const chosenOutcome = previews.find(({ card }) => card === chosen)?.outcome;
  const previewNote = "Il punteggio è un'anteprima: lo calcola il server quando giochi.";

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <section className="cut-bottom relative mx-3 mt-1 flex min-h-0 flex-1 flex-col overflow-hidden bg-comic-magenta px-4 pb-5 text-black">
        <div aria-hidden className="halftone absolute inset-0 [mask-image:linear-gradient(135deg,transparent_45%,#000_100%)]" />
        {/* The diorama gets the room the screen has left, above the threat's name. */}
        <div className="relative -mx-4 min-h-9 flex-1">
          <ThreatDiorama key={threat.round} name={threat.name} level={threat.level} fill />
        </div>
        <div className="relative">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-extrabold">
                Minaccia {threat.round} di {view.rules.threats_per_run} · Livello {threat.level}
              </p>
              <p className="font-display text-[30px] uppercase leading-8">{threat.name}</p>
            </div>
            <p
              aria-label={`Servono ${baseTarget} punti`}
              className="mb-0.5 flex h-12 w-12 shrink-0 rotate-3 flex-col items-center justify-center bg-black font-display text-[26px] leading-none text-comic-yellow"
            >
              {baseTarget}
              <span aria-hidden className="mt-0.5 font-sans text-[8px] font-extrabold uppercase tracking-wide text-foreground">
                servono
              </span>
            </p>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {threat.abilities.map((code) => {
              const ability = abilityName(code);
              return (
                <span
                  key={code}
                  className="bg-black px-1.5 py-0.5 text-xs font-extrabold"
                  style={{ color: ability?.family.color ?? "#d8d3c5" }}
                >
                  {ability?.name ?? code}
                </span>
              );
            })}
          </div>
          <p className="mt-1.5 text-xs font-bold">
            <span className="font-extrabold uppercase">Emergenza</span> · Superate {run.passed} · Fallite {run.failed} su{" "}
            {view.rules.max_failures}
          </p>
        </div>
      </section>

      {error && <p className="mx-3 mt-1 text-sm font-semibold text-comic-magenta">{error}</p>}

      {/* The hand on two rows: the widest margin over the target first, as before. */}
      <div role="group" aria-label="Chi mandi?" className="grid grid-cols-4 gap-x-1.5 gap-y-3.5 px-3 pb-1.5 pt-3.5">
        {previews.map(({ card, outcome }) => (
          <HandCard
            key={card.instance_id}
            card={card}
            score={outcome.score.total}
            bonus={outcome.score.bonus}
            tone={outcome.passed ? "pass" : "fail"}
            note={outcome.required !== baseTarget ? `basta ${outcome.required}` : undefined}
            short
            // Four to a row inside the page padding and the gaps, minus each card's 3px frame.
            artSizes="calc((100vw - 66px) / 4)"
            selected={card.instance_id === selected}
            disabled={busy}
            onSelect={() => setSelected(card.instance_id)}
          />
        ))}
      </div>

      {/* The chosen card's details stay above the button, at a fixed height. */}
      <div className="border-t-[3px] border-foreground bg-black px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-2">
        <div className="mb-2 min-h-[74px]">
          {chosen && chosenOutcome ? (
            <>
              <p className="flex items-center gap-1.5">
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center text-xs font-black text-black"
                  style={{ background: rarityFrame(chosen.rarity) }}
                >
                  {rarityLetter(chosen.rarity)}
                </span>
                <span className="truncate font-display text-xl uppercase leading-6">{chosen.name}</span>
                <span className="ml-auto shrink-0 text-xs font-bold text-muted">
                  <span className={`font-display text-xl ${chosenOutcome.passed ? "text-comic-cyan" : "text-faint"}`}>
                    {chosenOutcome.score.total}
                  </span>{" "}
                  punti
                  {chosenOutcome.score.bonus > 0 && <span className="text-comic-cyan"> · +{chosenOutcome.score.bonus} bonus</span>}
                </span>
                <InfoTip text={previewNote} />
              </p>
              <p className="mt-0.5 text-xs font-semibold text-muted">
                {threat.abilities.map((code) => `${code} ${chosen.stats[code] ?? 0}`).join(" · ")} ·{" "}
                {chosenOutcome.required !== baseTarget ? (
                  <span className="text-comic-yellow">gliene bastano {chosenOutcome.required}</span>
                ) : (
                  `servono ${baseTarget}`
                )}
              </p>
              {chosen.power && (
                <p className="line-clamp-2 text-xs font-semibold leading-[15px]" style={{ color: chosen.rarity.color }}>
                  {chosen.power.name}: {chosen.power.text}
                </p>
              )}
            </>
          ) : (
            <p className="flex items-center justify-between gap-2 pt-1 text-sm font-semibold text-muted">
              Tocca una carta per vederne abilità e potere.
              <InfoTip text={previewNote} />
            </p>
          )}
        </div>
        <button type="button" onClick={play} disabled={!chosen || busy} className="btn btn-primary w-full">
          {busy ? "Invio…" : chosen ? `Manda ${chosen.name}` : "Scegli un personaggio"}
        </button>
      </div>
    </main>
  );
}

function PlayReveal({
  play,
  run,
  maxFailures,
  onContinue,
}: {
  play: EmergencyPlay;
  run: EmergencyRun;
  maxFailures: number;
  onContinue: () => void;
}) {
  const card = run.squad.find((c) => c.instance_id === play.instance_id);
  // The outcome takes the room above the button, like the threat while choosing.
  return (
    <>
      <main className="flex min-h-0 flex-1 flex-col gap-3 px-3 pt-1">
        <section
          className={`cut-bottom relative flex min-h-0 flex-1 flex-col items-center justify-center gap-2 overflow-hidden px-4 pb-8 pt-5 text-center text-black ${
            play.passed ? "bg-comic-cyan" : "halftone bg-comic-magenta"
          }`}
        >
          <p className="relative text-sm font-extrabold">{play.threat.name}</p>
          <p className="animate-rare-title text-sfx relative text-5xl uppercase text-foreground">
            {play.passed ? "Superata!" : "Fallita"}
          </p>
          <ComicBurst fill="#ffd60a" className="relative mt-1 h-28 w-28 -rotate-[8deg]" textClassName="text-[34px] tracking-wide">
            {play.score}
          </ComicBurst>
          <p className="relative font-bold">
            {card?.name ?? "?"}: servivano {play.required} punti
          </p>
          {play.bonus > 0 && (
            <p className="relative text-sm font-bold">
              {play.base} dalle abilità, +{play.bonus} dal bonus
            </p>
          )}
        </section>
        <p className="text-center text-sm font-semibold text-muted">
          Superate {run.passed} · Fallite {run.failed} su {maxFailures}
        </p>
      </main>

      <div className="px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-2">
        <button type="button" onClick={onContinue} className="btn btn-primary w-full">
          {run.status === "finished" ? "Vedi il risultato" : "Prossima Minaccia"}
        </button>
      </div>
    </>
  );
}

function RunResult({ run, rules }: { run: EmergencyRun; rules: EmergencyView["rules"] }) {
  const [tab, setTab] = useState<"day" | "board">("day");
  // Loaded once, whichever tab is open.
  const { board, failed } = useLeaderboard();
  const complete = run.passed === rules.threats_per_run;
  const cardOf = (instanceId: string) => run.squad.find((c) => c.instance_id === instanceId);

  // The outcome keeps its size; the day and the ranking share the room left, one tab at a time.
  return (
    <>
      <main className="flex min-h-0 flex-1 flex-col px-3 pt-2">
        <section
          className={`cut-bottom relative -mx-3 flex shrink-0 flex-col items-center gap-1.5 overflow-hidden px-4 pb-6 pt-2.5 text-center ${
            complete ? "rays-gold" : "bg-panel-raised"
          }`}
        >
          <p className={`text-sfx relative text-6xl uppercase ${complete ? "text-comic-magenta" : "text-foreground"}`}>
            {complete ? "Città salva!" : `${run.passed} su ${rules.threats_per_run}`}
          </p>
          <div className="relative flex flex-wrap justify-center gap-1.5">
            <p className="-skew-x-8 bg-black px-2.5 py-0.5 text-[13px] font-extrabold text-comic-yellow">
              {run.passed} Minacce superate · {run.total_score} punti
            </p>
            {run.coins > 0 && (
              <p className="-skew-x-8 bg-black px-2.5 py-0.5 text-[13px] font-extrabold text-comic-yellow">+{run.coins} monete</p>
            )}
          </div>
          <p className="relative text-[13px] font-semibold">Una nuova Emergenza arriva dopo la mezzanotte.</p>
        </section>

        <div role="tablist" aria-label="Risultato" className="mt-2.5 grid shrink-0 grid-cols-2 gap-1.5">
          {(["day", "board"] as const).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`h-11 -skew-x-8 border-2 font-display text-lg uppercase ${
                tab === key ? "border-comic-yellow bg-comic-yellow text-black" : "border-line text-foreground"
              }`}
            >
              {key === "day" ? "La tua giornata" : "Classifica"}
            </button>
          ))}
        </div>

        <div role="tabpanel" className="mt-1.5 min-h-0 flex-1 overflow-y-auto overscroll-contain pb-2">
          {tab === "day" ? (
            <ol className="flex flex-col gap-0.5">
              {run.plays.map((play) => {
                const card = cardOf(play.instance_id);
                return (
                  <li key={play.round} className="flex h-9 items-center gap-2.5 bg-panel pr-3 text-[13px] font-semibold">
                    <span aria-hidden className="relative h-full w-8 shrink-0 overflow-hidden bg-panel-raised">
                      {card?.art_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={withBasePath(thumbArtUrl(card.art_url))}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="absolute inset-0 h-full w-full object-cover object-top"
                        />
                      ) : (
                        card && (
                          <Silhouette
                            faction={card.faction}
                            accent={card.rarity.color}
                            className="absolute bottom-0 left-1/2 h-[90%] -translate-x-1/2"
                          />
                        )
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      <span className="text-muted">{play.round}. </span>
                      {card?.name ?? "—"} <span className="text-muted">contro</span> {play.threat.name}
                    </span>
                    <span className={`shrink-0 font-display text-lg ${play.passed ? "text-comic-cyan" : "text-comic-magenta"}`}>
                      {play.score}/{play.required}
                    </span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <Podium board={board} failed={failed} />
          )}
        </div>
      </main>

      <div className="flex gap-2 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-2">
        <Link href="/gioca" className="btn btn-primary flex-1">
          Gioca ancora
        </Link>
        <Link href="/" aria-label="Torna alla home" className="btn btn-ghost w-14 shrink-0 px-0">
          <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.4} aria-hidden>
            <path d="M2 10 10 3l8 7M5 8v9h4v-5h2v5h4V8" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>
    </>
  );
}

/** Today's ranking, loaded once; `failed` when it could not be loaded. */
function useLeaderboard() {
  const [board, setBoard] = useState<EmergencyLeaderboard | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchEmergencyLeaderboard()
      .then((result) => {
        if (!cancelled) setBoard(result);
      })
      .catch((cause: unknown) => {
        console.error("Leaderboard failed", cause);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { board, failed };
}

/** A place in the ranking, low enough for the lists that fit the screen. */
function RankRow({ entry }: { entry: EmergencyRank }) {
  return (
    <li
      className={`flex h-9 shrink-0 items-center justify-between gap-2 px-3 text-sm font-semibold ${
        entry.is_me ? "bg-comic-yellow text-black" : "bg-panel"
      }`}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="w-6 shrink-0 font-display text-lg">{entry.rank}</span>
        <PlayerAvatar username={entry.username} avatarUrl={entry.avatar_url} size="xs" />
        <span className="truncate">{entry.username}</span>
      </span>
      <span className="shrink-0 font-display text-lg">
        {entry.passed} <span className="font-sans text-xs font-semibold">· {entry.total_score} pt</span>
      </span>
    </li>
  );
}

/** Before the attempt: today's ranking as it stands, scrolling in the room it gets. */
function Leaderboard() {
  const { board, failed } = useLeaderboard();

  if (failed) return null;
  const meOutsideTop = board?.me && !board.top.some((entry) => entry.is_me) ? board.me : null;
  const rows = board ? [...board.top, ...(meOutsideTop ? [meOutsideTop] : [])] : [];

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-1">
      <h2 className="section-title">Classifica di oggi</h2>
      {board && rows.length === 0 && (
        <p className="text-sm font-medium text-muted">Nessuno ha ancora finito: puoi essere il primo.</p>
      )}
      <ol className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain">
        {rows.map((entry) => (
          <RankRow key={entry.rank} entry={entry} />
        ))}
      </ol>
    </section>
  );
}

/** After the attempt: the day's podium and, when lower down, the player's own place. */
function Podium({ board, failed }: { board: EmergencyLeaderboard | null; failed: boolean }) {
  if (failed) return <p className="text-sm font-medium text-muted">La classifica non è disponibile ora.</p>;
  if (!board) return null;
  const podium = board.top.slice(0, 3);
  const me = board.me ?? board.top.find((entry) => entry.is_me) ?? null;
  const meBelow = me && !podium.some((entry) => entry.is_me) ? me : null;
  if (podium.length === 0) return <p className="text-sm font-medium text-muted">Nessuno ha ancora finito: puoi essere il primo.</p>;

  return (
    <div className="flex flex-col gap-0.5">
      <ol className="flex flex-col gap-0.5">
        {podium.map((entry) => (
          <RankRow key={entry.rank} entry={entry} />
        ))}
      </ol>
      {meBelow && (
        <>
          {meBelow.rank > podium.length + 1 && (
            <p aria-hidden className="text-center font-display leading-4 tracking-[0.4em] text-faint">
              ···
            </p>
          )}
          <ol start={meBelow.rank}>
            <RankRow entry={meBelow} />
          </ol>
        </>
      )}
      <p className="mt-1 text-center text-xs font-semibold text-muted">
        {board.players === 1 ? "1 giocatore oggi" : `${board.players} giocatori oggi`}
      </p>
    </div>
  );
}
