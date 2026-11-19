"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { TEXT_SELECTABLE_CLASS, allowsTextSelection } from "@/lib/text-selection";

/**
 * Gives text selection back on the Editor's pages (see src/lib/text-selection.ts): everywhere
 * else globals.css turns it off. Mounted once, in the root layout.
 */
export function TextSelection() {
  const selectable = allowsTextSelection(usePathname());
  useEffect(() => {
    document.documentElement.classList.toggle(TEXT_SELECTABLE_CLASS, selectable);
  }, [selectable]);
  return null;
}
