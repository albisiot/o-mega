"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRequireSignedIn } from "@/components/auth-provider";
import { LoadingScreen } from "@/components/loading-screen";
import { ShardAdmin } from "@/components/shard-admin";
import { fetchShardSettings, type ShardSettings } from "@/lib/cosmetics";
import { describeServerError } from "@/lib/errors";

// Reached from the EDITOR page (src/config/admin-tools.ts). The server answers only admins.
export default function ShardAdminPage() {
  const { session } = useRequireSignedIn();
  const [data, setData] = useState<ShardSettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    fetchShardSettings()
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
        <Link href="/" className="flex min-h-11 items-center text-sm font-bold underline">
          Torna alla home
        </Link>
      </main>
    );
  }
  if (!data) return <LoadingScreen label="Caricamento delle Schegge…" />;
  return <ShardAdmin initial={data} />;
}
