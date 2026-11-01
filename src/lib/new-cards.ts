const SEEN_KEY = "o-mega.album-seen";

/** Characters seen in the album on this device; null before the first visit or without storage. */
export function loadSeenCards(): ReadonlySet<string> | null {
  try {
    const saved = localStorage.getItem(SEEN_KEY);
    return saved ? new Set<string>(JSON.parse(saved)) : null;
  } catch {
    return null;
  }
}

export function saveSeenCards(ownedIds: string[]) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...new Set([...(loadSeenCards() ?? []), ...ownedIds])]));
  } catch {
    // A convenience of this device: without storage there are just no badges.
  }
}
