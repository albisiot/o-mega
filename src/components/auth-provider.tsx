"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { withBasePath } from "@/lib/base-path";
import { bootstrapPlayer, describePlayerError, type Profile } from "@/lib/player";
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
      setSession(nextSession);
      setSessionKnown(true);
      if (!nextSession) {
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
        if (!cancelled) setError(describePlayerError(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

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
