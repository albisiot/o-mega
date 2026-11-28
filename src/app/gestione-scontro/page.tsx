"use client";

// EDITOR → Scontro (SPEC §5.19, docs/COMBAT.md, stage 4): the kits of the Scontro a squadre, for
// admins only. A kit is the engine's data (base, special, supreme, passive): the page shows it as
// JSON, checks it with the engine while it is written (validateCombatKit), and saves it only when
// valid; the server checks the admin and the kit's shape, and the "match" Edge Function checks it
// again with the engine when a battle starts. A new kit starts from the generic one of the
// character's best ability (the simulator's), to be rewritten from its card.

import { useEffect, useState } from "react";
import { genericCombatKit, validateCombatKit, type CombatKit } from "@o-mega/game-engine";
import { useRequireSignedIn } from "@/components/auth-provider";
import { BackLink } from "@/components/comic-parts";
import { LoadingScreen } from "@/components/loading-screen";
import { useBackStep } from "@/lib/back-step";
import { fromRomeInput } from "@/lib/challenge-admin";
import { COMBAT_FAMILIES, combatRules, combatUnlockRule, fetchCombatUnlocks, saveCombatUnlock, type CombatUnlocks } from "@/lib/combat";
import { describeCombatMove, italianKitError } from "@/lib/combat-text";
import { describeServerError } from "@/lib/errors";
import { toRomeInput } from "@/lib/events";
import { getSupabase } from "@/lib/supabase/client";
import { useIsAdmin } from "@/lib/use-is-admin";
import { useLockedScreen } from "@/lib/use-locked-screen";

type KitRow = { definition_id: string; code: string; name: string; faction: string; rarity: string; stats: Record<string, number>; kit: CombatKit; version: number; updated_at: string };
type Editing = { definitionId: string; code: string; name: string; text: string; version: number | null };

// The generated database types may not list these functions yet: the calls are the same.
async function rpc<T>(name: string, params?: Record<string, unknown>): Promise<T> {
  const { data, error } = await getSupabase().rpc(name as never, params as never);
  if (error) throw new Error((error as { message: string }).message);
  return data as T;
}

/** What is wrong with the text: not JSON, or what the engine refuses. */
function problemsOf(text: string): { kit: CombatKit | null; errors: string[] } {
  let kit: CombatKit;
  try {
    kit = JSON.parse(text) as CombatKit;
  } catch (cause) {
    return { kit: null, errors: [`Non è JSON valido: ${(cause as Error).message}`] };
  }
  try {
    return { kit, errors: validateCombatKit(kit, COMBAT_FAMILIES, combatRules()).map(italianKitError) };
  } catch (cause) {
    return { kit: null, errors: [`Il kit non ha la forma giusta: ${(cause as Error).message}`] };
  }
}

/**
 * The unlock of the kits (SPEC §5.19, game_config combat_unlock.*): every kit open, or a kit after
 * a number of matches with the character in the team, won or played, counted from a moment in Rome
 * time or over every match ever played. The server checks the admin and the values.
 */
function UnlockSettings() {
  const [mode, setMode] = useState<CombatUnlocks["mode"]>("progress");
  const [basis, setBasis] = useState<CombatUnlocks["basis"]>("wins");
  const [count, setCount] = useState("50");
  const [everyMatch, setEveryMatch] = useState(false);
  const [since, setSince] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    fetchCombatUnlocks()
      .then((unlocks) => {
        if (!live) return;
        setMode(unlocks.mode);
        setBasis(unlocks.basis);
        setCount(String(unlocks.count));
        setEveryMatch(unlocks.since === null);
        setSince(toRomeInput(unlocks.since ?? Date.now()));
        setLoaded(true);
      })
      .catch((cause) => live && setMessage(describeServerError(cause)));
    return () => {
      live = false;
    };
  }, []);

  const number = Number(count);
  const instant = everyMatch ? null : fromRomeInput(since);
  const valid = Number.isInteger(number) && number >= 1 && number <= 10000 && (instant === null || !Number.isNaN(instant));

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      await saveCombatUnlock({ mode, basis, count: number, since: instant === null ? null : new Date(instant).toISOString() });
      setMessage("Sblocco salvato.");
    } catch (cause) {
      setMessage(describeServerError(cause));
    } finally {
      setBusy(false);
    }
  }

  const choice = (on: boolean) => `btn min-h-10 px-1 text-[12px] ${on ? "btn-primary" : "btn-ghost"}`;
  return (
    <section className="flex flex-col gap-1.5 rounded-md border-2 border-black bg-panel p-2">
      <p className="text-[14px] font-extrabold leading-5">Sblocco dei kit</p>
      {!loaded ? (
        <p className="text-[12px] leading-4 text-muted">{message ?? "Carico…"}</p>
      ) : (
        <>
          <div role="radiogroup" aria-label="Come si sbloccano i kit" className="grid grid-cols-2 gap-1.5">
            <button type="button" role="radio" aria-checked={mode === "progress"} onClick={() => setMode("progress")} className={choice(mode === "progress")}>
              Con le partite
            </button>
            <button type="button" role="radio" aria-checked={mode === "always"} onClick={() => setMode("always")} className={choice(mode === "always")}>
              Sempre attivi
            </button>
          </div>
          {mode === "progress" ? (
            <>
              <div role="radiogroup" aria-label="Cosa si conta" className="grid grid-cols-2 gap-1.5">
                <button type="button" role="radio" aria-checked={basis === "wins"} onClick={() => setBasis("wins")} className={choice(basis === "wins")}>
                  Partite vinte
                </button>
                <button type="button" role="radio" aria-checked={basis === "played"} onClick={() => setBasis("played")} className={choice(basis === "played")}>
                  Partite giocate
                </button>
              </div>
              <label className="flex items-center gap-2 text-[12px] font-bold">
                Quante
                <input
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                  inputMode="numeric"
                  aria-label="Partite per sbloccare un kit"
                  className="min-h-10 w-24 rounded-md border-2 border-black bg-panel-raised px-2 text-[14px] font-bold"
                />
              </label>
              <label className="flex items-center gap-2 text-[12px] font-bold">
                <input type="checkbox" checked={everyMatch} onChange={(e) => setEveryMatch(e.target.checked)} className="h-5 w-5" />
                Conta tutte le partite, anche quelle già giocate
              </label>
              {!everyMatch && (
                <label className="flex flex-col gap-1 text-[12px] font-bold">
                  Conta le partite finite da (ora di Roma)
                  <input
                    type="datetime-local"
                    value={since}
                    onChange={(e) => setSince(e.target.value)}
                    className="min-h-10 rounded-md border-2 border-black bg-panel-raised px-2 text-[13px] font-bold"
                  />
                </label>
              )}
              {valid && <p className="text-[11px] leading-4 text-muted">{combatUnlockRule({ basis, count: number })}</p>}
            </>
          ) : (
            <p className="text-[11px] leading-4 text-muted">Ogni personaggio con un kit si può schierare subito.</p>
          )}
          <button type="button" disabled={busy || !valid} onClick={() => void save()} className="btn btn-primary min-h-10 px-2 text-[12px] disabled:opacity-45">
            Salva lo sblocco
          </button>
          {message && <p className="text-[12px] font-bold leading-4 text-comic-yellow">{message}</p>}
        </>
      )}
    </section>
  );
}

export default function CombatKitsAdminPage() {
  useRequireSignedIn();
  const isAdmin = useIsAdmin();
  const [rows, setRows] = useState<KitRow[] | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Fits the phone and never scrolls (see .game-shell): the header stays, and the settings and
  // the list (or the kit being written) scroll inside.
  useLockedScreen(isAdmin === true);
  // A kit open: the back arrow closes it and shows the list again.
  useBackStep(editing !== null, () => {
    setEditing(null);
    setConfirmDelete(false);
  });

  async function reload() {
    setRows(await rpc<KitRow[]>("admin_combat_kits"));
  }

  useEffect(() => {
    if (isAdmin !== true) return;
    let live = true;
    rpc<KitRow[]>("admin_combat_kits")
      .then((data) => live && setRows(data))
      .catch((cause) => live && setMessage(describeServerError(cause)));
    return () => {
      live = false;
    };
  }, [isAdmin]);

  if (isAdmin === null || (isAdmin && rows === null && !message)) return <LoadingScreen label="Carico le mosse…" />;
  if (!isAdmin) return <p className="p-6 text-center text-sm font-semibold text-comic-magenta">Questa pagina è riservata agli amministratori.</p>;

  async function startNew() {
    setMessage(null);
    const wanted = code.trim().toUpperCase();
    const { data, error } = await getSupabase().from("card_definitions").select("id, code, name, stats").eq("code", wanted).maybeSingle();
    if (error || !data) {
      setMessage(`Nessun personaggio con il codice ${wanted}.`);
      return;
    }
    const existing = rows?.find((r) => r.definition_id === data.id);
    if (existing) {
      setEditing({ definitionId: existing.definition_id, code: existing.code, name: existing.name, text: JSON.stringify(existing.kit, null, 2), version: existing.version });
      return;
    }
    const kit = genericCombatKit(data.code, data.stats as Record<string, number>, COMBAT_FAMILIES);
    setEditing({ definitionId: data.id, code: data.code, name: data.name, text: JSON.stringify(kit, null, 2), version: null });
  }

  async function save(kit: CombatKit) {
    if (!editing) return;
    setBusy(true);
    setMessage(null);
    try {
      const version = await rpc<number>("admin_save_combat_kit", { p_definition: editing.definitionId, p_kit: kit });
      setEditing({ ...editing, version });
      setMessage(`Salvato: versione ${version}.`);
      await reload();
    } catch (cause) {
      setMessage(describeServerError(cause));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!editing) return;
    setBusy(true);
    try {
      await rpc<boolean>("admin_delete_combat_kit", { p_definition: editing.definitionId });
      setEditing(null);
      setConfirmDelete(false);
      setMessage("Kit tolto: il personaggio non si può più schierare nello Scontro.");
      await reload();
    } catch (cause) {
      setMessage(describeServerError(cause));
    } finally {
      setBusy(false);
    }
  }

  const check = editing ? problemsOf(editing.text) : null;

  return (
    <div className="game-shell text-foreground">
      <header className="flex shrink-0 items-center gap-2 px-3 pb-1 pt-2">
        <BackLink href="/editor" />
        <div className="min-w-0">
          <h1 className="truncate font-display text-2xl uppercase leading-8">Mosse dello Scontro</h1>
          <p className="text-[11px] font-semibold leading-4 text-muted">Un kit per personaggio: chi non ce l&apos;ha non si schiera.</p>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col gap-2 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-1">
        {message && <p className="shrink-0 text-[12px] font-bold leading-4 text-comic-yellow">{message}</p>}

        {editing && check ? (
          <section className="flex min-h-0 flex-1 flex-col gap-2">
            <p className="shrink-0 text-[14px] font-extrabold">
              {editing.name} <span className="text-faint">({editing.code})</span> · {editing.version ? `versione ${editing.version}` : "nuovo"}
            </p>
            <textarea
              value={editing.text}
              onChange={(e) => {
                setEditing({ ...editing, text: e.target.value });
                setConfirmDelete(false);
              }}
              spellCheck={false}
              aria-label="Il kit"
              className="min-h-32 w-full flex-1 resize-none rounded-md border-2 border-black bg-panel p-2 font-mono text-[11px] leading-4"
            />
            <div className="max-h-[30%] shrink-0 overflow-y-auto overscroll-contain empty:hidden">
              {check.errors.length > 0 ? (
                <ul className="list-disc pl-4 text-[12px] leading-4 text-comic-magenta">
                  {check.errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              ) : (
                check.kit && (
                  <ul className="text-[12px] leading-4 text-muted">
                    {(["base", "special", "supreme"] as const).map((slot) => (
                      <li key={slot}>
                        <span className="font-bold text-foreground">{check.kit!.base && check.kit![slot].name}</span>: {describeCombatMove(check.kit![slot])}
                      </li>
                    ))}
                    {check.kit.passive && (
                      <li>
                        <span className="font-bold text-foreground">{check.kit.passive.name}</span> (passiva)
                      </li>
                    )}
                  </ul>
                )
              )}
            </div>
            <div className="grid shrink-0 grid-cols-3 gap-1.5">
              <button type="button" disabled={busy || check.errors.length > 0 || !check.kit} onClick={() => check.kit && void save(check.kit)} className="btn btn-primary min-h-11 px-1 text-[12px] disabled:opacity-45">
                Salva
              </button>
              <button type="button" onClick={() => setEditing(null)} className="btn btn-ghost min-h-11 px-1 text-[12px]">
                Chiudi
              </button>
              {editing.version !== null && (
                <button type="button" disabled={busy} onClick={() => (confirmDelete ? void remove() : setConfirmDelete(true))} className="btn btn-ghost min-h-11 px-1 text-[12px] text-comic-magenta">
                  {confirmDelete ? "Sicuro?" : "Togli"}
                </button>
              )}
            </div>
          </section>
        ) : (
          <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain px-1 pb-1">
            <UnlockSettings />
            <div className="flex gap-1.5">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Codice, es. P002"
                aria-label="Codice del personaggio"
                className="min-h-11 min-w-0 flex-1 rounded-md border-2 border-black bg-panel px-2 text-[14px] font-bold uppercase"
              />
              <button type="button" disabled={!code.trim()} onClick={() => void startNew()} className="btn btn-primary min-h-11 px-3 text-[12px] disabled:opacity-45">
                Apri kit
              </button>
            </div>
            <ul className="flex flex-col gap-1.5">
              {(rows ?? []).map((row) => (
                <li key={row.definition_id}>
                  <button
                    type="button"
                    onClick={() => setEditing({ definitionId: row.definition_id, code: row.code, name: row.name, text: JSON.stringify(row.kit, null, 2), version: row.version })}
                    className="flex w-full items-center justify-between gap-2 rounded-md border-2 border-black bg-panel px-2 py-1.5 text-left"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-extrabold leading-4">
                        {row.name} <span className="text-faint">({row.code})</span>
                      </span>
                      <span className="block truncate text-[11px] leading-4 text-muted">
                        {row.kit.base.name} · {row.kit.special.name} · {row.kit.supreme.name}
                      </span>
                    </span>
                    <span className="shrink-0 text-[11px] font-bold text-faint">v{row.version}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
