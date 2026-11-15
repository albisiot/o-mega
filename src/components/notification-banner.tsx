"use client";

import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useReducer, useRef, useState, useSyncExternalStore, type PointerEvent } from "react";
import { useAuth } from "@/components/auth-provider";
import { balance } from "@/config/balance";
import { bannersHeld, subscribeBannerHolds } from "@/lib/banner-hold";
import {
  bannerGesture,
  bannerHint,
  bannerHref,
  bannerReward,
  currentBanner,
  EMPTY_BANNER_QUEUE,
  enqueueBanners,
  leaveBanner,
  removeBanner,
  type BannerQueue,
  type PlayerNotification,
} from "@/lib/notification-queue";
import { fetchUnseenNotifications, markNotificationsSeen, subscribeToNotifications } from "@/lib/notifications";

const LEAVE_MS = 260;

export type BannerAction =
  | { type: "add"; items: PlayerNotification[] }
  | { type: "leave"; id: string }
  | { type: "remove"; id: string };

function reducer(state: BannerQueue, action: BannerAction): BannerQueue {
  switch (action.type) {
    case "add":
      return enqueueBanners(state, action.items, balance.notifications.maxQueued);
    case "leave":
      return leaveBanner(state, action.id);
    case "remove":
      return removeBanner(state, action.id);
  }
}

function subscribeVisibility(listener: () => void) {
  document.addEventListener("visibilitychange", listener);
  return () => document.removeEventListener("visibilitychange", listener);
}

/**
 * Good news from the server (an objective completed, an event milestone paid) as a
 * comic banner under the iPhone notch, in whatever screen the player is (SPEC §11.1).
 * One at a time, about 4 seconds each; a tap opens the page of the news, a swipe up
 * closes it. Waits while a round result, a rare threat, a pack or the splash plays.
 */
export function NotificationBanner() {
  const { session } = useAuth();
  const userId = session?.user.id;
  // A new player starts with a new line.
  return userId ? <Banners key={userId} userId={userId} /> : <div role="status" aria-live="polite" className="sr-only" />;
}

function Banners({ userId }: { userId: string }) {
  const [state, dispatch] = useBannerQueue();

  // Unseen news: on opening, on every ping, when the app comes back, when pings can arrive again.
  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetchUnseenNotifications()
        .then((items) => {
          if (!cancelled) dispatch({ type: "add", items });
        })
        .catch(() => {
          // The next ping or return to the app tries again.
        });
    };
    load();
    const unsubscribe = subscribeToNotifications(userId, load, (live) => {
      if (live) load();
    });
    const onVisible = () => {
      if (!document.hidden) load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [userId, dispatch]);

  return <BannerStage state={state} dispatch={dispatch} onShown={markSeen} />;
}

// Shown once is seen: it will not come back on another visit or device.
function markSeen(id: string) {
  markNotificationsSeen([id]).catch(() => {
    // Not marked: it may show once more next time, harmless.
  });
}

/** The line of banners: add with dispatch({ type: "add", items }). */
export function useBannerQueue() {
  return useReducer(reducer, EMPTY_BANNER_QUEUE);
}

/**
 * Where the banner on screen shows (under the notch), one at a time, waiting while
 * banners are held or the app is in the background. `onShown` hears each one once it appears.
 */
export function BannerStage({
  state,
  dispatch,
  onShown,
}: {
  state: BannerQueue;
  dispatch: (action: BannerAction) => void;
  onShown?: (id: string) => void;
}) {
  const held = useSyncExternalStore(subscribeBannerHolds, bannersHeld, () => true);
  const hidden = useSyncExternalStore(subscribeVisibility, () => document.hidden, () => true);
  const banner = currentBanner(state, held || hidden);
  const shown = useEffectEvent((id: string) => onShown?.(id));

  const bannerId = banner?.id;
  useEffect(() => {
    if (bannerId) shown(bannerId);
  }, [bannerId]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 z-[70] flex justify-center px-3"
      style={{ top: "calc(var(--safe-top) + 8px)" }}
    >
      {banner && (
        <Banner
          key={banner.id}
          notification={banner}
          leaving={state.leaving === banner.id}
          onLeave={() => dispatch({ type: "leave", id: banner.id })}
          onGone={() => dispatch({ type: "remove", id: banner.id })}
        />
      )}
    </div>
  );
}

function Banner({
  notification,
  leaving,
  onLeave,
  onGone,
}: {
  notification: PlayerNotification;
  leaving: boolean;
  onLeave: () => void;
  onGone: () => void;
}) {
  const router = useRouter();
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const [drag, setDrag] = useState(0);
  const [pressed, setPressed] = useState(false);
  const href = bannerHref(notification);
  const reward = bannerReward(notification);

  const leave = useEffectEvent(onLeave);
  const gone = useEffectEvent(onGone);

  // About 4 seconds on screen, not counting while a finger holds it.
  useEffect(() => {
    if (leaving || pressed) return;
    const timer = window.setTimeout(() => leave(), balance.notifications.showMs);
    return () => window.clearTimeout(timer);
  }, [leaving, pressed]);

  // The exit animation, then the next one in line.
  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(() => gone(), LEAVE_MS);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  const open = () => {
    onLeave();
    if (href) router.push(href);
  };

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    start.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
    setPressed(true);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Without capture a swipe that leaves the banner ends as a cancel: nothing happens.
    }
  };
  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (start.current?.id !== event.pointerId) return;
    setDrag(Math.min(0, event.clientY - start.current.y));
  };
  const onPointerEnd = (event: PointerEvent<HTMLButtonElement>, cancelled: boolean) => {
    const from = start.current;
    start.current = null;
    setPressed(false);
    if (!from || from.id !== event.pointerId) return;
    const gesture = cancelled ? "none" : bannerGesture(event.clientX - from.x, event.clientY - from.y);
    if (gesture === "swipe") {
      onLeave();
      return;
    }
    setDrag(0);
    if (gesture === "tap") open();
  };

  return (
    <button
      type="button"
      // Pointer gestures handle touch; this is the keyboard and screen reader path.
      onClick={(event) => {
        if (event.detail === 0) open();
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(event) => onPointerEnd(event, false)}
      onPointerCancel={(event) => onPointerEnd(event, true)}
      aria-label={`${notification.title} ${notification.body}${reward ? `. Premio: ${reward}` : ""}. ${bannerHint(notification)}.`}
      className={`notification-banner pointer-events-auto relative flex w-full max-w-md touch-none select-none items-center gap-3 border-[3px] border-black bg-comic-yellow py-2 pl-2 pr-3 text-left text-black shadow-[5px_5px_0_#000] ${
        leaving ? "notification-banner-leave" : "notification-banner-enter"
      }`}
      // `translate`, not `transform`: the enter animation owns transform.
      style={drag < 0 ? { translate: `0 ${drag}px` } : undefined}
    >
      <span
        aria-hidden
        className="flex h-12 w-12 shrink-0 -rotate-6 items-center justify-center border-[3px] border-black bg-comic-magenta font-sfx text-2xl leading-none text-white shadow-[2px_2px_0_#000]"
      >
        {notification.kind === "event_reward" ? "★" : notification.kind === "achievement" ? "✪" : "✔"}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block -skew-x-6 font-display text-[19px] uppercase leading-6">{notification.title}</span>
        {notification.body && <span className="line-clamp-2 text-[14px] font-bold leading-[18px]">{notification.body}</span>}
        <span className="block truncate text-[12px] font-extrabold uppercase leading-4 text-black/70">
          {reward ? `${reward} · ` : ""}
          {bannerHint(notification)}
        </span>
      </span>
    </button>
  );
}
