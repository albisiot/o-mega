import { describe, expect, it } from "vitest";
import {
  endBoardEntryParts,
  endBoardPlaceBelow,
  endNoticeEyebrow,
  endNoticeHeadline,
  endNoticeName,
  endNoticeNotes,
  endNoticePrizeLink,
  endNoticeSummary,
  enqueueEndNotices,
  parseEndNotices,
  periodText,
  type EndBoardEntry,
  type EndNotice,
} from "./end-notices";

const entry = (rank: number, value: number, value2: number | null, isMe = false): EndBoardEntry => ({
  rank,
  username: `p${rank}`,
  avatar_url: null,
  value,
  value2,
  is_me: isMe,
});

const base = {
  color: null,
  starts_at: "2026-11-12T19:00:00Z",
  ends_at: "2026-11-19T19:00:00Z",
  board_locked: false,
};

const event = (over: Partial<Extract<EndNotice, { kind: "event" }>> = {}): EndNotice => ({
  ...base,
  id: "event:e1",
  kind: "event",
  ref: "e1",
  title: "La notte dei Cattivi",
  rank: 4,
  players: 87,
  result: { points: 1340, steps: 5, tiers: 5 },
  board: { players: 87, top: [entry(1, 2000, 5), entry(4, 1340, 5, true)], me: entry(4, 1340, 5, true) },
  ...over,
});

const challenge = (over: Partial<Extract<EndNotice, { kind: "challenge" }>> = {}): EndNotice => ({
  ...base,
  id: "challenge:c1",
  kind: "challenge",
  ref: "c1",
  title: "Solo Delta",
  color: "#7dd3fc",
  rank: 23,
  players: 41,
  result: { format: "classic", wins: 6, played: 11, score: 0, finished: null, threats: null },
  board: { players: 41, top: [entry(1, 20, 25)], me: entry(23, 6, 11, true) },
  ...over,
});

const week = (over: Partial<Extract<EndNotice, { kind: "emergency_week" }>> = {}): EndNotice => ({
  ...base,
  id: "emergency_week:2026-11-09",
  kind: "emergency_week",
  ref: "2026-11-09",
  title: "Emergenza della settimana",
  starts_at: "2026-11-08T23:00:00Z",
  ends_at: "2026-11-15T23:00:00Z",
  rank: 2,
  players: 37,
  result: { passed: 9, score: 251, finished: true, threats: 10, prize_coins: 50, prize_packs: 1, prize_claimed: false },
  board: { players: 37, top: [entry(1, 10, 280), entry(2, 9, 251, true)], me: entry(2, 9, 251, true) },
  ...over,
});

const season = (over: Partial<Extract<EndNotice, { kind: "ranked_season" }>> = {}): EndNotice => ({
  ...base,
  id: "ranked_season:2026-10",
  kind: "ranked_season",
  ref: "2026-10",
  title: "Mandato di ottobre 2026",
  starts_at: "2026-09-30T22:00:00Z",
  ends_at: "2026-10-31T23:00:00Z",
  rank: 7,
  players: 212,
  result: {
    fama: 1320,
    league: "asso",
    league_name: "Asso",
    matches: 48,
    wins: 27,
    prize_coins: 100,
    prize_packs: 1,
    prize_claimed: false,
    title: null,
  },
  board: { players: 212, top: [entry(1, 2600, null)], me: entry(7, 1320, null, true) },
  ...over,
});

describe("periodText", () => {
  it("names the days in Italian time, the end at midnight counting as the day before", () => {
    // Monday 9 to Sunday 15 November: the week ends at midnight of Monday 16, Rome.
    expect(periodText("2026-11-08T23:00:00Z", "2026-11-15T23:00:00Z")).toBe("dal 9 al 15 novembre");
    expect(periodText("2026-10-28T10:00:00Z", "2026-11-03T10:00:00Z")).toBe("dal 28 ottobre al 3 novembre");
    expect(periodText("2026-11-12T08:00:00Z", "2026-11-12T20:00:00Z")).toBe("il 12 novembre");
  });
});

describe("parseEndNotices", () => {
  it("keeps the kinds this app knows and drops anything else", () => {
    const known = event();
    expect(parseEndNotices([known, { ...known, id: "x:1", kind: "tournament" }, null, "event"])).toEqual([known]);
    expect(parseEndNotices(null)).toEqual([]);
  });
});

describe("enqueueEndNotices", () => {
  it("adds new notices, the oldest end first, and never one already shown", () => {
    const first = week();
    const later = event();
    const queue = enqueueEndNotices([], [later, first], []);
    expect(queue.map((n) => n.id)).toEqual([first.id, later.id]);
    expect(enqueueEndNotices(queue, [first, later], [])).toBe(queue);
    expect(enqueueEndNotices([], [first, later], [first.id]).map((n) => n.id)).toEqual([later.id]);
  });
});

describe("wording", () => {
  it("says what ended and when", () => {
    expect(endNoticeEyebrow(event())).toBe("Evento concluso");
    expect(endNoticeEyebrow(challenge())).toBe("Sfida a tema conclusa");
    expect(endNoticeEyebrow(week())).toBe("Emergenza della settimana conclusa");
    expect(endNoticeEyebrow(season())).toBe("Classificata · Mandato concluso");
    expect(endNoticeName(week())).toEqual({ name: "Settimana dal 9 al 15 novembre", period: null });
    expect(endNoticeName(season())).toEqual({ name: "Mandato di ottobre 2026", period: null });
    expect(endNoticeName(event())).toEqual({ name: "La notte dei Cattivi", period: "dal 12 al 19 novembre" });
  });

  it("shows the place, or the result when there is none", () => {
    expect(endNoticeHeadline(event())).toBe("4° posto!");
    expect(endNoticeHeadline(event({ rank: null, result: { points: 340, steps: 2, tiers: 5 } }))).toBe("340 punti");
    expect(endNoticeHeadline(challenge({ rank: null, result: { format: "boss", wins: 1, played: 2, score: 0, finished: null, threats: null } }))).toBe(
      "1 vittoria",
    );
    expect(
      endNoticeHeadline(challenge({ rank: null, result: { format: "emergency", wins: 4, played: 0, score: 96, finished: false, threats: 10 } })),
    ).toBe("4/10");
    expect(endNoticeHeadline(week({ rank: null }))).toBe("9/10");
  });

  it("sums the result up, with the players only next to a place", () => {
    expect(endNoticeSummary(event())).toBe("1340 punti evento · tutti i traguardi · 87 giocatori");
    expect(endNoticeSummary(event({ rank: null, players: null, result: { points: 1, steps: 0, tiers: 3 } }))).toBe(
      "1 punto evento · 0/3 traguardi",
    );
    expect(endNoticeSummary(challenge())).toBe("6 vittorie su 11 partite · 41 giocatori");
    expect(
      endNoticeSummary(challenge({ rank: null, result: { format: "emergency", wins: 1, played: 0, score: 30, finished: false, threats: 8 } })),
    ).toBe("1 Minaccia superata su 8 · 30 punti");
    expect(endNoticeSummary(week())).toBe("9 Minacce superate · 251 punti · 37 giocatori");
    expect(endNoticeSummary(season())).toBe("Asso · 1320 Fama · 48 classificate · 212 giocatori");
  });

  it("explains a missing place and mentions prizes and titles", () => {
    expect(endNoticeNotes(event())).toEqual([]);
    expect(endNoticeNotes(event({ board: null, board_locked: true, rank: null }))).toEqual([
      "La classifica finale era per chi completava l'evento.",
    ]);
    expect(
      endNoticeNotes(challenge({ rank: null, result: { format: "emergency", wins: 4, played: 0, score: 96, finished: false, threats: 10 } })),
    ).toEqual(["Il tentativo non è finito: non è entrato in classifica."]);
    expect(endNoticeNotes(week())).toEqual(["Premio: 1 pacchetto e 50 monete"]);
    expect(
      endNoticeNotes(
        week({ rank: null, result: { passed: 3, score: 70, finished: false, threats: 10, prize_coins: 0, prize_packs: 0, prize_claimed: false } }),
      ),
    ).toEqual(["Il tentativo non è finito in tempo: non è entrato in classifica."]);
    const titled = season({ result: { ...(season() as Extract<EndNotice, { kind: "ranked_season" }>).result, prize_claimed: true, title: "Leggenda · ottobre 2026" } });
    expect(endNoticeNotes(titled)).toEqual(["Premio: 1 pacchetto e 100 monete (ritirato)", "Titolo: «Leggenda · ottobre 2026»"]);
  });

  it("leads to the Classificata only for a Mandato prize still to take", () => {
    expect(endNoticePrizeLink(season())).toEqual({ href: "/classificata/", label: "Ritira il premio" });
    const claimed = season({ result: { ...(season() as Extract<EndNotice, { kind: "ranked_season" }>).result, prize_claimed: true } });
    expect(endNoticePrizeLink(claimed)).toBeNull();
    expect(endNoticePrizeLink(week())).toBeNull();
  });
});

describe("leaderboard rows", () => {
  it("words each board's numbers", () => {
    expect(endBoardEntryParts(event(), entry(1, 2000, 5))).toEqual({ value: "2000", unit: "punti", detail: "Completato" });
    expect(endBoardEntryParts(event(), entry(9, 800, 3))).toEqual({ value: "800", unit: "punti", detail: "3/5 traguardi" });
    expect(endBoardEntryParts(challenge(), entry(1, 1, 4))).toEqual({ value: "1", unit: "vittoria", detail: "4 partite" });
    expect(endBoardEntryParts(week(), entry(1, 10, 280))).toEqual({ value: "10", unit: "superate", detail: "280 punti" });
    expect(endBoardEntryParts(season(), entry(1, 2600, null))).toEqual({ value: "2600", unit: "Fama", detail: null });
  });

  it("puts the player's own place below the list only when it is not in it", () => {
    const shown = event().board;
    const below = challenge().board;
    expect(shown && endBoardPlaceBelow(shown)).toBeNull();
    expect(below && endBoardPlaceBelow(below)?.rank).toBe(23);
    expect(endBoardPlaceBelow({ players: 3, top: [entry(1, 3, 1)], me: null })).toBeNull();
  });
});
