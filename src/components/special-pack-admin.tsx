"use client";

import { useState, type FormEvent } from "react";
import { CardSortToggle } from "@/components/card-sort-toggle";
import { BackLink, PackArt, TabBar } from "@/components/comic-parts";
import { TraitFilter } from "@/components/trait-filter";
import { thumbArtUrl } from "@/lib/art";
import { withBasePath } from "@/lib/base-path";
import { searchCards, sortCards, type CardOrder } from "@/lib/card-sort";
import { describeServerError } from "@/lib/errors";
import { formatRomeDateTime } from "@/lib/events";
import { PACK_COLOR_KEYS, PACK_COLORS, packColor } from "@/lib/pack-colors";
import {
  FULL,
  chosenCards,
  deleteSpecialPack,
  draftFromPack,
  draftProblem,
  draftRarities,
  emptyDraft,
  formatHundredths,
  oddsTotal,
  realOdds,
  saveSpecialPack,
  setSpecialPackActive,
  specialPackState,
  splitEvenly,
  type AdminPackCard,
  type AdminSpecialPack,
  type AdminSpecialPacks,
  type SpecialPackDraft,
} from "@/lib/special-pack-admin";
import { matchesTraits } from "@/lib/traits";
import { useLockedScreen } from "@/lib/use-locked-screen";
import { useNow } from "@/lib/use-now";

const INPUT = "min-h-12 w-full min-w-0 max-w-full border-2 border-comic-yellow bg-black px-3 text-base font-semibold";
const SMALL_INPUT = "min-h-11 w-full min-w-0 border-2 border-comic-yellow bg-black px-2 text-center text-base font-semibold";
const DATE_INPUT = `${INPUT} appearance-none [&::-webkit-date-and-time-value]:text-left`;
const LABEL = "flex min-w-0 flex-col gap-1 text-sm font-bold";
const CHIP = "flex min-h-11 shrink-0 items-center gap-1.5 border-2 px-3 text-sm font-bold";

const percent = new Intl.NumberFormat("it-IT", { style: "percent", maximumFractionDigits: 2 });

type SpecialPackAdminProps = {
  data: AdminSpecialPacks;
  onChange: (next: AdminSpecialPacks) => void;
};

/**
 * Creates and changes the special packs sold in the shop. The page fits the phone and never scrolls
 * (see .game-shell): the list and the form are two tabs, the form has three steps, and only the
 * content of a step scrolls, inside its panel.
 */
export function SpecialPackAdmin({ data, onChange }: SpecialPackAdminProps) {
  useLockedScreen(true);
  const [tab, setTab] = useState<"list" | "form">(data.packs.length === 0 ? "form" : "list");
  const [draft, setDraft] = useState<SpecialPackDraft>(emptyDraft);
  const [notice, setNotice] = useState<string | null>(null);

  function edit(next: SpecialPackDraft) {
    setDraft(next);
    setNotice(null);
    setTab("form");
  }

  return (
    <div className="game-shell">
      <header className="flex shrink-0 items-center gap-2.5 px-3 pb-1 pt-2">
        <BackLink href="/editor" label="Torna all'Editor" />
        <h1 className="truncate font-display text-[30px] uppercase leading-10 text-comic-yellow">Pacchetti speciali</h1>
      </header>
      <main className="flex min-h-0 flex-1 flex-col gap-2 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-1">
        <TabBar
          tabs={[
            { key: "list", label: `Pacchetti (${data.packs.length})` },
            { key: "form", label: draft.id ? "Modifica" : "Nuovo" },
          ]}
          current={tab}
          onPick={(next) => {
            setTab(next);
            setNotice(null);
          }}
          label="Gestione pacchetti speciali"
        />
        <div aria-live="polite" className="shrink-0 empty:hidden">
          {notice && <p className="bg-panel px-3 py-2 text-sm font-bold">{notice}</p>}
        </div>
        {tab === "form" ? (
          <PackForm
            key={draft.id ?? "new"}
            data={data}
            draft={draft}
            onDraft={setDraft}
            onCancel={() => {
              setDraft(emptyDraft());
              setTab("list");
            }}
            onSaved={(next, name) => {
              onChange(next);
              setDraft(emptyDraft());
              setNotice(`Pacchetto ${name} salvato.`);
              setTab("list");
            }}
          />
        ) : (
          <div role="tabpanel" className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
            {data.packs.length === 0 ? (
              <p className="text-sm font-medium text-muted">Nessun pacchetto speciale ancora.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {data.packs.map((pack) => (
                  <PackRow
                    key={pack.id}
                    pack={pack}
                    data={data}
                    onChange={onChange}
                    onEdit={() => edit(draftFromPack(pack))}
                    onCopy={() => edit(draftFromPack(pack, true))}
                  />
                ))}
              </ul>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

function PackRow({
  pack,
  data,
  onChange,
  onEdit,
  onCopy,
}: {
  pack: AdminSpecialPack;
  data: AdminSpecialPacks;
  onChange: SpecialPackAdminProps["onChange"];
  onEdit: () => void;
  onCopy: () => void;
}) {
  const now = useNow(60_000);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const state = specialPackState(pack, now);
  const guarantee = data.rarities.find((rarity) => rarity.rank === pack.guaranteed_min_rarity_rank);
  const dates = [
    pack.starts_at && `dal ${formatRomeDateTime(pack.starts_at)}`,
    pack.ends_at && `al ${formatRomeDateTime(pack.ends_at)}`,
  ].filter(Boolean);

  async function run(action: () => Promise<AdminSpecialPacks>) {
    setBusy(true);
    setError(null);
    try {
      onChange(await action());
    } catch (cause) {
      setError(describeServerError(cause));
      setBusy(false);
    }
  }

  return (
    <li className="flex flex-col gap-0.5 bg-panel py-2 pl-3 pr-2">
      <div className="flex items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-2">
          <span aria-hidden className="h-4 w-4 shrink-0" style={{ background: packColor(pack.color).background }} />
          <span className="truncate font-display text-xl leading-6">{pack.name}</span>
        </p>
        <span className={`shrink-0 pr-1.5 text-xs font-bold uppercase ${state === "In vendita" ? "text-comic-cyan" : "text-muted"}`}>
          {state}
        </span>
      </div>
      <p className="text-sm font-semibold leading-5">
        {pack.price} monete · {pack.cards_per_pack} {pack.cards_per_pack === 1 ? "carta" : "carte"} su {pack.cards.length}{" "}
        {pack.cards.length === 1 ? "personaggio" : "personaggi"}
        {guarantee && ` · almeno una ${guarantee.name}`}
      </p>
      <p className="text-xs font-medium leading-4 text-muted">
        {pack.odds_mode === "rarity" ? "Probabilità per rarità" : "Probabilità per carta"} · varianti{" "}
        {pack.variant_chance_percent}% · aperto {pack.openings} {pack.openings === 1 ? "volta" : "volte"}
        {dates.length > 0 && ` · ${dates.join(" ")}`}
      </p>
      <div className="flex flex-wrap items-center justify-end gap-x-1">
        {confirmDelete ? (
          <>
            <span className="text-sm font-bold text-comic-magenta">Eliminarlo per sempre?</span>
            <button
              type="button"
              onClick={() => run(() => deleteSpecialPack(pack.id))}
              disabled={busy}
              className="flex min-h-11 items-center px-1.5 text-sm font-bold text-comic-magenta underline disabled:opacity-60"
            >
              Elimina
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="flex min-h-11 items-center px-1.5 text-sm font-bold underline"
            >
              No
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={onEdit} className="flex min-h-11 items-center px-1.5 text-sm font-bold underline">
              Modifica
            </button>
            <button type="button" onClick={onCopy} className="flex min-h-11 items-center px-1.5 text-sm font-bold underline">
              Duplica
            </button>
            <button
              type="button"
              onClick={() => run(() => setSpecialPackActive(pack.id, !pack.is_active))}
              disabled={busy}
              className="flex min-h-11 items-center px-1.5 text-sm font-bold underline disabled:opacity-60"
            >
              {pack.is_active ? "Disattiva" : "Riattiva"}
            </button>
            {/* An opened pack stays, so players can always see where their cards came from. */}
            {pack.openings === 0 && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="flex min-h-11 items-center px-1.5 text-sm font-bold underline"
              >
                Elimina
              </button>
            )}
          </>
        )}
      </div>
      {error && <p className="text-sm font-bold text-comic-magenta">{error}</p>}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Form
// ---------------------------------------------------------------------------

const STEPS = [
  { key: "details", label: "Dati" },
  { key: "cards", label: "Carte" },
  { key: "odds", label: "Probabilità" },
] as const;
type Step = (typeof STEPS)[number]["key"];

type PackFormProps = {
  data: AdminSpecialPacks;
  draft: SpecialPackDraft;
  onDraft: (next: SpecialPackDraft) => void;
  onCancel: () => void;
  onSaved: (next: AdminSpecialPacks, name: string) => void;
};

/** The pack in three steps, one at a time, with the total and the save button always at the bottom. */
function PackForm({ data, draft, onDraft, onCancel, onSaved }: PackFormProps) {
  const now = useNow(60_000);
  const [step, setStep] = useState<Step>("details");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const update = (changes: Partial<SpecialPackDraft>) => onDraft({ ...draft, ...changes });
  const problem = draftProblem(draft, data, now);
  const chosenCount = chosenCards(draft, data.cards).length;
  const { total } = oddsTotal(draft, data);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (problem) return;
    setSaving(true);
    setError(null);
    try {
      onSaved(await saveSpecialPack(draft, data), draft.name.trim());
    } catch (cause) {
      setError(describeServerError(cause));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col gap-2">
      <div role="tablist" aria-label="Parti del pacchetto" className="grid shrink-0 grid-cols-3 gap-1">
        {STEPS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            role="tab"
            aria-selected={step === entry.key}
            onClick={() => setStep(entry.key)}
            className={`min-h-11 border-2 text-sm font-extrabold uppercase ${
              step === entry.key ? "border-comic-yellow bg-comic-yellow text-black" : "border-line text-foreground"
            }`}
          >
            {entry.label}
            {entry.key === "cards" && chosenCount > 0 && ` (${chosenCount})`}
          </button>
        ))}
      </div>

      {step === "details" && <DetailsStep data={data} draft={draft} update={update} />}
      {step === "cards" && <CardsStep data={data} draft={draft} update={update} />}
      {step === "odds" && <OddsStep data={data} draft={draft} update={update} />}

      <div className="flex shrink-0 flex-col gap-1.5">
        <div aria-live="polite" className="flex flex-col gap-0.5">
          {chosenCount > 0 && (
            <p className={`text-sm font-bold ${total === FULL ? "text-comic-cyan" : "text-comic-magenta"}`}>
              Totale probabilità: {formatHundredths(total)}%
              {total < FULL && ` · mancano ${formatHundredths(FULL - total)}%`}
              {total > FULL && ` · ${formatHundredths(total - FULL)}% di troppo`}
            </p>
          )}
          {(error ?? problem) && (
            <p className={`text-sm font-semibold leading-5 ${error ? "font-bold text-comic-magenta" : "text-muted"}`}>
              {error ?? problem}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {draft.id && (
            <button type="button" onClick={onCancel} className="btn btn-ghost">
              Annulla
            </button>
          )}
          <button type="submit" disabled={saving || problem !== null} className="btn btn-primary flex-1 disabled:opacity-60">
            {saving ? "Salvataggio…" : draft.id ? "Salva le modifiche" : "Crea il pacchetto"}
          </button>
        </div>
      </div>
    </form>
  );
}

type StepProps = {
  data: AdminSpecialPacks;
  draft: SpecialPackDraft;
  update: (changes: Partial<SpecialPackDraft>) => void;
};

function DetailsStep({ data, draft, update }: StepProps) {
  const colors = packColor(draft.color);
  return (
    // What a short window cannot fit scrolls inside, rather than being cut.
    <div role="tabpanel" className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto overscroll-contain">
      <div className="flex items-end gap-2">
        <label className={`${LABEL} flex-1`}>
          Nome
          <input
            value={draft.name}
            onChange={(event) => update({ name: event.target.value })}
            placeholder="Notte di Megara"
            maxLength={40}
            className={`${INPUT} placeholder:text-faint`}
          />
        </label>
        <PackArt body={colors.body} omega={colors.omega} className="h-16 shrink-0" cards={1} />
      </div>
      <label className={LABEL}>
        Descrizione
        <input
          value={draft.description}
          onChange={(event) => update({ description: event.target.value })}
          placeholder="Facoltativa: la vedono i giocatori nel Negozio"
          maxLength={200}
          className={`${INPUT} placeholder:text-faint`}
        />
      </label>
      <div className={LABEL}>
        <span id="pack-color-label">Colore</span>
        <div role="group" aria-labelledby="pack-color-label" className="grid grid-cols-6 gap-1.5">
          {PACK_COLOR_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => update({ color: key })}
              aria-pressed={draft.color === key}
              aria-label={PACK_COLORS[key].name}
              className={`h-11 border-[3px] ${draft.color === key ? "border-white" : "border-transparent"}`}
              style={{ background: PACK_COLORS[key].background }}
            />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <label className={LABEL}>
          Prezzo
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={draft.price}
            onChange={(event) => update({ price: event.target.value })}
            className={SMALL_INPUT}
          />
        </label>
        <label className={LABEL}>
          Carte
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={data.max_cards_per_pack}
            value={draft.cardsPerPack}
            onChange={(event) => update({ cardsPerPack: event.target.value })}
            className={SMALL_INPUT}
          />
        </label>
        <label className={LABEL}>
          Varianti %
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            value={draft.variantChance}
            onChange={(event) => update({ variantChance: event.target.value })}
            className={SMALL_INPUT}
          />
        </label>
      </div>
      <label className={LABEL}>
        Carta garantita
        <select
          value={draft.guarantee ?? ""}
          onChange={(event) => update({ guarantee: event.target.value === "" ? null : Number(event.target.value) })}
          className={INPUT}
        >
          <option value="">Nessuna</option>
          {data.rarities.slice(1).map((rarity) => (
            <option key={rarity.code} value={rarity.rank}>
              Almeno una {rarity.name} o più rara
            </option>
          ))}
        </select>
      </label>
      <label className={LABEL}>
        In vendita dal
        <input
          type="datetime-local"
          value={draft.startsAt}
          onChange={(event) => update({ startsAt: event.target.value })}
          className={DATE_INPUT}
        />
      </label>
      <label className={LABEL}>
        Fino al
        <input
          type="datetime-local"
          value={draft.endsAt}
          onChange={(event) => update({ endsAt: event.target.value })}
          className={DATE_INPUT}
        />
      </label>
      <p className="text-xs font-medium leading-4 text-muted">
        Prezzo in monete. Orari in ora italiana; senza date il pacchetto è in vendita da subito e non scade. Varianti: la
        probabilità che una carta con un disegno speciale esca con quel disegno (0 = mai).
      </p>
    </div>
  );
}

function CardsStep({ data, draft, update }: StepProps) {
  const [query, setQuery] = useState("");
  const [order, setOrder] = useState<CardOrder>("name");
  const [rarityFilter, setRarityFilter] = useState<string | null>(null);
  const [traits, setTraits] = useState<string[]>([]);
  const catalog = data.trait_catalog ?? [];
  const chosen = new Set(draft.cardCodes);
  const found = sortCards(searchCards(data.cards, query), order).filter(
    (card) =>
      (rarityFilter === null || card.rarity_code === rarityFilter) && matchesTraits(card.traits ?? [], traits, catalog),
  );
  const rarityColor = new Map(data.rarities.map((rarity) => [rarity.code, rarity.color]));
  const rarityName = new Map(data.rarities.map((rarity) => [rarity.code, rarity.name]));

  function set(codes: string[], on: boolean) {
    const next = new Set(draft.cardCodes);
    for (const code of codes) {
      if (on) next.add(code);
      else next.delete(code);
    }
    // Kept in catalog order, so the odds step lists them least rare first.
    update({ cardCodes: data.cards.filter((card) => next.has(card.code)).map((card) => card.code) });
  }

  return (
    <div role="tabpanel" className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex shrink-0 gap-2">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cerca nome o numero"
          aria-label="Cerca una carta"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className="input-comic min-w-0 flex-1 placeholder:text-faint"
        />
        <CardSortToggle order={order} onChange={setOrder} />
      </div>
      <div className="-mx-3 flex shrink-0 gap-1.5 overflow-x-auto px-3 pb-1" role="group" aria-label="Filtra per rarità">
        <button
          type="button"
          onClick={() => setRarityFilter(null)}
          aria-pressed={rarityFilter === null}
          className={`${CHIP} ${rarityFilter === null ? "border-comic-yellow text-comic-yellow" : "border-line"}`}
        >
          Tutte
          <span className="text-xs font-semibold text-muted">{chosen.size}</span>
        </button>
        {data.rarities.map((rarity) => {
          const ofRarity = data.cards.filter((card) => card.rarity_code === rarity.code);
          if (ofRarity.length === 0) return null;
          const active = rarityFilter === rarity.code;
          return (
            <button
              key={rarity.code}
              type="button"
              onClick={() => setRarityFilter(active ? null : rarity.code)}
              aria-pressed={active}
              className={CHIP}
              style={{ borderColor: active ? rarity.color : "var(--line)", color: active ? rarity.color : undefined }}
            >
              {rarity.name}
              <span className="text-xs font-semibold text-muted">
                {ofRarity.filter((card) => chosen.has(card.code)).length}/{ofRarity.length}
              </span>
            </button>
          );
        })}
      </div>
      {catalog.length > 0 && (
        <TraitFilter catalog={catalog} chosen={traits} onChange={setTraits} layout="row" label="Filtra per tratto" />
      )}
      <div className="grid shrink-0 grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => set(found.map((card) => card.code), true)}
          disabled={found.every((card) => chosen.has(card.code))}
          className="btn btn-ghost disabled:opacity-50"
        >
          Aggiungi trovate
        </button>
        <button
          type="button"
          onClick={() => set(found.map((card) => card.code), false)}
          disabled={found.every((card) => !chosen.has(card.code))}
          className="btn btn-ghost disabled:opacity-50"
        >
          Togli trovate
        </button>
      </div>
      {/* The list is longer than any screen: it scrolls inside, the page stays still. */}
      <ul className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain">
        {found.length === 0 && <li className="text-sm font-medium text-muted">Nessuna carta trovata.</li>}
        {found.map((card) => (
          <li key={card.code}>
            <label className={`flex min-h-14 items-center gap-3 bg-panel py-1 pl-1 pr-3 ${chosen.has(card.code) ? "" : "opacity-60"}`}>
              <CardThumb card={card} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-bold">{card.name}</span>
                <span className="text-xs font-semibold text-muted">
                  {card.code} ·{" "}
                  <span style={{ color: rarityColor.get(card.rarity_code) }}>{rarityName.get(card.rarity_code)}</span>
                  {card.has_variants && " · con varianti"}
                </span>
              </span>
              <input
                type="checkbox"
                checked={chosen.has(card.code)}
                onChange={(event) => set([card.code], event.target.checked)}
                aria-label={`${card.name} nel pacchetto`}
                className="h-6 w-6 shrink-0 accent-comic-yellow"
              />
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

function OddsStep({ data, draft, update }: StepProps) {
  const chosen = chosenCards(draft, data.cards);
  const rarities = draftRarities(draft, data);
  const odds = realOdds(draft, data);
  const rarityOf = new Map(data.rarities.map((rarity) => [rarity.code, rarity]));
  const byRarity = [...chosen].sort(
    (a, b) => (rarityOf.get(a.rarity_code)?.rank ?? 0) - (rarityOf.get(b.rarity_code)?.rank ?? 0),
  );

  function splitEqually() {
    if (draft.mode === "rarity") {
      const parts = splitEvenly(rarities.length);
      update({
        rarityPercents: {
          ...draft.rarityPercents,
          ...Object.fromEntries(rarities.map((rarity, index) => [rarity.code, formatHundredths(parts[index])])),
        },
      });
    } else {
      const parts = splitEvenly(chosen.length);
      update({
        cardPercents: {
          ...draft.cardPercents,
          ...Object.fromEntries(chosen.map((card, index) => [card.code, formatHundredths(parts[index])])),
        },
      });
    }
  }

  if (chosen.length === 0) {
    return (
      <div role="tabpanel" className="flex min-h-0 flex-1 flex-col">
        <p className="text-sm font-medium text-muted">Scegli prima le carte del pacchetto, nella scheda Carte.</p>
      </div>
    );
  }

  return (
    <div role="tabpanel" className="flex min-h-0 flex-1 flex-col gap-2">
      <div role="group" aria-label="Come dare le probabilità" className="grid shrink-0 grid-cols-2 gap-1">
        {(
          [
            { mode: "rarity", label: "Per rarità" },
            { mode: "card", label: "Per carta" },
          ] as const
        ).map((option) => (
          <button
            key={option.mode}
            type="button"
            onClick={() => update({ mode: option.mode })}
            aria-pressed={draft.mode === option.mode}
            className={`min-h-11 border-2 text-sm font-bold ${
              draft.mode === option.mode ? "border-comic-cyan bg-comic-cyan text-black" : "border-line"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="flex shrink-0 items-center justify-between gap-2">
        <p className="min-w-0 text-xs font-medium leading-4 text-muted">
          {draft.mode === "rarity"
            ? "Le carte di una rarità si dividono la sua percentuale in parti uguali."
            : "Ogni carta ha la sua percentuale."}{" "}
          Valgono per ogni carta del pacchetto; la carta garantita si pesca tra le rarità richieste.
        </p>
        <button type="button" onClick={splitEqually} className="btn btn-ghost shrink-0 px-3 text-sm">
          Parti uguali
        </button>
      </div>
      {draft.mode === "card" && (
        <ul className="flex shrink-0 gap-1" aria-label="Probabilità per rarità">
          {rarities.map((rarity) => (
            <li key={rarity.code} className="flex min-w-0 flex-1 flex-col items-center bg-panel py-1">
              <span className="max-w-full truncate px-0.5 font-display text-sm uppercase" style={{ color: rarity.color }}>
                {rarity.name}
              </span>
              <span className="font-display text-lg">{percent.format(odds.rarities.get(rarity.code) ?? 0)}</span>
            </li>
          ))}
        </ul>
      )}
      <ul className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain">
        {draft.mode === "rarity"
          ? rarities.map((rarity) => {
              const count = chosen.filter((card) => card.rarity_code === rarity.code).length;
              const perCard = (odds.rarities.get(rarity.code) ?? 0) / count;
              return (
                <li key={rarity.code} className="flex min-h-14 items-center gap-3 bg-panel py-1 pl-3 pr-2">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-display text-lg uppercase leading-5" style={{ color: rarity.color }}>
                      {rarity.name}
                    </span>
                    <span className="text-xs font-semibold text-muted">
                      {count} {count === 1 ? "carta" : "carte"} · {percent.format(perCard)} ciascuna
                    </span>
                  </span>
                  <PercentInput
                    label={`Probabilità ${rarity.name}`}
                    value={draft.rarityPercents[rarity.code] ?? ""}
                    onChange={(value) => update({ rarityPercents: { ...draft.rarityPercents, [rarity.code]: value } })}
                  />
                </li>
              );
            })
          : byRarity.map((card) => {
              const rarity = rarityOf.get(card.rarity_code);
              return (
                <li key={card.code} className="flex min-h-14 items-center gap-3 bg-panel py-1 pl-1 pr-2">
                  <CardThumb card={card} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-bold">{card.name}</span>
                    <span className="text-xs font-semibold" style={{ color: rarity?.color }}>
                      {rarity?.name}
                    </span>
                  </span>
                  <PercentInput
                    label={`Probabilità ${card.name}`}
                    value={draft.cardPercents[card.code] ?? ""}
                    onChange={(value) => update({ cardPercents: { ...draft.cardPercents, [card.code]: value } })}
                  />
                </li>
              );
            })}
      </ul>
    </div>
  );
}

function PercentInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <span className="flex shrink-0 items-center gap-1 font-bold">
      <input
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        placeholder="0"
        maxLength={6}
        className="min-h-11 w-20 border-2 border-comic-yellow bg-black px-2 text-center text-base font-semibold placeholder:text-faint"
      />
      %
    </span>
  );
}

function CardThumb({ card }: { card: Pick<AdminPackCard, "art_url"> }) {
  return (
    <span aria-hidden className="relative h-12 w-9 shrink-0 overflow-hidden bg-panel-raised">
      {card.art_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={withBasePath(thumbArtUrl(card.art_url))}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
      )}
    </span>
  );
}
