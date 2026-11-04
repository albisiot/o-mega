"use client";

import { useRef, useState } from "react";
import { Silhouette } from "@/components/card-view";
import { Sheet } from "@/components/sheet";
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

/**
 * The copies of a character on one row, under its card. A tap opens them in full in a sheet
 * from the bottom: protected and locked copies, the conversion of duplicates and the
 * variants still to find. The variants found are shown on the card itself.
 */
export function CopiesSheet({
  card,
  owned,
  onConverted,
}: {
  card: CatalogCard;
  owned: OwnedSummary;
  onConverted: () => void;
}) {
  const sheet = useRef<HTMLDialogElement>(null);
  const found = new Set(owned.variants.map((variant) => variant.style)).size;
  const counts = [
    { label: "Copie", value: `${owned.copies}`, lit: false },
    { label: "Doppioni", value: `${owned.convertible_copies}`, lit: owned.convertible_copies > 0 },
    ...(card.variantCount > 0 ? [{ label: "Varianti", value: `${found}/${card.variantCount}`, lit: false }] : []),
  ];

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => sheet.current?.showModal()}
        className="flex w-full max-w-sm shrink-0 gap-1 text-left"
      >
        {counts.map(({ label, value, lit }) => (
          <span key={label} className="flex min-w-0 flex-1 flex-col bg-panel px-3 py-1">
            <span className="text-[13px] font-semibold leading-[17px] text-muted">{label}</span>
            <span className={`font-display text-2xl leading-7 ${lit ? "text-comic-yellow" : ""}`}>{value}</span>
          </span>
        ))}
        <span aria-hidden className="flex w-11 shrink-0 items-center justify-center bg-panel text-comic-yellow">
          <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={3}>
            <path d="m8 3 7 7-7 7" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
      <Sheet sheetRef={sheet} title={`Copie di ${card.name}`}>
        <CopiesPanel card={card} owned={owned} onConverted={onConverted} />
        <MissingVariants card={card} found={found} />
      </Sheet>
    </>
  );
}

/** How many artwork variants of this character the player has still to find, if any. */
function MissingVariants({ card, found }: { card: CatalogCard; found: number }) {
  const missing = Math.max(0, card.variantCount - found);
  if (missing === 0) return null;
  return (
    <p className="text-sm font-semibold text-muted">
      {missing === 1
        ? "Esiste una variante di questa carta che non hai ancora trovato."
        : `Esistono ${missing} varianti di questa carta che non hai ancora trovato.`}{" "}
      Si trovano nei pacchetti.
    </p>
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
