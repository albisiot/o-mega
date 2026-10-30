export function LoadingScreen({ label = "Caricamento…" }: { label?: string }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6">
      <span className="h-10 w-10 animate-spin rounded-full border-4 border-comic-yellow border-t-transparent" />
      <p className="text-sm font-semibold text-muted">{label}</p>
    </main>
  );
}
