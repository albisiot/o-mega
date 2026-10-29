// Same normalization as next.config.ts, so raw asset URLs match the basePath
// that Next applies automatically to <Link> and file-based metadata.
export const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/, "");

/**
 * Prefixes an absolute path with the basePath. Use it for URLs Next does not
 * rewrite on its own: manifest entries, service worker, files in `public/`.
 */
export function withBasePath(path: string): string {
  return `${BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`;
}
