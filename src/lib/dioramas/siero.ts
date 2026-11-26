import { BoxGeometry, Color, CylinderGeometry, Group, MeshBasicMaterial, SphereGeometry } from "three";
import { MAGENTA, ORANGE, YELLOW, cable, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, table } from "@/lib/diorama-props";

/**
 * Siero (P332): the Lete chemist halfway into his own serum, in the specimen lab. One side of him
 * is still the bookish man in glasses and lab coat, a vial of amber serum bubbling in his hand;
 * the other has burst into a brute's arm, chest and cheek, amber veins pulsing. Behind him the
 * glowing tanks hold what became of the volunteers; the price lies on the floor and the bench:
 * empty vials everywhere, because he never manages to stop at one sip.
 */
export function siero(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const BRUTE = 0x4a3a6a;
  const GLASS = 0xa8dcea;
  const STEEL = 0x3a4252;
  const COAT = 0xdfe3ea;
  const F = octagonBase(kit, 0x1c1f2a);
  const G = floor(kit, F, 0.06, 0x2a3040, 0x1c2230, 0.45);
  const turn = 0.33;

  // Two specimen tanks glowing cyan, a curled shape inside each, magenta hoses to a pipe overhead.
  const tank = (x: number, z: number, delay: number) => {
    cylinder(0.44, 0.48, 0.24, STEEL, x, G, z, { delay }, 16);
    const glass = cylinder(0.38, 0.38, 1.6, 0x4fc8e8, x, G + 0.24, z, { delay: delay + 0.05, flat: true, rotation: [0, turn, 0] }, 20);
    // A volunteer curled up asleep: back, bowed head and drawn-up knees.
    decorate(glass, new SphereGeometry(0.15, 12, 10).scale(1, 1.5, 0.3), 0x1f2a48, [[0, 0.86, 0.372, 0.35]]);
    decorate(glass, new SphereGeometry(0.095, 10, 8).scale(1, 1, 0.4), 0x1f2a48, [[0.1, 1.05, 0.37]]);
    decorate(glass, new SphereGeometry(0.1, 10, 8).scale(1.3, 0.8, 0.4), 0x1f2a48, [[0.1, 0.66, 0.366]]);
    decorate(glass, new BoxGeometry(0.035, 1.3, 0.01), 0xd8f6ff, [[-0.22, 0.8, 0.31, 0]]);
    cylinder(0.44, 0.44, 0.2, STEEL, x, G + 1.84, z, { delay: delay + 0.08 }, 16);
    cable(kit, [[x, G + 2.0, z], [x + 0.12, G + 2.38, z - 0.05], [x + 0.35, G + 2.52, -1.5]], 0.035, MAGENTA, delay + 0.3);
    motes(5, 0xd8f6ff, 0.025, [x - 0.15, G + 0.4, z + 0.3], [x + 0.15, G + 1.8, z + 0.4], delay + 0.5);
  };
  tank(-1.25, -1.1, 0.12);
  tank(0.85, -1.4, 0.2);
  add(new CylinderGeometry(0.07, 0.07, 3.0, 10).rotateZ(Math.PI / 2), STEEL, 0, G + 2.48, -1.5, { delay: 0.3 });
  [-1.45, 1.45].forEach((x) => cylinder(0.05, 0.05, 2.48, STEEL, x, G, -1.5, { delay: 0.28 }, 8));

  // The bench: a rack of tubes, all empty but one, and a flask.
  const bench = table(kit, -1.45, 0.2, G, 0.35, false, 0x3a4050);
  void bench;
  const c = Math.cos(turn);
  const s = Math.sin(turn);
  const onBench = (dx: number, dz: number): [number, number] => [-1.45 + dx * c + dz * s, 0.2 - dx * s + dz * c];
  const top = G + 0.8;
  const rack = (dx: number) => onBench(dx, 0.05);
  box(0.6, 0.04, 0.16, STEEL, ...wrap(rack(0), top), { delay: 0.45, rotation: [0, turn, 0] });
  box(0.6, 0.03, 0.16, STEEL, ...wrap(rack(0), top + 0.17), { delay: 0.47, rotation: [0, turn, 0] });
  [-0.28, 0.28].forEach((dx) => box(0.03, 0.17, 0.16, STEEL, ...wrap(rack(dx), top), { delay: 0.46, rotation: [0, turn, 0] }));
  [-0.2, -0.1, 0, 0.1, 0.2].forEach((dx, k) =>
    cylinder(0.03, 0.03, 0.27, k === 4 ? ORANGE : GLASS, ...wrap(rack(dx), top + 0.03), { delay: 0.5 + k * 0.02, flat: k === 4 }, 8),
  );
  const [flaskX, flaskZ] = onBench(0.2, -0.2);
  cylinder(0.1, 0.13, 0.09, ORANGE, flaskX, top, flaskZ, { delay: 0.55, flat: true }, 12);
  cylinder(0.03, 0.1, 0.18, GLASS, flaskX, top + 0.09, flaskZ, { delay: 0.57 }, 12);

  // Empty vials rolled all over the floor.
  [
    [0.9, 0.95, 0.4],
    [1.25, 0.45, 1.9],
    [0.35, 1.3, 2.6],
    [-0.75, 1.15, 0.9],
    [1.5, 1.0, 1.2],
    [-0.4, 1.6, 0.2],
  ].forEach(([x, z, r], k) => add(new CylinderGeometry(0.035, 0.035, 0.24, 8).rotateZ(Math.PI / 2), GLASS, x, G, z, { delay: 0.6 + k * 0.03, rotation: [0, r, 0] }));

  // Siero, half man and half brute.
  const u = 2.45 / 2.4;
  const lab = figure(kit, {
    x: -0.05,
    z: 0.25,
    y: G,
    facing: 0.3,
    height: 2.45,
    skin: 0xd8ae8c,
    hair: { style: "short", color: 0x3a2a22 },
    face: { mouth: "grin", brows: "angry", glasses: "round", glassesColor: 0x9aa3b3 },
    top: { kind: "coat", color: COAT, accent: 0x34405a },
    bottom: { kind: "trousers", color: 0x2a3550 },
    shoes: 0x1f1d24,
    arms: [[-0.45, 1.55, 0.42], [0.78, 0.82, 0.5]],
    legs: "wide",
    delay: 0.8,
  });
  const veins: MeshBasicMaterial[] = [];
  /** Amber veins on a round part, each laid flat on its surface at angle a round `centre`. */
  const vein = (part: Group, centre: Point, radius: number, spots: [number, number, number][]) => {
    const at = spots.map(([a, dy, lean]) => [centre[0] + Math.sin(a) * radius, centre[1] + dy, centre[2] + Math.cos(a) * radius, lean] as [number, number, number, number]);
    veins.push(decorate(part, new BoxGeometry(0.026, 0.16, 0.012), ORANGE, at));
    part.children.slice(-spots.length).forEach((mesh, k) => (mesh.rotation.y = spots[k][0]));
  };

  // The brute side: a swollen shoulder, arm and pectoral, with the coat torn off them.
  const S = lab.at(0.5, 1.62, 0);
  const E = lab.at(0.8, 1.18, 0.15);
  const W = lab.at(0.78, 0.82, 0.5);
  const brute: Group[] = [];
  const chest = ball(0.26, BRUTE, ...lab.at(0.18, 1.18, 0.1), { delay: 1.25 });
  vein(chest, [0, 0.26, 0], 0.262, [
    [0.5, 0.05, 0.4],
    [0.2, -0.08, -0.5],
    [0.8, 0.12, -0.3],
  ]);
  const shoulder = ball(0.31, BRUTE, S[0], S[1] - 0.31, S[2], { delay: 1.3 });
  vein(shoulder, [0, 0.31, 0], 0.312, [
    [0.4, 0.05, 0.5],
    [1.0, -0.1, -0.4],
    [0.1, 0.14, 0.2],
  ]);
  const upper = limb(kit, S, E, 0.22, 0.18, BRUTE, { delay: 1.32 });
  const bicep = ball(0.19, BRUTE, ...lab.at(0.7, 1.22, 0.14), { delay: 1.33 });
  vein(bicep, [0, 0.19, 0], 0.192, [
    [0.3, 0.02, 0.5],
    [0.9, -0.06, -0.4],
  ]);
  const fore = limb(kit, E, W, 0.17, 0.25, BRUTE, { delay: 1.36 });
  [upper, fore].forEach((part, i) => {
    const spots: [number, number, number][] = [];
    for (let k = 0; k < 8; k++) spots.push([(k * Math.PI) / 4, 0.1 + ((k * 0.37) % 1) * 0.3, k % 2 ? 0.5 : -0.5]);
    vein(part, [0, 0, 0], i ? 0.215 : 0.205, spots);
  });
  brute.push(chest, shoulder, upper, bicep, fore, ball(0.18, BRUTE, E[0], E[1] - 0.18, E[2], { delay: 1.34 }));
  // A huge open hand, fingers spread like claws.
  const palm = ball(0.22, BRUTE, W[0], W[1] - 0.26, W[2], { delay: 1.4 });
  brute.push(palm);
  [-0.15, -0.05, 0.05, 0.15].forEach((dx, k) =>
    brute.push(limb(kit, lab.at(0.78 + dx, 0.66, 0.62), lab.at(0.78 + dx * 1.6, 0.42, 0.78 + (k % 2) * 0.04), 0.06, 0.045, BRUTE, { delay: 1.42 + k * 0.02 })),
  );
  brute.push(limb(kit, lab.at(0.62, 0.72, 0.6), lab.at(0.52, 0.6, 0.78), 0.06, 0.05, BRUTE, { delay: 1.5 }));
  // Torn flaps of the coat hanging off the swollen side.
  [
    [0.62, 1.32, 0.28, 0.4],
    [0.38, 1.0, 0.3, -0.3],
  ].forEach(([x, y, z, lean], k) => brute.push(box(0.13, 0.28, 0.02, COAT, ...lab.at(x, y, z), { delay: 1.45 + k * 0.03, rotation: [0, 0.3, lean] })));

  // The face: the left half gone dark and veined, its eye lit amber.
  const RH = 0.22 * u;
  const cy = RH * 1.06;
  const fz = RH * 0.9;
  decorate(lab.headPart, new SphereGeometry(RH, 14, 10, Math.PI / 2 + 0.22, Math.PI - 0.22).scale(0.97, 1.07, 0.97), BRUTE, [[0, cy, 0]]);
  decorate(lab.headPart, new BoxGeometry(0.06, 0.045, 0.02), YELLOW, [[0.08 * u, cy + 0.03 * u, fz + 0.012]]);
  veins.push(
    decorate(lab.headPart, new BoxGeometry(0.014, 0.08, 0.01), ORANGE, [
      [0.15, cy - 0.06, 0.155, 0.5],
      [0.1, cy - 0.12, 0.18, -0.4],
      [0.18, cy + 0.08, 0.12, -0.3],
    ]),
  );

  // The vial in his right hand, still bubbling.
  const [hx, hy, hz] = lab.hands[0];
  cylinder(0.04, 0.04, 0.14, ORANGE, hx, hy - 0.02, hz + 0.02, { delay: 1.5, flat: true }, 10);
  cylinder(0.042, 0.04, 0.06, GLASS, hx, hy + 0.12, hz + 0.02, { delay: 1.52 }, 10);
  motes(6, YELLOW, 0.022, [hx - 0.04, hy + 0.18, hz - 0.02], [hx + 0.05, hy + 0.55, hz + 0.06], 1.6);

  const body = [...lab.parts, ...brute];
  const rest = body.map((part) => part.position.y);
  const dim = new Color(ORANGE);
  const hot = new Color(YELLOW);
  tick((t) => {
    // He heaves for breath; the veins throb with the serum.
    const heave = Math.sin(t * 2.6) * 0.012;
    body.forEach((part, i) => (part.position.y = rest[i] + heave));
    const pulse = (Math.sin(t * 4.2) + 1) / 2;
    veins.forEach((material) => material.color.lerpColors(dim, hot, pulse));
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}

function wrap([x, z]: [number, number], y: number): [number, number, number] {
  return [x, y, z];
}
