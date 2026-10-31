"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { preloadWorldIntro } from "@/components/world-intro";
import { WORLD_INTRO, WORLD_LOADING_LINES } from "@/config/world";
import { withBasePath } from "@/lib/base-path";

const MIN_VISIBLE_MS = 1500;
// Past this, the app opens anyway: a slow network must never trap the player here.
const MAX_VISIBLE_MS = 5000;
const FADE_MS = 400;
const LINE_MS = 1300;
const HOME_READY_EVENT = "o-mega:home-ready";
const TRACE =
  "M0 20H30L36 8L42 32L48 14L54 26L60 20H100L106 2L114 38L122 6L130 34L138 20H200" +
  "M200 20H230L236 8L242 32L248 14L254 26L260 20H300L306 2L314 38L322 6L330 34L338 20H400";

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
  const pathname = usePathname();
  const { status, session, profile } = useAuth();
  const imageRef = useRef<HTMLImageElement>(null);
  const [minElapsed, setMinElapsed] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const [homeReady, setHomeReady] = useState(false);
  const [line, setLine] = useState(0);

  useEffect(() => {
    preloadWorldIntro();
    const onHomeReady = () => setHomeReady(true);
    window.addEventListener(HOME_READY_EVENT, onHomeReady);
    const minTimer = setTimeout(() => setMinElapsed(true), MIN_VISIBLE_MS);
    const maxTimer = setTimeout(() => setTimedOut(true), MAX_VISIBLE_MS);
    const lineTimer = setInterval(() => setLine((current) => current + 1), LINE_MS);
    return () => {
      window.removeEventListener(HOME_READY_EVENT, onHomeReady);
      clearTimeout(minTimer);
      clearTimeout(maxTimer);
      clearInterval(lineTimer);
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
      className={`rays-dark fixed inset-0 z-40 flex flex-col overflow-hidden transition-opacity duration-400 ${
        leaving ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
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

      <div className="relative mt-[calc(env(safe-area-inset-top)+9vh)] flex flex-col items-center gap-1 px-6 text-center">
        <p className="-skew-x-8 font-display text-8xl tracking-wide text-comic-yellow [text-shadow:5px_5px_0_var(--comic-magenta)]">
          O-MEGA
        </p>
        <p className="text-sm font-bold uppercase tracking-widest text-comic-cyan">Nuova Megara</p>
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
        <p className="min-h-5 text-sm font-semibold">{WORLD_LOADING_LINES[line % WORLD_LOADING_LINES.length]}</p>
      </div>
    </div>
  );
}
