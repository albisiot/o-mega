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
import { useLockedScreen } from "@/lib/use-locked-screen";

const FIELDS: { key: keyof BossTableNumbers; label: string; hint: string }[] = [
  { key: "hot_fronts", label: "Fronti caldi per turno", hint: "Mai caldi due turni di fila" },
  { key: "hot_value", label: "Valore caldo al turno 1", hint: "Punti di un fronte caldo all'inizio" },
  { key: "hot_growth", label: "Crescita per turno", hint: "Punti in più del fronte caldo, ogni turno" },
  { key: "base_value", label: "Valore degli altri fronti", hint: "Punti dei fronti non caldi, sempre" },
];

const DEFAULTS: BossTableNumbers = {
  hot_fronts: balance.boss.hotFronts,
  hot_value: balance.boss.hotValue,
  hot_growth: balance.boss.hotGrowth,
  base_value: balance.boss.baseValue,
};

type Draft = Record<keyof BossTableNumbers, string>;

function draftOf(numbers: BossTableNumbers): Draft {
  return {
    hot_fronts: String(numbers.hot_fronts),
    hot_value: String(numbers.hot_value),
    hot_growth: String(numbers.hot_growth),
    base_value: String(numbers.base_value),
  };
}

/**
 * The Grande Minaccia points table: how much each front is worth in each turn. Saved on the
 * server for the matches created afterwards; a match in progress keeps its own table. The
 * page fits the phone and never scrolls (see .game-shell).
 */
export function BossTableAdmin({ initial }: { initial: BossTableSettings }) {
  useLockedScreen(true);
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState<Draft>(() => draftOf(initial));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const numbers: BossTableNumbers = {
    hot_fronts: draft.hot_fronts.trim() === "" ? NaN : Number(draft.hot_fronts),
    hot_value: draft.hot_value.trim() === "" ? NaN : Number(draft.hot_value),
    hot_growth: draft.hot_growth.trim() === "" ? NaN : Number(draft.hot_growth),
    base_value: draft.base_value.trim() === "" ? NaN : Number(draft.base_value),
  };
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
    <div className="game-shell">
      <header className="flex shrink-0 items-center gap-2.5 px-3 pb-1 pt-2">
        <BackLink href="/privacy" label="Torna all'informativa" />
        <div className="min-w-0">
          <h1 className="truncate font-display text-[28px] uppercase leading-8 text-comic-yellow">Grande Minaccia</h1>
          <p className="text-xs font-semibold leading-4 text-muted">Quanti punti vale ogni fronte in ogni turno.</p>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col gap-2 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-1">
        <p className="shrink-0 text-xs font-medium leading-4 text-muted">
          {saved.turns} turni, {saved.fronts} fronti. Ogni turno alcuni fronti a caso sono caldi, mai gli stessi del turno
          prima, e valgono di più a ogni turno. Vale per le partite che iniziano dopo il salvataggio.
        </p>

        <div className="grid shrink-0 grid-cols-2 gap-x-3 gap-y-1.5">
          {FIELDS.map(({ key, label, hint }) => (
            <label key={key} className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-[13px] font-bold leading-4">{label}</span>
              <span className="flex items-center gap-2">
                <input
                  inputMode="numeric"
                  value={draft[key]}
                  onChange={(event) => set(key, event.target.value)}
                  aria-label={label}
                  className="input-comic w-16 shrink-0 text-center font-display text-xl"
                />
                <span className="min-w-0 text-[10.5px] font-medium leading-[13px] text-muted">
                  {hint}
                  {numbers[key] !== DEFAULTS[key] && ` · predefinito ${DEFAULTS[key]}`}
                </span>
              </span>
            </label>
          ))}
        </div>

        <div aria-live="polite" className="shrink-0 empty:hidden">
          {(problem ?? error) && <p className="text-sm font-bold text-comic-magenta">{problem ?? error}</p>}
          {!problem && !error && notice && <p className="text-sm font-bold text-comic-cyan">{notice}</p>}
        </div>

        {/* The example takes the room left; on a very short screen it scrolls inside. */}
        <section aria-label="Esempio di tabella" className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain">
          {example && (
            <>
              <h2 className="section-title text-base leading-5">Un esempio</h2>
              <table className="w-full table-fixed border-collapse text-center">
                <thead>
                  <tr className="text-[11px] font-extrabold text-muted">
                    <th className="w-12 text-left">Turno</th>
                    {example[0].map((_, f) => (
                      <th key={f}>F{f + 1}</th>
                    ))}
                    <th className="w-11">Tot.</th>
                  </tr>
                </thead>
                <tbody>
                  {example.map((row, t) => (
                    <tr key={t}>
                      <td className="py-0.5 text-left font-display text-lg">{t + 1}</td>
                      {row.map((value, f) => (
                        <td
                          key={f}
                          className={`border border-line py-0.5 font-display text-lg ${
                            value !== numbers.base_value ? "bg-comic-yellow text-black" : ""
                          }`}
                        >
                          {value}
                        </td>
                      ))}
                      <td className="py-0.5 font-display text-lg text-comic-yellow">{row.reduce((sum, v) => sum + v, 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-[11px] font-medium leading-4 text-muted">
                In giallo i fronti caldi: quali sono cambia a ogni partita. Ogni fronte occupato paga il suo valore a ogni
                turno, quindi il totale di una riga è il massimo che si incassa in quel turno.
              </p>
            </>
          )}
        </section>

        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={save} disabled={busy || Boolean(problem) || !changed} className="btn btn-primary min-w-0 flex-1">
            {busy ? "Salvataggio…" : changed ? "Salva" : "Nessuna modifica"}
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(draftOf(DEFAULTS));
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
