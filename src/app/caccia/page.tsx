"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useRequireSignedIn } from "@/components/auth-provider";
import { BackLink } from "@/components/comic-parts";
import { LoadingScreen } from "@/components/loading-screen";
import { magnitudeLabel, MoveChips } from "@/components/raid-room";
import { ReturnLink } from "@/components/return-link";
import { describeServerError } from "@/lib/errors";
import { statusOf, useModeAvailability } from "@/lib/mode-availability";
import { createRaidRoom, DISTRICT_NAMES, fetchRaid, joinRaidRoom, raidRoomHref, seenRaid, type RaidCatalog } from "@/lib/raid";
import { useLockedScreen } from "@/lib/use-locked-screen";
import { useNow } from "@/lib/use-now";

/** Colors of the Magnitudes, from the calmest to the worst. */
const MAGNITUDE_LOOKS: Record<number, string> = {
  1: "bg-comic-cyan",
  2: "bg-comic-yellow",
  3: "bg-comic-orange",
  4: "bg-comic-magenta",
  5: "bg-black text-comic-magenta border-2 border-comic-magenta",
};

/** The Caccia grossa (SPEC §5.18): the Bosses by Magnitude, a friend's code, the room the player is in. */
export default function HuntPage() {
  const router = useRouter();
  const { session } = useRequireSignedIn();
  const [catalog, setCatalog] = useState<RaidCatalog | null>(() => seenRaid());
  const [open, setOpen] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Only the list of Bosses scrolls.
  useLockedScreen(true);
  // Closed from the EDITOR (Modalità di gioco): the server refuses new rooms, so the page says so first.
  const modes = useModeAvailability(Boolean(session));
  const now = useNow(60_000);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    fetchRaid()
      .then((next) => {
        if (cancelled) return;
        setCatalog(next);
        // The easiest Boss not beaten yet, open from the start.
        setOpen((shown) => shown ?? next.bosses.find((b) => !b.beaten)?.code ?? next.bosses[0]?.code ?? null);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(describeServerError(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  async function create(boss: string) {
    setBusy(true);
    setError(null);
    try {
      const room = await createRaidRoom(boss);
      router.push(raidRoomHref(room.id));
    } catch (cause) {
      setError(describeServerError(cause));
      setBusy(false);
    }
  }

  async function join(event: FormEvent) {
    event.preventDefault();
    if (code.trim().length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      const room = await joinRaidRoom(code);
      router.push(raidRoomHref(room.id));
    } catch (cause) {
      setError(describeServerError(cause));
      setBusy(false);
    }
  }

  if (!catalog && !error) return <LoadingScreen label="Apertura della Caccia grossa…" />;
  const room = catalog?.room ?? null;
  const status = statusOf(modes, "raid", now);
  const closed = status.open ? null : `La Caccia grossa non è disponibile ora${status.label ? ` · ${status.label}` : ""}.`;

  return (
    <div className="game-shell">
      <header className="flex items-center gap-2.5 px-3 py-1">
        <BackLink href="/insieme" />
        <div className="min-w-0">
          <h1 className="font-display text-[22px] uppercase leading-6 text-comic-yellow">Caccia grossa</h1>
          <p className="truncate text-[11px] font-bold text-muted">
            Tutti contro un Boss · da {catalog?.min_players ?? 2} a {catalog?.max_players ?? 4} giocatori
          </p>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col gap-2 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-1">
        {error && <p className="shrink-0 text-sm font-semibold text-comic-magenta">{error}</p>}

        {room ? (
          <ReturnLink
            href={raidRoomHref(room.id)}
            onward
            className="tile flex min-h-14 shrink-0 items-center justify-between gap-2 bg-comic-orange px-3 py-1.5 text-black"
          >
            <span className="min-w-0">
              <span className="block font-display text-[17px] uppercase leading-5">{room.status === "active" ? "Caccia in corso" : "Sei in una stanza"}</span>
              <span className="block truncate text-xs font-bold leading-4">
                {room.name} · codice {room.code}
              </span>
            </span>
            <span className="shrink-0 -skew-x-8 bg-black px-2.5 py-1 font-display text-base uppercase text-comic-yellow">Entra</span>
          </ReturnLink>
        ) : closed ? (
          <p className="shrink-0 border-[3px] border-black bg-comic-yellow px-3 py-2 text-sm font-extrabold text-black">{closed}</p>
        ) : (
          <form onSubmit={join} className="flex shrink-0 items-center gap-2">
            <label className="min-w-0 flex-1">
              <span className="sr-only">Codice di un amico</span>
              <input
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
                placeholder="Codice di un amico"
                autoCapitalize="characters"
                autoComplete="off"
                inputMode="text"
                className="h-11 w-full border-2 border-line bg-panel px-3 font-display text-lg uppercase tracking-[0.2em] placeholder:font-sans placeholder:text-sm placeholder:normal-case placeholder:tracking-normal placeholder:text-faint"
              />
            </label>
            <button type="submit" disabled={busy || code.length !== 6} className="btn btn-primary h-11 shrink-0 px-4">
              Entra
            </button>
          </form>
        )}

        <p className="shrink-0 text-xs font-semibold leading-4 text-muted">
          Una Minaccia per round, una carta a testa: i punteggi si sommano. Sotto l&apos;Attacco perdete una Difesa, sopra fate danno al Boss.
          Più è alta la Magnitudo, più il Boss è duro e più paga la vittoria.
        </p>

        <ul data-keep-scroll="main" className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto" aria-label="I Boss">
          {catalog?.bosses.map((boss) => {
            const expanded = open === boss.code;
            return (
              <li key={boss.code} className={`border-[3px] ${expanded ? "border-comic-yellow" : "border-panel-raised"} bg-panel`}>
                <button
                  type="button"
                  onClick={() => setOpen(expanded ? null : boss.code)}
                  aria-expanded={expanded}
                  className="flex w-full items-center gap-2 px-2 py-1.5 text-left"
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 -skew-x-8 flex-col items-center justify-center font-display leading-none text-black ${MAGNITUDE_LOOKS[boss.magnitude] ?? "bg-foreground"}`}
                    aria-hidden
                  >
                    <span className="text-[9px]">MAG</span>
                    <span className="text-[20px]">{boss.magnitude}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-[17px] uppercase leading-5">{boss.name}</span>
                    <span className="block truncate text-[11px] font-bold text-muted">
                      {magnitudeLabel(boss.magnitude)} · {DISTRICT_NAMES[boss.district] ?? boss.district}
                    </span>
                  </span>
                  {boss.beaten && <span className="shrink-0 bg-comic-cyan px-1 text-[10px] font-extrabold uppercase text-black">Abbattuto</span>}
                </button>
                {expanded && (
                  <div className="flex flex-col gap-1.5 px-2 pb-2">
                    <p className="text-xs font-semibold leading-4">{boss.flavor}</p>
                    <MoveChips moves={boss.moves} />
                    <p className="text-[11px] font-bold text-muted">
                      Vittoria: +{boss.win_xp} esperienza{boss.beaten ? "" : ` · la prima volta +${boss.first_win_coins} monete`}
                    </p>
                    {!room && !closed && (
                      <button type="button" onClick={() => void create(boss.code)} disabled={busy} className="btn btn-primary w-full">
                        Apri una stanza
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
