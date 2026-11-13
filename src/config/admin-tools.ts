/** The admin pages gathered by the EDITOR page, in the order they are shown. */
export type AdminToolGroup = "contents" | "economy" | "events";

export type AdminTool = {
  href: string;
  name: string;
  description: string;
  group: AdminToolGroup;
  /** SVG path on a 24×24 grid, stroked. */
  icon: string;
};

export const ADMIN_TOOL_GROUPS: Record<AdminToolGroup, { label: string; color: string }> = {
  contents: { label: "Contenuti", color: "var(--comic-yellow)" },
  economy: { label: "Economia", color: "var(--comic-cyan)" },
  events: { label: "Eventi", color: "var(--comic-magenta)" },
};

export const ADMIN_TOOLS: AdminTool[] = [
  {
    href: "/gestione-pacchetti",
    name: "Carte nei pacchetti",
    description: "Quali carte escono dai pacchetti",
    group: "contents",
    icon: "M5 4h10v16H5zM15 6h4v14H9",
  },
  {
    href: "/gestione-pacchetti-speciali",
    name: "Pacchetti speciali",
    description: "Pacchetti a tema e in vendita",
    group: "contents",
    icon: "M4 9h16v11H4zM2 5h20v4H2zM12 5v15M12 5c-2-3-6-3-6 0M12 5c2-3 6-3 6 0",
  },
  {
    href: "/gestione-minacce",
    name: "Minacce",
    description: "Testi, regole e fasce di rarità",
    group: "contents",
    icon: "M12 3l9 17H3zM12 10v4M12 17v.5",
  },
  {
    href: "/gestione-minaccia",
    name: "Grande Minaccia",
    description: "Il boss del tavolo comune",
    group: "contents",
    icon: "M5 20V9l3 3 4-7 4 7 3-3v11zM9 16h6",
  },
  {
    href: "/gestione-codici",
    name: "Codici bonus",
    description: "Codici da riscattare",
    group: "economy",
    icon: "M3 7h18v4a2 2 0 000 4v4H3v-4a2 2 0 000-4zM14 7v12",
  },
  {
    href: "/gestione-ricompense",
    name: "Ricompense partite",
    description: "Monete e XP di ogni partita",
    group: "economy",
    icon: "M12 4a8 8 0 100 16 8 8 0 000-16zM12 8v8M9.5 10h4a1.5 1.5 0 010 3h-3a1.5 1.5 0 000 3h4",
  },
  {
    href: "/gestione-eventi",
    name: "Eventi",
    description: "Eventi a tempo e i loro premi",
    group: "events",
    icon: "M4 6h16v14H4zM4 10h16M8 3v5M16 3v5M8 14h3v3H8z",
  },
  {
    href: "/gestione-obiettivi",
    name: "Obiettivi del giorno",
    description: "Missioni giornaliere",
    group: "events",
    icon: "M12 3a9 9 0 100 18 9 9 0 000-18zM12 7a5 5 0 100 10 5 5 0 000-10zM12 11v2",
  },
];
