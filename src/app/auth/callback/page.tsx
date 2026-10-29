"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      {failed ? (
        <>
          <p className="text-lg font-semibold">Accesso non riuscito</p>
          <p className="max-w-xs text-sm text-zinc-400">
            Non è stato possibile completare l&apos;accesso con Google. Riprova.
          </p>
          <Link
            href="/"
            className="rounded-full bg-amber-400 px-5 py-2 text-sm font-semibold text-zinc-950"
          >
            Torna all&apos;inizio
          </Link>
        </>
      ) : (
        <p className="text-sm text-zinc-400">Accesso in corso…</p>
      )}
    </main>
  );
}
