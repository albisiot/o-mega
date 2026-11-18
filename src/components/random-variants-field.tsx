"use client";

import { Chip, ChipRow } from "@/components/card-list-controls";
import { toggleValue } from "@/lib/admin-card-filter";
import { MAX_RANDOM_VARIANTS, type RandomVariantsRule } from "@/lib/random-variants";

const SELECT = "min-h-12 w-full min-w-0 border-2 border-comic-yellow bg-black px-3 text-base font-semibold";

/**
 * The editors' field for a reward of random variants: how many, then, once there are some, the
 * styles and rarities they may have (none chosen: any). Styles and rarities are one row of chips
 * each, sliding sideways, so the field stays short in forms that fit the phone.
 */
export function RandomVariantsField({
  value,
  onChange,
  styles,
  rarities,
  disabled = false,
}: {
  value: RandomVariantsRule | null;
  onChange: (next: RandomVariantsRule | null) => void;
  styles: readonly { style: string; name: string }[];
  rarities: readonly { code: string; name: string; color?: string }[];
  disabled?: boolean;
}) {
  const rule = value ?? { count: 0, styles: [], rarities: [] };
  const set = (change: Partial<RandomVariantsRule>) => {
    const next = { ...rule, ...change };
    onChange(next.count > 0 ? next : null);
  };
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex min-w-0 flex-col gap-1 text-sm font-bold">
        Varianti a caso
        <select
          value={rule.count}
          disabled={disabled}
          onChange={(event) => set({ count: Number(event.target.value) })}
          className={`${SELECT} disabled:opacity-60`}
        >
          <option value={0}>Nessuna</option>
          {Array.from({ length: MAX_RANDOM_VARIANTS }, (_, index) => index + 1).map((count) => (
            <option key={count} value={count}>
              {count === 1 ? "1 variante a caso" : `${count} varianti a caso`}
            </option>
          ))}
        </select>
      </label>
      {rule.count > 0 && (
        <>
          <span className="text-xs font-bold text-muted">
            Stile {rule.styles.length === 0 && <span className="font-semibold">· qualsiasi</span>}
          </span>
          <ChipRow>
            {styles.map((entry) => (
              <Chip
                key={entry.style}
                active={rule.styles.includes(entry.style)}
                onClick={() => set({ styles: toggleValue(rule.styles, entry.style) })}
              >
                ★ {entry.name}
              </Chip>
            ))}
          </ChipRow>
          <span className="text-xs font-bold text-muted">
            Rarità {rule.rarities.length === 0 && <span className="font-semibold">· qualsiasi</span>}
          </span>
          <ChipRow>
            {rarities.map((entry) => (
              <Chip
                key={entry.code}
                active={rule.rarities.includes(entry.code)}
                color={entry.color}
                onClick={() => set({ rarities: toggleValue(rule.rarities, entry.code) })}
              >
                {entry.name}
              </Chip>
            ))}
          </ChipRow>
          <p className="text-xs font-medium leading-4 text-muted">
            Il server le estrae quando paga il premio: varianti diverse, prima quelle che il giocatore non ha.
          </p>
        </>
      )}
    </div>
  );
}
