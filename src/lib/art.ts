import { withBasePath } from "@/lib/base-path";
import { FULL_ART } from "@/lib/full-art";

/**
 * The larger copy of a card drawing, for the full-screen view. Cards and lists
 * use the 600px images; the full ones live under cards/full/ with the same
 * path. Older drawings have no larger copy: null, and the viewer shows art_url
 * without asking for a file that is not there.
 */
export function fullArtUrl(artUrl: string): string | null {
  const path = artUrl.replace(/^\/cards\//, "");
  return path !== artUrl && FULL_ART.has(path) ? `/cards/full/${path}` : null;
}

/**
 * The 360px copy of a card drawing, for album tiles and small cards shown in
 * a grid (scripts/generate-thumbs.mjs). Every drawing has one.
 */
export function thumbArtUrl(artUrl: string): string {
  return artUrl.replace(/^\/cards\//, "/cards/thumb/");
}

/**
 * The thumbnail and the 600px drawing as an <img srcset>. Paired with a `sizes`
 * value (the art's displayed width), phones get the thumbnail wherever it is
 * sharp enough and wide screens the 600px drawing.
 */
export function artSrcSet(artUrl: string): string {
  return `${withBasePath(thumbArtUrl(artUrl))} 360w, ${withBasePath(artUrl)} 600w`;
}
