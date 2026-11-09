"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRequireSignedIn } from "@/components/auth-provider";
import { EventAdmin } from "@/components/event-admin";
import { LoadingScreen } from "@/components/loading-screen";
import { fetchAdminEvents, type AdminEvents } from "@/lib/event-admin";
import { describeServerError } from "@/lib/errors";

// Reached only from the link at the bottom of the privacy page, shown to admins.
// The page itself is public: every function behind it checks the admin on the server.
export default function EventAdminPage() {
  const { session } = useRequireSignedIn();
  const [data, setData] = useState<AdminEvents | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    fetchAdminEvents()
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
  if (!data) return <LoadingScreen label="Caricamento degli eventi…" />;

  return <EventAdmin data={data} onChange={setData} />;
}
