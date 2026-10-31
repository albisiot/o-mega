"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth, useRequireSignedIn } from "@/components/auth-provider";
import { LoadingScreen } from "@/components/loading-screen";
import { PlayerAvatar } from "@/components/player-avatar";
import { WorldGuide } from "@/components/world-intro";
import { PATCH_NOTES } from "@/config/patch-notes";
import { describeServerError } from "@/lib/errors";
import { fetchConquestHistory, type ConquestHistoryEntry } from "@/lib/match";
import { bootstrapPlayer, updateUsername, type Profile } from "@/lib/player";
import { levelProgress, xpForLevel } from "@/lib/progression";
import { isValidUsername } from "@/lib/username";

export default function ProfilePage() {
  const { profile } = useRequireSignedIn();
  if (!profile) return <LoadingScreen />;
  return <ProfileView profile={profile} />;
}

function ProfileView({ profile }: { profile: Profile }) {
  const { signOut, setProfile } = useAuth();
  const [history, setHistory] = useState<ConquestHistoryEntry[] | null>(null);

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
    <div className="flex flex-1 flex-col">
      <main className="flex flex-1 flex-col gap-6 px-3 pb-6 pt-3">
        <section className="cut-bottom flex items-center gap-5 bg-comic-yellow px-5 pb-7 pt-5 text-black">
          <PlayerAvatar username={profile.username} avatarUrl={profile.avatar_url} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-3xl uppercase">{profile.username}</h1>
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

        <UsernameForm profile={profile} />

        <section className="grid grid-cols-2 gap-2">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-panel px-4 py-3">
              <p className="font-display text-2xl">{stat.value}</p>
              <p className="text-xs font-semibold text-muted">{stat.label}</p>
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="section-title">Carte conquistate e perse</h2>
          {history === null ? (
            <p className="text-sm font-medium text-muted">Caricamento…</p>
          ) : history.length === 0 ? (
            <p className="text-sm font-medium text-muted">Ancora nessuna Conquista.</p>
          ) : (
            <ul className="flex flex-col gap-0.5">
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
          )}
        </section>

        <Link href="/storico" className="row-link">
          <span className="font-display text-xl uppercase">Storico partite</span>
          <span className="font-display text-2xl text-comic-yellow" aria-hidden>
            →
          </span>
        </Link>

        <Link href="/collezione" className="row-link">
          <span className="font-display text-xl uppercase">Vai alla collezione</span>
          <span className="font-display text-2xl text-comic-yellow" aria-hidden>
            →
          </span>
        </Link>

        <details className="group flex flex-col gap-2">
          <summary className="row-link cursor-pointer list-none [&::-webkit-details-marker]:hidden">
            <span className="font-display text-xl uppercase">Il mondo</span>
            <span className="font-display text-2xl text-comic-yellow group-open:hidden" aria-hidden>
              →
            </span>
            <span className="hidden font-display text-2xl text-comic-yellow group-open:inline" aria-hidden>
              ↓
            </span>
          </summary>
          <WorldGuide />
        </details>

        <details className="group flex flex-col gap-2">
          <summary className="row-link cursor-pointer list-none [&::-webkit-details-marker]:hidden">
            <span className="font-display text-xl uppercase">Patch notes</span>
            <span className="font-display text-2xl text-comic-yellow group-open:hidden" aria-hidden>
              →
            </span>
            <span className="hidden font-display text-2xl text-comic-yellow group-open:inline" aria-hidden>
              ↓
            </span>
          </summary>
          <div className="mt-2 flex flex-col gap-0.5">
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
        </details>

        <Link href="/privacy" className="row-link">
          <span className="font-display text-xl uppercase">Privacy</span>
          <span className="font-display text-2xl text-comic-yellow" aria-hidden>
            →
          </span>
        </Link>

        <button type="button" onClick={signOut} className="btn btn-ghost mt-2">
          Esci
        </button>
      </main>
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
      <label htmlFor="username" className="section-title">
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
