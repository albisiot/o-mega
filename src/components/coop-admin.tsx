"use client";

import { useEffect, useState, type ReactNode } from "react";
import { BackLink, TabBar } from "@/components/comic-parts";
import { TraitFilter } from "@/components/trait-filter";
import { fetchTraitIndex } from "@/lib/catalog";
import { fetchCatalog, type CatalogCard } from "@/lib/collection";
import {
  deleteCoopOperation,
  newOperationDraft,
  operationDraft,
  operationProblem,
  saveCoopChapter,
  saveCoopOperation,
  type CoopAdmin,
  type CoopAdminChapter,
  type CoopOperationDraft,
} from "@/lib/coop-admin";
import { describeServerError } from "@/lib/errors";
import type { TraitCategory } from "@/lib/traits";
import { useLockedScreen } from "@/lib/use-locked-screen";

const INPUT = "min-h-11 w-full min-w-0 max-w-full border-2 border-comic-yellow bg-black px-3 text-base font-semibold";
const AREA = "w-full min-w-0 max-w-full border-2 border-comic-yellow bg-black px-3 py-2 text-base font-medium leading-5";
const SELECT = "min-h-10 w-full min-w-0 max-w-full border-2 border-line bg-black px-2 text-sm font-semibold";
const LABEL = "flex min-w-0 flex-col gap-1 text-sm font-bold";
const CHIP = "flex min-h-10 shrink-0 items-center border-2 px-3 text-sm font-bold";
const RARITIES = [
  { code: "delta", name: "Delta" },
  { code: "gamma", name: "Gamma" },
  { code: "beta", name: "Beta" },
  { code: "alfa", name: "Alfa" },
  { code: "omega", name: "Omega" },
];

type Tab = "operations" | "chapters" | "edit";
type Editing = { kind: "operation"; draft: CoopOperationDraft } | { kind: "chapter"; chapter: number | null; draft: Omit<CoopAdminChapter, "chapter"> } | null;

/**
 * The Operazioni for admins (SPEC §5.17): the operations by chapter, the chapters, and a form for
 * each. Everything is checked again on the server; while a room of an operation is open or playing,
 * its rival and rounds stay as they are.
 */
export function CoopAdminView({ initial }: { initial: CoopAdmin }) {
  useLockedScreen(true);
  const [data, setData] = useState(initial);
  const [tab, setTab] = useState<Tab>("operations");
  const [chapter, setChapter] = useState(initial.chapters[0]?.chapter ?? 1);
  const [editing, setEditing] = useState<Editing>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cards, setCards] = useState<CatalogCard[]>([]);
  const [traits, setTraits] = useState<TraitCategory[]>([]);

  useEffect(() => {
    fetchCatalog()
      .then(setCards)
      .catch((cause: unknown) => console.error("Catalog failed", cause));
    fetchTraitIndex()
      .then((index) => setTraits(index.catalog))
      .catch((cause: unknown) => console.error("Traits failed", cause));
  }, []);

  const edit = (next: Editing) => {
    setEditing(next);
    setNotice(null);
    setError(null);
    setTab("edit");
  };
  async function run(action: () => Promise<CoopAdmin>, message: string, back: Tab) {
    setBusy(true);
    setError(null);
    try {
      setData(await action());
      setNotice(message);
      setEditing(null);
      setTab(back);
    } catch (cause) {
      setError(describeServerError(cause));
    } finally {
      setBusy(false);
    }
  }

  const operations = data.operations.filter((o) => o.chapter === chapter);

  return (
    <div className="game-shell">
      <header className="flex shrink-0 items-center gap-2.5 px-3 pb-1 pt-2">
        <BackLink href="/editor" />
        <div className="min-w-0">
          <h1 className="truncate font-display text-[28px] uppercase leading-8 text-comic-yellow">Operazioni</h1>
          <p className="truncate text-xs font-semibold leading-4 text-muted">Capitoli, rivali, round, premi e stelle.</p>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col gap-2 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-1">
        <TabBar
          tabs={[
            { key: "operations", label: "Operazioni" },
            { key: "chapters", label: "Capitoli" },
            { key: "edit", label: "Modifica" },
          ]}
          current={tab}
          onPick={(next) => {
            setTab(next);
            setNotice(null);
          }}
          label="Gestione delle Operazioni"
        />
        <div aria-live="polite" className="shrink-0 empty:hidden">
          {notice && <p className="bg-panel px-3 py-2 text-sm font-bold text-comic-cyan">{notice}</p>}
          {error && <p className="bg-panel px-3 py-2 text-sm font-bold text-comic-magenta">{error}</p>}
        </div>

        {tab === "operations" && (
          <div role="tabpanel" className="flex min-h-0 flex-1 flex-col gap-2">
            <div className="flex shrink-0 gap-1.5 overflow-x-auto" role="group" aria-label="Capitolo">
              {data.chapters.map((c) => (
                <button
                  key={c.chapter}
                  type="button"
                  aria-pressed={chapter === c.chapter}
                  onClick={() => setChapter(c.chapter)}
                  className={`${CHIP} ${chapter === c.chapter ? "border-comic-cyan text-comic-cyan" : "border-line"}`}
                >
                  Capitolo {c.chapter}
                </button>
              ))}
            </div>
            <ul className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
              {operations.map((operation) => (
                <li key={operation.code} className="flex items-center gap-2 border-2 border-panel-raised bg-panel px-2.5 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-[17px] uppercase leading-5">
                      {operation.code} · {operation.title}
                    </span>
                    <span className="block truncate text-[11px] font-bold text-muted">
                      {operation.rooms} partite · {operation.wins} vittorie{operation.in_play ? " · una stanza aperta" : ""}
                    </span>
                  </span>
                  <button type="button" onClick={() => edit({ kind: "operation", draft: operationDraft(operation) })} className="btn btn-ghost shrink-0 px-3 text-sm">
                    Modifica
                  </button>
                </li>
              ))}
              {operations.length === 0 && <li className="text-sm font-bold text-muted">Nessuna operazione in questo capitolo.</li>}
            </ul>
            <button type="button" onClick={() => edit({ kind: "operation", draft: newOperationDraft(data, chapter) })} className="btn btn-primary w-full shrink-0">
              Nuova operazione nel capitolo {chapter}
            </button>
          </div>
        )}

        {tab === "chapters" && (
          <div role="tabpanel" className="flex min-h-0 flex-1 flex-col gap-2">
            <ul className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
              {data.chapters.map((c) => (
                <li key={c.chapter} className="flex items-center gap-2 border-2 border-panel-raised bg-panel px-2.5 py-2">
                  <span className="min-w-0 flex-1 truncate font-display text-[17px] uppercase leading-5">
                    {c.chapter} · {c.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => edit({ kind: "chapter", chapter: c.chapter, draft: { title: c.title, intro: c.intro, outro: c.outro } })}
                    className="btn btn-ghost shrink-0 px-3 text-sm"
                  >
                    Modifica
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => edit({ kind: "chapter", chapter: null, draft: { title: "", intro: "", outro: "" } })} className="btn btn-primary w-full shrink-0">
              Nuovo capitolo
            </button>
          </div>
        )}

        {tab === "edit" &&
          (editing === null ? (
            <p className="text-sm font-bold text-muted">Scegli un&apos;operazione o un capitolo da modificare.</p>
          ) : editing.kind === "chapter" ? (
            <ChapterForm
              chapter={editing.chapter}
              draft={editing.draft}
              busy={busy}
              onChange={(draft) => setEditing({ ...editing, draft })}
              onSave={() => void run(() => saveCoopChapter(editing.chapter, editing.draft), "Capitolo salvato.", "chapters")}
            />
          ) : (
            <OperationForm
              data={data}
              draft={editing.draft}
              cards={cards}
              traits={traits}
              busy={busy}
              onChange={(draft) => setEditing({ kind: "operation", draft })}
              onSave={() => {
                const problem = operationProblem(editing.draft, data);
                if (problem) setError(problem);
                else void run(() => saveCoopOperation(editing.draft), "Operazione salvata: vale per le stanze aperte da ora.", "operations");
              }}
              onDelete={
                editing.draft.code && !data.operations.find((o) => o.code === editing.draft.code)?.rooms
                  ? () => void run(() => deleteCoopOperation(editing.draft.code!), "Operazione eliminata.", "operations")
                  : null
              }
            />
          ))}
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className={LABEL}>
      {label}
      {children}
    </label>
  );
}

function ChapterForm({
  chapter,
  draft,
  busy,
  onChange,
  onSave,
}: {
  chapter: number | null;
  draft: Omit<CoopAdminChapter, "chapter">;
  busy: boolean;
  onChange: (draft: Omit<CoopAdminChapter, "chapter">) => void;
  onSave: () => void;
}) {
  return (
    <div role="tabpanel" className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
      <p className="font-display text-lg uppercase text-comic-yellow">{chapter === null ? "Nuovo capitolo" : `Capitolo ${chapter}`}</p>
      <Field label="Titolo">
        <input value={draft.title} maxLength={40} onChange={(e) => onChange({ ...draft, title: e.target.value })} className={INPUT} />
      </Field>
      <Field label="Introduzione">
        <textarea value={draft.intro} maxLength={600} rows={4} onChange={(e) => onChange({ ...draft, intro: e.target.value })} className={AREA} />
      </Field>
      <Field label="Finale (a chi completa il capitolo)">
        <textarea value={draft.outro} maxLength={600} rows={3} onChange={(e) => onChange({ ...draft, outro: e.target.value })} className={AREA} />
      </Field>
      <button type="button" onClick={onSave} disabled={busy} className="btn btn-primary w-full shrink-0">
        Salva il capitolo
      </button>
    </div>
  );
}

function OperationForm({
  data,
  draft,
  cards,
  traits,
  busy,
  onChange,
  onSave,
  onDelete,
}: {
  data: CoopAdmin;
  draft: CoopOperationDraft;
  cards: CatalogCard[];
  traits: TraitCategory[];
  busy: boolean;
  onChange: (draft: CoopOperationDraft) => void;
  onSave: () => void;
  onDelete: (() => void) | null;
}) {
  const set = (patch: Partial<CoopOperationDraft>) => onChange({ ...draft, ...patch });
  const inPlay = Boolean(draft.code && data.operations.find((o) => o.code === draft.code)?.in_play);
  const sorted = [...cards].sort((a, b) => a.rarity.rank - b.rarity.rank || a.name.localeCompare(b.name));
  const cardOption = (card: CatalogCard) => (
    <option key={card.code} value={card.code}>
      {card.name} · {card.rarity.name}
    </option>
  );
  const threatsByLevel = [1, 2, 3, 4, 5, 6].map((level) => ({ level, threats: data.threats.filter((t) => t.level === level) }));
  const setRound = (index: number, patch: Partial<CoopOperationDraft["rounds"][number]>) =>
    set({ rounds: draft.rounds.map((round, i) => (i === index ? { ...round, ...patch } : round)) });

  return (
    <div role="tabpanel" className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pb-2">
      <p className="font-display text-lg uppercase text-comic-yellow">{draft.code ?? `Nuova, capitolo ${draft.chapter}`}</p>
      {inPlay && (
        <p className="bg-comic-magenta px-2 py-1 text-xs font-bold text-black">
          Una stanza di questa operazione è aperta o in partita: rivale e round non si possono cambiare ora, testi, premi e stelle sì.
        </p>
      )}
      <Field label="Titolo">
        <input value={draft.title} maxLength={40} onChange={(e) => set({ title: e.target.value })} className={INPUT} />
      </Field>
      <Field label="Introduzione">
        <textarea value={draft.intro} maxLength={600} rows={4} onChange={(e) => set({ intro: e.target.value })} className={AREA} />
      </Field>
      <Field label="Finale (a chi la vince)">
        <textarea value={draft.outro} maxLength={600} rows={3} onChange={(e) => set({ outro: e.target.value })} className={AREA} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Rivale">
          <input value={draft.rival_name} maxLength={60} onChange={(e) => set({ rival_name: e.target.value })} className={INPUT} />
        </Field>
        <Field label="Boss">
          <input value={draft.boss_name} maxLength={60} onChange={(e) => set({ boss_name: e.target.value })} className={INPUT} />
        </Field>
      </div>

      <fieldset className="flex flex-col gap-1" disabled={inPlay}>
        <legend className="text-sm font-bold">Gli Echi del rivale, uno per round (l&apos;ultimo resta di solito per il Boss)</legend>
        {Array.from({ length: data.rounds }, (_, i) => (
          <select
            key={i}
            aria-label={`Eco ${i + 1}`}
            value={draft.rival[i] ?? ""}
            onChange={(e) => {
              const rival = [...draft.rival];
              rival[i] = e.target.value;
              set({ rival });
            }}
            className={SELECT}
          >
            <option value="">Scegli…</option>
            {sorted.map(cardOption)}
          </select>
        ))}
      </fieldset>

      {draft.rounds.map((round, r) => (
        <fieldset key={r} className="flex flex-col gap-1 border-t-2 border-panel-raised pt-1.5" disabled={inPlay}>
          <legend className="text-sm font-bold">
            {r === draft.rounds.length - 1 ? "Il Boss" : `Round ${r + 1}`} · 5 Minacce: in due si usano le prime 3, in quattro tutte
          </legend>
          {round.threats.map((code, s) => (
            <select
              key={s}
              aria-label={`${r === draft.rounds.length - 1 ? "Fronte" : "Minaccia"} ${s + 1}`}
              value={code}
              onChange={(e) => setRound(r, { threats: round.threats.map((c, i) => (i === s ? e.target.value : c)) })}
              className={`${SELECT} ${s < 3 && s === round.reinforced ? "border-comic-magenta" : ""}`}
            >
              {threatsByLevel.map((group) => (
                <optgroup key={group.level} label={`Livello ${group.level}`}>
                  {group.threats.map((t) => (
                    <option key={t.code} value={t.code}>
                      {s + 1}. Lv {t.level} · {t.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          ))}
          <div className="flex items-center gap-1.5 text-xs font-bold" role="group" aria-label="La Minaccia del rivale">
            Del rivale:
            {[0, 1, 2].map((slot) => (
              <button
                key={slot}
                type="button"
                aria-pressed={round.reinforced === slot}
                onClick={() => setRound(r, { reinforced: slot })}
                className={`${CHIP} min-h-9 px-2.5 ${round.reinforced === slot ? "border-comic-magenta text-comic-magenta" : "border-line"}`}
              >
                {slot + 1}
              </button>
            ))}
          </div>
        </fieldset>
      ))}

      <div className="grid grid-cols-2 gap-2 border-t-2 border-panel-raised pt-1.5">
        <Field label="Monete alla prima vittoria">
          <input
            type="number"
            min={0}
            max={10000}
            value={draft.reward_coins}
            onChange={(e) => set({ reward_coins: Number(e.target.value) })}
            className={INPUT}
          />
        </Field>
        <Field label="Carta premio">
          <select value={draft.reward_card ?? ""} onChange={(e) => set({ reward_card: e.target.value || null })} className={SELECT}>
            <option value="">Nessuna</option>
            {sorted.filter((card) => card.rarity.code !== "omega").map(cardOption)}
          </select>
        </Field>
      </div>

      <div className="flex flex-col gap-1.5 border-t-2 border-panel-raised pt-1.5">
        <p className="text-sm font-bold">Le stelle (ognuna paga una volta a ogni giocatore)</p>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Panico massimo">
            <input
              type="number"
              min={0}
              max={data.panic_limit - 1}
              value={draft.star_panic}
              onChange={(e) => set({ star_panic: Number(e.target.value) })}
              className={INPUT}
            />
          </Field>
          <Field label="Monete per stella">
            <input type="number" min={0} max={1000} value={draft.star_coins} onChange={(e) => set({ star_coins: Number(e.target.value) })} className={INPUT} />
          </Field>
        </div>
        <p className="text-xs font-bold text-muted">La stella della squadra: ogni personaggio di ognuno di queste rarità e di questi tratti.</p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Rarità della stella">
          {RARITIES.map((rarity) => {
            const active = draft.star_rarities.includes(rarity.code);
            return (
              <button
                key={rarity.code}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  set({
                    star_rarities: active
                      ? draft.star_rarities.filter((code) => code !== rarity.code)
                      : RARITIES.map((r) => r.code).filter((code) => code === rarity.code || draft.star_rarities.includes(code)),
                  })
                }
                className={`${CHIP} ${active ? "border-comic-cyan text-comic-cyan" : "border-line"}`}
              >
                {rarity.name}
              </button>
            );
          })}
        </div>
        {traits.length > 0 && (
          <TraitFilter catalog={traits} chosen={draft.star_traits} onChange={(next) => set({ star_traits: next })} layout="wrap" label="Tratti della stella" />
        )}
      </div>

      <button type="button" onClick={onSave} disabled={busy} className="btn btn-primary w-full shrink-0">
        Salva l&apos;operazione
      </button>
      {onDelete && (
        <button type="button" onClick={onDelete} disabled={busy} className="btn btn-ghost w-full shrink-0 text-sm">
          Elimina (nessuno l&apos;ha ancora giocata)
        </button>
      )}
    </div>
  );
}
