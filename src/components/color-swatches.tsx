"use client";

import { APP_SWATCHES } from "@/lib/pack-colors";

/** Quick picks from the app's colours, beside a native colour input. */
export function ColorSwatches({ value, onPick, label }: { value: string; onPick: (hex: string) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {APP_SWATCHES.map((swatch) => {
        const active = value.toLowerCase() === swatch.hex;
        return (
          <button
            key={swatch.hex}
            type="button"
            onClick={() => onPick(swatch.hex)}
            aria-pressed={active}
            aria-label={swatch.name}
            title={swatch.name}
            className={`h-9 w-9 border-[3px] ${active ? "border-white" : "border-black"}`}
            style={{ background: swatch.hex }}
          />
        );
      })}
    </div>
  );
}
