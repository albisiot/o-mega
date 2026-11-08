"use client";

import { useMemo, useState } from "react";
import { Silhouette } from "@/components/card-view";
import { InfoTip } from "@/components/info-tip";
import { balance } from "@/config/balance";
import { artSrcSet } from "@/lib/art";
import { withBasePath } from "@/lib/base-path";
import type { CatalogCard } from "@/lib/collection";
import { describeServerError } from "@/lib/errors";
import { deleteFormation, saveFormation, switchableVariants, type Formation, type VariantCopy } from "@/lib/match";
import { rarityFrame, rarityLetter } from "@/lib/rarity-theme";

const LAST_TEAM_KEY = "o-mega.last-team";

function loadLastTeam(key: string, owned: Map<string, string>): string[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
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
  /** Emergenza: a larger squad, which formations (always a match team) cannot hold. */
  squadSize?: number;
  /** The advice on how to choose, behind an "i". */
  intro?: string;
};

/**
 * Pick different characters among the owned ones (a match team by default); load or save formations.
 * It fills the screen: the squad and the start button stay put while the cards scroll between them.
 */
export function TeamPicker(props: TeamPickerProps) {
  const { catalog, owned, conquerable, atRiskCopies, variantCopies, instanceDefinitions, formations, onFormationsChanged, startLabel, starting, onStart, squadSize, intro } = props;
  const size = squadSize ?? balance.match.teamSize;
  const lastTeamKey = squadSize ? `${LAST_TEAM_KEY}.${squadSize}` : LAST_TEAM_KEY;
  const [selected, setSelected] = useState<string[]>(() => loadLastTeam(lastTeamKey, owned).slice(0, size));
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  // The squad slot whose choices (Conquest stake, artwork variant) are open: a definition id.
  const [optionsOf, setOptionsOf] = useState<string | null>(null);

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
  // The variants the player can switch to, one per style; none of the default copy's own style.
  const variantOptions = (definitionId: string) => switchableVariants(variantCopies.get(definitionId), owned.get(definitionId));
  // The style of the variant copy the player chose to field, if any.
  const chosenStyle = (definitionId: string) => {
    const id = variantChoice.get(definitionId);
    return id ? variantCopies.get(definitionId)?.find((copy) => copy.id === id)?.name : undefined;
  };

  // Conquest: field the pack copy of a character also owned as starter, or back.
  const canStake = (definitionId: string) => Boolean(atRiskCopies?.has(definitionId)) && !variantChoice.has(definitionId);

  function toggleStake(definitionId: string) {
    setStaked((current) => {
      const next = new Set(current);
      if (!next.delete(definitionId)) next.add(definitionId);
      return next;
    });
  }

  // Field this variant instead of the default copy or of another variant, or go back to the default copy.
  function toggleVariant(definitionId: string, copy: VariantCopy) {
    const fielded = chosenStyle(definitionId) === copy.name;
    setVariantChoice((current) => {
      const next = new Map(current);
      if (fielded) next.delete(definitionId);
      else next.set(definitionId, copy.id);
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
      localStorage.setItem(lastTeamKey, JSON.stringify(selected));
    } catch {
      // Remembering the team is a convenience only.
    }
    onStart(instanceIds);
  }

  const optionsCard = optionsOf ? byId.get(optionsOf) : null;
  const optionsVariants = optionsOf ? variantOptions(optionsOf) : [];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* The squad. A slot with choices (Conquest stake, artwork variant) opens them; otherwise a tap removes the card. */}
      <section className={`grid gap-1.5 ${squadSize ? "grid-cols-4" : "grid-cols-5"}`}>
        {Array.from({ length: size }, (_, i) => {
          const card = selected[i] ? byId.get(selected[i]) : null;
          const height = squadSize ? "h-14" : "h-[72px]";
          if (!card) {
            return (
              <div
                key={i}
                aria-label={`Posto ${i + 1} libero`}
                className={`flex ${height} -skew-x-8 items-center justify-center border-2 border-dashed border-line bg-panel font-display text-xl text-faint`}
              >
                {i + 1}
              </div>
            );
          }
          const hasOptions = canStake(card.id) || variantOptions(card.id).length > 0;
          const mark = variantChoice.has(card.id) ? "★" : staked.has(card.id) ? "Palio" : hasOptions ? "⋯" : null;
          return (
            <button
              key={i}
              type="button"
              onClick={() => (hasOptions ? setOptionsOf(card.id) : toggle(card.id))}
              aria-label={hasOptions ? `${card.name}: scelte` : `Togli ${card.name}`}
              className={`relative ${height} min-w-0 -skew-x-8 overflow-hidden border-2 bg-panel-raised`}
              style={{ borderColor: card.rarity.color }}
            >
              {card.art_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={withBasePath(card.art_url)}
                  srcSet={artSrcSet(card.art_url)}
                  sizes={squadSize ? "calc((100vw - 58px) / 4)" : "calc((100vw - 68px) / 5)"}
                  alt=""
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover object-top"
                />
              )}
              <span className="absolute left-1 top-0.5 bg-comic-yellow px-1 font-display text-[13px] leading-4 text-black">{i + 1}</span>
              {mark && (
                <span
                  className={`absolute right-1 top-0.5 px-1 text-[9px] font-extrabold uppercase leading-[13px] ${
                    mark === "⋯" ? "bg-black text-foreground" : "bg-comic-magenta text-black"
                  }`}
                >
                  {mark}
                </span>
              )}
              <span className="absolute inset-x-0 bottom-0 truncate bg-black/75 px-0.5 text-center font-display text-[10.5px] uppercase leading-[15px]">
                {card.name}
              </span>
            </button>
          );
        })}
      </section>

      {conquerable && (
        <section className="mt-2 flex flex-col gap-0.5 bg-comic-magenta px-3 py-1.5 text-xs font-semibold text-black">
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

      <div className="relative mt-2.5 flex min-h-11 items-center gap-2">
        <h2 className="section-title text-base leading-5">Le tue carte · {cards.length}</h2>
        {intro && <InfoTip text={intro} />}
        {!squadSize && (
          <button
            type="button"
            onClick={() => setMenuOpen((shown) => !shown)}
            aria-expanded={menuOpen}
            className="btn btn-ghost ml-auto min-h-11 gap-1.5 px-3 text-[13px]"
          >
            Formazioni
            <svg viewBox="0 0 10 7" className="h-[7px] w-2.5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path d="M1 1l4 4 4-4" />
            </svg>
          </button>
        )}
        {menuOpen && (
          <>
            <button type="button" aria-label="Chiudi" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-20 cursor-default" />
            <div className="absolute right-0 top-full z-30 mt-1 flex w-72 max-w-full flex-col gap-1.5 border-2 border-foreground bg-panel p-2 shadow-[5px_5px_0_#000]">
              {formations.length === 0 ? (
                <p className="px-1 text-sm font-medium text-muted">Nessuna formazione salvata.</p>
              ) : (
                formations.map((formation) => (
                  <span key={formation.id} className="flex items-center bg-panel-raised">
                    <button
                      type="button"
                      onClick={() => {
                        loadFormation(formation);
                        setMenuOpen(false);
                      }}
                      className="min-h-11 min-w-0 flex-1 truncate px-3 text-left text-sm font-bold"
                    >
                      {formation.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(formation)}
                      aria-label={`Elimina ${formation.name}`}
                      className="min-h-11 px-3 text-sm font-bold text-muted"
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
              {naming ? (
                <div className="flex gap-1.5">
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={30}
                    placeholder="Nome della formazione"
                    className="input-comic min-w-0 flex-1"
                  />
                  <button type="button" onClick={save} disabled={!name.trim()} className="btn btn-outline px-3">
                    Salva
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={selected.length < size || formations.length >= balance.formations.maxPerPlayer}
                  onClick={() => setNaming(true)}
                  className="min-h-11 border-2 border-dashed border-line px-3 text-left text-sm font-bold text-comic-yellow disabled:text-faint"
                >
                  + Salva questa squadra
                </button>
              )}
              {message && (
                <p className={`text-xs font-semibold ${message.isError ? "text-comic-magenta" : "text-comic-cyan"}`}>{message.text}</p>
              )}
            </div>
          </>
        )}
      </div>
      {message && !menuOpen && (
        <p className={`text-xs font-semibold ${message.isError ? "text-comic-magenta" : "text-comic-cyan"}`}>{message.text}</p>
      )}

      {/* Only the cards scroll; the fade at the bottom says there are more. */}
      <div className="relative mt-1 min-h-0 flex-1">
        <ul className="absolute inset-0 grid grid-cols-3 content-start gap-x-1.5 gap-y-2 overflow-y-auto overscroll-contain pb-8 pr-1 pt-1">
          {cards.map((card) => {
            const position = selected.indexOf(card.id);
            const top = Object.entries(card.stats)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3);
            return (
              <li key={card.id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => toggle(card.id)}
                  aria-pressed={position >= 0}
                  className={`relative flex w-full flex-col border-[3px] bg-panel text-left ${
                    position >= 0 ? "shadow-[4px_4px_0_var(--comic-magenta)]" : ""
                  }`}
                  style={{ borderColor: position >= 0 ? "var(--comic-yellow)" : card.rarity.color }}
                >
                  <span className="relative block aspect-square bg-panel-raised">
                    {card.art_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={withBasePath(card.art_url)}
                        srcSet={artSrcSet(card.art_url)}
                        // Three tiles per row inside the page padding and the gaps, minus each tile's 3px frame.
                        sizes="calc((100vw - 58px) / 3)"
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 h-full w-full object-cover object-top"
                      />
                    ) : (
                      <Silhouette
                        faction={card.faction}
                        accent={card.rarity.color}
                        className="absolute bottom-0 left-1/2 h-[90%] -translate-x-1/2"
                      />
                    )}
                    <span
                      aria-hidden
                      className="absolute left-0.5 top-0.5 flex h-4 w-4 items-center justify-center text-[11px] font-black text-black"
                      style={{ background: rarityFrame(card.rarity) }}
                    >
                      {rarityLetter(card.rarity)}
                    </span>
                    {position >= 0 && (
                      <span className="absolute right-0.5 top-0.5 flex h-6 w-6 -skew-x-8 items-center justify-center bg-comic-yellow font-display text-sm text-black">
                        {position + 1}
                      </span>
                    )}
                  </span>
                  <span className="truncate px-1.5 pt-1 font-display text-[13px] uppercase leading-4">{card.name}</span>
                  <span className="truncate px-1.5 text-[10px] font-bold leading-[13px]" style={{ color: card.rarity.color }}>
                    {card.rarity.name}
                    {card.power && <span className="text-muted"> · {card.power.name}</span>}
                  </span>
                  {conquerable && (
                    <span
                      className={`px-1.5 text-[10px] font-bold leading-[13px] ${
                        isAtRisk(card.id) ? "text-comic-magenta" : "text-comic-cyan"
                      }`}
                    >
                      {isAtRisk(card.id) ? "In palio" : "Protetta"}
                    </span>
                  )}
                  <span className="truncate px-1.5 pb-1 text-[10px] font-medium leading-[13px] text-muted">
                    {top.map(([code, value]) => `${code} ${value}`).join(" · ")}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-8 [background:linear-gradient(to_top,var(--background),transparent)]" />
      </div>

      <div className="-mx-3 border-t-[3px] border-foreground bg-black px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3">
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

      {optionsCard && (
        <>
          <button type="button" aria-label="Chiudi" onClick={() => setOptionsOf(null)} className="fixed inset-0 z-30 bg-black/60" />
          <div
            role="dialog"
            aria-label={optionsCard.name}
            className="fixed inset-x-0 bottom-0 z-40 flex flex-col gap-2 border-t-[3px] border-foreground bg-panel px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3"
          >
            <p className="font-display text-xl uppercase">{optionsCard.name}</p>
            {canStake(optionsCard.id) && (
              <button
                type="button"
                onClick={() => toggleStake(optionsCard.id)}
                aria-pressed={staked.has(optionsCard.id)}
                className={`min-h-11 border-2 px-3 text-left text-sm font-bold ${
                  staked.has(optionsCard.id) ? "border-comic-magenta bg-comic-magenta text-black" : "border-line bg-panel-raised"
                }`}
              >
                {staked.has(optionsCard.id) ? "Doppione in palio: usa la copia starter" : "Metti in palio il doppione"}
              </button>
            )}
            {optionsVariants.map((copy) => {
              const fielded = chosenStyle(optionsCard.id) === copy.name;
              return (
                <button
                  key={copy.id}
                  type="button"
                  onClick={() => toggleVariant(optionsCard.id, copy)}
                  aria-pressed={fielded}
                  className={`min-h-11 border-2 px-3 text-left text-sm font-bold ${
                    fielded ? "border-comic-magenta bg-comic-magenta text-black" : "border-line bg-panel-raised"
                  }`}
                >
                  {fielded
                    ? `★ Variante ${copy.name} schierata${conquerable ? ": puoi perderla" : ""}`
                    : `★ Schiera la variante ${copy.name}`}
                </button>
              );
            })}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  toggle(optionsCard.id);
                  setOptionsOf(null);
                }}
                className="btn btn-ghost flex-1"
              >
                Togli dalla squadra
              </button>
              <button type="button" onClick={() => setOptionsOf(null)} className="btn btn-outline px-5">
                Fatto
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
