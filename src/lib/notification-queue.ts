// The line of in-app banners (SPEC §11.1). The server writes the news; this only
// decides which one shows and in what order. Pure: no I/O, no timers.

export type NotificationKind = "objective_completed" | "event_reward";

export type PlayerNotification = {
  id: string;
  /** A kind this app version does not know still shows, with no link. */
  kind: NotificationKind | (string & {});
  title: string;
  body: string;
  data: Record<string, unknown>;
  created_at: string;
};

export type BannerQueue = {
  /** Waiting banners, oldest first. The first one is the one on screen, unless banners are held. */
  queue: PlayerNotification[];
  /** The banner on its way out (exit animation), still at the head of the queue. */
  leaving: string | null;
  /** Every id ever queued here, so a notification read twice shows once. */
  known: string[];
};

export const EMPTY_BANNER_QUEUE: BannerQueue = { queue: [], leaving: null, known: [] };

const KNOWN_LIMIT = 200;

/**
 * Adds notifications not seen before, in the order they happened. Past `maxQueued`,
 * the oldest waiting ones are dropped (never the one on screen).
 */
export function enqueueBanners(state: BannerQueue, incoming: PlayerNotification[], maxQueued: number): BannerQueue {
  const known = new Set(state.known);
  const fresh: PlayerNotification[] = [];
  for (const n of incoming) {
    if (known.has(n.id)) continue;
    known.add(n.id);
    fresh.push(n);
  }
  if (fresh.length === 0) return state;
  fresh.sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  let queue = [...state.queue, ...fresh];
  if (queue.length > maxQueued) {
    const [head, ...rest] = queue;
    queue = maxQueued <= 1 ? [head] : [head, ...rest.slice(rest.length - (maxQueued - 1))];
  }
  return { ...state, queue, known: [...known].slice(-KNOWN_LIMIT) };
}

/** The banner to show now: the head of the line, unless something asked banners to wait. */
export function currentBanner(state: BannerQueue, held: boolean): PlayerNotification | null {
  return held ? null : (state.queue[0] ?? null);
}

/** The banner on screen starts leaving (timer, tap or swipe). */
export function leaveBanner(state: BannerQueue, id: string): BannerQueue {
  if (state.queue[0]?.id !== id || state.leaving === id) return state;
  return { ...state, leaving: id };
}

/** The banner is gone: the next one in line can show. */
export function removeBanner(state: BannerQueue, id: string): BannerQueue {
  if (!state.queue.some((n) => n.id === id)) return state;
  return { ...state, queue: state.queue.filter((n) => n.id !== id), leaving: state.leaving === id ? null : state.leaving };
}

/** Where a tap on the banner leads; null: nowhere, the tap only closes it. */
export function bannerHref(notification: PlayerNotification): string | null {
  switch (notification.kind) {
    case "objective_completed":
      return "/obiettivi/";
    case "event_reward":
      return "/evento/";
    default:
      return null;
  }
}

const count = (value: unknown) => (typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0);

/** The prize in a few words ("40 monete · 1 pacchetto"), or null when the data has none. */
export function bannerReward(notification: PlayerNotification): string | null {
  const coins = count(notification.data.coins);
  const packs = count(notification.data.packs);
  const cards = count(notification.data.cards);
  const parts = [
    coins > 0 ? `${coins} ${coins === 1 ? "moneta" : "monete"}` : null,
    packs > 0 ? `${packs} ${packs === 1 ? "pacchetto" : "pacchetti"}` : null,
    cards > 0 ? `${cards} ${cards === 1 ? "carta" : "carte"}` : null,
  ].filter((p): p is string => p !== null);
  return parts.length > 0 ? parts.join(" · ") : null;
}

/** The call to action under the text. */
export function bannerHint(notification: PlayerNotification): string {
  switch (notification.kind) {
    case "objective_completed":
      return "Tocca per riscattarlo";
    case "event_reward":
      return "Tocca per vederlo";
    default:
      return "Tocca per chiudere";
  }
}

/** Pixels a finger must travel up to throw the banner away; less is a tap or nothing. */
export const SWIPE_AWAY_PX = 24;
/** Movement within this is still a tap. */
export const TAP_SLOP_PX = 8;

export type BannerGesture = "tap" | "swipe" | "none";

/** What a finger that went down and came up `dx`, `dy` pixels away meant. */
export function bannerGesture(dx: number, dy: number): BannerGesture {
  if (dy <= -SWIPE_AWAY_PX && Math.abs(dy) > Math.abs(dx)) return "swipe";
  if (Math.abs(dx) <= TAP_SLOP_PX && Math.abs(dy) <= TAP_SLOP_PX) return "tap";
  return "none";
}

/** Reads the server's list, leaving out anything malformed. */
export function parseNotifications(raw: unknown): PlayerNotification[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item): PlayerNotification[] => {
    if (!item || typeof item !== "object") return [];
    const n = item as Record<string, unknown>;
    if (typeof n.id !== "string" || typeof n.kind !== "string" || typeof n.title !== "string") return [];
    return [
      {
        id: n.id,
        kind: n.kind,
        title: n.title,
        body: typeof n.body === "string" ? n.body : "",
        data: n.data && typeof n.data === "object" && !Array.isArray(n.data) ? (n.data as Record<string, unknown>) : {},
        created_at: typeof n.created_at === "string" ? n.created_at : "",
      },
    ];
  });
}
