"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { LoadingScreen } from "@/components/loading-screen";
import { PlayerAvatar } from "@/components/player-avatar";
import { FACTION_LABELS } from "@/lib/catalog";
import { describeServerError } from "@/lib/errors";
import {
  fetchOwnedCards,
  updateUsername,
  type OwnedCard,
  type Profile,
} from "@/lib/player";
import { isValidUsername } from "@/lib/username";

export default function ProfilePage() {
  const router = useRouter();
  const { status, session, profile } = useAuth();

  useEffect(() => {
    if (status === "ready" && !session) router.replace("/");
  }, [status, session, router]);

  if (!profile) return <LoadingScreen />;
  return <ProfileView profile={profile} />;
}

function ProfileView({ profile }: { profile: Profile }) {
  const { signOut } = useAuth();
  const [cards, setCards] = useState<OwnedCard[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchOwnedCards()
      .then((owned) => {
        if (!cancelled) setCards(owned);
      })
      .catch((error: unknown) => console.error("Owned cards failed", error));
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = [
    { label: "Partite", value: profile.matches_played },
    { label: "Vittorie", value: profile.wins },
    { label: "Sconfitte", value: profile.losses },
    { label: "Pareggi", value: profile.draws },
    { label: "Serie migliore", value: profile.best_streak },
    { label: "Serie attuale", value: profile.current_streak },
    { label: "Carte conquistate", value: profile.cards_conquered },
    { label: "Carte perse", value: profile.cards_lost },
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
          <h2 className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            Le tue carte {cards && `(${cards.length})`}
          </h2>
          {cards === null ? (
            <p className="text-sm text-zinc-500">Caricamento…</p>
          ) : (
            <ul className="flex flex-col divide-y divide-white/5 rounded-2xl border border-white/10 bg-white/5">
              {cards.map((card) => (
                <li key={card.id} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <p className="font-medium">{card.definition.name}</p>
                    <p className="text-xs text-zinc-400">
                      {FACTION_LABELS[card.definition.faction] ?? card.definition.faction}
                      {card.is_starter && " · Starter, mai conquistabile"}
                    </p>
                  </div>
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    style={{
                      color: card.definition.rarity.color,
                      backgroundColor: `${card.definition.rarity.color}22`,
                    }}
                  >
                    {card.definition.rarity.name}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

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
