"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { balance } from "@/config/balance";
import { describeServerError } from "@/lib/errors";
import { buyPack, type PackOdds, type PackStatus } from "@/lib/packs";
import { COIN_REASON_LABELS, type CoinMovement } from "@/lib/wallet";

const percent = new Intl.NumberFormat("it-IT", { style: "percent", maximumFractionDigits: 1 });
const dateTime = new Intl.DateTimeFormat("it-IT", { dateStyle: "short", timeStyle: "short" });

type ShopViewProps = {
  status: PackStatus;
  odds: PackOdds;
  history: CoinMovement[];
  onFailed: () => void;
};

/** Balance, standard pack purchase, published odds and coin history. */
export function ShopView({ status, odds, history, onFailed }: ShopViewProps) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-5 py-4">
        <Link href="/" className="text-sm text-zinc-300">
          ← Home
        </Link>
        <h1 className="text-base font-semibold">Negozio</h1>
        <span className="w-12" />
      </header>

      <main className="flex flex-1 flex-col gap-5 px-5 pb-10">
        <section className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-amber-300">Il tuo saldo</p>
          <p className="mt-1 text-4xl font-black text-amber-200">{status.coin_balance}</p>
          <p className="text-sm text-zinc-400">monete</p>
        </section>

        <BuySection price={odds.standard_pack_price} balance={status.coin_balance} odds={odds} onFailed={onFailed} />

        <section className="flex flex-col gap-2">
          <h2 className="text-xs uppercase tracking-[0.2em] text-zinc-500">Probabilità per carta</h2>
          <ul className="flex flex-col divide-y divide-white/5 rounded-2xl border border-white/10 bg-white/5">
            {odds.odds.map((rarity) => (
              <li key={rarity.code} className="flex items-center justify-between px-4 py-2.5">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: rarity.color }} aria-hidden />
                  <span className="font-medium" style={{ color: rarity.color }}>
                    {rarity.name}
                  </span>
                </span>
                <span className="font-semibold tabular-nums">{percent.format(rarity.probability)}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-zinc-500">
            Ogni carta del pacchetto viene estratta con queste probabilità. Se le prime{" "}
            {odds.cards_per_pack - 1} non contengono una {odds.guaranteed_rarity_name} o superiore, l&apos;ultima è
            garantita di quella rarità o superiore. Le estrazioni avvengono sul server.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-xs uppercase tracking-[0.2em] text-zinc-500">Come guadagnare monete</h2>
          <ul className="flex flex-col gap-1.5 text-sm text-zinc-300">
            <li>
              <Link href="/collezione" className="underline">
                Converti i doppioni
              </Link>{" "}
              della collezione.
            </li>
            <li>Perdi una sfida di Conquista: +{balance.conquest.loserCoins} (chi vince prende una carta).</li>
            <li>
              Vinci in Conquista quando nessuna carta è conquistabile: +{balance.conquest.noCardBonusCoins} al posto
              della carta.
            </li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-xs uppercase tracking-[0.2em] text-zinc-500">Movimenti</h2>
          {history.length === 0 ? (
            <p className="text-sm text-zinc-500">Nessun movimento ancora.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-white/5 rounded-2xl border border-white/10 bg-white/5">
              {history.map((movement) => (
                <li key={movement.key} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <p className="text-sm font-medium">
                      {COIN_REASON_LABELS[movement.reason] ?? movement.reason}
                      {movement.count > 1 && <span className="text-zinc-400"> ×{movement.count}</span>}
                    </p>
                    <p className="text-xs text-zinc-500">{dateTime.format(new Date(movement.created_at))}</p>
                  </div>
                  <span
                    className={`font-semibold tabular-nums ${movement.amount > 0 ? "text-emerald-400" : "text-zinc-300"}`}
                  >
                    {movement.amount > 0 ? "+" : ""}
                    {movement.amount}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

function BuySection({
  price,
  balance: coins,
  odds,
  onFailed,
}: {
  price: number;
  balance: number;
  odds: PackOdds;
  onFailed: () => void;
}) {
  const router = useRouter();
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const missing = price - coins;

  async function buy() {
    setBuying(true);
    setError(null);
    try {
      const pack = await buyPack();
      router.push(`/pacchetto/?id=${pack.id}`);
    } catch (cause) {
      setError(describeServerError(cause));
      setBuying(false);
      onFailed();
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-bold">Pacchetto standard</p>
          <p className="text-sm text-zinc-400">
            {odds.cards_per_pack} carte, almeno una {odds.guaranteed_rarity_name} o superiore
          </p>
        </div>
        <p className="shrink-0 text-lg font-black text-amber-200">{price}</p>
      </div>
      <button
        type="button"
        onClick={buy}
        disabled={missing > 0 || buying}
        className="rounded-full bg-amber-400 px-5 py-3 font-bold text-zinc-950 disabled:bg-white/10 disabled:text-zinc-500"
      >
        {buying ? "Acquisto…" : missing > 0 ? `Ti mancano ${missing} monete` : "Acquista e apri"}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </section>
  );
}
