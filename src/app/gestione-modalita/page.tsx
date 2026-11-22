"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRequireSignedIn } from "@/components/auth-provider";
import { LoadingScreen } from "@/components/loading-screen";
import { ModeAdmin } from "@/components/mode-admin";
import { describeServerError } from "@/lib/errors";
import { fetchAdminModes, type AdminModes } from "@/lib/mode-availability";
import { useIsAdmin } from "@/lib/use-is-admin";

// Modalità di gioco, reached from the EDITOR page (src/config/admin-tools.ts). Anyone can read
// the modes; only admins can save them, checked by the server.
export default function ModeAdminPage() {
  const { session } = useRequireSignedIn();
  const isAdmin = useIsAdmin();
  const [data, setData] = useState<AdminModes | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    fetchAdminModes()
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(describeServerError(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  if (error || isAdmin === false) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm font-semibold text-comic-magenta">{error ?? "Questa pagina è riservata agli amministratori."}</p>
        <Link href="/" className="flex min-h-11 items-center text-sm font-bold underline">
          Torna alla home
        </Link>
      </main>
    );
  }
  if (!data || isAdmin === null) return <LoadingScreen label="Caricamento delle modalità…" />;
  return <ModeAdmin initial={data} />;
}
