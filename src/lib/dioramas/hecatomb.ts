import { BoxGeometry, CatmullRomCurve3, ConeGeometry, CylinderGeometry, Vector3, type Group } from "three";
import { CYAN, INK, MAGENTA, ORANGE, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { column, floor, rubble, steps } from "@/lib/diorama-props";

/**
 * Hecatomb (P135): the tariff-keeper of the Figli dell'Ultima stands at the foot of the ruined
 * temple steps under the volcano, wide black hat, grey cloak and the wooden tally board on his
 * chest, pointing out which bowl of offerings goes first; out of a crack in the paving a
 * creature from the digs reaches for it. The price, no sixth sense: a second tentacle is
 * creeping up behind his hat and he has no idea.
 */
export function hecatomb(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const BRONZE = 0xb07a3a;
  const FLESH = 0x4a2050;
  const F = octagonBase(kit, 0x201418);
  const G = floor(kit, F, 0.06, 0x3a2e34, 0x2a2026, 0.5);

  // The temple: the volcano behind, steps rising away, a whole column and a broken one.
  // (A silhouette of our own: the prop's is turned 45 degrees and pokes out of the base here.)
  add(new CylinderGeometry(0.18, 1.3, 1.25, 4, 1).rotateY(Math.PI / 4).scale(1, 1, 0.06), 0x3a2a40, 0.25, G, -2.0, { delay: 0.08 });
  box(0.28, 0.05, 0.03, ORANGE, 0.25, G + 1.2, -1.95, { delay: 0.12, flat: true, noInk: true });
  [
    [0.32, 1.42, 0.16],
    [0.45, 1.72, 0.2],
  ].forEach(([x, y, r], i) => ball(r, 0x5a2148, x, G + y, -2.0, { delay: 0.16 + i * 0.04, noInk: true }));
  steps(kit, 0.2, -0.3, G, 0.12, { width: 2.8, count: 4, tread: 0.3, rise: 0.18, color: 0x5a4e5e });
  column(kit, -0.85, -1.55, G + 0.72, 0.3, 2.3, false, 0x7a7488);
  column(kit, 1.25, -1.5, G + 0.72, 0.34, 2.3, true, 0x7a7488);

  // The offerings, lined up on the bottom step: bronze bowls of herbs, smoking.
  const bowls: Point[] = [1.4, 0.95, 0.5].map((x) => [x, G + 0.18, -0.45]);
  bowls.forEach(([x, y, z], i) => {
    cylinder(0.17, 0.1, 0.11, BRONZE, x, y, z, { delay: 0.4 + i * 0.04 }, 14);
    cylinder(0.15, 0.15, 0.01, ORANGE, x, y + 0.1, z, { delay: 0.45 + i * 0.04, flat: true, noInk: true }, 14);
    [-0.06, 0.05].forEach((dx, k) => add(new ConeGeometry(0.04, 0.18, 5), 0x5a7a3a, x + dx, y + 0.08, z + k * 0.03, { delay: 0.5 + i * 0.04, rotation: [0, 0, dx * 4] }));
  });
  motes(10, 0x8a7a8a, 0.03, [0.4, G + 0.4, -0.55], [1.5, G + 1.7, -0.35], 1.2);

  // A crack in the paving at the front, eyes in the dark, and the creature's tentacle.
  const PX = 1.5;
  const PZ = 0.55;
  const pit = add(new CylinderGeometry(0.42, 0.46, 0.01, 9), 0x0c0810, PX, G, PZ, { delay: 0.3, flat: true, noInk: true });
  decorate(pit, new BoxGeometry(0.4, 0.004, 0.025), INK, [
    [-0.5, 0.01, 0.2, 0],
    [0.35, 0.01, -0.45, 0],
  ]);
  rubble(kit, PX, PZ, G, 0.32, 6, 0.55, 0x4a3e46);
  const eyes = [-0.12, 0.02, 0.14].map((dx, i) => ball(0.04, CYAN, PX + dx, G + 0.02, PZ + 0.1 + (i % 2) * 0.1, { delay: 1.6 + i * 0.05, flat: true, noInk: true }));
  /** A tentacle: balls shrinking along a curve, swaying as one. */
  const tentacle = (path: Point[], from: number, to: number, count: number, delay: number) => {
    const curve = new CatmullRomCurve3(path.map((p) => new Vector3(...p)));
    return Array.from({ length: count }, (_, k) => {
      const u = k / (count - 1);
      const r = from + (to - from) * u;
      const p = curve.getPoint(u);
      const part: Group = ball(r, k === count - 1 ? MAGENTA : FLESH, p.x, p.y - r, p.z, { delay: delay + k * 0.04 });
      return { part, u, rest: [p.x, p.y - r, p.z] as Point };
    });
  };
  const reach = tentacle(
    [
      [PX, G - 0.05, PZ],
      [1.45, G + 1.1, 0.3],
      [1.0, G + 1.65, 0.0],
      [0.62, G + 1.2, -0.3],
      [0.52, G + 0.5, -0.42],
    ],
    0.16,
    0.05,
    20,
    1.3,
  );
  const sneak = tentacle(
    [
      [-1.45, G - 0.05, -0.1],
      [-1.5, G + 1.2, 0.05],
      [-1.3, G + 2.3, 0.2],
      [-0.95, G + 2.75, 0.4],
    ],
    0.1,
    0.04,
    15,
    1.8,
  );
  add(new CylinderGeometry(0.2, 0.22, 0.01, 7), 0x0c0810, -1.45, G, -0.1, { delay: 0.3, flat: true, noInk: true });

  // Hecatomb: weathered, grey stubble, the wide black hat, a cloak with a capelet.
  const keeper = figure(kit, {
    x: -0.5,
    z: 0.55,
    y: G,
    facing: 0.35,
    height: 2.5,
    build: "normal",
    skin: 0xc8906c,
    hair: { style: "short", color: 0x8a8a92 },
    face: { mouth: "frown", brows: "angry", beard: "stubble", beardColor: 0x9a9aa2, marks: 0x9a6a50 },
    headwear: { kind: "hat", color: 0x1a1a20, accent: 0x2a2a32 },
    top: { kind: "robe", color: 0x3a3a44 },
    cape: 0x2c2c36,
    shoes: 0x2a2622,
    arms: [
      [-0.42, 1.22, 0.28],
      [0.68, 1.5, 0.4],
    ],
    delay: 0.7,
  });
  const at = keeper.at;
  add(new CylinderGeometry(0.42, 0.42, 0.03, 22), 0x1a1a20, ...at(0, 2.35, 0), { delay: 1.15 });
  add(new CylinderGeometry(0.27, 0.56, 0.46, 16).scale(1, 1, 0.78), 0x2e2e38, ...at(0, 1.42, -0.02), { delay: 1.1, rotation: [0, 0.35, 0] });
  // The tally board on its chain: the tariff, notch by notch.
  const board = box(0.26, 0.32, 0.04, 0x8a5a34, ...at(0, 1.18, 0.37), { delay: 1.3, rotation: [0.1, 0.35, 0] });
  decorate(board, new BoxGeometry(0.012, 0.26, 0.01), 0x4a2e1a, [-0.08, -0.04, 0, 0.04, 0.08].map((x) => [x, 0.16, 0.021] as Point));
  [-1, 1].forEach((side) => limb(kit, at(side * 0.11, 1.5, 0.37), at(side * 0.16, 1.82, 0.18), 0.012, 0.012, 0xc9a040, { delay: 1.32, noInk: true }));
  // The staff, planted.
  limb(kit, at(-0.5, 0, 0.34), at(-0.4, 1.85, 0.24), 0.035, 0.03, 0x5e4a3a, { delay: 1.2 });

  tick((t) => {
    // The tentacles sway; the one behind him rises and dips; the eyes blink.
    reach.forEach(({ part, u, rest }) => part.position.set(rest[0] + Math.sin(t * 1.3 - u * 3) * 0.06 * u, rest[1], rest[2] + Math.cos(t * 1.1 - u * 2) * 0.04 * u));
    sneak.forEach(({ part, u, rest }) => part.position.set(rest[0] + Math.sin(t * 1.7 - u * 4) * 0.07 * u, rest[1] + Math.sin(t * 0.8) * 0.08 * u, rest[2]));
    eyes.forEach((eye, i) => (eye.visible = Math.floor(t * 1.5 + i * 0.7) % 5 !== 4));
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}
