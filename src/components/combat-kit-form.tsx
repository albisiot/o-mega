"use client";

// EDITOR → Scontro (SPEC §5.19, docs/COMBAT.md): a character's kit as a form. One tab for each
// move and one for the passive, with the fields of the engine's data (src/lib/combat-kit-form.ts
// offers only the choices that fit), a preview in the players' words, and the kit as text for
// what the form does not reach. The page checks the kit with the engine and saves it.

import { useState, type ReactNode } from "react";
import {
  isCombatDebuff,
  type CombatEffect,
  type CombatKit,
  type CombatModifiers,
  type CombatMove,
  type CombatPassive,
  type CombatPassiveEffect,
  type CombatSlot,
  type CombatStatusCode,
} from "@o-mega/game-engine";
import { TUTORIAL_ABILITIES } from "@/config/tutorial";
import type { AbilityInfo } from "@/lib/catalog";
import { combatRules } from "@/lib/combat";
import {
  formatDecimal,
  isOffensive,
  kitShapeProblem,
  MOVE_EFFECT_CHOICES,
  moveEffectOnEnemies,
  newMoveEffect,
  newPassive,
  newPassiveEffect,
  onChoices,
  parseDecimal,
  PASSIVE_EFFECT_CHOICES,
  passiveEffectOnEnemies,
  passiveToChoices,
  RANGE_CHOICES,
  retarget,
  retrigger,
  statusChoices,
  statusFor,
  tabOfError,
  TARGET_CHOICES,
  TRIGGER_CHOICES,
  type KitTab,
} from "@/lib/combat-kit-form";
import { describeCombatMove, describeCombatPassive, SLOT_LABELS, STATUS_LABELS } from "@/lib/combat-text";

type Tab = KitTab | "text";

const TABS: { key: Tab; label: string }[] = [
  { key: "base", label: "Base" },
  { key: "special", label: "Speciale" },
  { key: "supreme", label: "Suprema" },
  { key: "passive", label: "Passiva" },
  { key: "text", label: "Testo" },
];

// Without a width: a number field sets its own, the others take the row (INPUT).
const FIELD = "min-h-10 min-w-0 rounded-md border-2 border-black bg-panel-raised px-2 text-[14px] font-bold";
const INPUT = `${FIELD} w-full`;
const SMALL = "btn btn-ghost h-9 w-9 shrink-0 px-0 text-[13px] disabled:opacity-35";

/**
 * The kit of one character as a form. `errors` are the engine's, in Italian: a tab with some is
 * marked. `abilities` names the 12 abilities (the fixed list until the database answers).
 */
export function CombatKitForm({
  kit,
  onChange,
  errors,
  abilities,
}: {
  kit: CombatKit;
  onChange: (kit: CombatKit) => void;
  errors: string[];
  abilities: AbilityInfo[];
}) {
  const [tab, setTab] = useState<Tab>("base");
  const names = abilities.length > 0 ? abilities : TUTORIAL_ABILITIES;
  const marked = new Set(errors.map((message) => tabOfError(kit, message)));
  const code = kit.base.id.split("-")[0];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div role="tablist" aria-label="Parti del kit" className="flex shrink-0 gap-1">
        {TABS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            role="tab"
            aria-selected={tab === entry.key}
            onClick={() => setTab(entry.key)}
            className={`relative min-h-10 min-w-0 flex-1 -skew-x-8 px-0.5 font-display text-[13px] uppercase ${
              tab === entry.key ? "bg-comic-magenta text-black" : "bg-panel text-muted"
            }`}
          >
            {entry.label}
            {entry.key !== "text" && marked.has(entry.key) && (
              <span aria-label="con errori" className="absolute right-1 top-1 h-2 w-2 rounded-full bg-comic-yellow" />
            )}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="-mx-1 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain px-1 pb-1">
        {tab === "text" ? (
          <KitText kit={kit} onChange={onChange} />
        ) : tab === "passive" ? (
          <PassiveFields
            passive={kit.passive ?? null}
            names={names}
            onChange={(passive) => onChange({ ...kit, passive })}
            onAdd={() => onChange({ ...kit, passive: newPassive(code, kit.base.scaling) })}
          />
        ) : (
          <MoveFields key={tab} slot={tab} move={kit[tab]} names={names} onChange={(move) => onChange({ ...kit, [tab]: move })} />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Pieces

function Field({ label, children, note }: { label: string; children: ReactNode; note?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[12px] font-extrabold leading-4">{label}</span>
      {children}
      {note && <span className="text-[11px] leading-4 text-muted">{note}</span>}
    </div>
  );
}

function Select<T extends string>({
  value,
  choices,
  onPick,
  label,
}: {
  value: T;
  choices: { value: T; label: string }[];
  onPick: (value: T) => void;
  label: string;
}) {
  return (
    <select aria-label={label} value={value} onChange={(event) => onPick(event.target.value as T)} className={INPUT}>
      {choices.map((choice) => (
        <option key={choice.value} value={choice.value}>
          {choice.label}
        </option>
      ))}
    </select>
  );
}

/** A number as it is typed (a comma or a point), kept as text until it reads as one. */
function NumberField({
  value,
  onChange,
  label,
  allowEmpty = false,
  className = "w-20",
}: {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  label: string;
  allowEmpty?: boolean;
  className?: string;
}) {
  const [text, setText] = useState(() => formatDecimal(value));
  const [seen, setSeen] = useState(value);
  // A value changed from outside (the «Testo» tab, another field): show it, unless the text says it already.
  if (!Object.is(seen, value)) {
    setSeen(value);
    if (!Object.is(parseDecimal(text), value) && !(text.trim() === "" && value === undefined)) setText(formatDecimal(value));
  }
  return (
    <input
      aria-label={label}
      inputMode="decimal"
      value={text}
      onChange={(event) => {
        const next = event.target.value;
        setText(next);
        const parsed = next.trim() === "" && allowEmpty ? undefined : parseDecimal(next);
        setSeen(parsed);
        onChange(parsed);
      }}
      className={`${FIELD} ${className} shrink-0 px-1 text-center`}
    />
  );
}

/** The abilities a move (or passive) draws on, in percent: they make 100 together. */
function ScalingFields({
  scaling,
  names,
  onChange,
  canBeEmpty = false,
}: {
  scaling: Record<string, number>;
  names: AbilityInfo[];
  onChange: (scaling: Record<string, number>) => void;
  canBeEmpty?: boolean;
}) {
  const rows = Object.entries(scaling);
  const total = rows.reduce((sum, [, weight]) => sum + (Number.isFinite(weight) ? weight : 0), 0) * 100;
  const families = [...new Map(names.map((a) => [a.family.code, a.family])).values()];
  const replace = (index: number, code: string, weight: number) =>
    onChange(Object.fromEntries(rows.map(([c, w], i) => (i === index ? [code, weight] : [c, w]))));
  const free = names.find((a) => !(a.code in scaling));
  return (
    <div className="flex flex-col gap-1">
      {rows.map(([code, weight], index) => (
        <div key={`${code}-${index}`} className="flex items-center gap-1">
          <select aria-label="Abilità" value={code} onChange={(event) => replace(index, event.target.value, weight)} className={`${INPUT} flex-1`}>
            {families.map((family) => (
              <optgroup key={family.code} label={family.name}>
                {names
                  .filter((a) => a.family.code === family.code && (a.code === code || !(a.code in scaling)))
                  .map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
          <NumberField
            label={`Peso di ${code} in percento`}
            value={Number.isFinite(weight) ? Number((weight * 100).toFixed(2)) : weight}
            onChange={(percent) => replace(index, code, percent === undefined ? Number.NaN : Number((percent / 100).toFixed(4)))}
            className="w-16"
          />
          <span className="w-3 text-[12px] font-bold">%</span>
          <button
            type="button"
            aria-label={`Togli ${code}`}
            disabled={rows.length === 1 && !canBeEmpty}
            onClick={() => onChange(Object.fromEntries(rows.filter((_, i) => i !== index)))}
            className={SMALL}
          >
            ✕
          </button>
        </div>
      ))}
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[12px] font-extrabold ${Math.abs(total - 100) < 0.01 ? "text-comic-cyan" : "text-comic-magenta"}`}>
          {rows.length === 0 ? "Nessuna abilità" : `Totale ${formatDecimal(total)}%${Math.abs(total - 100) < 0.01 ? "" : " (deve fare 100)"}`}
        </span>
        {free && (
          <button
            type="button"
            onClick={() => onChange({ ...scaling, [free.code]: Number((Math.max(0.1, (100 - total) / 100)).toFixed(4)) })}
            className="btn btn-ghost min-h-9 px-2 text-[12px]"
          >
            + Abilità
          </button>
        )}
      </div>
    </div>
  );
}

/** The family a move's damage counts against: by default its heaviest ability's. */
function FamilyField({ family, names, onChange }: { family: string | undefined; names: AbilityInfo[]; onChange: (family: string | undefined) => void }) {
  const families = [...new Map(names.map((a) => [a.family.code, a.family])).values()];
  return (
    <Field label="Tipo di danno" note="Contro quale difesa conta: di solito quella dell'abilità più pesante.">
      <Select
        label="Tipo di danno"
        value={family ?? ""}
        choices={[{ value: "", label: "Automatico" }, ...families.map((f) => ({ value: f.code, label: f.name }))]}
        onPick={(value) => onChange(value === "" ? undefined : value)}
      />
    </Field>
  );
}

function Preview({ text }: { text: string }) {
  return (
    <p className="border-l-4 border-comic-yellow bg-panel px-2 py-1.5 text-[12px] font-semibold leading-4">
      <span className="block text-[10px] font-extrabold uppercase text-faint">Come la leggono i giocatori</span>
      {text}
    </p>
  );
}

/** A preview that a half-written kit cannot break. */
function safely(describe: () => string): string {
  try {
    return describe();
  } catch {
    return "—";
  }
}

/** Arrows and a cross for one effect of a list. */
function ListButtons({ index, count, onMove, onRemove, what }: { index: number; count: number; onMove: (step: -1 | 1) => void; onRemove: () => void; what: string }) {
  return (
    <div className="flex shrink-0 gap-1">
      <button type="button" aria-label={`Sposta su ${what}`} disabled={index === 0} onClick={() => onMove(-1)} className={SMALL}>
        ↑
      </button>
      <button type="button" aria-label={`Sposta giù ${what}`} disabled={index === count - 1} onClick={() => onMove(1)} className={SMALL}>
        ↓
      </button>
      <button type="button" aria-label={`Togli ${what}`} onClick={onRemove} className={SMALL}>
        ✕
      </button>
    </div>
  );
}

function moved<T>(list: T[], index: number, step: -1 | 1): T[] {
  const next = [...list];
  [next[index], next[index + step]] = [next[index + step], next[index]];
  return next;
}

/** A status with its turns and, for a debuff, its chance on an ability. */
function StatusFields({
  status,
  turns,
  chance,
  onEnemies,
  names,
  onChange,
}: {
  status: CombatStatusCode;
  turns: number;
  chance: { base: number; ability: string } | undefined;
  onEnemies: boolean;
  names: AbilityInfo[];
  onChange: (next: { status: CombatStatusCode; turns: number; chance: { base: number; ability: string } | undefined }) => void;
}) {
  const maxTurns = combatRules().statuses.maxTurns;
  return (
    <>
      <div className="flex items-end gap-1.5">
        <div className="min-w-0 flex-1">
          <Field label="Effetto">
            <Select
              label="Effetto"
              value={status}
              choices={statusChoices(onEnemies).map((code) => ({ value: code, label: STATUS_LABELS[code].name }))}
              onPick={(next) => onChange({ status: next, turns, chance: isCombatDebuff(next) ? chance : undefined })}
            />
          </Field>
        </div>
        <Field label={`Turni (1–${maxTurns})`}>
          <NumberField label="Turni" value={turns} onChange={(n) => onChange({ status, turns: n ?? Number.NaN, chance })} className="w-16" />
        </Field>
      </div>
      {isCombatDebuff(status) && (
        <div className="flex flex-col gap-1">
          <label className="flex items-center gap-2 text-[12px] font-bold">
            <input
              type="checkbox"
              checked={chance !== undefined}
              onChange={(event) => onChange({ status, turns, chance: event.target.checked ? { base: 50, ability: names[0]?.code ?? "FOR" } : undefined })}
              className="h-5 w-5"
            />
            Non sicuro: dipende da un&apos;abilità
          </label>
          {chance && (
            <div className="flex items-center gap-1">
              <NumberField label="Probabilità di base" value={chance.base} onChange={(n) => onChange({ status, turns, chance: { ...chance, base: n ?? Number.NaN } })} className="w-16" />
              <span className="shrink-0 text-[12px] font-bold">% con</span>
              <select
                aria-label="Abilità della probabilità"
                value={chance.ability}
                onChange={(event) => onChange({ status, turns, chance: { ...chance, ability: event.target.value } })}
                className={`${INPUT} flex-1`}
              >
                {names.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {chance && <span className="text-[11px] leading-4 text-muted">Sale se la sua abilità supera quella del bersaglio, scende se è più bassa.</span>}
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// A move

function MoveFields({ slot, move, names, onChange }: { slot: CombatSlot; move: CombatMove; names: AbilityInfo[]; onChange: (move: CombatMove) => void }) {
  const offensive = isOffensive(move.target);
  const setEffect = (index: number, effect: CombatEffect) => onChange({ ...move, effects: move.effects.map((e, i) => (i === index ? effect : e)) });
  const hasDamage = move.effects.some((e) => e.kind === "damage");
  return (
    <>
      <Field label="Nome">
        <input aria-label="Nome della mossa" value={move.name} onChange={(event) => onChange({ ...move, name: event.target.value })} className={INPUT} />
      </Field>
      <Field label="Bersaglio">
        <Select label="Bersaglio" value={move.target} choices={TARGET_CHOICES} onPick={(target) => onChange(retarget(move, target))} />
      </Field>
      {offensive && (
        <Field
          label="Portata"
          note="Corpo a corpo non raggiunge la seconda linea finché la prima è in piedi; a distanza la colpisce un po' meno; l'infiltrazione in pieno."
        >
          <div role="radiogroup" aria-label="Portata" className="grid grid-cols-3 gap-1">
            {RANGE_CHOICES.map((choice) => (
              <button
                key={choice.value}
                type="button"
                role="radio"
                aria-checked={move.range === choice.value}
                onClick={() => onChange({ ...move, range: choice.value })}
                className={`btn min-h-10 px-0.5 text-[11px] ${move.range === choice.value ? "btn-primary" : "btn-ghost"}`}
              >
                {choice.label}
              </button>
            ))}
          </div>
        </Field>
      )}
      {slot === "special" && (
        <Field label="Ricarica" note="Turni suoi prima di poterla usare di nuovo (almeno 1).">
          <NumberField label="Ricarica in turni" value={move.cooldown} onChange={(n) => onChange({ ...move, cooldown: n ?? Number.NaN })} />
        </Field>
      )}
      {slot === "supreme" && <p className="text-[11px] leading-4 text-muted">La suprema si usa con la Carica piena: non ha ricarica.</p>}
      <Field label="Abilità usate" note="Quanto contano nella Potenza della mossa: danni, cure e scudi crescono con loro.">
        <ScalingFields scaling={move.scaling} names={names} onChange={(scaling) => onChange({ ...move, scaling })} />
      </Field>
      {hasDamage && <FamilyField family={move.family} names={names} onChange={(family) => onChange(withFamily(move, family))} />}
      <Field label="Cosa fa, in ordine">
        <div className="flex flex-col gap-1.5">
          {move.effects.map((effect, index) => (
            <MoveEffectCard
              key={index}
              move={move}
              effect={effect}
              names={names}
              onChange={(next) => setEffect(index, next)}
              buttons={
                <ListButtons
                  index={index}
                  count={move.effects.length}
                  what={`l'effetto ${index + 1}`}
                  onMove={(step) => onChange({ ...move, effects: moved(move.effects, index, step) })}
                  onRemove={() => onChange({ ...move, effects: move.effects.filter((_, i) => i !== index) })}
                />
              }
            />
          ))}
          <button
            type="button"
            onClick={() => onChange({ ...move, effects: [...move.effects, newMoveEffect(offensive ? "damage" : "heal", move)] })}
            className="btn btn-ghost min-h-10 px-2 text-[12px]"
          >
            + Effetto
          </button>
        </div>
      </Field>
      <Preview text={safely(() => describeCombatMove(move))} />
      <p className="text-[11px] leading-4 text-faint">
        {SLOT_LABELS[slot]} · id {move.id}
      </p>
    </>
  );
}

function withFamily<T extends { family?: string }>(item: T, family: string | undefined): T {
  const next = { ...item };
  if (family === undefined) delete next.family;
  else next.family = family;
  return next;
}

function MoveEffectCard({
  move,
  effect,
  names,
  onChange,
  buttons,
}: {
  move: CombatMove;
  effect: CombatEffect;
  names: AbilityInfo[];
  onChange: (effect: CombatEffect) => void;
  buttons: ReactNode;
}) {
  const offensive = isOffensive(move.target);
  const kinds = MOVE_EFFECT_CHOICES.filter((choice) => offensive || choice.value !== "damage");
  const onEnemies = moveEffectOnEnemies(move, effect);
  const where = onChoices(move.target);
  return (
    <div className="flex flex-col gap-1.5 rounded-md border-2 border-black bg-panel p-2">
      <div className="flex items-end gap-1">
        <div className="min-w-0 flex-1">
          <Select label="Tipo di effetto" value={effect.kind} choices={kinds} onPick={(kind) => onChange(newMoveEffect(kind, move))} />
        </div>
        {buttons}
      </div>
      <Field label="Su chi">
        <Select
          label="Su chi"
          value={effect.on}
          choices={where}
          onPick={(on) => {
            const next = { ...effect, on } as CombatEffect;
            if (next.kind === "status") {
              const enemies = moveEffectOnEnemies(move, next);
              next.status = statusFor(next.status, enemies);
              if (!isCombatDebuff(next.status)) delete next.chance;
            }
            onChange(next);
          }}
        />
      </Field>
      {effect.kind === "status" ? (
        <StatusFields
          status={effect.status}
          turns={effect.turns}
          chance={effect.chance}
          onEnemies={onEnemies}
          names={names}
          onChange={({ status, turns, chance }) => {
            const next: CombatEffect = { kind: "status", status, turns, on: effect.on };
            if (chance) next.chance = chance;
            onChange(next);
          }}
        />
      ) : (
        <Field label={effect.kind === "damage" ? "Danni × Potenza" : effect.kind === "heal" ? "Cura × Potenza" : "Scudo × Potenza"}>
          <NumberField label="Moltiplicatore" value={effect.multiplier} onChange={(n) => onChange({ ...effect, multiplier: n ?? Number.NaN })} />
        </Field>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// The passive

const MODIFIERS: { key: Exclude<keyof CombatModifiers, "damageVsStatus">; label: string }[] = [
  { key: "damagePercent", label: "Danni %" },
  { key: "critPercent", label: "Critico (punti)" },
  { key: "hitPercent", label: "Precisione (punti)" },
  { key: "speedPercent", label: "Velocità %" },
  { key: "healPercent", label: "Cure %" },
  { key: "effectChancePercent", label: "Probabilità effetti (punti)" },
];

function PassiveFields({
  passive,
  names,
  onChange,
  onAdd,
}: {
  passive: CombatPassive | null;
  names: AbilityInfo[];
  onChange: (passive: CombatPassive | null) => void;
  onAdd: () => void;
}) {
  if (!passive) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-[13px] leading-5">Questo personaggio non ha una passiva.</p>
        <button type="button" onClick={onAdd} className="btn btn-primary min-h-10 px-2 text-[12px]">
          Aggiungi una passiva
        </button>
      </div>
    );
  }
  const trigger = passive.trigger;
  const powered = passive.effects.some((e) => e.kind === "shield" || e.kind === "heal" || e.kind === "damage");
  const setEffect = (index: number, effect: CombatPassiveEffect) => onChange({ ...passive, effects: passive.effects.map((e, i) => (i === index ? effect : e)) });
  const setModifier = (key: (typeof MODIFIERS)[number]["key"], value: number | undefined) => {
    const modifiers = { ...passive.modifiers };
    if (value === undefined) delete modifiers[key];
    else modifiers[key] = value;
    onChange({ ...passive, modifiers });
  };
  const versus = passive.modifiers.damageVsStatus;
  return (
    <>
      <Field label="Nome">
        <input aria-label="Nome della passiva" value={passive.name} onChange={(event) => onChange({ ...passive, name: event.target.value })} className={INPUT} />
      </Field>
      <Field label="Quando agisce">
        <Select
          label="Quando agisce"
          value={trigger ?? "none"}
          choices={TRIGGER_CHOICES}
          onPick={(value) => onChange(retrigger(passive, value === "none" ? null : value))}
        />
      </Field>
      {trigger === "low_vita" && (
        <Field label="Soglia di Vita (%)" note="La prima volta che la sua Vita scende fin qui.">
          <NumberField label="Soglia di Vita" value={passive.thresholdPercent} onChange={(n) => onChange({ ...passive, thresholdPercent: n ?? Number.NaN })} />
        </Field>
      )}
      {trigger !== null && trigger !== "battle_start" && trigger !== "low_vita" && (
        <Field label="Quante volte per scontro" note="0 = ogni volta.">
          <NumberField label="Limite" value={passive.limit} onChange={(n) => onChange({ ...passive, limit: n ?? Number.NaN })} />
        </Field>
      )}
      {trigger !== null && (
        <Field label="Cosa fa">
          <div className="flex flex-col gap-1.5">
            {passive.effects.map((effect, index) => (
              <PassiveEffectCard
                key={index}
                trigger={trigger}
                effect={effect}
                names={names}
                onChange={(next) => setEffect(index, next)}
                buttons={
                  <ListButtons
                    index={index}
                    count={passive.effects.length}
                    what={`l'effetto ${index + 1}`}
                    onMove={(step) => onChange({ ...passive, effects: moved(passive.effects, index, step) })}
                    onRemove={() => onChange({ ...passive, effects: passive.effects.filter((_, i) => i !== index) })}
                  />
                }
              />
            ))}
            <button
              type="button"
              onClick={() => onChange({ ...passive, effects: [...passive.effects, newPassiveEffect("shield", trigger)] })}
              className="btn btn-ghost min-h-10 px-2 text-[12px]"
            >
              + Effetto
            </button>
          </div>
        </Field>
      )}
      {(powered || Object.keys(passive.scaling).length > 0) && (
        <Field label="Abilità usate" note="La Potenza dei suoi scudi, cure e danni.">
          <ScalingFields scaling={passive.scaling} names={names} canBeEmpty={!powered} onChange={(scaling) => onChange({ ...passive, scaling })} />
        </Field>
      )}
      {passive.effects.some((e) => e.kind === "damage") && (
        <FamilyField family={passive.family} names={names} onChange={(family) => onChange(withFamily(passive, family))} />
      )}
      <Field label="Sempre attivi" note="Finché è in piedi. Vuoto = niente.">
        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
          {MODIFIERS.map(({ key, label }) => (
            <label key={key} className="flex items-center justify-between gap-1 text-[11px] font-bold leading-4">
              <span className="min-w-0">{label}</span>
              <NumberField label={label} value={passive.modifiers[key]} allowEmpty onChange={(n) => setModifier(key, n)} className="w-14" />
            </label>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <span className="shrink-0 text-[11px] font-bold">Più danni contro chi ha</span>
          <select
            aria-label="Effetto per più danni"
            value={versus?.status ?? ""}
            onChange={(event) => {
              const modifiers = { ...passive.modifiers };
              if (event.target.value === "") delete modifiers.damageVsStatus;
              else modifiers.damageVsStatus = { status: event.target.value as CombatStatusCode, percent: versus?.percent ?? 20 };
              onChange({ ...passive, modifiers });
            }}
            className={`${INPUT} flex-1`}
          >
            <option value="">—</option>
            {Object.entries(STATUS_LABELS).map(([code, label]) => (
              <option key={code} value={code}>
                {label.name}
              </option>
            ))}
          </select>
          {versus && (
            <NumberField
              label="Percento di danni in più"
              value={versus.percent}
              onChange={(n) => onChange({ ...passive, modifiers: { ...passive.modifiers, damageVsStatus: { ...versus, percent: n ?? Number.NaN } } })}
              className="w-14"
            />
          )}
          {versus && <span className="text-[12px] font-bold">%</span>}
        </div>
      </Field>
      <Preview text={safely(() => describeCombatPassive(passive) || "Non fa ancora niente.")} />
      <button type="button" onClick={() => onChange(null)} className="btn btn-ghost min-h-10 px-2 text-[12px] text-comic-magenta">
        Togli la passiva
      </button>
    </>
  );
}

function PassiveEffectCard({
  trigger,
  effect,
  names,
  onChange,
  buttons,
}: {
  trigger: CombatPassive["trigger"];
  effect: CombatPassiveEffect;
  names: AbilityInfo[];
  onChange: (effect: CombatPassiveEffect) => void;
  buttons: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-md border-2 border-black bg-panel p-2">
      <div className="flex items-end gap-1">
        <div className="min-w-0 flex-1">
          <Select label="Tipo di effetto" value={effect.kind} choices={PASSIVE_EFFECT_CHOICES} onPick={(kind) => onChange(newPassiveEffect(kind, trigger))} />
        </div>
        {buttons}
      </div>
      <Field label="A chi">
        <Select
          label="A chi"
          value={effect.to}
          choices={passiveToChoices(trigger, effect.kind)}
          onPick={(to) => {
            const next = { ...effect, to } as CombatPassiveEffect;
            if (next.kind === "status") {
              next.status = statusFor(next.status, passiveEffectOnEnemies(next));
              if (!isCombatDebuff(next.status)) delete next.chance;
            }
            onChange(next);
          }}
        />
      </Field>
      {effect.kind === "status" ? (
        <StatusFields
          status={effect.status}
          turns={effect.turns}
          chance={effect.chance}
          onEnemies={passiveEffectOnEnemies(effect)}
          names={names}
          onChange={({ status, turns, chance }) => {
            const next: CombatPassiveEffect = { kind: "status", status, turns, to: effect.to };
            if (chance) next.chance = chance;
            onChange(next);
          }}
        />
      ) : effect.kind === "charge" ? (
        <Field label="Carica in più">
          <NumberField label="Carica" value={effect.amount} onChange={(n) => onChange({ ...effect, amount: n ?? Number.NaN })} />
        </Field>
      ) : (
        <Field label={effect.kind === "damage" ? "Danni × Potenza" : effect.kind === "heal" ? "Cura × Potenza" : "Scudo × Potenza"}>
          <NumberField label="Moltiplicatore" value={effect.multiplier} onChange={(n) => onChange({ ...effect, multiplier: n ?? Number.NaN })} />
        </Field>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// The kit as text

/** The kit as the engine reads it: what is typed goes back to the form as soon as it has a kit's shape. */
function KitText({ kit, onChange }: { kit: CombatKit; onChange: (kit: CombatKit) => void }) {
  const [text, setText] = useState(() => JSON.stringify(kit, null, 2));
  const [problem, setProblem] = useState<string | null>(null);
  return (
    <>
      <p className="text-[11px] leading-4 text-muted">
        Lo stesso kit come lo legge il motore, per ciò che il modulo non raggiunge. Le modifiche passano alle altre schede appena il testo è un kit.
      </p>
      <textarea
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          let parsed: unknown;
          try {
            parsed = JSON.parse(event.target.value);
          } catch (cause) {
            setProblem(`Non è JSON valido: ${(cause as Error).message}`);
            return;
          }
          const shape = kitShapeProblem(parsed);
          setProblem(shape);
          if (!shape) onChange(parsed as CombatKit);
        }}
        spellCheck={false}
        aria-label="Il kit come testo"
        className="min-h-80 w-full flex-1 resize-none rounded-md border-2 border-black bg-panel p-2 font-mono text-[11px] leading-4"
      />
      {problem && <p className="shrink-0 text-[12px] font-bold leading-4 text-comic-magenta">{problem} Le altre schede mostrano l&apos;ultima versione valida.</p>}
    </>
  );
}
