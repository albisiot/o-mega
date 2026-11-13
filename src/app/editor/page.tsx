"use client";

import Link from "next/link";
import { useRequireSignedIn } from "@/components/auth-provider";
import { BackLink } from "@/components/comic-parts";
import { LoadingScreen } from "@/components/loading-screen";
import { ADMIN_TOOL_GROUPS, ADMIN_TOOLS } from "@/config/admin-tools";
import { useIsAdmin } from "@/lib/use-is-admin";
import { useLockedScreen } from "@/lib/use-locked-screen";

/**
 * EDITOR: every admin tool on one screen, reached from the profile's «Altro» tab. The
 * page fits the phone and never scrolls. Showing it is only a convenience: every admin
 * function checks `is_admin()` on the server.
 */
export default function EditorPage() {
  useRequireSignedIn();
  const isAdmin = useIsAdmin();
  useLockedScreen(isAdmin === true);

  if (isAdmin === null) return <LoadingScreen label="Controllo dei permessi…" />;
  if (!isAdmin) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm font-semibold text-comic-magenta">Questa pagina è riservata agli amministratori.</p>
        <Link href="/profilo" className="flex min-h-11 items-center text-sm font-bold underline">
          Torna al profilo
        </Link>
      </main>
    );
  }

  return (
    <div className="game-shell">
      <header className="flex shrink-0 items-center gap-2.5 px-3 pb-1 pt-2">
        <BackLink href="/profilo" label="Torna al profilo" />
        <div className="min-w-0">
          <h1 className="truncate font-display text-[32px] uppercase leading-9 text-comic-yellow">Editor</h1>
          <p className="text-xs font-semibold leading-4 text-muted">Gli strumenti degli amministratori.</p>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col gap-2 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-2">
        <ul className="flex shrink-0 gap-3 text-[11px] font-extrabold uppercase" aria-label="Gruppi">
          {Object.values(ADMIN_TOOL_GROUPS).map((group) => (
            <li key={group.label} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5" style={{ background: group.color }} aria-hidden />
              {group.label}
            </li>
          ))}
        </ul>
        <nav aria-label="Strumenti admin" className="grid min-h-0 flex-1 auto-rows-fr grid-cols-2 gap-2">
          {ADMIN_TOOLS.map((tool) => {
            const group = ADMIN_TOOL_GROUPS[tool.group];
            return (
              <Link
                key={tool.href}
                href={tool.href}
                className="flex min-h-0 flex-col justify-between gap-1 overflow-hidden border-[3px] border-black bg-panel px-2.5 py-2 shadow-[3px_3px_0_#000] active:translate-x-px active:translate-y-px"
                style={{ borderTopColor: group.color, borderTopWidth: 6 }}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-9 w-9 shrink-0 [@media(max-height:640px)]:h-7 [@media(max-height:640px)]:w-7"
                  fill="none"
                  stroke={group.color}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d={tool.icon} />
                </svg>
                <span className="min-w-0">
                  <span className="block font-display text-[17px] uppercase leading-5">{tool.name}</span>
                  <span className="mt-0.5 block text-[11px] font-semibold leading-[14px] text-muted [@media(max-height:640px)]:hidden">{tool.description}</span>
                </span>
              </Link>
            );
          })}
        </nav>
      </main>
    </div>
  );
}
