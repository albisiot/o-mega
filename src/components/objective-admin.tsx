"use client";

import { useState, type FormEvent } from "react";
import { BackLink, TabBar } from "@/components/comic-parts";
import { describeServerError } from "@/lib/errors";
import {
  OBJECTIVE_KINDS,
  deleteAdminObjective,
  describeAdminReward,
  kindOf,
  saveAdminObjective,
  setAdminObjectiveActive,
  suggestTitle,
  type AdminObjective,
  type AdminObjectives,
} from "@/lib/objective-admin";
import { DIFFICULTY_LABELS, type ObjectiveDifficulty } from "@/lib/objectives";
import { useLockedScreen } from "@/lib/use-locked-screen";

const INPUT = "min-h-12 w-full min-w-0 max-w-full border-2 border-comic-yellow bg-black px-3 text-base font-semibold";
const LABEL = "flex min-w-0 flex-col gap-1 text-sm font-bold";
const DIFFICULTIES: ObjectiveDifficulty[] = ["easy", "medium", "hard"];

/**
 * The catalog of daily objectives, for admins: the list by difficulty and the form to
 * add or change one. Every action is checked again on the server.
 */
export function ObjectiveAdmin({ data, onChange }: { data: AdminObjectives; onChange: (next: AdminObjectives) => void }) {
  useLockedScreen(true);
  const [tab, setTab] = useState<"list" | "form">("list");
  const [editing, setEditing] = useState<AdminObjective | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const active = data.objectives.filter((objective) => objective.is_active).length;

  return (
    <div className="game-shell">
      <header className="flex shrink-0 items-center gap-2.5 px-3 pb-1 pt-2">
        <BackLink href="/editor" label="Torna all'Editor" />
        <h1 className="font-display text-[32px] uppercase leading-10 text-comic-yellow">Obiettivi</h1>
      </header>
      <main className="flex min-h-0 flex-1 flex-col gap-2 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-1">
        <TabBar
          tabs={[
            { key: "list", label: `Elenco (${active}/${data.objectives.length})` },
            { key: "form", label: editing ? "Modifica" : "Nuovo" },
          ]}
          current={tab}
          onPick={(next) => {
            setTab(next);
            setNotice(null);
            if (next === "list") setEditing(null);
          }}
          label="Gestione obiettivi"
        />
        <div aria-live="polite" className="shrink-0 empty:hidden">
          {notice && <p className="bg-panel px-3 py-2 text-sm font-bold">{notice}</p>}
        </div>
        {tab === "list" ? (
          <div role="tabpanel" className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain">
            {DIFFICULTIES.map((difficulty) => {
              const list = data.objectives.filter((objective) => objective.difficulty === difficulty);
              const on = list.filter((objective) => objective.is_active).length;
              return (
                <section key={difficulty} className="flex flex-col gap-1">
                  <h2 className="font-display text-xl uppercase leading-6 text-comic-yellow">
                    {DIFFICULTY_LABELS[difficulty]}{" "}
                    <span className="font-sans text-xs font-bold normal-case text-muted">
                      {on} attivi · {data.per_day[difficulty]} al giorno · {data.reward_coins[difficulty]} monete di base
                    </span>
                  </h2>
                  <ul className="flex flex-col gap-1">
                    {list.map((objective) => (
                      <ObjectiveRow
                        key={objective.code}
                        objective={objective}
                        data={data}
                        onChange={(next, message) => {
                          onChange(next);
                          setNotice(message);
                        }}
                        onEdit={() => {
                          setEditing(objective);
                          setNotice(null);
                          setTab("form");
                        }}
                      />
                    ))}
                  </ul>
                </section>
              );
            })}
            <p className="shrink-0 text-xs font-medium leading-4 text-muted">
              Le modifiche valgono dalla prossima estrazione: chi ha già l&apos;obiettivo oggi lo tiene com&apos;era. Un
              obiettivo già assegnato non si elimina, si disattiva. Ogni difficoltà deve avere almeno tanti obiettivi attivi
              quanti se ne danno al giorno.
            </p>
          </div>
        ) : (
          <ObjectiveForm
            key={editing?.code ?? "new"}
            editing={editing}
            data={data}
            onSaved={(next) => {
              onChange(next);
              setNotice(editing ? "Obiettivo modificato." : "Obiettivo aggiunto.");
              setEditing(null);
              setTab("list");
            }}
          />
        )}
      </main>
    </div>
  );
}

function ObjectiveRow({
  objective,
  data,
  onChange,
  onEdit,
}: {
  objective: AdminObjective;
  data: AdminObjectives;
  onChange: (next: AdminObjectives, message: string) => void;
  onEdit: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const kind = kindOf(objective);

  const run = (action: () => Promise<AdminObjectives>, message: string) => {
    setBusy(true);
    setError(null);
    action()
      .then((next) => onChange(next, message))
      .catch((cause: unknown) => setError(describeServerError(cause)))
      .finally(() => {
        setBusy(false);
        setConfirming(false);
      });
  };

  return (
    <li className={`flex flex-col gap-1 bg-panel px-3 py-2 ${objective.is_active ? "" : "opacity-60"}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 font-display text-[17px] uppercase leading-5">{objective.title}</p>
        <span
          className={`shrink-0 px-1.5 text-[11px] font-extrabold uppercase leading-5 ${
            objective.is_active ? "bg-comic-cyan text-black" : "bg-black text-muted"
          }`}
        >
          {objective.is_active ? "Attivo" : "Disattivato"}
        </span>
      </div>
      <p className="text-xs font-semibold leading-4 text-muted">
        {kind ? kind.label : "Personalizzato (SQL)"} · soglia {objective.target} ·{" "}
        <span className="text-comic-yellow">{describeAdminReward(objective, data.reward_coins)}</span> · assegnato{" "}
        {objective.assigned} {objective.assigned === 1 ? "volta" : "volte"}
      </p>
      {error && <p className="text-xs font-bold text-comic-magenta">{error}</p>}
      <div className="flex flex-wrap justify-end gap-x-3">
        <button type="button" onClick={onEdit} disabled={busy} className="min-h-11 px-1 text-[13px] font-extrabold uppercase underline">
          Modifica
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            run(
              () => setAdminObjectiveActive(objective.code, !objective.is_active),
              objective.is_active ? "Obiettivo disattivato: non esce più." : "Obiettivo riattivato.",
            )
          }
          className="min-h-11 px-1 text-[13px] font-extrabold uppercase text-comic-cyan underline"
        >
          {objective.is_active ? "Disattiva" : "Riattiva"}
        </button>
        {objective.assigned === 0 && (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              confirming ? run(() => deleteAdminObjective(objective.code), "Obiettivo eliminato.") : setConfirming(true)
            }
            className="min-h-11 px-1 text-[13px] font-extrabold uppercase text-comic-magenta underline"
          >
            {confirming ? "Conferma eliminazione" : "Elimina"}
          </button>
        )}
      </div>
    </li>
  );
}

function ObjectiveForm({
  editing,
  data,
  onSaved,
}: {
  editing: AdminObjective | null;
  data: AdminObjectives;
  onSaved: (next: AdminObjectives) => void;
}) {
  const editingKind = editing ? kindOf(editing) : null;
  // A hand-written objective keeps its metric and filters: only the rest changes.
  const custom = editing !== null && editingKind === null;
  const [kindKey, setKindKey] = useState(editingKind?.key ?? OBJECTIVE_KINDS[0].key);
  const [difficulty, setDifficulty] = useState<ObjectiveDifficulty>(editing?.difficulty ?? "easy");
  const [target, setTarget] = useState(String(editing?.target ?? 1));
  const [title, setTitle] = useState(editing?.title ?? suggestTitle(OBJECTIVE_KINDS[0].key, 1));
  const [titleTouched, setTitleTouched] = useState(editing !== null);
  const [ownCoins, setOwnCoins] = useState(editing?.coins !== null && editing?.coins !== undefined);
  const [coins, setCoins] = useState(String(editing?.coins ?? data.reward_coins[editing?.difficulty ?? "easy"]));
  const [packs, setPacks] = useState(String(editing?.packs ?? 0));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetNumber = Number(target);
  const retitle = (nextKind: string, nextTarget: string) => {
    if (!titleTouched && !custom) setTitle(suggestTitle(nextKind, Number(nextTarget) || 1));
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    const kind = OBJECTIVE_KINDS.find((entry) => entry.key === kindKey) ?? OBJECTIVE_KINDS[0];
    setSaving(true);
    setError(null);
    try {
      onSaved(
        await saveAdminObjective({
          code: editing?.code ?? null,
          title,
          difficulty,
          metric: custom && editing ? editing.metric : kind.metric,
          params: custom && editing ? editing.params : kind.params,
          target: targetNumber,
          coins: ownCoins ? Number(coins) : null,
          packs: Number(packs),
        }),
      );
    } catch (cause) {
      setError(describeServerError(cause));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain">
        <label className={LABEL}>
          Cosa conta
          {custom ? (
            <span className="text-sm font-semibold text-muted">Personalizzato, scritto con SQL: resta com&apos;è.</span>
          ) : (
            <select
              value={kindKey}
              onChange={(event) => {
                setKindKey(event.target.value);
                retitle(event.target.value, target);
              }}
              className={INPUT}
            >
              {OBJECTIVE_KINDS.map((kind) => (
                <option key={kind.key} value={kind.key}>
                  {kind.label}
                </option>
              ))}
            </select>
          )}
        </label>

        <fieldset className="flex flex-col gap-1">
          <legend className="text-sm font-bold">Difficoltà</legend>
          <div className="mt-1 flex gap-1.5">
            {DIFFICULTIES.map((entry) => (
              <button
                key={entry}
                type="button"
                aria-pressed={difficulty === entry}
                onClick={() => {
                  setDifficulty(entry);
                  if (!ownCoins) setCoins(String(data.reward_coins[entry]));
                }}
                className={`min-h-11 flex-1 -skew-x-8 font-display text-[17px] uppercase ${
                  difficulty === entry ? "bg-comic-magenta text-black" : "bg-panel text-muted"
                }`}
              >
                {DIFFICULTY_LABELS[entry]}
              </button>
            ))}
          </div>
        </fieldset>

        <label className={LABEL}>
          Soglia (1–100)
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={100}
            required
            value={target}
            onChange={(event) => {
              setTarget(event.target.value);
              retitle(kindKey, event.target.value);
            }}
            className={INPUT}
          />
        </label>

        <label className={LABEL}>
          Titolo per i giocatori
          <input
            type="text"
            required
            minLength={3}
            maxLength={80}
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setTitleTouched(true);
            }}
            className={INPUT}
          />
        </label>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-sm font-bold">Premio</legend>
          <label className="mt-1 flex min-h-11 items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={!ownCoins}
              onChange={(event) => {
                setOwnCoins(!event.target.checked);
                if (event.target.checked) setCoins(String(data.reward_coins[difficulty]));
              }}
              className="size-5 accent-[var(--comic-yellow)]"
            />
            Monete della difficoltà ({data.reward_coins[difficulty]})
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className={LABEL}>
              Monete
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={100000}
                disabled={!ownCoins}
                value={coins}
                onChange={(event) => setCoins(event.target.value)}
                className={`${INPUT} disabled:opacity-50`}
              />
            </label>
            <label className={LABEL}>
              Pacchetti (0–5)
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={5}
                value={packs}
                onChange={(event) => setPacks(event.target.value)}
                className={INPUT}
              />
            </label>
          </div>
          {editing && editing.cards > 0 && (
            <p className="text-xs font-medium text-muted">Più {editing.cards} carte premio, impostate con SQL: restano.</p>
          )}
        </fieldset>
      </div>

      {error && <p className="shrink-0 text-sm font-bold text-comic-magenta">{error}</p>}
      <button type="submit" disabled={saving} className="btn btn-primary shrink-0">
        {saving ? "Salvataggio…" : editing ? "Salva le modifiche" : "Aggiungi l'obiettivo"}
      </button>
    </form>
  );
}
