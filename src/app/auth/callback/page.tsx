"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LoadingScreen } from "@/components/loading-screen";
import { getSupabase } from "@/lib/supabase/client";

// Google redirects here with ?code=...; the Supabase client exchanges it for a
// session (PKCE) while initializing, then we go back to the home page.
export default function AuthCallbackPage() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const providerError = params.get("error_description") ?? params.get("error");
    const signIn = providerError
      ? Promise.reject(new Error(providerError))
      : getSupabase()
          .auth.getSession()
          .then(({ data, error }) => {
            if (error || !data.session) throw error ?? new Error("No session after code exchange");
          });
    signIn
      .then(() => router.replace("/"))
      .catch((cause: unknown) => {
        console.error("Sign-in failed", cause);
        setFailed(true);
      });
  }, [router]);

  if (!failed) return <LoadingScreen label="Accesso in corso…" />;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-display text-3xl uppercase text-comic-magenta">Accesso non riuscito</p>
      <p className="max-w-xs text-sm font-medium text-muted">
        Non è stato possibile completare l&apos;accesso con Google. Riprova.
      </p>
      <Link href="/" className="btn btn-primary">
        Torna all&apos;inizio
      </Link>
    </main>
  );
}
