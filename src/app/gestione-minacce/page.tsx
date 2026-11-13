"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRequireSignedIn } from "@/components/auth-provider";
import { PageHeader } from "@/components/comic-parts";
import { LoadingScreen } from "@/components/loading-screen";
import { FACTION_LABELS, fetchAbilities, type AbilityInfo } from "@/lib/catalog";
import { describeServerError } from "@/lib/errors";
import {
  fetchAdminThreats,
  REGION_LABELS,
  RULE_OPTIONS,
  ruleProblem,
  saveThreat,
  saveThreatRarity,
  type AdminThreat,
  type AdminThreats,
} from "@/lib/threat-catalog";
import { oddsText } from "@/lib/threat-rarity";

const INPUT = "min-h-10 w-full border-2 border-line bg-black px-2 text-sm font-semibold text-foreground";
const LABEL = "flex flex-col gap-1 text-xs font-extrabold uppercase text-muted";

// Reached from the EDITOR page (src/app/editor). The page itself is public:
// every function behind it checks the admin on the server.
export default function ThreatAdminPage() {
  const { session } = useRequireSignedIn();
  const [data, setData] = useState<AdminThreats | null>(null);
  const [abilities, setAbilities] = useState<AbilityInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    Promise.all([fetchAdminThreats(), fetchAbilities()])
      .then(([next, abilityList]) => {
        if (cancelled) return;
        setData(next);
        setAbilities(abilityList);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(describeServerError(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [session, reloadKey]);

  if (error && !data) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm font-semibold text-comic-magenta">{error}</p>
        <Link href="/" className="flex min-h-11 items-center text-sm font-bold underline">
          Torna alla home
        </Link>
      </main>
    );
  }
  if (!data) return <LoadingScreen label="Caricamento delle Minacce…" />;

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader backHref="/editor" backLabel="Editor" title="Minacce" subtitle="Testi, regole e rarità" />
      <main className="flex flex-1 flex-col gap-6 px-3 pb-10">
        <RaritiesEditor data={data} onSaved={() => setReloadKey((k) => k + 1)} />
        <ThreatsEditor data={data} abilities={abilities} onSaved={() => setReloadKey((k) => k + 1)} />
      </main>
    </div>
  );
}

function RaritiesEditor({ data, onSaved }: { data: AdminThreats; onSaved: () => void }) {
  const [drafts, setDrafts] = useState(() => Object.fromEntries(data.rarities.map((r) => [r.code, { ...r }])));
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ code: string; text: string; error: boolean } | null>(null);

  async function save(code: string) {
    const draft = drafts[code];
    setBusy(code);
    setMessage(null);
    try {
      await saveThreatRarity(draft);
      setMessage({ code, text: "Salvata: vale per le partite create da adesso.", error: false });
      onSaved();
    } catch (cause) {
      setMessage({ code, text: describeServerError(cause), error: true });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-display text-2xl uppercase">Fasce di rarità</h2>
      <p className="text-xs font-medium text-muted">
        Ogni Minaccia di una fascia esce da sola, circa una volta ogni N partite (0: mai), al posto di una Minaccia normale. I
        giocatori vedono queste probabilità nel Bestiario.
      </p>
      {data.rarities.map((rarity) => {
        const draft = drafts[rarity.code];
        return (
          <div key={rarity.code} className="flex flex-col gap-2 border-l-4 bg-panel px-3 py-2" style={{ borderColor: draft.color }}>
            <div className="grid grid-cols-[1fr_auto_7rem] items-end gap-2">
              <label className={LABEL}>
                Nome
                <input
                  className={INPUT}
                  value={draft.name}
                  maxLength={30}
                  onChange={(e) => setDrafts({ ...drafts, [rarity.code]: { ...draft, name: e.target.value } })}
                />
              </label>
              <label className={LABEL}>
                Colore
                <input
                  type="color"
                  className="h-10 w-12 border-2 border-line bg-black"
                  value={draft.color}
                  onChange={(e) => setDrafts({ ...drafts, [rarity.code]: { ...draft, color: e.target.value } })}
                />
              </label>
              <label className={LABEL}>
                1 partita su
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  className={INPUT}
                  value={draft.one_in}
                  onChange={(e) => setDrafts({ ...drafts, [rarity.code]: { ...draft, one_in: Number(e.target.value) } })}
                />
              </label>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-muted">
                {rarity.threats} Minacce · {oddsText(draft.one_in)} ciascuna
              </span>
              <button type="button" className="btn btn-primary min-h-10 px-4" disabled={busy !== null} onClick={() => save(rarity.code)}>
                {busy === rarity.code ? "Salvo…" : "Salva"}
              </button>
            </div>
            {message?.code === rarity.code && (
              <p className={`text-xs font-bold ${message.error ? "text-comic-magenta" : "text-comic-cyan"}`}>{message.text}</p>
            )}
          </div>
        );
      })}
    </section>
  );
}

function ThreatsEditor({ data, abilities, onSaved }: { data: AdminThreats; abilities: AbilityInfo[]; onSaved: () => void }) {
  const [filter, setFilter] = useState("rare");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const rarityOf = (code: string | null) => data.rarities.find((r) => r.code === code) ?? null;
  const shown = useMemo(
    () =>
      data.threats.filter(
        (t) =>
          (filter === "all" || (filter === "rare" ? t.rarity_code !== null : filter === "usual" ? t.rarity_code === null : t.rarity_code === filter)) &&
          (query.trim() === "" || `${t.name} ${t.code}`.toLowerCase().includes(query.trim().toLowerCase())),
      ),
    [data.threats, filter, query],
  );

  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-display text-2xl uppercase">Minacce</h2>
      <div className="grid grid-cols-2 gap-2">
        <select className={INPUT} value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Quali Minacce">
          <option value="rare">Solo rare</option>
          <option value="usual">Solo normali</option>
          <option value="all">Tutte</option>
          {data.rarities.map((r) => (
            <option key={r.code} value={r.code}>
              {r.name}
            </option>
          ))}
        </select>
        <input className={INPUT} placeholder="Cerca" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Cerca una Minaccia" />
      </div>
      <p className="text-xs font-medium text-muted">
        Il diorama 3D è legato al nome: rinominare una Minaccia le toglie il diorama finché l&apos;app non viene aggiornata. Le
        partite in corso tengono la regola con cui sono iniziate.
      </p>
      <ul className="flex flex-col gap-1.5">
        {shown.map((threat) => {
          const rarity = rarityOf(threat.rarity_code);
          return (
            <li key={threat.code} className="bg-panel">
              <button
                type="button"
                onClick={() => setOpen(open === threat.code ? null : threat.code)}
                aria-expanded={open === threat.code}
                className="flex min-h-12 w-full items-center gap-2 border-l-4 px-3 py-1.5 text-left"
                style={{ borderColor: rarity?.color ?? "var(--line)" }}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-lg uppercase leading-5">
                    {threat.name}
                    {!threat.is_active && <span className="ml-1 text-xs text-comic-magenta">(disattiva)</span>}
                  </span>
                  <span className="block truncate text-xs font-bold text-muted">
                    {threat.code} · Livello {threat.level} · {REGION_LABELS[threat.region] ?? threat.region}
                    {rarity ? ` · ${rarity.name}` : ""} · {RULE_OPTIONS.find((r) => r.code === (threat.modifier_code ?? ""))?.name}
                  </span>
                </span>
                <span className="shrink-0 text-xs font-bold text-faint">{threat.seen_by} l&apos;hanno vista</span>
              </button>
              {open === threat.code && (
                <ThreatForm
                  key={`${threat.code}:${threat.name}:${threat.modifier_code}:${threat.rarity_code}`}
                  threat={threat}
                  data={data}
                  abilities={abilities}
                  onSaved={onSaved}
                />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ThreatForm({
  threat,
  data,
  abilities,
  onSaved,
}: {
  threat: AdminThreat;
  data: AdminThreats;
  abilities: AbilityInfo[];
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<AdminThreat>(threat);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const rule = RULE_OPTIONS.find((r) => r.code === (draft.modifier_code ?? ""));
  const params = draft.modifier_params ?? {};
  const problem =
    ruleProblem(draft, draft.modifier_code ?? "", params) ??
    (draft.rarity_code && (draft.emergency_target === null || Number.isNaN(draft.emergency_target))
      ? "Una Minaccia rara ha bisogno della soglia per l'Emergenza."
      : null);
  const setParams = (next: Record<string, unknown>) => setDraft({ ...draft, modifier_params: next });
  const chosenAbilities = Array.isArray(params.abilities) ? (params.abilities as string[]) : [];

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      await saveThreat(draft);
      setMessage({ text: "Salvata: vale per le partite create da adesso.", error: false });
      onSaved();
    } catch (cause) {
      setMessage({ text: describeServerError(cause), error: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 border-t-2 border-line px-3 pb-3 pt-2">
      <p className="text-xs font-bold text-muted">
        Abilità: {draft.abilities.map((code) => abilities.find((a) => a.code === code)?.name ?? code).join(" · ")}
      </p>
      <label className={LABEL}>
        Nome
        <input className={INPUT} value={draft.name} maxLength={60} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
      </label>
      <label className={LABEL}>
        Testo
        <textarea
          className={`${INPUT} min-h-20 py-1.5`}
          value={draft.flavor}
          maxLength={300}
          onChange={(e) => setDraft({ ...draft, flavor: e.target.value })}
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className={LABEL}>
          Rarità
          <select
            className={INPUT}
            value={draft.rarity_code ?? ""}
            onChange={(e) => setDraft({ ...draft, rarity_code: e.target.value || null })}
          >
            <option value="">Normale</option>
            {data.rarities.map((r) => (
              <option key={r.code} value={r.code}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <label className={LABEL}>
          Soglia Emergenza
          <input
            type="number"
            inputMode="numeric"
            min={0}
            className={INPUT}
            value={draft.emergency_target ?? ""}
            placeholder={draft.rarity_code ? "obbligatoria" : "dal livello"}
            onChange={(e) => setDraft({ ...draft, emergency_target: e.target.value === "" ? null : Number(e.target.value) })}
          />
        </label>
      </div>
      <label className={LABEL}>
        Regola
        <select
          className={INPUT}
          value={draft.modifier_code ?? ""}
          onChange={(e) => setDraft({ ...draft, modifier_code: e.target.value || null, modifier_params: {} })}
        >
          {RULE_OPTIONS.map((r) => (
            <option key={r.code} value={r.code}>
              {r.name}
            </option>
          ))}
        </select>
      </label>
      {rule?.params === "abilities" && (
        <div className="flex flex-wrap gap-1" role="group" aria-label="Abilità della regola">
          {abilities.map((a) => {
            const on = chosenAbilities.includes(a.code);
            return (
              <button
                key={a.code}
                type="button"
                aria-pressed={on}
                onClick={() => setParams({ abilities: on ? chosenAbilities.filter((c) => c !== a.code) : [...chosenAbilities, a.code] })}
                className={`min-h-9 px-2 text-xs font-extrabold ${on ? "bg-comic-yellow text-black" : "bg-black text-muted"}`}
              >
                {a.name}
              </button>
            );
          })}
        </div>
      )}
      {rule?.params === "factions" && (
        <div className="grid grid-cols-2 gap-2">
          {(["favored", "hindered"] as const).map((key) => (
            <label key={key} className={LABEL}>
              {key === "favored" ? "Favorita" : "Sfavorita"}
              <select className={INPUT} value={String(params[key] ?? "")} onChange={(e) => setParams({ ...params, [key]: e.target.value })}>
                <option value="">—</option>
                {Object.entries(FACTION_LABELS).map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      )}
      {(rule?.params === "count" || rule?.params === "cap" || rule?.params === "min") && (
        <label className={LABEL}>
          {rule.params === "count"
            ? "Abilità che contano (vuoto: dalla configurazione)"
            : rule.params === "cap"
              ? "Tetto per abilità (vuoto: dalla configurazione)"
              : "Abilità minime estratte"}
          <input
            type="number"
            inputMode="numeric"
            min={1}
            className={INPUT}
            value={params[rule.params] === undefined ? "" : String(params[rule.params])}
            onChange={(e) => {
              const next = { ...params };
              if (e.target.value === "") delete next[rule.params!];
              else next[rule.params!] = Number(e.target.value);
              setParams(next);
            }}
          />
        </label>
      )}
      <label className="flex min-h-10 items-center gap-2 text-sm font-bold">
        <input type="checkbox" checked={draft.is_active} onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })} />
        Attiva (può uscire nelle partite)
      </label>
      {problem && <p className="text-xs font-bold text-comic-magenta">{problem}</p>}
      {message && <p className={`text-xs font-bold ${message.error ? "text-comic-magenta" : "text-comic-cyan"}`}>{message.text}</p>}
      <button type="button" className="btn btn-primary min-h-11" disabled={busy || problem !== null} onClick={save}>
        {busy ? "Salvo…" : "Salva la Minaccia"}
      </button>
    </div>
  );
}
