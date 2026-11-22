"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { MODE_UNAVAILABLE, type ModeStatus } from "@/lib/mode-availability";

/**
 * A mode's state drawn on its button (EDITOR → Modalità di gioco): a closed mode gets a dark veil,
 * and the label, when there is one, sits on top as a sticker. The button needs `relative`.
 */
export function ModeGate({ status, compact = false }: { status: ModeStatus | null; compact?: boolean }) {
  if (!status) return null;
  return (
    <>
      {!status.open && <span aria-hidden className="pointer-events-none absolute inset-0 z-[1] bg-black/55" />}
      {status.label && (
        <span
          aria-hidden
          className={`pointer-events-none absolute z-[2] max-w-[calc(100%-10px)] rotate-3 truncate bg-black font-sfx tracking-wide text-comic-yellow ${
            compact ? "right-1 top-0.5 px-1 text-[11px] leading-[15px]" : "right-1.5 top-1 px-1.5 text-[13px] leading-[18px]"
          }`}
        >
          {status.label}
        </span>
      )}
    </>
  );
}

/** What a screen reader hears after the button's name. */
export function gateSaid(status: ModeStatus | null): string {
  if (!status) return "";
  if (!status.open) return `. Non disponibile ora${status.label ? `: ${status.label}` : ""}`;
  return status.label ? `. ${status.label}` : "";
}

/**
 * A link to a mode that stays where it is while the mode is closed: the same look under the veil,
 * and a tap says why instead of opening it.
 */
export function GateLink({
  href,
  status,
  onClosed,
  className,
  style,
  label,
  compact = false,
  children,
}: {
  href: string;
  status: ModeStatus | null;
  onClosed: () => void;
  className: string;
  style?: CSSProperties;
  /** The aria-label of the open link; the closed state is added to it. */
  label?: string;
  compact?: boolean;
  children: ReactNode;
}) {
  const said = label ? `${label}${gateSaid(status)}` : undefined;
  if (status && !status.open) {
    return (
      <button type="button" aria-disabled onClick={onClosed} aria-label={said} className={`relative text-left ${className}`} style={style}>
        {children}
        <ModeGate status={status} compact={compact} />
      </button>
    );
  }
  return (
    <Link href={href} aria-label={said} className={`relative ${className}`} style={style}>
      {children}
      <ModeGate status={status} compact={compact} />
    </Link>
  );
}

/** The short message a tap on a closed mode shows, for a moment, above the bottom bar. */
export function useModeNotice(): { notice: ReactNode; show: () => void } {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!shown) return;
    const timer = setTimeout(() => setShown(0), 2600);
    return () => clearTimeout(timer);
  }, [shown]);
  const show = useCallback(() => setShown(Date.now()), []);
  const notice = (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-40 flex justify-center">
      {shown ? (
        <p key={shown} className="border-[3px] border-black bg-comic-yellow px-3 py-2 text-center text-sm font-extrabold text-black shadow-[3px_3px_0_#000]">
          {MODE_UNAVAILABLE}
        </p>
      ) : null}
    </div>
  );
  return { notice, show };
}
