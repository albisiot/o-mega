"use client";

import { useState, type ReactNode } from "react";
import { BackLink, TabBar } from "@/components/comic-parts";
import { bossDraft, bossProblem, deleteBoss, MAGNITUDE_TARGETS, newBossDraft, saveBoss, type BossAdmin, type BossDraft } from "@/lib/boss-admin";
import { describeServerError } from "@/lib/errors";
import { DISTRICT_NAMES, MAGNITUDE_NAMES, RAID_MOVES, type RaidMove } from "@/lib/raid";
import { THREAT_ACTORS, THREAT_ENVIRONMENTS } from "@/lib/threat-scene";
import { useLockedScreen } from "@/lib/use-locked-screen";

const INPUT = "min-h-11 w-full min-w-0 max-w-full border-2 border-comic-yellow bg-black px-3 text-base font-semibold";
const AREA = "w-full min-w-0 max-w-full border-2 border-comic-yellow bg-black px-3 py-2 text-base font-medium leading-5";
const SELECT = "min-h-10 w-full min-w-0 max-w-full border-2 border-line bg-black px-2 text-sm font-semibold";
const LABEL = "flex min-w-0 flex-col gap-1 text-sm font-bold";
const CHIP = "flex min-h-10 shrink-0 items-center border-2 px-3 text-sm font-bold";
/** The moves a Boss may have besides an Attacco semplice. */
const REPERTOIRE = (Object.keys(RAID_MOVES) as RaidMove[]).filter((move) => move !== "plain");

type Tab = "bosses" | "edit";

/** «12 cacce, 7 vinte (58%)», by players. */
function resultsLine(results: Record<string, { rooms: number; wins: number }>): string {
  const lines = Object.entries(results)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([players, r]) => `in ${players}: ${r.wins}/${r.rooms} (${Math.round((100 * r.wins) / Math.max(1, r.rooms))}%)`);
  return lines.length ? lines.join(" · ") : "nessuna caccia finita";
}

/**
 * The Bosses for admins (SPEC §5.18): every Boss with how it fares in both modes, and a form for
 * each. Everything is checked again on the server; while a Grande Minaccia on a Boss is being
 * played, its fronts stay as they are. A hunt copies its numbers when the room opens.
 */
export function BossAdminView({ initial }: { initial: BossAdmin }) {
  useLockedScreen(true);
  const [data, setData] = useState(initial);
  const [tab, setTab] = useState<Tab>("bosses");
  const [draft, setDraft] = useState<BossDraft | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const edit = (next: BossDraft) => {
    setDraft(next);
    setNotice(null);
    setError(null);
    setTab("edit");
  };
  async function run(action: () => Promise<BossAdmin>, message: string) {
    setBusy(true);
    setError(null);
    try {
      setData(await action());
      setNotice(message);
      setDraft(null);
      setTab("bosses");
    } catch (cause) {
      setError(describeServerError(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="game-shell">
      <header className="flex shrink-0 items-center gap-2.5 px-3 pb-1 pt-2">
        <BackLink href="/editor" />
        <div className="min-w-0">
          <h1 className="truncate font-display text-[28px] uppercase leading-8 text-comic-yellow">Boss</h1>
          <p className="truncate text-xs font-semibold leading-4 text-muted">Grande Minaccia e Caccia grossa.</p>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col gap-2 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-1">
        <TabBar
          tabs={[
            { key: "bosses", label: "Boss" },
            { key: "edit", label: "Modifica" },
          ]}
          current={tab}
          onPick={(next) => {
            setTab(next);
            setNotice(null);
          }}
          label="Gestione dei Boss"
        />
        <div aria-live="polite" className="shrink-0 empty:hidden">
          {notice && <p className="bg-panel px-3 py-2 text-sm font-bold text-comic-cyan">{notice}</p>}
          {error && <p className="bg-panel px-3 py-2 text-sm font-bold text-comic-magenta">{error}</p>}
        </div>

        {tab === "bosses" && (
          <div role="tabpanel" className="flex min-h-0 flex-1 flex-col gap-2">
            <ul className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
              {data.bosses.map((boss) => (
                <li key={boss.code} className="flex items-center gap-2 border-2 border-panel-raised bg-panel px-2.5 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-[17px] uppercase leading-5">
                      {boss.code} · {boss.name}
                    </span>
                    <span className="block truncate text-[11px] font-bold text-muted">
                      Grande Minaccia: {boss.gm_active ? `attivo · ${boss.gm_matches} partite` : "spento"}
                      {boss.gm_in_play ? " · una partita in corso" : ""}
                    </span>
                    <span className="line-clamp-2 block text-[11px] font-bold text-muted">
                      Caccia grossa:{" "}
                      {boss.raid_active && boss.raid_magnitude
                        ? `Magnitudo ${boss.raid_magnitude} (obiettivo ${MAGNITUDE_TARGETS[boss.raid_magnitude]}%) · ${resultsLine(boss.raid_results)}`
                        : "spento"}
                    </span>
                  </span>
                  <button type="button" onClick={() => edit(bossDraft(boss))} className="btn btn-ghost shrink-0 px-3 text-sm">
                    Modifica
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => edit(newBossDraft(data))} className="btn btn-primary w-full shrink-0">
              Nuovo Boss
            </button>
          </div>
        )}

        {tab === "edit" &&
          (draft === null ? (
            <p className="text-sm font-bold text-muted">Scegli un Boss da modificare, o creane uno nuovo.</p>
          ) : (
            <BossForm
              data={data}
              draft={draft}
              busy={busy}
              onChange={setDraft}
              onSave={() => {
                const problem = bossProblem(draft, data);
                if (problem) setError(problem);
                else void run(() => saveBoss(draft), "Boss salvato.");
              }}
              onDelete={
                draft.code && !data.bosses.find((b) => b.code === draft.code)?.in_use
                  ? () => void run(() => deleteBoss(draft.code!), "Boss eliminato.")
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
      <span>{label}</span>
      {children}
    </label>
  );
}

function BossForm({
  data,
  draft,
  busy,
  onChange,
  onSave,
  onDelete,
}: {
  data: BossAdmin;
  draft: BossDraft;
  busy: boolean;
  onChange: (draft: BossDraft) => void;
  onSave: () => void;
  onDelete: (() => void) | null;
}) {
  const set = (patch: Partial<BossDraft>) => onChange({ ...draft, ...patch });
  const saved = draft.code ? data.bosses.find((b) => b.code === draft.code) : undefined;
  const [environment, actor = ""] = draft.scene.split(":");
  const threatsByLevel = [1, 2, 3, 4, 5, 6].map((level) => ({ level, threats: data.threats.filter((t) => t.level === level) }));
  const levels = draft.fronts.map((code) => data.threats.find((t) => t.code === code)?.level ?? 0);
  const magnitude = data.magnitudes.find((m) => m.magnitude === draft.raid_magnitude);

  return (
    <div role="tabpanel" className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pb-2">
      <p className="font-display text-lg uppercase text-comic-yellow">{draft.code ?? "Nuovo Boss"}</p>
      <Field label="Nome">
        <input value={draft.name} maxLength={60} onChange={(e) => set({ name: e.target.value })} className={INPUT} />
      </Field>
      <Field label="Testo (dal sismografo)">
        <textarea value={draft.flavor} maxLength={400} rows={3} onChange={(e) => set({ flavor: e.target.value })} className={AREA} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Ambiente della scena">
          <select value={environment} onChange={(e) => set({ scene: actor ? `${e.target.value}:${actor}` : e.target.value })} className={SELECT}>
            {THREAT_ENVIRONMENTS.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Figura">
          <select value={actor} onChange={(e) => set({ scene: e.target.value ? `${environment}:${e.target.value}` : environment })} className={SELECT}>
            <option value="">nessuna</option>
            {THREAT_ACTORS.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <section className="flex flex-col gap-1.5 border-2 border-panel-raised p-2">
        <label className="flex items-center gap-2 text-sm font-bold">
          <input type="checkbox" checked={draft.gm_active} onChange={(e) => set({ gm_active: e.target.checked })} className="h-5 w-5" />
          Attivo nella Grande Minaccia
        </label>
        {saved?.gm_in_play && (
          <p className="bg-comic-magenta px-2 py-1 text-xs font-bold text-black">Una Grande Minaccia su questo Boss è in corso: i fronti non si cambiano ora.</p>
        )}
        <p className="text-xs font-bold text-muted">
          I 5 fronti (anche per la Caccia grossa servono, ma lì le Minacce si pescano a sorpresa): livelli {levels.join(" · ")}, somma{" "}
          {levels.reduce((a, b) => a + b, 0)}.
        </p>
        {Array.from({ length: 5 }, (_, i) => (
          <select
            key={i}
            value={draft.fronts[i] ?? ""}
            onChange={(e) => set({ fronts: draft.fronts.map((code, j) => (j === i ? e.target.value : code)) })}
            className={SELECT}
            aria-label={`Fronte ${i + 1}`}
          >
            {threatsByLevel.map((group) => (
              <optgroup key={group.level} label={`Livello ${group.level}`}>
                {group.threats.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.code} · {t.name}
                    {t.district ? ` · ${DISTRICT_NAMES[t.district] ?? t.district}` : ""}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        ))}
      </section>

      <section className="flex flex-col gap-1.5 border-2 border-panel-raised p-2">
        <label className="flex items-center gap-2 text-sm font-bold">
          <input type="checkbox" checked={draft.raid_active} onChange={(e) => set({ raid_active: e.target.checked })} className="h-5 w-5" />
          Attivo nella Caccia grossa
        </label>
        {saved && <p className="text-xs font-bold text-muted">Cacce finite: {resultsLine(saved.raid_results)}.</p>}
        <div className="grid grid-cols-2 gap-2">
          <Field label="Quartiere">
            <select value={draft.raid_district ?? ""} onChange={(e) => set({ raid_district: e.target.value || null })} className={SELECT}>
              <option value="">nessuno</option>
              {Object.entries(DISTRICT_NAMES).map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Magnitudo">
            <select
              value={draft.raid_magnitude ?? ""}
              onChange={(e) => set({ raid_magnitude: e.target.value ? Number(e.target.value) : null })}
              className={SELECT}
            >
              <option value="">nessuna</option>
              {data.magnitudes.map((m) => (
                <option key={m.magnitude} value={m.magnitude}>
                  {m.magnitude} · {MAGNITUDE_NAMES[m.magnitude]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {magnitude && (
          <p className="text-xs font-bold text-muted">
            Forza {magnitude.forza_percent}%, premi della vittoria ×{(magnitude.reward_percent / 100).toLocaleString("it-IT")}; con una squadra
            buona dovrebbe vincere circa il {MAGNITUDE_TARGETS[magnitude.magnitude]}% delle cacce. Se le vittorie vere si allontanano, ritocca la
            Vita propria.
          </p>
        )}
        <p className="text-sm font-bold">Le mosse (oltre all&apos;Attacco semplice)</p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Mosse del Boss">
          {REPERTOIRE.map((move) => {
            const active = draft.raid_moves.includes(move);
            return (
              <button
                key={move}
                type="button"
                aria-pressed={active}
                title={RAID_MOVES[move].text}
                onClick={() => set({ raid_moves: active ? draft.raid_moves.filter((m) => m !== move) : REPERTOIRE.filter((m) => m === move || draft.raid_moves.includes(m)) })}
                className={`${CHIP} ${active ? "border-comic-cyan text-comic-cyan" : "border-line"}`}
              >
                {RAID_MOVES[move].name}
              </button>
            );
          })}
        </div>
        <Field label="Vita propria (%)">
          <input
            type="number"
            min={10}
            max={1000}
            value={draft.raid_vita_percent}
            onChange={(e) => set({ raid_vita_percent: Number(e.target.value) })}
            className={INPUT}
          />
        </Field>
        <p className="text-sm font-bold">La stella Squadra: solo queste rarità</p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Rarità della stella">
          {data.rarities.map((rarity) => {
            const active = draft.raid_star_rarities.includes(rarity.code);
            return (
              <button
                key={rarity.code}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  set({
                    raid_star_rarities: active
                      ? draft.raid_star_rarities.filter((code) => code !== rarity.code)
                      : data.rarities.map((r) => r.code).filter((code) => code === rarity.code || draft.raid_star_rarities.includes(code)),
                  })
                }
                className={`${CHIP} ${active ? "border-comic-cyan text-comic-cyan" : "border-line"}`}
              >
                {rarity.name}
              </button>
            );
          })}
        </div>
      </section>

      <button type="button" onClick={onSave} disabled={busy} className="btn btn-primary w-full shrink-0">
        Salva il Boss
      </button>
      {onDelete && (
        <button type="button" onClick={onDelete} disabled={busy} className="btn btn-ghost w-full shrink-0 text-sm">
          Elimina (nessuno l&apos;ha ancora affrontato)
        </button>
      )}
    </div>
  );
}
