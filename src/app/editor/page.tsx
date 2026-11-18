"use client";

import Link from "next/link";
import { useRequireSignedIn } from "@/components/auth-provider";
import { EditorMenu } from "@/components/editor-menu";
import { LoadingScreen } from "@/components/loading-screen";
import { useIsAdmin } from "@/lib/use-is-admin";
import { useLockedScreen } from "@/lib/use-locked-screen";

/**
 * EDITOR: every admin tool on one screen, reached from the profile's «Altro» tab. The
 * page fits the phone and never scrolls. Showing it is only a convenience: every admin
 * function checks `is_admin()` on the server.
 */
export default function EditorPage() {
  useRequireSignedIn();
  const isAdmin = useIsAdmin();
  useLockedScreen(isAdmin === true);

  if (isAdmin === null) return <LoadingScreen label="Controllo dei permessi…" />;
  if (!isAdmin) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm font-semibold text-comic-magenta">Questa pagina è riservata agli amministratori.</p>
        <Link href="/profilo" className="flex min-h-11 items-center text-sm font-bold underline">
          Torna al profilo
        </Link>
      </main>
    );
  }

  return <EditorMenu />;
}
