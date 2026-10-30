import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sfx text-8xl text-comic-magenta">404</p>
      <p className="text-base font-semibold">Questa pagina non esiste.</p>
      <Link href="/" className="btn btn-primary">
        Torna alla home
      </Link>
    </main>
  );
}
