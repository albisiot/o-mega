"use client";

import { useState } from "react";
import { Silhouette } from "@/components/card-view";
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
    <section className="flex w-full max-w-sm flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <dl className="flex flex-col gap-1.5 text-sm">
        <Row label="Copie possedute" value={owned.copies} />
        {owned.starter_copies > 0 && (
          <Row label="Starter" value={owned.starter_copies} hint="Legata all'account: mai conquistabile né convertibile." />
        )}
        {owned.locked_copies > 0 && (
          <Row label="Bloccate" value={owned.locked_copies} hint="Appena conquistate: non convertibili per ora." />
        )}
        <Row label="Doppioni convertibili" value={convertible} hint={`${value} monete l'uno`} />
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
              className="flex-1 rounded-full border border-amber-400/60 px-3 py-2 text-sm font-semibold text-amber-300"
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
                className="flex-1 rounded-full border border-amber-400/60 px-3 py-2 text-sm font-semibold text-amber-300"
              >
                Tutti ({convertible}) · +{value * convertible}
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-zinc-300">
              Convertire {confirm === 1 ? "1 copia" : `${confirm} copie`} in {value * confirm} monete? Non si può
              annullare.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => convert(confirm)}
                disabled={busy}
                className="flex-1 rounded-full bg-amber-400 px-4 py-2 text-sm font-bold text-zinc-950 disabled:opacity-60"
              >
                {busy ? "Conversione…" : "Conferma"}
              </button>
              <button
                type="button"
                onClick={() => setConfirm(null)}
                disabled={busy}
                className="rounded-full border border-white/15 px-4 py-2 text-sm"
              >
                Annulla
              </button>
            </div>
          </div>
        ))}

      {message && <p className={`text-sm ${message.isError ? "text-red-400" : "text-emerald-400"}`}>{message.text}</p>}
    </section>
  );
}

function Row({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div>
      <div className="flex justify-between">
        <dt className="text-zinc-400">{label}</dt>
        <dd className="font-semibold">{value}</dd>
      </div>
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

export function MissingCard({ card }: { card: CatalogCard }) {
  return (
    <div className="flex w-72 flex-col items-center gap-4 rounded-2xl border-2 border-white/10 bg-zinc-900 p-6 text-center">
      <Silhouette color="#3f3f46" className="h-40" />
      <div>
        <p className="text-lg font-bold text-zinc-500">???</p>
        <p className="text-sm" style={{ color: card.rarity.color }}>
          {card.rarity.name}
        </p>
      </div>
      <p className="text-sm text-zinc-400">Non l&apos;hai ancora trovata. Apri pacchetti per scoprirla.</p>
    </div>
  );
}
