// Where the album was when a card was opened: back from the card, it reopens there.
const SCROLL_KEY = "o-mega.album-scroll";

/** The album's scrolling panel: the page itself fits the screen and never scrolls. */
export const ALBUM_SCROLL_BOX = "album";

export function albumScrollBox(): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-keep-scroll="${ALBUM_SCROLL_BOX}"]`);
}

export function saveAlbumScroll() {
  try {
    sessionStorage.setItem(SCROLL_KEY, String(albumScrollBox()?.scrollTop ?? 0));
  } catch {
    // The position is a convenience: losing it is fine.
  }
}

/** The saved position, if the card being shown was opened from the album. */
export function savedAlbumScroll(): number | null {
  try {
    const value = sessionStorage.getItem(SCROLL_KEY);
    const y = value === null ? NaN : Number(value);
    return Number.isFinite(y) ? y : null;
  } catch {
    return null;
  }
}

export function clearAlbumScroll() {
  try {
    sessionStorage.removeItem(SCROLL_KEY);
  } catch {
    // Nothing to clean up.
  }
}

// The owned characters the album showed, in its order and with its filters, when a card was
// opened: the card's page browses them with a swipe. Kept with the scroll, for this visit.
const ORDER_KEY = "o-mega.album-order";

export function saveAlbumOrder(ids: readonly string[]) {
  try {
    sessionStorage.setItem(ORDER_KEY, JSON.stringify(ids));
  } catch {
    // Browsing is a convenience: without the list the card simply stands alone.
  }
}

export function savedAlbumOrder(): string[] {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(ORDER_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}
