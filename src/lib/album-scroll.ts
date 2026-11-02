// Where the album was when a card was opened: back from the card, it reopens there.
const SCROLL_KEY = "o-mega.album-scroll";

export function saveAlbumScroll() {
  try {
    sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
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
