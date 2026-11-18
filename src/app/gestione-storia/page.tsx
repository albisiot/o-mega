"use client";

import { useEffect, useState } from "react";
import { useRequireSignedIn } from "@/components/auth-provider";
import { LoadingScreen } from "@/components/loading-screen";
import { StoryAdminView } from "@/components/story-admin";
import { ReturnLink } from "@/components/return-link";
import { describeServerError } from "@/lib/errors";
import { fetchStoryAdmin, type StoryAdmin } from "@/lib/story-admin";

// Reached from the EDITOR page (src/app/editor). admin_get_story and every save check the
// admin on the server: a player only gets "not_admin".
export default function StoryAdminPage() {
  const { session } = useRequireSignedIn();
  const [data, setData] = useState<StoryAdmin | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    fetchStoryAdmin()
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
  if (!data) return <LoadingScreen label="Caricamento della Storia…" />;

  return <StoryAdminView initial={data} />;
}
