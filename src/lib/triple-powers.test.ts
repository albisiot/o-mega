import { describe, expect, it } from "vitest";
import type { MatchCard } from "./match";
import type { TripleContest, TripleRound, TripleView } from "./triple";
import { contestNotes } from "./triple-powers";

const card = (id: string, power: MatchCard["power"], faction = "heroes"): MatchCard & { instance_id: string } => ({
  instance_id: id,
  definition_id: id,
  code: id,
  name: id,
  faction,
  flavor: "",
  art_url: null,
  stats: { FOR: 5, RES: 5 },
  rarity: { code: "beta", name: "Beta", rank: 3, color: "#000" },
  power,
});
const play = (score: number, bonus = 0) => ({ base: score - bonus, bonus, score, highest: 5, auto_played: false });

const comeback = card("riscossa", { code: "comeback", params: { bonus: 2 }, name: "Riscossa", text: "" });
const opener = card("apripista", { code: "opener", params: { bonus: 3, max_round: 2 }, name: "Apripista", text: "" });
const plain = card("semplice", null);
const rival = card("rivale", null, "villains");
const saboteur = card("sabotatore", { code: "sabotage", params: { malus: 1 }, name: "Sabotatore", text: "" }, "villains");

const contest = (slot: number, mine: typeof plain, theirs: MatchCard, myScore: number, theirScore: number, myBonus = 0): TripleContest => ({
  slot,
  winner: myScore > theirScore ? "me" : myScore < theirScore ? "opponent" : "none",
  my_play: { ...play(myScore, myBonus), instance_id: mine.instance_id, definition_id: mine.definition_id },
  opponent_play: { ...theirs, ...play(theirScore) },
});
const round = (number: number, contests: TripleContest[]): TripleRound =>
  ({ round: number, deadline_at: "", resolved: true, hand: null, my_pending: null, opponent_has_chosen: false, contests }) as TripleRound;

const threat = (slot: number) => ({ slot, name: `M${slot}`, level: 2, abilities: ["FOR", "RES"], flavor: "", modifier: null });

function view(rounds: TripleRound[]): TripleView {
  return {
    threats: [threat(0), threat(1), threat(2)],
    my_deck: [comeback, opener, plain].map((c) => ({ ...c, drawn_round: 1, played: true })),
    rounds,
  } as unknown as TripleView;
}

describe("contestNotes", () => {
  it("tells a card's own power with its family code", () => {
    const first = round(1, [contest(0, opener, rival, 13, 10, 3)]);
    const notes = contestNotes(view([first]), first, first.contests[0], "me");
    expect(notes).toEqual([{ name: "Apripista", effect: "+3", active: true, points: 3, code: "opener", source: "own" }]);
  });

  it("carries Riscossa along the same threat into the next round", () => {
    const first = round(1, [contest(0, comeback, rival, 8, 10), contest(1, opener, rival, 13, 10, 3)]);
    const second = round(2, [contest(0, plain, rival, 12, 11, 2), contest(1, plain, rival, 10, 11)]);
    const v = view([first, second]);
    expect(contestNotes(v, second, second.contests[0], "me")).toEqual([
      { name: "Riscossa", effect: "+2", active: true, points: 2, code: "comeback", source: "carried" },
    ]);
    // The other threat had no Riscossa: nothing carried there.
    expect(contestNotes(v, second, second.contests[1], "me")).toEqual([]);
  });

  it("tells the opposing card's power too", () => {
    const first = round(1, [contest(0, plain, saboteur, 8, 10)]);
    const notes = contestNotes(view([first]), first, first.contests[0], "opponent");
    expect(notes[0]).toMatchObject({ name: "Sabotatore", active: true, code: "sabotage" });
  });
});

describe("contestNotes with the server's parts", () => {
  it("takes the points and the carried bonus from the parts", () => {
    const parts = { power: 6, carried: 0, pack: 0, modifier: 0, floor: 0 };
    const first = round(1, [{ ...contest(0, opener, rival, 16, 10, 6), my_play: { ...contest(0, opener, rival, 16, 10, 6).my_play!, parts } }]);
    expect(contestNotes(view([first]), first, first.contests[0], "me")).toEqual([
      { name: "Apripista", effect: "+6", active: true, points: 6, code: "opener", source: "own" },
    ]);
  });
});
