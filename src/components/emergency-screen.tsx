"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { resolveEmergencyPlay, type AbilityFamilies, type EmergencyRules } from "@o-mega/game-engine";
import { ComicBurst, PageHeader } from "@/components/comic-parts";
import { HandCard } from "@/components/hand-card";
import { InfoTip } from "@/components/info-tip";
import { LoadingScreen } from "@/components/loading-screen";
import { PlayerAvatar } from "@/components/player-avatar";
import { TeamPicker } from "@/components/team-picker";
import { ThreatDiorama } from "@/components/threat-diorama";
import { balance } from "@/config/balance";
import { fetchAbilities, type AbilityInfo } from "@/lib/catalog";
import { fetchCatalog, type CatalogCard } from "@/lib/collection";
import {
  fetchEmergencyLeaderboard,
  openEmergency,
  playEmergency,
  startEmergency,
  type EmergencyLeaderboard,
  type EmergencyPlay,
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
  // Picking the squad and choosing fit the screen: nothing scrolls, and one strip with the
  // levels replaces the page header.
  const choosing = Boolean(run && !revealing && run.status !== "finished");
  const fitted = choosing || (!run && picking);
  useLockedScreen(fitted);

  return (
    <div className={fitted ? "game-shell" : "flex flex-1 flex-col"}>
      {fitted ? (
        <header className="relative flex items-center gap-1.5 px-3 py-1">
          <Link href="/gioca" aria-label="Torna a Gioca" className="btn btn-ghost h-11 w-11 shrink-0 px-0">
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.6} aria-hidden>
              <path d="M12 3 5 10l7 7M5 10h13" strokeLinejoin="round" />
            </svg>
          </Link>
          <LevelTrack view={view} abilities={abilities} inline />
        </header>
      ) : (
        <>
          <PageHeader backHref="/gioca" backLabel="Gioca" title="Emergenza" subtitle="La sfida di oggi, uguale per tutti" />
          <LevelTrack view={view} abilities={abilities} />
        </>
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

  return (
    <main className="flex flex-1 flex-col gap-5 px-3 pb-6 pt-4">
      <section className="flex flex-col gap-2 text-sm font-medium text-muted">
        <p>
          {size} Minacce colpiscono Nuova Megara, le stesse per tutti. Per ora conosci solo i loro livelli. Scegli{" "}
          {size} personaggi, poi mandane uno contro ogni Minaccia che si svela.
        </p>
        <p>
          Ogni Minaccia chiede un punteggio minimo. Alla {maxFailures}ª fallita l&apos;Emergenza finisce. Non rischi
          nessuna carta, ma hai un solo tentativo al giorno.
        </p>
      </section>

      <section className="flex flex-col gap-1.5">
        <h2 className="section-title">Punteggio richiesto</h2>
        <ul className="grid grid-cols-6 gap-1">
          {Object.entries(targets).map(([level, target]) => (
            <li key={level} className="flex flex-col items-center bg-panel py-1.5">
              <span className="text-xs font-semibold text-muted">Liv. {level}</span>
              <span className="font-display text-xl">{target}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-1.5">
        <h2 className="section-title">Premi</h2>
        <ul className="flex flex-col gap-0.5">
          {rewards.map((reward) => (
            <li key={reward.passed} className="flex justify-between bg-panel px-3 py-2 text-sm font-semibold">
              <span>{reward.passed} Minacce superate</span>
              <span className="text-comic-yellow">+{reward.coins} monete</span>
            </li>
          ))}
        </ul>
      </section>

      <Leaderboard />

      <button type="button" onClick={onPick} className="btn btn-primary">
        Scegli la squadra
      </button>
    </main>
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
  return (
    <main className="flex flex-1 flex-col gap-4 px-3 pb-6 pt-3">
      <section
        className={`cut-bottom relative flex flex-col items-center gap-2 overflow-hidden px-4 pb-8 pt-5 text-center text-black ${
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
      <button type="button" onClick={onContinue} className="btn btn-primary">
        {run.status === "finished" ? "Vedi il risultato" : "Prossima Minaccia"}
      </button>
    </main>
  );
}

function RunResult({ run, rules }: { run: EmergencyRun; rules: EmergencyView["rules"] }) {
  const complete = run.passed === rules.threats_per_run;
  const nameOf = (instanceId: string) => run.squad.find((c) => c.instance_id === instanceId)?.name ?? "—";
  return (
    <main className="flex flex-1 flex-col gap-5 px-3 pb-6 pt-3">
      <section
        className={`cut-bottom relative -mx-3 flex flex-col items-center gap-2 overflow-hidden px-4 pb-8 pt-5 text-center ${
          complete ? "rays-gold" : "bg-panel-raised"
        }`}
      >
        <p className={`text-sfx relative text-6xl uppercase ${complete ? "text-comic-magenta" : "text-foreground"}`}>
          {complete ? "Città salva!" : `${run.passed} su ${rules.threats_per_run}`}
        </p>
        <p className="relative -skew-x-8 bg-black px-3 py-1 text-sm font-extrabold text-comic-yellow">
          {run.passed} Minacce superate · {run.total_score} punti
        </p>
        {run.coins > 0 && (
          <p className="relative -skew-x-8 bg-black px-3 py-1 text-sm font-extrabold text-comic-yellow">+{run.coins} monete</p>
        )}
        <p className="relative text-sm font-semibold">Una nuova Emergenza arriva dopo la mezzanotte.</p>
      </section>

      <Leaderboard />

      <section className="flex flex-col gap-1.5">
        <h2 className="section-title">La tua giornata</h2>
        <ol className="flex flex-col gap-0.5">
          {run.plays.map((play) => (
            <li key={play.round} className="flex items-center justify-between gap-2 bg-panel px-3 py-2 text-sm font-semibold">
              <span className="min-w-0">
                <span className="text-muted">{play.round}. </span>
                {nameOf(play.instance_id)} <span className="text-muted">contro</span> {play.threat.name}
              </span>
              <span className={`shrink-0 font-display text-lg ${play.passed ? "text-comic-cyan" : "text-comic-magenta"}`}>
                {play.score}/{play.required}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <div className="flex flex-col gap-2">
        <Link href="/gioca" className="btn btn-primary">
          Gioca ancora
        </Link>
        <Link href="/" className="btn btn-ghost">
          Torna alla home
        </Link>
      </div>
    </main>
  );
}

function Leaderboard() {
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

  if (failed) return null;
  const meOutsideTop = board?.me && !board.top.some((entry) => entry.is_me) ? board.me : null;
  const rows = board ? [...board.top, ...(meOutsideTop ? [meOutsideTop] : [])] : [];

  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="section-title">Classifica di oggi</h2>
      {board && rows.length === 0 && (
        <p className="text-sm font-medium text-muted">Nessuno ha ancora finito: puoi essere il primo.</p>
      )}
      <ol className="flex flex-col gap-0.5">
        {rows.map((entry) => (
          <li
            key={entry.rank}
            className={`flex items-center justify-between gap-2 px-3 py-1.5 text-sm font-semibold ${
              entry.is_me ? "bg-comic-yellow text-black" : "bg-panel"
            }`}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="w-6 shrink-0 font-display text-lg">{entry.rank}</span>
              <PlayerAvatar username={entry.username} avatarUrl={entry.avatar_url} />
              <span className="truncate">{entry.username}</span>
            </span>
            <span className="shrink-0 font-display text-lg">
              {entry.passed} <span className="font-sans text-xs font-semibold">· {entry.total_score} pt</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
