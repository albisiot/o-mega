"use client";

import { useEffect, useState } from "react";
import { checkSupabaseConnection, isSupabaseConfigured } from "@/lib/supabase/client";

type Status = "checking" | "connected" | "unreachable" | "not-configured";

const LABELS: Record<Status, string> = {
  checking: "Verifica connessione…",
  connected: "Server collegato",
  unreachable: "Server non raggiungibile",
  "not-configured": "Server non configurato",
};

const DOT_COLORS: Record<Status, string> = {
  checking: "bg-faint animate-pulse",
  connected: "bg-comic-cyan",
  unreachable: "bg-comic-magenta",
  "not-configured": "bg-comic-yellow",
};

/** Small badge showing whether the Supabase client can reach the project. */
export function SupabaseStatus() {
  const [status, setStatus] = useState<Status>(
    isSupabaseConfigured ? "checking" : "not-configured",
  );

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    checkSupabaseConnection().then((ok) => {
      if (!cancelled) setStatus(ok ? "connected" : "unreachable");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <p
      className="inline-flex items-center gap-2 bg-black px-3 py-1 text-xs font-semibold text-muted"
      data-status={status}
    >
      <span className={`h-2 w-2 rounded-full ${DOT_COLORS[status]}`} aria-hidden />
      {LABELS[status]}
    </p>
  );
}
