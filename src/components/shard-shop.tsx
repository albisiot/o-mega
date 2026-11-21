"use client";

import Link from "next/link";
import { useState } from "react";
import { HoldToConfirmButton } from "@/components/hold-to-confirm-button";
import { useOpenPackReveal } from "@/components/pack-reveal-link";
import { CosmeticSeal, type SealScene } from "@/components/shard-scenes";
import { fetchCatalog, fetchCollection, ownedArt } from "@/lib/collection";
import { previewCharacter } from "@/lib/cosmetic-preview";
import {
  COSMETIC_INFO,
  EFFECT_CODES,
  FRAME_CODES,
  appliedTo,
  buyWithShards,
  isEffectCode,
  isFrameCode,
  ownedCosmetics,
  shownCosmetics,
  type CosmeticKind,
  type CosmeticsState,
  type FrameCode,
  type ShardItem,
} from "@/lib/cosmetics";
import { describeServerError } from "@/lib/errors";
import { keepCosmetics, useCosmetics } from "@/lib/use-cosmetics";

const RARITY_ORDER = ["delta", "gamma", "beta", "alfa", "omega"];
const RARITY_NAMES: Record<string, string> = { delta: "Delta", gamma: "Gamma", beta: "Beta", alfa: "Alfa", omega: "Omega" };

/** The character a frame or effect just bought is tried on in the seal scene, with its look now. */
async function previewFor(state: CosmeticsState, kind: CosmeticKind): Promise<SealScene["preview"]> {
  const [catalog, owned] = await Promise.all([fetchCatalog(), fetchCollection()]);
  const card = previewCharacter(catalog, owned, state.applied, kind);
  if (!card) return null;
  const mine = owned.get(card.id);
  return { card: mine ? { ...card, ...ownedArt(card, mine) } : card, look: shownCosmetics(appliedTo(state, card.id)) };
}

/**
 * The shop's Schegge tab (SPEC §4.8): the balance, what Schegge buy, the frames and effects
 * waiting to be applied. `preview` shows a given state without asking the server (dev page).
 */
export function ShardShop({ preview = null }: { preview?: CosmeticsState | null }) {
  const live = useCosmetics();
  const state = preview ?? live;
  const openReveal = useOpenPackReveal();
  const [busy, setBusy] = useState<ShardItem | null>(null);
  const [message, setMessage] = useState<{ text: string; note?: string; isError: boolean } | null>(null);
  // A frame or an effect just bought, opening in the seal scene.
  const [scene, setScene] = useState<SealScene | null>(null);

  if (!state) return <p className="text-sm font-medium text-muted">Caricamento delle Schegge…</p>;
  const balanceBefore = state.shard_balance;

  async function buy(item: ShardItem) {
    setBusy(item);
    setMessage(null);
    try {
      const purchase = await buyWithShards(item);
      keepCosmetics(purchase.cosmetics);
      if (purchase.opening) {
        openReveal([purchase.opening.id]);
        return;
      }
      if (purchase.item) {
        const got = purchase.item;
        const frame = got.kind === "frame";
        setMessage({
          text: `Hai ottenuto ${frame ? "la cornice" : "l'effetto"} ${got.name}!`,
          note: `${COSMETIC_INFO[got.code as FrameCode]?.note ?? ""} Applical${frame ? "a" : "o"} dalla pagina di una carta, in Collezione.`,
          isError: false,
        });
        if (isFrameCode(got.code) || isEffectCode(got.code)) {
          const preview = await previewFor(purchase.cosmetics, got.kind).catch(() => null);
          setScene({
            item: { code: got.code, kind: got.kind, name: got.name, serial: got.serial },
            cost: Math.max(0, balanceBefore - purchase.cosmetics.shard_balance),
            balance: purchase.cosmetics.shard_balance,
            preview,
          });
        }
      }
    } catch (cause) {
      setMessage({ text: describeServerError(cause), isError: true });
    } finally {
      setBusy(null);
    }
  }

  const offers: { item: ShardItem; title: string; detail: string; cost: number; blocked?: string }[] = [
    { item: "pack", title: "Pacchetto standard", detail: "5 carte, senza limiti al giorno", cost: state.costs.pack },
    { item: "cosmetic", title: "Cornice o effetto", detail: "A caso tra tutti", cost: state.costs.cosmetic },
    { item: "frame", title: "Cornice", detail: "A caso tra le cornici", cost: state.costs.kind },
    { item: "effect", title: "Effetto", detail: "A caso tra gli effetti", cost: state.costs.kind },
    {
      item: "variant",
      title: "Variante nuova",
      detail: "A caso, una che non hai",
      cost: state.costs.variant,
      blocked: state.missing_variants === 0 ? "Le hai tutte" : undefined,
    },
  ];
  const owned = [...ownedCosmetics(state, "frame"), ...ownedCosmetics(state, "effect")];
  const values = RARITY_ORDER.filter((code) => code in state.values)
    .map((code) => `${RARITY_NAMES[code]} ${state.values[code]}`)
    .join(" · ");

  return (
    <>
      {scene && (
        <CosmeticSeal
          scene={scene}
          onClose={() => setScene(null)}
          onApplied={(name) =>
            setMessage({
              text: `${scene.item.kind === "frame" ? "Cornice" : "Effetto"} ${scene.item.name} applicat${scene.item.kind === "frame" ? "a" : "o"} a ${name}.`,
              isError: false,
            })
          }
        />
      )}
      <section className="flex shrink-0 items-center justify-between gap-3 bg-black px-3 py-2">
        <div className="min-w-0">
          <h2 className="font-display text-base uppercase text-comic-yellow">Le tue Schegge</h2>
          <p className="text-xs font-medium leading-4 text-muted">
            Rompi le varianti doppie dalla pagina della carta, in{" "}
            <Link href="/collezione" className="font-bold text-foreground underline">
              Collezione
            </Link>
            : {values}. Le danno anche alcuni premi.
          </p>
        </div>
        <p className="shrink-0 -skew-x-8 bg-comic-magenta px-2.5 font-display text-3xl text-black">
          <span className="sr-only">Saldo: </span>
          {state.shard_balance}
        </p>
      </section>

      <ul className="grid shrink-0 grid-cols-2 gap-1.5" aria-label="Cosa comprare con le Schegge">
        {offers.map((offer) => {
          const missing = offer.cost - state.shard_balance;
          const disabled = Boolean(offer.blocked) || missing > 0 || busy !== null || preview !== null;
          return (
            <li key={offer.item} className={offer.item === "pack" ? "col-span-2" : ""}>
              <HoldToConfirmButton
                onConfirm={() => buy(offer.item)}
                disabled={disabled}
                hint={disabled ? "" : `Tieni premuto · ${offer.cost} ${offer.cost === 1 ? "Scheggia" : "Schegge"}`}
                fillColor="var(--comic-magenta)"
                className="flex min-h-14 w-full flex-col items-start justify-center bg-panel px-3 py-1.5 text-left disabled:opacity-60"
              >
                <span className="flex w-full items-baseline justify-between gap-2">
                  <span className="font-display text-lg uppercase leading-5">{offer.title}</span>
                  <span className="shrink-0 font-display text-lg leading-5 text-comic-magenta">{offer.cost}</span>
                </span>
                <span className="text-xs font-semibold text-muted">
                  {busy === offer.item ? "Un attimo…" : (offer.blocked ?? (missing > 0 ? `Ti mancano ${missing}` : offer.detail))}
                </span>
              </HoldToConfirmButton>
            </li>
          );
        })}
      </ul>

      {message && (
        <div role="status" className={`shrink-0 px-3 py-2 ${message.isError ? "bg-panel" : "bg-comic-yellow text-black"}`}>
          <p className={`text-sm font-bold ${message.isError ? "text-comic-magenta" : ""}`}>{message.text}</p>
          {message.note && <p className="text-xs font-semibold">{message.note}</p>}
        </div>
      )}

      <section className="flex shrink-0 flex-col gap-1">
        <h2 className="font-display text-base uppercase text-comic-yellow">Da applicare</h2>
        {owned.length === 0 ? (
          <p className="text-xs font-medium text-muted">Nessuna cornice o effetto: comprali qui sopra.</p>
        ) : (
          <ul className="flex flex-wrap gap-1" aria-label="Cornici ed effetti da applicare">
            {owned.map((item) => (
              <li key={item.code} className="-skew-x-8 bg-panel px-2 py-0.5 text-xs font-extrabold uppercase">
                {item.name}
                {item.count > 1 && <span className="ml-1 text-muted">×{item.count}</span>}
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs font-medium text-muted">
          Cornici ed effetti escono a caso, ognuno con la stessa probabilità ({FRAME_CODES.length} cornici,{" "}
          {EFFECT_CODES.length} effetti); si applicano dalla pagina della carta e si consumano. Il pacchetto ha le
          probabilità del pacchetto standard, senza i bonus degli eventi.
        </p>
      </section>
    </>
  );
}
