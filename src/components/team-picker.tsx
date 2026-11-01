"use client";

import { useMemo, useState } from "react";
import { balance } from "@/config/balance";
import type { CatalogCard } from "@/lib/collection";
import { describeServerError } from "@/lib/errors";
import { deleteFormation, saveFormation, type Formation, type VariantCopy } from "@/lib/match";

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
  /** Conquest only: characters whose fielded copy can be taken (the rest is protected). */
  conquerable?: Set<string> | null;
  /** Conquest only: for characters also owned as starter, the copy that can be put at stake. */
  atRiskCopies?: Map<string, string> | null;
  /** Copies with an artwork variant: fielded only when the player chooses them. */
  variantCopies: Map<string, VariantCopy[]>;
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
  const { catalog, owned, conquerable, atRiskCopies, variantCopies, instanceDefinitions, formations, onFormationsChanged, startLabel, starting, onStart } = props;
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
  // Characters for which the player fields the pack copy instead of the protected starter one.
  const [staked, setStaked] = useState<Set<string>>(new Set());
  // Characters for which the player fields a copy with an artwork variant: definition id → instance id.
  const [variantChoice, setVariantChoice] = useState<Map<string, string>>(new Map());
  const instanceIds = selected.map(
    (definitionId) =>
      variantChoice.get(definitionId) ??
      (staked.has(definitionId) ? atRiskCopies!.get(definitionId)! : owned.get(definitionId)!),
  );
  const isAtRisk = (definitionId: string) =>
    Boolean(conquerable?.has(definitionId)) || staked.has(definitionId) || variantChoice.has(definitionId);
  // The variant the player can switch to; none when the default copy already is that one.
  const switchableVariant = (definitionId: string) =>
    variantCopies.get(definitionId)?.find((copy) => copy.id !== owned.get(definitionId));

  function toggleVariant(definitionId: string, copy: VariantCopy) {
    setVariantChoice((current) => {
      const next = new Map(current);
      if (!next.delete(definitionId)) next.set(definitionId, copy.id);
      return next;
    });
    setStaked((current) => {
      const next = new Set(current);
      next.delete(definitionId);
      return next;
    });
  }

  // Conquest: what is at risk, and how rare a card this team can take.
  const minConquerable = balance.conquest.minConquerableCards;
  const atRisk = conquerable ? selected.filter(isAtRisk).length : 0;
  const notEnoughAtRisk = Boolean(conquerable) && selected.length === size && atRisk < minConquerable;
  const limit = selected
    .map((id) => byId.get(id)?.rarity)
    .reduce<CatalogCard["rarity"] | undefined>(
      (best, rarity) => (rarity && (!best || rarity.rank > best.rank) ? rarity : best),
      undefined,
    );

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
    setStaked(
      new Set(
        formation.card_instance_ids
          .map((id) => instanceDefinitions.get(id))
          .filter((id): id is string => Boolean(id && atRiskCopies?.get(id) && formation.card_instance_ids.includes(atRiskCopies.get(id)!))),
      ),
    );
    setVariantChoice(
      new Map(
        formation.card_instance_ids.flatMap((id) => {
          const definitionId = instanceDefinitions.get(id);
          const isChosenVariant =
            definitionId && id !== owned.get(definitionId) && variantCopies.get(definitionId)?.some((copy) => copy.id === id);
          return isChosenVariant ? [[definitionId, id] as const] : [];
        }),
      ),
    );
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
              className="flex h-16 min-w-0 flex-1 -skew-x-8 flex-col items-center justify-center border-2 bg-panel px-1 text-center"
              style={{ borderColor: card ? card.rarity.color : "var(--line)", borderStyle: card ? "solid" : "dashed" }}
              aria-label={card ? `Togli ${card.name}` : `Posto ${i + 1} libero`}
            >
              {card ? (
                <span className="line-clamp-2 font-display text-xs uppercase leading-tight">{card.name}</span>
              ) : (
                <span className="font-display text-xl text-faint">{i + 1}</span>
              )}
            </button>
          );
        })}
      </section>

      {conquerable && (
        <section className="flex flex-col gap-1 bg-comic-magenta p-3 text-sm font-semibold text-black">
          <p>
            Carte in palio: <span className="font-extrabold">{atRisk}</span> (minimo {minConquerable}). Se perdi, il
            vincitore può prendertene una. Le starter sono protette.
          </p>
          {limit && (
            <p>
              Se vinci puoi conquistare fino a:{" "}
              <span className="-skew-x-8 bg-black px-1.5 font-display uppercase" style={{ color: limit.color }}>
                {limit.name}
              </span>
            </p>
          )}
        </section>
      )}

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Formazioni</h2>
          {!naming && (
            <button
              type="button"
              disabled={selected.length < size || formations.length >= balance.formations.maxPerPlayer}
              onClick={() => setNaming(true)}
              className="min-h-11 text-sm font-bold text-comic-yellow disabled:text-faint"
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
              className="input-comic min-w-0 flex-1"
            />
            <button type="button" onClick={save} disabled={!name.trim()} className="btn btn-outline">
              Salva
            </button>
            <button type="button" onClick={() => setNaming(false)} className="btn btn-ghost px-3">
              Annulla
            </button>
          </div>
        )}
        {formations.length === 0 ? (
          <p className="text-sm font-medium text-muted">Nessuna formazione salvata.</p>
        ) : (
          <div className="-mx-3 flex gap-1.5 overflow-x-auto px-3 pb-1">
            {formations.map((formation) => (
              <span key={formation.id} className="flex shrink-0 items-center border-2 border-line bg-panel">
                <button type="button" onClick={() => loadFormation(formation)} className="min-h-10 pl-3 pr-1 text-sm font-bold">
                  {formation.name}
                </button>
                <button
                  type="button"
                  onClick={() => remove(formation)}
                  aria-label={`Elimina ${formation.name}`}
                  className="min-h-10 px-2.5 text-sm font-bold text-muted"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        {message && (
          <p className={`text-sm font-semibold ${message.isError ? "text-comic-magenta" : "text-comic-cyan"}`}>{message.text}</p>
        )}
      </section>

      <ul className="grid grid-cols-2 gap-2">
        {cards.map((card) => {
          const position = selected.indexOf(card.id);
          const variant = switchableVariant(card.id);
          const usesVariant = variantChoice.has(card.id);
          const top = Object.entries(card.stats)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);
          return (
            <li key={card.id}>
              <button
                type="button"
                onClick={() => toggle(card.id)}
                className={`relative flex w-full flex-col gap-0.5 border-[3px] bg-panel p-2 text-left ${
                  position >= 0 ? "shadow-[4px_4px_0_var(--comic-magenta)]" : ""
                }`}
                style={{ borderColor: position >= 0 ? "var(--comic-yellow)" : card.rarity.color }}
                aria-pressed={position >= 0}
              >
                {position >= 0 && (
                  <span className="absolute right-1 top-1 flex h-6 w-6 -skew-x-8 items-center justify-center bg-comic-yellow font-display text-sm text-black">
                    {position + 1}
                  </span>
                )}
                <span className="truncate pr-6 font-display text-base uppercase">{card.name}</span>
                <span className="text-xs font-semibold" style={{ color: card.rarity.color }}>
                  {card.rarity.name}
                  {card.power && <span className="text-muted"> · {card.power.name}</span>}
                </span>
                {conquerable && (
                  <span className={`text-xs font-bold ${isAtRisk(card.id) ? "text-comic-magenta" : "text-comic-cyan"}`}>
                    {isAtRisk(card.id) ? "In palio" : "Protetta"}
                  </span>
                )}
                <span className="text-xs font-medium text-muted">
                  {top.map(([code, value]) => `${code} ${value}`).join(" · ")}
                </span>
              </button>
              {atRiskCopies?.has(card.id) && position >= 0 && !usesVariant && (
                <button
                  type="button"
                  onClick={() =>
                    setStaked((current) => {
                      const next = new Set(current);
                      if (!next.delete(card.id)) next.add(card.id);
                      return next;
                    })
                  }
                  className="mt-1 min-h-11 w-full border-2 border-line bg-panel px-2 text-xs font-bold"
                >
                  {staked.has(card.id) ? "Usa la copia starter" : "Metti in palio il doppione"}
                </button>
              )}
              {variant && position >= 0 && (
                <button
                  type="button"
                  onClick={() => toggleVariant(card.id, variant)}
                  aria-pressed={usesVariant}
                  className={`mt-1 min-h-11 w-full border-2 px-2 text-xs font-bold ${
                    usesVariant ? "border-comic-magenta bg-comic-magenta text-black" : "border-line bg-panel"
                  }`}
                >
                  {usesVariant
                    ? `★ Variante ${variant.name} schierata${conquerable ? ": puoi perderla" : ""}`
                    : `★ Schiera la variante ${variant.name}`}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t-[3px] border-foreground bg-black px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3">
        <button
          type="button"
          onClick={start}
          disabled={selected.length < size || starting || notEnoughAtRisk}
          className="btn btn-primary w-full"
        >
          {starting
            ? "Preparazione…"
            : selected.length < size
              ? `Scegli ancora ${size - selected.length}`
              : notEnoughAtRisk
                ? `Servono almeno ${minConquerable} carte in palio`
                : startLabel}
        </button>
      </div>
    </div>
  );
}
