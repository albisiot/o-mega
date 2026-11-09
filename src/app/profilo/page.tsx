"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth, useRequireSignedIn } from "@/components/auth-provider";
import { TabBar } from "@/components/comic-parts";
import { LoadingScreen } from "@/components/loading-screen";
import { PlayerAvatar } from "@/components/player-avatar";
import { Sheet } from "@/components/sheet";
import { TutorialButton } from "@/components/tutorial";
import { WorldGuide } from "@/components/world-intro";
import { PATCH_NOTES } from "@/config/patch-notes";
import { describeServerError } from "@/lib/errors";
import { fetchConquestHistory, type ConquestHistoryEntry } from "@/lib/match";
import { bootstrapPlayer, updateUsername, type Profile } from "@/lib/player";
import { levelProgress, xpForLevel } from "@/lib/progression";
import { useRememberedState } from "@/lib/place-memory";
import { useLockedScreen } from "@/lib/use-locked-screen";
import { isValidUsername } from "@/lib/username";

export default function ProfilePage() {
  const { profile } = useRequireSignedIn();
  if (!profile) return <LoadingScreen />;
  return <ProfileView profile={profile} />;
}

type ProfileTab = "stats" | "conquests" | "more";

const TABS: { key: ProfileTab; label: string }[] = [
  { key: "stats", label: "Statistiche" },
  { key: "conquests", label: "Conquiste" },
  { key: "more", label: "Altro" },
];

/** One way out of the profile in the Altro tab. */
const ROW = "row-link min-h-12 w-full text-left";

function RowLabel({ children }: { children: string }) {
  return (
    <>
      <span className="font-display text-xl uppercase">{children}</span>
      <span className="font-display text-2xl text-comic-yellow" aria-hidden>
        →
      </span>
    </>
  );
}

/**
 * The player's card, statistics and ways to the rest. The page fits the screen above the
 * bottom bar and never scrolls (see .home-shell): the parts share the room as tabs, and the
 * username, the world and the patch notes open in sheets from the bottom.
 */
function ProfileView({ profile }: { profile: Profile }) {
  const { signOut, setProfile } = useAuth();
  const [history, setHistory] = useState<ConquestHistoryEntry[] | null>(null);
  // Back from the history, the album or the privacy page, the same tab is open.
  const [tab, setTab] = useRememberedState<ProfileTab>("tab", "stats");
  const nameSheet = useRef<HTMLDialogElement>(null);
  const worldSheet = useRef<HTMLDialogElement>(null);
  const notesSheet = useRef<HTMLDialogElement>(null);
  useLockedScreen(true);

  useEffect(() => {
    let cancelled = false;
    fetchConquestHistory()
      .then((entries) => {
        if (!cancelled) setHistory(entries);
      })
      .catch((error: unknown) => console.error("Conquest history failed", error));
    // Statistics change with every match: the profile loaded at sign-in is old.
    bootstrapPlayer()
      .then((fresh) => {
        if (!cancelled) setProfile(fresh);
      })
      .catch((error: unknown) => console.error("Profile refresh failed", error));
    return () => {
      cancelled = true;
    };
  }, [setProfile]);

  const pvpMatches = profile.wins + profile.losses + profile.draws;

  const stats = [
    { label: "Partite", value: profile.matches_played },
    { label: "Vittorie contro giocatori", value: pvpMatches ? `${Math.round((profile.wins / pvpMatches) * 100)}%` : "–" },
    { label: "Vittorie", value: profile.wins },
    { label: "Sconfitte", value: profile.losses },
    { label: "Pareggi", value: profile.draws },
    { label: "Serie migliore", value: profile.best_streak },
    { label: "Serie attuale", value: profile.current_streak },
    { label: "Carte conquistate", value: profile.cards_conquered },
    { label: "Carte perse", value: profile.cards_lost },
    { label: "Contro i bot: V / S / P", value: `${profile.bot_wins} / ${profile.bot_losses} / ${profile.bot_draws}` },
  ];

  return (
    <div className="home-shell">
      <main className="flex min-h-0 flex-1 flex-col gap-2 px-3 pb-3 pt-2">
        <section className="cut-bottom flex shrink-0 items-center gap-4 bg-comic-yellow px-4 pb-5 pt-2 text-black">
          <PlayerAvatar username={profile.username} avatarUrl={profile.avatar_url} size="md" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <h1 className="min-w-0 truncate py-0.5 font-display text-[28px] uppercase leading-8">{profile.username}</h1>
              <button
                type="button"
                aria-haspopup="dialog"
                aria-label="Cambia nome utente"
                onClick={() => nameSheet.current?.showModal()}
                className="flex h-11 w-11 shrink-0 items-center justify-center"
              >
                <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.4} aria-hidden>
                  <path d="M13 3l4 4-10 10H3v-4zM11 5l4 4" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
            <p className="text-sm font-bold">
              Livello {profile.level} · {profile.xp} XP
            </p>
            <div className="mt-1 h-2 bg-black">
              <div
                className="h-full bg-comic-magenta"
                style={{ width: `${levelProgress(profile.xp, profile.level) * 100}%` }}
              />
            </div>
            <p className="mt-1 text-xs font-semibold">Prossimo livello a {xpForLevel(profile.level + 1)} XP</p>
          </div>
        </section>

        <TabBar tabs={TABS} current={tab} onPick={setTab} label="Profilo" />

        <div role="tabpanel" data-keep-scroll="panel" className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain">
          {tab === "stats" && (
            <section className="grid grid-cols-2 gap-1.5">
              {stats.map((stat) => (
                <div key={stat.label} className="bg-panel px-3.5 py-1.5">
                  <p className="font-display text-2xl leading-7">{stat.value}</p>
                  <p className="text-xs font-semibold text-muted">{stat.label}</p>
                </div>
              ))}
            </section>
          )}

          {tab === "conquests" &&
            (history === null ? (
              <p className="text-sm font-medium text-muted">Caricamento…</p>
            ) : history.length === 0 ? (
              <p className="text-sm font-medium text-muted">Ancora nessuna Conquista.</p>
            ) : (
              <ul className="flex flex-col gap-0.5" aria-label="Carte conquistate e perse">
                {history.map((entry) => (
                  <li
                    key={`${entry.created_at}-${entry.card.code}`}
                    className="flex items-center justify-between gap-3 bg-panel px-4 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-display uppercase" style={{ color: entry.card.rarity.color }}>
                        {entry.card.name}
                      </p>
                      <p className="truncate text-xs font-medium text-muted">
                        {entry.won ? "Da" : "A"} {entry.opponent ?? "giocatore rimosso"} ·{" "}
                        {new Date(entry.created_at).toLocaleDateString("it-IT")}
                      </p>
                    </div>
                    <span className={`shrink-0 text-xs font-extrabold ${entry.won ? "text-comic-cyan" : "text-comic-magenta"}`}>
                      {entry.won ? "Conquistata" : "Persa"}
                    </span>
                  </li>
                ))}
              </ul>
            ))}

          {tab === "more" && (
            <>
              <Link href="/storico" className={ROW}>
                <RowLabel>Storico partite</RowLabel>
              </Link>
              <Link href="/collezione" className={ROW}>
                <RowLabel>Vai alla collezione</RowLabel>
              </Link>
              <TutorialButton className="min-h-12" />
              <button type="button" aria-haspopup="dialog" onClick={() => worldSheet.current?.showModal()} className={ROW}>
                <RowLabel>Il mondo</RowLabel>
              </button>
              <button type="button" aria-haspopup="dialog" onClick={() => notesSheet.current?.showModal()} className={ROW}>
                <RowLabel>Patch notes</RowLabel>
              </button>
              <Link href="/privacy" className={ROW}>
                <RowLabel>Privacy</RowLabel>
              </Link>
              <button type="button" onClick={signOut} className="btn btn-ghost shrink-0">
                Esci
              </button>
            </>
          )}
        </div>
      </main>

      <Sheet sheetRef={nameSheet} title="Nome utente">
        <UsernameForm profile={profile} />
      </Sheet>

      <Sheet sheetRef={worldSheet} title="Il mondo">
        <WorldGuide />
      </Sheet>

      <Sheet sheetRef={notesSheet} title="Patch notes">
        <div className="flex flex-col gap-0.5">
          {PATCH_NOTES.map((release) => (
            <div key={release.date} className="bg-panel px-4 py-3">
              <h3 className="font-display text-lg uppercase text-comic-yellow">{release.date}</h3>
              <ul className="mt-1 flex list-disc flex-col gap-1 pl-4 text-sm font-medium text-muted">
                {release.changes.map((change) => (
                  <li key={change}>{change}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Sheet>
    </div>
  );
}

function UsernameForm({ profile }: { profile: Profile }) {
  const { setProfile } = useAuth();
  const [value, setValue] = useState(profile.username);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const trimmed = value.trim();
  const unchanged = trimmed === profile.username;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValidUsername(trimmed)) {
      setMessage({ text: describeServerError({ message: "username_invalid" }), isError: true });
      return;
    }
    setSaving(true);
    try {
      const updated = await updateUsername(trimmed);
      setProfile(updated);
      setValue(updated.username);
      setMessage({ text: "Nome utente aggiornato.", isError: false });
    } catch (error) {
      setMessage({ text: describeServerError(error), isError: true });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <label htmlFor="username" className="sr-only">
        Nome utente
      </label>
      <div className="flex gap-2">
        <input
          id="username"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setMessage(null);
          }}
          maxLength={20}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          className="input-comic min-w-0 flex-1"
        />
        <button type="submit" disabled={saving || unchanged} className="btn btn-outline">
          {saving ? "…" : "Salva"}
        </button>
      </div>
      {message && (
        <p className={`text-sm font-semibold ${message.isError ? "text-comic-magenta" : "text-comic-cyan"}`}>
          {message.text}
        </p>
      )}
    </form>
  );
}
