"use client";

import { useState, type ReactNode } from "react";
import { BackLink, TabBar } from "@/components/comic-parts";
import {
  bossDraft,
  bossProblem,
  deleteBoss,
  MAGNITUDE_TARGETS,
  newBossDraft,
  saveBoss,
  setRaidCommunity,
  setRaidWeek,
  type BossAdmin,
  type BossAdminEvent,
  type BossDraft,
} from "@/lib/boss-admin";
import { describeServerError } from "@/lib/errors";
import { formatRomeDateTime } from "@/lib/events";
import { describeCommunityPrize, DISTRICT_NAMES, MAGNITUDE_NAMES, RAID_MOVES, type RaidMove } from "@/lib/raid";
import { THREAT_ACTORS, THREAT_ENVIRONMENTS } from "@/lib/threat-scene";
import { useLockedScreen } from "@/lib/use-locked-screen";

const INPUT = "min-h-11 w-full min-w-0 max-w-full border-2 border-comic-yellow bg-black px-3 text-base font-semibold";
const AREA = "w-full min-w-0 max-w-full border-2 border-comic-yellow bg-black px-3 py-2 text-base font-medium leading-5";
const SELECT = "min-h-10 w-full min-w-0 max-w-full border-2 border-line bg-black px-2 text-sm font-semibold";
const LABEL = "flex min-w-0 flex-col gap-1 text-sm font-bold";
const CHIP = "flex min-h-10 shrink-0 items-center border-2 px-3 text-sm font-bold";
/** The moves a Boss may have besides an Attacco semplice. */
const REPERTOIRE = (Object.keys(RAID_MOVES) as RaidMove[]).filter((move) => move !== "plain");

type Tab = "bosses" | "edit" | "weeks" | "community";

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
 * played, its fronts stay as they are. A hunt copies its numbers when the room opens. The Boss
 * of the week (the rotation, or an admin's pick) and each event's community Boss, before it starts.
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
  async function run(action: () => Promise<BossAdmin>, message: string, back = true) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      setData(await action());
      setNotice(message);
      if (back) {
        setDraft(null);
        setTab("bosses");
      }
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
            { key: "weeks", label: "Settimana" },
            { key: "community", label: "Comunità" },
          ]}
          current={tab}
          onPick={(next) => {
            setTab(next);
            setNotice(null);
            setError(null);
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

        {tab === "weeks" && (
          <div role="tabpanel" className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
            <p className="text-xs font-semibold leading-4 text-muted">
              Ogni lunedì un Boss della Caccia grossa diventa il Boss della settimana: la prima vittoria della settimana paga monete in più.
              Di solito ruotano da soli (mai due di Magnitudo 5 di fila); qui ne scegli uno tu.
            </p>
            <ul className="flex flex-col gap-1.5">
              {data.weeks.map((week, i) => (
                <WeekRow
                  key={`${week.week}:${week.boss}`}
                  week={week.week}
                  current={i === 0}
                  boss={week.boss}
                  chosen={week.chosen}
                  bosses={data.bosses.filter((b) => b.raid_active)}
                  busy={busy}
                  onPick={(boss) => void run(() => setRaidWeek(week.week, boss), "Boss della settimana salvato.", false)}
                />
              ))}
            </ul>
          </div>
        )}

        {tab === "community" && (
          <div role="tabpanel" className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
            <p className="text-xs font-semibold leading-4 text-muted">
              Durante un evento, i danni di tutte le squadre a tutti i Boss si sommano su un Boss della comunità. Quando cade, chi ha finito
              almeno una caccia durante l&apos;evento riceve il premio (anche chi la finisce dopo, fino alla fine dell&apos;evento). Si decide
              prima che l&apos;evento inizi.
            </p>
            {data.events.length === 0 ? (
              <p className="text-sm font-bold text-muted">Nessun evento in programma o in corso.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {data.events.map((event) => (
                  <CommunityRow
                    key={`${event.id}:${event.community?.vita ?? 0}`}
                    event={event}
                    busy={busy}
                    onSave={(community) =>
                      void run(
                        () => setRaidCommunity(event.id, community),
                        community ? "Boss della comunità salvato." : "Boss della comunità tolto.",
                        false,
                      )
                    }
                  />
                ))}
              </ul>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

/** «lunedì 23/11», the Monday of a week. */
function weekLabel(week: string): string {
  const [, month, day] = week.split("-");
  return `lunedì ${day}/${month}`;
}

function WeekRow({
  week,
  current,
  boss,
  chosen,
  bosses,
  busy,
  onPick,
}: {
  week: string;
  current: boolean;
  boss: string | null;
  chosen: boolean;
  bosses: BossAdmin["bosses"];
  busy: boolean;
  onPick: (boss: string) => void;
}) {
  const [picked, setPicked] = useState(boss ?? "");
  const shown = bosses.find((b) => b.code === boss);
  return (
    <li className="flex flex-col gap-1.5 border-2 border-panel-raised bg-panel px-2.5 py-2">
      <span className="text-sm font-extrabold">
        {current ? "Questa settimana" : `Dal ${weekLabel(week)}`}
        <span className="block text-[11px] font-bold text-muted">
          {shown ? `${shown.name} · Magnitudo ${shown.raid_magnitude}` : "nessun Boss"} · {chosen ? "scelto da un admin" : "a rotazione"}
        </span>
      </span>
      <span className="flex gap-2">
        <select
          value={picked}
          onChange={(event) => setPicked(event.target.value)}
          aria-label={`Boss della settimana dal ${weekLabel(week)}`}
          className={SELECT}
        >
          {!picked && <option value="">Scegli un Boss</option>}
          {bosses.map((b) => (
            <option key={b.code} value={b.code}>
              {b.name} · Magnitudo {b.raid_magnitude}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={busy || !picked || (picked === boss && chosen)}
          onClick={() => onPick(picked)}
          className="btn btn-primary shrink-0 px-4 text-sm"
        >
          Salva
        </button>
      </span>
    </li>
  );
}

type CommunityDraft = { vita: string; coins: string; packs: string; shards: string };

function CommunityRow({
  event,
  busy,
  onSave,
}: {
  event: BossAdminEvent;
  busy: boolean;
  onSave: (community: { vita: number; coins: number; packs: number; shards: number } | null) => void;
}) {
  const c = event.community;
  const [form, setForm] = useState<CommunityDraft>({
    vita: c ? String(c.vita) : "5000",
    coins: c ? String(c.coins) : "100",
    packs: c ? String(c.packs) : "1",
    shards: c ? String(c.shards) : "0",
  });
  const number = (value: string) => (value.trim() === "" ? 0 : Math.trunc(Number(value)));
  const field = (key: keyof CommunityDraft, label: string, max: number) => (
    <Field label={label}>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={max}
        value={form[key]}
        onChange={(e) => setForm((current) => ({ ...current, [key]: e.target.value }))}
        className={SELECT}
      />
    </Field>
  );
  return (
    <li className="flex flex-col gap-1.5 border-2 border-panel-raised bg-panel px-2.5 py-2">
      <span className="text-sm font-extrabold">
        {event.title}
        <span className="block text-[11px] font-bold text-muted">
          {event.started ? "In corso" : `Dal ${formatRomeDateTime(event.starts_at)}`} · fino al {formatRomeDateTime(event.ends_at)}
        </span>
      </span>
      {c && event.started ? (
        <span className="text-xs font-bold leading-4">
          {c.damage.toLocaleString("it-IT")} danni su {c.vita.toLocaleString("it-IT")}
          {c.fallen ? ` · abbattuto, premiati ${c.rewarded}` : ""} · premio: {describeCommunityPrize(c)}
        </span>
      ) : event.started ? (
        <span className="text-xs font-bold text-muted">Nessun Boss della comunità: l&apos;evento è già iniziato.</span>
      ) : (
        <>
          <span className="grid grid-cols-2 gap-1.5">
            {field("vita", "Vita (danni totali)", 100_000_000)}
            {field("coins", "Monete", 100_000)}
            {field("packs", "Pacchetti", 5)}
            {field("shards", "Schegge", 100)}
          </span>
          <span className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => onSave({ vita: number(form.vita), coins: number(form.coins), packs: number(form.packs), shards: number(form.shards) })}
              className="btn btn-primary flex-1 text-sm"
            >
              {c ? "Salva" : "Aggiungi il Boss della comunità"}
            </button>
            {c && (
              <button type="button" disabled={busy} onClick={() => onSave(null)} className="btn btn-ghost shrink-0 px-3 text-sm">
                Togli
              </button>
            )}
          </span>
        </>
      )}
    </li>
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
