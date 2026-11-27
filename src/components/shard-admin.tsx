"use client";

import { useState, type FormEvent } from "react";
import { BackLink } from "@/components/comic-parts";
import { saveShardSettings, type ShardSettings } from "@/lib/cosmetics";
import { describeServerError } from "@/lib/errors";
import { useLockedScreen } from "@/lib/use-locked-screen";

const COSTS: { key: keyof ShardSettings["costs"]; label: string }[] = [
  { key: "pack_cost", label: "Pacchetto standard" },
  { key: "random_cosmetic_cost", label: "Cornice o effetto a caso" },
  { key: "chosen_kind_cosmetic_cost", label: "Cornice a caso, o effetto a caso" },
  { key: "new_variant_cost", label: "Variante che il giocatore non ha" },
];

/**
 * Editor → Schegge (SPEC §4.8): the Schegge a broken duplicate variant gives, by rarity, and the
 * prices in Schegge. The page fits the phone and never scrolls (see .game-shell): only the form
 * scrolls inside, and the button stays at the bottom. The server checks the admin and every value.
 */
export function ShardAdmin({ initial }: { initial: ShardSettings }) {
  useLockedScreen(true);
  const [saved, setSaved] = useState(initial);
  const [values, setValues] = useState(() => Object.fromEntries(initial.rarities.map((r) => [r.code, String(r.value)])));
  const [costs, setCosts] = useState(() => Object.fromEntries(COSTS.map(({ key }) => [key, String(initial.costs[key])])));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const numbers = (entries: Record<string, string>) => Object.fromEntries(Object.entries(entries).map(([key, value]) => [key, Number(value)]));
  const valid =
    Object.values(values).every((value) => /^\d+$/.test(value) && Number(value) <= 100) &&
    Object.values(costs).every((value) => /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 100);

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const next = await saveShardSettings(numbers(values), numbers(costs) as ShardSettings["costs"]);
      setSaved(next);
      setMessage({ text: "Salvato: vale da subito.", isError: false });
    } catch (cause) {
      setMessage({ text: describeServerError(cause), isError: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="game-shell">
      <header className="flex shrink-0 items-center gap-2.5 px-3 pb-1 pt-2">
        <BackLink href="/editor" />
        <div className="min-w-0">
          <h1 className="truncate font-display text-[32px] uppercase leading-9 text-comic-yellow">Schegge</h1>
          <p className="text-xs font-semibold leading-4 text-muted">Quante ne dà una variante rotta, e i prezzi.</p>
        </div>
      </header>
      <form onSubmit={save} className="flex min-h-0 flex-1 flex-col gap-2 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-1">
        <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-1 pb-1">
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1 text-sm font-bold">Schegge per ogni variante doppia rotta (0–100)</legend>
            <div className="grid grid-cols-5 gap-1.5">
              {saved.rarities.map((rarity) => (
                <label key={rarity.code} className="flex flex-col items-center gap-1 bg-panel px-1 py-1.5">
                  <span className="max-w-full truncate font-display text-sm uppercase" style={{ color: rarity.color }}>
                    {rarity.name}
                  </span>
                  <input
                    inputMode="numeric"
                    value={values[rarity.code] ?? ""}
                    onChange={(event) => setValues({ ...values, [rarity.code]: event.target.value.trim() })}
                    className="w-full bg-background px-1 py-1 text-center font-display text-xl"
                    aria-label={`Schegge per una ${rarity.name} rotta`}
                  />
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1 text-sm font-bold">Prezzi in Schegge (1–100)</legend>
            {COSTS.map(({ key, label }) => (
              <label key={key} className="flex items-center justify-between gap-3 bg-panel px-3 py-1.5">
                <span className="text-sm font-semibold">{label}</span>
                <input
                  inputMode="numeric"
                  value={costs[key] ?? ""}
                  onChange={(event) => setCosts({ ...costs, [key]: event.target.value.trim() })}
                  className="w-16 bg-background px-1 py-1 text-center font-display text-xl"
                />
              </label>
            ))}
          </fieldset>
          <p className="text-xs font-medium text-muted">
            Il pacchetto con le Schegge usa la probabilità di variante del pacchetto standard (Ricompense partite), senza i
            bonus degli eventi. Se quella probabilità supera il 10% circa, chi ha già quasi tutte le varianti può aprire
            pacchetti all&apos;infinito: ogni pacchetto renderebbe più Schegge di quante ne costa.
          </p>
        </div>
        {!valid && <p className="shrink-0 text-sm font-semibold text-comic-magenta">Numeri interi: valori da 0 a 100, prezzi da 1 a 100.</p>}
        {message && (
          <p role="status" className={`shrink-0 text-sm font-semibold ${message.isError ? "text-comic-magenta" : "text-comic-cyan"}`}>
            {message.text}
          </p>
        )}
        <button type="submit" disabled={!valid || busy} className="btn btn-primary min-h-12 shrink-0 disabled:opacity-60">
          {busy ? "Salvataggio…" : "Salva"}
        </button>
      </form>
    </div>
  );
}
