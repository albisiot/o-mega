"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, type ReactNode } from "react";
import { packRevealHref } from "@/lib/packs";
import { currentPlaceKey, doneReturning, noteOpened, placeKey, rememberScroll } from "@/lib/place-memory";

/**
 * Opens the reveal of these openings from the page the player is on. At the end the reveal
 * goes back to this page, where it was left (scroll, open tab), and reloads its data.
 */
export function useOpenPackReveal(): (ids: string[]) => void {
  const router = useRouter();
  return useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      // The address bar at the moment of the tap: the page the player sees, query included.
      const from = currentPlaceKey();
      const href = packRevealHref(ids, from);
      rememberScroll(from);
      doneReturning();
      // The reveal knows it was opened from here, so its way out can simply go back.
      noteOpened(from, placeKey(href));
      router.push(href);
    },
    [router],
  );
}

/** A link to the reveal of these openings, which then returns to the page the link is on. */
export function PackRevealLink({ ids, className, children }: { ids: string[]; className: string; children: ReactNode }) {
  const open = useOpenPackReveal();
  return (
    <Link
      href={packRevealHref(ids)}
      // The opener is noted by `open`, with the reveal's real address.
      data-return=""
      className={className}
      onClick={(event) => {
        event.preventDefault();
        open(ids);
      }}
    >
      {children}
    </Link>
  );
}
