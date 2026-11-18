"use client";

import Link from "next/link";
import { BackLink } from "@/components/comic-parts";
import { ADMIN_TOOL_GROUPS, ADMIN_TOOLS } from "@/config/admin-tools";

/**
 * The EDITOR screen: every admin tool on one screen, in two columns, that fits the phone and
 * never scrolls. Rendered by /editor for admins and by the development page /prova-sfide.
 */
export function EditorMenu() {
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
                className="min-h-0 overflow-hidden border-[3px] border-black bg-panel px-2.5 py-2 shadow-[3px_3px_0_#000] [container-type:size] active:translate-x-px active:translate-y-px"
                style={{ borderTopColor: group.color, borderTopWidth: 6 }}
              >
                {/* Each tile measures itself (a size container): the name and the description
                    always show whole, and the icon only when there is room left for it. */}
                <span className="flex h-full flex-col justify-between gap-1">
                  <svg
                    viewBox="0 0 24 24"
                    className="hidden h-6 w-6 shrink-0 [@container(min-height:78px)]:block [@container(min-height:90px)]:h-9 [@container(min-height:90px)]:w-9"
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
                    <span className="mt-0.5 line-clamp-2 text-[11px] font-semibold leading-[14px] text-muted [@container(max-height:49px)]:hidden">
                      {tool.description}
                    </span>
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>
      </main>
    </div>
  );
}
