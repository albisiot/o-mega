"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { CardView } from "@/components/card-view";
import { HoldToConfirmButton } from "@/components/hold-to-confirm-button";
import { Sheet } from "@/components/sheet";
import type { AbilityInfo } from "@/lib/catalog";
import type { CatalogCard } from "@/lib/collection";
import {
  COSMETIC_INFO,
  appliedTo,
  applyCosmetic,
  cosmeticName,
  isEffectCode,
  isFrameCode,
  ownedCosmetics,
  setCosmeticVisible,
  shownCosmetics,
  type CardCosmetics,
  type CosmeticKind,
  type CosmeticsState,
  type OwnedCosmetic,
} from "@/lib/cosmetics";
import { describeServerError } from "@/lib/errors";

const KIND_LABEL: Record<CosmeticKind, { one: string; many: string; none: string }> = {
  frame: { one: "Cornice", many: "Cornici", none: "Nessuna" },
  effect: { one: "Effetto", many: "Effetti", none: "Nessuno" },
};

/**
 * The frame and the effect of a character (SPEC §4.8), on one row under its card. A tap opens a
 * sheet: what the card has, shown or hidden; the frames and effects owned, each tried on the card
 * before it is applied for good.
 */
export function CosmeticsSheet({
  card,
  abilities,
  state,
  onChanged,
}: {
  /** With the drawing the page shows. */
  card: CatalogCard;
  abilities: AbilityInfo[];
  state: CosmeticsState | null;
  onChanged: (next: CosmeticsState) => void;
}) {
  const sheet = useRef<HTMLDialogElement>(null);
  const applied = appliedTo(state, card.id);
  const names = [applied?.frame, applied?.effect].filter((code): code is string => Boolean(code)).map((code) => cosmeticName(state, code));
  const owned = ownedCosmetics(state, "frame").length + ownedCosmetics(state, "effect").length;

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={`Cornice ed effetto: ${names.join(", ") || "nessuno"}${owned > 0 ? `; ${owned} da applicare` : ""}`}
        disabled={!state}
        onClick={() => sheet.current?.showModal()}
        className="flex min-w-0 flex-1 gap-1 text-left"
      >
        <span className="flex min-w-0 flex-1 flex-col bg-panel px-2.5 py-1">
          <span className="truncate text-[13px] font-semibold leading-[17px] text-muted">Cornice ed effetto</span>
          <span className="truncate font-display text-xl leading-7">{state ? names.join(" · ") || "Nessuno" : "…"}</span>
        </span>
        <span aria-hidden className="relative flex w-7 shrink-0 items-center justify-center bg-panel text-comic-yellow">
          <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={3}>
            <path d="m8 3 7 7-7 7" strokeLinejoin="round" />
          </svg>
          {/* Frames and effects waiting to be applied. */}
          {owned > 0 && (
            <span className="absolute right-0.5 top-0.5 min-w-4 bg-comic-magenta px-0.5 text-center text-[10px] font-black leading-4 text-black">
              {owned}
            </span>
          )}
        </span>
      </button>
      {state && (
        <Sheet sheetRef={sheet} title={`Cornice ed effetto di ${card.name}`}>
          <CosmeticsPanel card={card} abilities={abilities} state={state} onChanged={onChanged} />
        </Sheet>
      )}
    </>
  );
}

export function CosmeticsPanel({
  card,
  abilities,
  state,
  onChanged,
}: {
  card: CatalogCard;
  abilities: AbilityInfo[];
  state: CosmeticsState;
  onChanged: (next: CosmeticsState) => void;
}) {
  const [kind, setKind] = useState<CosmeticKind>("frame");
  const [chosen, setChosen] = useState<OwnedCosmetic | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const applied = appliedTo(state, card.id);
  const items = ownedCosmetics(state, kind);
  const current = shownCosmetics(applied);

  // The preview: the card as it shows now, with the chosen frame or effect in its place.
  const preview: CardCosmetics | null = chosen
    ? {
        frame: chosen.kind === "frame" && isFrameCode(chosen.code) ? chosen.code : (current?.frame ?? null),
        effect: chosen.kind === "effect" && isEffectCode(chosen.code) ? chosen.code : (current?.effect ?? null),
        serial: chosen.kind === "effect" ? chosen.serial : (current?.serial ?? null),
      }
    : current;
  const replaced = chosen ? (chosen.kind === "frame" ? applied?.frame : applied?.effect) : null;

  async function run(action: () => Promise<CosmeticsState>, done: string) {
    setBusy(true);
    setMessage(null);
    try {
      onChanged(await action());
      setMessage({ text: done, isError: false });
    } catch (cause) {
      setMessage({ text: describeServerError(cause), isError: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex w-full max-w-sm flex-col gap-3">
      <dl className="grid grid-cols-2 gap-2">
        {(["frame", "effect"] as const).map((slot) => {
          const code = slot === "frame" ? applied?.frame : applied?.effect;
          const visible = slot === "frame" ? applied?.frame_visible : applied?.effect_visible;
          return (
            <div key={slot} className="flex flex-col gap-1 bg-panel px-3 py-2">
              <dt className="text-[13px] font-semibold leading-[17px] text-muted">{KIND_LABEL[slot].one}</dt>
              <dd className="truncate font-display text-xl leading-6">{code ? cosmeticName(state, code) : KIND_LABEL[slot].none}</dd>
              {code && (
                <button
                  type="button"
                  role="switch"
                  aria-checked={Boolean(visible)}
                  disabled={busy}
                  onClick={() =>
                    run(
                      () => setCosmeticVisible(card.id, slot, !visible),
                      visible ? `${KIND_LABEL[slot].one} nascost${slot === "frame" ? "a" : "o"}.` : `${KIND_LABEL[slot].one} di nuovo in vista.`,
                    )
                  }
                  className="flex min-h-9 items-center gap-2 text-sm font-bold disabled:opacity-60"
                >
                  <span
                    aria-hidden
                    className={`relative h-5 w-9 shrink-0 rounded-full border-2 border-black ${visible ? "bg-comic-cyan" : "bg-panel-raised"}`}
                  >
                    <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-black transition-[left] ${visible ? "left-[18px]" : "left-0.5"}`} />
                  </span>
                  {visible ? "Si vede" : "Nascost" + (slot === "frame" ? "a" : "o")}
                </button>
              )}
            </div>
          );
        })}
      </dl>

      <div className="grid grid-cols-2 gap-1.5" role="group" aria-label="Cosa provare">
        {(["frame", "effect"] as const).map((slot) => (
          <button
            key={slot}
            type="button"
            aria-pressed={kind === slot}
            onClick={() => {
              setKind(slot);
              setChosen(null);
            }}
            className={`-skew-x-8 py-1.5 text-sm font-extrabold uppercase ${kind === slot ? "bg-comic-yellow text-black" : "bg-panel-raised"}`}
          >
            {KIND_LABEL[slot].many} ({ownedCosmetics(state, slot).reduce((sum, item) => sum + item.count, 0)})
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="text-sm font-semibold text-muted">
          Non hai {kind === "frame" ? "cornici" : "effetti"} da applicare. Si ottengono con le Schegge, che escono rompendo
          le varianti doppie.{" "}
          <Link href="/negozio/?schegge=1" className="font-bold text-foreground underline">
            Vai al Negozio
          </Link>
        </p>
      ) : (
        <ul className="flex flex-wrap gap-1.5" aria-label={`${KIND_LABEL[kind].many} da applicare`}>
          {items.map((item) => (
            <li key={item.code}>
              <button
                type="button"
                aria-pressed={chosen?.code === item.code}
                onClick={() => setChosen(chosen?.code === item.code ? null : item)}
                className={`-skew-x-8 px-2.5 py-1 text-xs font-extrabold uppercase ${
                  chosen?.code === item.code ? "bg-comic-magenta text-black" : "bg-panel"
                }`}
              >
                {item.name}
                {item.count > 1 && <span className="ml-1 opacity-75">×{item.count}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col items-center gap-1">
        <p className="self-start text-xs font-extrabold uppercase tracking-wide text-muted">
          {chosen ? `Anteprima · ${chosen.name}` : "Così si vede ora"}
        </p>
        {chosen && <p className="self-start text-xs font-medium text-muted">{COSMETIC_INFO[chosen.code].note}</p>}
        <div className="flex justify-center py-1" style={{ zoom: 0.62 }}>
          <CardView card={card} abilities={abilities} cosmetics={preview} animated={false} />
        </div>
      </div>

      {chosen && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-muted">
            Tieni premuto per applicare: {chosen.kind === "frame" ? "la cornice" : "l'effetto"} si consuma e resta su questo
            personaggio, in ogni suo disegno.
            {replaced && ` Prende il posto di ${cosmeticName(state, replaced)}, che va perso.`}
          </p>
          <HoldToConfirmButton
            onConfirm={() =>
              run(async () => {
                const next = await applyCosmetic(card.id, chosen.code);
                setChosen(null);
                return next;
              }, `${chosen.name} applicat${chosen.kind === "frame" ? "a" : "o"}.`)
            }
            disabled={busy}
            hint=""
            fillColor="var(--comic-yellow)"
            className="btn btn-primary min-h-12 disabled:opacity-60"
          >
            {busy ? "Un attimo…" : `Applica ${chosen.name}`}
          </HoldToConfirmButton>
        </div>
      )}

      {message && (
        <p role="status" className={`text-sm font-semibold ${message.isError ? "text-comic-magenta" : "text-comic-cyan"}`}>
          {message.text}
        </p>
      )}
    </section>
  );
}
