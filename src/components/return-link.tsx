"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { navHistory, usePreviousPage } from "@/lib/nav-history";
import { isPlace } from "@/lib/nav-stack";
import { placeHref } from "@/lib/pack-return";
import { backLabel } from "@/lib/page-names";
import { markReturning, placeKey, rememberPlaceState, rememberScroll } from "@/lib/place-memory";

type Router = ReturnType<typeof useRouter>;

/**
 * Back to the page the player came from (see src/lib/nav-history.ts), where they left it.
 * With nothing behind this page in the app (a shared link, the app just opened), `fallback`,
 * its parent, takes its place: the history never leads back here from it.
 */
export function goBack(router: Router, fallback: string) {
  rememberScroll();
  const history = navHistory();
  const previous = history?.previous() ?? null;
  if (history && previous !== null) {
    markReturning(previous);
    history.back();
    return;
  }
  const key = placeKey(fallback);
  markReturning(key);
  router.replace(placeHref(key));
}

/**
 * To the page `href`: back in the history when it is the page behind this one, so that going
 * back from it does not lead here again. Otherwise it opens in place of this page (a "Torna a…"),
 * or, `onward`, on top of it (a "Gioca ancora"). `state` is remembered state the page finds
 * when it comes back, in place of what it was left with (see useRememberedState); a page
 * opened `onward` starts afresh and gets none.
 */
export function returnTo(router: Router, href: string, onward = false, state?: Record<string, unknown>) {
  rememberScroll();
  const key = placeKey(href);
  const history = navHistory();
  const previous = history?.previous() ?? null;
  if (history && previous !== null && isPlace(previous, key)) {
    if (state) rememberPlaceState(previous, state);
    markReturning(previous);
    history.back();
    return;
  }
  if (onward) {
    router.push(placeHref(key));
    return;
  }
  if (state) rememberPlaceState(key, state);
  markReturning(key);
  router.replace(placeHref(key));
}

/**
 * A back arrow or button: to the page the player came from, `fallback` (the page above this
 * one) when there is none. `children` gets the page it leads to (a place key) and whether it
 * is the one behind; `labelled` names it for screen readers ("Torna al profilo").
 */
export function GoBackLink({
  fallback,
  className,
  labelled = false,
  children,
}: {
  fallback: string;
  className: string;
  labelled?: boolean;
  children: (target: string, behind: boolean) => ReactNode;
}) {
  const router = useRouter();
  const previous = usePreviousPage();
  const target = previous ?? placeKey(fallback);
  return (
    <Link
      href={placeHref(target)}
      data-return=""
      aria-label={labelled ? backLabel(target) : undefined}
      className={className}
      onClick={(event) => {
        event.preventDefault();
        goBack(router, fallback);
      }}
    >
      {children(target, previous !== null)}
    </Link>
  );
}

/**
 * A link to a named page that goes back to it when it is the page behind (see returnTo), where
 * it finds `state`.
 */
export function ReturnLink({
  href,
  className,
  label,
  onward = false,
  state,
  children,
}: {
  href: string;
  className: string;
  label?: string;
  onward?: boolean;
  state?: Record<string, unknown>;
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
        event.preventDefault();
        returnTo(router, href, onward, state);
      }}
    >
      {children}
    </Link>
  );
}
