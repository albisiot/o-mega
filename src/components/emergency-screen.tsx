"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { resolveEmergencyPlay, type AbilityFamilies, type EmergencyRules } from "@o-mega/game-engine";
import { ComicBurst, PageHeader } from "@/components/comic-parts";
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

/** Today's challenge from the levels to the final result. */
export function EmergencyScreen({ initial }: { initial: EmergencyView }) {
  const [view, setView] = useState(initial);
  const [revealing, setRevealing] = useState<EmergencyPlay | null>(null);
  const [abilities, setAbilities] = useState<AbilityInfo[]>([]);

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
  return (
    <div className="flex flex-1 flex-col">
      <PageHeader backHref="/gioca" backLabel="Gioca" title="Emergenza" subtitle="La sfida di oggi, uguale per tutti" />
      <LevelTrack view={view} />
      {!run ? (
        <Briefing view={view} onStarted={setView} />
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

function LevelTrack({ view }: { view: EmergencyView }) {
  const run = view.run;
  return (
    <ol className="flex gap-1 px-3" aria-label="Livelli delle Minacce">
      {view.threat_levels.map((level, i) => {
        const play = run?.plays.find((p) => p.round === i + 1);
        const isCurrent = run?.status === "active" && run.current_round === i + 1;
        const style = isCurrent
          ? "bg-comic-yellow text-black"
          : play?.passed
            ? "bg-comic-cyan text-black"
            : play
              ? "bg-comic-magenta text-black"
              : "border-2 border-line text-foreground";
        const outcome = play ? (play.passed ? ", superata" : ", fallita") : "";
        return (
          <li
            key={i}
            aria-label={`Livello ${level}${outcome}`}
            className={`flex h-10 flex-1 -skew-x-8 items-center justify-center font-display text-[20px] ${style}`}
          >
            {level}
          </li>
        );
      })}
    </ol>
  );
}

type Collection = {
  catalog: CatalogCard[];
  owned: Map<string, string>;
  variantCopies: Map<string, VariantCopy[]>;
  instanceDefinitions: Map<string, string>;
};

/** Before the attempt: the rules, the day's levels, then the squad. */
function Briefing({ view, onStarted }: { view: EmergencyView; onStarted: (next: EmergencyView) => void }) {
  const [collection, setCollection] = useState<Collection | null>(null);
  const [picking, setPicking] = useState(false);
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
      <main className="flex flex-1 flex-col gap-3 px-3 pt-3">
        <p className="text-sm font-medium text-muted">
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

      <button type="button" onClick={() => setPicking(true)} className="btn btn-primary">
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

  return (
    <main className="flex flex-1 flex-col gap-3 px-3 pb-28 pt-3">
      <section className="cut-bottom relative overflow-hidden bg-comic-magenta px-4 pb-6 pt-3 text-black">
        <div aria-hidden className="halftone absolute inset-0 [mask-image:linear-gradient(135deg,transparent_45%,#000_100%)]" />
        <div className="relative">
          <ThreatDiorama key={threat.round} name={threat.name} level={threat.level} />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-extrabold">
                Minaccia {threat.round} di {view.rules.threats_per_run} · Livello {threat.level}
              </p>
              <p className="mt-0.5 font-display text-[34px] uppercase leading-10">{threat.name}</p>
            </div>
            <p
              aria-label={`Servono ${baseTarget} punti`}
              className="flex h-14 w-14 shrink-0 rotate-3 flex-col items-center justify-center bg-black font-display text-3xl leading-none text-comic-yellow"
            >
              {baseTarget}
            </p>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {threat.abilities.map((code) => {
              const ability = abilityName(code);
              return (
                <span
                  key={code}
                  className="bg-black px-2 py-1 text-[13px] font-extrabold"
                  style={{ color: ability?.family.color ?? "#d8d3c5" }}
                >
                  {ability?.name ?? code}
                </span>
              );
            })}
          </div>
          <p className="mt-2 text-sm font-bold">
            Superate {run.passed} · Fallite {run.failed} su {view.rules.max_failures}
          </p>
        </div>
      </section>

      {error && <p className="text-sm font-semibold text-comic-magenta">{error}</p>}

      <section className="flex flex-col gap-2">
        <h2 className="section-title">Chi mandi?</h2>
        {previews.map(({ card, outcome }) => {
          const isSelected = card.instance_id === selected;
          return (
            <button
              key={card.instance_id}
              type="button"
              onClick={() => setSelected(card.instance_id)}
              disabled={busy}
              aria-pressed={isSelected}
              className={`flex items-center justify-between gap-3 border-[3px] bg-panel px-3 py-2 text-left ${
                isSelected ? "border-comic-yellow shadow-[4px_4px_0_var(--comic-magenta)]" : "border-panel-raised"
              }`}
            >
              <div className="min-w-0">
                <p className="flex items-center gap-1.5">
                  <span
                    className="flex h-[22px] w-[22px] shrink-0 items-center justify-center text-sm font-black text-black"
                    style={{ background: rarityFrame(card.rarity) }}
                  >
                    {rarityLetter(card.rarity)}
                  </span>
                  <span className="truncate font-display text-xl uppercase">{card.name}</span>
                </p>
                <p className="text-xs font-semibold text-muted">
                  {threat.abilities.map((code) => `${code} ${card.stats[code] ?? 0}`).join(" · ")}
                </p>
                {card.power && (
                  <p className="truncate text-xs font-semibold" style={{ color: card.rarity.color }}>
                    {card.power.name}: {card.power.text}
                  </p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p className={`font-display text-4xl ${outcome.passed ? "text-comic-cyan" : "text-faint"}`}>
                  {outcome.score.total}
                </p>
                {outcome.score.bonus > 0 && <p className="text-xs font-bold text-comic-cyan">+{outcome.score.bonus} bonus</p>}
                {outcome.required !== baseTarget && (
                  <p className="text-xs font-bold text-comic-yellow">gliene bastano {outcome.required}</p>
                )}
              </div>
            </button>
          );
        })}
        <p className="text-xs font-medium text-faint">Il punteggio è un&apos;anteprima: lo calcola il server quando giochi.</p>
      </section>

      {run.foreseen_threats.length > 0 && (
        <section className="flex flex-col gap-1.5">
          <h2 className="section-title">Le prossime Minacce</h2>
          <ul className="flex flex-col gap-0.5">
            {run.foreseen_threats.map((next) => (
              <li key={next.round} className="bg-panel px-3 py-2 text-sm font-semibold">
                <span className="text-muted">
                  {next.round}ª · Livello {next.level} ·{" "}
                </span>
                {next.name}
                <p className="text-xs font-medium text-muted">
                  {next.abilities.map((code) => abilityName(code)?.name ?? code).join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="fixed inset-x-0 bottom-0 z-10 border-t-[3px] border-foreground bg-black px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3">
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
