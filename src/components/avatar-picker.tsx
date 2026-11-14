"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Chip, ChipRow } from "@/components/card-list-controls";
import { CardFace, PlayerAvatar } from "@/components/player-avatar";
import { avatarChoices, filterAvatarChoices, isCardArtAvatar, type AvatarChoice } from "@/lib/avatar";
import { fetchCatalog, fetchCollection, seenCatalog, seenCollection } from "@/lib/collection";
import { describeServerError } from "@/lib/errors";
import { setAvatar, type Profile } from "@/lib/player";

const TILE = "flex min-w-0 flex-col items-center gap-1 p-1 text-center";

/**
 * The avatar choice, in the profile's sheet: the default picture (the account photo or the
 * initial) and the face of every character the player owns, with each variant they found.
 * Search by name or number and filter by rarity; a tap wears it and closes the sheet.
 */
export function AvatarPicker({ profile, onDone }: { profile: Profile; onDone: () => void }) {
  const { session, setProfile } = useAuth();
  const [choices, setChoices] = useState<AvatarChoice[] | null>(() => {
    const catalog = seenCatalog();
    const collection = seenCollection();
    return catalog && collection ? avatarChoices(catalog, collection) : null;
  });
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState("");
  const [rarity, setRarity] = useState<number | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchCatalog(), fetchCollection()])
      .then(([catalog, collection]) => {
        if (!cancelled) setChoices(avatarChoices(catalog, collection));
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rarities = useMemo(
    () => [...new Map((choices ?? []).map((c) => [c.rarity.rank, c.rarity])).values()].sort((a, b) => a.rank - b.rank),
    [choices],
  );
  const shown = useMemo(() => filterAvatarChoices(choices ?? [], query, rarity), [choices, query, rarity]);
  const currentKey = profile.avatar_definition_id
    ? profile.avatar_variant_id
      ? `${profile.avatar_definition_id}:${profile.avatar_variant_id}`
      : profile.avatar_definition_id
    : "default";
  // The default picture is the account photo the server falls back to (the same Google metadata).
  const meta = session?.user.user_metadata ?? {};
  const accountPhoto = typeof meta.avatar_url === "string" ? meta.avatar_url : typeof meta.picture === "string" ? meta.picture : null;
  const defaultUrl = isCardArtAvatar(profile.avatar_url) ? accountPhoto : profile.avatar_url;

  async function choose(key: string, definitionId: string | null, variantId: string | null) {
    if (saving) return;
    if (key === currentKey) {
      onDone();
      return;
    }
    setSaving(key);
    setError(null);
    try {
      setProfile(await setAvatar(definitionId, variantId));
      onDone();
    } catch (failure) {
      setError(describeServerError(failure));
    } finally {
      setSaving(null);
    }
  }

  const frame = (key: string) =>
    `${key === currentKey ? "border-comic-yellow bg-comic-yellow/15" : "border-transparent"} border-[3px] ${
      saving === key ? "animate-pulse" : ""
    }`;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-muted">
        Scegli il volto di un personaggio della tua collezione. Lo vedono anche gli avversari.
      </p>
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Cerca nome o numero"
        aria-label="Cerca un personaggio"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        className="input-comic placeholder:text-faint"
      />
      {rarities.length > 1 && (
        <ChipRow>
          <Chip active={rarity === null} onClick={() => setRarity(null)}>
            Ogni rarità
          </Chip>
          {rarities.map((r) => (
            <Chip key={r.rank} active={rarity === r.rank} color={r.color} onClick={() => setRarity(r.rank)}>
              {r.name}
            </Chip>
          ))}
        </ChipRow>
      )}
      {error && <p className="text-sm font-semibold text-comic-magenta">{error}</p>}

      <ul className="grid grid-cols-4 gap-1" aria-label="Avatar disponibili">
        {!query && rarity === null && (
          <li>
            <button
              type="button"
              aria-pressed={currentKey === "default"}
              onClick={() => choose("default", null, null)}
              className={`${TILE} w-full ${frame("default")}`}
            >
              <span className="flex aspect-square w-full items-center justify-center p-1.5">
                <PlayerAvatar username={profile.username} avatarUrl={defaultUrl} size="md" />
              </span>
              <span className="w-full truncate text-[11px] font-bold leading-3">{defaultUrl ? "Foto account" : "Iniziale"}</span>
            </button>
          </li>
        )}
        {shown.map((choice) => (
          <li key={choice.key}>
            <button
              type="button"
              aria-pressed={choice.key === currentKey}
              aria-label={`${choice.name}${choice.styleName ? `, disegno ${choice.styleName}` : ""}`}
              onClick={() => choose(choice.key, choice.definitionId, choice.variantId)}
              className={`${TILE} w-full ${frame(choice.key)}`}
            >
              <span className="relative block aspect-square w-full">
                <CardFace artUrl={choice.art_url} className="h-full w-full" />
                {/* The border takes the rarity colour, like the album's tiles. */}
                <span aria-hidden className="pointer-events-none absolute inset-0 border-2" style={{ borderColor: choice.rarity.color }} />
                {choice.styleName && (
                  <span className="absolute bottom-0 right-0 bg-comic-magenta px-1 text-[9px] font-extrabold uppercase leading-3 text-black">
                    {choice.styleName}
                  </span>
                )}
              </span>
              <span className="w-full truncate text-[11px] font-bold leading-3">{choice.name}</span>
            </button>
          </li>
        ))}
      </ul>

      {choices === null && !loadError && <p className="text-sm font-medium text-muted">Caricamento…</p>}
      {loadError && choices === null && (
        <p className="text-sm font-semibold text-comic-magenta">Non riesco a caricare la collezione: riprova più tardi.</p>
      )}
      {choices !== null && shown.length === 0 && (query || rarity !== null) && (
        <p className="text-sm font-medium text-muted">Nessun personaggio trovato.</p>
      )}
    </div>
  );
}
