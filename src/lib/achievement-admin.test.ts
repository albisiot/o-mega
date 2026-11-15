import { describe, expect, it } from "vitest";
import {
  METRICS,
  cleanParams,
  describeAdminReward,
  describeCondition,
  fixedTarget,
  moveInOrder,
  paramsProblem,
} from "@/lib/achievement-admin";

describe("describeCondition", () => {
  it("writes the starting imprese in plain Italian", () => {
    expect(describeCondition("matches_won", { opponent: "player" }, 1)).toBe("Hai vinto una partita contro altri giocatori.");
    expect(describeCondition("matches_won", { format: "classic", flawless: true }, 1)).toBe("Hai vinto una partita classica 3-0.");
    expect(describeCondition("matches_won", { format: "classic" }, 3)).toBe("Hai vinto 3 partite classiche.");
    expect(describeCondition("matches_won", { opponent: "bot", bot_difficulties: ["super_pro"] }, 10)).toBe(
      "Hai vinto 10 partite contro un bot Super Pro.",
    );
    expect(describeCondition("upset_rounds", { max_rarity_rank: 1, opponent_min_rarity_rank: 5 }, 1)).toBe(
      "Hai vinto un round con una carta Delta contro una Omega.",
    );
    expect(describeCondition("team_wins", { faction: "villains" }, 1)).toBe(
      "Hai vinto una partita con una squadra di soli Supercattivi.",
    );
    expect(describeCondition("characters_owned", { faction: "villains", all: true }, 1)).toBe("Hai tutti i personaggi Supercattivi.");
    expect(describeCondition("characters_owned", {}, 50)).toBe("Hai 50 personaggi diversi.");
    expect(describeCondition("cards_conquered", { per_opponent_cap: 2 }, 10)).toBe(
      "Hai conquistato 10 carte, al massimo 2 per avversario.",
    );
    expect(describeCondition("story_missions", { season: 1, all: true }, 1)).toBe("Hai completato tutta la stagione 1 della Storia.");
    expect(describeCondition("registered_before", { before: "2026-12-01" }, 1)).toBe(
      "Sei arrivato a Nuova Megara prima del 01/12/2026.",
    );
  });

  it("names traits and styles when it can", () => {
    expect(describeCondition("variants_owned", { style: "neon" }, 3, { style: () => "Neon" })).toBe("Hai trovato 3 varianti Neon.");
    expect(describeCondition("team_wins", { trait: "x" }, 2, { trait: () => "Ribelli" })).toBe(
      "Hai vinto 2 partite con una squadra di tutti con il tratto Ribelli.",
    );
  });

  it("has a sentence for every metric", () => {
    for (const { metric } of METRICS) expect(describeCondition(metric, {}, 2).length).toBeGreaterThan(5);
  });
});

describe("cleanParams", () => {
  it("drops empty filters and converts the form's strings", () => {
    expect(
      cleanParams("matches_won", {
        format: "classic",
        mode: "",
        story: "false",
        opponent: "bot",
        bot_difficulties: [],
        flawless: true,
        unknown: "x",
      }),
    ).toEqual({ format: "classic", story: false, opponent: "bot", flawless: true });
    expect(cleanParams("upset_rounds", { max_rarity_rank: "2", opponent_min_rarity_rank: "4" })).toEqual({
      max_rarity_rank: 2,
      opponent_min_rarity_rank: 4,
    });
    expect(cleanParams("story_missions", { season: "1", all: true })).toEqual({ season: 1, all: true });
    expect(cleanParams("night_matches", { from_hour: "0", to_hour: "5" })).toEqual({ from_hour: 0, to_hour: 5 });
  });
});

describe("paramsProblem and fixedTarget", () => {
  it("asks for what the server needs", () => {
    expect(paramsProblem("team_wins", {})).not.toBeNull();
    expect(paramsProblem("team_wins", { faction: "heroes" })).toBeNull();
    expect(paramsProblem("night_matches", { from_hour: 3, to_hour: 3 })).not.toBeNull();
    expect(paramsProblem("registered_before", {})).not.toBeNull();
    expect(paramsProblem("matches_won", {})).toBeNull();
  });

  it("fixes the target of yes-or-no imprese", () => {
    expect(fixedTarget("characters_owned", { all: true })).toBe(true);
    expect(fixedTarget("manual", {})).toBe(true);
    expect(fixedTarget("matches_won", {})).toBe(false);
  });
});

describe("describeAdminReward and moveInOrder", () => {
  it("says the reward", () => {
    expect(describeAdminReward({ coins: 0, packs: 2, card_codes: ["P001:neon"], title: "X" })).toBe(
      "2 pacchetti · 1 carta · titolo «X»",
    );
    expect(describeAdminReward({ coins: 0, packs: 0, card_codes: [], title: null })).toBe("Solo la medaglia");
  });

  it("moves an impresa one place, never past the ends", () => {
    expect(moveInOrder(["a", "b", "c"], "b", -1)).toEqual(["b", "a", "c"]);
    expect(moveInOrder(["a", "b", "c"], "c", 1)).toEqual(["a", "b", "c"]);
    expect(moveInOrder(["a", "b", "c"], "z", 1)).toEqual(["a", "b", "c"]);
  });
});
