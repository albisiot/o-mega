"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { BackLink, TabBar } from "@/components/comic-parts";
import { AdminCardPicker, useAdminCardReference } from "@/components/admin-card-filter";
import { Chip } from "@/components/card-list-controls";
import { RandomVariantsField } from "@/components/random-variants-field";
import { TraitFilter } from "@/components/trait-filter";
import { balance } from "@/config/balance";
import {
  activeAdminFilterCount,
  describeAdminCardFilter,
  FACTION_CODES,
  filterAdminCards,
  toggleValue,
  variantStylesOf,
  withCardFacts,
  type AdminCardFilter,
  type FilterRarity,
  type FilterStyle,
} from "@/lib/admin-card-filter";
import { useBackStep } from "@/lib/back-step";
import { FACTION_LABELS } from "@/lib/catalog";
import {
  DEFAULT_EVENT_POINTS,
  adminEventState,
  deleteEvent,
  saveEvent,
  setEventActive,
  type AdminEvent,
  type AdminEvents,
} from "@/lib/event-admin";
import { describeServerError } from "@/lib/errors";
import {
  EVENT_KINDS,
  addHoursToInput,
  coopEventPoints,
  describeTierReward,
  raidEventPoints,
  formatRomeDateTime,
  toRomeInput,
  type EventPoints,
} from "@/lib/events";
import { describeRandomVariants, ruleInfo, ruleToSend, type RandomVariantsRule } from "@/lib/random-variants";
import { MAX_SHARD_REWARD, shardsInput } from "@/lib/shard-rewards";
import type { TraitCategory } from "@/lib/traits";
import { useLockedScreen } from "@/lib/use-locked-screen";

const INPUT = "min-h-12 w-full min-w-0 max-w-full border-2 border-comic-yellow bg-black px-3 text-base font-semibold";
const SMALL_INPUT = "min-h-11 w-full min-w-0 border-2 border-comic-yellow bg-black px-2 text-center text-base font-semibold";
const LABEL = "flex min-w-0 flex-col gap-1 text-sm font-bold";
/** The server's limit on the cards of one prize tier (admin_save_event). */
const MAX_TIER_CARDS = 10;
// Safari ignores the width of a date field that keeps its native appearance.
const DATE_INPUT = `${INPUT} appearance-none [&::-webkit-date-and-time-value]:text-left`;

const MATCH_KINDS = EVENT_KINDS.filter((kind) => kind.key !== "emergency");
type MatchKind = (typeof MATCH_KINDS)[number]["key"];
const OUTCOMES = [
  { key: "win", label: "Vittoria" },
  { key: "draw", label: "Pareggio" },
  { key: "loss", label: "Sconfitta" },
] as const;

type TierForm = {
  points: string;
  coins: string;
  packs: string;
  shards: string;
  cards: string[];
  random: RandomVariantsRule | null;
};
type PointsForm = Record<MatchKind, Record<"win" | "draw" | "loss", string>> & {
  emergency: { passed: string };
  coop: Record<"win" | "loss" | "passed", string>;
  raid: Record<"win" | "loss" | "passed", string>;
};

type FormState = {
  id?: string;
  /** Started events change only their texts and their end. */
  started: boolean;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  points: PointsForm;
  dailyCap: string;
  /** Quadrante: the seal target; empty: none. */
  sealTarget: string;
  /** "Caccia alle varianti": the variant chance during the event, in %; empty: unchanged. */
  variantChance: string;
  /** Points for each variant in the team, in %; empty: none. */
  variantBonus: string;
  /** Admitted traits, rarity codes and factions; each empty: every character. */
  traits: string[];
  rarities: string[];
  factions: string[];
  tiers: TierForm[];
};

function pointsForm(points: EventPoints): PointsForm {
  const coop = coopEventPoints(points);
  const raid = raidEventPoints(points);
  const form = {
    emergency: { passed: String(points.emergency.passed) },
    coop: { win: String(coop.win), loss: String(coop.loss), passed: String(coop.passed) },
    raid: { win: String(raid.win), loss: String(raid.loss), passed: String(raid.passed) },
  } as PointsForm;
  for (const kind of MATCH_KINDS) {
    form[kind.key] = {
      win: String(points[kind.key].win),
      draw: String(points[kind.key].draw),
      loss: String(points[kind.key].loss),
    };
  }
  return form;
}

/** The next whole hour, Rome time, as a datetime-local value. */
function nextHourInput(now: number): string {
  return toRomeInput(Math.ceil(now / 3_600_000) * 3_600_000);
}

function emptyForm(now: number): FormState {
  const startsAt = nextHourInput(now);
  return {
    started: false,
    title: "",
    description: "",
    startsAt,
    endsAt: addHoursToInput(startsAt, 48),
    points: pointsForm(DEFAULT_EVENT_POINTS),
    dailyCap: "",
    sealTarget: "",
    variantChance: "",
    variantBonus: "",
    traits: [],
    rarities: [],
    factions: [],
    tiers: [{ points: "300", coins: "100", packs: "1", shards: "", cards: [], random: null }],
  };
}

/** An existing event in the form: to change it, or (copy) to run it again from the next hour. */
function formFrom(event: AdminEvent, now: number, copy: boolean): FormState {
  const hours = Math.round((Date.parse(event.ends_at) - Date.parse(event.starts_at)) / 3_600_000);
  const startsAt = copy ? nextHourInput(now) : toRomeInput(event.starts_at);
  return {
    id: copy ? undefined : event.id,
    started: !copy && Date.parse(event.starts_at) <= now,
    title: event.title,
    description: event.description,
    startsAt,
    endsAt: copy ? addHoursToInput(startsAt, hours) : toRomeInput(event.ends_at),
    points: pointsForm(event.points),
    dailyCap: event.daily_cap === null ? "" : String(event.daily_cap),
    sealTarget: event.quadrant_seal_target ? String(event.quadrant_seal_target) : "",
    variantChance: event.variant_chance_percent ? String(event.variant_chance_percent) : "",
    variantBonus: event.variant_bonus_percent ? String(event.variant_bonus_percent) : "",
    traits: event.traits ?? [],
    rarities: event.rarities ?? [],
    factions: event.factions ?? [],
    tiers: event.tiers.map((tier) => ({
      points: String(tier.points),
      coins: tier.coins > 0 ? String(tier.coins) : "",
      packs: tier.packs > 0 ? String(tier.packs) : "",
      shards: tier.shards ? String(tier.shards) : "",
      cards: tier.card_codes,
      random: tier.random_variants ?? null,
    })),
  };
}

type EventAdminProps = {
  data: AdminEvents;
  onChange: (next: AdminEvents) => void;
};

type ScreenTab = "form" | "list";

/**
 * Creates, changes, repeats and stops timed events, and shows how they went. The page fits
 * the phone and never scrolls (see .game-shell): the form and the list are two tabs.
 */
export function EventAdmin({ data, onChange }: EventAdminProps) {
  useLockedScreen(true);
  // Read once: the states are labels, the server decides what can change.
  const [now] = useState(() => Date.parse(data.now));
  const styles = variantStylesOf(data.cards);
  const [form, setForm] = useState<FormState>(() => emptyForm(now));
  const [formKey, setFormKey] = useState(0);
  const [tab, setTab] = useState<ScreenTab>("form");
  const [saved, setSaved] = useState<string | null>(null);
  // An event opened from the list: the back arrow returns to the list.
  useBackStep(tab === "form" && Boolean(form.id), () => setTab("list"));

  function load(next: FormState) {
    setForm(next);
    setFormKey((key) => key + 1);
    setSaved(null);
    setTab("form");
  }

  const groups = [
    { title: "In corso", events: data.events.filter((event) => adminEventState(event, now) === "In corso") },
    { title: "Programmati", events: data.events.filter((event) => adminEventState(event, now) === "Programmato") },
    {
      title: "Conclusi e disattivati",
      events: data.events.filter((event) => ["Concluso", "Disattivato"].includes(adminEventState(event, now))),
    },
  ];

  return (
    <div className="game-shell">
      <header className="flex shrink-0 items-center gap-2.5 px-3 pb-1 pt-2">
        <BackLink href="/editor" />
        <div className="min-w-0">
          <h1 className="font-display text-[32px] uppercase leading-9 text-comic-yellow">Eventi</h1>
          <p className="text-xs font-semibold leading-4 text-muted">Orari in ora italiana. Un evento alla volta.</p>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col gap-2 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-1">
        <TabBar
          tabs={[
            { key: "form", label: form.id ? "Modifica" : "Nuovo evento" },
            { key: "list", label: `Eventi (${data.events.length})` },
          ]}
          current={tab}
          onPick={setTab}
          label="Gestione eventi"
        />
        <div aria-live="polite" className="shrink-0 empty:hidden">
          {saved && <p className="bg-panel px-3 py-2 text-sm font-bold">Evento {saved} salvato.</p>}
        </div>
        {tab === "form" ? (
          <EventForm
            key={formKey}
            initial={form}
            cards={data.cards}
            catalog={data.trait_catalog ?? []}
            rarities={data.rarities}
            minAdmitted={data.min_admitted_characters ?? balance.events.minAdmittedCharacters}
            sealTarget={data.quadrant_seal_target ?? balance.quadrant.sealTarget}
            baseVariantChance={data.base_variant_chance_percent ?? balance.packs.variantChancePercent}
            onSaved={(next, title) => {
              onChange(next);
              load(emptyForm(now));
              setSaved(title);
              setTab("list");
            }}
            onCancel={() => load(emptyForm(now))}
          />
        ) : (
          <div role="tabpanel" className="flex min-h-0 flex-1 flex-col gap-3 -mx-1 overflow-y-auto overscroll-contain px-1">
            {groups.map((group) => (
              <section key={group.title} className="flex shrink-0 flex-col gap-1.5">
                <h2 className="section-title">{group.title}</h2>
                {group.events.length === 0 ? (
                  <p className="text-sm font-medium text-muted">Nessun evento.</p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {group.events.map((event) => (
                      <EventRow
                        key={event.id}
                        event={event}
                        styles={styles}
                        rarities={data.rarities ?? []}
                        now={now}
                        onChange={onChange}
                        onEdit={() => load(formFrom(event, now, false))}
                        onCopy={() => load(formFrom(event, now, true))}
                      />
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

/** "Vetrix" or "Vetrix · Neon" for a chosen card, written as "P051" or "P051:neon". */
function cardLabel(cards: AdminEvents["cards"], cardCode: string): string {
  const [code, style] = cardCode.split(":");
  const card = cards.find((entry) => entry.code === code);
  const variant = style ? card?.variants.find((entry) => entry.style === style) : null;
  return `${card?.name ?? code}${variant ? ` · ${variant.name}` : ""}`;
}

const STEPS = [
  { key: "info", label: "Dati" },
  { key: "points", label: "Punti" },
  { key: "rewards", label: "Premi" },
] as const;
type Step = (typeof STEPS)[number]["key"];

const DURATIONS = [
  { hours: 24, label: "24 h" },
  { hours: 48, label: "48 h" },
  { hours: 72, label: "3 g" },
  { hours: 168, label: "7 g" },
];

/** The event in three steps, one at a time, with the save button always at the bottom. */
function EventForm({
  initial,
  cards,
  catalog,
  rarities: payloadRarities,
  minAdmitted,
  sealTarget,
  baseVariantChance,
  onSaved,
  onCancel,
}: {
  initial: FormState;
  cards: AdminEvents["cards"];
  catalog: TraitCategory[];
  /** Absent from older servers: then they come from the public catalog. */
  rarities?: FilterRarity[];
  minAdmitted: number;
  /** The seal targets an event may set for Quadrante. */
  sealTarget: { min: number; max: number; suggested: number };
  /** The usual variant chance of the standard packs. */
  baseVariantChance: number;
  onSaved: (next: AdminEvents, title: string) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [step, setStep] = useState<Step>("info");
  // Past the first step, the back arrow goes to the step before.
  const stepIndex = STEPS.findIndex((entry) => entry.key === step);
  useBackStep(stepIndex > 0, () => setStep(STEPS[stepIndex - 1].key));
  const [tierIndex, setTierIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locked = form.started;
  const update = (patch: Partial<FormState>) => setForm((current) => ({ ...current, ...patch }));
  const updateTier = (index: number, patch: Partial<TierForm>) =>
    setForm((current) => ({
      ...current,
      tiers: current.tiers.map((tier, i) => (i === index ? { ...tier, ...patch } : tier)),
    }));
  const setPoint = (kind: MatchKind, outcome: "win" | "draw" | "loss", value: string) =>
    setForm((current) => ({
      ...current,
      points: { ...current.points, [kind]: { ...current.points[kind], [outcome]: value } },
    }));
  const setCoopPoint = (outcome: "win" | "loss" | "passed", value: string) =>
    setForm((current) => ({
      ...current,
      points: { ...current.points, coop: { ...current.points.coop, [outcome]: value } },
    }));
  const setRaidPoint = (outcome: "win" | "loss" | "passed", value: string) =>
    setForm((current) => ({
      ...current,
      points: { ...current.points, raid: { ...current.points.raid, [outcome]: value } },
    }));
  const shownTier = Math.min(tierIndex, form.tiers.length - 1);
  const reference = useAdminCardReference();
  const rarities = payloadRarities ?? reference?.rarities ?? [];
  const rule: AdminCardFilter = { query: "", rarities: form.rarities, factions: form.factions, traits: form.traits, styles: [] };
  const ruleOn = activeAdminFilterCount(rule) > 0;
  // Same set and rule as the server's count: active cards that are not level cards.
  const admitted = filterAdminCards(withCardFacts(cards, reference?.facts ?? null), rule, catalog).length;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const number = (value: string) => (value.trim() === "" ? 0 : Number(value));
    const points = {
      emergency: { passed: number(form.points.emergency.passed) },
      coop: { win: number(form.points.coop.win), loss: number(form.points.coop.loss), passed: number(form.points.coop.passed) },
      raid: { win: number(form.points.raid.win), loss: number(form.points.raid.loss), passed: number(form.points.raid.passed) },
    } as EventPoints;
    for (const kind of MATCH_KINDS) {
      const row = form.points[kind.key];
      points[kind.key] = { win: number(row.win), draw: number(row.draw), loss: number(row.loss) };
    }
    try {
      const next = await saveEvent({
        id: form.id,
        title: form.title,
        description: form.description,
        startsAt: form.startsAt,
        endsAt: form.endsAt,
        points,
        dailyCap: form.dailyCap.trim() === "" ? null : Number(form.dailyCap),
        sealTarget: form.sealTarget.trim() === "" ? null : Number(form.sealTarget),
        variantChance: form.variantChance.trim() === "" ? null : Number(form.variantChance),
        variantBonus: form.variantBonus.trim() === "" ? null : Number(form.variantBonus),
        traits: form.traits,
        rarities: form.rarities,
        factions: form.factions,
        tiers: form.tiers.map((tier) => ({
          points: number(tier.points),
          coins: number(tier.coins),
          packs: number(tier.packs),
          cards: tier.cards,
          // Sent only when used, so the page keeps working against a server without them.
          ...(ruleToSend(tier.random) ? { random_variants: ruleToSend(tier.random) ?? undefined } : {}),
          ...(number(tier.shards) > 0 ? { shards: number(tier.shards) } : {}),
        })),
      });
      onSaved(next, form.title.trim());
    } catch (cause) {
      setError(describeServerError(cause));
      setSaving(false);
    }
  }

  // The steps not shown are not in the page: the server checks every field and says what is wrong.
  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col gap-2">
      <div role="tablist" aria-label="Parti dell'evento" className="grid shrink-0 grid-cols-3 gap-1">
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
          </button>
        ))}
      </div>
      {locked && (
        <p className="shrink-0 bg-panel px-3 py-1.5 text-xs font-semibold leading-4">
          Già iniziato: cambiano solo titolo, descrizione e fine, per non cambiare le regole a chi sta giocando.
        </p>
      )}

      {/* What a short window cannot fit scrolls inside, rather than being cut. */}
      <div role="tabpanel" className="flex min-h-0 flex-1 flex-col gap-2.5 -mx-1 overflow-y-auto overscroll-contain px-1">
        {step === "info" && (
          <>
            <label className={LABEL}>
              Titolo
              <input
                value={form.title}
                onChange={(event) => update({ title: event.target.value })}
                placeholder="Weekend di fuoco"
                maxLength={60}
                className={`${INPUT} placeholder:text-faint`}
              />
            </label>
            <label className={LABEL}>
              Descrizione
              <textarea
                value={form.description}
                onChange={(event) => update({ description: event.target.value })}
                placeholder="Facoltativa: la vedono i giocatori nella pagina dell'evento"
                maxLength={500}
                rows={2}
                className={`${INPUT} py-2 placeholder:text-faint`}
              />
            </label>
            <label className={LABEL}>
              Inizio
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(event) => update({ startsAt: event.target.value })}
                disabled={locked}
                className={`${DATE_INPUT} disabled:opacity-50`}
              />
            </label>
            <label className={LABEL}>
              Fine
              <input
                type="datetime-local"
                value={form.endsAt}
                onChange={(event) => update({ endsAt: event.target.value })}
                className={DATE_INPUT}
              />
            </label>
            <div className="flex items-center gap-1.5">
              <span className="shrink-0 text-xs font-bold text-muted">Durata:</span>
              {DURATIONS.map((option) => (
                <button
                  key={option.hours}
                  type="button"
                  onClick={() => update({ endsAt: addHoursToInput(form.startsAt, option.hours) })}
                  className="min-h-11 min-w-0 flex-1 bg-panel px-1 text-sm font-bold"
                >
                  {option.label}
                </button>
              ))}
            </div>
            <fieldset disabled={locked} className="flex min-w-0 flex-col gap-1.5 disabled:opacity-50">
              <legend className="mb-1 text-sm font-bold">Personaggi ammessi</legend>
              {rarities.length > 0 && (
                <>
                  <span className="text-[11px] font-extrabold uppercase text-muted">Rarità</span>
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label="Rarità ammesse">
                    {rarities.map((rarity) => (
                      <Chip
                        key={rarity.code}
                        active={form.rarities.includes(rarity.code)}
                        color={rarity.color}
                        onClick={() => update({ rarities: toggleValue(form.rarities, rarity.code) })}
                      >
                        {rarity.name}
                      </Chip>
                    ))}
                  </div>
                </>
              )}
              <span className="text-[11px] font-extrabold uppercase text-muted">Fazione</span>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Fazioni ammesse">
                {FACTION_CODES.map((code) => (
                  <Chip
                    key={code}
                    active={form.factions.includes(code)}
                    onClick={() => update({ factions: toggleValue(form.factions, code) })}
                  >
                    {FACTION_LABELS[code]}
                  </Chip>
                ))}
              </div>
              {catalog.length > 0 && (
                <TraitFilter
                  catalog={catalog}
                  chosen={form.traits}
                  onChange={(traits) => update({ traits })}
                  layout="wrap"
                  label="Tratti ammessi"
                  disabled={locked}
                />
              )}
              <span
                className={`text-xs font-semibold leading-4 ${
                  ruleOn && admitted < minAdmitted
                    ? "text-comic-magenta"
                    : ruleOn && admitted < 15
                      ? "text-comic-yellow"
                      : "text-muted"
                }`}
              >
                {!ruleOn
                  ? "Nessuna regola: tutti i personaggi danno punti."
                  : `Solo ${describeAdminCardFilter(rule, rarities, catalog)}: ${admitted} personaggi. Una partita dà punti solo se tutta la squadra è di questi personaggi (in Emergenza tutti e 8, nelle Operazioni tutti e 6). Nello stesso gruppo basta una scelta, tra gruppi diversi servono tutte.${
                      admitted < minAdmitted
                        ? ` Ne servono almeno ${minAdmitted}.`
                        : admitted < 15
                          ? " Con meno di 15 pochi giocatori riescono a formare la squadra."
                          : ""
                    }`}
              </span>
            </fieldset>
          </>
        )}

        {step === "points" && (
          <fieldset disabled={locked} className="flex min-w-0 flex-col gap-2 disabled:opacity-50">
            <legend className="sr-only">Punti per partita</legend>
            <div className="grid grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))] items-center gap-1.5 text-xs font-bold">
              <span />
              {OUTCOMES.map((outcome) => (
                <span key={outcome.key} className="text-center text-[11px] uppercase text-muted">
                  {outcome.label}
                </span>
              ))}
              {MATCH_KINDS.map((kind) => (
                <PointsRow key={kind.key} label={kind.label}>
                  {OUTCOMES.map((outcome) => (
                    <input
                      key={outcome.key}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={1000}
                      aria-label={`${kind.label}, ${outcome.label}`}
                      value={form.points[kind.key][outcome.key]}
                      onChange={(event) => setPoint(kind.key, outcome.key, event.target.value)}
                      className={SMALL_INPUT}
                    />
                  ))}
                </PointsRow>
              ))}
              <span className="text-sm">Emergenza</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={1000}
                aria-label="Emergenza, per Minaccia superata"
                value={form.points.emergency.passed}
                onChange={(event) =>
                  setForm((current) => ({ ...current, points: { ...current.points, emergency: { passed: event.target.value } } }))
                }
                className={SMALL_INPUT}
              />
              <span className="col-span-2 text-xs font-medium text-muted">per Minaccia superata</span>
              <PointsRow label="Operazioni">
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={1000}
                  aria-label="Operazioni, Vittoria"
                  value={form.points.coop.win}
                  onChange={(event) => setCoopPoint("win", event.target.value)}
                  className={SMALL_INPUT}
                />
                <span className="text-center text-muted" aria-hidden>
                  –
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={1000}
                  aria-label="Operazioni, Sconfitta"
                  value={form.points.coop.loss}
                  onChange={(event) => setCoopPoint("loss", event.target.value)}
                  className={SMALL_INPUT}
                />
              </PointsRow>
              <span className="text-sm">Operazioni</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={1000}
                aria-label="Operazioni, per Minaccia fermata"
                value={form.points.coop.passed}
                onChange={(event) => setCoopPoint("passed", event.target.value)}
                className={SMALL_INPUT}
              />
              <span className="col-span-2 text-xs font-medium text-muted">per Minaccia fermata</span>
              <PointsRow label="Caccia grossa">
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={1000}
                  aria-label="Caccia grossa, Boss abbattuto"
                  value={form.points.raid.win}
                  onChange={(event) => setRaidPoint("win", event.target.value)}
                  className={SMALL_INPUT}
                />
                <span className="text-center text-muted" aria-hidden>
                  –
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={1000}
                  aria-label="Caccia grossa, Boss non abbattuto"
                  value={form.points.raid.loss}
                  onChange={(event) => setRaidPoint("loss", event.target.value)}
                  className={SMALL_INPUT}
                />
              </PointsRow>
              <span className="text-sm">Caccia grossa</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={1000}
                aria-label="Caccia grossa, per round tenuto"
                value={form.points.raid.passed}
                onChange={(event) => setRaidPoint("passed", event.target.value)}
                className={SMALL_INPUT}
              />
              <span className="col-span-2 text-xs font-medium text-muted">per round senza perdere Difese</span>
            </div>
            <label className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,2fr)] items-center gap-1.5 text-sm font-bold">
              Tetto al giorno
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={form.dailyCap}
                onChange={(event) => update({ dailyCap: event.target.value })}
                placeholder="Nessuno"
                className={`${SMALL_INPUT} placeholder:text-faint`}
              />
            </label>
            <p className="text-xs font-medium leading-4 text-muted">
              0 = quel tipo di partita non dà punti. Il tetto riparte a mezzanotte. Le partite abbandonate non danno
              mai punti; contro lo stesso giocatore contano {balance.events.sameOpponentMatches} partite ogni{" "}
              {balance.events.sameOpponentWindowHours} ore.
            </p>
            <label className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,2fr)] items-center gap-1.5 text-sm font-bold">
              Quadrante: traguardo di Sigilli
              <input
                type="number"
                inputMode="numeric"
                min={sealTarget.min}
                max={sealTarget.max}
                value={form.sealTarget}
                onChange={(event) => update({ sealTarget: event.target.value })}
                placeholder="Nessun traguardo"
                aria-describedby="seal-target-help"
                className={`${SMALL_INPUT} placeholder:text-faint`}
              />
            </label>
            <p id="seal-target-help" className="text-xs font-medium leading-4 text-muted">
              Da {sealTarget.min} a {sealTarget.max}. In ogni Quadrante iniziato durante l&apos;evento, sulle due griglie, alla fine di
              ogni giro (stesso numero di carte giocate) se qualcuno ha almeno quei Sigilli sulla griglia la partita finisce e vince chi
              ne ha di più. Vuoto: si gioca fino all&apos;ultima carta. Con 12 finiscono prima circa 8 partite su 10 sulla griglia fissa
              e 1 su 4 sulla mobile; con 15, 1 su 3 sulla fissa e quasi nessuna sulla mobile.{" "}
              {form.sealTarget.trim() === "" && (
                <button type="button" onClick={() => update({ sealTarget: String(sealTarget.suggested) })} className="underline">
                  Usa {sealTarget.suggested}
                </button>
              )}
            </p>
            <label className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,2fr)] items-center gap-1.5 text-sm font-bold">
              Caccia alle varianti: probabilità %
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={100}
                value={form.variantChance}
                onChange={(event) => update({ variantChance: event.target.value })}
                placeholder={`Come sempre (${baseVariantChance}%)`}
                aria-describedby="variant-chance-help"
                className={`${SMALL_INPUT} placeholder:text-faint`}
              />
            </label>
            <p id="variant-chance-help" className="text-xs font-medium leading-4 text-muted">
              Da 1 a 100. Durante l&apos;evento una carta con varianti esce con un disegno variante con questa probabilità nel
              pacchetto del giorno, in quelli del Negozio e in quelli dei premi (di solito {baseVariantChance}%). I pacchetti
              speciali hanno la loro. Vuoto, o non più del solito: non cambia niente.
            </p>
            <label className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,2fr)] items-center gap-1.5 text-sm font-bold">
              Punti per variante in squadra %
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={100}
                value={form.variantBonus}
                onChange={(event) => update({ variantBonus: event.target.value })}
                placeholder="Nessun bonus"
                aria-describedby="variant-bonus-help"
                className={`${SMALL_INPUT} placeholder:text-faint`}
              />
            </label>
            <p id="variant-bonus-help" className="text-xs font-medium leading-4 text-muted">
              Da 1 a 100. Ogni variante tra le carte schierate aggiunge questa parte dei punti della partita (o della Minaccia
              in Emergenza e nelle Operazioni): con 20%, 2 varianti danno il 40% in più. Vuoto: nessun bonus.
            </p>
          </fieldset>
        )}

        {step === "rewards" && (
          <fieldset disabled={locked} className="flex min-w-0 flex-col gap-2 disabled:opacity-50">
            <legend className="sr-only">Traguardi e premi</legend>
            <div className="flex gap-1.5">
              {form.tiers.map((tier, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setTierIndex(index)}
                  aria-label={`Traguardo ${index + 1}`}
                  aria-pressed={index === shownTier}
                  className={`min-h-11 min-w-11 flex-1 px-1 font-display text-lg ${
                    index === shownTier ? "bg-comic-magenta text-black" : "bg-panel"
                  }`}
                >
                  {tier.points || index + 1}
                </button>
              ))}
              {form.tiers.length < balance.events.maxTiers && (
                <button
                  type="button"
                  onClick={() => {
                    setForm((current) => ({
                      ...current,
                      tiers: [...current.tiers, { points: "", coins: "", packs: "", shards: "", cards: [], random: null }],
                    }));
                    setTierIndex(form.tiers.length);
                  }}
                  aria-label="Aggiungi un traguardo"
                  className="min-h-11 min-w-11 border-2 border-dashed border-line px-2 font-display text-lg"
                >
                  +
                </button>
              )}
            </div>
            <TierEditor
              key={shownTier}
              index={shownTier}
              tier={form.tiers[shownTier]}
              cards={cards}
              catalog={catalog}
              rarities={rarities}
              onChange={(patch) => updateTier(shownTier, patch)}
              onRemove={
                form.tiers.length > 1
                  ? () => {
                      setForm((current) => ({ ...current, tiers: current.tiers.filter((_, i) => i !== shownTier) }));
                      setTierIndex(Math.max(0, shownTier - 1));
                    }
                  : undefined
              }
            />
            <p className="text-xs font-medium leading-4 text-muted">
              Ogni traguardo chiede più punti del precedente. Il premio arriva da solo appena il giocatore lo raggiunge.
            </p>
          </fieldset>
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-1.5">
        <div aria-live="polite">{error && <p className="text-sm font-bold leading-5 text-comic-magenta">{error}</p>}</div>
        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="btn btn-primary flex-1">
            {saving ? "Salvataggio…" : form.id ? "Salva" : "Crea l'evento"}
          </button>
          {(form.id || form.title !== "") && (
            <button type="button" onClick={onCancel} className="btn btn-ghost">
              {form.id ? "Annulla" : "Svuota"}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

function PointsRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <span className="text-sm">{label}</span>
      {children}
    </>
  );
}

function TierEditor({
  index,
  tier,
  cards,
  catalog,
  rarities,
  onChange,
  onRemove,
}: {
  index: number;
  tier: TierForm;
  cards: AdminEvents["cards"];
  catalog: TraitCategory[];
  rarities: FilterRarity[];
  onChange: (patch: Partial<TierForm>) => void;
  onRemove?: () => void;
}) {
  const reference = useAdminCardReference();

  return (
    <div className="flex flex-col gap-2 bg-panel p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-display text-lg uppercase">Traguardo {index + 1}</p>
        {onRemove && (
          <button type="button" onClick={onRemove} className="min-h-11 px-2 text-sm font-bold underline">
            Togli
          </button>
        )}
      </div>
      <div className="grid grid-cols-4 gap-2">
        <label className={LABEL}>
          Punti
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={tier.points}
            onChange={(event) => onChange({ points: event.target.value })}
            className={SMALL_INPUT}
          />
        </label>
        <label className={LABEL}>
          Monete
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={tier.coins}
            onChange={(event) => onChange({ coins: event.target.value })}
            placeholder="0"
            className={`${SMALL_INPUT} placeholder:text-faint`}
          />
        </label>
        <label className={LABEL}>
          Pacchetti
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={10}
            value={tier.packs}
            onChange={(event) => onChange({ packs: event.target.value })}
            placeholder="0"
            className={`${SMALL_INPUT} placeholder:text-faint`}
          />
        </label>
        <label className={LABEL}>
          Schegge
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={MAX_SHARD_REWARD}
            value={tier.shards}
            onChange={(event) => onChange({ shards: shardsInput(event.target.value) })}
            placeholder="0"
            className={`${SMALL_INPUT} placeholder:text-faint`}
          />
        </label>
      </div>
      <AdminCardPicker
        cards={cards}
        chosen={tier.cards}
        onChange={(next) => onChange({ cards: next })}
        max={MAX_TIER_CARDS}
        reference={reference}
        fallbackCatalog={catalog}
        label="Carte"
      />
      {tier.cards.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {tier.cards.map((cardCode, cardIndex) => {
            const label = cardLabel(cards, cardCode);
            return (
              <li key={`${cardCode}-${cardIndex}`}>
                <button
                  type="button"
                  onClick={() => onChange({ cards: tier.cards.filter((_, i) => i !== cardIndex) })}
                  aria-label={`Togli ${label}`}
                  className="min-h-11 bg-black px-3 text-sm font-bold"
                >
                  {label} ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <RandomVariantsField
        value={tier.random}
        onChange={(random) => onChange({ random })}
        styles={variantStylesOf(cards)}
        rarities={rarities.length > 0 ? rarities : (reference?.rarities ?? [])}
      />
    </div>
  );
}

function EventRow({
  event,
  styles,
  rarities,
  now,
  onChange,
  onEdit,
  onCopy,
}: {
  event: AdminEvent;
  /** To name the styles and rarities of the targets' random variants. */
  styles: FilterStyle[];
  rarities: FilterRarity[];
  now: number;
  onChange: EventAdminProps["onChange"];
  onEdit: () => void;
  onCopy: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const state = adminEventState(event, now);
  const over = Date.parse(event.ends_at) <= now;

  async function run(action: () => Promise<AdminEvents>) {
    setSaving(true);
    setError(null);
    try {
      onChange(await action());
    } catch (cause) {
      setError(describeServerError(cause));
    } finally {
      setSaving(false);
      setConfirmDelete(false);
    }
  }

  return (
    <li className="flex flex-col gap-1.5 bg-panel px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 break-words font-display text-xl uppercase">{event.title}</p>
        <span className={`shrink-0 text-xs font-bold uppercase ${state === "In corso" ? "text-comic-cyan" : "text-muted"}`}>
          {state}
        </span>
      </div>
      <p className="text-xs font-medium text-muted">
        Dal {formatRomeDateTime(event.starts_at)} al {formatRomeDateTime(event.ends_at)}
        {event.daily_cap !== null && ` · max ${event.daily_cap} punti al giorno`}
        {event.quadrant_seal_target ? ` · Quadrante: traguardo ${event.quadrant_seal_target} Sigilli` : ""}
        {event.variant_chance_percent ? ` · varianti al ${event.variant_chance_percent}%` : ""}
        {event.variant_bonus_percent ? ` · +${event.variant_bonus_percent}% per variante in squadra` : ""}
      </p>
      <p className="text-xs font-semibold">{event.players === 1 ? "1 giocatore" : `${event.players} giocatori`} con punti</p>
      <ol className="flex flex-col gap-0.5 text-sm">
        {event.tiers.map((tier) => (
          <li key={tier.tier} className="font-semibold">
            {tier.points} punti:{" "}
            {[
              describeTierReward({ coins: tier.coins, packs: tier.packs, shards: tier.shards, cards: [] }),
              ...tier.card_names,
              describeRandomVariants(ruleInfo(tier.random_variants, styles, rarities)),
            ]
              .filter(Boolean)
              .join(" + ")}
            <span className="text-muted"> · raggiunto da {tier.reached}</span>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-x-4">
        {!over && (
          <button type="button" onClick={onEdit} disabled={saving} className="flex min-h-11 items-center text-sm font-bold underline">
            Modifica
          </button>
        )}
        <button type="button" onClick={onCopy} disabled={saving} className="flex min-h-11 items-center text-sm font-bold underline">
          Duplica
        </button>
        {!over && (
          <button
            type="button"
            onClick={() => run(() => setEventActive(event.id, !event.is_active))}
            disabled={saving}
            className="flex min-h-11 items-center text-sm font-bold underline disabled:opacity-60"
          >
            {event.is_active ? "Disattiva" : "Riattiva"}
          </button>
        )}
        {event.players === 0 &&
          (confirmDelete ? (
            <button
              type="button"
              onClick={() => run(() => deleteEvent(event.id))}
              disabled={saving}
              className="flex min-h-11 items-center text-sm font-bold text-comic-magenta underline"
            >
              Conferma eliminazione
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex min-h-11 items-center text-sm font-bold underline"
            >
              Elimina
            </button>
          ))}
      </div>
      {error && <p className="text-sm font-bold text-comic-magenta">{error}</p>}
    </li>
  );
}
