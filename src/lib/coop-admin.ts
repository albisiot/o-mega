// The operations editor (SPEC §5.17), admins only: every function checks the admin on the server
// and every save is checked again there. Nothing here decides anything.
import { getSupabase } from "@/lib/supabase/client";

export type CoopAdminRound = { threats: string[]; reinforced: number };

export type CoopAdminOperation = {
  code: string;
  chapter: number;
  ord: number;
  title: string;
  intro: string;
  outro: string;
  rival_name: string;
  boss_name: string;
  /** Character codes of the rival's five Echi. */
  rival: string[];
  reward_coins: number;
  /** A card code, or null. */
  reward_card: string | null;
  star_panic: number;
  star_rarities: string[];
  star_traits: string[];
  star_coins: number;
  /** Threat codes, five per round, the Boss last. */
  rounds: CoopAdminRound[];
  /** Rooms started, wins, and whether a room is open or playing now. */
  rooms: number;
  wins: number;
  in_play: boolean;
};

export type CoopAdminChapter = { chapter: number; title: string; intro: string; outro: string };

export type CoopAdminThreat = { code: string; name: string; level: number; abilities: string[] };

export type CoopAdmin = {
  /** Rounds of an operation (the Boss is the last). */
  rounds: number;
  panic_limit: number;
  chapters: CoopAdminChapter[];
  operations: CoopAdminOperation[];
  /** The threats an operation may use: the usual ones of Nuova Megara, without a rule. */
  threats: CoopAdminThreat[];
};

/** What the form edits: an operation without what only the server knows. */
export type CoopOperationDraft = Omit<CoopAdminOperation, "code" | "ord" | "rooms" | "wins" | "in_play"> & { code: string | null };

type AdminFunction = "admin_get_coop" | "admin_save_coop_chapter" | "admin_save_coop_operation" | "admin_delete_coop_operation";

async function rpc(name: AdminFunction, params?: Record<string, unknown>): Promise<CoopAdmin> {
  const { data, error } = await getSupabase().rpc(name as never, params as never);
  if (error) throw new Error((error as { message: string }).message);
  return data as unknown as CoopAdmin;
}

export function fetchCoopAdmin(): Promise<CoopAdmin> {
  return rpc("admin_get_coop");
}

export function saveCoopChapter(chapter: number | null, texts: Omit<CoopAdminChapter, "chapter">): Promise<CoopAdmin> {
  return rpc("admin_save_coop_chapter", { p_chapter: chapter, p_title: texts.title, p_intro: texts.intro, p_outro: texts.outro });
}

export function saveCoopOperation(draft: CoopOperationDraft): Promise<CoopAdmin> {
  return rpc("admin_save_coop_operation", { p_operation: draft });
}

export function deleteCoopOperation(code: string): Promise<CoopAdmin> {
  return rpc("admin_delete_coop_operation", { p_code: code });
}

/** A new operation for a chapter: from the chapter's last one (its rival and rounds), with blank texts. */
export function newOperationDraft(data: CoopAdmin, chapter: number): CoopOperationDraft {
  const model = [...data.operations].reverse().find((o) => o.chapter === chapter) ?? data.operations.at(-1);
  const rounds: CoopAdminRound[] = model
    ? model.rounds.map((r) => ({ threats: [...r.threats], reinforced: r.reinforced }))
    : Array.from({ length: data.rounds }, () => ({ threats: data.threats.slice(0, 5).map((t) => t.code), reinforced: 0 }));
  return {
    code: null,
    chapter,
    title: "",
    intro: "",
    outro: "",
    rival_name: model?.rival_name ?? "",
    boss_name: "",
    rival: model ? [...model.rival] : [],
    reward_coins: 50,
    reward_card: null,
    star_panic: 5,
    star_rarities: model ? [...model.star_rarities] : ["delta", "gamma"],
    star_traits: [],
    star_coins: 20,
    rounds,
  };
}

export function operationDraft(operation: CoopAdminOperation): CoopOperationDraft {
  return {
    code: operation.code,
    chapter: operation.chapter,
    title: operation.title,
    intro: operation.intro,
    outro: operation.outro,
    rival_name: operation.rival_name,
    boss_name: operation.boss_name,
    rival: [...operation.rival],
    reward_coins: operation.reward_coins,
    reward_card: operation.reward_card,
    star_panic: operation.star_panic,
    star_rarities: [...operation.star_rarities],
    star_traits: [...operation.star_traits],
    star_coins: operation.star_coins,
    rounds: operation.rounds.map((r) => ({ threats: [...r.threats], reinforced: r.reinforced })),
  };
}

/** What is wrong with a draft before it goes to the server (which checks it all again); null if nothing. */
export function operationProblem(draft: CoopOperationDraft, data: CoopAdmin): string | null {
  const between = (text: string, min: number, max: number) => text.trim().length >= min && text.trim().length <= max;
  if (!between(draft.title, 2, 40)) return "Il titolo va da 2 a 40 caratteri.";
  if (!between(draft.intro, 10, 600) || !between(draft.outro, 10, 600)) return "Introduzione e finale vanno da 10 a 600 caratteri.";
  if (!between(draft.rival_name, 2, 60) || !between(draft.boss_name, 2, 60)) return "Rivale e Boss vanno da 2 a 60 caratteri.";
  if (draft.rival.length !== data.rounds || new Set(draft.rival).size !== data.rounds || draft.rival.some((code) => !code)) {
    return `Il rivale ha ${data.rounds} Echi diversi, uno per round.`;
  }
  for (const [i, round] of draft.rounds.entries()) {
    if (round.threats.length !== 5 || new Set(round.threats).size !== 5 || round.threats.some((code) => !code)) {
      return `${i === draft.rounds.length - 1 ? "Il Boss" : `Il round ${i + 1}`} ha 5 Minacce diverse.`;
    }
  }
  if (draft.star_rarities.length === 0 && draft.star_traits.length === 0) return "La stella della squadra chiede almeno una rarità o un tratto.";
  if (draft.star_panic < 0 || draft.star_panic >= data.panic_limit) return `Il Panico della stella va da 0 a ${data.panic_limit - 1}.`;
  return null;
}
