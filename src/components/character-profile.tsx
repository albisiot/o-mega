"use client";

import { useEffect, useRef, useState } from "react";
import { Sheet } from "@/components/sheet";
import { fetchCharacterProfile, type CharacterProfile } from "@/lib/character-profile";

/**
 * The character's file on one row under its card: the real name, and a tap opens the
 * rest in a sheet from the bottom (powers and traits). Only the card detail page shows it.
 */
export function CharacterProfileSheet({ definitionId, name }: { definitionId: string; name: string }) {
  const sheet = useRef<HTMLDialogElement>(null);
  const [profile, setProfile] = useState<CharacterProfile | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // The page mounts one sheet per card (key), so there is no previous card to clear.
    let cancelled = false;
    fetchCharacterProfile(definitionId)
      .then((loaded) => {
        if (!cancelled) setProfile(loaded);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [definitionId]);

  // The file is extra: if it does not load, the rest of the page stays as it is.
  if (failed || (profile && !profile.realName && !profile.powers && profile.traits.length === 0)) return null;

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        disabled={!profile}
        onClick={() => sheet.current?.showModal()}
        className="flex w-full max-w-sm shrink-0 gap-1 text-left"
      >
        <span className="flex min-w-0 flex-1 flex-col bg-panel px-3 py-1">
          <span className="text-[13px] font-semibold leading-[17px] text-muted">Scheda · vero nome</span>
          <span className="truncate font-display text-xl leading-7">{profile ? (profile.realName ?? "Sconosciuto") : "…"}</span>
        </span>
        <span aria-hidden className="flex w-11 shrink-0 items-center justify-center bg-panel text-comic-yellow">
          <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={3}>
            <path d="m8 3 7 7-7 7" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
      {profile && (
        <Sheet sheetRef={sheet} title={`Scheda di ${name}`}>
          <ProfilePanel profile={profile} />
        </Sheet>
      )}
    </>
  );
}

export function ProfilePanel({ profile }: { profile: CharacterProfile }) {
  return (
    <section className="flex w-full max-w-sm flex-col gap-4">
      <div className="flex flex-col bg-panel px-3.5 py-2.5">
        <h3 className="text-[13px] font-semibold leading-[17px] text-muted">Vero nome</h3>
        <p className="font-display text-2xl leading-8">{profile.realName ?? "Sconosciuto"}</p>
      </div>

      {profile.powers && (
        <div className="flex flex-col gap-1.5">
          <h3 className="font-display text-lg uppercase text-comic-cyan">Poteri</h3>
          <p className="-rotate-1 bg-comic-yellow px-3 py-2 text-sm font-semibold text-black shadow-[3px_3px_0_var(--foreground)]">
            {profile.powers}
          </p>
        </div>
      )}

      {profile.traits.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="font-display text-lg uppercase text-comic-cyan">Tratti</h3>
          <dl className="flex flex-col gap-2">
            {profile.traits.map((group) => (
              <div key={group.category} className="flex flex-col gap-1">
                <dt className="text-[13px] font-semibold leading-[17px] text-muted">{group.category}</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {group.traits.map((trait) => (
                    <span key={trait.code} className="flex flex-col bg-panel px-3 py-1.5">
                      <span className="-skew-x-8 self-start bg-comic-magenta px-2 font-display text-base uppercase text-black">
                        {trait.name}
                      </span>
                      <span className="mt-1 text-xs font-medium text-faint">{trait.description}</span>
                    </span>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </section>
  );
}
