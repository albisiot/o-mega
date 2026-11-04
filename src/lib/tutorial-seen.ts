// Whether this device has gone through the first-run tutorial. Kept apart from the
// tutorial itself, so the home can check it without downloading the tutorial.
const SEEN_KEY = "o-mega.tutorial-seen";

export function hasSeenTutorial(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) !== null;
  } catch {
    return true;
  }
}

export function markTutorialSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Without storage the tutorial simply shows again on the next visit.
  }
}
