"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { PackArt, TabBar } from "@/components/comic-parts";
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
import { useLockedScreen } from "@/lib/use-locked-screen";
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

type ShopTab = "odds" | "history" | "codes";

const TABS: { key: ShopTab; label: string }[] = [
  { key: "odds", label: "Probabilità" },
  { key: "history", label: "Movimenti" },
  { key: "codes", label: "Codici" },
];

/**
 * Balance, standard pack purchase, bonus codes, published odds and coin history. The page fits
 * the screen above the bottom bar and never scrolls (see .home-shell): the purchase stays on
 * top, and the rest shares the room below as tabs, the coin history scrolling inside its own.
 */
export function ShopView({ status, odds, history, onFailed, onRedeemed }: ShopViewProps) {
  const [tab, setTab] = useState<ShopTab>("odds");
  useLockedScreen(true);

  return (
    <div className="home-shell">
      <header className="flex shrink-0 items-center justify-between gap-3 px-4 pb-1 pt-2">
        <h1 className="font-display text-4xl uppercase text-comic-yellow">Negozio</h1>
        <p className="-skew-x-8 bg-black px-3 py-0.5 font-display text-3xl text-comic-yellow">
          <span className="sr-only">Il tuo saldo: </span>
          {status.coin_balance} <span className="text-sm uppercase">monete</span>
        </p>
      </header>

      <main className="flex min-h-0 flex-1 flex-col gap-2 px-3 pb-3 pt-1">
        <BuySection price={odds.standard_pack_price} balance={status.coin_balance} odds={odds} onFailed={onFailed} />

        <TabBar tabs={TABS} current={tab} onPick={setTab} label="Negozio" />

        <div role="tabpanel" className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain">
          {tab === "odds" && (
            <>
              <ul className="flex shrink-0 gap-1" aria-label="Probabilità per carta">
                {odds.odds.map((rarity) => (
                  <li key={rarity.code} className="flex min-w-0 flex-1 flex-col items-center bg-panel py-1.5">
                    <span className="max-w-full truncate px-0.5 font-display text-sm uppercase" style={{ color: rarity.color }}>
                      {rarity.name}
                    </span>
                    <span className="font-display text-xl">{percent.format(rarity.probability)}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs font-medium text-muted">
                Ogni carta del pacchetto viene estratta con queste probabilità. Se le prime {odds.cards_per_pack - 1} non
                contengono una {odds.guaranteed_rarity_name} o superiore, l&apos;ultima è garantita di quella rarità o
                superiore. Le estrazioni avvengono sul server.
              </p>
              <p className="text-xs font-medium text-muted">
                Varianti: {odds.characters_with_variants} personaggi hanno anche un disegno più raro. Quando ne esce
                uno, ha il {odds.variant_chance_percent}% di probabilità di avere quel disegno. Valori e poteri restano
                uguali.
              </p>
            </>
          )}

          {tab === "history" && (
            <>
              <section className="shrink-0 bg-black px-3 py-2 text-xs font-medium leading-4">
                <h2 className="font-display text-base uppercase text-comic-yellow">Come guadagnare monete</h2>
                <ul className="flex flex-col gap-0.5">
                  <li>
                    <Link href="/collezione" className="font-bold underline">
                      Converti i doppioni
                    </Link>{" "}
                    della collezione.
                  </li>
                  <li>Perdi una sfida di Conquista: +{balance.conquest.loserCoins} (chi vince prende una carta).</li>
                  <li>
                    Vinci in Conquista quando nessuna carta è conquistabile: +{balance.conquest.noCardBonusCoins} al
                    posto della carta.
                  </li>
                </ul>
              </section>
              {history.length === 0 ? (
                <p className="text-sm font-medium text-muted">Nessun movimento ancora.</p>
              ) : (
                <ul className="flex flex-col gap-0.5" aria-label="Movimenti">
                  {history.map((movement) => (
                    <li key={movement.key} className="flex items-center justify-between bg-panel px-4 py-1.5">
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
            </>
          )}

          {tab === "codes" && <BonusCodeSection onRedeemed={onRedeemed} />}
        </div>
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
    <section className="cut-bottom relative flex shrink-0 flex-col gap-2.5 overflow-hidden bg-comic-yellow px-4 pb-6 pt-3 text-black">
      <PackArt body="#ff2e6c" omega="#ffd60a" className="absolute -right-2 -top-1 h-28 rotate-[9deg]" />
      <div className="relative max-w-[66%]">
        <p className="font-display text-[26px] uppercase leading-7">Pacchetto standard</p>
        <p className="text-[13px] font-semibold leading-4">
          {odds.cards_per_pack} carte, almeno una {odds.guaranteed_rarity_name} o superiore
        </p>
        <p className="font-display text-xl">{price} monete</p>
      </div>
      <button
        type="button"
        onClick={buy}
        disabled={missing > 0 || buying}
        className="btn relative min-h-13 bg-black font-display text-[22px] uppercase tracking-wide text-comic-yellow shadow-[4px_4px_0_var(--comic-magenta)] disabled:shadow-none disabled:opacity-70"
      >
        {buying ? "Acquisto…" : missing > 0 ? `Ti mancano ${missing} monete` : "Acquista e apri"}
      </button>
      {error && <p className="relative text-sm font-bold">{error}</p>}
    </section>
  );
}
