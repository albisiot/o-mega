"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { BackLink, TabBar } from "@/components/comic-parts";
import { TraitFilter } from "@/components/trait-filter";
import { useBackStep } from "@/lib/back-step";
import { describeServerError } from "@/lib/errors";
import { DIFFICULTY_LABELS } from "@/lib/match";
import {
  chapterProblem,
  countByRarities,
  countByTraits,
  countLevel,
  missionChanged,
  missionDraft,
  missionProblem,
  saveStoryChapter,
  saveStoryMission,
  saveStorySeason,
  seasonProblem,
  STORY_TEXT_LIMITS,
  type ChapterDraft,
  type MissionDraft,
  type SeasonDraft,
  type StoryAdmin,
  type StoryAdminMission,
} from "@/lib/story-admin";
import { describeStarTraits, joinOr, STAR_NAMES } from "@/lib/story-stars";
import { describeThreatModifier } from "@/lib/threat-modifiers";
import { useLockedScreen } from "@/lib/use-locked-screen";

const INPUT = "min-h-12 w-full min-w-0 max-w-full border-2 border-comic-yellow bg-black px-3 text-base font-semibold";
const AREA = "w-full min-w-0 max-w-full border-2 border-comic-yellow bg-black px-3 py-2 text-base font-medium leading-5";
const LABEL = "flex min-w-0 flex-col gap-1 text-sm font-bold";
const CHIP = "flex min-h-11 shrink-0 items-center border-2 px-3 text-sm font-bold";

type Tab = "missions" | "chapters" | "edit";
type Editing = { kind: "mission"; code: string } | { kind: "chapter"; chapter: number } | { kind: "season"; season: number } | null;

/**
 * The Story for admins: every mission by chapter with its stars, the chapters and seasons,
 * and a form for each. Texts, prize and stars change here; opponents, threats and bot are
 * tuned by simulation and only shown. Every save is checked again on the server and applies
 * to the matches created after it.
 */
export function StoryAdminView({ initial }: { initial: StoryAdmin }) {
  useLockedScreen(true);
  const [data, setData] = useState(initial);
  const [tab, setTab] = useState<Tab>("missions");
  const [season, setSeason] = useState(initial.seasons[0]?.season ?? 1);
  const [chapter, setChapter] = useState(initial.chapters.find((c) => c.season === season)?.chapter ?? 1);
  const [editing, setEditing] = useState<Editing>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // A mission, chapter or season being edited: the back arrow returns to its list.
  useBackStep(tab === "edit", () => {
    setTab(editing && editing.kind !== "mission" ? "chapters" : "missions");
    setNotice(null);
  });

  const edit = (next: Editing) => {
    setEditing(next);
    setNotice(null);
    setTab("edit");
  };
  const saved = (next: StoryAdmin, message: string, back: Tab) => {
    setData(next);
    setNotice(message);
    setEditing(null);
    setTab(back);
  };

  const chaptersOfSeason = data.chapters.filter((c) => c.season === season);
  const missions = data.missions.filter((m) => m.chapter === chapter);
  const editedMission = editing?.kind === "mission" ? data.missions.find((m) => m.code === editing.code) : undefined;
  const editedChapter = editing?.kind === "chapter" ? data.chapters.find((c) => c.chapter === editing.chapter) : undefined;
  const editedSeason = editing?.kind === "season" ? data.seasons.find((s) => s.season === editing.season) : undefined;

  return (
    <div className="game-shell">
      <header className="flex shrink-0 items-center gap-2.5 px-3 pb-1 pt-2">
        <BackLink href="/editor" />
        <div className="min-w-0">
          <h1 className="truncate font-display text-[28px] uppercase leading-8 text-comic-yellow">Storia</h1>
          <p className="truncate text-xs font-semibold leading-4 text-muted">Testi, premi e stelle delle missioni.</p>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col gap-2 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-1">
        <TabBar
          tabs={[
            { key: "missions", label: "Missioni" },
            { key: "chapters", label: "Capitoli" },
            { key: "edit", label: "Modifica" },
          ]}
          current={tab}
          onPick={(next) => {
            setTab(next);
            setNotice(null);
          }}
          label="Gestione della Storia"
        />
        <div aria-live="polite" className="shrink-0 empty:hidden">
          {notice && <p className="bg-panel px-3 py-2 text-sm font-bold text-comic-cyan">{notice}</p>}
        </div>

        {tab === "missions" && (
          <div role="tabpanel" className="flex min-h-0 flex-1 flex-col gap-2">
            {/* Season, then chapter: one chapter's five missions at a time. */}
            <div className="flex shrink-0 gap-1.5" role="group" aria-label="Stagione">
              {data.seasons.map((s) => (
                <button
                  key={s.season}
                  type="button"
                  aria-pressed={season === s.season}
                  onClick={() => {
                    setSeason(s.season);
                    setChapter(data.chapters.find((c) => c.season === s.season)?.chapter ?? chapter);
                  }}
                  className={`${CHIP} min-w-0 flex-1 justify-center truncate ${season === s.season ? "border-comic-cyan text-comic-cyan" : "border-line"}`}
                >
                  Stagione {s.season}
                </button>
              ))}
            </div>
            <div className="grid shrink-0 grid-cols-6 gap-1" role="group" aria-label="Capitolo">
              {chaptersOfSeason.map((c) => (
                <button
                  key={c.chapter}
                  type="button"
                  aria-pressed={chapter === c.chapter}
                  aria-label={`Capitolo ${c.number}, ${c.title}`}
                  onClick={() => setChapter(c.chapter)}
                  className={`min-h-11 -skew-x-8 font-display text-lg ${chapter === c.chapter ? "bg-comic-magenta text-black" : "bg-panel text-muted"}`}
                >
                  {c.number}
                </button>
              ))}
            </div>
            <ul className="-mx-1 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto overscroll-contain px-1">
              <li className="shrink-0 text-xs font-semibold leading-4 text-muted">
                {data.chapters.find((c) => c.chapter === chapter)?.title} · {data.players}{" "}
                {data.players === 1 ? "giocatore ha" : "giocatori hanno"} completato almeno una missione
              </li>
              {missions.map((mission) => (
                <MissionRow key={mission.code} mission={mission} data={data} onEdit={() => edit({ kind: "mission", code: mission.code })} />
              ))}
            </ul>
          </div>
        )}

        {tab === "chapters" && (
          <ul role="tabpanel" className="-mx-1 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-1">
            {data.seasons.map((s) => (
              <li key={s.season} className="flex flex-col gap-1">
                <TextRow
                  title={`Stagione ${s.season} · ${s.title}`}
                  text={s.ending}
                  onEdit={() => edit({ kind: "season", season: s.season })}
                  strong
                />
                {data.chapters
                  .filter((c) => c.season === s.season)
                  .map((c) => (
                    <TextRow
                      key={c.chapter}
                      title={`Capitolo ${c.number} · ${c.title}`}
                      text={c.intro}
                      onEdit={() => edit({ kind: "chapter", chapter: c.chapter })}
                    />
                  ))}
              </li>
            ))}
          </ul>
        )}

        {tab === "edit" &&
          (editedMission ? (
            <MissionForm
              key={editedMission.code}
              mission={editedMission}
              data={data}
              onSaved={(next) => saved(next, `Missione ${editedMission.code} salvata: vale per le partite che iniziano da adesso.`, "missions")}
            />
          ) : editedChapter ? (
            <TextForm
              key={`chapter-${editedChapter.chapter}`}
              title={`Capitolo ${editedChapter.number} della Stagione ${editedChapter.season}`}
              fields={[
                { key: "title", label: "Titolo", limits: STORY_TEXT_LIMITS.title },
                { key: "intro", label: "Introduzione", limits: STORY_TEXT_LIMITS.chapterIntro, area: 6 },
                { key: "outro", label: "Finale (dopo l'ultima missione)", limits: STORY_TEXT_LIMITS.outro, area: 8 },
              ]}
              initial={{ title: editedChapter.title, intro: editedChapter.intro, outro: editedChapter.outro }}
              problem={(values) => chapterProblem({ chapter: editedChapter.chapter, ...(values as Omit<ChapterDraft, "chapter">) })}
              save={(values) => saveStoryChapter({ chapter: editedChapter.chapter, ...(values as Omit<ChapterDraft, "chapter">) })}
              onSaved={(next) => saved(next, "Capitolo salvato.", "chapters")}
            />
          ) : editedSeason ? (
            <TextForm
              key={`season-${editedSeason.season}`}
              title={`Stagione ${editedSeason.season}`}
              fields={[
                { key: "title", label: "Titolo", limits: STORY_TEXT_LIMITS.title },
                { key: "ending", label: "Messaggio di fine stagione", limits: STORY_TEXT_LIMITS.ending, area: 4 },
              ]}
              initial={{ title: editedSeason.title, ending: editedSeason.ending }}
              problem={(values) => seasonProblem({ season: editedSeason.season, ...(values as Omit<SeasonDraft, "season">) })}
              save={(values) => saveStorySeason({ season: editedSeason.season, ...(values as Omit<SeasonDraft, "season">) })}
              onSaved={(next) => saved(next, "Stagione salvata.", "chapters")}
            />
          ) : (
            <p role="tabpanel" className="text-sm font-semibold text-muted">
              Scegli una missione, un capitolo o una stagione dalle altre schede e tocca Modifica.
            </p>
          ))}
      </main>
    </div>
  );
}

/** The star rules of a mission as players read them, from the codes. */
function rulesText(mission: Pick<StoryAdminMission, "star_rarities" | "star_traits">, data: StoryAdmin) {
  const rarityNames = data.rarities.filter((r) => mission.star_rarities.includes(r.code)).map((r) => r.name);
  const traitsText = data.trait_catalog
    .map((category) => ({
      category: category.name,
      traits: category.traits.filter((t) => mission.star_traits.includes(t.code)).map((t) => t.name),
    }))
    .filter((group) => group.traits.length > 0);
  return { rarities: `Solo ${joinOr(rarityNames)}`, traits: `Solo ${describeStarTraits(traitsText)}` };
}

function MissionRow({ mission, data, onEdit }: { mission: StoryAdminMission; data: StoryAdmin; onEdit: () => void }) {
  const text = rulesText(mission, data);
  return (
    <li className="flex shrink-0 flex-col gap-0.5 bg-panel px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 font-display text-[17px] uppercase leading-5">
          <span className="text-comic-yellow">{mission.ord}.</span> {mission.title}
        </p>
        <button type="button" onClick={onEdit} className="-my-2 min-h-11 shrink-0 px-1 text-[13px] font-extrabold uppercase underline">
          Modifica
        </button>
      </div>
      <p className="truncate text-xs font-semibold leading-4 text-muted">
        {mission.opponent} · {DIFFICULTY_LABELS[mission.bot_difficulty]} · premio {mission.reward_coins} monete
        {mission.reward_card ? ` e ${mission.reward_card.name}` : ""}
      </p>
      <p className="text-xs font-semibold leading-4">
        <span className="text-comic-yellow">★</span> 3-0 · {text.rarities} · {text.traits} ·{" "}
        <span className="text-comic-yellow">{mission.star_coins} monete a stella</span>
      </p>
      <p className="text-[11px] font-medium leading-[14px] text-faint">
        Completata da {mission.completed} · stelle: {STAR_NAMES.flawless} {mission.stars_earned.flawless}, {STAR_NAMES.rarities}{" "}
        {mission.stars_earned.rarities}, {STAR_NAMES.traits} {mission.stars_earned.traits}
      </p>
    </li>
  );
}

function TextRow({ title, text, onEdit, strong = false }: { title: string; text: string; onEdit: () => void; strong?: boolean }) {
  return (
    <div className={`flex items-start gap-2 px-3 py-2 ${strong ? "bg-panel-raised" : "bg-panel"}`}>
      <div className="min-w-0 flex-1">
        <p className={`font-display uppercase leading-5 ${strong ? "text-[18px] text-comic-cyan" : "text-[16px]"}`}>{title}</p>
        <p className="line-clamp-2 text-xs font-medium leading-4 text-muted">{text}</p>
      </div>
      <button type="button" onClick={onEdit} className="-my-1 min-h-11 shrink-0 px-1 text-[13px] font-extrabold uppercase underline">
        Modifica
      </button>
    </div>
  );
}

/** "12 personaggi": red under the server's minimum, yellow under the warning threshold. */
function CountNote({ count, minimum, what }: { count: number; minimum: number; what: string }) {
  const level = countLevel(count, minimum);
  return (
    <p
      className={`text-xs font-bold leading-4 ${
        level === "refused" ? "text-comic-magenta" : level === "few" ? "text-comic-yellow" : "text-comic-cyan"
      }`}
    >
      {count} personaggi {what}
      {level === "refused"
        ? `: ne servono almeno ${minimum}.`
        : level === "few"
          ? ": pochi, pochi giocatori riusciranno a formare la squadra."
          : "."}
    </p>
  );
}

function Section({ title, children, note }: { title: string; children: ReactNode; note?: string }) {
  return (
    <section className="flex flex-col gap-2 bg-panel px-3 py-2">
      <h2 className="font-display text-xl uppercase leading-6">{title}</h2>
      {note && <p className="text-[11px] font-medium leading-4 text-muted">{note}</p>}
      {children}
    </section>
  );
}

function MissionForm({ mission, data, onSaved }: { mission: StoryAdminMission; data: StoryAdmin; onSaved: (next: StoryAdmin) => void }) {
  const [draft, setDraft] = useState<MissionDraft>(() => missionDraft(mission));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (change: Partial<MissionDraft>) => {
    setDraft((current) => ({ ...current, ...change }));
    setError(null);
  };
  const problem = missionProblem(draft, data);
  const changed = missionChanged(draft, mission);
  const rarityCount = countByRarities(data.characters, draft.star_rarities);
  const traitCount = countByTraits(data.characters, draft.star_traits, data.trait_catalog);
  const chapter = data.chapters.find((c) => c.chapter === mission.chapter);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (problem || !changed) return;
    setSaving(true);
    setError(null);
    try {
      onSaved(await saveStoryMission(draft));
    } catch (cause) {
      setError(describeServerError(cause));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col gap-2" role="tabpanel">
      <p className="shrink-0 truncate text-xs font-bold uppercase text-comic-cyan">
        {mission.code} · Stagione {chapter?.season}, Capitolo {chapter?.number}, missione {mission.ord}
      </p>
      <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-1">
        <Section title="Testi">
          <label className={LABEL}>
            Titolo
            <input value={draft.title} onChange={(e) => set({ title: e.target.value })} maxLength={40} className={INPUT} />
          </label>
          <label className={LABEL}>
            Avversario
            <input value={draft.opponent} onChange={(e) => set({ opponent: e.target.value })} maxLength={60} className={INPUT} />
          </label>
          <label className={LABEL}>
            Introduzione
            <textarea value={draft.intro} onChange={(e) => set({ intro: e.target.value })} maxLength={600} rows={5} className={AREA} />
          </label>
        </Section>

        <Section title="Premio" note="Si paga una volta sola, alla prima vittoria.">
          <label className={LABEL}>
            Monete (0–10.000)
            <input
              inputMode="numeric"
              value={draft.reward_coins}
              onChange={(e) => set({ reward_coins: e.target.value.replace(/[^0-9]/g, "").slice(0, 5) })}
              className={INPUT}
            />
          </label>
          {mission.reward_card && (
            <p className="text-xs font-semibold text-muted">Più la carta {mission.reward_card.name}: tarata con la simulazione, non cambia qui.</p>
          )}
        </Section>

        <Section
          title="Stelle"
          note="Ogni stella si prende con una vittoria qualsiasi, anche rigiocando, e paga le sue monete la prima volta. La stella del 3-0 non cambia."
        >
          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-sm font-bold">Rarità: tutta la squadra di queste rarità</legend>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {data.rarities.map((rarity) => {
                const on = draft.star_rarities.includes(rarity.code);
                return (
                  <button
                    key={rarity.code}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      set({
                        star_rarities: on
                          ? draft.star_rarities.filter((code) => code !== rarity.code)
                          : data.rarities.map((r) => r.code).filter((code) => code === rarity.code || draft.star_rarities.includes(code)),
                      })
                    }
                    className={`${CHIP} ${on ? "text-black" : "border-line"}`}
                    style={on ? { background: rarity.color, borderColor: rarity.color } : undefined}
                  >
                    {rarity.name}
                  </button>
                );
              })}
            </div>
            <CountNote count={rarityCount} minimum={data.min_star_characters} what="di queste rarità" />
          </fieldset>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-sm font-bold">Tratti: in una categoria ne basta uno, servono tutte le categorie scelte</legend>
            <div className="mt-1">
              <TraitFilter
                catalog={data.trait_catalog}
                chosen={draft.star_traits}
                onChange={(next) => set({ star_traits: next })}
                layout="wrap"
                label="Tratti della stella"
              />
            </div>
            {draft.star_traits.length > 0 && (
              <p className="text-xs font-semibold leading-4">Si legge: «{rulesText({ star_rarities: [], star_traits: draft.star_traits }, data).traits}»</p>
            )}
            <CountNote count={traitCount} minimum={data.min_star_characters} what="con questi tratti" />
            {draft.star_traits.length > 0 && (
              <button
                type="button"
                onClick={() => set({ star_traits: [] })}
                className="self-start text-xs font-extrabold uppercase text-muted underline"
              >
                Togli tutti i tratti
              </button>
            )}
          </fieldset>
          <label className={LABEL}>
            Monete per ogni stella (0–1.000)
            <input
              inputMode="numeric"
              value={draft.star_coins}
              onChange={(e) => set({ star_coins: e.target.value.replace(/[^0-9]/g, "").slice(0, 4) })}
              className={INPUT}
            />
            <span className="text-[11px] font-medium text-muted">Proposta per questo capitolo: {mission.default_star_coins}.</span>
          </label>
        </Section>

        <Section title="Tarato con la simulazione" note="Avversari, Minacce e bot: si cambiano con una migrazione, dopo una nuova simulazione.">
          <p className="text-sm font-semibold">Bot {DIFFICULTY_LABELS[mission.bot_difficulty]}</p>
          <p className="text-xs font-semibold leading-4 text-muted">
            {mission.opponents.map((card) => `${card.name} (${data.rarities.find((r) => r.code === card.rarity)?.name ?? card.rarity})`).join(", ")}
          </p>
          <ol className="flex flex-col gap-0.5">
            {mission.threats.map((threat, i) => (
              <li key={threat.code} className="text-xs font-semibold leading-4">
                <span className="text-comic-yellow">
                  {i + 1}. Livello {threat.level}
                </span>{" "}
                {threat.name}
                {threat.modifier && <span className="text-muted"> · {describeThreatModifier(threat.modifier, "").name}</span>}
              </li>
            ))}
          </ol>
        </Section>
      </div>

      <div aria-live="polite" className="shrink-0 empty:hidden">
        {(error ?? (changed ? problem : null)) && <p className="text-sm font-bold text-comic-magenta">{error ?? problem}</p>}
      </div>
      <button type="submit" disabled={saving || Boolean(problem) || !changed} className="btn btn-primary shrink-0">
        {saving ? "Salvataggio…" : changed ? "Salva la missione" : "Nessuna modifica"}
      </button>
    </form>
  );
}

type TextField = { key: string; label: string; limits: readonly [number, number]; area?: number };

/** A form of texts only: a chapter or a season. */
function TextForm({
  title,
  fields,
  initial,
  problem,
  save,
  onSaved,
}: {
  title: string;
  fields: TextField[];
  initial: Record<string, string>;
  problem: (values: Record<string, string>) => string | null;
  save: (values: Record<string, string>) => Promise<StoryAdmin>;
  onSaved: (next: StoryAdmin) => void;
}) {
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const changed = fields.some((field) => values[field.key].trim() !== initial[field.key]);
  const blocked = problem(values);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (blocked || !changed) return;
    setSaving(true);
    setError(null);
    try {
      onSaved(await save(values));
    } catch (cause) {
      setError(describeServerError(cause));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col gap-2" role="tabpanel">
      <p className="shrink-0 truncate text-xs font-bold uppercase text-comic-cyan">{title}</p>
      <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-1">
        {fields.map((field) => (
          <label key={field.key} className={LABEL}>
            <span>
              {field.label}{" "}
              <span className="text-[11px] font-medium text-muted">
                ({values[field.key].trim().length}/{field.limits[1]})
              </span>
            </span>
            {field.area ? (
              <textarea
                value={values[field.key]}
                onChange={(e) => {
                  setValues({ ...values, [field.key]: e.target.value });
                  setError(null);
                }}
                maxLength={field.limits[1]}
                rows={field.area}
                className={AREA}
              />
            ) : (
              <input
                value={values[field.key]}
                onChange={(e) => {
                  setValues({ ...values, [field.key]: e.target.value });
                  setError(null);
                }}
                maxLength={field.limits[1]}
                className={INPUT}
              />
            )}
          </label>
        ))}
      </div>
      <div aria-live="polite" className="shrink-0 empty:hidden">
        {(error ?? (changed ? blocked : null)) && <p className="text-sm font-bold text-comic-magenta">{error ?? blocked}</p>}
      </div>
      <button type="submit" disabled={saving || Boolean(blocked) || !changed} className="btn btn-primary shrink-0">
        {saving ? "Salvataggio…" : changed ? "Salva" : "Nessuna modifica"}
      </button>
    </form>
  );
}
