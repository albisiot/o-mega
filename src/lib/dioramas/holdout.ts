import { BoxGeometry, Color, ConeGeometry, CylinderGeometry, DodecahedronGeometry, Group, SphereGeometry, TorusGeometry } from "three";
import { CYAN, INK, MAGENTA, YELLOW, aim, colorOf, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";

/** The strokes of the Omega, in a unit square: from (x1, y1) to (x2, y2), as on the stones of the Alfabeto. */
const OMEGA: [number, number, number, number][] = [
  [0, 0, 0.35, 0],
  [0.65, 0, 1, 0],
  [0.3, 0, 0.1, 0.55],
  [0.7, 0, 0.9, 0.55],
  [0.1, 0.55, 0.3, 1],
  [0.9, 0.55, 0.7, 1],
  [0.3, 1, 0.7, 1],
];

/**
 * Holdout (P057): the night-shift worker who was at the centre of the Ora Zero and is still
 * there. In the temple chamber, in the crater of the explosion that stopped halfway, he holds
 * the stone of the Omega up over his head with both hands; the flagstones are thrown up round
 * him, the debris and a column's capital hang in the air, the rings of the blast stand still,
 * and light leaks through the cracks of his body. He trembles a little, and he does not give way.
 */
export function holdout(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const FLOOR = 0x2a2632;
  const STONE = 0x4a5266;
  const STONE_LIGHT = 0x5d6680;
  const COLUMN = 0x6f86a0;
  const PIT = 0x0c0a12;
  const GLOW = 0xfff2b0;
  const SKIN = 0xd4a48a;
  const SKIN_DARK = 0xa87a64;
  const HAIR = 0xe6e2da;
  const DENIM = 0x2c4f63;
  const DENIM_DARK = 0x1f3a4a;
  const RUNE = 0x9fefff;

  const F = octagonBase(kit, FLOOR);
  const G = F;
  const glowing: Group[] = [];

  // The crater: a dark pit cracked with light, the flagstones thrown up round it.
  add(new CylinderGeometry(0.85, 0.85, 0.01, 24), PIT, 0, G, 0.1, { delay: 0.1, flat: true, noInk: true });
  for (let k = 0; k < 9; k++) {
    const angle = (k / 9) * Math.PI * 2 + 0.2;
    const length = 0.45 + (k % 3) * 0.15;
    glowing.push(
      box(length, 0.008, 0.03, GLOW, Math.cos(angle) * (0.55 + length / 2), G + 0.004, 0.1 + Math.sin(angle) * (0.55 + length / 2), {
        delay: 0.14 + k * 0.02,
        flat: true,
        noInk: true,
        rotation: [0, -angle, 0],
      }),
    );
  }
  for (let k = 0; k < 11; k++) {
    const angle = (k / 11) * Math.PI * 2;
    const radius = 1.35 + (k % 2) * 0.4;
    const x = Math.cos(angle) * radius;
    const z = 0.1 + Math.sin(angle) * radius;
    if (Math.abs(x) + Math.abs(z) > 3 || Math.abs(x) > 2.1 || Math.abs(z) > 2.1) continue;
    // Each slab tips up, its inner edge raised, as the blast left it.
    box(0.62, 0.14, 0.5, k % 2 ? STONE : STONE_LIGHT, x, G, z, {
      delay: 0.2 + k * 0.03,
      rotation: [0.32 + (k % 3) * 0.1, Math.PI / 2 - angle, 0],
    });
  }

  // The broken Ionic column behind him; its capital hangs in the air above the stump.
  const CX = 1.25;
  const CZ = -0.95;
  box(0.62, 0.14, 0.62, STONE_LIGHT, CX, G, CZ, { delay: 0.3 });
  const shaft = cylinder(0.24, 0.27, 1.55, COLUMN, CX, G + 0.14, CZ, { delay: 0.34 }, 12);
  decorate(
    shaft,
    new BoxGeometry(0.03, 1.4, 0.012),
    STONE,
    [-0.5, -0.17, 0.17, 0.5].map((angle) => [Math.sin(angle) * 0.25, 0.72, Math.cos(angle) * 0.25] as Point),
  );
  add(new ConeGeometry(0.25, 0.3, 7), COLUMN, CX, G + 1.6, CZ, { delay: 0.38, rotation: [0.25, 0, 0.3] });

  // Debris frozen mid-air, turning very slowly: stone, column drums, a bent girder of the plant.
  const debris: { part: Group; y: number; spin: number }[] = [];
  const capital = box(0.66, 0.2, 0.42, COLUMN, CX - 0.2, G + 2.35, CZ + 0.1, { delay: 0.6, rotation: [0.3, 0.4, 0.5] });
  decorate(capital, new TorusGeometry(0.09, 0.025, 6, 14), STONE_LIGHT, [
    [-0.3, 0.1, 0.12],
    [0.3, 0.1, 0.12],
  ]);
  debris.push({ part: capital, y: capital.position.y, spin: 0.05 });
  [
    [-1.4, 1.9, -0.6, 0.2],
    [-1.0, 2.8, 0.2, 0.15],
    [-1.7, 1.1, 0.5, 0.17],
    [1.6, 1.3, 0.6, 0.18],
    [0.9, 3.0, 0.1, 0.13],
    [-0.4, 3.2, -0.6, 0.12],
    [0.4, 2.0, -1.3, 0.16],
    [-0.9, 1.4, 1.1, 0.1],
    [1.3, 2.4, 1.0, 0.11],
  ].forEach(([x, y, z, size], i) => {
    const part = add(new DodecahedronGeometry(size), i % 2 ? STONE : STONE_LIGHT, x, G + y, z, { delay: 0.65 + i * 0.04, rotation: [i, i * 2, i * 0.5] });
    debris.push({ part, y: part.position.y, spin: 0.08 + (i % 3) * 0.04 });
  });
  const drum = cylinder(0.22, 0.22, 0.32, COLUMN, -1.45, G + 2.45, -0.9, { delay: 1, rotation: [1.1, 0, 0.6] }, 12);
  debris.push({ part: drum, y: drum.position.y, spin: 0.06 });
  const girder = box(1.0, 0.08, 0.12, 0x6c5a4a, 1.55, G + 1.85, -0.1, { delay: 1.05, rotation: [0.2, 0.7, -0.6] });
  debris.push({ part: girder, y: girder.position.y, spin: 0.03 });

  // The blast, stopped: rings standing in the air, rays of light from the stone.
  const rings = [
    add(new TorusGeometry(1.55, 0.025, 6, 48).rotateX(Math.PI / 2), CYAN, 0, G + 1.15, 0.1, { delay: 1.1, flat: true, noInk: true, rotation: [0.12, 0, 0.08] }),
    add(new TorusGeometry(1.05, 0.022, 6, 40).rotateX(Math.PI / 2), MAGENTA, 0, G + 2.35, 0.1, { delay: 1.15, flat: true, noInk: true, rotation: [-0.1, 0, -0.12] }),
  ];

  // Holdout: thin as a rake, barefoot, in overalls in tatters, the stone held up overhead.
  const x0 = 0;
  const z0 = 0.15;
  const D = 0.75;
  const body: Group[] = [];
  const b = (part: Group) => {
    body.push(part);
    return part;
  };
  [-1, 1].forEach((side, i) => {
    b(box(0.13, 0.07, 0.26, SKIN, x0 + side * 0.13, G, z0 + 0.05, { delay: D + i * 0.02 }));
    b(cylinder(0.06, 0.07, 0.2, SKIN, x0 + side * 0.13, G + 0.05, z0, { delay: D + 0.02 + i * 0.02 }));
    const leg = b(cylinder(0.11, 0.13, 0.82, DENIM, x0 + side * 0.13, G + 0.22, z0, { delay: D + 0.04 + i * 0.02 }));
    // The torn hems.
    decorate(
      leg,
      new ConeGeometry(0.035, 0.12, 4).rotateX(Math.PI),
      DENIM_DARK,
      [-0.9, -0.3, 0.3, 0.9, 2.2].map((angle) => [Math.sin(angle) * 0.12, -0.03, Math.cos(angle) * 0.12] as Point),
    );
  });
  b(add(new CylinderGeometry(0.27, 0.27, 0.22, 14).scale(1, 1, 0.75), DENIM, x0, G + 0.95, z0, { delay: D + 0.1 }));
  const chest = b(add(new CylinderGeometry(0.27, 0.22, 0.65, 14).scale(1, 1, 0.7), SKIN, x0, G + 1.12, z0, { delay: D + 0.14 }));
  // Ribs, and the light that runs through him.
  decorate(
    chest,
    new BoxGeometry(0.3, 0.012, 0.01),
    SKIN_DARK,
    [0.4, 0.48, 0.56].map((y) => [0, y, 0.19] as Point),
  );
  const veins = decorate(chest, new BoxGeometry(0.012, 0.22, 0.01), GLOW, [
    [-0.12, 0.25, 0.165, 0.4],
    [0.1, 0.3, 0.17, -0.5],
  ]);
  const bib = b(box(0.3, 0.42, 0.04, DENIM, x0, G + 1.05, z0 + 0.17, { delay: D + 0.18, rotation: [0.08, 0, 0] }));
  decorate(bib, new BoxGeometry(0.1, 0.08, 0.01), DENIM_DARK, [[0.06, 0.3, 0.021]]);
  [-1, 1].forEach((side) => {
    const strap = aim([x0 + side * 0.12, G + 1.45, z0 + 0.19], [x0 + side * 0.17, G + 1.76, z0 + 0.02]);
    b(box(0.05, strap.length, 0.02, DENIM_DARK, x0 + side * 0.12, G + 1.45, z0 + 0.19, { delay: D + 0.2, rotation: strap.rotation, noInk: true }));
  });

  // The arms, thin, raised; the hands round the stone.
  const stoneY = G + 2.32;
  [-1, 1].forEach((side, i) => {
    const shoulder: Point = [x0 + side * 0.26, G + 1.7, z0];
    const elbow: Point = [x0 + side * 0.44, G + 2.02, z0 + 0.06];
    const hand: Point = [x0 + side * 0.24, stoneY + 0.12, z0 + 0.05];
    b(ball(0.085, SKIN, shoulder[0], shoulder[1] - 0.085, shoulder[2], { delay: D + 0.22 }));
    b(limb(kit, shoulder, elbow, 0.065, 0.06, SKIN, { delay: D + 0.24 + i * 0.02 }));
    const forearm = b(limb(kit, elbow, hand, 0.06, 0.055, SKIN, { delay: D + 0.28 + i * 0.02 }));
    decorate(forearm, new BoxGeometry(0.01, 0.12, 0.01), GLOW, [[0, 0.12, 0.058, side * 0.5]]);
    b(ball(0.07, SKIN, hand[0], hand[1] - 0.07, hand[2], { delay: D + 0.32 }));
  });
  const stone = b(box(0.42, 0.5, 0.14, STONE_LIGHT, x0, stoneY, z0 + 0.05, { delay: D + 0.36 }));
  const runes = new Color(RUNE);
  const glyph = OMEGA.map(([x1, y1, x2, y2]) => {
    const size = 0.3;
    const length = Math.hypot((x2 - x1) * size, (y2 - y1) * size) + 0.02;
    return decorate(stone, new BoxGeometry(length, 0.028, 0.01), RUNE, [
      [((x1 + x2) / 2 - 0.5) * size, 0.1 + ((y1 + y2) / 2) * size, 0.072, Math.atan2(y2 - y1, x2 - x1)],
    ]);
  });
  // The light pouring from the stone: a core and rays all round.
  b(ball(0.12, GLOW, x0, stoneY + 0.5, z0 + 0.05, { delay: D + 0.4, flat: true, noInk: true }));
  [0, 0.8, 1.6, 2.4, 3.2, 4.0, 4.8, 5.6].forEach((angle, i) => {
    const length = 0.6 + (i % 3) * 0.25;
    box(0.04, length, 0.04, i % 2 ? GLOW : YELLOW, x0 + Math.cos(angle) * 0.18, stoneY + 0.62, z0 - 0.1 + Math.sin(angle) * 0.05, {
      delay: D + 0.45 + i * 0.03,
      flat: true,
      noInk: true,
      rotation: [0, 0, angle - Math.PI / 2],
    });
  });

  // His head: gaunt, tipped back to look at what he holds, white hair standing up.
  b(cylinder(0.065, 0.075, 0.14, SKIN, x0, G + 1.74, z0, { delay: D + 0.3 }));
  const head = b(add(new SphereGeometry(0.2, 16, 12).scale(0.88, 1.12, 0.95), SKIN, x0, G + 1.82, z0 + 0.02, { delay: D + 0.38, rotation: [-0.18, 0, 0] }));
  const cy = 0.224;
  decorate(head, new BoxGeometry(0.05, 0.024, 0.02), INK, [
    [-0.07, cy + 0.04, 0.175],
    [0.07, cy + 0.04, 0.175],
  ]);
  decorate(head, new BoxGeometry(0.035, 0.1, 0.015), SKIN_DARK, [
    [-0.11, cy - 0.05, 0.145],
    [0.11, cy - 0.05, 0.145],
  ]);
  decorate(head, new BoxGeometry(0.07, 0.014, 0.01), INK, [[0, cy - 0.11, 0.16]]);
  // White hair standing out wild all round, as if the blast were still blowing through it.
  [
    [-0.2, 0.3, -0.04, 1.1],
    [-0.13, 0.4, -0.1, 0.55],
    [-0.04, 0.44, -0.12, 0.2],
    [0.05, 0.44, -0.12, -0.2],
    [0.14, 0.4, -0.1, -0.55],
    [0.2, 0.3, -0.04, -1.1],
    [0, 0.42, 0.04, 0],
  ].forEach(([dx, dy, dz, lean], i) =>
    b(add(new ConeGeometry(0.06, 0.26, 5), HAIR, x0 + dx, G + 1.82 + dy - 0.1, z0 + dz, { delay: D + 0.42 + i * 0.02, rotation: [-0.35, 0, lean] })),
  );

  // His aura: dust of light rising round him.
  motes(16, GLOW, 0.025, [x0 - 0.6, G + 0.2, z0 - 0.4], [x0 + 0.6, G + 2.9, z0 + 0.5], 1.3);

  const rest = body.map((part) => part.position.clone());
  const glowFrom = new Color(GLOW);
  const glowTo = new Color(YELLOW);
  const runeTo = new Color(0xffffff);
  tick((t) => {
    // He trembles, a hair's breadth, and holds.
    const shake = Math.sin(t * 23) * Math.sin(t * 3.1) * 0.006;
    body.forEach((part, i) => (part.position.x = rest[i].x + shake));
    for (const { part, y, spin } of debris) {
      part.position.y = y + Math.sin(t * 0.4 + y) * 0.02;
      part.rotation.x = y + t * spin;
    }
    const k = (Math.sin(t * 1.7) + 1) / 2;
    for (const part of glowing) colorOf(part).lerpColors(glowFrom, glowTo, k * 0.6);
    veins.color.lerpColors(glowFrom, glowTo, k * 0.6);
    for (const material of glyph) material.color.lerpColors(runes, runeTo, k);
    rings.forEach((ring, i) => (ring.children[0].scale.setScalar(1 + Math.sin(t * 0.8 + i) * 0.015)));
  });

  return { width: 4.9, height: 4.6, lookY: 1.75 };
}
