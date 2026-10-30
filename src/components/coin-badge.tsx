import Link from "next/link";

/** Coin balance chip; links to the shop. */
export function CoinBadge({ balance }: { balance: number | null }) {
  return (
    <Link
      href="/negozio"
      aria-label={`Monete: ${balance ?? "…"}. Apri il negozio`}
      className="flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-sm font-semibold text-amber-200"
    >
      <span
        aria-hidden
        className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[10px] font-black text-zinc-950"
      >
        Ω
      </span>
      {balance ?? "…"}
    </Link>
  );
}
