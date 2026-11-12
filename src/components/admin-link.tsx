"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { fetchIsAdmin } from "@/lib/bonus-code-admin";

const LINK = "flex min-h-11 items-center text-xs font-semibold text-faint underline";

/** Discreet way into the admin pages: nothing at all for everyone else. */
export function AdminLink() {
  const { session } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    fetchIsAdmin()
      .then((next) => {
        if (!cancelled) setIsAdmin(next);
      })
      .catch((error: unknown) => console.error("Admin check failed", error));
    return () => {
      cancelled = true;
    };
  }, [session]);

  if (!session || !isAdmin) return null;
  return (
    <nav aria-label="Amministrazione" className="flex flex-wrap justify-center gap-x-4">
      <Link href="/gestione-codici" className={LINK}>
        Gestione codici
      </Link>
      <Link href="/gestione-pacchetti" className={LINK}>
        Carte nei pacchetti
      </Link>
      <Link href="/gestione-pacchetti-speciali" className={LINK}>
        Pacchetti speciali
      </Link>
      <Link href="/gestione-eventi" className={LINK}>
        Gestione eventi
      </Link>
      <Link href="/gestione-minaccia" className={LINK}>
        Grande Minaccia
      </Link>
      <Link href="/gestione-obiettivi" className={LINK}>
        Obiettivi del giorno
      </Link>
      <Link href="/gestione-minacce" className={LINK}>
        Minacce
      </Link>
      <Link href="/gestione-ricompense" className={LINK}>
        Ricompense partite
      </Link>
    </nav>
  );
}
