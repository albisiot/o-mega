"use client";

import { useState, type FormEvent } from "react";
import { AdminCardPicker, useAdminCardReference } from "@/components/admin-card-filter";
import { BackLink, TabBar } from "@/components/comic-parts";
import { RandomVariantsField } from "@/components/random-variants-field";
import { balance } from "@/config/balance";
import {
  METRICS,
  cleanParams,
  deleteAdminAchievement,
  describeAdminReward,
  describeCondition,
  fixedTarget,
  grantAdminAchievement,
  metricInfo,
  moveInOrder,
  paramsProblem,
  previewAdminAchievement,
  reorderAdminAchievements,
  romeDay,
  saveAdminAchievement,
  setAdminAchievementActive,
  type AchievementDraft,
  type AchievementMetric,
  type AdminAchievement,
  type AdminAchievements,
  type ParamField,
} from "@/lib/achievement-admin";
import { TIERS, TIER_COLORS, TIER_LABELS, type AchievementTier } from "@/lib/achievements";
import { describeServerError } from "@/lib/errors";
import type { RandomVariantsRule } from "@/lib/random-variants";
import { DIFFICULTY_LABELS } from "@/lib/match";
import { useLockedScreen } from "@/lib/use-locked-screen";

const INPUT = "min-h-12 w-full min-w-0 max-w-full border-2 border-comic-yellow bg-black px-3 text-base font-semibold";
const LABEL = "flex min-w-0 flex-col gap-1 text-sm font-bold";
const ACTION = "min-h-11 px-1 text-[13px] font-extrabold uppercase underline";
const romeDate = new Intl.DateTimeFormat("it-IT", { dateStyle: "short", timeZone: "Europe/Rome" });

/** The server's limit on the reward cards of an achievement (admin_save_achievement). */
const MAX_REWARD_CARDS = 5;

function namers(data: AdminAchievements) {
  return {
    trait: (code: string) => data.traits.find((t) => t.code === code)?.name ?? code,
    style: (code: string) => data.styles.find((s) => s.style === code)?.name ?? code,
    chapter: (chapter: number) => {
      const found = data.chapters.find((c) => c.chapter === chapter);
      return found ? `${found.number} della stagione ${found.season}` : String(chapter);
    },
  };
}

/**
 * The catalog of the Imprese, for admins: the board in order, and the form to add or change
 * one. Every action is checked again on the server.
 */
export function AchievementAdmin({ data, onChange }: { data: AdminAchievements; onChange: (next: AdminAchievements) => void }) {
  useLockedScreen(true);
  const [tab, setTab] = useState<"list" | "form">("list");
  const [editing, setEditing] = useState<AdminAchievement | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const active = data.achievements.filter((a) => a.is_active).length;
  const ids = data.achievements.map((a) => a.id);

  return (
    <div className="game-shell">
      <header className="flex shrink-0 items-center gap-2.5 px-3 pb-1 pt-2">
        <BackLink href="/editor" label="Torna all'Editor" />
        <h1 className="font-display text-[32px] uppercase leading-10 text-comic-yellow">Imprese</h1>
      </header>
      <main className="flex min-h-0 flex-1 flex-col gap-2 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-1">
        <TabBar
          tabs={[
            { key: "list", label: `Elenco (${active}/${data.achievements.length})` },
            { key: "form", label: editing ? "Modifica" : "Nuova" },
          ]}
          current={tab}
          onPick={(next) => {
            setTab(next);
            setNotice(null);
            if (next === "list") setEditing(null);
          }}
          label="Gestione imprese"
        />
        <div aria-live="polite" className="shrink-0 empty:hidden">
          {notice && <p className="bg-panel px-3 py-2 text-sm font-bold">{notice}</p>}
        </div>
        {tab === "list" ? (
          <div role="tabpanel" className="flex min-h-0 flex-1 flex-col gap-1 -mx-1 overflow-y-auto overscroll-contain px-1">
            <ol className="flex flex-col gap-1">
              {data.achievements.map((achievement, index) => (
                <AchievementRow
                  key={achievement.id}
                  achievement={achievement}
                  data={data}
                  first={index === 0}
                  last={index === data.achievements.length - 1}
                  onMove={(step) => reorderAdminAchievements(moveInOrder(ids, achievement.id, step))}
                  onChange={(next, message) => {
                    onChange(next);
                    setNotice(message);
                  }}
                  onEdit={() => {
                    setEditing(achievement);
                    setNotice(null);
                    setTab("form");
                  }}
                />
              ))}
            </ol>
            <p className="shrink-0 pt-1 text-xs font-medium leading-4 text-muted">
              I giocatori vedono solo grado e indizio finché non compiono l&apos;impresa. Chi l&apos;ha già compiuta la tiene
              com&apos;era, con nome e premio di quel momento, anche se la modifichi o la disattivi. Un&apos;impresa già
              compiuta non si elimina, si disattiva. Le partite abbandonate non contano mai.
            </p>
          </div>
        ) : (
          <AchievementForm
            key={editing?.id ?? "new"}
            editing={editing}
            data={data}
            onSaved={(next) => {
              onChange(next);
              setNotice(editing ? "Impresa modificata." : "Impresa aggiunta.");
              setEditing(null);
              setTab("list");
            }}
          />
        )}
      </main>
    </div>
  );
}

function AchievementRow({
  achievement,
  data,
  first,
  last,
  onMove,
  onChange,
  onEdit,
}: {
  achievement: AdminAchievement;
  data: AdminAchievements;
  first: boolean;
  last: boolean;
  onMove: (step: -1 | 1) => Promise<AdminAchievements>;
  onChange: (next: AdminAchievements, message: string) => void;
  onEdit: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [granting, setGranting] = useState(false);
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const share = data.players > 0 ? Math.round((achievement.completed / data.players) * 100) : 0;

  const run = (action: () => Promise<AdminAchievements>, message: string) => {
    setBusy(true);
    setError(null);
    action()
      .then((next) => {
        onChange(next, message);
        setGranting(false);
        setUsername("");
      })
      .catch((cause: unknown) => setError(describeServerError(cause)))
      .finally(() => {
        setBusy(false);
        setConfirming(false);
      });
  };

  return (
    <li className={`flex flex-col gap-1 bg-panel px-3 py-2 ${achievement.is_active ? "" : "opacity-60"}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 font-display text-[17px] uppercase leading-5">
          <span
            className="mr-1.5 inline-block -skew-x-8 px-1 text-[11px] font-extrabold leading-4 text-black"
            style={{ backgroundColor: TIER_COLORS[achievement.tier] }}
          >
            {TIER_LABELS[achievement.tier]}
          </span>
          {achievement.name}
        </p>
        <span
          className={`shrink-0 px-1.5 text-[11px] font-extrabold uppercase leading-5 ${
            achievement.is_active ? "bg-comic-cyan text-black" : "bg-black text-muted"
          }`}
        >
          {achievement.is_active ? "Attiva" : "Disattivata"}
        </span>
      </div>
      <p className="text-xs font-semibold leading-4">{describeCondition(achievement.metric, achievement.params, achievement.target, namers(data))}</p>
      <p className="text-xs font-semibold leading-4 text-muted">
        {achievement.hint ? `Indizio: «${achievement.hint}»` : "Nessun indizio"} ·{" "}
        <span className="text-comic-yellow">{describeAdminReward(achievement, data)}</span>
      </p>
      <p className="text-xs font-semibold leading-4 text-muted">
        Compiuta da {achievement.completed} su {data.players} ({share}%) ·{" "}
        {achievement.counts_past ? "conta anche il passato" : `conta dal ${romeDate.format(new Date(achievement.counts_from ?? ""))}`}
        {achievement.available_until ? ` · fino al ${romeDate.format(new Date(achievement.available_until))}` : ""}
      </p>
      {error && <p className="text-xs font-bold text-comic-magenta">{error}</p>}
      {granting && (
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            run(() => grantAdminAchievement(achievement.id, username), `Impresa data a ${username.trim()}.`);
          }}
        >
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Nome del giocatore"
            aria-label="Nome del giocatore"
            autoCapitalize="off"
            spellCheck={false}
            required
            className={INPUT}
          />
          <button type="submit" disabled={busy} className="btn btn-primary shrink-0 px-3">
            Dai
          </button>
        </form>
      )}
      <div className="flex flex-wrap items-center justify-end gap-x-3">
        <button
          type="button"
          aria-label="Sposta su"
          disabled={busy || first}
          onClick={() => run(() => onMove(-1), "Ordine cambiato.")}
          className="min-h-11 min-w-11 font-display text-xl disabled:text-muted"
        >
          ↑
        </button>
        <button
          type="button"
          aria-label="Sposta giù"
          disabled={busy || last}
          onClick={() => run(() => onMove(1), "Ordine cambiato.")}
          className="min-h-11 min-w-11 font-display text-xl disabled:text-muted"
        >
          ↓
        </button>
        <button type="button" onClick={onEdit} disabled={busy} className={ACTION}>
          Modifica
        </button>
        <button type="button" onClick={() => setGranting(!granting)} disabled={busy} className={`${ACTION} text-comic-yellow`}>
          {granting ? "Annulla" : "Dai a mano"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            run(
              () => setAdminAchievementActive(achievement.id, !achievement.is_active),
              achievement.is_active ? "Impresa disattivata: chi l'ha compiuta la tiene." : "Impresa riattivata.",
            )
          }
          className={`${ACTION} text-comic-cyan`}
        >
          {achievement.is_active ? "Disattiva" : "Riattiva"}
        </button>
        {achievement.completed === 0 && (
          <button
            type="button"
            disabled={busy}
            onClick={() => (confirming ? run(() => deleteAdminAchievement(achievement.id), "Impresa eliminata.") : setConfirming(true))}
            className={`${ACTION} text-comic-magenta`}
          >
            {confirming ? "Conferma eliminazione" : "Elimina"}
          </button>
        )}
      </div>
    </li>
  );
}

/** The form's raw values of the filters: strings, flags and lists, cleaned before sending. */
function rawParams(params: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [
      key,
      typeof value === "number" || (key === "story" && typeof value === "boolean") ? String(value) : value,
    ]),
  );
}

function AchievementForm({
  editing,
  data,
  onSaved,
}: {
  editing: AdminAchievement | null;
  data: AdminAchievements;
  onSaved: (next: AdminAchievements) => void;
}) {
  const [metric, setMetric] = useState<AchievementMetric>(editing?.metric ?? "matches_won");
  const [raw, setRaw] = useState<Record<string, unknown>>(rawParams(editing?.params ?? {}));
  const [target, setTarget] = useState(String(editing?.target ?? 1));
  const [tier, setTier] = useState<AchievementTier>(editing?.tier ?? "bronze");
  const [name, setName] = useState(editing?.name ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [descriptionTouched, setDescriptionTouched] = useState(editing !== null);
  const [hint, setHint] = useState(editing?.hint ?? "");
  const [coins, setCoins] = useState(String(editing?.coins ?? balance.achievements.suggestedReward.bronze.coins));
  const [packs, setPacks] = useState(String(editing?.packs ?? balance.achievements.suggestedReward.bronze.packs));
  const [rewardTouched, setRewardTouched] = useState(editing !== null);
  const [cards, setCards] = useState<string[]>(editing?.card_codes ?? []);
  const [randomVariants, setRandomVariants] = useState<RandomVariantsRule | null>(editing?.random_variants ?? null);
  const reference = useAdminCardReference();
  const [title, setTitle] = useState(editing?.title ?? "");
  const [countsPast, setCountsPast] = useState(editing?.counts_past ?? true);
  const [until, setUntil] = useState(editing?.available_until ? romeDay(editing.available_until) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const info = metricInfo(metric);
  const params = cleanParams(metric, raw);
  const fixed = fixedTarget(metric, params);
  const targetNumber = fixed ? 1 : Number(target);
  const suggested = describeCondition(metric, params, targetNumber || 1, namers(data));
  const shownDescription = descriptionTouched ? description : suggested;
  const groups = [...new Set(METRICS.map((m) => m.group))];

  const draft = (): AchievementDraft => ({
    name: name.trim(),
    description: shownDescription.trim(),
    hint: hint.trim(),
    tier,
    metric,
    params,
    target: targetNumber,
    coins: Number(coins) || 0,
    packs: Number(packs) || 0,
    card_codes: cards,
    random_variants: randomVariants,
    title: title.trim(),
    counts_past: countsPast,
    until,
    counts_from: editing?.counts_from ?? null,
  });

  const pickTier = (next: AchievementTier) => {
    setTier(next);
    if (!rewardTouched) {
      setCoins(String(balance.achievements.suggestedReward[next].coins));
      setPacks(String(balance.achievements.suggestedReward[next].packs));
    }
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    const problem = paramsProblem(metric, params);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      onSaved(await saveAdminAchievement(editing?.id ?? null, draft()));
    } catch (cause) {
      setError(describeServerError(cause));
      setSaving(false);
    }
  }

  const runPreview = () => {
    const problem = paramsProblem(metric, params);
    if (problem) {
      setPreview(problem);
      return;
    }
    setPreview("Calcolo…");
    previewAdminAchievement(draft())
      .then((result) => setPreview(`Oggi la otterrebbero ${result.would_complete} giocatori su ${result.players}.`))
      .catch((cause: unknown) => setPreview(describeServerError(cause)));
  };

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex min-h-0 flex-1 flex-col gap-3 -mx-1 overflow-y-auto overscroll-contain px-1">
        <label className={LABEL}>
          Cosa conta
          <select
            value={metric}
            onChange={(event) => {
              setMetric(event.target.value as AchievementMetric);
              setRaw({});
              setPreview(null);
            }}
            className={INPUT}
          >
            {groups.map((group) => (
              <optgroup key={group} label={group}>
                {METRICS.filter((m) => m.group === group).map((m) => (
                  <option key={m.metric} value={m.metric}>
                    {m.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        {info.fields.map((field) => (
          <ParamInput
            key={field.key}
            field={field}
            value={raw[field.key]}
            data={data}
            onChange={(value) => {
              setRaw({ ...raw, [field.key]: value });
              setPreview(null);
            }}
          />
        ))}

        {!fixed && (
          <label className={LABEL}>
            Quanti{info.unit ? ` (${info.unit})` : ""}
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={1000000}
              required
              value={target}
              onChange={(event) => {
                setTarget(event.target.value);
                setPreview(null);
              }}
              className={INPUT}
            />
          </label>
        )}

        {info.hasDates ? (
          <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={countsPast}
              onChange={(event) => setCountsPast(event.target.checked)}
              className="size-5 accent-[var(--comic-yellow)]"
            />
            Conta anche quello che i giocatori hanno già fatto
          </label>
        ) : (
          <p className="text-xs font-medium text-muted">Guarda cosa hanno i giocatori adesso: chi lo ha già la ottiene subito.</p>
        )}

        <fieldset className="flex flex-col gap-1">
          <legend className="text-sm font-bold">Grado</legend>
          {/* Inset: the slanted buttons would stick out of the form and let it slide sideways. */}
          <div className="mt-1 grid grid-cols-[repeat(4,minmax(0,1fr))] gap-1.5 px-1">
            {TIERS.map((entry) => (
              <button
                key={entry}
                type="button"
                aria-pressed={tier === entry}
                onClick={() => pickTier(entry)}
                className={`min-h-11 -skew-x-8 font-display text-[15px] uppercase ${tier === entry ? "text-black" : "bg-panel text-muted"}`}
                style={tier === entry ? { backgroundColor: TIER_COLORS[entry] } : undefined}
              >
                {TIER_LABELS[entry]}
              </button>
            ))}
          </div>
        </fieldset>

        <label className={LABEL}>
          Nome
          <input type="text" required minLength={2} maxLength={60} value={name} onChange={(event) => setName(event.target.value)} className={INPUT} />
        </label>
        <label className={LABEL}>
          Cosa ha fatto il giocatore (si legge dopo)
          <textarea
            required
            minLength={2}
            maxLength={200}
            rows={2}
            value={shownDescription}
            onChange={(event) => {
              setDescription(event.target.value);
              setDescriptionTouched(true);
            }}
            className={`${INPUT} py-2`}
          />
        </label>
        <label className={LABEL}>
          Indizio (facoltativo, si legge prima)
          <input type="text" maxLength={120} value={hint} onChange={(event) => setHint(event.target.value)} className={INPUT} />
        </label>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-sm font-bold">Premio (tutto a zero: solo la medaglia)</legend>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <label className={LABEL}>
              Monete
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={100000}
                value={coins}
                onChange={(event) => {
                  setCoins(event.target.value);
                  setRewardTouched(true);
                }}
                className={INPUT}
              />
            </label>
            <label className={LABEL}>
              Pacchetti (0–10)
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={10}
                value={packs}
                onChange={(event) => {
                  setPacks(event.target.value);
                  setRewardTouched(true);
                }}
                className={INPUT}
              />
            </label>
          </div>
          <AdminCardPicker
            cards={data.cards}
            chosen={cards}
            onChange={setCards}
            max={MAX_REWARD_CARDS}
            reference={reference}
            label="Carte"
          />
          {cards.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {cards.map((code, index) => {
                const [cardCode, style] = code.split(":");
                const card = data.cards.find((c) => c.code === cardCode);
                const variant = card?.variants.find((v) => v.style === style);
                const label = `${card?.name ?? cardCode}${variant ? ` (${variant.name})` : ""}`;
                return (
                  <li key={`${code}-${index}`}>
                    <button
                      type="button"
                      onClick={() => setCards(cards.filter((_, i) => i !== index))}
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
            value={randomVariants}
            onChange={setRandomVariants}
            styles={data.styles}
            rarities={data.rarities ?? reference?.rarities ?? []}
          />
          <label className={LABEL}>
            Titolo da mostrare (facoltativo)
            <input type="text" maxLength={30} value={title} onChange={(event) => setTitle(event.target.value)} className={INPUT} />
          </label>
        </fieldset>

        <label className={LABEL}>
          Ottenibile fino al giorno (facoltativo)
          <input type="date" value={until} onChange={(event) => setUntil(event.target.value)} className={`${INPUT} appearance-none`} />
        </label>

        <section className="flex flex-col gap-1.5" aria-label="Anteprima">
          <p className="text-sm font-bold">Anteprima</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col items-center gap-1 bg-panel px-2 py-2.5 text-center">
              <span
                aria-hidden
                className="flex size-12 items-center justify-center rounded-full border-[3px] border-dashed bg-black font-display text-xl text-muted"
                style={{ borderColor: TIER_COLORS[tier] }}
              >
                ?
              </span>
              <p className="font-display text-base uppercase leading-5 text-muted">???</p>
              {hint.trim() && <p className="text-xs font-semibold italic leading-4 text-muted">«{hint.trim()}»</p>}
            </div>
            <div className="flex flex-col items-center gap-1 bg-panel-raised px-2 py-2.5 text-center">
              <span
                aria-hidden
                className="flex size-12 items-center justify-center rounded-full border-[3px] border-black font-sfx text-xl text-black"
                style={{ backgroundColor: TIER_COLORS[tier] }}
              >
                ★
              </span>
              <p className="font-display text-base uppercase leading-5">{name.trim() || "Nome"}</p>
              <p className="text-xs font-semibold leading-4 text-muted">{shownDescription}</p>
              <p className="text-xs font-extrabold leading-4 text-comic-yellow">
                {describeAdminReward(
                  {
                    coins: Number(coins) || 0,
                    packs: Number(packs) || 0,
                    card_codes: cards,
                    random_variants: randomVariants,
                    title: title.trim() || null,
                  },
                  data,
                )}
              </p>
            </div>
          </div>
          {metric !== "manual" && (
            <button type="button" onClick={runPreview} className="min-h-11 self-start text-[13px] font-extrabold uppercase text-comic-cyan underline">
              Quanti la otterrebbero oggi?
            </button>
          )}
          {preview && <p className="text-sm font-bold" role="status">{preview}</p>}
        </section>
      </div>

      {error && <p className="shrink-0 text-sm font-bold text-comic-magenta">{error}</p>}
      <button type="submit" disabled={saving} className="btn btn-primary shrink-0">
        {saving ? "Salvataggio…" : editing ? "Salva le modifiche" : "Aggiungi l'impresa"}
      </button>
    </form>
  );
}

function ParamInput({
  field,
  value,
  data,
  onChange,
}: {
  field: ParamField;
  value: unknown;
  data: AdminAchievements;
  onChange: (value: unknown) => void;
}) {
  const text = value === undefined || value === null ? "" : String(value);
  switch (field.kind) {
    case "flag":
      return (
        <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={value === true} onChange={(event) => onChange(event.target.checked)} className="size-5 accent-[var(--comic-yellow)]" />
          {field.label}
        </label>
      );
    case "number":
      return (
        <label className={LABEL}>
          {field.label}
          <input type="number" inputMode="numeric" min={field.min} max={field.max} value={text} onChange={(event) => onChange(event.target.value)} className={INPUT} />
        </label>
      );
    case "date":
      return (
        <label className={LABEL}>
          {field.label}
          <input type="date" value={text} onChange={(event) => onChange(event.target.value)} className={`${INPUT} appearance-none`} />
        </label>
      );
    case "difficulties": {
      const chosen = Array.isArray(value) ? (value as string[]) : [];
      return (
        <fieldset className="flex flex-col gap-1">
          <legend className="text-sm font-bold">{field.label} (nessuna: tutte)</legend>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {(Object.keys(DIFFICULTY_LABELS) as (keyof typeof DIFFICULTY_LABELS)[]).map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={chosen.includes(key)}
                onClick={() => onChange(chosen.includes(key) ? chosen.filter((d) => d !== key) : [...chosen, key])}
                className={`min-h-11 px-3 text-sm font-bold ${chosen.includes(key) ? "bg-comic-magenta text-black" : "bg-panel text-muted"}`}
              >
                {DIFFICULTY_LABELS[key]}
              </button>
            ))}
          </div>
        </fieldset>
      );
    }
    default: {
      const options =
        field.kind === "select"
          ? field.options
          : field.kind === "trait"
            ? data.traits.map((t) => ({ value: t.code, label: `${t.name} (${t.category})` }))
            : field.kind === "style"
              ? data.styles.map((s) => ({ value: s.style, label: s.name }))
              : field.kind === "season"
                ? data.seasons.map((s) => ({ value: String(s.season), label: `Stagione ${s.season} · ${s.title}` }))
                : data.chapters.map((c) => ({ value: String(c.chapter), label: `Stagione ${c.season} · capitolo ${c.number} · ${c.title}` }));
      return (
        <label className={LABEL}>
          {field.label}
          <select value={text} onChange={(event) => onChange(event.target.value)} className={INPUT}>
            <option value="">Qualsiasi</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      );
    }
  }
}
