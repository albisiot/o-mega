/**
 * The larger copy of a card drawing, for the full-screen view. Cards and lists
 * use the 600px images; the full ones live under cards/full/ with the same
 * path. Older drawings have no larger copy: the viewer falls back to art_url.
 */
export function fullArtUrl(artUrl: string): string {
  return artUrl.replace(/^\/cards\//, "/cards/full/");
}

/**
 * The 360px copy of a card drawing, for album tiles and small cards shown in
 * a grid (scripts/generate-thumbs.mjs). Every drawing has one.
 */
export function thumbArtUrl(artUrl: string): string {
  return artUrl.replace(/^\/cards\//, "/cards/thumb/");
}
