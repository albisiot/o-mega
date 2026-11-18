"use client";

import { useMemo, useState } from "react";
import { useCardDetail } from "@/components/card-detail";
import { CardGroupHeading, CardListControls, useCardListReference, useCardListView } from "@/components/card-list-controls";
import { Silhouette } from "@/components/card-view";
import { InfoTip } from "@/components/info-tip";
import { STAR_MARK_COLORS, StarIcon } from "@/components/story-stars";
import { ChallengeRuleChips } from "@/components/challenge-parts";
import { balance } from "@/config/balance";
import { artSrcSet } from "@/lib/art";
import { challengeVariantsNeeded } from "@o-mega/game-engine";
import { toChallengeRules, whyNotAdmitted, type Challenge, type ChallengeExclusion } from "@/lib/challenges";
import { withBasePath } from "@/lib/base-path";
import { applyCardListView, DEFAULT_CARD_LIST_VIEW, groupCardList, sortAbilityOf } from "@/lib/card-list";
import type { CatalogCard } from "@/lib/collection";
import { describeServerError } from "@/lib/errors";
import {
  deleteFormation,
  saveFormation,
  switchableVariants,
  teamFromFormation,
  type Formation,
  type VariantCopy,
} from "@/lib/match";
import { rarityFrame, rarityLetter } from "@/lib/rarity-theme";
import { fitsStarRarities, fitsStarTraits } from "@o-mega/game-engine";
import { STAR_NAMES, STORY_STARS, starShort, traitCategoryOf, type StarRulesText, type StoryStar } from "@/lib/story-stars";
import { LONG_PRESS_CLASS } from "@/lib/use-long-press";

const LAST_TEAM_KEY = "o-mega.last-team";
/** One order and set of filters for every team picker: the player sorts once for all modes. */
const VIEW_KEY = "o-mega.team-view";
const DEFAULT_VIEW = { ...DEFAULT_CARD_LIST_VIEW, sort: "rarity" };

function loadLastTeam(key: string, owned: Map<string, string>): string[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === "string" && owned.has(id)) : [];
  } catch {
    return [];
  }
}

/** The variants fielded last time (definition id → instance id), those the player can still field. */
function loadLastVariants(key: string, variantCopies: Map<string, VariantCopy[]>): Map<string, string> {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(key) ?? "{}");
    if (!saved || typeof saved !== "object") return new Map();
    return new Map(
      Object.entries(saved).filter(
        (entry): entry is [string, string] =>
          typeof entry[1] === "string" && Boolean(variantCopies.get(entry[0])?.some((copy) => copy.id === entry[1])),
      ),
    );
  } catch {
    return new Map();
  }
}

type TeamPickerProps = {
  catalog: CatalogCard[];
  /** Owned characters: definition id → one card instance id. */
  owned: Map<string, string>;
  /** Conquest only: characters whose fielded copy can be taken (the rest is protected). */
  conquerable?: Set<string> | null;
  /** Conquest only: for characters also owned as starter, the copy that can be put at stake. */
  atRiskCopies?: Map<string, string> | null;
  /** Copies with an artwork variant: fielded only when the player chooses them. */
  variantCopies: Map<string, VariantCopy[]>;
  /** Card instance id → definition id (to load formations). */
  instanceDefinitions: Map<string, string>;
  formations: Formation[];
  onFormationsChanged: (formations: Formation[]) => void;
  startLabel: string;
  starting: boolean;
  onStart: (cardInstanceIds: string[]) => void;
  /** Emergenza, Allarme Triplo: a larger squad, which formations (always a match team) cannot hold. */
  squadSize?: number;
  /** The advice on how to choose, behind an "i". */
  intro?: string;
  /**
   * A story mission: its star rules and the stars the player has. The picker marks the
   * cards that fit them and says which stars the squad can still earn.
   */
  storyStars?: { rules: StarRulesText; earned: StoryStar[] } | null;
  /**
   * A Sfida a tema (SPEC §8.8): only the cards its rules admit can be picked. The picker shows
   * them first, says why the others are out, and starts only with a squad that keeps the rules.
   */
  challenge?: Challenge | null;
};

/** The stars that depend on the squad. */
type CardStar = Exclude<StoryStar, "flawless">;
const CARD_STARS: CardStar[] = ["rarities", "traits"];

/** "3-0 e Rarità", "3-0, Rarità e Tratti". */
function listStars(stars: StoryStar[]): string {
  const names = stars.map((star) => STAR_NAMES[star]);
  return names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} e ${names.at(-1)}`;
}

/**
 * Pick different characters among the owned ones (a match team by default); load or save formations.
 * It fills the screen: the squad and the start button stay put while the cards scroll between them.
 */
export function TeamPicker(props: TeamPickerProps) {
  const { catalog, owned, conquerable, atRiskCopies, variantCopies, instanceDefinitions, formations, onFormationsChanged, startLabel, starting, onStart, squadSize, intro, storyStars, challenge } = props;
  const size = squadSize ?? balance.match.teamSize;
  // A challenge remembers its own last squad: the usual one would rarely keep its rules.
  const lastTeamKey = challenge
    ? `${LAST_TEAM_KEY}.challenge.${challenge.id}`
    : squadSize
      ? `${LAST_TEAM_KEY}.${squadSize}`
      : LAST_TEAM_KEY;
  // Conquest never brings back a variant on its own: a fielded variant is at stake, so the player chooses it each time.
  const lastVariantsKey = conquerable ? null : `${lastTeamKey}.variants`;
  const [selected, setSelected] = useState<string[]>(() => loadLastTeam(lastTeamKey, owned).slice(0, size));
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  // The squad slot whose choices (Conquest stake, artwork variant) are open: a definition id.
  const [optionsOf, setOptionsOf] = useState<string | null>(null);
  // A long press on a card, in the squad or in the list, shows it whole without picking it.
  const detail = useCardDetail();

  const [view, updateView] = useCardListView(VIEW_KEY, DEFAULT_VIEW);
  const { abilities, traits } = useCardListReference();
  const cards = useMemo(() => catalog.filter((card) => owned.has(card.id)), [catalog, owned]);

  // Story: which cards fit the star rules; a tapped star shows only the cards that fit it.
  const [starFilter, setStarFilter] = useState<CardStar | null>(null);
  const fitsStar = useMemo(() => {
    if (!storyStars || storyStars.rules.star_rarities.length === 0) return null;
    const rules = { rarities: storyStars.rules.star_rarities, traits: storyStars.rules.star_traits };
    const categoryOf = traits ? traitCategoryOf(traits.catalog) : null;
    return (star: CardStar, card: CatalogCard): boolean => {
      const facts = { rarity: card.rarity.code, traits: traits?.byCard.get(card.id) ?? [] };
      if (star === "rarities") return fitsStarRarities(facts, rules);
      try {
        // Until the trait catalog arrives no card is marked.
        return categoryOf !== null && fitsStarTraits(facts, rules, categoryOf);
      } catch {
        return false;
      }
    };
  }, [storyStars, traits]);
  // Sfida a tema: why each card is out of the squad (null: it can be picked); the list shows
  // the admitted cards unless the player asks for all of them.
  const challengeRules = useMemo(() => (challenge ? toChallengeRules(challenge.rules) : null), [challenge]);
  // Only variants of the listed styles count, when the challenge lists some.
  const styleCounts = (copy: VariantCopy | undefined): boolean =>
    copy !== undefined &&
    (!challengeRules || challengeRules.variantStyles.length === 0 || (copy.style !== undefined && challengeRules.variantStyles.includes(copy.style)));
  const excludedWhy = useMemo(() => {
    if (!challengeRules) return null;
    const fits = (copy: VariantCopy) =>
      challengeRules.variantStyles.length === 0 || (copy.style !== undefined && challengeRules.variantStyles.includes(copy.style));
    return (card: CatalogCard): ChallengeExclusion | null =>
      whyNotAdmitted(card, challengeRules, traits, (variantCopies.get(card.id) ?? []).some(fits));
  }, [challengeRules, traits, variantCopies]);
  const [showExcluded, setShowExcluded] = useState(false);
  const admittedCount = useMemo(() => (excludedWhy ? cards.filter((card) => excludedWhy(card) === null).length : 0), [cards, excludedWhy]);
  const groups = useMemo(() => {
    const shown = applyCardListView(cards, view, traits);
    const fittingStars = starFilter && fitsStar ? shown.filter((card) => fitsStar(starFilter, card)) : shown;
    const fitting = excludedWhy && !showExcluded ? fittingStars.filter((card) => excludedWhy(card) === null) : fittingStars;
    return groupCardList(fitting, view.sort, traits);
  }, [cards, view, traits, starFilter, fitsStar, excludedWhy, showExcluded]);
  const shownCount = groups.reduce((sum, group) => sum + group.cards.length, 0);
  const rarities = useMemo(
    () => [...new Map(cards.map((card) => [card.rarity.rank, card.rarity])).values()].sort((a, b) => a.rank - b.rank),
    [cards],
  );
  const sortAbility = sortAbilityOf(view.sort);
  const byId = useMemo(() => new Map(catalog.map((card) => [card.id, card])), [catalog]);
  // Characters for which the player fields the pack copy instead of the protected starter one.
  const [staked, setStaked] = useState<Set<string>>(new Set());
  // Characters for which the player fields a copy with an artwork variant: definition id → instance id.
  const [variantChoice, setVariantChoice] = useState<Map<string, string>>(() =>
    lastVariantsKey ? loadLastVariants(lastVariantsKey, variantCopies) : new Map(),
  );
  const instanceIds = selected.map(
    (definitionId) =>
      variantChoice.get(definitionId) ??
      (staked.has(definitionId) ? atRiskCopies!.get(definitionId)! : owned.get(definitionId)!),
  );
  const isAtRisk = (definitionId: string) =>
    Boolean(conquerable?.has(definitionId)) || staked.has(definitionId) || variantChoice.has(definitionId);
  // The variants the player can switch to, one per style; none of the default copy's own style.
  const variantOptions = (definitionId: string) => switchableVariants(variantCopies.get(definitionId), owned.get(definitionId));
  // The style of the variant copy the player chose to field, if any.
  const chosenStyle = (definitionId: string) => {
    const id = variantChoice.get(definitionId);
    return id ? variantCopies.get(definitionId)?.find((copy) => copy.id === id)?.name : undefined;
  };
  // The drawing of the copy fielded for a character: a variant's, or the card's own.
  const fieldedVariant = (definitionId: string): VariantCopy | undefined => {
    const id = variantChoice.get(definitionId) ?? owned.get(definitionId);
    return variantCopies.get(definitionId)?.find((copy) => copy.id === id);
  };
  const fieldedCard = (card: CatalogCard): CatalogCard & { variant?: { name: string } | null } => {
    const variant = fieldedVariant(card.id);
    return variant ? { ...card, art_url: variant.art_url, variant: { name: variant.name } } : card;
  };

  // Conquest: field the pack copy of a character also owned as starter, or back.
  const canStake = (definitionId: string) => Boolean(atRiskCopies?.has(definitionId)) && !variantChoice.has(definitionId);

  function toggleStake(definitionId: string) {
    setStaked((current) => {
      const next = new Set(current);
      if (!next.delete(definitionId)) next.add(definitionId);
      return next;
    });
  }

  // Field this variant instead of the default copy or of another variant; null goes back to the default copy.
  function chooseCopy(definitionId: string, copy: VariantCopy | null) {
    setVariantChoice((current) => {
      const next = new Map(current);
      if (copy) next.set(definitionId, copy.id);
      else next.delete(definitionId);
      return next;
    });
    // A variant replaces the staked pack copy too; the base drawing keeps the stake as it is.
    if (copy) {
      setStaked((current) => {
        const next = new Set(current);
        next.delete(definitionId);
        return next;
      });
    }
  }

  // Conquest: what is at risk, and how rare a card this team can take.
  const minConquerable = balance.conquest.minConquerableCards;
  const atRisk = conquerable ? selected.filter(isAtRisk).length : 0;
  const notEnoughAtRisk = Boolean(conquerable) && selected.length === size && atRisk < minConquerable;
  const limit = selected
    .map((id) => byId.get(id)?.rarity)
    .reduce<CatalogCard["rarity"] | undefined>(
      (best, rarity) => (rarity && (!best || rarity.rank > best.rank) ? rarity : best),
      undefined,
    );

  function toggle(definitionId: string) {
    setMessage(null);
    const card = byId.get(definitionId);
    const adding = !selected.includes(definitionId);
    const why = adding && card && excludedWhy ? excludedWhy(card) : null;
    if (why) {
      setMessage({ text: `${card!.name}: ${why.long}.`, isError: true });
      return;
    }
    setSelected((current) =>
      current.includes(definitionId)
        ? current.filter((id) => id !== definitionId)
        : current.length < size
          ? [...current, definitionId]
          : current,
    );
    // A challenge that wants variants: a new card comes with its variant while some are missing.
    if (adding && selected.length < size && variantsMissing > 0 && !styleCounts(fieldedVariant(definitionId))) {
      const option = variantOptions(definitionId).find(styleCounts);
      if (option) chooseCopy(definitionId, option);
    }
  }

  function loadFormation(formation: Formation) {
    const team = teamFromFormation(formation, { owned, variantCopies, atRiskCopies, instanceDefinitions }, size);
    setSelected(team.selected);
    setStaked(team.staked);
    setVariantChoice(team.variantChoice);
    setMessage(
      team.missing > 0
        ? { text: "Alcune carte di questa formazione non sono più nella collezione.", isError: true }
        : team.replaced > 0
          ? { text: "Alcune copie scelte non ci sono più: al loro posto c'è un'altra copia dello stesso personaggio.", isError: false }
          : null,
    );
  }

  async function save() {
    try {
      const formation = await saveFormation(null, name, instanceIds);
      onFormationsChanged([...formations, formation]);
      setNaming(false);
      setName("");
      setMessage({ text: `Formazione "${formation.name}" salvata.`, isError: false });
    } catch (cause) {
      setMessage({ text: describeServerError(cause), isError: true });
    }
  }

  async function remove(formation: Formation) {
    try {
      await deleteFormation(formation.id);
      onFormationsChanged(formations.filter((f) => f.id !== formation.id));
    } catch (cause) {
      setMessage({ text: describeServerError(cause), isError: true });
    }
  }

  function start() {
    try {
      localStorage.setItem(lastTeamKey, JSON.stringify(selected));
      if (lastVariantsKey) {
        const fielded = selected.flatMap((id) => (variantChoice.has(id) ? [[id, variantChoice.get(id)!]] : []));
        localStorage.setItem(lastVariantsKey, JSON.stringify(Object.fromEntries(fielded)));
      }
    } catch {
      // Remembering the team is a convenience only.
    }
    onStart(instanceIds);
  }

  const optionsCard = optionsOf ? byId.get(optionsOf) : null;
  const optionsVariants = optionsOf ? variantOptions(optionsOf) : [];
  // The default copy of the open slot, as the first drawing to choose from.
  const optionsDefault = optionsOf ? variantCopies.get(optionsOf)?.find((copy) => copy.id === owned.get(optionsOf)) : undefined;
  // Some character in the squad can be fielded with another drawing.
  const squadHasVariants = selected.some((id) => variantOptions(id).length > 0);

  // Sfida a tema: the cards of the squad out of the rules, and the variants it still lacks.
  const squadExcluded = excludedWhy
    ? selected.filter((id) => {
        const card = byId.get(id);
        return !card || excludedWhy(card) !== null;
      }).length
    : 0;
  const variantsWanted = challengeRules ? challengeVariantsNeeded(challengeRules, size) : 0;
  const variantsFielded = selected.filter((id) => styleCounts(fieldedVariant(id))).length;
  const variantsMissing = Math.max(0, variantsWanted - variantsFielded);
  const challengeBlock =
    selected.length < size
      ? null
      : squadExcluded > 0
        ? squadExcluded === 1
          ? "Togli la carta non ammessa"
          : `Togli le ${squadExcluded} carte non ammesse`
        : variantsMissing > 0
          ? `Manca${variantsMissing === 1 ? " 1 variante" : `no ${variantsMissing} varianti`}: tocca una carta con ★`
          : null;

  // Story: the stars the squad can still earn. 3-0 depends on the match; the others on every card.
  const earnedStars = storyStars?.earned ?? [];
  const squadFits = (star: CardStar) =>
    fitsStar !== null &&
    selected.every((id) => {
      const card = byId.get(id);
      return card !== undefined && fitsStar(star, card);
    });
  const reachable = STORY_STARS.filter((star) => !earnedStars.includes(star) && (star === "flawless" || squadFits(star)));
  const starSummary =
    earnedStars.length === STORY_STARS.length
      ? "Hai già tutte e tre le stelle di questa missione."
      : selected.length < size
        ? "Stellina azzurra sulla carta: va bene per Rarità; rosa: per Tratti."
        : reachable.length > 0
          ? `Con questa squadra puoi prendere: ${listStars(reachable)}.`
          : "Con questa squadra non prendi stelle nuove.";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* The squad. A slot with choices (Conquest stake, artwork variant) opens them; otherwise a tap removes the card. */}
      <section className={`grid gap-1.5 ${squadSize && squadSize % 4 === 0 ? "grid-cols-4" : "grid-cols-5"}`}>
        {Array.from({ length: size }, (_, i) => {
          const card = selected[i] ? byId.get(selected[i]) : null;
          const height = squadSize ? "h-14" : "h-[72px]";
          if (!card) {
            return (
              <div
                key={i}
                aria-label={`Posto ${i + 1} libero`}
                className={`flex ${height} -skew-x-8 items-center justify-center border-2 border-dashed border-line bg-panel font-display text-xl text-faint`}
              >
                {i + 1}
              </div>
            );
          }
          const hasVariants = variantOptions(card.id).length > 0;
          const hasOptions = canStake(card.id) || hasVariants;
          const mark = variantChoice.has(card.id) ? "★" : staked.has(card.id) ? "Palio" : hasVariants ? "★" : hasOptions ? "⋯" : null;
          const shown = fieldedCard(card);
          return (
            <button
              key={i}
              type="button"
              {...detail.press(shown)}
              onClick={() => (hasOptions ? setOptionsOf(card.id) : toggle(card.id))}
              aria-label={hasOptions ? `${card.name}: scelte` : `Togli ${card.name}`}
              className={`relative ${height} min-w-0 -skew-x-8 overflow-hidden border-2 bg-panel-raised ${LONG_PRESS_CLASS}`}
              style={{ borderColor: card.rarity.color }}
            >
              {shown.art_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={withBasePath(shown.art_url)}
                  srcSet={artSrcSet(shown.art_url)}
                  sizes={squadSize && squadSize % 4 === 0 ? "calc((100vw - 58px) / 4)" : "calc((100vw - 68px) / 5)"}
                  alt=""
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover object-top"
                />
              )}
              <span className="absolute left-1 top-0.5 bg-comic-yellow px-1 font-display text-[13px] leading-4 text-black">{i + 1}</span>
              {mark && (
                <span
                  className={`absolute right-1 top-0.5 px-1 text-[9px] font-extrabold uppercase leading-[13px] ${
                    variantChoice.has(card.id) || staked.has(card.id) ? "bg-comic-magenta text-black" : "bg-black text-comic-yellow"
                  }`}
                >
                  {mark}
                </span>
              )}
              <span className="absolute inset-x-0 bottom-0 truncate bg-black/75 px-0.5 text-center font-display text-[10.5px] uppercase leading-[15px]">
                {card.name}
              </span>
            </button>
          );
        })}
      </section>
      {squadHasVariants && (
        <p className="mt-1 truncate text-[11px] font-semibold leading-4 text-muted">
          <span className="text-comic-yellow">★</span> Tocca un personaggio con la stella per cambiare disegno.
        </p>
      )}

      {fitsStar && storyStars && (
        <section aria-label="Stelle della missione" className="mt-1.5 flex flex-col gap-1">
          <div className="grid grid-cols-3 gap-1">
            {STORY_STARS.map((star) => {
              const had = earnedStars.includes(star);
              const possible = star === "flawless" || squadFits(star);
              const pressed = star !== "flawless" && starFilter === star;
              const look = pressed
                ? "border-transparent text-black"
                : had
                  ? "border-line text-faint"
                  : possible
                    ? "text-foreground"
                    : "border-dashed border-line text-faint";
              const body = (
                <>
                  <StarIcon filled color={STAR_MARK_COLORS[star]} className="h-4 w-4" />
                  <span className="line-clamp-2 min-w-0">
                    {had && "✓ "}
                    {starShort(star, storyStars.rules)}
                  </span>
                  <span className="sr-only">
                    {had ? ": già ottenuta" : possible ? ": la puoi prendere" : ": non con questa squadra"}
                  </span>
                </>
              );
              const className = `flex min-h-11 min-w-0 items-center gap-1 border-2 px-1.5 text-left text-[11px] font-extrabold leading-[13px] ${look}`;
              const style = pressed
                ? { background: STAR_MARK_COLORS[star] }
                : !had && possible
                  ? { borderColor: STAR_MARK_COLORS[star] }
                  : undefined;
              return star === "flawless" ? (
                <div key={star} className={className} style={style}>
                  {body}
                </div>
              ) : (
                <button
                  key={star}
                  type="button"
                  onClick={() => setStarFilter((current) => (current === star ? null : star))}
                  aria-pressed={pressed}
                  title="Mostra solo le carte adatte"
                  className={className}
                  style={style}
                >
                  {body}
                </button>
              );
            })}
          </div>
          <p className="truncate text-[11px] font-semibold leading-4 text-muted">{starSummary}</p>
        </section>
      )}

      {challenge && excludedWhy && (
        <section
          aria-label="Regole della sfida"
          className="mt-1.5 flex flex-col gap-1 border-2 bg-panel px-2 py-1"
          style={{ borderColor: challenge.color }}
        >
          <div className="flex items-start gap-1.5">
            <ChallengeRuleChips challenge={challenge} className="min-w-0 flex-1" />
            <span
              className={`shrink-0 text-[11px] font-extrabold leading-4 ${squadExcluded > 0 ? "text-comic-magenta" : "text-comic-cyan"}`}
            >
              {squadExcluded > 0 ? `✗ ${squadExcluded} fuori` : `✓ ${selected.length}/${size}`}
              {variantsWanted > 0 && (
                <span className={variantsMissing > 0 ? "text-comic-magenta" : "text-comic-cyan"}>
                  {" "}
                  · ★ {Math.min(variantsFielded, variantsWanted)}/{variantsWanted}
                </span>
              )}
            </span>
          </div>
          <div role="radiogroup" aria-label="Quali carte" className="grid grid-cols-2 border-2 border-black text-[11px] font-extrabold uppercase">
            {(
              [
                [false, `Solo adatte · ${admittedCount}`],
                [true, `Tutte · ${cards.length}`],
              ] as const
            ).map(([all, label]) => (
              <button
                key={label}
                type="button"
                role="radio"
                aria-checked={showExcluded === all}
                onClick={() => setShowExcluded(all)}
                className={`min-h-8 px-1 ${showExcluded === all ? "bg-comic-yellow text-black" : "bg-panel text-muted"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>
      )}

      {conquerable && (
        <section className="mt-2 flex flex-col gap-0.5 bg-comic-magenta px-3 py-1.5 text-xs font-semibold text-black">
          <p>
            Carte in palio: <span className="font-extrabold">{atRisk}</span> (minimo {minConquerable}). Se perdi, il
            vincitore può prendertene una. Le starter sono protette; le varianti schierate sono in palio.
          </p>
          {limit && (
            <p>
              Se vinci puoi conquistare fino a:{" "}
              <span className="-skew-x-8 bg-black px-1.5 font-display uppercase" style={{ color: limit.color }}>
                {limit.name}
              </span>
            </p>
          )}
        </section>
      )}

      <div className="relative mt-2.5 flex min-h-11 items-center gap-2">
        <h2 className="section-title text-base leading-5">
          Le tue carte · {shownCount < cards.length ? `${shownCount}/${cards.length}` : cards.length}
        </h2>
        {intro && <InfoTip text={intro} />}
        {!squadSize && (
          <button
            type="button"
            onClick={() => setMenuOpen((shown) => !shown)}
            aria-expanded={menuOpen}
            className="btn btn-ghost ml-auto min-h-11 gap-1.5 px-3 text-[13px]"
          >
            Formazioni
            <svg viewBox="0 0 10 7" className="h-[7px] w-2.5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path d="M1 1l4 4 4-4" />
            </svg>
          </button>
        )}
        {menuOpen && (
          <>
            <button type="button" aria-label="Chiudi" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-20 cursor-default" />
            <div className="absolute right-0 top-full z-30 mt-1 flex w-72 max-w-full flex-col gap-1.5 border-2 border-foreground bg-panel p-2 shadow-[5px_5px_0_#000]">
              {formations.length === 0 ? (
                <p className="px-1 text-sm font-medium text-muted">Nessuna formazione salvata.</p>
              ) : (
                formations.map((formation) => (
                  <span key={formation.id} className="flex items-center bg-panel-raised">
                    <button
                      type="button"
                      onClick={() => {
                        loadFormation(formation);
                        setMenuOpen(false);
                      }}
                      className="min-h-11 min-w-0 flex-1 truncate px-3 text-left text-sm font-bold"
                    >
                      {formation.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(formation)}
                      aria-label={`Elimina ${formation.name}`}
                      className="min-h-11 px-3 text-sm font-bold text-muted"
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
              {naming ? (
                <div className="flex gap-1.5">
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={30}
                    placeholder="Nome della formazione"
                    className="input-comic min-w-0 flex-1"
                  />
                  <button type="button" onClick={save} disabled={!name.trim()} className="btn btn-outline px-3">
                    Salva
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={selected.length < size || formations.length >= balance.formations.maxPerPlayer}
                  onClick={() => setNaming(true)}
                  className="min-h-11 border-2 border-dashed border-line px-3 text-left text-sm font-bold text-comic-yellow disabled:text-faint"
                >
                  + Salva questa squadra
                </button>
              )}
              {message && (
                <p className={`text-xs font-semibold ${message.isError ? "text-comic-magenta" : "text-comic-cyan"}`}>{message.text}</p>
              )}
            </div>
          </>
        )}
      </div>
      {message && !menuOpen && (
        <p className={`text-xs font-semibold ${message.isError ? "text-comic-magenta" : "text-comic-cyan"}`}>{message.text}</p>
      )}

      <div className="mt-1">
        <CardListControls
          view={view}
          onChange={updateView}
          abilities={abilities}
          traits={traits}
          rarities={rarities}
          layout="compact"
        />
      </div>

      {/* Only the cards scroll; the fade at the bottom says there are more. */}
      <div className="relative mt-1 min-h-0 flex-1">
        <ul className="absolute inset-0 grid grid-cols-3 content-start gap-x-1.5 gap-y-2 overflow-y-auto overscroll-contain pb-8 pr-1 pt-1">
          {shownCount === 0 && (
            <li className="col-span-3 py-6 text-center text-sm font-semibold text-muted">Nessuna carta con questi filtri.</li>
          )}
          {groups.flatMap((group) => [
            ...(group.label
              ? [
                  <li key={`group-${group.key}`} className="col-span-3 pt-1">
                    <CardGroupHeading label={group.label} count={group.cards.length} />
                  </li>,
                ]
              : []),
            ...group.cards.map((card) => {
              const position = selected.indexOf(card.id);
              const shown = fieldedCard(card);
              // Sfida a tema, «Tutte»: a card out of the rules is greyed, with why.
              const excluded = excludedWhy ? excludedWhy(card) : null;
              // How many drawings the player can field this character with.
              const drawings = variantOptions(card.id).length + 1;
              // The ability the list is sorted by comes first, then the card's best ones.
              const top = Object.entries(card.stats)
                .sort((a, b) => Number(b[0] === sortAbility) - Number(a[0] === sortAbility) || b[1] - a[1])
                .slice(0, 3);
              return (
                <li key={card.id} className="min-w-0">
                  <button
                    type="button"
                    {...detail.press(shown)}
                    onClick={() => toggle(card.id)}
                    aria-pressed={position >= 0}
                    className={`relative flex w-full flex-col border-[3px] bg-panel text-left ${LONG_PRESS_CLASS} ${
                      position >= 0 ? "shadow-[4px_4px_0_var(--comic-magenta)]" : ""
                    } ${excluded && position < 0 ? "opacity-45 grayscale" : ""}`}
                    style={{ borderColor: position >= 0 ? "var(--comic-yellow)" : card.rarity.color }}
                  >
                    <span className="relative block aspect-square bg-panel-raised">
                      {shown.art_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={withBasePath(shown.art_url)}
                          srcSet={artSrcSet(shown.art_url)}
                          // Three tiles per row inside the page padding and the gaps, minus each tile's 3px frame.
                          sizes="calc((100vw - 58px) / 3)"
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="absolute inset-0 h-full w-full object-cover object-top"
                        />
                      ) : (
                        <Silhouette
                          faction={card.faction}
                          accent={card.rarity.color}
                          className="absolute bottom-0 left-1/2 h-[90%] -translate-x-1/2"
                        />
                      )}
                      <span
                        aria-hidden
                        className="absolute left-0.5 top-0.5 flex h-4 w-4 items-center justify-center text-[11px] font-black text-black"
                        style={{ background: rarityFrame(card.rarity) }}
                      >
                        {rarityLetter(card.rarity)}
                      </span>
                      {position >= 0 && (
                        <span className="absolute right-0.5 top-0.5 flex h-6 w-6 -skew-x-8 items-center justify-center bg-comic-yellow font-display text-sm text-black">
                          {position + 1}
                        </span>
                      )}
                      {fitsStar && (
                        // Story: a star in its color for each star still to earn that this card fits.
                        <span className="absolute bottom-0.5 left-0.5 flex gap-px">
                          {CARD_STARS.filter((star) => !earnedStars.includes(star) && fitsStar(star, card)).map((star) => (
                            <span key={star}>
                              <StarIcon filled color={STAR_MARK_COLORS[star]} className="h-4 w-4 drop-shadow-[1px_1px_0_#000]" />
                              <span className="sr-only">Va bene per la stella {STAR_NAMES[star]}.</span>
                            </span>
                          ))}
                        </span>
                      )}
                      {drawings > 1 && (
                        <span
                          aria-label={`${drawings} disegni`}
                          className={`absolute bottom-0.5 right-0.5 px-1 text-[10px] font-extrabold leading-[14px] ${
                            variantChoice.has(card.id) ? "bg-comic-magenta text-black" : "bg-black text-comic-yellow"
                          }`}
                        >
                          ★ {drawings}
                        </span>
                      )}
                    </span>
                    <span className="truncate px-1.5 pt-1 font-display text-[13px] uppercase leading-4">{card.name}</span>
                    <span className="truncate px-1.5 text-[10px] font-bold leading-[13px]" style={{ color: card.rarity.color }}>
                      {card.rarity.name}
                      {card.power && <span className="text-muted"> · {card.power.name}</span>}
                    </span>
                    {conquerable && (
                      <span
                        className={`px-1.5 text-[10px] font-bold leading-[13px] ${
                          isAtRisk(card.id) ? "text-comic-magenta" : "text-comic-cyan"
                        }`}
                      >
                        {isAtRisk(card.id) ? "In palio" : "Protetta"}
                      </span>
                    )}
                    {excluded && (
                      <span className="truncate px-1.5 text-[10px] font-bold leading-[13px] text-comic-magenta">{excluded.short}</span>
                    )}
                    <span className="truncate px-1.5 pb-1 text-[10px] font-medium leading-[13px] text-muted">
                      {top.map(([code, value]) => `${code} ${value}`).join(" · ")}
                    </span>
                  </button>
                </li>
              );
            }),
          ])}
        </ul>
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-8 [background:linear-gradient(to_top,var(--background),transparent)]" />
      </div>

      <div className="-mx-3 border-t-[3px] border-foreground bg-black px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3">
        <button
          type="button"
          onClick={start}
          disabled={selected.length < size || starting || notEnoughAtRisk || challengeBlock !== null}
          className="btn btn-primary w-full"
        >
          {starting
            ? "Preparazione…"
            : selected.length < size
              ? `Scegli ancora ${size - selected.length}`
              : notEnoughAtRisk
                ? `Servono almeno ${minConquerable} carte in palio`
                : (challengeBlock ?? startLabel)}
        </button>
      </div>

      {optionsCard && (
        <>
          <button type="button" aria-label="Chiudi" onClick={() => setOptionsOf(null)} className="fixed inset-0 z-30 bg-black/60" />
          <div
            role="dialog"
            aria-label={optionsCard.name}
            className="fixed inset-x-0 bottom-0 z-40 flex flex-col gap-2 border-t-[3px] border-foreground bg-panel px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3"
          >
            <p className="font-display text-xl uppercase">{optionsCard.name}</p>
            {canStake(optionsCard.id) && (
              <button
                type="button"
                onClick={() => toggleStake(optionsCard.id)}
                aria-pressed={staked.has(optionsCard.id)}
                className={`min-h-11 border-2 px-3 text-left text-sm font-bold ${
                  staked.has(optionsCard.id) ? "border-comic-magenta bg-comic-magenta text-black" : "border-line bg-panel-raised"
                }`}
              >
                {staked.has(optionsCard.id) ? "Doppione in palio: usa la copia starter" : "Metti in palio il doppione"}
              </button>
            )}
            {optionsVariants.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-bold uppercase text-muted">Disegno da schierare</p>
                <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
                  {[{ copy: null, name: optionsDefault?.name ?? "Base", art: optionsDefault?.art_url ?? optionsCard.art_url }, ...optionsVariants.map((copy) => ({ copy, name: copy.name, art: copy.art_url }))].map(
                    ({ copy, name, art }) => {
                      const fielded = copy ? chosenStyle(optionsCard.id) === copy.name : !variantChoice.has(optionsCard.id);
                      return (
                        <button
                          key={copy?.id ?? "default"}
                          type="button"
                          onClick={() => chooseCopy(optionsCard.id, copy)}
                          aria-pressed={fielded}
                          aria-label={`Schiera ${copy ? `la variante ${name}` : `il disegno ${name}`}`}
                          className={`relative w-[80px] shrink-0 border-[3px] bg-panel-raised ${
                            fielded ? "border-comic-yellow shadow-[3px_3px_0_var(--comic-magenta)]" : "border-line"
                          }`}
                        >
                          <span className="relative block aspect-[3/4] overflow-hidden">
                            {art ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={withBasePath(art)}
                                srcSet={artSrcSet(art)}
                                sizes="74px"
                                alt=""
                                decoding="async"
                                className="absolute inset-0 h-full w-full object-cover object-top"
                              />
                            ) : (
                              <Silhouette
                                faction={optionsCard.faction}
                                accent={optionsCard.rarity.color}
                                className="absolute bottom-0 left-1/2 h-[90%] -translate-x-1/2"
                              />
                            )}
                            {fielded && (
                              <span className="absolute right-0.5 top-0.5 bg-comic-yellow px-1 text-[11px] font-black leading-4 text-black">✓</span>
                            )}
                          </span>
                          <span
                            className={`block truncate px-0.5 py-0.5 text-center text-[10.5px] font-extrabold uppercase leading-4 ${
                              fielded ? "bg-comic-yellow text-black" : ""
                            }`}
                          >
                            {name}
                          </span>
                        </button>
                      );
                    },
                  )}
                </div>
                {conquerable && variantChoice.has(optionsCard.id) && (
                  <p className="bg-comic-magenta px-2 py-1 text-xs font-bold text-black">
                    La variante {chosenStyle(optionsCard.id)} è in palio: se perdi, il vincitore può prenderla.
                  </p>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  toggle(optionsCard.id);
                  setOptionsOf(null);
                }}
                className="btn btn-ghost flex-1"
              >
                Togli dalla squadra
              </button>
              <button type="button" onClick={() => setOptionsOf(null)} className="btn btn-outline px-5">
                Fatto
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
