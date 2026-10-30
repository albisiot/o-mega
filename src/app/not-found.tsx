import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="bg-linear-to-b from-amber-200 to-orange-500 bg-clip-text text-5xl font-black text-transparent">404</p>
      <p className="text-sm text-zinc-300">Questa pagina non esiste.</p>
      <Link href="/" className="rounded-full bg-amber-400 px-5 py-2 text-sm font-bold text-zinc-950">
        Torna alla home
      </Link>
    </main>
  );
}
