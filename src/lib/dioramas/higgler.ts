import { BoxGeometry, ConeGeometry, CylinderGeometry, SphereGeometry, TorusGeometry } from "three";
import { CYAN, INK, ORANGE, limb, octagonBase, type Framing, type Kit } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { column, crate, floor, rubble } from "@/lib/diorama-props";

/**
 * Higgler (P152): the pedlar hauls his handcart up the dusty road below a temple ruin,
 * a huge roped bundle on it that slowly breathes: inside is the air of the world he came from,
 * and a little of it leaks in cyan wisps from the brass tap. On a crate an hourglass runs: he
 * sells it by the hour. No power and no fight in him, only a bruise from the last bad customer.
 */
export function higgler(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick, motes } = kit;
  const WOOD = 0x6a4e38;
  const WOOD_DARK = 0x3e3028;
  const TARP = 0x3c4a66;
  const ROPE = 0xb08d5a;
  const LEATHER = 0x6a4228;
  const BRASS = 0xc8a040;
  const F = octagonBase(kit, 0x221e26);
  const G = floor(kit, F, 0.06, 0x3b3236, 0x2c252a, 0);

  // The road: a temple ruin on the right, the volcano far off on the left, stones and dry grass.
  column(kit, 1.2, -1.45, G, 0.1, 2.3);
  column(kit, 1.85, -0.7, G, 0.14, 2.3);
  box(1.45, 0.24, 0.46, 0x8aa6bc, 1.525, G + 2.36, -1.075, { delay: 0.22, rotation: [0, Math.atan2(-0.75, 0.65), 0] });
  column(kit, 0.45, -1.85, G, 0.18, 2.0, true);
  rubble(kit, -0.4, 1.5, G, 0.3, 5, 0.45, 0x5a5048);
  [
    [-1.75, 0.3],
    [1.45, 0.9],
    [-0.9, 1.75],
    [0.9, 1.85],
  ].forEach(([x, z], i) => add(new ConeGeometry(0.07, 0.22, 5), 0x4a6a3a, x, G, z, { delay: 0.32 + i * 0.03, rotation: [0.2 * (i - 1.5), 0, 0.15] }));

  // Higgler between the shafts, leaning into the pull.
  const theta = 0.68;
  const man = figure(kit, {
    x: 0.45,
    z: 0.7,
    y: G,
    facing: theta,
    height: 2.4,
    skin: 0xc48a66,
    hair: { style: "curly", color: 0x2a1e1c },
    face: { mouth: "frown", brows: "worried", beard: "stubble", beardColor: 0x2a1e1c, marks: 0x8a3a4a },
    top: { kind: "shirt", color: 0xd8cfb8, sleeves: "short" },
    bottom: { kind: "trousers", color: 0x2f3038 },
    belt: 0x7a2a2a,
    shoes: 0x3a2c22,
    arms: [
      [-0.44, 1.0, 0.32],
      [0.44, 1.0, 0.32],
    ],
    legs: "stride",
    delay: 1.0,
  });
  const at = man.at;
  const turn: [number, number, number] = [0, theta, 0];
  // His leather harness: braces over the shoulders and a strap across the chest.
  [-1, 1].forEach((side) => limb(kit, at(side * 0.16, 1.12, 0.23), at(side * 0.18, 1.68, 0.24), 0.028, 0.028, LEATHER, { delay: 1.4 }));
  box(0.52, 0.06, 0.04, LEATHER, ...at(0, 1.4, 0.245), { delay: 1.42, rotation: turn });

  // The cart behind him: bed, wheels, axle and the shafts in his hands.
  const bed = box(1.05, 0.1, 1.1, WOOD, ...at(0, 0.6, -1.45), { delay: 0.5, rotation: turn });
  decorate(bed, new BoxGeometry(1.05, 0.006, 0.012), WOOD_DARK, [
    [0, 0.101, -0.2],
    [0, 0.101, 0.2],
  ]);
  box(1.2, 0.06, 0.06, WOOD_DARK, ...at(0, 0.42, -1.45), { delay: 0.52, rotation: turn });
  [-1, 1].forEach((side, i) => {
    const wheel = add(new TorusGeometry(0.42, 0.045, 6, 24).rotateY(Math.PI / 2), WOOD_DARK, ...at(side * 0.66, 0, -1.45), { delay: 0.55 + i * 0.04, rotation: turn });
    [0, Math.PI / 3, (2 * Math.PI) / 3].forEach((angle) => decorate(wheel, new BoxGeometry(0.025, 0.84, 0.025).rotateX(angle), WOOD, [[0, 0.465, 0]]));
    decorate(wheel, new CylinderGeometry(0.06, 0.06, 0.08, 10).rotateZ(Math.PI / 2), INK, [[0, 0.465, 0]]);
  });
  [-1, 1].forEach((side) => limb(kit, at(side * 0.44, 0.66, -0.92), at(side * 0.44, 1.02, 0.6), 0.035, 0.03, WOOD, { delay: 0.6 }));

  // The bundle, roped down: it breathes, and the tap on its side leaks the air of another world.
  const bundle = add(new SphereGeometry(0.85, 20, 14).scale(1, 1.05, 0.85), TARP, ...at(0, 0.7, -1.45), { delay: 0.7, rotation: turn });
  decorate(bundle, new BoxGeometry(0.3, 0.2, 0.01), 0x31405a, [
    [-0.35, 1.2, 0.66, 0.3],
    [0.3, 0.5, 0.68, -0.2],
  ]);
  const ropes = [
    add(new TorusGeometry(0.87, 0.03, 6, 36).rotateX(Math.PI / 2).scale(1, 1, 0.86), ROPE, ...at(0, 1.55, -1.45), { delay: 0.8, rotation: turn }),
    add(new TorusGeometry(0.7, 0.03, 6, 36).rotateX(Math.PI / 2).scale(1, 1, 0.86), ROPE, ...at(0, 2.02, -1.45), { delay: 0.82, rotation: turn }),
    add(new TorusGeometry(0.88, 0.03, 6, 36).rotateY(Math.PI / 2).scale(1, 1.03, 0.86), ROPE, ...at(0.12, 0.7, -1.45), { delay: 0.84, rotation: turn }),
  ];
  const tap = add(new CylinderGeometry(0.05, 0.05, 0.22, 10).rotateX(Math.PI / 2), BRASS, ...at(-0.6, 1.36, -1.0), { delay: 1.3, rotation: turn });
  decorate(tap, new BoxGeometry(0.14, 0.03, 0.03), BRASS, [[0, 0.07, 0.04]]);
  cylinder(0.07, 0.07, 0.18, CYAN, ...at(-0.6, 1.06, -0.9), { delay: 1.35, flat: true }, 12);
  cylinder(0.075, 0.075, 0.04, WOOD_DARK, ...at(-0.6, 1.24, -0.9), { delay: 1.38 }, 12);
  motes(9, CYAN, 0.03, at(-0.75, 1.3, -0.95), at(-0.45, 2.6, -0.75), 1.5);

  // The hourglass on a crate: he sells his air an hour at a time.
  crate(kit, -1.3, 1.25, G, 0.4, 0.42, WOOD, 0.35);
  const H = G + 0.42;
  const [hx, hz] = [-1.3, 1.25];
  cylinder(0.13, 0.13, 0.03, WOOD_DARK, hx, H, hz, { delay: 0.9 }, 12);
  cylinder(0.13, 0.13, 0.03, WOOD_DARK, hx, H + 0.39, hz, { delay: 0.92 }, 12);
  [0, 2.1, 4.2].forEach((angle) => cylinder(0.012, 0.012, 0.36, WOOD_DARK, hx + Math.sin(angle) * 0.11, H + 0.03, hz + Math.cos(angle) * 0.11, { delay: 0.94, noInk: true }, 6));
  const sandTop = add(new ConeGeometry(0.09, 0.16, 12).rotateX(Math.PI), ORANGE, hx, H + 0.21, hz, { delay: 0.96, flat: true });
  const sandLow = add(new ConeGeometry(0.09, 0.16, 12), ORANGE, hx, H + 0.03, hz, { delay: 0.98, flat: true });
  box(0.01, 0.1, 0.01, ORANGE, hx, H + 0.12, hz, { delay: 1, flat: true, noInk: true });
  add(new TorusGeometry(0.1, 0.008, 6, 16).rotateX(Math.PI / 2), 0xbfe8f0, hx, H + 0.2, hz, { delay: 1, flat: true, noInk: true });

  const rest = [bundle, ...ropes].map((part) => part.position.y);
  tick((t) => {
    // The bundle swells and settles like a chest breathing; the ropes ride on it.
    const swell = Math.sin(t * 1.2) * 0.025;
    bundle.children.forEach((mesh) => mesh.scale.set(1 + swell, 1 + swell * 1.4, 1 + swell));
    ropes.forEach((rope, i) => (rope.position.y = rest[i + 1] + swell * (i === 2 ? 0 : 1.5 + i)));
    // The sand runs down, and the hourglass starts again.
    const u = (t * 0.12 + 0.45) % 1;
    sandTop.children.forEach((mesh) => mesh.scale.setScalar(Math.max(0.05, 1 - u)));
    sandLow.children.forEach((mesh) => mesh.scale.setScalar(Math.max(0.05, u)));
  });

  return { width: 4.9, height: 4.4, lookY: 1.45 };
}
