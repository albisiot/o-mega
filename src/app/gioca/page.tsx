"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useRequireSignedIn } from "@/components/auth-provider";
import { EventBanner } from "@/components/event-banner";
import { LoadingScreen } from "@/components/loading-screen";
import { TutorialButton } from "@/components/tutorial";
import { balance } from "@/config/balance";
import { describeServerError } from "@/lib/errors";
import {
  DIFFICULTY_LABELS,
  fetchActiveMatch,
  fetchConquestStatus,
  forfeitMatch,
  type ActiveMatch,
  type ConquestStatus,
} from "@/lib/match";
import { chapterUnlocked, fetchStory, seenStory, type StoryChapter } from "@/lib/story";
import { useLockedScreen } from "@/lib/use-locked-screen";

const BOTS = [
  { difficulty: "easy", detail: "Sceglie quasi a caso. Ideale per imparare." },
  { difficulty: "medium", detail: "Gioca sempre il personaggio migliore per la Minaccia del momento." },
  { difficulty: "hard", detail: "Pianifica: tiene da parte specialisti e generalisti per i round giusti." },
  { difficulty: "super_pro", detail: "Simula mille partite possibili prima di ogni mossa." },
] as const;

const MODES = [
  { key: "story", label: "Storia", detail: "Missioni a Nuova Megara, con carte in premio", color: "rays-gold" },
  { key: "bot", label: "Contro bot", detail: "Allenati senza rischiare nulla", color: "bg-comic-cyan" },
  { key: "friendly", label: "Amichevole online", detail: "Sfida un giocatore o un amico", color: "bg-comic-yellow" },
  { key: "boss", label: "Grande Minaccia", detail: "Un Boss, cinque fronti: contro un bot o un giocatore", color: "bg-comic-orange" },
  { key: "conquest", label: "Conquista", detail: "Chi vince prende una carta", color: "bg-comic-magenta" },
  { key: "emergency", label: "Emergenza", detail: "La sfida del giorno, da solo", color: "bg-foreground" },
] as const;

type Mode = (typeof MODES)[number];
type ModeKey = Mode["key"];

/** One choice inside an open mode. */
function OptionRow({ href, title, detail, disabled = false }: { href: string; title: string; detail: string; disabled?: boolean }) {
  return (
    <Link
      href={disabled ? "#" : href}
      aria-disabled={disabled}
      className={`row-link py-2 ${disabled ? "pointer-events-none opacity-40" : ""}`}
    >
      <div>
        <p className="font-display text-xl uppercase leading-6">{title}</p>
        <p className="text-[13px] font-medium leading-4 text-muted">{detail}</p>
      </div>
      <span className="font-display text-2xl text-comic-yellow" aria-hidden>
        →
      </span>
    </Link>
  );
}

/** A chapter the player cannot open yet: shown, so they know what comes next. */
function LockedRow({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="row-link py-2 opacity-60">
      <div>
        <p className="font-display text-xl uppercase leading-6">{title}</p>
        <p className="text-[13px] font-medium leading-4 text-muted">{detail}</p>
      </div>
      <span className="shrink-0 text-xl" aria-label="Da sbloccare">
        🔒
      </span>
    </div>
  );
}

/** Every chapter, the locked ones too: each opens the Story on itself. */
function StorySection({ disabled }: { disabled: boolean }) {
  const [chapters, setChapters] = useState<StoryChapter[] | null>(() => seenStory());

  useEffect(() => {
    let cancelled = false;
    fetchStory()
      .then((next) => {
        if (!cancelled) setChapters(next);
      })
      .catch((cause: unknown) => console.error("Story failed", cause));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-muted">
        Missioni contro gli avversari di Nuova Megara, con squadre e Minacce preparate. La prima vittoria di ogni
        missione dà monete, e il boss di fine capitolo una carta.
      </p>
      {chapters && chapters.length > 0 ? (
        chapters.map((chapter, index) => {
          const title = `Capitolo ${chapter.chapter}: ${chapter.title}`;
          if (!chapterUnlocked(chapter)) {
            const previous = chapters[index - 1];
            return (
              <LockedRow
                key={chapter.chapter}
                title={title}
                detail={previous ? `Completa il Capitolo ${previous.chapter} per sbloccarlo.` : "Non ancora disponibile."}
              />
            );
          }
          const done = chapter.missions.filter((m) => m.completed).length;
          return (
            <OptionRow
              key={chapter.chapter}
              href={`/storia/?capitolo=${chapter.chapter}`}
              title={title}
              detail={
                done === chapter.missions.length
                  ? "Completato: rileggi com'è finita."
                  : `${done}/${chapter.missions.length} missioni completate`
              }
              disabled={disabled}
            />
          );
        })
      ) : (
        <OptionRow href="/storia" title="Apri la Storia" detail="Carico i capitoli…" disabled={disabled} />
      )}
    </div>
  );
}

function BotSection({ disabled }: { disabled: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-muted">Per allenarti: nessuna carta in gioco e nessuna moneta.</p>
      {BOTS.map((bot) => (
        <OptionRow
          key={bot.difficulty}
          href={`/squadra/?difficulty=${bot.difficulty}`}
          title={DIFFICULTY_LABELS[bot.difficulty]}
          detail={bot.detail}
          disabled={disabled}
        />
      ))}
    </div>
  );
}

/** Grande Minaccia (SPEC §5.12): against a bot, or friendly between players. */
function BossSection({ disabled }: { disabled: boolean }) {
  return (
    <div className={`flex flex-col gap-2 ${disabled ? "pointer-events-none opacity-40" : ""}`}>
      <p className="text-sm font-medium text-muted">
        Il Boss ha cinque fronti, tutti visibili, e ogni turno valgono di più. Ogni turno metti un personaggio su un tuo
        fronte libero e resta lì fino alla fine: ogni fronte occupato paga a ogni turno, a chi è da solo o a chi fa più
        punti. Nessuna carta in gioco e nessuna moneta.
      </p>
      {BOTS.map((bot) => (
        <OptionRow
          key={bot.difficulty}
          href={`/squadra/?format=boss&difficulty=${bot.difficulty}`}
          title={`Bot ${DIFFICULTY_LABELS[bot.difficulty]}`}
          detail={BOSS_BOTS[bot.difficulty]}
        />
      ))}
      <OptionRow href="/squadra/?mode=queue&format=boss" title="Cerca un avversario" detail="Sfida il primo giocatore disponibile." />
      <OptionRow
        href="/squadra/?mode=lobby&format=boss"
        title="Crea un codice"
        detail="Mandalo a un amico: lo usa in Amichevole online, con Entra."
      />
    </div>
  );
}

const BOSS_BOTS: Record<(typeof BOTS)[number]["difficulty"], string> = {
  easy: "Sceglie quasi a caso. Ideale per imparare.",
  medium: "Mette ogni turno la carta dove rende di più fino alla fine.",
  hard: "Simula le partite possibili prima di ogni mossa.",
  super_pro: "Simula molte più partite, con mani avversarie plausibili.",
};

function ConquestSection({ status, disabled }: { status: ConquestStatus | null; disabled: boolean }) {
  const { maxCardsLostPerDay, unlockAfterMatches, unlockAtLevel, loserCoins, minConquerableCards } = balance.conquest;
  const limitReached = status !== null && status.cards_lost_today >= maxCardsLostPerDay;
  const available = status?.unlocked && !limitReached && !disabled;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-muted">
        Chi vince prende una carta dell&apos;avversario, chi perde guadagna {loserCoins} monete. Si rischia solo ciò
        che si porta in campo: servono almeno {minConquerableCards} carte non starter.
      </p>
      {available ? (
        <Link href="/squadra/?mode=conquest" className="flex min-h-14 items-center justify-between gap-3 bg-comic-magenta px-4 py-2 text-black">
          <div>
            <p className="font-display text-xl uppercase leading-6">Cerca un avversario</p>
            <p className="text-[13px] font-semibold leading-4">
              Un avversario del tuo livello, o un bot dopo {balance.matchmaking.conquestBotAfterSeconds} secondi. Carte
              perse oggi: {status?.cards_lost_today}/{maxCardsLostPerDay}.
            </p>
          </div>
          <span className="font-display text-2xl" aria-hidden>
            →
          </span>
        </Link>
      ) : (
        <div className="bg-panel px-4 py-2">
          <p className="font-display text-lg uppercase text-faint">Non disponibile</p>
          <p className="text-sm font-medium text-muted">
            {status && !status.unlocked
              ? `Completa ${unlockAfterMatches} partite (${status.completed_matches}/${unlockAfterMatches}) o raggiungi il livello ${unlockAtLevel} (sei al ${status.level}).`
              : limitReached
                ? `Hai perso ${maxCardsLostPerDay} carte oggi: la Conquista torna dopo la mezzanotte.`
                : "Finisci prima la partita in corso."}
          </p>
        </div>
      )}
    </div>
  );
}

function EmergencySection() {
  const { threatsPerRun, rewards } = balance.emergency;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-muted">
        {threatsPerRun} Minacce uguali per tutti e un solo tentativo al giorno, con una classifica. Nessuna carta in
        gioco, fino a {rewards.tier1Coins + rewards.tier2Coins + rewards.tier3Coins} monete. Si può giocare anche con una
        partita in corso.
      </p>
      <OptionRow href="/emergenza" title="Apri l'Emergenza di oggi" detail="Guarda i livelli, poi scegli la squadra." />
    </div>
  );
}

/** Friendly matches against other players: random opponent or friend code. */
function FriendlySection({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, "");

  return (
    <div className={`flex flex-col gap-2 ${disabled ? "pointer-events-none opacity-40" : ""}`}>
      <p className="text-sm font-medium text-muted">
        Solo per divertimento: nessuna carta in gioco e nessuna moneta. Con un codice sfidi un amico.
      </p>
      <Link href="/squadra/?mode=queue" className="flex min-h-14 items-center justify-between gap-3 bg-comic-yellow px-4 py-2 text-black">
        <div>
          <p className="font-display text-xl uppercase leading-6">Cerca un avversario</p>
          <p className="text-[13px] font-semibold leading-4">Sfida il primo giocatore disponibile.</p>
        </div>
        <span className="font-display text-2xl" aria-hidden>
          →
        </span>
      </Link>
      <OptionRow href="/squadra/?mode=lobby" title="Crea un codice" detail="Mandalo a un amico per sfidarlo." />
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (normalized.length === 6) router.push(`/squadra/?mode=join&code=${normalized}`);
        }}
      >
        <input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          maxLength={6}
          placeholder="Codice dell'amico"
          aria-label="Codice dell'amico"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          className="input-comic min-w-0 flex-1 uppercase tracking-[0.2em] placeholder:normal-case placeholder:tracking-normal"
        />
        <button type="submit" disabled={normalized.length !== 6} className="btn btn-outline">
          Entra
        </button>
      </form>
    </div>
  );
}

/** A mode on the list: a tap opens its choices in place of the list. Open, it stays on top as the way back. */
function ModeTile({ mode, open, onToggle }: { mode: Mode; open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={onToggle}
      className={`cut-both speed-lines flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-black ${mode.color} ${
        open ? "shrink-0" : "flex-[1_1_0]"
      }`}
    >
      <div>
        <h2 className="-skew-x-8 font-display text-3xl uppercase leading-[34px]">{mode.label}</h2>
        <p className="text-sm font-bold leading-[18px]">{mode.detail}</p>
      </div>
      {open ? (
        <svg viewBox="0 0 14 14" className="h-5 w-5 shrink-0" stroke="currentColor" strokeWidth={2.6} aria-hidden>
          <path d="M1 1l12 12M13 1 1 13" />
        </svg>
      ) : (
        <span className="font-display text-2xl" aria-hidden>
          →
        </span>
      )}
    </button>
  );
}

/** The match in progress on one row: the row resumes it, the flag abandons it after a confirmation. */
function ActiveMatchBanner({ match, onForfeit }: { match: ActiveMatch; onForfeit: () => void }) {
  return (
    <div className="flex shrink-0 gap-2">
      <Link
        href={`/partita/?id=${match.id}`}
        className="flex min-h-14 min-w-0 flex-1 items-center justify-between gap-2 bg-comic-cyan px-3 py-1.5 text-black"
      >
        <span className="min-w-0">
          <span className="block font-display text-[17px] uppercase leading-5">Hai una partita in corso</span>
          <span className="block text-xs font-bold leading-4">
            {match.format === "boss" ? "Grande Minaccia · " : ""}
            {match.mode === "bot"
              ? `Contro il bot ${DIFFICULTY_LABELS[match.bot_difficulty ?? "easy"]}`
              : match.mode === "conquest"
                ? match.bot_difficulty
                  ? `Conquista contro il bot ${DIFFICULTY_LABELS[match.bot_difficulty]}`
                  : "Conquista contro un giocatore"
                : "Amichevole contro un giocatore"}{" "}
            · {match.format === "boss" ? "turno" : "round"} {match.current_round}
          </span>
        </span>
        <span className="shrink-0 -skew-x-8 bg-black px-2.5 py-1 font-display text-base uppercase text-comic-yellow">
          Riprendi
        </span>
      </Link>
      <button type="button" onClick={onForfeit} aria-label="Abbandona" className="btn btn-ghost min-h-14 w-12 shrink-0 px-0">
        <svg viewBox="0 0 18 20" className="h-5 w-[18px]" aria-hidden>
          <path d="M2 1v18" stroke="currentColor" strokeWidth={2.5} />
          <path d="M3 2h12l-3 4 3 4H3z" fill="currentColor" />
        </svg>
      </button>
    </div>
  );
}

export default function PlayPage() {
  const { session } = useRequireSignedIn();
  const [active, setActive] = useState<ActiveMatch | null | undefined>(undefined);
  const [conquest, setConquest] = useState<ConquestStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmForfeit, setConfirmForfeit] = useState(false);
  const [openMode, setOpenMode] = useState<ModeKey | null>(null);
  // The page fits the screen above the bottom bar and never scrolls (see .home-shell): the
  // modes share the room, and an open mode takes it over with its choices.
  useLockedScreen(true);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    Promise.all([fetchActiveMatch(), fetchConquestStatus()])
      .then(([match, status]) => {
        if (cancelled) return;
        setActive(match);
        setConquest(status);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(describeServerError(cause));
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

  // The modes wait for the answer: a match in progress would block them anyway.
  const blocked = Boolean(active) || (active === undefined && !error);
  const opened = MODES.find((mode) => mode.key === openMode) ?? null;

  return (
    <div className="home-shell">
      <header className="flex shrink-0 items-center justify-between gap-3 px-4 pb-1 pt-2">
        <h1 className="font-display text-4xl uppercase text-comic-yellow">Gioca</h1>
        <TutorialButton compact />
      </header>

      {/* What a short window cannot fit scrolls inside, rather than being cut. */}
      <main className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 pb-3 pt-1">
        {error && <p className="shrink-0 text-sm font-semibold text-comic-magenta">{error}</p>}
        {active && <ActiveMatchBanner match={active} onForfeit={() => setConfirmForfeit(true)} />}
        {!opened && <EventBanner />}

        {opened ? (
          <section className="flex flex-col gap-2">
            <ModeTile mode={opened} open onToggle={() => setOpenMode(null)} />
            {opened.key === "story" && <StorySection disabled={blocked} />}
            {opened.key === "bot" && <BotSection disabled={blocked} />}
            {opened.key === "friendly" && <FriendlySection disabled={blocked} />}
            {opened.key === "boss" && <BossSection disabled={blocked} />}
            {opened.key === "conquest" && <ConquestSection status={conquest} disabled={blocked} />}
            {opened.key === "emergency" && <EmergencySection />}
          </section>
        ) : (
          MODES.map((mode) => <ModeTile key={mode.key} mode={mode} open={false} onToggle={() => setOpenMode(mode.key)} />)
        )}
      </main>

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
    </div>
  );
}
