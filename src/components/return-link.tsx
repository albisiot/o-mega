"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { forgetOpener, markReturning, openedFrom, placeKey, placePath, rememberScroll } from "@/lib/place-memory";

/**
 * A back arrow: it returns to `href` where the player left it (scroll, open mode, tab). When
 * this page was opened from there, it simply goes back in the history; otherwise it opens
 * `href`, and still restores its place if the player has been there before.
 */
export function ReturnLink({
  href,
  className,
  label,
  children,
}: {
  href: string;
  className: string;
  label?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  return (
    <Link
      href={href}
      data-return=""
      aria-label={label}
      className={className}
      onClick={(event) => {
        const target = placeKey(href);
        const from = openedFrom();
        rememberScroll();
        if (from && placePath(from) === placePath(target) && window.history.length > 1) {
          event.preventDefault();
          markReturning(from);
          router.back();
        } else {
          // Opened afresh on top of this page: going back from it no longer leads to its opener.
          forgetOpener(target);
          markReturning(target);
        }
      }}
    >
      {children}
    </Link>
  );
}
