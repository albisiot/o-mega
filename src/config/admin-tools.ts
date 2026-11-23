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
    href: "/gestione-boss",
    name: "Boss",
    description: "Grande Minaccia e Caccia grossa: fronti, Magnitudo, mosse",
    group: "contents",
    icon: "M4 19l3-10 5 4 5-4 3 10zM8 6a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM16 6a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM12 15v2",
  },
  {
    href: "/gestione-storia",
    name: "Storia",
    description: "Testi, premi e stelle delle missioni",
    group: "contents",
    icon: "M4 5a2 2 0 012-2h5v17H6a2 2 0 01-2-2zM20 5a2 2 0 00-2-2h-5v17h5a2 2 0 002-2zM16.5 7.5l.8 1.6 1.7.3-1.2 1.2.3 1.7-1.6-.8-1.6.8.3-1.7-1.2-1.2 1.7-.3z",
  },
  {
    href: "/gestione-operazioni",
    name: "Operazioni",
    description: "Capitoli, rivali, round e stelle in squadra",
    group: "contents",
    icon: "M8 11a3 3 0 100-6 3 3 0 000 6zM16 11a3 3 0 100-6 3 3 0 000 6zM2 20c0-3 3-5 6-5s6 2 6 5M12 20c0-3 2-5 4-5s6 2 6 5",
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
    href: "/gestione-schegge",
    name: "Schegge",
    description: "Valori delle varianti rotte e prezzi",
    group: "economy",
    icon: "M12 2l3 7-3 13-3-13zM4 9h16M8 9l4-7 4 7",
  },
  {
    href: "/gestione-modalita",
    name: "Modalità di gioco",
    description: "Quando sono attive, e l'etichetta",
    group: "events",
    icon: "M6 9h12a4 4 0 014 4v2a3 3 0 01-5.4 1.8L15 15H9l-1.6 1.8A3 3 0 012 15v-2a4 4 0 014-4zM7 11v3M5.5 12.5h3M16 12h.01M18 14h.01",
  },
  {
    href: "/gestione-eventi",
    name: "Eventi",
    description: "Eventi a tempo e i loro premi",
    group: "events",
    icon: "M4 6h16v14H4zM4 10h16M8 3v5M16 3v5M8 14h3v3H8z",
  },
  {
    href: "/gestione-sfide",
    name: "Sfide a tema",
    description: "Modalità con vincoli, per un periodo",
    group: "events",
    icon: "M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z",
  },
  {
    href: "/gestione-obiettivi",
    name: "Obiettivi del giorno",
    description: "Missioni giornaliere",
    group: "events",
    icon: "M12 3a9 9 0 100 18 9 9 0 000-18zM12 7a5 5 0 100 10 5 5 0 000-10zM12 11v2",
  },
  {
    href: "/gestione-imprese",
    name: "Imprese",
    description: "Obiettivi segreti a lungo termine",
    group: "events",
    icon: "M12 14a5 5 0 100-10 5 5 0 000 10zM9 13l-2 8 5-3 5 3-2-8",
  },
];
