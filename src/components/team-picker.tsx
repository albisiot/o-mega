"use client";

import { useMemo, useState } from "react";
import { balance } from "@/config/balance";
import type { CatalogCard } from "@/lib/collection";
import { describeServerError } from "@/lib/errors";
import { deleteFormation, saveFormation, type Formation } from "@/lib/match";

const LAST_TEAM_KEY = "o-mega.last-team";

function loadLastTeam(owned: Map<string, string>): string[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(LAST_TEAM_KEY) ?? "[]");
    return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === "string" && owned.has(id)) : [];
  } catch {
    return [];
  }
}

type TeamPickerProps = {
  catalog: CatalogCard[];
  /** Owned characters: definition id → one card instance id. */
  owned: Map<string, string>;
  /** Card instance id → definition id (to load formations). */
  instanceDefinitions: Map<string, string>;
  formations: Formation[];
  onFormationsChanged: (formations: Formation[]) => void;
  startLabel: string;
  starting: boolean;
  onStart: (cardInstanceIds: string[]) => void;
};

/** Pick 5 different characters among the owned ones; load or save formations. */
export function TeamPicker(props: TeamPickerProps) {
  const { catalog, owned, instanceDefinitions, formations, onFormationsChanged, startLabel, starting, onStart } = props;
  const size = balance.match.teamSize;
  const [selected, setSelected] = useState<string[]>(() => loadLastTeam(owned).slice(0, size));
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const cards = useMemo(
    () =>
      catalog
        .filter((card) => owned.has(card.id))
        .sort((a, b) => b.rarity.rank - a.rarity.rank || a.code.localeCompare(b.code)),
    [catalog, owned],
  );
  const byId = useMemo(() => new Map(catalog.map((card) => [card.id, card])), [catalog]);
  const instanceIds = selected.map((definitionId) => owned.get(definitionId)!);

  function toggle(definitionId: string) {
    setMessage(null);
    setSelected((current) =>
      current.includes(definitionId)
        ? current.filter((id) => id !== definitionId)
        : current.length < size
          ? [...current, definitionId]
          : current,
    );
  }

  function loadFormation(formation: Formation) {
    const definitions = formation.card_instance_ids
      .map((id) => instanceDefinitions.get(id))
      .filter((id): id is string => Boolean(id && owned.has(id)));
    setSelected([...new Set(definitions)].slice(0, size));
    setMessage(
      definitions.length < size
        ? { text: "Alcune carte di questa formazione non sono più nella collezione.", isError: true }
        : null,
    );
  }

  async function save() {
    try {
      const formation = await saveFormation(null, name, instanceIds);
      onFormationsChanged([...formations, formation]);
      setNaming(false);
      setName("");
      setMessage({ text: `Formazione "${formation.name}" salvata.`, isError: false });
    } catch (cause) {
      setMessage({ text: describeServerError(cause), isError: true });
    }
  }

  async function remove(formation: Formation) {
    try {
      await deleteFormation(formation.id);
      onFormationsChanged(formations.filter((f) => f.id !== formation.id));
    } catch (cause) {
      setMessage({ text: describeServerError(cause), isError: true });
    }
  }

  function start() {
    try {
      localStorage.setItem(LAST_TEAM_KEY, JSON.stringify(selected));
    } catch {
      // Remembering the team is a convenience only.
    }
    onStart(instanceIds);
  }

  return (
    <div className="flex flex-col gap-4 pb-28">
      <section className="flex gap-1.5">
        {Array.from({ length: size }, (_, i) => {
          const card = selected[i] ? byId.get(selected[i]) : null;
          return (
            <button
              key={i}
              type="button"
              disabled={!card}
              onClick={() => card && toggle(card.id)}
              className="flex h-16 flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed px-1 text-center"
              style={{ borderColor: card ? card.rarity.color : "#ffffff26", borderStyle: card ? "solid" : "dashed" }}
              aria-label={card ? `Togli ${card.name}` : `Posto ${i + 1} libero`}
            >
              {card ? (
                <span className="line-clamp-2 text-[10px] font-semibold leading-tight">{card.name}</span>
              ) : (
                <span className="text-xs text-zinc-600">{i + 1}</span>
              )}
            </button>
          );
        })}
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-[0.2em] text-zinc-500">Formazioni</h2>
          {!naming && (
            <button
              type="button"
              disabled={selected.length < size || formations.length >= balance.formations.maxPerPlayer}
              onClick={() => setNaming(true)}
              className="text-xs font-semibold text-amber-300 disabled:text-zinc-600"
            >
              + Salva questa squadra
            </button>
          )}
        </div>
        {naming && (
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={30}
              placeholder="Nome della formazione"
              className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-base outline-none focus:border-amber-400"
            />
            <button
              type="button"
              onClick={save}
              disabled={!name.trim()}
              className="rounded-xl bg-amber-400 px-3 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-40"
            >
              Salva
            </button>
            <button type="button" onClick={() => setNaming(false)} className="px-2 text-sm text-zinc-400">
              Annulla
            </button>
          </div>
        )}
        {formations.length === 0 ? (
          <p className="text-xs text-zinc-500">Nessuna formazione salvata.</p>
        ) : (
          <div className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1">
            {formations.map((formation) => (
              <span key={formation.id} className="flex shrink-0 items-center rounded-full border border-white/15">
                <button type="button" onClick={() => loadFormation(formation)} className="py-1 pl-3 pr-1 text-xs font-semibold">
                  {formation.name}
                </button>
                <button
                  type="button"
                  onClick={() => remove(formation)}
                  aria-label={`Elimina ${formation.name}`}
                  className="px-2 py-1 text-xs text-zinc-500"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        {message && <p className={`text-xs ${message.isError ? "text-red-400" : "text-emerald-400"}`}>{message.text}</p>}
      </section>

      <ul className="grid grid-cols-2 gap-2">
        {cards.map((card) => {
          const position = selected.indexOf(card.id);
          const top = Object.entries(card.stats)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);
          return (
            <li key={card.id}>
              <button
                type="button"
                onClick={() => toggle(card.id)}
                className={`relative flex w-full flex-col gap-1 rounded-xl border-2 bg-zinc-900 p-2 text-left ${
                  position >= 0 ? "ring-2 ring-amber-400" : ""
                }`}
                style={{ borderColor: `${card.rarity.color}99` }}
                aria-pressed={position >= 0}
              >
                {position >= 0 && (
                  <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[11px] font-black text-zinc-950">
                    {position + 1}
                  </span>
                )}
                <span className="truncate pr-6 text-sm font-semibold">{card.name}</span>
                <span className="text-[10px]" style={{ color: card.rarity.color }}>
                  {card.rarity.name}
                  {card.power && <span className="text-zinc-400"> · {card.power.name}</span>}
                </span>
                <span className="text-[11px] text-zinc-300">
                  {top.map(([code, value]) => `${code} ${value}`).join(" · ")}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="fixed inset-x-0 bottom-0 border-t border-white/10 bg-zinc-950/95 px-5 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3">
        <button
          type="button"
          onClick={start}
          disabled={selected.length < size || starting}
          className="w-full rounded-full bg-amber-400 px-5 py-3 font-bold text-zinc-950 disabled:bg-white/10 disabled:text-zinc-500"
        >
          {starting ? "Preparazione…" : selected.length < size ? `Scegli ancora ${size - selected.length}` : startLabel}
        </button>
      </div>
    </div>
  );
}
