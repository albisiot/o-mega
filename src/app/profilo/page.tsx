"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth, useRequireSignedIn } from "@/components/auth-provider";
import { LoadingScreen } from "@/components/loading-screen";
import { PlayerAvatar } from "@/components/player-avatar";
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
      <header className="flex items-center justify-between px-5 py-4">
        <Link href="/" className="text-sm text-zinc-300">
          ← Home
        </Link>
        <h1 className="text-base font-semibold">Profilo</h1>
        <span className="w-12" />
      </header>

      <main className="flex flex-1 flex-col gap-6 px-5 pb-10">
        <section className="flex flex-col items-center gap-3 text-center">
          <PlayerAvatar username={profile.username} avatarUrl={profile.avatar_url} size="lg" />
          <div>
            <p className="text-2xl font-bold">{profile.username}</p>
            <p className="text-sm text-zinc-400">
              Livello {profile.level} · {profile.xp} XP
            </p>
            <div className="mx-auto mt-1 h-1.5 w-40 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-amber-400"
                style={{ width: `${levelProgress(profile.xp, profile.level) * 100}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-zinc-500">Prossimo livello a {xpForLevel(profile.level + 1)} XP</p>
          </div>
        </section>

        <UsernameForm profile={profile} />

        <section className="grid grid-cols-2 gap-2">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xl font-bold">{stat.value}</p>
              <p className="text-xs text-zinc-400">{stat.label}</p>
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-xs uppercase tracking-[0.2em] text-zinc-500">Carte conquistate e perse</h2>
          {history === null ? (
            <p className="text-sm text-zinc-500">Caricamento…</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-zinc-500">Ancora nessuna Conquista.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-white/5 rounded-2xl border border-white/10 bg-white/5">
              {history.map((entry) => (
                <li key={`${entry.created_at}-${entry.card.code}`} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-medium" style={{ color: entry.card.rarity.color }}>
                      {entry.card.name}
                    </p>
                    <p className="truncate text-xs text-zinc-400">
                      {entry.won ? "Da" : "A"} {entry.opponent ?? "giocatore rimosso"} ·{" "}
                      {new Date(entry.created_at).toLocaleDateString("it-IT")}
                    </p>
                  </div>
                  <span className={`shrink-0 text-xs font-bold ${entry.won ? "text-emerald-300" : "text-red-300"}`}>
                    {entry.won ? "Conquistata" : "Persa"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <Link
          href="/storico"
          className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
        >
          <span className="font-semibold">Storico partite</span>
          <span className="text-zinc-500" aria-hidden>
            →
          </span>
        </Link>

        <Link
          href="/collezione"
          className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
        >
          <span className="font-semibold">Vai alla collezione</span>
          <span className="text-zinc-500" aria-hidden>
            →
          </span>
        </Link>

        <button
          type="button"
          onClick={signOut}
          className="mt-2 rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-zinc-200"
        >
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
      <label htmlFor="username" className="text-xs uppercase tracking-[0.2em] text-zinc-500">
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
          className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-base outline-none focus:border-amber-400"
        />
        <button
          type="submit"
          disabled={saving || unchanged}
          className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-40"
        >
          {saving ? "…" : "Salva"}
        </button>
      </div>
      {message && (
        <p className={`text-sm ${message.isError ? "text-red-400" : "text-emerald-400"}`}>
          {message.text}
        </p>
      )}
    </form>
  );
}
