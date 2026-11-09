"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRequireSignedIn } from "@/components/auth-provider";
import { LoadingScreen } from "@/components/loading-screen";
import { SpecialPackAdmin } from "@/components/special-pack-admin";
import { describeServerError } from "@/lib/errors";
import { fetchAdminSpecialPacks, type AdminSpecialPacks } from "@/lib/special-pack-admin";

// Reached only from the link at the bottom of the privacy page, shown to admins.
// The page itself is public: every function behind it checks the admin on the server.
export default function SpecialPackAdminPage() {
  const { session } = useRequireSignedIn();
  const [data, setData] = useState<AdminSpecialPacks | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    fetchAdminSpecialPacks()
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
  if (!data) return <LoadingScreen label="Caricamento dei pacchetti…" />;

  return <SpecialPackAdmin data={data} onChange={setData} />;
}
