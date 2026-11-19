"use client";

import { useState } from "react";
import { BackLink, TabBar } from "@/components/comic-parts";
import { describeServerError } from "@/lib/errors";
import {
  OUTCOMES,
  rewardChanges,
  rewardModes,
  rewardsProblem,
  ruleId,
  saveMatchRewards,
  type MatchRewardRule,
  type MatchRewards,
  type RewardSettingKey,
} from "@/lib/match-rewards";
import { useLockedScreen } from "@/lib/use-locked-screen";

type Tab = "matches" | "other";
type Field = "xp" | "coins" | "packs";

const FIELDS: { key: Field; label: string }[] = [
  { key: "xp", label: "XP" },
  { key: "coins", label: "Monete" },
  { key: "packs", label: "Pacchetti" },
];

const NUMBER = "input-comic h-11 w-full min-w-0 px-1 text-center font-display text-lg";

const SETTINGS: { key: RewardSettingKey; label: string; hint: string }[] = [
  { key: "match_rewards.daily_coin_cap", label: "Tetto monete al giorno", hint: "Dalle partite, per giocatore · 0 = nessun tetto" },
  { key: "match_rewards.daily_pack_cap", label: "Tetto pacchetti al giorno", hint: "Dalle partite, per giocatore · 0 = nessun tetto" },
  { key: "conquest.no_card_bonus_coins", label: "Conquista senza carta", hint: "Monete al vincitore se nessuna carta è conquistabile" },
];

const digits = (value: string) => value.replace(/[^0-9]/g, "").slice(0, 6);
const toNumber = (value: string) => (value.trim() === "" ? NaN : Number(value));

/**
 * What every match pays, for admins: per mode, opponent and outcome, XP, coins and packs;
 * then the daily caps, the Emergenza and the Emergenza della settimana. Everything is saved at once and checked again on
 * the server; it applies to the matches that end after the save.
 */
export function MatchRewardAdmin({ initial }: { initial: MatchRewards }) {
  useLockedScreen(true);
  const [saved, setSaved] = useState(initial);
  const [rules, setRules] = useState<Record<string, Record<Field, string>>>(() => rulesDraft(initial));
  const [settings, setSettings] = useState<Record<RewardSettingKey, string>>(() => settingsDraft(initial));
  const [tab, setTab] = useState<Tab>("matches");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const ruleNumbers: MatchRewardRule[] = saved.rules.map((rule) => {
    const draft = rules[ruleId(rule)];
    return { ...rule, xp: toNumber(draft.xp), coins: toNumber(draft.coins), packs: toNumber(draft.packs) };
  });
  const settingNumbers = Object.fromEntries(
    Object.entries(settings).map(([key, value]) => [key, toNumber(value)]),
  ) as Record<RewardSettingKey, number>;
  const problem = rewardsProblem(ruleNumbers, settingNumbers, saved.emergency_threats_per_run, saved.emergency_week_threats_per_run);
  // The Emergenza della settimana (SPEC §5.16): its threats, or undefined on a server without it.
  const weekly = "emergency_week.rewards.tier1_passed" in saved.settings ? saved.emergency_week_threats_per_run : undefined;
  const changes = rewardChanges(saved, ruleNumbers, settingNumbers);
  const changed = changes.rules.length + Object.keys(changes.settings).length;

  function setRule(id: string, field: Field, value: string) {
    setRules((current) => ({ ...current, [id]: { ...current[id], [field]: digits(value) } }));
    setNotice(null);
  }
  function setSetting(key: RewardSettingKey, value: string) {
    setSettings((current) => ({ ...current, [key]: digits(value) }));
    setNotice(null);
  }

  async function save() {
    if (problem || changed === 0) return;
    setBusy(true);
    setError(null);
    try {
      const next = await saveMatchRewards(changes.rules, changes.settings);
      setSaved(next);
      setRules(rulesDraft(next));
      setSettings(settingsDraft(next));
      setNotice("Salvato: vale per le partite che finiscono da adesso.");
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
          <h1 className="truncate font-display text-[28px] uppercase leading-8 text-comic-yellow">Ricompense</h1>
          <p className="text-xs font-semibold leading-4 text-muted">Quanto dà ogni partita, per modalità ed esito.</p>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col gap-2 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-1">
        <TabBar
          tabs={[
            { key: "matches", label: "Partite" },
            { key: "other", label: "Tetti ed Emergenza" },
          ]}
          current={tab}
          onPick={setTab}
          label="Gestione ricompense"
        />

        <div role="tabpanel" className="flex min-h-0 flex-1 flex-col gap-3 -mx-1 overflow-y-auto overscroll-contain px-1">
          {tab === "matches" ? (
            <>
              <p className="text-xs font-medium leading-4 text-muted">
                Chi abbandona non prende nulla; chi vince per abbandono dell&apos;altro prende la vittoria. I pacchetti
                sono standard, aperti subito. Ogni moneta passa dal registro dei movimenti.
              </p>
              {rewardModes(saved.rules).map((mode) => (
                <section key={mode.key} aria-label={mode.label} className="flex flex-col gap-1.5 bg-panel px-3 py-2">
                  <h2 className="font-display text-xl uppercase leading-6">{mode.label}</h2>
                  {mode.note && <p className="text-[11px] font-medium leading-4 text-muted">{mode.note}</p>}
                  {mode.opponents.map((opponent) => (
                    <div key={opponent.key} className="flex flex-col gap-1">
                      <h3 className="text-[13px] font-extrabold leading-4 text-comic-cyan">{opponent.label}</h3>
                      <div className="grid grid-cols-[4.5rem_repeat(3,minmax(0,1fr))] items-center gap-x-1.5 gap-y-1">
                        <span aria-hidden />
                        {FIELDS.map((field) => (
                          <span key={field.key} className="text-center text-[11px] font-extrabold uppercase text-faint">
                            {field.label}
                          </span>
                        ))}
                        {OUTCOMES.map((outcome) => {
                          const id = ruleId({ mode_key: mode.key, opponent: opponent.key, outcome: outcome.key });
                          const draft = rules[id];
                          if (!draft) return null;
                          return (
                            <div key={outcome.key} className="contents">
                              <span className="text-[13px] font-bold leading-4">{outcome.label}</span>
                              {FIELDS.map((field) => (
                                <input
                                  key={field.key}
                                  inputMode="numeric"
                                  value={draft[field.key]}
                                  onChange={(event) => setRule(id, field.key, event.target.value)}
                                  aria-label={`${mode.label}, ${opponent.label.toLowerCase()}, ${outcome.label.toLowerCase()}: ${field.label}`}
                                  className={NUMBER}
                                />
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </section>
              ))}
            </>
          ) : (
            <>
              <section aria-label="Tetti giornalieri" className="flex flex-col gap-2 bg-panel px-3 py-2">
                <h2 className="font-display text-xl uppercase leading-6">Tetti e Conquista</h2>
                {SETTINGS.map((setting) => (
                  <SettingRow
                    key={setting.key}
                    label={setting.label}
                    hint={setting.hint}
                    value={settings[setting.key]}
                    onChange={(value) => setSetting(setting.key, value)}
                  />
                ))}
              </section>
              {/* Missing on a server without it: then the row is not shown nor sent. */}
              {"packs.variant_chance_percent" in settings && (
                <section aria-label="Pacchetti" className="flex flex-col gap-2 bg-panel px-3 py-2">
                  <h2 className="font-display text-xl uppercase leading-6">Pacchetti</h2>
                  <SettingRow
                    label="Varianti %"
                    hint="Probabilità che una carta con varianti esca con un disegno variante: pacchetto del giorno, Negozio e premi. Un evento «Caccia alle varianti» può alzarla; i pacchetti speciali hanno la loro."
                    value={settings["packs.variant_chance_percent"]}
                    onChange={(value) => setSetting("packs.variant_chance_percent", value)}
                  />
                </section>
              )}
              <section aria-label="Emergenza" className="flex flex-col gap-2 bg-panel px-3 py-2">
                <h2 className="font-display text-xl uppercase leading-6">Emergenza</h2>
                <p className="text-[11px] font-medium leading-4 text-muted">
                  Non è una partita: paga a soglie di Minacce superate (su {saved.emergency_threats_per_run}), subito, e
                  l&apos;XP quando il tentativo finisce.
                </p>
                <SettingRow
                  label="XP a fine tentativo"
                  hint="0 = nessuna esperienza"
                  value={settings["emergency.rewards.finish_xp"]}
                  onChange={(value) => setSetting("emergency.rewards.finish_xp", value)}
                />
                <TierGrid prefix="emergency" settings={settings} onChange={setSetting} />
              </section>
              <section aria-label="Premi della classifica Emergenza" className="flex flex-col gap-2 bg-panel px-3 py-2">
                <h2 className="font-display text-xl uppercase leading-6">Premi della classifica</h2>
                <p className="text-[11px] font-medium leading-4 text-muted">
                  A mezzanotte la classifica di giornata dell&apos;Emergenza è definitiva: i primi della classifica
                  ricevono questi premi e li riscuotono da un popup. «Dal 4°» vale fino all&apos;ultimo posto mostrato.
                  Un posto senza monete, pacchetti e Schegge non vince niente.
                </p>
                <SettingRow
                  label="Minacce superate minime"
                  hint={`Per vincere un premio · 0 = basta finire (al massimo ${saved.emergency_threats_per_run})`}
                  value={settings["emergency.prizes.min_passed"]}
                  onChange={(value) => setSetting("emergency.prizes.min_passed", value)}
                />
                <PrizeGrid prefix="emergency" settings={settings} onChange={setSetting} />
              </section>
              {weekly !== undefined && (
                <>
                  <section aria-label="Emergenza della settimana" className="flex flex-col gap-2 bg-panel px-3 py-2">
                    <h2 className="font-display text-xl uppercase leading-6">Emergenza della settimana</h2>
                    <p className="text-[11px] font-medium leading-4 text-muted">
                      Un tentativo a settimana, da lunedì a domenica: paga a soglie di Minacce superate (su {weekly}),
                      subito.
                    </p>
                    <TierGrid prefix="emergency_week" settings={settings} onChange={setSetting} />
                  </section>
                  <section aria-label="Premi della classifica della settimana" className="flex flex-col gap-2 bg-panel px-3 py-2">
                    <h2 className="font-display text-xl uppercase leading-6">Premi della settimana</h2>
                    <p className="text-[11px] font-medium leading-4 text-muted">
                      Domenica a mezzanotte la classifica dell&apos;Emergenza della settimana è definitiva: i primi ricevono
                      questi premi e li riscuotono dallo stesso popup. «Dal 4°» vale fino all&apos;ultimo posto mostrato.
                      Un posto senza monete, pacchetti e Schegge non vince niente.
                    </p>
                    <SettingRow
                      label="Minacce superate minime"
                      hint={`Per vincere un premio · 0 = basta finire (al massimo ${weekly})`}
                      value={settings["emergency_week.prizes.min_passed"]}
                      onChange={(value) => setSetting("emergency_week.prizes.min_passed", value)}
                    />
                    <PrizeGrid prefix="emergency_week" settings={settings} onChange={setSetting} />
                  </section>
                </>
              )}
            </>
          )}
        </div>

        <div aria-live="polite" className="shrink-0 empty:hidden">
          {(problem ?? error) && <p className="text-sm font-bold text-comic-magenta">{problem ?? error}</p>}
          {!problem && !error && notice && <p className="text-sm font-bold text-comic-cyan">{notice}</p>}
          {!problem && !error && !notice && changed > 0 && (
            <p className="text-xs font-semibold text-muted">
              {changed === 1 ? "1 modifica da salvare" : `${changed} modifiche da salvare`}
            </p>
          )}
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={save}
            disabled={busy || Boolean(problem) || changed === 0}
            className="btn btn-primary min-w-0 flex-1"
          >
            {busy ? "Salvataggio…" : changed > 0 ? "Salva" : "Nessuna modifica"}
          </button>
          <button
            type="button"
            onClick={() => {
              setRules(rulesDraft(saved));
              setSettings(settingsDraft(saved));
              setError(null);
              setNotice(null);
            }}
            disabled={busy || changed === 0}
            className="btn btn-ghost shrink-0"
          >
            Annulla
          </button>
        </div>
      </main>
    </div>
  );
}

type GridProps = {
  prefix: "emergency" | "emergency_week";
  settings: Record<RewardSettingKey, string>;
  onChange: (key: RewardSettingKey, value: string) => void;
};

/** The three tiers of threats passed of an Emergenza, daily or weekly, and their coins. */
function TierGrid({ prefix, settings, onChange }: GridProps) {
  return (
    <div className="grid grid-cols-[4.5rem_repeat(2,minmax(0,1fr))] items-center gap-x-1.5 gap-y-1">
      <span aria-hidden />
      <span className="text-center text-[11px] font-extrabold uppercase text-faint">Minacce</span>
      <span className="text-center text-[11px] font-extrabold uppercase text-faint">Monete</span>
      {([1, 2, 3] as const).map((tier) => {
        const passed = `${prefix}.rewards.tier${tier}_passed` as RewardSettingKey;
        const coins = `${prefix}.rewards.tier${tier}_coins` as RewardSettingKey;
        return (
          <div key={tier} className="contents">
            <span className="text-[13px] font-bold leading-4">Soglia {tier}</span>
            <input
              inputMode="numeric"
              value={settings[passed]}
              onChange={(event) => onChange(passed, event.target.value)}
              aria-label={`Soglia ${tier}: Minacce superate`}
              className={NUMBER}
            />
            <input
              inputMode="numeric"
              value={settings[coins]}
              onChange={(event) => onChange(coins, event.target.value)}
              aria-label={`Soglia ${tier}: monete`}
              className={NUMBER}
            />
          </div>
        );
      })}
    </div>
  );
}

/**
 * What each place of an Emergenza leaderboard, daily or weekly, wins: coins, packs and Schegge
 * (these only on a server that has them).
 */
function PrizeGrid({ prefix, settings, onChange }: GridProps) {
  const withShards = `${prefix}.prizes.rank1_shards` in settings;
  return (
    <div
      className={`grid ${
        withShards ? "grid-cols-[4.5rem_repeat(3,minmax(0,1fr))]" : "grid-cols-[4.5rem_repeat(2,minmax(0,1fr))]"
      } items-center gap-x-1.5 gap-y-1`}
    >
      <span aria-hidden />
      <span className="text-center text-[11px] font-extrabold uppercase text-faint">Monete</span>
      <span className="text-center text-[11px] font-extrabold uppercase text-faint">Pacchetti</span>
      {withShards && <span className="text-center text-[11px] font-extrabold uppercase text-faint">Schegge</span>}
      {(
        [
          ["rank1", "1° posto"],
          ["rank2", "2° posto"],
          ["rank3", "3° posto"],
          ["others", "Dal 4°"],
        ] as const
      ).map(([tier, label]) => {
        const coins = `${prefix}.prizes.${tier}_coins` as RewardSettingKey;
        const packs = `${prefix}.prizes.${tier}_packs` as RewardSettingKey;
        const shards = `${prefix}.prizes.${tier}_shards` as RewardSettingKey;
        return (
          <div key={tier} className="contents">
            <span className="text-[13px] font-bold leading-4">{label}</span>
            <input
              inputMode="numeric"
              value={settings[coins]}
              onChange={(event) => onChange(coins, event.target.value)}
              aria-label={`${label}: monete`}
              className={NUMBER}
            />
            <input
              inputMode="numeric"
              value={settings[packs]}
              onChange={(event) => onChange(packs, event.target.value)}
              aria-label={`${label}: pacchetti`}
              className={NUMBER}
            />
            {withShards && (
              <input
                inputMode="numeric"
                value={settings[shards]}
                onChange={(event) => onChange(shards, event.target.value)}
                aria-label={`${label}: Schegge`}
                className={NUMBER}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function SettingRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex min-w-0 items-center gap-2">
      <input
        inputMode="numeric"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        className="input-comic h-11 w-20 shrink-0 text-center font-display text-lg"
      />
      <span className="min-w-0">
        <span className="block text-[13px] font-bold leading-4">{label}</span>
        <span className="block text-[11px] font-medium leading-[14px] text-muted">{hint}</span>
      </span>
    </label>
  );
}

function rulesDraft(data: MatchRewards): Record<string, Record<Field, string>> {
  return Object.fromEntries(
    data.rules.map((rule) => [ruleId(rule), { xp: String(rule.xp), coins: String(rule.coins), packs: String(rule.packs) }]),
  );
}

function settingsDraft(data: MatchRewards): Record<RewardSettingKey, string> {
  return Object.fromEntries(Object.entries(data.settings).map(([key, value]) => [key, String(value)])) as Record<
    RewardSettingKey,
    string
  >;
}
