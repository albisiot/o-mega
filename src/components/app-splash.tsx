"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useAuth } from "@/components/auth-provider";
import { preloadWorldIntro } from "@/components/world-intro";
import { WORLD_INTRO, WORLD_SPLASH_LINES } from "@/config/world";
import { useBannerHold } from "@/lib/banner-hold";
import { withBasePath } from "@/lib/base-path";

// The splash leaves as soon as the home is ready: this only spares a flash when everything is
// cached. Counted from the page load, since the splash is in the static HTML and shows before React.
const MIN_VISIBLE_MS = 500;
// Past this, the app opens anyway: a slow network must never trap the player here.
const MAX_VISIBLE_MS = 5000;
const FADE_MS = 400;
const HOME_READY_EVENT = "o-mega:home-ready";
const TITLE = "O-MEGA";
const TRACE =
  "M0 20H30L36 8L42 32L48 14L54 26L60 20H100L106 2L114 38L122 6L130 34L138 20H200" +
  "M200 20H230L236 8L242 32L248 14L254 26L260 20H300L306 2L314 38L322 6L330 34L338 20H400";
// The app icon's paper burst and Ω (scripts/generate-icons.mjs), on a 512 square.
const EMBLEM_BURST =
  "256,10 300,65 363,34 378,103 448,103 433,171 496,201 452,256 496,311 433,341 448,409 378,409 363,478 " +
  "300,447 256,502 212,447 149,478 134,409 64,409 79,341 16,311 60,256 16,201 79,171 64,103 134,103 149,34 212,65";
const OMEGA =
  "M100 428H236V335L216 290A85 85 0 1 1 296 290L276 335V428H412V372H346V341A155 155 0 1 0 166 341V372H100Z";
// The dark star left behind the title.
const TITLE_STAR =
  "256,6 287,58 333,18 347,78 403,54 397,115 458,109 434,165 494,179 454,225 506,256 454,287 494,333 434,347 " +
  "458,403 397,397 403,458 347,434 333,494 287,454 256,506 225,454 179,494 165,434 109,458 115,397 54,403 " +
  "78,347 18,333 58,287 6,256 58,225 18,179 78,165 54,109 115,115 109,54 165,78 179,18 225,58";

/** Tells the splash that the home screen has its data. */
export function markHomeReady() {
  window.dispatchEvent(new Event(HOME_READY_EVENT));
}

/** World-themed screen shown over the app on every full page load. */
export function AppSplash() {
  const pathname = usePathname();
  // The return from Google has its own loading screen and is not an app opening.
  const [gone, setGone] = useState(() => pathname.startsWith("/auth/"));

  if (gone) return null;
  return <Splash onGone={() => setGone(true)} />;
}

function Splash({ onGone }: { onGone: () => void }) {
  // In-app banners wait for the app to open (SPEC §11.1).
  useBannerHold();
  const pathname = usePathname();
  const { status, session, profile } = useAuth();
  const imageRef = useRef<HTMLImageElement>(null);
  const [minElapsed, setMinElapsed] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const [homeReady, setHomeReady] = useState(false);

  useEffect(() => {
    preloadWorldIntro();
    const onHomeReady = () => setHomeReady(true);
    window.addEventListener(HOME_READY_EVENT, onHomeReady);
    const minTimer = setTimeout(() => setMinElapsed(true), Math.max(0, MIN_VISIBLE_MS - performance.now()));
    const maxTimer = setTimeout(() => setTimedOut(true), MAX_VISIBLE_MS);
    return () => {
      window.removeEventListener(HOME_READY_EVENT, onHomeReady);
      clearTimeout(minTimer);
      clearTimeout(maxTimer);
    };
  }, []);

  // The image is in the static HTML, so it can finish loading before React attaches onLoad.
  useEffect(() => {
    const markReady = () => setImageReady(true);
    if (imageRef.current?.complete) markReady();
  }, []);

  const authReady = status === "ready";
  const homeNeeded = pathname === "/" && Boolean(session && profile);
  const homeDone = authReady && (!homeNeeded || homeReady);
  const stepsDone = [authReady, homeDone, imageReady].filter(Boolean).length;
  const leaving = timedOut || (minElapsed && stepsDone === 3);

  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(onGone, FADE_MS);
    return () => clearTimeout(timer);
  }, [leaving, onGone]);

  return (
    <div
      role="status"
      aria-label="Caricamento"
      className={`fixed inset-0 z-40 overflow-hidden bg-background transition-opacity duration-400 ${
        leaving ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      {/* Larger than the screen, so the SBAM shake never shows an edge. */}
      <div className="splash-shake rays-dark absolute -inset-3.5">
        <div className="absolute inset-3.5 flex flex-col">
          <img
            ref={imageRef}
            src={withBasePath(WORLD_INTRO[0].image)}
            alt=""
            onLoad={() => setImageReady(true)}
            onError={() => setImageReady(true)}
            className={`absolute inset-x-0 bottom-0 h-[68%] w-full object-cover object-top transition-opacity duration-500 [mask-image:linear-gradient(to_bottom,transparent,black_18%)] ${
              imageReady ? "opacity-100" : "opacity-0"
            }`}
          />

          <div className="relative mt-[calc(var(--safe-top)+9vh)] flex flex-col items-center px-6 text-center">
            <div className="relative grid h-33 w-full place-items-center">
              <svg viewBox="0 0 512 512" preserveAspectRatio="none" className="splash-star" aria-hidden>
                <g className="splash-star-spin">
                  <polygon
                    points={TITLE_STAR}
                    fill="#1d1d26"
                    stroke="var(--comic-magenta)"
                    strokeWidth="3"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              </svg>
              <div className="splash-flash" aria-hidden />
              <svg viewBox="0 0 512 512" className="splash-emblem" aria-hidden>
                <polygon points={EMBLEM_BURST} fill="#fff8e7" stroke="#000" strokeWidth="10" strokeLinejoin="round" />
                <g transform="translate(256 256) skewX(-8) scale(0.88) translate(-256 -244)">
                  <path d={OMEGA} transform="translate(18 18)" fill="#000" stroke="#000" strokeWidth="20" strokeLinejoin="round" />
                  <path
                    d={OMEGA}
                    fill="var(--comic-magenta)"
                    stroke="#000"
                    strokeWidth="20"
                    strokeLinejoin="round"
                    paintOrder="stroke"
                  />
                </g>
              </svg>
              <p className="relative z-10 -skew-x-8 whitespace-nowrap font-display text-8xl tracking-wide text-comic-yellow [text-shadow:5px_5px_0_var(--comic-magenta)]">
                {[...TITLE].map((letter, index) => (
                  <span key={index} className="splash-letter" style={{ "--i": index } as CSSProperties}>
                    {letter}
                  </span>
                ))}
              </p>
              <span className="splash-sbam" aria-hidden>
                SBAM!
              </span>
            </div>
            {/* Every line is here; SPLASH_LINE_SCRIPT shows one per opening (src/lib/splash-line.ts). */}
            <p className="splash-sub splash-lines mt-5 max-w-75 text-[15px] font-bold leading-snug [text-shadow:0_2px_0_#000,0_0_10px_#000]">
              {WORLD_SPLASH_LINES.map((line) => (
                <span key={line} className="splash-line">
                  {line}
                </span>
              ))}
            </p>
          </div>

          <div className="relative mt-auto flex flex-col gap-2 bg-linear-to-t from-black via-black/80 to-transparent px-6 pb-[calc(env(safe-area-inset-bottom)+28px)] pt-12">
            <div className="overflow-hidden" aria-hidden>
              <svg viewBox="0 0 400 40" preserveAspectRatio="none" className="animate-seismograph h-10 w-[200%]">
                <path d={TRACE} fill="none" stroke="var(--comic-yellow)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              </svg>
            </div>
            <div className="h-1 bg-panel-raised" aria-hidden>
              <div className="h-full bg-comic-magenta transition-[width] duration-300" style={{ width: `${(stepsDone / 3) * 100}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
