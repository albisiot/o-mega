"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Silhouette } from "@/components/card-view";
import { FACTION_LABELS, type AbilityInfo } from "@/lib/catalog";
import {
  convertAllDuplicates,
  type CatalogCard,
  type ConversionResult,
  type OwnedSummary,
} from "@/lib/collection";
import { describeServerError } from "@/lib/errors";

type Ownership = "all" | "owned" | "missing";
type Filters = { ownership: Ownership; rarity: number | null; faction: string | null; sort: string };

const DEFAULT_FILTERS: Filters = { ownership: "all", rarity: null, faction: null, sort: "number" };
const FILTERS_KEY = "o-mega.album-filters";

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
      <header className="flex items-center justify-between px-5 py-4">
        <Link href="/" className="text-sm text-zinc-300">
          ← Home
        </Link>
        <h1 className="text-base font-semibold">Collezione</h1>
        <span className="w-12" />
      </header>

      <main className="flex flex-1 flex-col gap-4 px-4 pb-10">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-baseline justify-between">
            <p className="text-lg font-bold">
              {owned.size}/{catalog.length} personaggi
            </p>
            <p className="text-sm text-zinc-400">{totalCards} carte</p>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-amber-400"
              style={{ width: `${(owned.size / Math.max(catalog.length, 1)) * 100}%` }}
            />
          </div>
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
          {notice && <p className="mt-3 text-sm text-emerald-400">{notice}</p>}
        </section>

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
          <label className="flex items-center gap-2 text-sm text-zinc-400">
            Ordina per
            <select
              value={filters.sort}
              onChange={(event) => update({ sort: event.target.value })}
              // 16px: smaller fonts make iOS Safari zoom in on focus.
              className="flex-1 rounded-lg border border-white/15 bg-zinc-900 px-2 py-1.5 text-base text-zinc-100"
            >
              <option value="number">Numero</option>
              <option value="rarity">Rarità</option>
              <option value="name">Nome</option>
              <option value="copies">Copie</option>
              <optgroup label="Abilità (dalla più alta)">
                {abilities.map((ability) => (
                  <option key={ability.code} value={`ability:${ability.code}`}>
                    {ability.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>
        </section>

        {visible.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500">Nessuna carta con questi filtri.</p>
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
      className="relative flex flex-col gap-1 rounded-xl border-2 bg-zinc-900 p-1.5"
      style={{ borderColor: owned ? `${card.rarity.color}99` : "#ffffff14" }}
    >
      {owned && owned.copies > 1 && (
        <span className="absolute right-1 top-1 z-10 rounded-full bg-zinc-950/80 px-1.5 text-[10px] font-bold">
          ×{owned.copies}
        </span>
      )}
      <div
        className="flex h-16 items-end justify-center rounded-lg"
        style={{
          background: owned ? `radial-gradient(circle at 50% 35%, ${card.rarity.color}55, transparent 70%), #18181b` : "#18181b",
        }}
      >
        <Silhouette color={owned ? card.rarity.color : "#3f3f46"} className="h-14" />
      </div>
      <p className={`truncate text-[11px] font-semibold ${owned ? "" : "text-zinc-600"}`}>
        {owned ? card.name : "???"}
      </p>
      <div className="flex items-center justify-between text-[10px]">
        <span style={{ color: owned ? card.rarity.color : "#52525b" }}>{card.rarity.name}</span>
        {owned && sortAbility ? (
          <span className="font-bold text-amber-300">
            {sortAbility} {card.stats[sortAbility] ?? 0}
          </span>
        ) : (
          <span className="text-zinc-600">N. {number}</span>
        )}
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
    <div className="mt-3 flex flex-col gap-2 border-t border-white/10 pt-3">
      <p className="text-sm text-zinc-300">
        {convertible.copies} {convertible.copies === 1 ? "doppione convertibile" : "doppioni convertibili"} ·{" "}
        <span className="font-semibold text-amber-300">+{convertible.coins} monete</span>
      </p>
      {confirming ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={convert}
            disabled={busy}
            className="flex-1 rounded-full bg-amber-400 px-4 py-2 text-sm font-bold text-zinc-950 disabled:opacity-60"
          >
            {busy ? "Conversione…" : "Conferma"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={busy}
            className="rounded-full border border-white/15 px-4 py-2 text-sm"
          >
            Annulla
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setConfirming(true);
            setError(null);
          }}
          className="rounded-full border border-amber-400/60 px-4 py-2 text-sm font-semibold text-amber-300"
        >
          Converti tutti i doppioni
        </button>
      )}
      {confirming && (
        <p className="text-xs text-zinc-500">
          Tieni sempre almeno una copia di ogni personaggio. La conversione non si può annullare.
        </p>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">{children}</div>;
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
      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition ${
        active ? "border-amber-400 bg-amber-400 text-zinc-950" : "border-white/15 text-zinc-300"
      }`}
      style={!active && color ? { color } : undefined}
    >
      {children}
    </button>
  );
}
