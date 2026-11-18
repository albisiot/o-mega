"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useAuth } from "@/components/auth-provider";
import { useOpenPackReveal } from "@/components/pack-reveal-link";
import { bannersHeld, subscribeBannerHolds, useBannerHold } from "@/lib/banner-hold";
import {
  claimEmergencyPrize,
  fetchEmergencyPrizes,
  prizeDayText,
  prizeText,
  type EmergencyPrize,
} from "@/lib/emergency-prizes";
import { weekText } from "@/lib/emergency";
import { describeServerError } from "@/lib/errors";

/** Screens the popup never covers: a match or a run being played, a pack being opened, the editors. */
const QUIET_PATHS = ["/partita", "/attesa", "/emergenza", "/pacchetto", "/editor", "/prova-tavole"];

/** How often an open app asks again, so a day that ends while it is open is not missed. */
const RECHECK_MS = 10 * 60 * 1000;

/**
 * The prizes of the day's Emergenza leaderboard (SPEC §5.10) and of the week's (SPEC §5.16), over
 * whatever screen the player is in once the day (or week) has ended: the place, the run and the
 * prize, claimed from here, one at a time. Waits
 * like the banners for the splash, a round result, a rare threat or a pack, and never opens
 * during a match.
 */
export function EmergencyPrizePopup() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return userId ? <PrizePopup key={userId} /> : null;
}

function PrizePopup() {
  const openReveal = useOpenPackReveal();
  const pathname = usePathname();
  const [prizes, setPrizes] = useState<EmergencyPrize[]>([]);
  // Put off with "Più tardi" until the app is opened again or comes back.
  const [snoozed, setSnoozed] = useState<string[]>([]);
  const [shownId, setShownId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimed, setClaimed] = useState<{ coins: number; balance: number } | null>(null);
  const held = useSyncExternalStore(subscribeBannerHolds, bannersHeld, () => true);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetchEmergencyPrizes()
        .then((items) => {
          if (!cancelled) setPrizes(items);
        })
        .catch(() => {
          // The next check tries again.
        });
    };
    load();
    const timer = window.setInterval(load, RECHECK_MS);
    const onVisible = () => {
      if (document.hidden) return;
      setSnoozed([]);
      load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const quiet = QUIET_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const next = prizes.find((prize) => !snoozed.includes(prize.id)) ?? null;
  // It opens when nothing else holds the screen; once open, its own hold keeps the banners waiting.
  if (next && !quiet && !held && shownId !== next.id && !claimed) setShownId(next.id);
  const prize = claimed ? null : next && shownId === next.id && !quiet ? next : null;
  const open = Boolean(prize || claimed);
  useBannerHold(open);

  if (!open) return null;

  const close = () => {
    setClaimed(null);
    setError(null);
  };

  const claim = (target: EmergencyPrize) => {
    setBusy(true);
    setError(null);
    claimEmergencyPrize(target)
      .then((result) => {
        setPrizes((items) => items.filter((item) => item.id !== target.id));
        if (result.opening_ids.length > 0) {
          openReveal(result.opening_ids);
          return;
        }
        setClaimed({ coins: result.coins, balance: result.coin_balance });
      })
      .catch((reason: unknown) => setError(describeServerError(reason)))
      .finally(() => setBusy(false));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="emergency-prize-title"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 px-4 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]"
    >
      <div className="rays-gold relative flex w-full max-w-sm flex-col items-center gap-2 overflow-hidden border-[3px] border-black px-4 pb-4 pt-3 text-center text-black shadow-[6px_6px_0_#000]">
        <p className="relative -skew-x-8 bg-black px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-comic-yellow">
          {prize?.kind === "week" ? "Emergenza della settimana" : "Classifica dell'Emergenza"}
        </p>
        {prize ? (
          <>
            <h2 id="emergency-prize-title" className="text-sfx relative text-6xl uppercase leading-[0.9] text-comic-magenta">
              {prize.rank}° posto!
            </h2>
            <p className="relative text-[13px] font-bold leading-4">
              {prize.kind === "week" ? `Settimana ${weekText(prize.day)}` : `Emergenza di ${prizeDayText(prize.day)}`}
              <br />
              {prize.passed === 1 ? "1 Minaccia superata" : `${prize.passed} Minacce superate`} · {prize.total_score} punti ·{" "}
              {prize.players === 1 ? "1 giocatore" : `${prize.players} giocatori`}
            </p>
            <p className="relative mt-1 text-[11px] font-extrabold uppercase">Hai vinto</p>
            <div className="relative flex flex-wrap justify-center gap-1.5">
              {prize.packs > 0 && (
                <p className="-skew-x-8 bg-black px-3 py-1 font-display text-2xl leading-7 text-comic-yellow">
                  {prize.packs === 1 ? "1 pacchetto" : `${prize.packs} pacchetti`}
                </p>
              )}
              {prize.coins > 0 && (
                <p className="-skew-x-8 bg-black px-3 py-1 font-display text-2xl leading-7 text-comic-yellow">
                  +{prize.coins} monete
                </p>
              )}
            </div>
            {error && <p className="relative bg-black px-2 py-0.5 text-xs font-bold text-comic-magenta">{error}</p>}
            <div className="relative mt-1 flex w-full gap-2">
              <button
                type="button"
                onClick={() => setSnoozed((ids) => [...ids, prize.id])}
                disabled={busy}
                className="btn min-w-0 flex-1 border-2 border-black bg-transparent font-display text-lg uppercase text-black"
              >
                Più tardi
              </button>
              <button
                type="button"
                onClick={() => claim(prize)}
                disabled={busy}
                aria-label={`Riscuoti ${prizeText(prize)}`}
                className="btn min-h-14 min-w-0 flex-[2] bg-black font-display text-2xl uppercase text-comic-yellow"
              >
                {busy ? "Un attimo…" : "Riscuoti"}
              </button>
            </div>
          </>
        ) : (
          claimed && (
            <>
              <h2 id="emergency-prize-title" className="text-sfx relative text-6xl uppercase leading-[0.9] text-comic-magenta">
                +{claimed.coins}
              </h2>
              <p className="relative text-[13px] font-bold">monete riscosse · ora ne hai {claimed.balance}</p>
              <button type="button" onClick={close} className="btn relative mt-1 min-h-14 w-full bg-black font-display text-2xl uppercase text-comic-yellow">
                Fantastico!
              </button>
            </>
          )
        )}
      </div>
    </div>
  );
}
