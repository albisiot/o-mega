import { describe, expect, it } from "vitest";
import { removeFromSquad, restoreToSquad } from "@/lib/squad-edit";

describe("squad editing", () => {
  it("takes a character out and says where it was", () => {
    expect(removeFromSquad(["a", "b", "c"], "b")).toEqual({ selected: ["a", "c"], index: 1 });
  });

  it("leaves the squad as it is for a character not in it", () => {
    const squad = ["a", "b"];
    expect(removeFromSquad(squad, "z")).toEqual({ selected: squad, index: -1 });
  });

  it("puts it back in the same place", () => {
    expect(restoreToSquad(["a", "c"], "b", 1, 5)).toEqual(["a", "b", "c"]);
    expect(restoreToSquad(["b", "c"], "a", 0, 5)).toEqual(["a", "b", "c"]);
  });

  it("puts it last when the squad has shrunk meanwhile", () => {
    expect(restoreToSquad(["a"], "e", 4, 5)).toEqual(["a", "e"]);
  });

  it("does not double a character picked again, nor overfill the squad", () => {
    expect(restoreToSquad(["a", "b"], "b", 0, 5)).toEqual(["a", "b"]);
    expect(restoreToSquad(["a", "c", "d", "e", "f"], "b", 1, 5)).toEqual(["a", "c", "d", "e", "f"]);
  });
});
