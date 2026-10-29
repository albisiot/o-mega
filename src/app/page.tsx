import { SupabaseStatus } from "@/components/supabase-status";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-12 text-center">
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-400">Benvenuto in</p>
        <h1 className="bg-linear-to-b from-amber-200 via-amber-400 to-orange-600 bg-clip-text text-6xl font-black tracking-tight text-transparent sm:text-7xl">
          O-MEGA
        </h1>
        <p className="max-w-xs text-base text-zinc-300">
          Aprire, collezionare, giocare, conquistare.
        </p>
      </div>

      <SupabaseStatus />

      <p className="text-xs text-zinc-500">Versione di sviluppo · contenuti provvisori</p>
    </main>
  );
}
