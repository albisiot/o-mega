"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useSyncExternalStore } from "react";
import { ReturnLink } from "@/components/return-link";
import { openedFrom, placeKey } from "@/lib/place-memory";

const CLASS = "btn btn-primary mt-3";

const noSubscription = () => () => {};

/** The way out of a page outside the bottom bar: back where it was opened from, or the home. */
export function ExitLink() {
  // Known only in the browser, after the static page has been shown.
  // By the router's path: arriving by a link, the page renders before the URL changes.
  const pathname = usePathname();
  const read = useCallback(() => openedFrom(placeKey(pathname)), [pathname]);
  const from = useSyncExternalStore(noSubscription, read, () => null);

  if (from) {
    return (
      <ReturnLink href={from} className={CLASS}>
        Torna indietro
      </ReturnLink>
    );
  }
  return (
    <Link href="/" className={CLASS}>
      Torna a O-MEGA
    </Link>
  );
}
