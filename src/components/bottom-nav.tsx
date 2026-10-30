"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

const TABS = [
  { href: "/", label: "Home", icon: "M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10" },
  { href: "/gioca", label: "Gioca", icon: "M6 4l14 8-14 8z" },
  { href: "/collezione", label: "Collezione", icon: "M4 5h11v15H4zM8 5V3h12v15h-5" },
  { href: "/negozio", label: "Negozio", icon: "M5 8h14l-1 12H6zM9 8V6a3 3 0 016 0v2" },
  { href: "/profilo", label: "Profilo", icon: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0" },
];

// Pages where the bar stays out of the way: a match, a pack or a team choice
// have their own bottom action and should not be left by accident.
const SHOWN_ON = new Set([...TABS.map((tab) => tab.href), "/storico"]);

/** Main navigation of the signed-in player. */
export function BottomNav() {
  const { session } = useAuth();
  const pathname = usePathname().replace(/\/+$/, "") || "/";
  if (!session || !SHOWN_ON.has(pathname)) return null;

  return (
    <>
      {/* Keeps the end of the page clear of the fixed bar. */}
      <div className="h-16 shrink-0" aria-hidden />
      <nav
        aria-label="Navigazione principale"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-zinc-950/95 pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="mx-auto flex max-w-md">
          {TABS.map((tab) => {
            const active = pathname === tab.href;
            return (
              <li key={tab.href} className="flex-1">
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold ${
                    active ? "text-amber-300" : "text-zinc-400"
                  }`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d={tab.icon} />
                  </svg>
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
