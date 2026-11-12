"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { PackArt, TabBar } from "@/components/comic-parts";
import { HoldToConfirmButton } from "@/components/hold-to-confirm-button";
import { useMatchRewards } from "@/components/match-reward";
import { describeServerError } from "@/lib/errors";
import { formatRomeDateTime } from "@/lib/events";
import { coinSources } from "@/lib/match-rewards";
import { packColor } from "@/lib/pack-colors";
import {
  buyPack,
  buySpecialPack,
  describeBonusReward,
  packRevealHref,
  redeemBonusCode,
  type BonusReward,
  type PackOdds,
  type PackOpening,
  type PackStatus,
  type SpecialPack,
} from "@/lib/packs";
import { useLockedScreen } from "@/lib/use-locked-screen";
import { COIN_REASON_LABELS, type CoinMovement } from "@/lib/wallet";

const percent = new Intl.NumberFormat("it-IT", { style: "percent", maximumFractionDigits: 1 });
// A single card of a special pack can be rarer than 0,1%.
const cardPercent = new Intl.NumberFormat("it-IT", { style: "percent", maximumFractionDigits: 2 });
const dateTime = new Intl.DateTimeFormat("it-IT", { dateStyle: "short", timeStyle: "short" });

type ShopViewProps = {
  status: PackStatus;
  odds: PackOdds;
  /** Special packs on sale, shown after the standard pack (SPEC §7.1). */
  specials: SpecialPack[];
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
 * Balance, pack purchase, bonus codes, published odds and coin history. The page fits the screen
 * above the bottom bar and never scrolls (see .home-shell): the purchase stays on top, and the rest
 * shares the room below as tabs, the coin history scrolling inside its own. With special packs on
 * sale, the purchase is a row of packs to swipe, and the odds are those of the pack in view.
 */
export function ShopView({ status, odds, specials, history, onFailed, onRedeemed }: ShopViewProps) {
  const [tab, setTab] = useState<ShopTab>("odds");
  const rewards = useMatchRewards();
  // 0 is the standard pack, then the special packs in order.
  const [shown, setShown] = useState(0);
  const carousel = useRef<HTMLDivElement>(null);
  useLockedScreen(true);
  const special = shown > 0 ? (specials[shown - 1] ?? null) : null;

  function showPack(index: number) {
    const element = carousel.current;
    element?.scrollTo({ left: index * element.clientWidth, behavior: "smooth" });
  }

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
        <div className="relative shrink-0">
          <div
            ref={carousel}
            onScroll={(event) => {
              const element = event.currentTarget;
              setShown(Math.round(element.scrollLeft / Math.max(1, element.clientWidth)));
            }}
            className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <BuySection
              title="Pacchetto standard"
              detail={`${odds.cards_per_pack} carte, almeno una ${odds.guaranteed_rarity_name} o superiore`}
              price={odds.standard_pack_price}
              cards={odds.cards_per_pack}
              balance={status.coin_balance}
              colors={STANDARD_COLORS}
              buy={buyPack}
              onFailed={onFailed}
            />
            {specials.map((pack) => (
              <BuySection
                key={pack.id}
                title={pack.name}
                detail={pack.description || describeSpecialPack(pack)}
                until={pack.ends_at}
                price={pack.price}
                cards={pack.cards_per_pack}
                balance={status.coin_balance}
                colors={packColor(pack.color)}
                buy={() => buySpecialPack(pack)}
                onFailed={onFailed}
              />
            ))}
          </div>
          {specials.length > 0 && (
            <div className="absolute inset-x-0 bottom-1 flex justify-center gap-0.5" role="group" aria-label="Pacchetti in vendita">
              {[null, ...specials].map((pack, index) => (
                <button
                  key={pack?.id ?? "standard"}
                  type="button"
                  onClick={() => showPack(index)}
                  aria-label={pack?.name ?? "Pacchetto standard"}
                  aria-current={index === shown}
                  className="flex h-6 w-6 items-center justify-center"
                >
                  <span className={`h-2.5 w-2.5 border-2 border-black ${index === shown ? "bg-black" : "bg-transparent"}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        <TabBar tabs={TABS} current={tab} onPick={setTab} label="Negozio" />

        <div role="tabpanel" className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain">
          {tab === "odds" && special && <SpecialOdds pack={special} />}

          {tab === "odds" && !special && (
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
                  {rewards &&
                    coinSources(rewards.rules).map((line) => (
                      <li key={line}>Partite · {line}.</li>
                    ))}
                  {rewards && rewards.settings["conquest.no_card_bonus_coins"] > 0 && (
                    <li>
                      Vinci in Conquista quando nessuna carta è conquistabile: +
                      {rewards.settings["conquest.no_card_bonus_coins"]} al posto della carta.
                    </li>
                  )}
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

type BuyColors = { background: string; body: string; omega: string; shadow: string };

const STANDARD_COLORS: BuyColors = { background: "#ffd60a", body: "#ff2e6c", omega: "#ffd60a", shadow: "#ff2e6c" };

/** "5 carte, almeno una Beta o superiore", or "3 carte" with no guarantee. */
function describeSpecialPack(pack: SpecialPack): string {
  const cards = `${pack.cards_per_pack} ${pack.cards_per_pack === 1 ? "carta" : "carte"}`;
  return pack.guaranteed_rarity_name ? `${cards}, almeno una ${pack.guaranteed_rarity_name} o superiore` : cards;
}

/** The published odds of a special pack: per rarity, then card by card, as the server draws them. */
function SpecialOdds({ pack }: { pack: SpecialPack }) {
  const rarityOf = new Map(pack.odds.map((rarity) => [rarity.code, rarity]));
  const each = pack.cards_per_pack === 1 ? "La carta viene estratta" : `Ognuna delle ${pack.cards_per_pack} carte viene estratta`;
  return (
    <>
      <ul className="flex shrink-0 gap-1" aria-label="Probabilità per carta">
        {pack.odds.map((rarity) => (
          <li key={rarity.code} className="flex min-w-0 flex-1 flex-col items-center bg-panel py-1.5">
            <span className="max-w-full truncate px-0.5 font-display text-sm uppercase" style={{ color: rarity.color }}>
              {rarity.name}
            </span>
            <span className="font-display text-xl">{percent.format(rarity.probability)}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs font-medium text-muted">
        {each} con queste probabilità, tra i {pack.cards.length} personaggi qui sotto.
        {pack.guaranteed_rarity_name &&
          ` Se le prime ${pack.cards_per_pack - 1} non contengono una ${pack.guaranteed_rarity_name} o superiore, l'ultima è garantita di quella rarità o superiore.`}{" "}
        {pack.variant_chance_percent > 0 && pack.characters_with_variants > 0
          ? `Varianti: ${pack.characters_with_variants} di questi personaggi hanno anche un disegno più raro; quando ne esce uno, ha il ${pack.variant_chance_percent}% di probabilità di avere quel disegno.`
          : "In questo pacchetto non escono varianti."}{" "}
        Le estrazioni avvengono sul server.
      </p>
      <ul className="flex flex-col gap-0.5" aria-label="Probabilità di ogni personaggio">
        {pack.cards.map((card) => {
          const rarity = rarityOf.get(card.rarity_code);
          return (
            <li key={card.code} className="flex items-center justify-between gap-2 bg-panel px-3 py-1.5">
              <span className="min-w-0 truncate text-sm font-semibold">
                {card.name} <span style={{ color: rarity?.color }}>· {rarity?.name}</span>
              </span>
              <span className="shrink-0 font-display text-lg">{cardPercent.format(card.probability)}</span>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function BuySection({
  title,
  detail,
  until = null,
  price,
  cards,
  balance: coins,
  colors,
  buy: purchase,
  onFailed,
}: {
  title: string;
  detail: string;
  until?: string | null;
  price: number;
  cards: number;
  balance: number;
  colors: BuyColors;
  buy: () => Promise<PackOpening>;
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
      const pack = await purchase();
      router.push(`/pacchetto/?id=${pack.id}`);
    } catch (cause) {
      setError(describeServerError(cause));
      setBuying(false);
      onFailed();
    }
  }

  return (
    <section
      className="cut-bottom relative flex w-full shrink-0 snap-center flex-col gap-2.5 overflow-hidden px-4 pb-6 pt-3 text-black"
      style={{ background: colors.background }}
      aria-label={title}
    >
      <PackArt
        body={colors.body}
        omega={colors.omega}
        cards={cards}
        className="absolute -right-2 -top-1 h-28 rotate-[9deg]"
      />
      <div className="relative max-w-[66%]">
        <p className="line-clamp-2 break-words font-display text-[26px] uppercase leading-7">{title}</p>
        <p className="line-clamp-2 text-[13px] font-semibold leading-4">{detail}</p>
        <p className="font-display text-xl">{price} monete</p>
        {until && <p className="text-xs font-bold leading-4">In vendita fino a {formatRomeDateTime(until)}</p>}
      </div>
      <HoldToConfirmButton
        onConfirm={buy}
        disabled={missing > 0 || buying}
        hint={missing > 0 || buying ? "" : `Tieni premuto per comprare · ${price} monete`}
        fillColor={colors.background}
        className="btn min-h-13 bg-black font-display text-[22px] uppercase tracking-wide disabled:opacity-70"
        style={{ color: colors.background, boxShadow: missing > 0 || buying ? "none" : `4px 4px 0 ${colors.shadow}` }}
      >
        {buying ? "Acquisto…" : missing > 0 ? `Ti mancano ${missing} monete` : "Acquista e apri"}
      </HoldToConfirmButton>
      {error && <p className="relative text-sm font-bold">{error}</p>}
    </section>
  );
}
