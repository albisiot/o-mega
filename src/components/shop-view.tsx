"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader, PackArt } from "@/components/comic-parts";
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
      <PageHeader backHref="/" backLabel="Home" title="Negozio" />

      <main className="flex flex-1 flex-col gap-5 px-3 pb-6">
        <section className="flex items-center justify-between bg-black px-4 py-3">
          <p className="font-display text-xl uppercase">Il tuo saldo</p>
          <p className="font-display text-4xl text-comic-yellow">
            {status.coin_balance} <span className="text-base uppercase">monete</span>
          </p>
        </section>

        <BuySection price={odds.standard_pack_price} balance={status.coin_balance} odds={odds} onFailed={onFailed} />

        <section className="flex flex-col gap-2">
          <h2 className="section-title">Probabilità per carta</h2>
          <ul className="flex flex-col gap-0.5">
            {odds.odds.map((rarity) => (
              <li key={rarity.code} className="flex items-center justify-between bg-panel px-4 py-2.5">
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 -skew-x-8" style={{ backgroundColor: rarity.color }} aria-hidden />
                  <span className="font-display text-lg uppercase" style={{ color: rarity.color }}>
                    {rarity.name}
                  </span>
                </span>
                <span className="font-display text-xl">{percent.format(rarity.probability)}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm font-medium text-muted">
            Ogni carta del pacchetto viene estratta con queste probabilità. Se le prime{" "}
            {odds.cards_per_pack - 1} non contengono una {odds.guaranteed_rarity_name} o superiore, l&apos;ultima è
            garantita di quella rarità o superiore. Le estrazioni avvengono sul server.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="section-title">Come guadagnare monete</h2>
          <ul className="flex flex-col gap-1.5 text-sm font-medium">
            <li>
              <Link href="/collezione" className="font-bold underline">
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
          <h2 className="section-title">Movimenti</h2>
          {history.length === 0 ? (
            <p className="text-sm font-medium text-muted">Nessun movimento ancora.</p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {history.map((movement) => (
                <li key={movement.key} className="flex items-center justify-between bg-panel px-4 py-2.5">
                  <div>
                    <p className="text-sm font-semibold">
                      {COIN_REASON_LABELS[movement.reason] ?? movement.reason}
                      {movement.count > 1 && <span className="text-muted"> ×{movement.count}</span>}
                    </p>
                    <p className="text-xs font-medium text-faint">{dateTime.format(new Date(movement.created_at))}</p>
                  </div>
                  <span className={`font-display text-xl ${movement.amount > 0 ? "text-comic-cyan" : "text-muted"}`}>
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
    <section className="cut-bottom relative flex flex-col gap-3 overflow-hidden bg-comic-yellow px-4 pb-7 pt-4 text-black">
      <PackArt body="#ff2e6c" omega="#ffd60a" className="absolute -right-3 -top-1 h-36 rotate-[9deg]" />
      <div className="relative max-w-[62%]">
        <p className="font-display text-3xl uppercase">Pacchetto standard</p>
        <p className="mt-1 text-sm font-semibold">
          {odds.cards_per_pack} carte, almeno una {odds.guaranteed_rarity_name} o superiore
        </p>
        <p className="mt-1 font-display text-2xl">{price} monete</p>
      </div>
      <button
        type="button"
        onClick={buy}
        disabled={missing > 0 || buying}
        className="btn relative min-h-14 bg-black font-display text-[22px] uppercase tracking-wide text-comic-yellow shadow-[4px_4px_0_var(--comic-magenta)] disabled:shadow-none disabled:opacity-70"
      >
        {buying ? "Acquisto…" : missing > 0 ? `Ti mancano ${missing} monete` : "Acquista e apri"}
      </button>
      {error && <p className="relative text-sm font-bold">{error}</p>}
    </section>
  );
}
