"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { PageHeader } from "@/components/comic-parts";
import { balance } from "@/config/balance";
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
import { EVENT_KINDS, addHoursToInput, describeTierReward, formatRomeDateTime, toRomeInput, type EventPoints } from "@/lib/events";

const INPUT = "min-h-12 w-full min-w-0 max-w-full border-2 border-comic-yellow bg-black px-3 text-base font-semibold";
const SMALL_INPUT = "min-h-11 w-full min-w-0 border-2 border-comic-yellow bg-black px-2 text-center text-base font-semibold";
const LABEL = "flex min-w-0 flex-col gap-1 text-sm font-bold";
// Safari ignores the width of a date field that keeps its native appearance.
const DATE_INPUT = `${INPUT} appearance-none [&::-webkit-date-and-time-value]:text-left`;

const MATCH_KINDS = EVENT_KINDS.filter((kind) => kind.key !== "emergency");
type MatchKind = (typeof MATCH_KINDS)[number]["key"];
const OUTCOMES = [
  { key: "win", label: "Vittoria" },
  { key: "draw", label: "Pareggio" },
  { key: "loss", label: "Sconfitta" },
] as const;

type TierForm = { points: string; coins: string; packs: string; cards: string[] };
type PointsForm = Record<MatchKind, Record<"win" | "draw" | "loss", string>> & { emergency: { passed: string } };

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
  tiers: TierForm[];
};

function pointsForm(points: EventPoints): PointsForm {
  const form = { emergency: { passed: String(points.emergency.passed) } } as PointsForm;
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
    tiers: [{ points: "300", coins: "100", packs: "1", cards: [] }],
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
    tiers: event.tiers.map((tier) => ({
      points: String(tier.points),
      coins: tier.coins > 0 ? String(tier.coins) : "",
      packs: tier.packs > 0 ? String(tier.packs) : "",
      cards: tier.card_codes,
    })),
  };
}

type EventAdminProps = {
  data: AdminEvents;
  onChange: (next: AdminEvents) => void;
};

/** Creates, changes, repeats and stops timed events, and shows how they went. */
export function EventAdmin({ data, onChange }: EventAdminProps) {
  // Read once: the states are labels, the server decides what can change.
  const [now] = useState(() => Date.parse(data.now));
  const [form, setForm] = useState<FormState>(() => emptyForm(now));
  const [formKey, setFormKey] = useState(0);

  function load(next: FormState) {
    setForm(next);
    setFormKey((key) => key + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
    <div className="flex min-w-0 flex-1 flex-col overflow-x-clip">
      <PageHeader title="Eventi" subtitle="Orari in ora italiana. Un evento alla volta." />
      <main className="flex flex-1 flex-col gap-5 px-3 pb-6">
        <EventForm
          key={formKey}
          initial={form}
          cards={data.cards}
          onSaved={(next) => {
            onChange(next);
            load(emptyForm(now));
          }}
          onCancel={() => load(emptyForm(now))}
        />
        {groups.map((group) => (
          <section key={group.title} className="flex flex-col gap-2">
            <h2 className="section-title">{group.title}</h2>
            {group.events.length === 0 ? (
              <p className="text-sm font-medium text-muted">Nessun evento.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {group.events.map((event) => (
                  <EventRow
                    key={event.id}
                    event={event}
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

function EventForm({
  initial,
  cards,
  onSaved,
  onCancel,
}: {
  initial: FormState;
  cards: AdminEvents["cards"];
  onSaved: (next: AdminEvents) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
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

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(null);
    const number = (value: string) => (value.trim() === "" ? 0 : Number(value));
    const points = { emergency: { passed: number(form.points.emergency.passed) } } as EventPoints;
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
        tiers: form.tiers.map((tier) => ({
          points: number(tier.points),
          coins: number(tier.coins),
          packs: number(tier.packs),
          cards: tier.cards,
        })),
      });
      setSaved(form.title.trim());
      onSaved(next);
    } catch (cause) {
      setError(describeServerError(cause));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <h2 className="section-title">{form.id ? "Modifica evento" : "Nuovo evento"}</h2>
      {locked && (
        <p className="bg-panel px-3 py-2 text-sm font-semibold">
          L&apos;evento è già iniziato: si possono cambiare solo titolo, descrizione e fine, per non cambiare le regole a
          chi sta giocando.
        </p>
      )}
      <label className={LABEL}>
        Titolo
        <input
          value={form.title}
          onChange={(event) => update({ title: event.target.value })}
          placeholder="Weekend di fuoco"
          required
          minLength={3}
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
          rows={3}
          className={`${INPUT} py-2 placeholder:text-faint`}
        />
      </label>

      <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
        <label className={LABEL}>
          Inizio
          <input
            type="datetime-local"
            value={form.startsAt}
            onChange={(event) => update({ startsAt: event.target.value })}
            required
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
            required
            className={DATE_INPUT}
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-bold text-muted">Durata dall&apos;inizio:</span>
        {[
          { hours: 24, label: "24 ore" },
          { hours: 48, label: "48 ore" },
          { hours: 72, label: "3 giorni" },
          { hours: 168, label: "7 giorni" },
        ].map((option) => (
          <button
            key={option.hours}
            type="button"
            onClick={() => update({ endsAt: addHoursToInput(form.startsAt, option.hours) })}
            className="min-h-11 bg-panel px-3 text-sm font-bold"
          >
            {option.label}
          </button>
        ))}
      </div>

      <fieldset disabled={locked} className="flex flex-col gap-2 disabled:opacity-50">
        <legend className="text-sm font-bold">Punti per partita</legend>
        <div className="grid grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))] items-center gap-1.5 text-xs font-bold">
          <span />
          {OUTCOMES.map((outcome) => (
            <span key={outcome.key} className="text-center uppercase text-muted">
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
        </div>
        <label className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,2fr)] items-center gap-1.5 text-sm font-bold">
          Emergenza
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={1000}
            value={form.points.emergency.passed}
            onChange={(event) =>
              setForm((current) => ({ ...current, points: { ...current.points, emergency: { passed: event.target.value } } }))
            }
            className={SMALL_INPUT}
          />
          <span className="text-xs font-medium text-muted">per Minaccia superata</span>
        </label>
        <p className="text-xs font-medium text-muted">
          0 = quel tipo di partita non dà punti. Le partite abbandonate non danno mai punti; contro lo stesso giocatore
          contano {balance.events.sameOpponentMatches} partite ogni {balance.events.sameOpponentWindowHours} ore.
        </p>
        <label className={LABEL}>
          Tetto di punti al giorno
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={form.dailyCap}
            onChange={(event) => update({ dailyCap: event.target.value })}
            placeholder="Nessun limite"
            className={`${INPUT} placeholder:text-faint`}
          />
          <span className="text-xs font-medium text-muted">Riparte a mezzanotte, ora italiana.</span>
        </label>
      </fieldset>

      <fieldset disabled={locked} className="flex flex-col gap-2 disabled:opacity-50">
        <legend className="text-sm font-bold">Traguardi e premi</legend>
        {form.tiers.map((tier, index) => (
          <TierEditor
            key={index}
            index={index}
            tier={tier}
            cards={cards}
            onChange={(patch) => updateTier(index, patch)}
            onRemove={
              form.tiers.length > 1
                ? () => setForm((current) => ({ ...current, tiers: current.tiers.filter((_, i) => i !== index) }))
                : undefined
            }
          />
        ))}
        {form.tiers.length < balance.events.maxTiers && (
          <button
            type="button"
            onClick={() =>
              setForm((current) => ({
                ...current,
                tiers: [...current.tiers, { points: "", coins: "", packs: "", cards: [] }],
              }))
            }
            className="btn btn-ghost"
          >
            Aggiungi un traguardo
          </button>
        )}
        <p className="text-xs font-medium text-muted">
          Ogni traguardo chiede più punti del precedente. Il premio arriva da solo appena il giocatore lo raggiunge.
        </p>
      </fieldset>

      <button type="submit" disabled={saving} className="btn btn-primary">
        {saving ? "Salvataggio…" : form.id ? "Salva le modifiche" : "Crea l'evento"}
      </button>
      {(form.id || form.title !== "") && (
        <button type="button" onClick={onCancel} className="btn btn-ghost">
          {form.id ? "Annulla la modifica" : "Svuota il modulo"}
        </button>
      )}
      <div aria-live="polite">
        {error && <p className="text-sm font-bold text-comic-magenta">{error}</p>}
        {saved && <p className="bg-panel px-4 py-2.5 text-sm font-bold">Evento {saved} salvato.</p>}
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
  onChange,
  onRemove,
}: {
  index: number;
  tier: TierForm;
  cards: AdminEvents["cards"];
  onChange: (patch: Partial<TierForm>) => void;
  onRemove?: () => void;
}) {
  const [pendingCard, setPendingCard] = useState<string | null>(null);
  const [pendingStyle, setPendingStyle] = useState("");
  const pending = cards.find((card) => card.code === pendingCard) ?? null;

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
      <div className="grid grid-cols-3 gap-2">
        <label className={LABEL}>
          Punti
          <input
            type="number"
            inputMode="numeric"
            min={1}
            required
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
      </div>
      <label className={LABEL}>
        Carte
        <select
          value=""
          onChange={(event) => {
            const picked = cards.find((card) => card.code === event.target.value);
            if (!picked) return;
            // A card with variants waits for the choice of drawing.
            if (picked.variants.length > 0) setPendingCard(picked.code);
            else onChange({ cards: [...tier.cards, picked.code] });
          }}
          className={INPUT}
        >
          <option value="">Aggiungi una carta…</option>
          {cards.map((card) => (
            <option key={card.code} value={card.code}>
              {card.name} ({card.rarity})
            </option>
          ))}
        </select>
      </label>
      {pending && (
        <div className="flex flex-col gap-2 bg-black/40 p-3">
          <label className={LABEL}>
            Disegno di {pending.name}
            <select value={pendingStyle} onChange={(event) => setPendingStyle(event.target.value)} className={INPUT}>
              <option value="">Base</option>
              {pending.variants.map((variant) => (
                <option key={variant.style} value={variant.style}>
                  Variante {variant.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                onChange({ cards: [...tier.cards, pendingStyle ? `${pending.code}:${pendingStyle}` : pending.code] });
                setPendingCard(null);
                setPendingStyle("");
              }}
              className="btn btn-primary flex-1"
            >
              Aggiungi
            </button>
            <button
              type="button"
              onClick={() => {
                setPendingCard(null);
                setPendingStyle("");
              }}
              className="btn btn-ghost"
            >
              Annulla
            </button>
          </div>
        </div>
      )}
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
    </div>
  );
}

function EventRow({
  event,
  now,
  onChange,
  onEdit,
  onCopy,
}: {
  event: AdminEvent;
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
      </p>
      <p className="text-xs font-semibold">{event.players === 1 ? "1 giocatore" : `${event.players} giocatori`} con punti</p>
      <ol className="flex flex-col gap-0.5 text-sm">
        {event.tiers.map((tier) => (
          <li key={tier.tier} className="font-semibold">
            {tier.points} punti: {[describeTierReward({ coins: tier.coins, packs: tier.packs, cards: [] }), ...tier.card_names]
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
