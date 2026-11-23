"use client";

import { useEffect, useState } from "react";
import { useRequireSignedIn } from "@/components/auth-provider";
import { BossAdminView } from "@/components/boss-admin";
import { LoadingScreen } from "@/components/loading-screen";
import { ReturnLink } from "@/components/return-link";
import { fetchBossAdmin, type BossAdmin } from "@/lib/boss-admin";
import { describeServerError } from "@/lib/errors";

// Reached from the EDITOR page (src/app/editor). admin_get_bosses and every save check the admin
// on the server: a player only gets "not_admin".
export default function BossAdminPage() {
  const { session } = useRequireSignedIn();
  const [data, setData] = useState<BossAdmin | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    fetchBossAdmin()
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

  if (error) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm font-semibold text-comic-magenta">{error}</p>
        <ReturnLink href="/editor" className="flex min-h-11 items-center text-sm font-bold underline">
          Torna all&apos;Editor
        </ReturnLink>
      </main>
    );
  }
  if (!data) return <LoadingScreen label="Caricamento dei Boss…" />;
  return <BossAdminView initial={data} />;
}
