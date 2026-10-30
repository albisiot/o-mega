"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ComicBurst, PackArt } from "@/components/comic-parts";
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
    return <section className="h-72 animate-pulse bg-panel" aria-label="Pacchetti" />;
  }

  const canBuy = status.coin_balance >= status.standard_pack_price;

  return (
    <section className="flex flex-col gap-3">
      <div className="cut-bottom relative min-h-72 overflow-hidden bg-comic-yellow px-4 pb-7 pt-4 text-black">
        <div
          aria-hidden
          className="halftone absolute inset-0 [--dot-color:var(--comic-magenta)] [mask-image:linear-gradient(200deg,#000_8%,transparent_62%)]"
        />
        <PackArt body="#ff2e6c" omega="#ffd60a" className="absolute -right-2 top-6 h-56 rotate-[9deg]" />
        <div className="relative flex min-h-60 max-w-[52%] flex-col items-start">
          <h1 className="font-display text-[44px] uppercase leading-[48px]">Pacchetto del giorno</h1>
          {status.daily_available ? (
            <p className="mt-2 text-[15px] font-semibold leading-5">5 carte gratis, almeno una Gamma o superiore.</p>
          ) : (
            <p className="mt-2 text-[15px] font-semibold leading-5">
              Già aperto oggi. Il prossimo arriva tra{" "}
              <span className="font-extrabold tabular-nums">{formatCountdown((resetsAt ?? now) - now)}</span>.
            </p>
          )}
        </div>
        {status.daily_available && (
          <>
            <ComicBurst
              fill="#fff8e7"
              className="absolute bottom-6 right-3 h-[84px] w-[84px] -rotate-12"
              textClassName="text-lg tracking-wide"
            >
              GRATIS!
            </ComicBurst>
            <button
              type="button"
              onClick={() => open("daily")}
              disabled={opening !== null}
              className="btn relative mt-3 min-h-14 bg-black px-5 font-display text-[22px] uppercase tracking-wide text-comic-yellow shadow-[4px_4px_0_var(--comic-magenta)] disabled:opacity-60"
            >
              {opening === "daily" ? "Apertura…" : "Apri il pacchetto"}
            </button>
          </>
        )}
      </div>

      <div className="row-link">
        <Link href="/negozio" className="min-w-0">
          <p className="font-display text-lg uppercase">Pacchetto standard</p>
          <p className="text-sm font-semibold text-muted">
            {status.standard_pack_price} monete · <span className="underline">probabilità</span>
          </p>
        </Link>
        <button
          type="button"
          onClick={() => open("standard")}
          disabled={!canBuy || opening !== null}
          className="btn btn-outline shrink-0"
        >
          {opening === "standard" ? "…" : "Acquista"}
        </button>
      </div>

      {error && <p className="text-sm font-semibold text-comic-magenta">{error}</p>}
    </section>
  );
}
