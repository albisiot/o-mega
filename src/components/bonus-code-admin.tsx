"use client";

import { useState, type FormEvent } from "react";
import { CardSortToggle } from "@/components/card-sort-toggle";
import { BackLink, TabBar } from "@/components/comic-parts";
import { searchCards, sortCards, type CardOrder } from "@/lib/card-sort";
import { describeBonusReward } from "@/lib/packs";
import {
  bonusCodeState,
  createBonusCode,
  setBonusCodeActive,
  type AdminBonusCode,
  type AdminBonusCodes,
} from "@/lib/bonus-code-admin";
import { describeServerError } from "@/lib/errors";
import { useLockedScreen } from "@/lib/use-locked-screen";

const INPUT = "min-h-12 w-full min-w-0 max-w-full border-2 border-comic-yellow bg-black px-3 text-base font-semibold";
const LABEL = "flex min-w-0 flex-col gap-1 text-sm font-bold";

const romeDate = new Intl.DateTimeFormat("it-IT", { dateStyle: "short", timeZone: "Europe/Rome" });

type BonusCodeAdminProps = {
  data: AdminBonusCodes;
  onChange: (next: AdminBonusCodes) => void;
};

/**
 * Creates bonus codes and shows how the existing ones are doing. The page fits the phone and
 * never scrolls (see .game-shell): the form and the list are two tabs.
 */
export function BonusCodeAdmin({ data, onChange }: BonusCodeAdminProps) {
  useLockedScreen(true);
  const [tab, setTab] = useState<"form" | "list">("form");
  const [created, setCreated] = useState<string | null>(null);

  return (
    <div className="game-shell">
      <header className="flex shrink-0 items-center gap-2.5 px-3 pb-1 pt-2">
        <BackLink href="/editor" label="Torna all'Editor" />
        <h1 className="font-display text-[32px] uppercase leading-10 text-comic-yellow">Codici bonus</h1>
      </header>
      <main className="flex min-h-0 flex-1 flex-col gap-2 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-1">
        <TabBar
          tabs={[
            { key: "form", label: "Nuovo codice" },
            { key: "list", label: `Codici (${data.codes.length})` },
          ]}
          current={tab}
          onPick={(next) => {
            setTab(next);
            setCreated(null);
          }}
          label="Gestione codici"
        />
        <div aria-live="polite" className="shrink-0 empty:hidden">
          {created && <p className="bg-panel px-3 py-2 text-sm font-bold">Codice {created} creato.</p>}
        </div>
        {tab === "form" ? (
          <NewCodeForm
            cards={data.cards}
            onCreated={(next, code) => {
              onChange(next);
              setCreated(code);
              setTab("list");
            }}
          />
        ) : (
          <div role="tabpanel" className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
            {data.codes.length === 0 ? (
              <p className="text-sm font-medium text-muted">Nessun codice ancora.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {data.codes.map((code) => (
                  <CodeRow key={code.id} code={code} onChange={onChange} />
                ))}
              </ul>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

/** "Vetrix" or "Vetrix · Neon" for a chosen card, written as "P051" or "P051:neon". */
function cardLabel(cards: AdminBonusCodes["cards"], cardCode: string): string {
  const [code, style] = cardCode.split(":");
  const card = cards.find((entry) => entry.code === code);
  const variant = style ? card?.variants.find((entry) => entry.style === style) : null;
  return `${card?.name ?? code}${variant ? ` · ${variant.name}` : ""}`;
}

const STEPS = [
  { key: "reward", label: "Premio" },
  { key: "limits", label: "Limiti" },
] as const;
type Step = (typeof STEPS)[number]["key"];

/** The code in two steps, one at a time, with the create button always at the bottom. */
function NewCodeForm({
  cards,
  onCreated,
}: {
  cards: AdminBonusCodes["cards"];
  onCreated: (next: AdminBonusCodes, code: string) => void;
}) {
  const [step, setStep] = useState<Step>("reward");
  const [code, setCode] = useState("");
  const [coins, setCoins] = useState("");
  const [packs, setPacks] = useState("");
  const [cardCodes, setCardCodes] = useState<string[]>([]);
  const [cardQuery, setCardQuery] = useState("");
  const [cardOrder, setCardOrder] = useState<CardOrder>("name");
  const shownCards = sortCards(searchCards(cards, cardQuery), cardOrder);
  const [pendingCard, setPendingCard] = useState<string | null>(null);
  const [pendingStyle, setPendingStyle] = useState("");
  const pending = cards.find((card) => card.code === pendingCard) ?? null;
  const [maxUses, setMaxUses] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const next = await createBonusCode({
        code,
        coins: Number(coins),
        packs: Number(packs),
        cardCodes,
        maxUses: maxUses === "" ? undefined : Number(maxUses),
        expiresOn: expiresOn === "" ? undefined : expiresOn,
        note: note === "" ? undefined : note,
      });
      onCreated(next, code.replace(/\s/g, ""));
    } catch (cause) {
      setError(describeServerError(cause));
      setSaving(false);
    }
  }

  // The step not shown is not in the page: the server checks every field and says what is wrong.
  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col gap-2">
      <div role="tablist" aria-label="Parti del codice" className="grid shrink-0 grid-cols-2 gap-1">
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

      {/* What a short window cannot fit scrolls inside, rather than being cut. */}
      <div role="tabpanel" className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto overscroll-contain">
        {step === "reward" ? (
          <>
            <label className={LABEL}>
              Codice
              <input
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder="NATALE26"
                maxLength={32}
                autoCapitalize="characters"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                className={`${INPUT} uppercase placeholder:text-faint`}
              />
              <span className="text-xs font-medium text-muted">Da 3 a 32 caratteri: lettere, numeri, - o _.</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className={LABEL}>
                Monete
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={coins}
                  onChange={(event) => setCoins(event.target.value)}
                  placeholder="0"
                  className={`${INPUT} placeholder:text-faint`}
                />
              </label>
              <label className={LABEL}>
                Pacchetti
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={packs}
                  onChange={(event) => setPacks(event.target.value)}
                  placeholder="0"
                  className={`${INPUT} placeholder:text-faint`}
                />
              </label>
            </div>
            <div className={LABEL}>
              <span id="bonus-cards-label">Carte</span>
              <div className="flex gap-2">
                <input
                  type="search"
                  value={cardQuery}
                  onChange={(event) => setCardQuery(event.target.value)}
                  placeholder="Cerca nome o numero"
                  aria-label="Cerca una carta da aggiungere"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  className={`${INPUT} flex-1 placeholder:text-faint`}
                />
                <CardSortToggle order={cardOrder} onChange={setCardOrder} />
              </div>
              <select
                value=""
                aria-labelledby="bonus-cards-label"
                onChange={(event) => {
                  const picked = cards.find((card) => card.code === event.target.value);
                  if (!picked) return;
                  // A card with variants waits for the choice of drawing.
                  if (picked.variants.length > 0) setPendingCard(picked.code);
                  else setCardCodes((current) => [...current, picked.code]);
                }}
                className={INPUT}
              >
                <option value="">
                  {shownCards.length === 0 ? "Nessuna carta trovata" : `Aggiungi una carta… (${shownCards.length})`}
                </option>
                {shownCards.map((card) => (
                  <option key={card.code} value={card.code}>
                    {cardOrder === "number"
                      ? `${card.code} · ${card.name} (${card.rarity})`
                      : `${card.name} (${card.rarity}) · ${card.code}`}
                  </option>
                ))}
              </select>
            </div>
            {pending && (
              <div className="flex flex-col gap-2 bg-panel p-3">
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
                      setCardCodes((current) => [...current, pendingStyle ? `${pending.code}:${pendingStyle}` : pending.code]);
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
            {cardCodes.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {cardCodes.map((cardCode, index) => {
                  const label = cardLabel(cards, cardCode);
                  return (
                    <li key={`${cardCode}-${index}`}>
                      <button
                        type="button"
                        onClick={() => setCardCodes((current) => current.filter((_, i) => i !== index))}
                        aria-label={`Togli ${label}`}
                        className="min-h-11 bg-panel px-3 text-sm font-bold"
                      >
                        {label} ✕
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        ) : (
          <>
            <label className={LABEL}>
              Max giocatori
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={maxUses}
                onChange={(event) => setMaxUses(event.target.value)}
                placeholder="Nessun limite"
                className={`${INPUT} placeholder:text-faint`}
              />
            </label>
            <label className={LABEL}>
              Ultimo giorno
              {/* Safari ignores the width of a date field that keeps its native appearance. */}
              <input
                type="date"
                value={expiresOn}
                onChange={(event) => setExpiresOn(event.target.value)}
                className={`${INPUT} appearance-none [&::-webkit-date-and-time-value]:text-left`}
              />
            </label>
            <label className={LABEL}>
              Nota per te
              <input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Facoltativa, i giocatori non la vedono"
                maxLength={100}
                className={`${INPUT} placeholder:text-faint`}
              />
            </label>
            <p className="text-xs font-medium leading-4 text-muted">
              Ogni giocatore usa un codice una volta sola. Senza limiti il codice vale per tutti e non scade.
            </p>
          </>
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-1.5">
        <div aria-live="polite">{error && <p className="text-sm font-bold leading-5 text-comic-magenta">{error}</p>}</div>
        <button type="submit" disabled={saving} className="btn btn-primary">
          {saving ? "Creazione…" : "Crea il codice"}
        </button>
      </div>
    </form>
  );
}

function CodeRow({ code, onChange }: { code: AdminBonusCode; onChange: BonusCodeAdminProps["onChange"] }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Read once per row render: the state is only a label, the server decides on redemption.
  const [now] = useState(() => Date.now());
  const state = bonusCodeState(code, now);
  const reward = describeBonusReward({ coins: code.coins, cards: 0, packs: code.packs });

  async function toggle() {
    setSaving(true);
    setError(null);
    try {
      onChange(await setBonusCodeActive(code.id, !code.is_active));
    } catch (cause) {
      setError(describeServerError(cause));
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="flex flex-col gap-0.5 bg-panel py-2 pl-3.5 pr-2">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 break-all font-display text-xl leading-6">{code.code}</p>
        <span className={`shrink-0 pr-1.5 text-xs font-bold uppercase ${state === "Attivo" ? "text-comic-cyan" : "text-muted"}`}>
          {state}
        </span>
      </div>
      <p className="text-sm font-semibold leading-5">{[reward, ...code.card_names].filter(Boolean).join(" + ")}</p>
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 text-xs font-medium leading-4 text-muted">
          Usato {code.uses}
          {code.max_uses !== null ? ` su ${code.max_uses}` : " volte"}
          {code.expires_at && ` · valido fino al ${romeDate.format(new Date(Date.parse(code.expires_at) - 1))}`}
          {code.note && ` · ${code.note}`}
        </p>
        <button
          type="button"
          onClick={toggle}
          disabled={saving}
          className="flex min-h-11 shrink-0 items-center px-1.5 text-sm font-bold underline disabled:opacity-60"
        >
          {code.is_active ? "Disattiva" : "Riattiva"}
        </button>
      </div>
      {error && <p className="text-sm font-bold text-comic-magenta">{error}</p>}
    </li>
  );
}
