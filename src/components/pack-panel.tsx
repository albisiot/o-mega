"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ComicBurst, PackArt } from "@/components/comic-parts";
import { HoldToConfirmButton } from "@/components/hold-to-confirm-button";
import { describeServerError } from "@/lib/errors";
import { buyPack, claimDailyPack, type PackStatus } from "@/lib/packs";
import { formatCountdown } from "@/lib/use-now";

type PackPanelProps = {
  status: PackStatus | null;
  now: number;
  resetsAt: number | null;
  /** The pack status could not be loaded. */
  loadError: string | null;
  onFailed: () => void;
};

/**
 * Daily free pack and standard pack purchase on the home screen. The daily panel takes the
 * room the home leaves it and keeps that size once opened, with the countdown in place of
 * the button. Errors show inside it, so nothing below moves.
 */
export function PackPanel({ status, now, resetsAt, loadError, onFailed }: PackPanelProps) {
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

  const message = error ?? loadError;
  const notice = message && (
    <p className="relative mt-1.5 bg-black px-2 py-1 text-[13px] font-bold leading-[17px] text-comic-magenta">{message}</p>
  );

  // Same room as the loaded panels, so the home does not jump when the status arrives.
  if (!status) {
    return (
      <section
        className={`flex min-h-[268px] flex-[4_1_0] flex-col justify-end bg-panel p-3.5 short:min-h-[212px] ${message ? "" : "animate-pulse"}`}
        aria-label="Pacchetti"
      >
        {notice}
      </section>
    );
  }

  const canBuy = status.coin_balance >= status.standard_pack_price;

  return (
    <section className="flex flex-[4_1_0] flex-col gap-2">
      <div className="cut-bottom relative flex min-h-52 flex-1 flex-col items-start overflow-hidden bg-comic-yellow px-3.5 pb-[22px] pt-3 text-black [container-type:size] short:min-h-39">
        <div
          aria-hidden
          className="halftone absolute inset-0 [--dot-color:var(--comic-magenta)] [mask-image:linear-gradient(200deg,#000_8%,transparent_62%)]"
        />
        <PackArt
          body="#ff2e6c"
          omega="#ffd60a"
          shine={status.daily_available}
          className={`absolute -right-1.5 top-3 h-[calc(100%-44px)] max-h-[250px] rotate-[9deg] ${status.daily_available ? "animate-pack-float" : ""}`}
        />
        <div className="relative max-w-[57%]">
          <h1 className="font-display text-[clamp(30px,5.6dvh,44px)] uppercase leading-[1.04]">Pacchetto del giorno</h1>
          {notice ?? (
            <p className="mt-1.5 text-sm font-semibold leading-[18px] cramped:hidden">
              {status.daily_available ? "5 carte gratis, almeno una Gamma o superiore." : "Già aperto oggi."}
            </p>
          )}
        </div>
        {status.daily_available ? (
          <>
            <ComicBurst
              fill="#fff8e7"
              className="absolute bottom-3.5 right-0 h-[62px] w-[62px] -rotate-12"
              textClassName="text-sm tracking-wide"
            >
              GRATIS!
            </ComicBurst>
            <button
              type="button"
              onClick={() => open("daily")}
              disabled={opening !== null}
              className="btn relative mt-auto min-h-13 bg-black px-5 font-display text-[21px] uppercase tracking-wide text-comic-yellow shadow-[4px_4px_0_var(--comic-magenta)] disabled:opacity-60 short:min-h-12"
            >
              {opening === "daily" ? "Apertura…" : "Apri il pacchetto"}
            </button>
          </>
        ) : (
          <div className="relative mt-auto flex flex-col items-start">
            <p className="text-xs font-extrabold uppercase tracking-wide">Il prossimo arriva tra</p>
            <p className="mt-0.5 -skew-x-8 bg-black px-3.5 font-display text-[26px] leading-11 tabular-nums text-comic-yellow shadow-[4px_4px_0_var(--comic-magenta)] short:leading-10">
              {formatCountdown((resetsAt ?? now) - now)}
            </p>
          </div>
        )}
      </div>

      <div className="row-link min-h-13 shrink-0 py-1 pl-3.5 pr-2.5 short:min-h-12 short:py-0.5">
        <Link href="/negozio" className="min-w-0">
          <p className="font-display text-base uppercase leading-5">Pacchetto standard</p>
          <p className="text-[13px] font-semibold leading-[17px] text-muted">
            {status.standard_pack_price} monete · <span className="underline">probabilità</span>
          </p>
        </Link>
        <HoldToConfirmButton
          onConfirm={() => open("standard")}
          disabled={!canBuy || opening !== null}
          hint={opening === "standard" ? "" : "Tieni premuto"}
          fillColor="var(--comic-yellow)"
          className="btn btn-outline shrink-0"
        >
          {opening === "standard" ? "…" : "Acquista"}
        </HoldToConfirmButton>
      </div>
    </section>
  );
}
