import { BoxGeometry, CircleGeometry, Color, ConeGeometry, CylinderGeometry, SphereGeometry, TorusGeometry, type Group } from "three";
import { CYAN, MAGENTA, YELLOW, aim, colorOf, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { column, floor } from "@/lib/diorama-props";

/**
 * Palladium (P141): in the Hall of the Palladium the old guardian hangs from two golden rods,
 * bronze cuirass over a long dark robe, arms spread, the great ring of the city's shield glowing
 * behind him; below, on a plinth, a little Nuova Megara sits safe under a dome of light fed from
 * his palms. Beside him an empty harness waits for the next of his family, and on the floor a
 * candle burns by his daughter's portrait. The price: he never moves, his boots dangle in the air.
 */
export function palladium(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const GOLD = 0xc9a040;
  const BRONZE = 0xb08d3c;
  const F = octagonBase(kit, 0x161a28);
  const G = floor(kit, F, 0.06, 0x2c3448, 0x1e2434, 0.6);

  // The shield: a great ring of light behind, a dark disc with fainter rings inside.
  const RY = G + 2.35;
  add(new CircleGeometry(1.22, 40), 0x18284a, 0, RY - 1.22, -1.38, { delay: 0.1, flat: true, noInk: true });
  const shield = add(new TorusGeometry(1.25, 0.05, 8, 48), CYAN, 0, RY - 1.3, -1.35, { delay: 0.15, flat: true, noInk: true });
  [0.85, 0.45].forEach((r, i) => add(new TorusGeometry(r, 0.015, 4, 40), 0x2f7fa8, 0, RY - r - 0.015, -1.36, { delay: 0.2 + i * 0.04, flat: true, noInk: true }));
  [0, 1, 2].forEach((k) => add(new BoxGeometry(0.015, 2.4, 0.01).rotateZ((k * Math.PI) / 3), 0x2f7fa8, 0, RY - 1.2, -1.37, { delay: 0.22, flat: true, noInk: true }));

  // The hall: two columns and the beam he hangs from.
  [-1.75, 1.75].forEach((x, i) => column(kit, x, -0.7, G, 0.25 + i * 0.04, 3.75, false, 0x6a7a96));
  const BY = G + 3.75;
  box(3.95, 0.22, 0.4, 0x4a5670, 0, BY, -0.7, { delay: 0.35 });

  // The little city on its plinth, under a dome of light.
  const CX = 0.15;
  const CZ = 1.15;
  const plinth = cylinder(0.72, 0.78, 0.35, 0x3a4660, CX, G, CZ, { delay: 0.4 }, 20);
  decorate(plinth, new TorusGeometry(0.73, 0.02, 4, 32).rotateX(Math.PI / 2), GOLD, [[0, 0.3, 0]]);
  const PY = G + 0.35;
  [
    [-0.35, -0.1, 0.16, 0.34],
    [-0.15, 0.2, 0.14, 0.22],
    [0.05, -0.25, 0.16, 0.42],
    [0.25, 0.05, 0.13, 0.28],
    [0.38, -0.2, 0.12, 0.2],
    [-0.4, 0.22, 0.12, 0.18],
  ].forEach(([dx, dz, w, h], i) => {
    const block = box(w, h, w, i % 2 ? 0x2a2f4a : 0x3a2a4a, CX + dx, PY, CZ + dz, { delay: 0.5 + i * 0.03 });
    decorate(block, new BoxGeometry(0.03, 0.03, 0.01), i % 3 ? YELLOW : CYAN, [
      [-w * 0.2, h * 0.7, w / 2 + 0.002],
      [w * 0.2, h * 0.4, w / 2 + 0.002],
    ]);
  });
  add(new ConeGeometry(0.2, 0.26, 6), 0x4a3050, CX + 0.15, PY, CZ - 0.42, { delay: 0.6 });
  [-0.07, 0.07].forEach((dx) => box(0.025, 0.12, 0.025, 0xe8e2d0, CX - 0.05 + dx, PY, CZ + 0.42, { delay: 0.62, noInk: true }));
  box(0.2, 0.03, 0.08, 0xe8e2d0, CX - 0.05, PY + 0.12, CZ + 0.42, { delay: 0.64, noInk: true });
  const dome: Group[] = [];
  [0, Math.PI / 3, (2 * Math.PI) / 3].forEach((turn, i) =>
    dome.push(add(new TorusGeometry(0.68, 0.012, 4, 32, Math.PI), CYAN, CX, PY, CZ, { delay: 0.8 + i * 0.03, flat: true, noInk: true, rotation: [0, turn, 0] })),
  );
  [0.25, 0.5].forEach((h, i) => {
    const r = Math.sqrt(0.68 * 0.68 - h * h);
    dome.push(add(new TorusGeometry(r, 0.012, 4, 32).rotateX(Math.PI / 2), CYAN, CX, PY + h, CZ, { delay: 0.9 + i * 0.03, flat: true, noInk: true }));
  });

  // Palladium, hanging: bronze cuirass and pauldrons over the long robe, arms spread.
  const D = 0.2;
  const X = 0;
  const Z = -0.5;
  const guardian = figure(kit, {
    x: X,
    z: Z,
    y: G + 0.75,
    facing: D,
    height: 2.45,
    build: "broad",
    skin: 0xd0a080,
    hair: { style: "short", color: 0xb8b8c4 },
    face: { mouth: "frown", brows: "calm", marks: 0x9a6a50 },
    top: { kind: "armor", color: 0x1f3a4a, accent: BRONZE },
    bottom: { kind: "long-skirt", color: 0x1f3a4a },
    cape: 0x1a2c40,
    shoes: 0x14121c,
    arms: ["out", "out"],
    delay: 0.9,
  });
  const at = guardian.at;
  // His boots dangle below the hem, toes down, over nothing.
  [-1, 1].forEach((side) => guardian.parts.push(box(0.2, 0.34, 0.26, 0x14121c, ...at(side * 0.18, -0.22, 0.04), { delay: 1.0, rotation: [0.25, D, 0] })));
  // The rods: from the beam to his pauldrons.
  const anchors: Point[] = [-1, 1].map((side) => at(side * 0.45, 1.9, 0));
  const tops: Point[] = anchors.map(([x]) => [x, BY, -0.7]);
  const rods = anchors.map((p, i) => limb(kit, tops[i], p, 0.025, 0.025, GOLD, { delay: 1.4 + i * 0.03 }));
  anchors.forEach((p) => ball(0.06, GOLD, p[0], p[1] - 0.06, p[2], { delay: 1.45 }));

  // Beams of light from his palms down to the dome.
  const [right, left] = guardian.hands;
  const domeTop: Point = [CX, PY + 0.68, CZ];
  const beams = [right, left].map((hand, i) => limb(kit, [hand[0], hand[1] - 0.05, hand[2]], [domeTop[0] + (i ? 0.2 : -0.2), domeTop[1], domeTop[2]], 0.012, 0.025, CYAN, { delay: 1.8, flat: true, noInk: true }));
  motes(10, CYAN, 0.03, [CX - 0.6, PY, CZ - 0.5], [CX + 0.6, PY + 1.2, CZ + 0.5], 1.6);

  // The empty harness for the next of the family, hanging behind his right hand.
  const EX = -1.2;
  const EZ = -1.05;
  const harness = [
    add(new TorusGeometry(0.2, 0.04, 6, 20).rotateX(Math.PI / 2).scale(1, 1, 0.8), BRONZE, EX, G + 2.02, EZ, { delay: 1.2 }),
    box(0.42, 0.5, 0.06, BRONZE, EX, G + 1.52, EZ + 0.14, { delay: 1.22, rotation: [0.1, 0.2, 0] }),
    ...[-1, 1].map((side) => add(new SphereGeometry(0.13, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), BRONZE, EX + side * 0.3, G + 1.98, EZ, { delay: 1.25 })),
  ];
  const harnessRods = [-1, 1].map((side) => limb(kit, [EX + side * 0.3, BY, -0.7], [EX + side * 0.3, G + 2.1, EZ], 0.02, 0.02, GOLD, { delay: 1.3 }));

  // His daughter's portrait on the floor, a candle and a flower beside it.
  const frame = box(0.34, 0.44, 0.05, 0x5e4a3a, -1.25, G + 0.02, 1.0, { delay: 0.5, rotation: [-0.25, 0.5, 0] });
  decorate(frame, new BoxGeometry(0.26, 0.34, 0.01), 0x2a3a5a, [[0, 0.22, 0.026]]);
  decorate(frame, new CylinderGeometry(0.06, 0.06, 0.01, 12).rotateX(Math.PI / 2), 0xd8b098, [[0, 0.27, 0.032]]);
  decorate(frame, new BoxGeometry(0.16, 0.1, 0.01), MAGENTA, [[0, 0.13, 0.032]]);
  cylinder(0.035, 0.035, 0.14, 0xe8e2d0, -0.85, G, 1.25, { delay: 0.55 }, 8);
  const flame = ball(0.03, YELLOW, -0.85, G + 0.15, 1.25, { delay: 0.58, flat: true, noInk: true });
  limb(kit, [-1.0, G, 1.35], [-1.05, G + 0.3, 1.3], 0.01, 0.01, 0x2f8f4f, { delay: 0.6, noInk: true });
  ball(0.05, MAGENTA, -1.05, G + 0.27, 1.3, { delay: 0.62 });

  const rest = guardian.parts.map((part) => part.position.x);
  const restHarness = harness.map((part) => part.position.x);
  const dim = new Color(0x1f6f98);
  const bright = new Color(CYAN);
  tick((t) => {
    // He sways a hair on his rods, the empty harness swings, the shield and dome pulse.
    const sway = Math.sin(t * 0.7) * 0.025;
    guardian.parts.forEach((part, i) => (part.position.x = rest[i] + sway));
    rods.forEach((rod, i) => rod.rotation.set(...aim(tops[i], [anchors[i][0] + sway, anchors[i][1], anchors[i][2]]).rotation));
    const swing = Math.sin(t * 0.9 + 1) * 0.05;
    harness.forEach((part, i) => (part.position.x = restHarness[i] + swing));
    harnessRods.forEach((rod, i) => rod.rotation.set(...aim([EX + (i ? 0.3 : -0.3), BY, -0.7], [EX + (i ? 0.3 : -0.3) + swing, G + 2.1, EZ]).rotation));
    const k = 0.5 + 0.5 * Math.cos(t * 1.6);
    colorOf(shield).lerpColors(dim, bright, 0.5 + 0.5 * k);
    dome.forEach((ring) => colorOf(ring).lerpColors(dim, bright, 0.4 + 0.6 * k));
    beams.forEach((beam) => (beam.visible = Math.floor(t * 8) % 13 !== 6));
    flame.children[0].scale.y = 1 + Math.sin(t * 11) * 0.3;
  });

  return { width: 4.9, height: 4.6, lookY: 1.85 };
}
