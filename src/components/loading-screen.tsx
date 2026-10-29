export function LoadingScreen({ label = "Caricamento…" }: { label?: string }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
      <p className="text-sm text-zinc-400">{label}</p>
    </main>
  );
}
