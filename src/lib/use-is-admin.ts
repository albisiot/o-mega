import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { fetchIsAdmin } from "@/lib/bonus-code-admin";

/**
 * Whether the signed-in player is an admin: `null` while the server is asked. It only
 * chooses what to show; every admin function checks `is_admin()` again on the server.
 */
export function useIsAdmin(): boolean | null {
  const { session } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    fetchIsAdmin()
      .then((next) => {
        if (!cancelled) setIsAdmin(next);
      })
      .catch((error: unknown) => {
        console.error("Admin check failed", error);
        if (!cancelled) setIsAdmin(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  return session ? isAdmin : null;
}
