// On iPhone, a home-screen app can get a window shorter than the screen, which
// leaves an empty band under anything fixed to the bottom. The gap is measured
// rather than assumed: where the window fills the screen it is simply zero.

/** Above this the window is shorter for another reason, such as the keyboard. */
const MAX_GAP = 80;

export function viewportGap(
  screen: { width: number; height: number },
  window: { innerWidth: number; innerHeight: number },
): number {
  // iOS keeps screen.width and screen.height in portrait terms when rotated.
  const landscape = window.innerWidth > window.innerHeight;
  const screenHeight = landscape ? Math.min(screen.width, screen.height) : Math.max(screen.width, screen.height);
  const gap = screenHeight - window.innerHeight;
  return gap > 0 && gap <= MAX_GAP ? gap : 0;
}
