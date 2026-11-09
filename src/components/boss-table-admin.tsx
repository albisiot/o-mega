"use client";

import { useState } from "react";
import { BackLink } from "@/components/comic-parts";
import { balance } from "@/config/balance";
import {
  bossTableProblem,
  exampleBossTable,
  saveBossTable,
  type BossTableNumbers,
  type BossTableSettings,
} from "@/lib/boss-table-admin";
import { describeServerError } from "@/lib/errors";

const FIELDS: { key: keyof BossTableNumbers; label: string; hint: string }[] = [
  { key: "hot_fronts", label: "Fronti caldi al turno 1", hint: "Quanti fronti partono con il valore alto" },
  { key: "hot_value", label: "Valore dei fronti caldi", hint: "Punti di un fronte caldo al turno 1" },
  { key: "base_value", label: "Valore degli altri fronti", hint: "Punti degli altri fronti al turno 1" },
  { key: "growth", label: "Crescita a ogni turno", hint: "Punti in più per tutti i fronti, ogni turno" },
  { key: "extra_fronts", label: "Fronti con crescita extra", hint: "Quanti fronti a caso crescono di più ogni turno" },
  { key: "extra_growth", label: "Crescita extra", hint: "Punti in più per quei fronti" },
];

const DEFAULTS: BossTableNumbers = {
  hot_fronts: balance.boss.hotFronts,
  hot_value: balance.boss.hotValue,
  base_value: balance.boss.baseValue,
  growth: balance.boss.growth,
  extra_fronts: balance.boss.extraFronts,
  extra_growth: balance.boss.extraGrowth,
};

function numbersOf(settings: BossTableSettings): BossTableNumbers {
  const { hot_fronts, hot_value, base_value, growth, extra_fronts, extra_growth } = settings;
  return { hot_fronts, hot_value, base_value, growth, extra_fronts, extra_growth };
}

/**
 * The Grande Minaccia points table: how much each front is worth in each turn. Saved on the
 * server for the matches created afterwards; a match in progress keeps its own table.
 */
export function BossTableAdmin({ initial }: { initial: BossTableSettings }) {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState<Record<keyof BossTableNumbers, string>>(() =>
    Object.fromEntries(Object.entries(numbersOf(initial)).map(([key, value]) => [key, String(value)])) as Record<
      keyof BossTableNumbers,
      string
    >,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const numbers = Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, value.trim() === "" ? NaN : Number(value)])) as BossTableNumbers;
  const problem = bossTableProblem(numbers, saved.fronts);
  const changed = FIELDS.some(({ key }) => numbers[key] !== saved[key]);
  const example = problem ? null : exampleBossTable({ turns: saved.turns, fronts: saved.fronts, ...numbers });

  function set(key: keyof BossTableNumbers, value: string) {
    setDraft((current) => ({ ...current, [key]: value.replace(/[^0-9]/g, "") }));
    setNotice(null);
  }

  async function save() {
    if (problem) return;
    setBusy(true);
    setError(null);
    try {
      const next = await saveBossTable(numbers);
      setSaved(next);
      setNotice("Salvato: vale per le partite che iniziano da adesso.");
    } catch (cause) {
      setError(describeServerError(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex shrink-0 items-center gap-2.5 px-3 pb-1 pt-2">
        <BackLink href="/privacy" label="Torna all'informativa" />
        <div className="min-w-0">
          <h1 className="truncate font-display text-[28px] uppercase leading-8 text-comic-yellow">Grande Minaccia</h1>
          <p className="text-xs font-semibold leading-4 text-muted">Quanti punti vale ogni fronte in ogni turno.</p>
        </div>
      </header>
      <main className="flex flex-col gap-3 px-3 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-1">
        <p className="text-xs font-medium leading-4 text-muted">
          Ogni partita ha {saved.turns} turni e {saved.fronts} fronti. Al turno 1 alcuni fronti a caso sono caldi; a ogni turno
          dopo tutti i fronti crescono, e alcuni a caso crescono di più. La tabella si sorteggia all&apos;inizio di ogni
          partita e i giocatori la vedono tutta. Le modifiche valgono per le partite che iniziano dopo il salvataggio.
        </p>

        <div className="flex flex-col gap-2">
          {FIELDS.map(({ key, label, hint }) => (
            <label key={key} className="grid grid-cols-[minmax(0,1fr)_4.5rem] items-center gap-2">
              <span className="min-w-0">
                <span className="block text-sm font-bold leading-4">{label}</span>
                <span className="block text-[11px] font-medium leading-4 text-muted">
                  {hint}
                  {numbers[key] !== DEFAULTS[key] && ` · predefinito ${DEFAULTS[key]}`}
                </span>
              </span>
              <input
                inputMode="numeric"
                value={draft[key]}
                onChange={(event) => set(key, event.target.value)}
                aria-label={label}
                className="input-comic text-center font-display text-xl"
              />
            </label>
          ))}
        </div>

        <div aria-live="polite" className="empty:hidden">
          {(problem ?? error) && <p className="text-sm font-bold text-comic-magenta">{problem ?? error}</p>}
          {!problem && !error && notice && <p className="text-sm font-bold text-comic-cyan">{notice}</p>}
        </div>

        {example && (
          <section aria-label="Esempio di tabella" className="flex flex-col gap-1">
            <h2 className="section-title text-base leading-5">Un esempio</h2>
            <table className="w-full table-fixed border-collapse text-center">
              <thead>
                <tr className="text-[11px] font-extrabold text-muted">
                  <th className="w-14 text-left">Turno</th>
                  {example[0].map((_, f) => (
                    <th key={f}>Fronte {f + 1}</th>
                  ))}
                  <th className="w-12">Tot.</th>
                </tr>
              </thead>
              <tbody>
                {example.map((row, t) => (
                  <tr key={t}>
                    <td className="py-1 text-left font-display text-lg">{t + 1}</td>
                    {row.map((value, f) => (
                      <td key={f} className="border border-line py-1 font-display text-lg">
                        {value}
                      </td>
                    ))}
                    <td className="py-1 font-display text-lg text-comic-yellow">{row.reduce((sum, v) => sum + v, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[11px] font-medium leading-4 text-muted">
              Quali fronti sono caldi e quali crescono di più cambia a ogni partita. Con le carte fisse, un fronte occupato
              paga il suo valore a ogni turno: il totale di una riga è il massimo che si può incassare in quel turno.
            </p>
          </section>
        )}

        <div className="flex gap-2">
          <button type="button" onClick={save} disabled={busy || Boolean(problem) || !changed} className="btn btn-primary min-w-0 flex-1">
            {busy ? "Salvataggio…" : changed ? "Salva" : "Nessuna modifica"}
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(Object.fromEntries(Object.entries(DEFAULTS).map(([key, value]) => [key, String(value)])) as Record<
                keyof BossTableNumbers,
                string
              >);
              setNotice(null);
            }}
            disabled={busy}
            className="btn btn-ghost shrink-0"
          >
            Predefiniti
          </button>
        </div>
      </main>
    </div>
  );
}
