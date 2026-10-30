import Link from "next/link";

/** Coin balance chip; links to the shop. */
export function CoinBadge({ balance }: { balance: number | null }) {
  return (
    <Link
      href="/negozio"
      aria-label={`Monete: ${balance ?? "…"}. Apri il negozio`}
      className="flex min-h-11 items-center"
    >
      <span className="flex h-9 -skew-x-8 items-center gap-1.5 border-2 border-comic-yellow bg-black px-2.5 text-sm font-extrabold text-comic-yellow">
        <span
          aria-hidden
          className="flex h-4 w-4 items-center justify-center rounded-full bg-comic-yellow text-[10px] font-black text-black"
        >
          Ω
        </span>
        {balance ?? "…"}
      </span>
    </Link>
  );
}
