import { describe, expect, it } from "vitest";
import { daysLeft, daysLeftText, emergencyHref, weekText } from "@/lib/emergency";

describe("the weekly Emergenza on screen", () => {
  // The week of 16-22 November 2026 ends on Monday 23 at midnight, Rome (23:00 UTC on Sunday).
  const endsAt = "2026-11-22T23:00:00Z";

  it("counts the days left, today included", () => {
    expect(daysLeft(endsAt, Date.parse("2026-11-16T00:30:00+01:00"))).toBe(7);
    expect(daysLeft(endsAt, Date.parse("2026-11-17T12:00:00Z"))).toBe(6);
    expect(daysLeft(endsAt, Date.parse("2026-11-22T00:10:00+01:00"))).toBe(1);
    expect(daysLeft(endsAt, Date.parse("2026-11-22T23:59:00+01:00"))).toBe(1);
    // A clock a little ahead of the server never says 0.
    expect(daysLeft(endsAt, Date.parse("2026-11-23T00:05:00+01:00"))).toBe(1);
  });

  it("says the days left and names the week", () => {
    expect(daysLeftText(1)).toBe("Ultimo giorno");
    expect(daysLeftText(3)).toBe("Ancora 3 giorni");
    expect(weekText("2026-11-16")).toBe("dal 16 al 22 novembre");
    expect(weekText("2026-11-30")).toBe("dal 30 novembre al 6 dicembre");
  });

  it("opens the weekly challenge with a query string (static export)", () => {
    expect(emergencyHref("week")).toBe("/emergenza/?settimana=1");
    expect(emergencyHref("day")).toBe("/emergenza");
  });
});
