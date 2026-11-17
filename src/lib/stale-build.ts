// After a deploy, a page of the previous build can still be open, or come back
// from a cache, and ask for JS and CSS files the server no longer has. Such a
// page cannot work: reloading it once brings in the new build.
//
// Two ways in, sharing one guard so that a page that keeps failing reloads at
// most once a minute:
// - STALE_BUILD_SCRIPT, inline in the root layout's <head>: a <script> or a
//   stylesheet of the page's own HTML that fails to load. Nothing else sees it:
//   Turbopack waits forever on a script that failed before it looked, and takes
//   a failed stylesheet for a loaded one.
// - The error pages (app/error.tsx, app/global-error.tsx): a chunk asked for
//   while rendering (ChunkLoadError).

const RELOAD_KEY = "o-mega-stale-reload";
// A page that fails again this soon after reloading for the same reason is not
// stale: the reload did not help, and reloading again would loop.
export const RELOAD_WINDOW_MS = 60_000;

const STALE_MESSAGES =
  /Failed to load chunk|Loading (CSS )?chunk \S+ failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i;

/** True for the errors a missing build file causes (Turbopack, webpack, native import()). */
export function isStaleBuildError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.name === "ChunkLoadError" || STALE_MESSAGES.test(error.message);
}

/** Whether the page at `path` may reload, given the mark the last such reload left in this tab. */
export function mayReload(mark: string | null, path: string, now: number): boolean {
  let last: unknown = null;
  try {
    last = JSON.parse(mark ?? "null");
  } catch {
    return true;
  }
  if (typeof last !== "object" || last === null) return true;
  const { path: lastPath, at } = last as { path?: unknown; at?: unknown };
  return !(lastPath === path && typeof at === "number" && now - at < RELOAD_WINDOW_MS);
}

/** Whether this page may reload to pick up the new build. False when the tab's storage is unusable: no guard, no reload. */
export function canReloadForNewBuild(): boolean {
  try {
    return mayReload(window.sessionStorage.getItem(RELOAD_KEY), window.location.pathname, Date.now());
  } catch {
    return false;
  }
}

/** Reloads the page, leaving the mark that keeps it from doing so again within the minute. */
export function reloadForNewBuild(): void {
  try {
    window.sessionStorage.setItem(RELOAD_KEY, JSON.stringify({ path: window.location.pathname, at: Date.now() }));
  } catch {
    return;
  }
  window.location.reload();
}

/**
 * Runs while the page's own HTML loads: a script or stylesheet of the build
 * (under /_next/static/) that fails to load means the HTML is older than the
 * server's files. Stops at the load event: later files are asked for by the
 * app, which handles their failure (error pages, or a fallback like the flat
 * winner name). Same guard and mark as mayReload(); keep the two in step.
 */
export const STALE_BUILD_SCRIPT = `(function(){
var key=${JSON.stringify(RELOAD_KEY)},span=${RELOAD_WINDOW_MS};
function onError(event){
var el=event.target,url="";
if(el&&el.tagName==="SCRIPT")url=el.src;
else if(el&&el.tagName==="LINK"&&el.rel==="stylesheet")url=el.href;
if(!url||url.indexOf("/_next/static/")<0||navigator.onLine===false)return;
var path=location.pathname,now=Date.now();
try{
var last=null;
try{last=JSON.parse(sessionStorage.getItem(key)||"null")}catch(e){}
if(last&&typeof last==="object"&&last.path===path&&typeof last.at==="number"&&now-last.at<span)return;
sessionStorage.setItem(key,JSON.stringify({path:path,at:now}));
}catch(e){return}
removeEventListener("error",onError,true);
location.reload();
}
addEventListener("error",onError,true);
addEventListener("load",function(){removeEventListener("error",onError,true)});
})();`;
