"use client";

import Link from "next/link";
import { GateLink, useModeNotice } from "@/components/mode-gate";
import { LeagueBadge } from "@/components/ranked-parts";
import type { ModeStatus } from "@/lib/mode-availability";
import { leagueInfo, type MyRanked } from "@/lib/ranked";

/**
 * The home's way to play, sized by its share of the room: Gioca (every mode) and, beside it,
 * the Classificata (SPEC §8.7) with the player's Fama and league. Side by side, so on a short
 * phone they take no height from the pack panel. The lettering follows each tile's size.
 */
export function HomePlayButtons({
  ranked,
  challenge = null,
  rankedStatus = null,
}: {
  ranked: MyRanked | null;
  /** A Sfida a tema running (SPEC §8.8): its name takes the place of «Tutte le modalità». */
  challenge?: { title: string; color: string } | null;
  /** When the Classificata is open (EDITOR); a prize waiting on its page opens it anyway. */
  rankedStatus?: ModeStatus | null;
}) {
  const { notice, show } = useModeNotice();
  return (
    <div className="flex min-h-21 flex-[1_1_0] gap-2 short:min-h-18">
      <Link
        href="/gioca"
        className="cut-both speed-lines-moving flex min-w-0 flex-[11_1_0] flex-col justify-center bg-comic-magenta px-3.5 py-1.5 text-black [container-type:size]"
      >
        <p className="-skew-x-8 font-display text-[length:clamp(30px,min(46cqh,26cqw),96px)] uppercase leading-[0.95]">
          Gioca
        </p>
        {challenge ? (
          <p className="mt-0.5 flex min-w-0 items-center gap-1 text-[13px] font-extrabold leading-4">
            <span className="shrink-0 -rotate-2 border-2 border-black px-1 font-sfx text-[12px] leading-[14px] tracking-wide" style={{ background: challenge.color }}>
              ★ A tema
            </span>
            <span className="min-w-0 truncate">{challenge.title}</span>
          </p>
        ) : (
          <p className="mt-0.5 truncate text-[13px] font-extrabold leading-4">Tutte le modalità</p>
        )}
      </Link>
      <GateLink
        href="/classificata"
        status={ranked?.prizes.length ? null : rankedStatus}
        onClosed={show}
        label={ranked ? `Classificata: ${ranked.fama} Fama, ${leagueInfo(ranked.league).name}` : "Classificata"}
        className="cut-both rays-gold flex min-w-0 flex-[9_1_0] flex-col justify-center gap-1 px-3 py-1.5 text-black [container-type:size]"
      >
        <p className="-skew-x-8 font-display text-[length:clamp(17px,min(24cqh,15cqw),40px)] uppercase leading-none">
          Classificata
        </p>
        {ranked ? (
          <p className="flex items-center gap-1.5">
            <span className="font-display text-[length:clamp(24px,min(34cqh,20cqw),56px)] leading-none">{ranked.fama}</span>
            <span className="flex flex-col items-start gap-0.5">
              <span className="text-[11px] font-extrabold uppercase leading-3">Fama</span>
              <LeagueBadge league={ranked.league} dark className="!py-0 !text-[10px] !leading-[14px]" />
            </span>
          </p>
        ) : (
          <p className="text-[13px] font-extrabold leading-4">La Fama in gioco</p>
        )}
      </GateLink>
      {notice}
    </div>
  );
}
