"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { withBasePath } from "@/lib/base-path";
import { describeServerError } from "@/lib/errors";
import { forgetEverything } from "@/lib/last-seen";
import { bootstrapPlayer, type Profile } from "@/lib/player";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

type AuthContextValue = {
  /** "loading" until the session is known and, if signed in, the profile is ready. */
  status: "loading" | "ready";
  session: Session | null;
  profile: Profile | null;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  setProfile: (profile: Profile) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const SAVED_PROFILE_KEY = "o-mega.profile";

/** The profile last loaded on this device, if it belongs to this player. For display only. */
function savedProfile(userId: string): Profile | null {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVED_PROFILE_KEY) ?? "null") as Profile | null;
    return saved?.id === userId ? saved : null;
  } catch {
    return null;
  }
}

function saveProfile(profile: Profile | null) {
  try {
    if (profile) localStorage.setItem(SAVED_PROFILE_KEY, JSON.stringify(profile));
    else localStorage.removeItem(SAVED_PROFILE_KEY);
  } catch {
    // Without storage the home simply waits for bootstrap_player on the next visit.
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [sessionKnown, setSessionKnown] = useState(!isSupabaseConfigured);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    // Fires INITIAL_SESSION once the client has restored the session (or
    // completed the PKCE code exchange on /auth/callback).
    const { data } = getSupabase().auth.onAuthStateChange((_event, nextSession) => {
      // Supabase announces the session again each time the app comes back to the
      // foreground (SIGNED_IN) and at every hourly token refresh. Pages reload their
      // data when `session` changes, so keep the same object while the player is the
      // same: it only says who is signed in, and requests take the fresh token from
      // the Supabase client, never from here.
      setSession((current) => (current && nextSession && current.user.id === nextSession.user.id ? current : nextSession));
      setSessionKnown(true);
      if (nextSession) {
        // A returning player gets the home at once with the profile saved last time, and its
        // requests start next to bootstrap_player instead of after it. A new player has nothing
        // saved and waits: bootstrap_player creates the profile and the starter cards.
        const userId = nextSession.user.id;
        setProfile((current) => (current?.id === userId ? current : savedProfile(userId)));
      } else {
        forgetEverything();
        saveProfile(null);
        setProfile(null);
        setError(null);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // Bootstrap outside the auth callback: supabase-js must not be awaited inside it.
  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    bootstrapPlayer()
      .then((nextProfile) => {
        if (!cancelled) {
          setProfile(nextProfile);
          setError(null);
        }
      })
      .catch((cause: unknown) => {
        console.error("bootstrap_player failed", cause);
        if (!cancelled) setError(describeServerError(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Every fresh profile (bootstrap, statistics, username) is the one shown at the next launch.
  useEffect(() => {
    if (profile) saveProfile(profile);
  }, [profile]);

  const signInWithGoogle = useCallback(async () => {
    const { error: signInError } = await getSupabase().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${withBasePath("/auth/callback/")}` },
    });
    if (signInError) setError("Impossibile avviare l'accesso con Google. Riprova.");
  }, []);

  const signOut = useCallback(async () => {
    await getSupabase().auth.signOut();
  }, []);

  const status = !sessionKnown || (session && !profile && !error) ? "loading" : "ready";

  const value = useMemo(
    () => ({ status, session, profile, error, signInWithGoogle, signOut, setProfile }),
    [status, session, profile, error, signInWithGoogle, signOut],
  ) satisfies AuthContextValue;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}

/** For pages that need a player: sends signed-out visitors to the home. */
export function useRequireSignedIn(): AuthContextValue {
  const router = useRouter();
  const auth = useAuth();
  const { status, session } = auth;
  useEffect(() => {
    if (status === "ready" && !session) router.replace("/");
  }, [status, session, router]);
  return auth;
}
