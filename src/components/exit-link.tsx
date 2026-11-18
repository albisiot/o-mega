"use client";

import { GoBackLink } from "@/components/return-link";

/** The way out of a page outside the bottom bar: back where it was opened from, or the home. */
export function ExitLink() {
  return (
    <GoBackLink fallback="/" className="btn btn-primary mt-3">
      {(_target, behind) => (behind ? "Torna indietro" : "Torna a O-MEGA")}
    </GoBackLink>
  );
}
