// Scontro a squadre (SPEC §5.19, docs/COMBAT.md), stage 5: every batch of kits written so far, by
// number, for the simulator (--batch N), the sheet of docs/COMBAT-KITS.md and the tests. The
// database (combat_kits) is the reference once a batch is loaded. Imports with their extension, so
// the scripts can load this file with Node.
import { COMBAT_KITS_BATCH_1, type CombatKitEntry } from "./combat-kits-batch-1.ts";
import { COMBAT_KITS_BATCH_2 } from "./combat-kits-batch-2.ts";
import { COMBAT_KITS_BATCH_3 } from "./combat-kits-batch-3.ts";
import { COMBAT_KITS_BATCH_4 } from "./combat-kits-batch-4.ts";
import { COMBAT_KITS_BATCH_5 } from "./combat-kits-batch-5.ts";
import { COMBAT_KITS_BATCH_6 } from "./combat-kits-batch-6.ts";
import { COMBAT_KITS_BATCH_7 } from "./combat-kits-batch-7.ts";
import { COMBAT_KITS_BATCH_8 } from "./combat-kits-batch-8.ts";

export const COMBAT_KIT_BATCHES: Record<string, CombatKitEntry[]> = { "1": COMBAT_KITS_BATCH_1, "2": COMBAT_KITS_BATCH_2, "3": COMBAT_KITS_BATCH_3, "4": COMBAT_KITS_BATCH_4, "5": COMBAT_KITS_BATCH_5, "6": COMBAT_KITS_BATCH_6, "7": COMBAT_KITS_BATCH_7, "8": COMBAT_KITS_BATCH_8 };
