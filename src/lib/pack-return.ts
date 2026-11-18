// Where a pack reveal goes when it ends: back to the page the pack was opened from (the
// objectives, the shop, a match result…), carried in the reveal's address as `from`.
import { backLabel } from "@/lib/page-names";
import { placeKey, placePath } from "@/lib/place-memory";

/** Pages a reveal never returns to: another reveal, the sign-in callback. */
const NO_RETURN = ["/pacchetto", "/auth"];

/**
 * The page a reveal may return to, as a place key ("/obiettivi", "/partita?id=…"), or null.
 * Only paths inside the app: anything that could lead to another site ("https://…", "//host",
 * "/\host", control characters) is refused, so the `from` of an address cannot be used as an
 * open redirect.
 */
export function safeReturnPath(raw: string | null | undefined): string | null {
  if (!raw || raw.length > 512) return null;
  // One leading slash: "//host" and "/\host" are read by browsers as another site.
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  if (/[\u0000-\u001f\u007f\\]/.test(raw)) return null;
  let url: URL;
  try {
    url = new URL(raw, "http://local");
  } catch {
    return null;
  }
  if (url.origin !== "http://local") return null;
  const key = placeKey(url.pathname + url.search);
  const path = placePath(key);
  if (path.startsWith("//") || NO_RETURN.some((page) => path === page || path.startsWith(`${page}/`))) return null;
  return key;
}

/** The link to a place key, with the trailing slash of the static export: "/partita/?id=1". */
export function placeHref(key: string): string {
  const [path, query] = splitKey(key);
  return `${path === "/" ? "/" : `${path}/`}${query}`;
}

function splitKey(key: string): [string, string] {
  const at = key.indexOf("?");
  return at < 0 ? [key, ""] : [key.slice(0, at), key.slice(at)];
}

/** The text of the button that leaves the reveal: "Torna agli obiettivi". */
export function returnLabel(key: string): string {
  return backLabel(key);
}
