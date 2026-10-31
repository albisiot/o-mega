"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { CardArt, Silhouette } from "@/components/card-view";
import { FACTION_LABELS, type AbilityInfo } from "@/lib/catalog";
import {
  convertAllDuplicates,
  type CatalogCard,
  type ConversionResult,
  type OwnedSummary,
} from "@/lib/collection";
import { describeServerError } from "@/lib/errors";
import { rarityFrame } from "@/lib/rarity-theme";

type Ownership = "all" | "owned" | "missing";
type Filters = { ownership: Ownership; rarity: number | null; faction: string | null; sort: string };

const DEFAULT_FILTERS: Filters = { ownership: "all", rarity: null, faction: null, sort: "number" };
const FILTERS_KEY = "o-mega.album-filters";
const SORT_OPTIONS = [
  { value: "number", label: "Numero" },
  { value: "rarity", label: "Rarità" },
  { value: "name", label: "Nome" },
  { value: "copies", label: "Copie" },
];

function loadFilters(): Filters {
  try {
    const saved = sessionStorage.getItem(FILTERS_KEY);
    return saved ? { ...DEFAULT_FILTERS, ...JSON.parse(saved) } : DEFAULT_FILTERS;
  } catch {
    return DEFAULT_FILTERS;
  }
}

export function Album({
  catalog,
  owned,
  abilities,
  onChanged,
}: {
  catalog: CatalogCard[];
  owned: Map<string, OwnedSummary>;
  abilities: AbilityInfo[];
  onChanged: () => void;
}) {
  const [filters, setFilters] = useState<Filters>(loadFilters);
  // Lives here: the conversion panel disappears once no duplicates are left.
  const [notice, setNotice] = useState<string | null>(null);

  function update(change: Partial<Filters>) {
    const next = { ...filters, ...change };
    setFilters(next);
    try {
      sessionStorage.setItem(FILTERS_KEY, JSON.stringify(next));
    } catch {
      // Filters are a convenience: losing them is fine.
    }
  }

  const sortAbility = filters.sort.startsWith("ability:") ? filters.sort.slice("ability:".length) : null;

  const visible = useMemo(() => {
    const cards = catalog.filter((card) => {
      const isOwned = owned.has(card.id);
      if (filters.ownership === "owned" && !isOwned) return false;
      if (filters.ownership === "missing" && isOwned) return false;
      if (filters.rarity !== null && card.rarity.rank !== filters.rarity) return false;
      if (filters.faction !== null && card.faction !== filters.faction) return false;
      return true;
    });
    const byRarity = (a: CatalogCard, b: CatalogCard) => b.rarity.rank - a.rarity.rank || a.code.localeCompare(b.code);
    const sorters: Record<string, (a: CatalogCard, b: CatalogCard) => number> = {
      number: (a, b) => a.code.localeCompare(b.code),
      rarity: byRarity,
      name: (a, b) => a.name.localeCompare(b.name, "it"),
      copies: (a, b) => (owned.get(b.id)?.copies ?? 0) - (owned.get(a.id)?.copies ?? 0) || byRarity(a, b),
    };
    const sorter = sortAbility
      ? (a: CatalogCard, b: CatalogCard) => (b.stats[sortAbility] ?? 0) - (a.stats[sortAbility] ?? 0) || byRarity(a, b)
      : (sorters[filters.sort] ?? sorters.number);
    return cards.sort(sorter);
  }, [catalog, owned, filters, sortAbility]);

  const rarities = useMemo(
    () => [...new Map(catalog.map((card) => [card.rarity.rank, card.rarity])).values()].sort((a, b) => a.rank - b.rank),
    [catalog],
  );
  const totalCards = [...owned.values()].reduce((sum, entry) => sum + entry.copies, 0);
  const convertible = catalog.reduce(
    (totals, card) => {
      const copies = owned.get(card.id)?.convertible_copies ?? 0;
      return { copies: totals.copies + copies, coins: totals.coins + copies * card.duplicateCoinValue };
    },
    { copies: 0, coins: 0 },
  );

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex flex-1 flex-col gap-3 px-3 pb-6 pt-2">
        <section className="cut-bottom bg-comic-cyan px-3.5 pb-5 pt-2.5 text-black">
          <div className="flex items-baseline justify-between gap-2">
            <h1 className="font-display text-[32px] uppercase leading-10">Collezione</h1>
            <p className="text-right text-sm font-extrabold">
              {owned.size}/{catalog.length} personaggi · {totalCards} carte
            </p>
          </div>
          <div className="mt-1 h-2 bg-black">
            <div
              className="h-full bg-foreground"
              style={{ width: `${(owned.size / Math.max(catalog.length, 1)) * 100}%` }}
            />
          </div>
        </section>

        {convertible.copies > 0 && (
          <ConvertAll
            convertible={convertible}
            onConverted={(result) => {
              setNotice(
                `Convertite ${result.converted} copie: +${result.coins} monete (saldo ${result.coin_balance}).`,
              );
              onChanged();
            }}
          />
        )}
        {notice && <p className="text-sm font-semibold text-comic-cyan">{notice}</p>}

        <section className="flex flex-col gap-2">
          <ChipRow>
            {(["all", "owned", "missing"] as const).map((value) => (
              <Chip key={value} active={filters.ownership === value} onClick={() => update({ ownership: value })}>
                {{ all: "Tutte", owned: "Possedute", missing: "Mancanti" }[value]}
              </Chip>
            ))}
          </ChipRow>
          <ChipRow>
            <Chip active={filters.rarity === null} onClick={() => update({ rarity: null })}>
              Ogni rarità
            </Chip>
            {rarities.map((rarity) => (
              <Chip
                key={rarity.rank}
                active={filters.rarity === rarity.rank}
                color={rarity.color}
                onClick={() => update({ rarity: rarity.rank })}
              >
                {rarity.name}
              </Chip>
            ))}
          </ChipRow>
          <ChipRow>
            <Chip active={filters.faction === null} onClick={() => update({ faction: null })}>
              Ogni fazione
            </Chip>
            {Object.entries(FACTION_LABELS).map(([code, label]) => (
              <Chip key={code} active={filters.faction === code} onClick={() => update({ faction: code })}>
                {label}
              </Chip>
            ))}
          </ChipRow>
          <SortPicker value={filters.sort} abilities={abilities} onChange={(sort) => update({ sort })} />
        </section>

        {visible.length === 0 ? (
          <p className="py-8 text-center text-sm font-semibold text-muted">Nessuna carta con questi filtri.</p>
        ) : (
          <ul className="grid grid-cols-3 gap-2">
            {visible.map((card) => (
              <li key={card.id}>
                <AlbumTile card={card} owned={owned.get(card.id) ?? null} sortAbility={sortAbility} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

/** A bottom sheet in the game's style: a native select opens the system's menu. */
function SortPicker({
  value,
  abilities,
  onChange,
}: {
  value: string;
  abilities: AbilityInfo[];
  onChange: (sort: string) => void;
}) {
  const sheet = useRef<HTMLDialogElement>(null);
  const abilityOptions = abilities.map((ability) => ({ value: `ability:${ability.code}`, label: ability.name }));
  const current = [...SORT_OPTIONS, ...abilityOptions].find((option) => option.value === value) ?? SORT_OPTIONS[0];

  function choose(sort: string) {
    onChange(sort);
    sheet.current?.close();
  }

  const options = (list: { value: string; label: string }[]) => (
    <div className="flex flex-wrap gap-1.5">
      {list.map((option) => (
        <Chip key={option.value} active={option.value === current.value} onClick={() => choose(option.value)}>
          {option.label}
        </Chip>
      ))}
    </div>
  );

  return (
    <div className="flex items-center gap-2 text-sm font-semibold text-muted">
      Ordina per
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => sheet.current?.showModal()}
        className="input-comic flex min-w-0 flex-1 items-center justify-between gap-2 text-left text-foreground"
      >
        <span className="truncate">{current.label}</span>
        <span aria-hidden className="text-comic-yellow">
          ▾
        </span>
      </button>
      <dialog
        ref={sheet}
        aria-label="Ordina per"
        // The sheet's content fills it: a click on the dialog itself is on the backdrop.
        onClick={(event) => {
          if (event.target === sheet.current) sheet.current.close();
        }}
        className="m-0 mt-auto max-h-[80svh] w-full max-w-none border-0 border-t-[3px] border-foreground bg-panel p-0 text-foreground backdrop:bg-black/70"
      >
        <div className="flex flex-col gap-3 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl uppercase text-comic-yellow">Ordina per</h2>
            <button type="button" onClick={() => sheet.current?.close()} className="btn btn-ghost">
              Chiudi
            </button>
          </div>
          {options(SORT_OPTIONS)}
          <h3 className="section-title">Abilità (dalla più alta)</h3>
          {options(abilityOptions)}
        </div>
      </dialog>
    </div>
  );
}

function AlbumTile({
  card,
  owned,
  sortAbility,
}: {
  card: CatalogCard;
  owned: OwnedSummary | null;
  sortAbility: string | null;
}) {
  const number = card.code.replace(/^\D+/, "");
  return (
    <Link
      href={`/carta/?id=${card.id}`}
      className="relative flex flex-col rounded-[7px] p-1"
      style={{ background: owned ? rarityFrame(card.rarity) : "var(--panel-raised)" }}
    >
      {owned && owned.copies > 1 && (
        <span className="absolute right-1.5 top-1.5 z-10 bg-black px-1.5 text-xs font-extrabold leading-[18px] text-comic-yellow">
          ×{owned.copies}
        </span>
      )}
      {owned ? (
        <CardArt rarity={card.rarity} faction={card.faction} artUrl={card.art_url} className="h-24 rounded-t" />
      ) : (
        <div className="relative h-24 overflow-hidden rounded-t bg-panel">
          <Silhouette faction={card.faction} ink="#3a3a45" className="absolute -bottom-1 left-1/2 h-[96%] -translate-x-1/2" />
        </div>
      )}
      <div className="rounded-b bg-panel px-1.5 py-1">
        <p className={`truncate font-display text-sm uppercase ${owned ? "" : "text-faint"}`}>
          {owned ? card.name : "???"}
        </p>
        <div className="flex items-center justify-between gap-1 text-[11px] font-semibold">
          <span style={{ color: card.rarity.color }}>{card.rarity.name}</span>
          {owned && sortAbility ? (
            <span className="font-extrabold text-comic-yellow">
              {sortAbility} {card.stats[sortAbility] ?? 0}
            </span>
          ) : (
            <span className="text-faint">N. {number}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

function ConvertAll({
  convertible,
  onConverted,
}: {
  convertible: { copies: number; coins: number };
  onConverted: (result: ConversionResult) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function convert() {
    setBusy(true);
    try {
      onConverted(await convertAllDuplicates());
    } catch (cause) {
      setError(describeServerError(cause));
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 bg-panel p-3">
      <p className="text-sm font-semibold">
        {convertible.copies} {convertible.copies === 1 ? "doppione convertibile" : "doppioni convertibili"} ·{" "}
        <span className="font-extrabold text-comic-yellow">+{convertible.coins} monete</span>
      </p>
      {confirming ? (
        <>
          <p className="text-sm font-medium text-muted">
            Tieni sempre almeno una copia di ogni personaggio. La conversione non si può annullare.
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={convert} disabled={busy} className="btn btn-primary flex-1 disabled:opacity-60">
              {busy ? "Conversione…" : "Conferma"}
            </button>
            <button type="button" onClick={() => setConfirming(false)} disabled={busy} className="btn btn-ghost">
              Annulla
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={() => {
            setConfirming(true);
            setError(null);
          }}
          className="btn btn-outline"
        >
          Converti tutti i doppioni
        </button>
      )}
      {error &&<p className="text-sm font-semibold text-comic-magenta">{error}</p>}
    </div>
  );
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return <div className="-mx-3 flex gap-1.5 overflow-x-auto px-3 pb-1 [scrollbar-width:none]">{children}</div>;
}

function Chip({
  active,
  color,
  onClick,
  children,
}: {
  active: boolean;
  color?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`btn shrink-0 border-2 px-3 text-sm font-bold ${
        active ? "border-transparent text-black" : "border-line bg-panel"
      }`}
      style={
        active ? { backgroundColor: color ?? "var(--comic-yellow)" } : color ? { color, borderColor: color } : undefined
      }
    >
      {children}
    </button>
  );
}
