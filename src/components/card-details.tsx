"use client";

import { useState } from "react";
import { CardView, Silhouette } from "@/components/card-view";
import { convertDuplicates, type CatalogCard, type OwnedSummary } from "@/lib/collection";
import { describeServerError } from "@/lib/errors";

export function CopiesPanel({
  card,
  owned,
  onConverted,
}: {
  card: CatalogCard;
  owned: OwnedSummary;
  onConverted: () => void;
}) {
  const [confirm, setConfirm] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const value = card.duplicateCoinValue;
  const convertible = owned.convertible_copies;

  async function convert(count: number) {
    setBusy(true);
    try {
      const result = await convertDuplicates(card.id, count);
      setMessage({
        text: `${result.converted === 1 ? "Convertita 1 copia" : `Convertite ${result.converted} copie`}: +${result.coins} monete (saldo ${result.coin_balance}).`,
        isError: false,
      });
      onConverted();
    } catch (cause) {
      setMessage({ text: describeServerError(cause), isError: true });
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  return (
    <section className="flex w-full max-w-sm flex-col gap-3">
      <dl className="grid grid-cols-2 gap-2.5">
        <Row label="Copie possedute" value={owned.copies} />
        <Row label="Doppioni convertibili" value={convertible} hint={`${value} monete l'uno`} />
        {owned.starter_copies > 0 && (
          <Row label="Protette" value={owned.starter_copies} hint="Legata all'account: mai conquistabile né convertibile." />
        )}
        {owned.locked_copies > 0 && (
          <Row label="Bloccate" value={owned.locked_copies} hint="Appena conquistate: non convertibili per ora." />
        )}
        {owned.variants.length > 0 && (
          <Row label="Varianti" value={owned.variants.length} hint="Disegno più raro: non si convertono in monete." />
        )}
      </dl>

      {convertible > 0 &&
        (confirm === null ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setConfirm(1);
                setMessage(null);
              }}
              className="btn btn-outline flex-1"
            >
              Converti 1 · +{value}
            </button>
            {convertible > 1 && (
              <button
                type="button"
                onClick={() => {
                  setConfirm(convertible);
                  setMessage(null);
                }}
                className="btn btn-outline flex-1"
              >
                Tutti ({convertible}) · +{value * convertible}
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2 bg-panel p-3">
            <p className="text-sm font-semibold">
              Convertire {confirm === 1 ? "1 copia" : `${confirm} copie`} in {value * confirm} monete? Non si può
              annullare.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => convert(confirm)}
                disabled={busy}
                className="btn btn-primary flex-1 disabled:opacity-60"
              >
                {busy ? "Conversione…" : "Conferma"}
              </button>
              <button type="button" onClick={() => setConfirm(null)} disabled={busy} className="btn btn-ghost">
                Annulla
              </button>
            </div>
          </div>
        ))}

      {message && (
        <p className={`text-sm font-semibold ${message.isError ? "text-comic-magenta" : "text-comic-cyan"}`}>
          {message.text}
        </p>
      )}
    </section>
  );
}

/** The variants this player found, one per style, and how many are still to find. */
export function VariantsPanel({ card, owned }: { card: CatalogCard; owned: OwnedSummary }) {
  const found = [...new Map(owned.variants.map((variant) => [variant.style, variant])).values()];
  const missing = Math.max(0, card.variantCount - found.length);
  if (card.variantCount === 0) return null;
  return (
    <section className="flex w-full max-w-sm flex-col items-center gap-3">
      <h2 className="section-title self-start">Varianti</h2>
      {found.map((variant) => (
        <CardView
          key={variant.style}
          card={{ ...card, art_url: variant.art_url, variant: { name: variant.name } }}
        />
      ))}
      {missing > 0 && (
        <p className="self-start text-sm font-semibold text-muted">
          {missing === 1
            ? "Esiste una variante di questa carta che non hai ancora trovato."
            : `Esistono ${missing} varianti di questa carta che non hai ancora trovato.`}{" "}
          Si trovano nei pacchetti.
        </p>
      )}
    </section>
  );
}

function Row({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="flex flex-col bg-panel px-3.5 py-2.5">
      <dt className="text-[13px] font-semibold leading-[17px] text-muted">{label}</dt>
      <dd className="font-display text-3xl">{value}</dd>
      {hint && <p className="text-xs font-medium text-faint">{hint}</p>}
    </div>
  );
}

export function MissingCard({ card }: { card: CatalogCard }) {
  return (
    <div className="flex w-[300px] flex-col items-center gap-4 rounded-xl border-4 border-dashed border-line bg-panel p-6 text-center">
      <Silhouette faction={card.faction} ink="#3a3a45" className="h-44" />
      <div>
        <p className="font-display text-3xl text-faint">???</p>
        <p className="font-display text-lg uppercase" style={{ color: card.rarity.color }}>
          {card.rarity.name}
        </p>
      </div>
      <p className="text-sm font-semibold text-muted">
        {card.unlockLevel
          ? `Si sblocca al livello ${card.unlockLevel}: non si trova nei pacchetti.`
          : "Non l'hai ancora trovata. Apri pacchetti per scoprirla."}
      </p>
    </div>
  );
}
