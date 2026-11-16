"use client";

import { PackArt } from "@/components/comic-parts";
import {
  customPackColorValue,
  GRADIENT_PACK_COLORS,
  PACK_COLORS,
  packColor,
  parseCustomPackColor,
  SOLID_PACK_COLORS,
  type CustomPackColor,
  type PackColor,
  type PackPreset,
} from "@/lib/pack-colors";

const SWATCH = "h-10 min-w-0 border-[3px]";

/** The custom colours to start from: the current ones, or the palette in use made editable. */
function customFrom(value: PackColor): CustomPackColor {
  const custom = parseCustomPackColor(value);
  if (custom) return custom;
  const palette = packColor(value);
  const stops = palette.background.match(/#[0-9a-f]{6}/gi) ?? [palette.accent];
  return {
    from: stops[0].toLowerCase(),
    to: stops[stops.length - 1].toLowerCase(),
    body: palette.body.toLowerCase(),
    omega: palette.omega.toLowerCase(),
  };
}

/**
 * The colour of a special pack: 21 palettes (solid and gradient) or custom colours with a native
 * picker, and a preview of the pack as the shop shows it, live.
 */
export function PackColorPicker({
  value,
  onChange,
  name,
  price,
  cards,
}: {
  value: PackColor;
  onChange: (next: PackColor) => void;
  /** For the preview. */
  name: string;
  price: string;
  cards: string;
}) {
  const isCustom = parseCustomPackColor(value) !== null;
  const custom = customFrom(value);
  const gradient = custom.from !== custom.to;
  const palette = packColor(value);

  function setCustom(change: Partial<CustomPackColor>) {
    const next = customPackColorValue({ ...custom, ...change });
    if (next) onChange(next);
  }

  const swatch = (key: PackPreset) => (
    <button
      key={key}
      type="button"
      onClick={() => onChange(key)}
      aria-pressed={value === key}
      aria-label={PACK_COLORS[key].name}
      title={PACK_COLORS[key].name}
      className={`${SWATCH} ${value === key ? "border-white" : "border-transparent"}`}
      style={{ background: PACK_COLORS[key].background }}
    />
  );

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <p className="flex items-baseline justify-between gap-2 text-sm font-bold">
        <span id="pack-color-label">Colore</span>
        <span className="truncate text-xs font-semibold text-muted">{palette.name}</span>
      </p>
      <PackPreview palette={palette} name={name} price={price} cards={cards} />
      <div role="group" aria-labelledby="pack-color-label" className="flex flex-col gap-1.5">
        <span className="text-[11px] font-extrabold uppercase text-muted">Tinta unita</span>
        <div className="grid grid-cols-7 gap-1.5">{SOLID_PACK_COLORS.map(swatch)}</div>
        <span className="text-[11px] font-extrabold uppercase text-muted">Sfumati</span>
        <div className="grid grid-cols-7 gap-1.5">
          {GRADIENT_PACK_COLORS.map(swatch)}
          <button
            type="button"
            onClick={() => !isCustom && setCustom({})}
            aria-pressed={isCustom}
            aria-label="Personalizzato"
            title="Personalizzato"
            className={`${SWATCH} flex items-center justify-center bg-panel text-lg font-extrabold ${
              isCustom ? "border-white" : "border-line"
            }`}
          >
            +
          </button>
        </div>
      </div>
      {isCustom && (
        <div className="flex flex-col gap-2 bg-panel p-2.5">
          <p className="text-xs font-bold">Colori personalizzati</p>
          <div className="grid grid-cols-2 gap-2">
            <ColorField label="Sfondo" value={custom.from} onChange={(from) => setCustom(gradient ? { from } : { from, to: from })} />
            <label className="flex min-h-11 items-center gap-2 text-sm font-bold">
              <input
                type="checkbox"
                checked={gradient}
                onChange={(event) => setCustom({ to: event.target.checked ? custom.body : custom.from })}
                className="h-6 w-6 shrink-0 accent-comic-yellow"
              />
              Sfumato
            </label>
            {gradient && <ColorField label="Sfuma verso" value={custom.to} onChange={(to) => setCustom({ to })} />}
            <ColorField label="Busta" value={custom.body} onChange={(body) => setCustom({ body })} />
            <ColorField label="Omega" value={custom.omega} onChange={(omega) => setCustom({ omega })} />
          </div>
          <p className="text-xs font-medium leading-4 text-muted">
            Il testo diventa chiaro o scuro da solo, per leggersi sullo sfondo. Le app non aggiornate mostrano il pacchetto
            in magenta.
          </p>
        </div>
      )}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (next: string) => void }) {
  return (
    <label className="flex min-w-0 items-center gap-2 text-sm font-bold">
      <input
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value.toLowerCase())}
        className="h-11 w-11 shrink-0 cursor-pointer border-2 border-line bg-black p-0.5"
      />
      <span className="flex min-w-0 flex-col leading-4">
        {label}
        <span className="text-xs font-semibold uppercase text-muted">{value}</span>
      </span>
    </label>
  );
}

/** The pack's panel in the shop, small: background, text, drawing and buy button. */
function PackPreview({ palette, name, price, cards }: { palette: ReturnType<typeof packColor>; name: string; price: string; cards: string }) {
  return (
    <div
      aria-label="Anteprima nel Negozio"
      // Stays in view while the swatches and the custom colours below it scroll.
      className="sticky top-0 z-10 flex min-h-[92px] flex-col justify-between gap-1.5 overflow-hidden px-3 py-2"
      style={{ background: palette.background, color: palette.ink }}
    >
      <PackArt body={palette.body} omega={palette.omega} cards={Number(cards) || 1} className="absolute -top-1 right-1 h-20 rotate-[9deg]" />
      <div className="relative max-w-[68%]">
        <p className="truncate font-display text-xl uppercase leading-6">{name.trim() || "Nome del pacchetto"}</p>
        <p className="text-xs font-bold">{price ? `${price} monete` : "Prezzo"}</p>
      </div>
      <span
        className="relative self-start bg-black px-3 py-1 font-display text-sm uppercase"
        style={{ color: palette.accent, boxShadow: `3px 3px 0 ${palette.shadow}` }}
      >
        Acquista e apri
      </span>
    </div>
  );
}
