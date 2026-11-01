"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { fetchIsAdmin } from "@/lib/bonus-code-admin";

/** Discreet way into the admin page: nothing at all for everyone else. */
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
    <Link href="/gestione-codici" className="flex min-h-11 items-center justify-center text-xs font-semibold text-faint underline">
      Gestione codici
    </Link>
  );
}
