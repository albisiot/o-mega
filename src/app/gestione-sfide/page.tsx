"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRequireSignedIn } from "@/components/auth-provider";
import { ChallengeAdmin } from "@/components/challenge-admin";
import { LoadingScreen } from "@/components/loading-screen";
import { fetchAdminChallenges, type AdminChallenges } from "@/lib/challenge-admin";
import { describeServerError } from "@/lib/errors";

// Sfide a tema (SPEC §8.8), reached from the EDITOR page (src/app/editor), which only admins see.
// The page itself is public: every function behind it checks the admin on the server.
export default function ChallengeAdminPage() {
  const { session } = useRequireSignedIn();
  const [data, setData] = useState<AdminChallenges | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    fetchAdminChallenges()
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
  if (!data) return <LoadingScreen label="Caricamento delle sfide…" />;

  return <ChallengeAdmin data={data} onChange={setData} />;
}
