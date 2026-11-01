"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { PageHeader, PackArt } from "@/components/comic-parts";
import { balance } from "@/config/balance";
import { describeServerError } from "@/lib/errors";
import {
  buyPack,
  describeBonusReward,
  packRevealHref,
  redeemBonusCode,
  type BonusReward,
  type PackOdds,
  type PackStatus,
} from "@/lib/packs";
import { COIN_REASON_LABELS, type CoinMovement } from "@/lib/wallet";

const percent = new Intl.NumberFormat("it-IT", { style: "percent", maximumFractionDigits: 1 });
const dateTime = new Intl.DateTimeFormat("it-IT", { dateStyle: "short", timeStyle: "short" });

type ShopViewProps = {
  status: PackStatus;
  odds: PackOdds;
  history: CoinMovement[];
  onFailed: () => void;
  onRedeemed: () => void;
};

/** Balance, standard pack purchase, bonus codes, published odds and coin history. */
export function ShopView({ status, odds, history, onFailed, onRedeemed }: ShopViewProps) {
  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="Negozio" />

      <main className="flex flex-1 flex-col gap-5 px-3 pb-6">
        <section className="flex items-center justify-between bg-black px-4 py-3">
          <p className="font-display text-xl uppercase">Il tuo saldo</p>
          <p className="font-display text-4xl text-comic-yellow">
            {status.coin_balance} <span className="text-base uppercase">monete</span>
          </p>
        </section>

        <BuySection price={odds.standard_pack_price} balance={status.coin_balance} odds={odds} onFailed={onFailed} />

        <BonusCodeSection onRedeemed={onRedeemed} />

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
          <p className="text-sm font-medium text-muted">
            Varianti: {odds.characters_with_variants} personaggi hanno anche un disegno più raro. Quando ne esce uno, ha
            il {odds.variant_chance_percent}% di probabilità di avere quel disegno. Valori e poteri restano uguali.
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

function BonusCodeSection({ onRedeemed }: { onRedeemed: () => void }) {
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reward, setReward] = useState<BonusReward | null>(null);

  async function redeem(event: FormEvent) {
    event.preventDefault();
    setRedeeming(true);
    setError(null);
    setReward(null);
    try {
      setReward(await redeemBonusCode(code));
      setCode("");
      onRedeemed();
    } catch (cause) {
      setError(describeServerError(cause));
    } finally {
      setRedeeming(false);
    }
  }

  return (
    <section className="flex flex-col gap-2">
      <h2 className="section-title">Codici bonus</h2>
      <form onSubmit={redeem} className="flex gap-2">
        <input
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          aria-label="Codice bonus"
          placeholder="Inserisci il codice"
          maxLength={40}
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className="min-h-12 min-w-0 flex-1 border-2 border-comic-yellow bg-black px-3 font-display text-lg uppercase tracking-wide placeholder:normal-case placeholder:text-faint"
        />
        <button
          type="submit"
          disabled={redeeming || code.trim() === ""}
          className="btn min-h-12 bg-comic-yellow px-4 font-display text-lg uppercase text-black disabled:opacity-60"
        >
          {redeeming ? "Verifica…" : "Riscatta"}
        </button>
      </form>
      <div aria-live="polite" className="flex flex-col gap-2">
        {error && <p className="text-sm font-bold text-comic-magenta">{error}</p>}
        {reward && (
          <>
            <p className="bg-panel px-4 py-2.5 text-sm font-bold">
              Codice riscattato! Hai ricevuto <span className="text-comic-cyan">{describeBonusReward(reward)}</span>.
            </p>
            {reward.openings.length > 0 && (
              <Link href={packRevealHref(reward.openings.map((opening) => opening.id))} className="btn btn-primary">
                {reward.packs > 0 ? "Apri i premi" : "Guarda le carte"}
              </Link>
            )}
          </>
        )}
      </div>
    </section>
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
