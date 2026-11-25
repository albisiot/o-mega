import { BoxGeometry, ConeGeometry, CylinderGeometry, SphereGeometry } from "three";
import { MAGENTA, ORANGE, colorOf, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, potted } from "@/lib/diorama-props";

/**
 * Sanctuary (P173): under his pergola of bougainvillea the old man of the Lanterne keeps a cot
 * for a wounded anomalous creature, bandaged and asleep under a red blanket; three chalk notches
 * on the post count the three days of asylum. He stands guard with only a staff and a sprig of
 * herbs, a row of little bells on his belt; the lantern glows and the creature breathes.
 */
export function sanctuary(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const WOOD = 0x6a4e38;
  const WOOD_DARK = 0x46342a;
  const LEAF = 0x2f7a4a;
  const SCALE = 0x4f8a78;
  const BLANKET = 0xa82a3a;
  const LINEN = 0xd8d2c4;
  const BRONZE = 0xa08850;
  const F = octagonBase(kit, 0x1e2220);
  const G = floor(kit, F, 0.06, 0x4a3a34, 0x36282a, 0.42);

  // The pergola: four posts, two beams, rafters, the vine and its magenta flowers.
  const posts: [number, number][] = [
    [-1.75, -1.25],
    [0.35, -1.25],
    [-1.75, 0.35],
    [0.35, 0.35],
  ];
  const H = 2.55;
  const postParts = posts.map(([x, z], i) => box(0.14, H, 0.14, WOOD, x, G, z, { delay: 0.1 + i * 0.03 }));
  // Three chalk notches on the front post: three days.
  decorate(postParts[2], new BoxGeometry(0.022, 0.26, 0.01), 0xf4f0e6, [
    [-0.04, 1.43, 0.072],
    [0, 1.43, 0.072],
    [0.04, 1.43, 0.072],
  ]);
  [-1.25, 0.35].forEach((z, i) => box(2.45, 0.12, 0.12, WOOD, -0.7, G + H, z, { delay: 0.25 + i * 0.03 }));
  for (let k = 0; k < 7; k++) box(0.07, 0.07, 1.95, WOOD_DARK, -1.85 + k * 0.38, G + H + 0.12, -0.45, { delay: 0.3 + k * 0.02 });
  const vine: [number, number, number][] = [
    [-1.6, -1.1, 0.3],
    [-1.1, -0.7, 0.36],
    [-0.5, -1.0, 0.3],
    [0.1, -0.5, 0.34],
    [-1.4, 0.15, 0.3],
    [-0.7, 0.2, 0.34],
    [0.25, 0.2, 0.26],
    [-0.3, -0.25, 0.28],
  ];
  vine.forEach(([x, z, r], i) => ball(r, i % 2 ? LEAF : 0x3a8a54, x, G + H + 0.06, z, { delay: 0.4 + i * 0.03 }));
  const flowers: Point[] = [];
  vine.forEach(([x, z, r], i) => [0, 2.1, 4.2].forEach((a) => flowers.push([x + Math.cos(a + i) * r * 0.8, G + H + 0.06 + r * (1.2 + 0.4 * Math.sin(a + i)), z + Math.sin(a + i) * r * 0.8])));
  flowers.forEach((p, i) => ball(0.07, i % 3 ? MAGENTA : 0xd0206a, p[0], p[1], p[2], { delay: 0.6 + i * 0.01, noInk: true }));
  // Vine hanging down the front posts.
  [-1.75, 0.35].forEach((x, i) => [0.5, 1.1, 1.7].forEach((y, k) => ball(0.11, LEAF, x + (k % 2 ? 0.06 : -0.06), G + y + 0.5, 0.42, { delay: 0.5 + i * 0.05 + k * 0.03 })));
  // The Lanterne's lantern, hanging from the front beam.
  cylinder(0.012, 0.012, 0.35, 0x23222b, -0.75, G + H - 0.35, 0.35, { delay: 0.7, noInk: true }, 6);
  add(new ConeGeometry(0.12, 0.1, 6), 0x23222b, -0.75, G + H - 0.45, 0.35, { delay: 0.72 });
  const glow = box(0.14, 0.2, 0.14, ORANGE, -0.75, G + H - 0.65, 0.35, { delay: 0.75, flat: true });

  // The cot, and the creature asleep on it under the blanket.
  const cx = -0.75;
  const cz = -0.45;
  [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => box(0.06, 0.38, 0.06, WOOD_DARK, cx + sx * 0.75, G, cz + sz * 0.3, { delay: 0.8, noInk: true })));
  box(1.6, 0.1, 0.7, WOOD, cx, G + 0.38, cz, { delay: 0.82 });
  box(1.5, 0.08, 0.62, LINEN, cx, G + 0.48, cz, { delay: 0.85 });
  box(0.36, 0.1, 0.48, LINEN, cx - 0.55, G + 0.56, cz, { delay: 0.86 });
  const blanket = add(new SphereGeometry(0.5, 16, 10).scale(1.45, 0.42, 0.62), BLANKET, cx + 0.2, G + 0.5, cz, { delay: 0.9 });
  decorate(blanket, new BoxGeometry(0.04, 0.3, 0.63), 0xd8b070, [
    [-0.25, 0.32, 0],
    [0.25, 0.32, 0],
  ]);
  const head = ball(0.22, SCALE, cx - 0.52, G + 0.62, cz + 0.02, { delay: 0.95 });
  // Asleep: eyes shut, a slack mouth, a little crest of a nose.
  decorate(head, new BoxGeometry(0.07, 0.014, 0.02), 0x1e3a32, [
    [-0.07, 0.3, 0.205, 0.25],
    [0.07, 0.3, 0.205, -0.25],
  ]);
  decorate(head, new BoxGeometry(0.08, 0.016, 0.02), 0x1e3a32, [[0, 0.17, 0.205]]);
  decorate(head, new BoxGeometry(0.035, 0.06, 0.04), 0x3e7a66, [[0, 0.24, 0.215]]);
  // Spines along its crown, and a bandage round its brow.
  [-0.9, -0.45, 0, 0.45, 0.9].forEach((a, i) =>
    add(new ConeGeometry(0.035, 0.14, 5), 0x7ab8a2, cx - 0.56 + Math.cos(a) * -0.18, G + 0.8 + Math.cos(a) * 0.04, cz + 0.02 + Math.sin(a) * 0.17, { delay: 1 + i * 0.02, rotation: [Math.sin(a) * 0.9, 0, 0.7] }),
  );
  add(new CylinderGeometry(0.205, 0.205, 0.07, 16).rotateZ(0.5), LINEN, cx - 0.5, G + 0.66, cz + 0.02, { delay: 1.05 });
  // Its clawed hand on the blanket.
  ball(0.07, SCALE, cx - 0.05, G + 0.72, cz + 0.22, { delay: 1.08 });
  [-0.5, 0, 0.5].forEach((a, i) => add(new ConeGeometry(0.018, 0.09, 5).rotateX(Math.PI / 2), 0x2e5a4c, cx - 0.05 + Math.sin(a) * 0.05, G + 0.76, cz + 0.29, { delay: 1.1 + i * 0.01, rotation: [0, a, 0] }));
  // A bowl of broth on a stool by the cot, still steaming.
  cylinder(0.16, 0.14, 0.42, WOOD_DARK, cx + 0.2, G, cz + 0.75, { delay: 0.95 }, 10);
  cylinder(0.12, 0.08, 0.08, 0xb0603a, cx + 0.2, G + 0.42, cz + 0.75, { delay: 1 }, 12);
  motes(5, 0xd8d2c4, 0.022, [cx + 0.12, G + 0.55, cz + 0.68], [cx + 0.28, G + 1.1, cz + 0.82], 1.2);
  potted(kit, -1.55, 1.05, G, 0.6);

  // Sanctuary: hooded, a straw hat over the hood, staff and herbs.
  const theta = 0.3;
  const man = figure(kit, {
    x: 1.0,
    z: 0.55,
    y: G,
    facing: theta,
    height: 2.45,
    skin: 0x6a4630,
    hair: { style: "short", color: 0xe8e4dc },
    face: { mouth: "neutral", brows: "calm", beard: "full", beardColor: 0xe8e4dc },
    headwear: { kind: "hood", color: 0x5e4836 },
    top: { kind: "robe", color: 0x5e4836 },
    belt: 0x4a3020,
    shoes: 0x3a2a22,
    arms: [[-0.5, 1.15, 0.25], [0.32, 1.55, 0.42]],
    delay: 1.1,
  });
  const at = man.at;
  // The straw hat over the hood.
  const top = man.head[1] + man.headRadius * 1.25;
  cylinder(0.36, 0.36, 0.03, 0xc8b48a, man.head[0], top, man.head[2], { delay: 1.6 }, 20);
  cylinder(0.2, 0.21, 0.14, 0xc8b48a, man.head[0], top + 0.03, man.head[2], { delay: 1.62 }, 16);
  cylinder(0.212, 0.212, 0.045, 0x23222b, man.head[0], top + 0.04, man.head[2], { delay: 1.64, noInk: true }, 16);
  // The staff in his right hand, the sprig in his left.
  const [right, left] = man.hands;
  cylinder(0.035, 0.04, right[1] + 0.35 - G, WOOD, right[0], G, right[2], { delay: 1.5 }, 8);
  limb(kit, [left[0], left[1] - 0.05, left[2]], [left[0] - 0.02, left[1] + 0.4, left[2] + 0.05], 0.012, 0.012, 0x3a6a3a, { delay: 1.55, noInk: true });
  [0.15, 0.25, 0.35].forEach((dy, k) =>
    [-1, 1].forEach((side) =>
      add(new SphereGeometry(0.05, 8, 6).scale(1.6, 0.35, 0.6), LEAF, left[0] + side * 0.05, left[1] + dy, left[2] + 0.04, { delay: 1.58 + k * 0.02, rotation: [0, 0, side * 0.6] }),
    ),
  );
  // The little bells on his belt.
  const bells = [-0.24, -0.14, -0.05, 0.05, 0.14, 0.24].map((dx, i) => {
    const angle = dx * 1.4;
    return cylinder(0.03, 0.035, 0.09, BRONZE, ...at(dx * 1.15, 0.94, 0.33 - Math.abs(dx) * 0.4), { delay: 1.7 + i * 0.02, rotation: [0, theta + angle, 0] }, 8);
  });

  const glowFrom = colorOf(glow).clone();
  const glowTo = colorOf(glow).clone().offsetHSL(0.03, 0, 0.12);
  const [cloth, clothInk] = blanket.children;
  tick((t) => {
    // The creature breathes slowly; the bells sway on his belt; the lantern glows.
    const swell = Math.sin(t * 1.1) * 0.04;
    cloth.scale.set(1, 1 + swell, 1 + swell * 0.5);
    clothInk.scale.set(1.06, 1.036 * (1 + swell), 1.06 * (1 + swell * 0.5));
    bells.forEach((bell, i) => (bell.rotation.z = Math.sin(t * 3 + i * 0.8) * 0.18));
    colorOf(glow).lerpColors(glowFrom, glowTo, (Math.sin(t * 4) + 1) / 2);
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}
