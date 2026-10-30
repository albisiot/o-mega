"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { describeServerError } from "@/lib/errors";
import { buyPack, claimDailyPack, type PackStatus } from "@/lib/packs";
import { formatCountdown } from "@/lib/use-now";

type PackPanelProps = {
  status: PackStatus | null;
  now: number;
  resetsAt: number | null;
  onFailed: () => void;
};

/** Daily free pack and standard pack purchase on the home screen. */
export function PackPanel({ status, now, resetsAt, onFailed }: PackPanelProps) {
  const router = useRouter();
  const [opening, setOpening] = useState<"daily" | "standard" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function open(kind: "daily" | "standard") {
    setOpening(kind);
    setError(null);
    try {
      const pack = kind === "daily" ? await claimDailyPack() : await buyPack();
      router.push(`/pacchetto/?id=${pack.id}`);
    } catch (cause) {
      setError(describeServerError(cause));
      setOpening(null);
      onFailed();
    }
  }

  if (!status) {
    return <section className="h-44 animate-pulse rounded-3xl bg-white/5" aria-label="Pacchetti" />;
  }

  const canBuy = status.coin_balance >= status.standard_pack_price;

  return (
    <section className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-3xl border border-amber-400/30 bg-linear-to-br from-amber-500/25 via-orange-600/10 to-transparent p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-amber-300">Pacchetto del giorno</p>
        {status.daily_available ? (
          <>
            <p className="mt-1 text-sm text-zinc-300">5 carte gratis, almeno una Gamma o superiore.</p>
            <button
              type="button"
              onClick={() => open("daily")}
              disabled={opening !== null}
              className="mt-4 w-full rounded-full bg-amber-400 px-5 py-3 font-bold text-zinc-950 shadow-lg shadow-amber-500/30 transition active:scale-[0.98] disabled:opacity-60"
            >
              {opening === "daily" ? "Apertura…" : "Apri il pacchetto"}
            </button>
          </>
        ) : (
          <p className="mt-1 text-sm text-zinc-300">
            Già aperto oggi. Il prossimo arriva tra{" "}
            <span className="font-semibold text-zinc-100">{formatCountdown((resetsAt ?? now) - now)}</span>.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
        <Link href="/negozio" className="min-w-0">
          <p className="font-semibold">Pacchetto standard</p>
          <p className="text-xs text-zinc-400">
            {status.standard_pack_price} monete · <span className="underline">probabilità</span>
          </p>
        </Link>
        <button
          type="button"
          onClick={() => open("standard")}
          disabled={!canBuy || opening !== null}
          className="rounded-full border border-amber-400/60 px-4 py-2 text-sm font-semibold text-amber-300 disabled:border-white/10 disabled:text-zinc-500"
        >
          {opening === "standard" ? "…" : "Acquista"}
        </button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
    </section>
  );
}
