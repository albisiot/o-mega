"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { BotDifficulty } from "@o-mega/game-engine";
import { AdminCardPicker, useAdminCardReference } from "@/components/admin-card-filter";
import { Chip } from "@/components/card-list-controls";
import { ChallengeCard, ChallengeRibbon, ChallengeRuleChips } from "@/components/challenge-parts";
import { BackLink, TabBar } from "@/components/comic-parts";
import { RandomVariantsField } from "@/components/random-variants-field";
import { TraitFilter } from "@/components/trait-filter";
import { balance } from "@/config/balance";
import { FACTION_CODES, toggleValue, variantStylesOf } from "@/lib/admin-card-filter";
import { FACTION_LABELS } from "@/lib/catalog";
import {
  CHALLENGE_COLORS,
  CHALLENGE_FORMATS,
  adminChallengeState,
  deleteChallenge,
  fromRomeInput,
  overlappingChallenge,
  previewChallenge,
  saveChallenge,
  setChallengeActive,
  type AdminChallenge,
  type AdminChallengeCard,
  type AdminChallenges,
  type ChallengePreview,
  type ChallengeTierDraft,
} from "@/lib/challenge-admin";
import {
  describeChallengePoints,
  describeChallengeTierReward,
  type Challenge,
  type ChallengeRulesJson,
  type ChallengeTier,
} from "@/lib/challenges";
import { describeServerError } from "@/lib/errors";
import { addHoursToInput, formatRomeDateTime, toRomeInput } from "@/lib/events";
import { DIFFICULTY_LABELS } from "@/lib/match";
import { describeRandomVariants, ruleInfo, ruleToSend, type RandomVariantsRule } from "@/lib/random-variants";
import { useLockedScreen } from "@/lib/use-locked-screen";

const INPUT = "min-h-12 w-full min-w-0 max-w-full border-2 border-comic-yellow bg-black px-3 text-base font-semibold";
const SMALL_INPUT = "min-h-11 w-full min-w-0 border-2 border-comic-yellow bg-black px-2 text-center text-base font-semibold";
const LABEL = "flex min-w-0 flex-col gap-1 text-sm font-bold";
const SUBLABEL = "text-[11px] font-extrabold uppercase text-muted";
// Safari ignores the width of a date field that keeps its native appearance.
const DATE_INPUT = `${INPUT} appearance-none [&::-webkit-date-and-time-value]:text-left`;
const BOTS: BotDifficulty[] = ["easy", "medium", "hard", "super_pro"];
const { challenges: limits } = balance;
/** The server's limit on the cards of one prize target. */
const MAX_TIER_CARDS = 10;

type VariantMode = "none" | "min" | "all";
type Format = (typeof CHALLENGE_FORMATS)[number]["key"];

type TierForm = { wins: string; coins: string; packs: string; cards: string[]; random: RandomVariantsRule | null };

type FormState = {
  id?: string;
  /** A started challenge changes only title, description and end. */
  started: boolean;
  title: string;
  description: string;
  color: string;
  format: Format;
  bots: BotDifficulty[];
  botFollowsRules: boolean;
  online: boolean;
  /** Empty: any level. */
  minLevel: string;
  /** Quadrante: the seal target; empty: none. */
  sealTarget: string;
  rarities: string[];
  factions: string[];
  traits: string[];
  variantMode: VariantMode;
  minVariants: string;
  variantStyles: string[];
  banned: string[];
  only: string[];
  noStarters: boolean;
  startsAt: string;
  endsAt: string;
  /** Empty: no limit. */
  dailyLimit: string;
  /** Empty: not linked to an event. */
  eventId: string;
  points: { win: string; draw: string; loss: string };
  tiers: TierForm[];
};

const isQuadrant = (format: string) => format === "quadrant" || format === "quadrant_shifting";

/** The next whole hour, Rome time, as a datetime-local value. */
function nextHourInput(now: number): string {
  return toRomeInput(Math.ceil(now / 3_600_000) * 3_600_000);
}

function pointsForm(points: { win: number; draw: number; loss: number }): FormState["points"] {
  return { win: String(points.win), draw: String(points.draw), loss: String(points.loss) };
}

function emptyForm(now: number): FormState {
  const startsAt = nextHourInput(now);
  return {
    started: false,
    title: "",
    description: "",
    color: CHALLENGE_COLORS[0],
    format: "classic",
    bots: ["easy", "medium", "hard"],
    botFollowsRules: true,
    online: false,
    minLevel: "",
    sealTarget: "",
    rarities: [],
    factions: [],
    traits: [],
    variantMode: "none",
    minVariants: "1",
    variantStyles: [],
    banned: [],
    only: [],
    noStarters: false,
    startsAt,
    endsAt: addHoursToInput(startsAt, 72),
    dailyLimit: "",
    eventId: "",
    points: pointsForm(limits.defaultEventPoints),
    tiers: [],
  };
}

function tierForm(tier: ChallengeTier): TierForm {
  return {
    wins: String(tier.wins),
    coins: tier.coins > 0 ? String(tier.coins) : "",
    packs: tier.packs > 0 ? String(tier.packs) : "",
    cards: tier.card_codes,
    random: tier.random_variants,
  };
}

/** A challenge in the form: to change it, or (copy) to run it again from the next hour, unlinked. */
function formFrom(challenge: AdminChallenge, now: number, copy: boolean): FormState {
  const hours = Math.round((Date.parse(challenge.ends_at) - Date.parse(challenge.starts_at)) / 3_600_000);
  const startsAt = copy ? nextHourInput(now) : toRomeInput(challenge.starts_at);
  const rules = challenge.rules;
  return {
    id: copy ? undefined : challenge.id,
    started: !copy && Date.parse(challenge.starts_at) <= now,
    title: challenge.title,
    description: challenge.description,
    color: challenge.color,
    format: (CHALLENGE_FORMATS.find((format) => format.key === challenge.format)?.key ?? "classic") as Format,
    bots: challenge.bot_difficulties,
    botFollowsRules: challenge.bot_follows_rules,
    online: challenge.online ?? false,
    minLevel: challenge.min_level != null ? String(challenge.min_level) : "",
    sealTarget: challenge.quadrant_seal_target != null ? String(challenge.quadrant_seal_target) : "",
    rarities: rules.rarities,
    factions: rules.factions,
    traits: rules.traits,
    variantMode: rules.all_variants ? "all" : rules.min_variants > 0 ? "min" : "none",
    minVariants: String(Math.max(1, rules.min_variants)),
    variantStyles: rules.variant_styles ?? [],
    banned: rules.banned ?? [],
    only: rules.only ?? [],
    noStarters: rules.no_starters ?? false,
    startsAt,
    endsAt: copy ? addHoursToInput(startsAt, hours) : toRomeInput(challenge.ends_at),
    dailyLimit: challenge.daily_limit === null ? "" : String(challenge.daily_limit),
    // A copy runs in other dates: its event, if any, is chosen again.
    eventId: copy ? "" : (challenge.event?.id ?? ""),
    points: pointsForm(challenge.event_points ?? limits.defaultEventPoints),
    tiers: (challenge.tiers ?? []).map(tierForm),
  };
}

function rulesOf(form: FormState): ChallengeRulesJson {
  const variantRule = form.variantMode !== "none";
  return {
    rarities: form.rarities,
    factions: form.factions,
    traits: form.traits,
    min_variants: form.variantMode === "min" ? Math.max(0, Number(form.minVariants) || 0) : 0,
    all_variants: form.variantMode === "all",
    variant_styles: variantRule ? form.variantStyles : [],
    banned: form.banned,
    only: form.only,
    no_starters: form.noStarters,
  };
}

const number = (value: string) => (value.trim() === "" ? 0 : Number(value));

function tierDraft(tier: TierForm): ChallengeTierDraft {
  const random = ruleToSend(tier.random);
  return {
    wins: number(tier.wins),
    coins: number(tier.coins),
    packs: number(tier.packs),
    cards: tier.cards,
    ...(random ? { random_variants: random } : {}),
  };
}

type ScreenTab = "form" | "list";

/**
 * Sfide a tema (SPEC §8.8): creates, changes, repeats and stops them, and shows how they went.
 * The page fits the phone and never scrolls (see .game-shell): the form and the list are two tabs.
 */
export function ChallengeAdmin({
  data,
  onChange,
  preview = previewChallenge,
}: {
  data: AdminChallenges;
  onChange: (next: AdminChallenges) => void;
  /** How the rules step counts characters and players: the server's admin_preview_challenge (a dev page fakes it). */
  preview?: typeof previewChallenge;
}) {
  useLockedScreen(true);
  // Read once: the states are labels, the server decides what can change.
  const [now] = useState(() => Date.parse(data.now));
  const [form, setForm] = useState<FormState>(() => emptyForm(now));
  const [formKey, setFormKey] = useState(0);
  const [tab, setTab] = useState<ScreenTab>("form");
  const [saved, setSaved] = useState<string | null>(null);

  function load(next: FormState) {
    setForm(next);
    setFormKey((key) => key + 1);
    setSaved(null);
    setTab("form");
  }

  const groups = [
    { title: "In corso", states: ["In corso"] },
    { title: "Programmate", states: ["Programmata"] },
    { title: "Concluse e disattivate", states: ["Conclusa", "Disattivata"] },
  ].map((group) => ({
    ...group,
    challenges: data.challenges.filter((challenge) => group.states.includes(adminChallengeState(challenge, now))),
  }));

  return (
    <div className="game-shell">
      <header className="flex shrink-0 items-center gap-2.5 px-3 pb-1 pt-2">
        <BackLink href="/editor" label="Torna all'Editor" />
        <div className="min-w-0">
          <h1 className="font-display text-[32px] uppercase leading-9 text-comic-yellow">Sfide a tema</h1>
          <p className="text-xs font-semibold leading-4 text-muted">Una modalità con vincoli, per un periodo. Ora italiana.</p>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col gap-2 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-1">
        <TabBar
          tabs={[
            { key: "form", label: form.id ? "Modifica" : "Nuova sfida" },
            { key: "list", label: `Sfide (${data.challenges.length})` },
          ]}
          current={tab}
          onPick={setTab}
          label="Gestione sfide"
        />
        <div aria-live="polite" className="shrink-0 empty:hidden">
          {saved && <p className="bg-panel px-3 py-2 text-sm font-bold">Sfida {saved} salvata.</p>}
        </div>
        {tab === "form" ? (
          <ChallengeForm
            key={formKey}
            initial={form}
            data={data}
            now={now}
            askPreview={preview}
            onSaved={(next, title) => {
              onChange(next);
              load(emptyForm(now));
              setSaved(title);
              setTab("list");
            }}
            onCancel={() => load(emptyForm(now))}
          />
        ) : (
          <div role="tabpanel" className="-mx-1 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-1">
            {groups.map((group) => (
              <section key={group.title} className="flex shrink-0 flex-col gap-1.5">
                <h2 className="section-title">{group.title}</h2>
                {group.challenges.length === 0 ? (
                  <p className="text-sm font-medium text-muted">Nessuna sfida.</p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {group.challenges.map((challenge) => (
                      <ChallengeRow
                        key={challenge.id}
                        challenge={challenge}
                        now={now}
                        onChange={onChange}
                        onEdit={() => load(formFrom(challenge, now, false))}
                        onCopy={() => load(formFrom(challenge, now, true))}
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

const STEPS = [
  { key: "info", label: "Dati" },
  { key: "mode", label: "Modalità" },
  { key: "rules", label: "Vincoli" },
  { key: "rewards", label: "Premi" },
  { key: "preview", label: "Anteprima" },
] as const;
type Step = (typeof STEPS)[number]["key"];

const DURATIONS = [
  { hours: 24, label: "24 h" },
  { hours: 48, label: "48 h" },
  { hours: 72, label: "3 g" },
  { hours: 168, label: "7 g" },
];

/** What the rules allow, asked to the server a moment after the last change. */
function usePreview(
  format: Format,
  rules: ChallengeRulesJson,
  ask: typeof previewChallenge,
): { preview: ChallengePreview | null; error: string | null } {
  const [state, setState] = useState<{ preview: ChallengePreview | null; error: string | null }>({ preview: null, error: null });
  const key = JSON.stringify([format, rules]);
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      const [askedFormat, askedRules] = JSON.parse(key) as [Format, ChallengeRulesJson];
      ask(askedFormat, askedRules)
        .then((preview) => !cancelled && setState({ preview, error: null }))
        .catch((cause: unknown) => !cancelled && setState({ preview: null, error: describeServerError(cause) }));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [key, ask]);
  return state;
}

/** The challenge in five steps, one at a time, with the save button always at the bottom. */
function ChallengeForm({
  initial,
  data,
  now,
  askPreview,
  onSaved,
  onCancel,
}: {
  initial: FormState;
  data: AdminChallenges;
  now: number;
  askPreview: typeof previewChallenge;
  onSaved: (next: AdminChallenges, title: string) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [step, setStep] = useState<Step>("info");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locked = form.started;
  const update = (patch: Partial<FormState>) => setForm((current) => ({ ...current, ...patch }));
  const updateTier = (index: number, patch: Partial<TierForm>) =>
    setForm((current) => ({ ...current, tiers: current.tiers.map((tier, i) => (i === index ? { ...tier, ...patch } : tier)) }));
  const reference = useAdminCardReference();
  const cards = data.cards ?? [];
  const styles = data.variant_styles ?? [];
  const seal = data.seal_target ?? balance.quadrant.sealTarget;
  const rules = rulesOf(form);
  const { preview, error: previewError } = usePreview(form.format, rules, askPreview);
  const event = data.events.find((entry) => entry.id === form.eventId) ?? null;
  const startsAt = fromRomeInput(form.startsAt);
  const endsAt = fromRomeInput(form.endsAt);
  const overlap = overlappingChallenge(data.challenges, { id: form.id, format: form.format, startsAt, endsAt });
  const nameOf = (code: string) => cards.find((card) => card.code === code)?.name ?? code;

  async function submit(submitted: FormEvent) {
    submitted.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const next = await saveChallenge({
        id: form.id,
        title: form.title,
        description: form.description,
        color: form.color,
        format: form.format,
        botDifficulties: form.bots,
        botFollowsRules: form.botFollowsRules,
        rules,
        startsAt: form.startsAt,
        endsAt: form.endsAt,
        dailyLimit: form.dailyLimit.trim() === "" ? null : Number(form.dailyLimit),
        eventId: form.eventId || null,
        eventPoints: form.eventId
          ? { win: number(form.points.win), draw: number(form.points.draw), loss: number(form.points.loss) }
          : null,
        online: form.online,
        minLevel: form.minLevel.trim() === "" ? null : Number(form.minLevel),
        sealTarget: isQuadrant(form.format) && form.sealTarget.trim() !== "" ? Number(form.sealTarget) : null,
        tiers: form.tiers.map(tierDraft),
      });
      onSaved(next, form.title.trim());
    } catch (cause) {
      setError(describeServerError(cause));
      setSaving(false);
    }
  }

  // The challenge as players would see it, for the preview step.
  const shown: Challenge = {
    id: form.id ?? "anteprima",
    title: form.title.trim() || "Titolo della sfida",
    description: form.description.trim(),
    color: form.color,
    format: form.format,
    bot_difficulties: BOTS.filter((bot) => form.bots.includes(bot)),
    bot_follows_rules: form.botFollowsRules,
    online: form.online,
    min_level: form.minLevel.trim() === "" ? null : Number(form.minLevel),
    quadrant_seal_target: isQuadrant(form.format) && form.sealTarget.trim() !== "" ? Number(form.sealTarget) : null,
    rules,
    admitted: [
      ...(form.rarities.length > 0
        ? [{ category: "Rarità", traits: (reference?.rarities ?? []).filter((r) => form.rarities.includes(r.code)).map((r) => r.name) }]
        : []),
      ...(form.factions.length > 0 ? [{ category: "Fazione", traits: form.factions.map((code) => FACTION_LABELS[code] ?? code) }] : []),
      ...(reference?.catalog ?? [])
        .map((category) => ({
          category: category.name,
          traits: category.traits.filter((trait) => form.traits.includes(trait.code)).map((trait) => trait.name),
        }))
        .filter((group) => group.traits.length > 0),
    ],
    banned_names: form.banned.map(nameOf),
    only_names: form.only.map(nameOf),
    variant_style_names: styles.filter((style) => rules.variant_styles?.includes(style.style)).map((style) => style.name),
    admitted_characters: preview?.admitted ?? 0,
    team_size: preview?.team_size ?? (form.format === "triple" ? 9 : isQuadrant(form.format) ? 10 : 5),
    starts_at: Number.isNaN(startsAt) ? new Date(now).toISOString() : new Date(startsAt).toISOString(),
    ends_at: Number.isNaN(endsAt) ? new Date(now).toISOString() : new Date(endsAt).toISOString(),
    daily_limit: form.dailyLimit.trim() === "" ? null : Number(form.dailyLimit),
    plays_today: 0,
    my_characters: null,
    my_characters_with_variant: null,
    my_wins: 0,
    tiers: form.tiers.map((tier, index) => ({
      tier: index + 1,
      wins: number(tier.wins),
      coins: number(tier.coins),
      packs: number(tier.packs),
      cards: tier.cards.map((code) => ({ name: nameOf(code.split(":")[0]) })),
      card_codes: tier.cards,
      random_variants: tier.random,
      random_variants_info: ruleInfo(tier.random, styles, reference?.rarities ?? []),
      reached: false,
      reached_by: 0,
      opening_ids: [],
      seen: false,
    })),
    event: event,
    event_points: event ? { win: number(form.points.win), draw: number(form.points.draw), loss: number(form.points.loss) } : null,
  };

  const tooFew =
    preview !== null && (preview.admitted < preview.team_size || preview.admitted_with_variant < preview.variants_needed);
  const readyShare = preview && preview.players_total > 0 ? Math.round((preview.players_ready / preview.players_total) * 100) : null;
  const winsGrow = form.tiers.every((tier, i) => i === 0 || number(tier.wins) > number(form.tiers[i - 1].wins));

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col gap-2">
      {/* Each step is as wide as its name and they share what is left: «Anteprima» is longer than a fifth of a phone. */}
      <div role="tablist" aria-label="Parti della sfida" className="flex shrink-0 gap-1">
        {STEPS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            role="tab"
            aria-selected={step === entry.key}
            onClick={() => setStep(entry.key)}
            className={`min-h-11 min-w-0 flex-auto border-2 px-1 text-[11px] font-extrabold uppercase max-[350px]:px-0.5 max-[350px]:text-[10px] ${
              step === entry.key ? "border-comic-yellow bg-comic-yellow text-black" : "border-line text-foreground"
            }`}
          >
            {entry.label}
          </button>
        ))}
      </div>
      {locked && (
        <p className="shrink-0 bg-panel px-3 py-1.5 text-xs font-semibold leading-4">
          Già iniziata: cambiano solo titolo, descrizione e fine, per non cambiare le regole a chi sta giocando.
        </p>
      )}

      {/* What a short window cannot fit scrolls inside, rather than being cut. */}
      <div role="tabpanel" className="-mx-1 flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto overscroll-contain px-1">
        {step === "info" && (
          <>
            <label className={LABEL}>
              Titolo
              <input
                value={form.title}
                onChange={(changed) => update({ title: changed.target.value })}
                placeholder="La notte dei Figli"
                maxLength={limits.titleMaxLength}
                className={`${INPUT} placeholder:text-faint`}
              />
            </label>
            <label className={LABEL}>
              Descrizione · {form.description.length}/{limits.descriptionMaxLength}
              <textarea
                value={form.description}
                onChange={(changed) => update({ description: changed.target.value })}
                placeholder="Facoltativa: la vedono i giocatori sulla scheda della sfida"
                maxLength={limits.descriptionMaxLength}
                rows={2}
                className={`${INPUT} py-2 placeholder:text-faint`}
              />
            </label>
            <fieldset disabled={locked} className="flex flex-col gap-1 disabled:opacity-50">
              <legend className="mb-1 text-sm font-bold">Colore</legend>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Colore">
                {CHALLENGE_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    role="radio"
                    aria-checked={form.color === color}
                    aria-label={color}
                    onClick={() => update({ color })}
                    className={`h-11 w-11 border-[3px] border-black ${form.color === color ? "outline outline-[3px] outline-offset-1 outline-foreground" : ""}`}
                    style={{ background: color }}
                  />
                ))}
              </div>
            </fieldset>
            <label className={LABEL}>
              Inizio
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(changed) => update({ startsAt: changed.target.value })}
                disabled={locked}
                className={`${DATE_INPUT} disabled:opacity-50`}
              />
            </label>
            <label className={LABEL}>
              Fine
              <input
                type="datetime-local"
                value={form.endsAt}
                onChange={(changed) => update({ endsAt: changed.target.value })}
                className={DATE_INPUT}
              />
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
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
              {event && !locked && (
                <button
                  type="button"
                  onClick={() => update({ startsAt: toRomeInput(event.starts_at), endsAt: toRomeInput(event.ends_at) })}
                  className="min-h-11 bg-panel px-2 text-sm font-bold"
                >
                  Come l&apos;evento
                </button>
              )}
            </div>
          </>
        )}

        {step === "mode" && (
          <fieldset disabled={locked} className="flex min-w-0 flex-col gap-2 disabled:opacity-50">
            <legend className="sr-only">Modalità e avversari</legend>
            <span className={SUBLABEL}>Modalità di base</span>
            <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Modalità di base">
              {CHALLENGE_FORMATS.map((format) => (
                <button
                  key={format.key}
                  type="button"
                  role="radio"
                  aria-checked={form.format === format.key}
                  onClick={() => update({ format: format.key })}
                  className={`flex min-h-12 flex-col items-start justify-center border-2 px-3 text-left ${
                    form.format === format.key ? "border-comic-yellow bg-comic-yellow text-black" : "border-line bg-panel"
                  }`}
                >
                  <span className="font-display text-lg uppercase leading-5">{format.label}</span>
                  <span className="text-xs font-bold">{format.detail}</span>
                </button>
              ))}
            </div>
            <span className={SUBLABEL}>Contro i bot · nessuno = solo online</span>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Bot permessi">
              {BOTS.map((bot) => (
                <Chip
                  key={bot}
                  active={form.bots.includes(bot)}
                  onClick={() => update({ bots: BOTS.filter((entry) => (entry === bot ? !form.bots.includes(bot) : form.bots.includes(entry))) })}
                >
                  {DIFFICULTY_LABELS[bot]}
                </Chip>
              ))}
            </div>
            <Toggle checked={form.botFollowsRules} onChange={(botFollowsRules) => update({ botFollowsRules })}>
              Il bot gioca con le stesse regole
            </Toggle>
            <Toggle checked={form.online} onChange={(online) => update({ online })}>
              Anche online: avversario casuale e codice amico
            </Toggle>
            <p className="text-xs font-medium leading-4 text-muted">
              Online la sfida ha una coda sua: si incontrano solo i giocatori della sfida, ed entrambe le squadre rispettano le
              regole. Dopo {limits.onlineBotAfterSeconds} secondi senza avversari la pagina d&apos;attesa propone i bot della sfida.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <label className={LABEL}>
                Dal livello · vuoto = tutti
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={limits.maxMinLevel}
                  value={form.minLevel}
                  onChange={(changed) => update({ minLevel: changed.target.value })}
                  placeholder="Tutti"
                  className={`${SMALL_INPUT} placeholder:text-faint`}
                />
              </label>
              {isQuadrant(form.format) && (
                <label className={LABEL}>
                  Sigilli · proposta {seal.suggested}
                  <input
                    type="number"
                    inputMode="numeric"
                    min={seal.min}
                    max={seal.max}
                    value={form.sealTarget}
                    onChange={(changed) => update({ sealTarget: changed.target.value })}
                    placeholder="Nessuno"
                    className={`${SMALL_INPUT} placeholder:text-faint`}
                  />
                </label>
              )}
            </div>
          </fieldset>
        )}

        {step === "rules" && (
          <fieldset disabled={locked} className="flex min-w-0 flex-col gap-1.5 disabled:opacity-50">
            <legend className="mb-1 text-sm font-bold">Chi può giocare</legend>
            <span className={SUBLABEL}>Rarità · nessuna scelta = tutte</span>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Rarità ammesse">
              {(reference?.rarities ?? []).map((rarity) => (
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
            <span className={SUBLABEL}>Fazione · nessuna scelta = tutte</span>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Fazioni ammesse">
              {FACTION_CODES.map((code) => (
                <Chip key={code} active={form.factions.includes(code)} onClick={() => update({ factions: toggleValue(form.factions, code) })}>
                  {FACTION_LABELS[code]}
                </Chip>
              ))}
            </div>
            {reference && reference.catalog.length > 0 && (
              <TraitFilter
                catalog={reference.catalog}
                chosen={form.traits}
                onChange={(traits) => update({ traits })}
                layout="wrap"
                label="Tratti ammessi"
                disabled={locked}
              />
            )}
            <span className={SUBLABEL}>Varianti in squadra</span>
            <div className="grid grid-cols-3 border-2 border-black text-xs font-extrabold uppercase" role="radiogroup" aria-label="Varianti">
              {(
                [
                  ["none", "Nessun obbligo"],
                  ["min", "Almeno"],
                  ["all", "Tutte"],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={form.variantMode === mode}
                  onClick={() => update({ variantMode: mode })}
                  className={`min-h-11 px-1 ${form.variantMode === mode ? "bg-comic-yellow text-black" : "bg-panel text-muted"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {form.variantMode === "min" && (
              <label className="flex items-center gap-2 text-sm font-bold">
                Almeno
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={form.format === "triple" ? 9 : isQuadrant(form.format) ? 10 : 5}
                  value={form.minVariants}
                  onChange={(changed) => update({ minVariants: changed.target.value })}
                  className="min-h-11 w-20 border-2 border-comic-yellow bg-black px-2 text-center text-base font-semibold"
                />
                varianti
              </label>
            )}
            {form.variantMode !== "none" && styles.length > 0 && (
              <>
                <span className={SUBLABEL}>Stili che contano · nessuna scelta = tutti</span>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Stili delle varianti">
                  {styles.map((style) => (
                    <Chip
                      key={style.style}
                      active={form.variantStyles.includes(style.style)}
                      onClick={() => update({ variantStyles: toggleValue(form.variantStyles, style.style) })}
                    >
                      {style.name}
                    </Chip>
                  ))}
                </div>
              </>
            )}
            <CodeListPicker
              label="Solo questi personaggi · vuoto = nessun elenco"
              cards={cards}
              chosen={form.only}
              onChange={(only) => update({ only })}
              disabled={locked}
            />
            <CodeListPicker
              label="Personaggi esclusi"
              cards={cards}
              chosen={form.banned}
              onChange={(banned) => update({ banned })}
              disabled={locked}
            />
            <Toggle checked={form.noStarters} onChange={(noStarters) => update({ noStarters })}>
              Senza carte dello starter set né carte di livello
            </Toggle>
            <RulesCount preview={preview} error={previewError} tooFew={tooFew} readyShare={readyShare} />
          </fieldset>
        )}

        {step === "rewards" && (
          <div className="flex min-w-0 flex-col gap-2">
            <fieldset disabled={locked} className="flex min-w-0 flex-col gap-2 disabled:opacity-50">
              <legend className="sr-only">Evento e punti</legend>
              <label className={LABEL}>
                Evento collegato
                <select value={form.eventId} onChange={(changed) => update({ eventId: changed.target.value })} className={INPUT}>
                  <option value="">Nessuno: solo le ricompense della sfida</option>
                  {data.events.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.title} · fino al {formatRomeDateTime(entry.ends_at)}
                    </option>
                  ))}
                </select>
              </label>
              {event ? (
                <>
                  <span className={SUBLABEL}>Punti evento per partita della sfida</span>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        ["win", "Vittoria"],
                        ["draw", "Pareggio"],
                        ["loss", "Sconfitta"],
                      ] as const
                    ).map(([outcome, label]) => (
                      <label key={outcome} className={LABEL}>
                        {label}
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={limits.maxEventPoints}
                          value={form.points[outcome]}
                          onChange={(changed) => update({ points: { ...form.points, [outcome]: changed.target.value } })}
                          className={SMALL_INPUT}
                        />
                      </label>
                    ))}
                  </div>
                  <p className="text-xs font-medium leading-4 text-muted">
                    Valgono al posto della riga dell&apos;evento per quel tipo di partita, senza i suoi personaggi ammessi: le regole
                    della sfida bastano. Bonus varianti, tetto giornaliero, traguardi e classifica vengono dall&apos;evento. La sfida
                    deve stare dentro le sue date.
                  </p>
                </>
              ) : (
                <p className="text-xs font-medium leading-4 text-muted">
                  Senza evento le partite danno la riga «Sfide a tema» di Ricompense partite e, se c&apos;è un evento in corso, i suoi
                  punti come qualsiasi partita.
                </p>
              )}
            </fieldset>
            <label className={LABEL}>
              Partite al giorno · vuoto = illimitate
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={limits.maxDailyLimit}
                value={form.dailyLimit}
                onChange={(changed) => update({ dailyLimit: changed.target.value })}
                disabled={locked}
                placeholder="Illimitate"
                className={`${SMALL_INPUT} placeholder:text-faint disabled:opacity-50`}
              />
            </label>
            <fieldset disabled={locked} className="flex min-w-0 flex-col gap-2 disabled:opacity-50">
              <legend className="mb-1 text-sm font-bold">Premio della sfida · vittorie nella sfida</legend>
              {form.tiers.length === 0 && (
                <p className="text-xs font-medium leading-4 text-muted">Nessun premio: la sfida dà solo le ricompense delle partite.</p>
              )}
              {form.tiers.map((tier, index) => (
                <TierEditor
                  key={index}
                  index={index}
                  tier={tier}
                  cards={cards}
                  onChange={(patch) => updateTier(index, patch)}
                  onRemove={() => update({ tiers: form.tiers.filter((_, i) => i !== index) })}
                />
              ))}
              {!winsGrow && <p className="text-xs font-bold text-comic-magenta">Ogni traguardo deve chiedere più vittorie del precedente.</p>}
              {form.tiers.length < limits.maxTiers && (
                <button
                  type="button"
                  onClick={() =>
                    update({
                      tiers: [
                        ...form.tiers,
                        {
                          wins: String(form.tiers.length === 0 ? 1 : number(form.tiers[form.tiers.length - 1].wins) * 2 + 1),
                          coins: "50",
                          packs: "",
                          cards: [],
                          random: null,
                        },
                      ],
                    })
                  }
                  className="min-h-11 border-2 border-dashed border-line px-3 text-left text-sm font-bold text-comic-yellow"
                >
                  + Aggiungi un traguardo
                </button>
              )}
            </fieldset>
          </div>
        )}

        {step === "preview" && (
          <div className="flex min-w-0 flex-col gap-2">
            <span className={SUBLABEL}>Così la vedono i giocatori</span>
            <div
              className={`relative flex min-h-16 w-1/2 flex-col justify-between px-3 py-1.5 text-black ${
                form.format === "triple"
                  ? "bg-comic-yellow"
                  : form.format === "boss"
                    ? "bg-comic-orange"
                    : isQuadrant(form.format)
                      ? "bg-comic-cyan"
                      : "bg-comic-magenta"
              }`}
            >
              <span className="-skew-x-8 font-display text-[22px] uppercase leading-6">
                {CHALLENGE_FORMATS.find((format) => format.key === form.format)?.label}
              </span>
              <span className="flex">
                <ChallengeRibbon color={form.color} />
              </span>
            </div>
            <ChallengeCard challenge={shown} now={now} disabled />
            <span className={SUBLABEL}>Controlli</span>
            <ul className="flex flex-col gap-1 text-[13px] font-bold leading-4">
              <Check ok={preview !== null && !tooFew}>
                {preview ? `${preview.admitted} personaggi ammessi (servono ${preview.team_size})` : "Conteggio in corso…"}
              </Check>
              {preview && preview.variants_needed > 0 && (
                <Check ok={preview.admitted_with_variant >= preview.variants_needed}>
                  {preview.admitted_with_variant} con una variante che conta (ne servono {preview.variants_needed})
                </Check>
              )}
              {readyShare !== null && (
                <Check ok={readyShare >= 25} warn>
                  Oggi possono formare la squadra {preview!.players_ready} giocatori su {preview!.players_total} ({readyShare}%)
                </Check>
              )}
              <Check ok={form.bots.length > 0 || form.online}>
                {form.bots.length > 0
                  ? `Bot: ${form.bots.map((bot) => DIFFICULTY_LABELS[bot]).join(", ")}${form.online ? " · anche online" : ""}`
                  : form.online
                    ? "Solo online"
                    : "Scegli almeno un bot, oppure l'online"}
              </Check>
              {event && (
                <Check ok={startsAt >= Date.parse(event.starts_at) && endsAt <= Date.parse(event.ends_at)}>Dentro le date dell&apos;evento</Check>
              )}
              {form.tiers.length > 0 && <Check ok={winsGrow}>{form.tiers.length === 1 ? "1 traguardo" : `${form.tiers.length} traguardi`} di premio</Check>}
              <Check ok={overlap === null}>
                {overlap ? `In queste date c'è già «${overlap.title}» nella stessa modalità` : "Nessun'altra sfida nella stessa modalità"}
              </Check>
            </ul>
            <p className="text-xs font-medium leading-4 text-muted">Dopo l&apos;inizio cambiano solo titolo, descrizione e fine.</p>
          </div>
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-1.5">
        {error && <p className="text-sm font-bold text-comic-magenta">{error}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="btn btn-primary flex-1">
            {saving ? "Salvataggio…" : form.id ? "Salva" : "Crea la sfida"}
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

function Toggle({ checked, onChange, children }: { checked: boolean; onChange: (checked: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex min-h-11 items-center justify-between gap-3 bg-panel px-3 text-sm font-bold">
      {children}
      <input
        type="checkbox"
        checked={checked}
        onChange={(changed) => onChange(changed.target.checked)}
        className="h-6 w-6 shrink-0 accent-comic-yellow"
      />
    </label>
  );
}

/** Characters by code: a search, the matches to tap, the chosen ones as chips that a tap removes. */
function CodeListPicker({
  label,
  cards,
  chosen,
  onChange,
  disabled,
}: {
  label: string;
  cards: readonly AdminChallengeCard[];
  chosen: string[];
  onChange: (next: string[]) => void;
  disabled: boolean;
}) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const found =
    needle.length < 2
      ? []
      : cards.filter((card) => !chosen.includes(card.code) && (card.name.toLowerCase().includes(needle) || card.code.toLowerCase() === needle)).slice(0, 6);
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className={SUBLABEL}>{label}</span>
      {chosen.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {chosen.map((code) => (
            <li key={code}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(chosen.filter((entry) => entry !== code))}
                aria-label={`Togli ${cards.find((card) => card.code === code)?.name ?? code}`}
                className="min-h-9 bg-black px-2.5 text-sm font-bold"
              >
                {cards.find((card) => card.code === code)?.name ?? code} ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        value={query}
        onChange={(changed) => setQuery(changed.target.value)}
        disabled={disabled}
        placeholder="Cerca per nome o codice"
        aria-label={`${label}: cerca`}
        className="min-h-11 w-full min-w-0 border-2 border-line bg-black px-3 text-sm font-semibold placeholder:text-faint"
      />
      {found.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {found.map((card) => (
            <li key={card.code}>
              <button
                type="button"
                onClick={() => {
                  onChange([...chosen, card.code]);
                  setQuery("");
                }}
                className="min-h-9 border-2 border-line px-2.5 text-sm font-bold"
              >
                + {card.name} <span className="text-faint">· {card.rarity}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** A prize target: the wins it asks, and the rewards of a bonus code. */
function TierEditor({
  index,
  tier,
  cards,
  onChange,
  onRemove,
}: {
  index: number;
  tier: TierForm;
  cards: AdminChallengeCard[];
  onChange: (patch: Partial<TierForm>) => void;
  onRemove: () => void;
}) {
  const reference = useAdminCardReference();
  return (
    <div className="flex flex-col gap-2 bg-panel p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-display text-lg uppercase">Traguardo {index + 1}</p>
        <button type="button" onClick={onRemove} className="min-h-11 px-2 text-sm font-bold underline">
          Togli
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <label className={LABEL}>
          Vittorie
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={limits.maxTierWins}
            value={tier.wins}
            onChange={(changed) => onChange({ wins: changed.target.value })}
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
            onChange={(changed) => onChange({ coins: changed.target.value })}
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
            onChange={(changed) => onChange({ packs: changed.target.value })}
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
        label="Carte"
      />
      {tier.cards.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {tier.cards.map((cardCode, cardIndex) => {
            const [code, style] = cardCode.split(":");
            const card = cards.find((entry) => entry.code === code);
            const label = `${card?.name ?? code}${style ? ` · ${card?.variants.find((v) => v.style === style)?.name ?? style}` : ""}`;
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
        rarities={reference?.rarities ?? []}
      />
    </div>
  );
}

/** The live count of the rules step: red under a squad, yellow under the warning. */
function RulesCount({
  preview,
  error,
  tooFew,
  readyShare,
}: {
  preview: ChallengePreview | null;
  error: string | null;
  tooFew: boolean;
  readyShare: number | null;
}) {
  if (error) return <p className="text-xs font-bold text-comic-magenta">{error}</p>;
  if (!preview) return <p className="text-xs font-semibold text-muted">Conteggio dei personaggi…</p>;
  const color = tooFew ? "text-comic-magenta" : preview.admitted < limits.warnBelow ? "text-comic-yellow" : "text-comic-cyan";
  return (
    <div className="mt-1 flex flex-col gap-1 border-[3px] border-black bg-panel-raised px-3 py-2">
      <p className="flex items-baseline gap-2">
        <span className={`font-display text-[30px] leading-8 ${color}`}>{preview.admitted}</span>
        <span className="text-sm font-bold">personaggi ammessi</span>
      </p>
      {preview.variants_needed > 0 && (
        <p className="text-xs font-semibold leading-4 text-muted">
          {preview.admitted_with_variant} hanno una variante che conta; la squadra ne vuole {preview.variants_needed}.
        </p>
      )}
      {readyShare !== null && (
        <>
          <p className="text-xs font-semibold leading-4 text-muted">
            Oggi possono formare la squadra <b className="text-foreground">{preview.players_ready}</b> giocatori su{" "}
            {preview.players_total} ({readyShare}%).
          </p>
          <div className="h-2 border border-black bg-black" aria-hidden>
            <div className="h-full bg-comic-cyan" style={{ width: `${readyShare}%` }} />
          </div>
        </>
      )}
      <p className={`text-xs font-semibold leading-4 ${tooFew ? "text-comic-magenta" : "text-muted"}`}>
        {tooFew
          ? `Non bastano per una squadra da ${preview.team_size}: la sfida non si salva.`
          : preview.admitted < limits.warnBelow
            ? `Sotto i ${limits.warnBelow} pochi giocatori riescono a formare la squadra.`
            : "In una categoria basta uno dei tratti scelti, tra categorie servono tutti."}
      </p>
    </div>
  );
}

function Check({ ok, warn = false, children }: { ok: boolean; warn?: boolean; children: ReactNode }) {
  return (
    <li className={`flex gap-1.5 ${ok ? "text-comic-cyan" : warn ? "text-comic-yellow" : "text-comic-magenta"}`}>
      <span aria-hidden>{ok ? "✓" : "!"}</span>
      <span className="min-w-0">{children}</span>
    </li>
  );
}

function ChallengeRow({
  challenge,
  now,
  onChange,
  onEdit,
  onCopy,
}: {
  challenge: AdminChallenge;
  now: number;
  onChange: (next: AdminChallenges) => void;
  onEdit: () => void;
  onCopy: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const state = adminChallengeState(challenge, now);
  const over = Date.parse(challenge.ends_at) <= now;
  const format = CHALLENGE_FORMATS.find((entry) => entry.key === challenge.format)?.label ?? challenge.format;
  const opponents = [
    challenge.bot_difficulties.length > 0
      ? `bot ${challenge.bot_difficulties.map((bot) => DIFFICULTY_LABELS[bot]).join(", ")}${challenge.bot_follows_rules ? " (stesse regole)" : ""}`
      : null,
    challenge.online ? "online" : null,
  ]
    .filter(Boolean)
    .join(" e ");

  async function run(action: () => Promise<AdminChallenges>) {
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
    <li className="flex flex-col gap-1 border-l-8 bg-panel px-3 py-2" style={{ borderColor: challenge.color }}>
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 break-words font-display text-xl uppercase leading-6">{challenge.title}</p>
        <span className={`shrink-0 text-xs font-bold uppercase ${state === "In corso" ? "text-comic-cyan" : "text-muted"}`}>{state}</span>
      </div>
      <p className="text-xs font-medium leading-4 text-muted">
        {format} · {opponents} · dal {formatRomeDateTime(challenge.starts_at)} al {formatRomeDateTime(challenge.ends_at)}
        {challenge.daily_limit !== null && ` · ${challenge.daily_limit} partite al giorno`}
        {challenge.min_level != null && ` · dal livello ${challenge.min_level}`}
        {challenge.quadrant_seal_target != null && ` · traguardo ${challenge.quadrant_seal_target} Sigilli`}
        {challenge.event && challenge.event_points && ` · evento «${challenge.event.title}» ${describeChallengePoints(challenge.event_points)}`}
      </p>
      <ChallengeRuleChips challenge={challenge} />
      {(challenge.tiers ?? []).length > 0 && (
        <ol className="flex flex-col gap-0.5 text-xs font-semibold">
          {(challenge.tiers ?? []).map((tier) => (
            <li key={tier.tier}>
              {tier.wins} {tier.wins === 1 ? "vittoria" : "vittorie"}: {describeChallengeTierReward(tier) || describeRandomVariants(tier.random_variants_info)}
              <span className="text-muted"> · raggiunto da {tier.reached_by}</span>
            </li>
          ))}
        </ol>
      )}
      <p className="text-xs font-semibold">
        {challenge.matches === 1 ? "1 partita" : `${challenge.matches} partite`} ·{" "}
        {challenge.players === 1 ? "1 giocatore" : `${challenge.players} giocatori`} · {challenge.admitted_characters} personaggi ammessi
      </p>
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
            onClick={() => run(() => setChallengeActive(challenge.id, !challenge.is_active))}
            disabled={saving}
            className="flex min-h-11 items-center text-sm font-bold underline disabled:opacity-60"
          >
            {challenge.is_active ? "Disattiva" : "Riattiva"}
          </button>
        )}
        {challenge.matches === 0 &&
          (confirmDelete ? (
            <button
              type="button"
              onClick={() => run(() => deleteChallenge(challenge.id))}
              disabled={saving}
              className="flex min-h-11 items-center text-sm font-bold text-comic-magenta underline"
            >
              Conferma eliminazione
            </button>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className="flex min-h-11 items-center text-sm font-bold underline">
              Elimina
            </button>
          ))}
      </div>
      {error && <p className="text-sm font-bold text-comic-magenta">{error}</p>}
    </li>
  );
}
