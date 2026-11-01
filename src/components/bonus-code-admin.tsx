"use client";

import { useState, type FormEvent } from "react";
import { PageHeader } from "@/components/comic-parts";
import { describeBonusReward } from "@/lib/packs";
import {
  bonusCodeState,
  createBonusCode,
  setBonusCodeActive,
  type AdminBonusCode,
  type AdminBonusCodes,
} from "@/lib/bonus-code-admin";
import { describeServerError } from "@/lib/errors";

const INPUT = "min-h-12 w-full min-w-0 border-2 border-comic-yellow bg-black px-3 text-base font-semibold";
const LABEL = "flex min-w-0 flex-col gap-1 text-sm font-bold";

const romeDate = new Intl.DateTimeFormat("it-IT", { dateStyle: "short", timeZone: "Europe/Rome" });

type BonusCodeAdminProps = {
  data: AdminBonusCodes;
  onChange: (next: AdminBonusCodes) => void;
};

/** Creates bonus codes and shows how the existing ones are doing. */
export function BonusCodeAdmin({ data, onChange }: BonusCodeAdminProps) {
  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="Codici bonus" />
      <main className="flex flex-1 flex-col gap-5 px-3 pb-6">
        <NewCodeForm cards={data.cards} onChange={onChange} />
        <section className="flex flex-col gap-2">
          <h2 className="section-title">Codici creati</h2>
          {data.codes.length === 0 ? (
            <p className="text-sm font-medium text-muted">Nessun codice ancora.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {data.codes.map((code) => (
                <CodeRow key={code.id} code={code} onChange={onChange} />
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

function NewCodeForm({ cards, onChange }: { cards: AdminBonusCodes["cards"]; onChange: BonusCodeAdminProps["onChange"] }) {
  const [code, setCode] = useState("");
  const [coins, setCoins] = useState("");
  const [packs, setPacks] = useState("");
  const [cardCodes, setCardCodes] = useState<string[]>([]);
  const [maxUses, setMaxUses] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setCreated(null);
    try {
      onChange(
        await createBonusCode({
          code,
          coins: Number(coins),
          packs: Number(packs),
          cardCodes,
          maxUses: maxUses === "" ? undefined : Number(maxUses),
          expiresOn: expiresOn === "" ? undefined : expiresOn,
          note: note === "" ? undefined : note,
        }),
      );
      setCreated(code.replace(/\s/g, ""));
      setCode("");
      setCoins("");
      setPacks("");
      setCardCodes([]);
      setMaxUses("");
      setExpiresOn("");
      setNote("");
    } catch (cause) {
      setError(describeServerError(cause));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <h2 className="section-title">Nuovo codice</h2>
      <label className={LABEL}>
        Codice
        <input
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="NATALE26"
          required
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
      <label className={LABEL}>
        Carte
        <select
          value=""
          onChange={(event) => {
            const picked = event.target.value;
            if (picked) setCardCodes((current) => [...current, picked]);
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
      {cardCodes.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {cardCodes.map((cardCode, index) => (
            <li key={`${cardCode}-${index}`}>
              <button
                type="button"
                onClick={() => setCardCodes((current) => current.filter((_, i) => i !== index))}
                aria-label={`Togli ${cards.find((card) => card.code === cardCode)?.name}`}
                className="min-h-11 bg-panel px-3 text-sm font-bold"
              >
                {cards.find((card) => card.code === cardCode)?.name} ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="grid grid-cols-2 gap-2">
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
          <input
            type="date"
            value={expiresOn}
            onChange={(event) => setExpiresOn(event.target.value)}
            className={INPUT}
          />
        </label>
      </div>
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
      <button type="submit" disabled={saving} className="btn btn-primary">
        {saving ? "Creazione…" : "Crea il codice"}
      </button>
      <div aria-live="polite">
        {error && <p className="text-sm font-bold text-comic-magenta">{error}</p>}
        {created && <p className="bg-panel px-4 py-2.5 text-sm font-bold">Codice {created} creato.</p>}
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
    <li className="flex flex-col gap-1.5 bg-panel px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 break-all font-display text-xl">{code.code}</p>
        <span className={`shrink-0 text-xs font-bold uppercase ${state === "Attivo" ? "text-comic-cyan" : "text-muted"}`}>
          {state}
        </span>
      </div>
      <p className="text-sm font-semibold">{[reward, ...code.card_names].filter(Boolean).join(" + ")}</p>
      <p className="text-xs font-medium text-muted">
        Usato {code.uses}
        {code.max_uses !== null ? ` su ${code.max_uses}` : " volte"}
        {code.expires_at && ` · valido fino al ${romeDate.format(new Date(Date.parse(code.expires_at) - 1))}`}
      </p>
      {code.note && <p className="text-xs font-medium text-muted">{code.note}</p>}
      <button
        type="button"
        onClick={toggle}
        disabled={saving}
        className="flex min-h-11 items-center self-start text-sm font-bold underline disabled:opacity-60"
      >
        {code.is_active ? "Disattiva" : "Riattiva"}
      </button>
      {error && <p className="text-sm font-bold text-comic-magenta">{error}</p>}
    </li>
  );
}
