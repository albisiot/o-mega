import { BoxGeometry, ConeGeometry, SphereGeometry, TorusGeometry } from "three";
import { INK, MAGENTA, ORANGE, aim, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, skyline } from "@/lib/diorama-props";

/**
 * Subsong (P117): on a rooftop ledge the little translator in her yellow hooded raincoat cups her
 * hands to whisper to a colossus whose stone face rises out of the fog beyond the parapet, eyes
 * closed, believing every word; rings of infrasound roll from her mouth to its ear. Two brass
 * horns stick out of her backpack, held on with tape (TEC 1); she would not lift a pebble (FOR 0).
 */
export function subsong(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const COAT = 0xe0a81a;
  const STONE = 0x2e5a5c;
  const STONE_LIGHT = 0x3e7072;
  const BRASS = 0xc8a040;
  const FOG = 0x8fb0b4;
  const F = octagonBase(kit, 0x1c2228);
  const G = floor(kit, F, 0.06, 0x2a3036, 0x1e2428, 0.45);

  // The roof: a parapet across it, chimneys, the city low behind.
  skyline(kit, -1.85, G, 0.1, [0x22344a, 0x2a2f4a], -1.6, -0.3);
  const stack = box(0.45, 0.95, 0.45, 0x3a3038, -1.5, G, -1.0, { delay: 0.2, rotation: [0, 0.3, 0] });
  decorate(stack, new BoxGeometry(0.46, 0.04, 0.46), 0x2a2228, [[0, 0.75, 0]]);
  [-0.1, 0.12].forEach((dx, i) => cylinder(0.07, 0.08, 0.28, 0x5a4a50, -1.5 + dx, G + 0.95, -1.0 + dx * 0.3, { delay: 0.25 + i * 0.03 }, 10));
  // Her ledge.
  box(1.0, 0.55, 0.8, 0x3a3038, -0.95, G, -0.3, { delay: 0.3, rotation: [0, 0.3, 0] });
  box(1.1, 0.07, 0.9, 0x4a4048, -0.95, G + 0.55, -0.3, { delay: 0.34, rotation: [0, 0.3, 0] });

  // The colossus: a carved stone face out of the fog, eyes shut, listening.
  const GT = -0.8;
  const gat = (lx: number, ly: number, lz: number): Point => [1.1 + lx * Math.cos(GT) + lz * Math.sin(GT), G + ly, -0.85 - lx * Math.sin(GT) + lz * Math.cos(GT)];
  const gTurn: [number, number, number] = [0, GT, 0];
  const giant = [
    box(1.7, 3.4, 1.2, STONE, ...gat(0, 0, 0), { delay: 0.4, rotation: gTurn }),
    add(new SphereGeometry(0.85, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.4, 0.7), STONE, ...gat(0, 3.38, 0), { delay: 0.45, rotation: gTurn }),
    box(1.5, 0.18, 0.22, STONE_LIGHT, ...gat(0, 2.85, 0.6), { delay: 0.5, rotation: gTurn }),
    box(0.3, 0.75, 0.32, STONE_LIGHT, ...gat(0, 1.75, 0.62), { delay: 0.55, rotation: [-0.12, GT, 0] }),
    ...[-1, 1].map((s) => box(0.46, 0.13, 0.12, STONE_LIGHT, ...gat(s * 0.36, 2.52, 0.6), { delay: 0.58, rotation: [0, GT, s * 0.12] })),
    box(0.65, 0.07, 0.06, 0x14262a, ...gat(0, 1.42, 0.6), { delay: 0.6, rotation: gTurn }),
  ];
  const face = giant[0];
  decorate(face, new BoxGeometry(0.4, 0.025, 0.02), INK, [
    [-0.36, 2.5, 0.61, -0.12],
    [0.36, 2.5, 0.61, 0.12],
  ]);
  decorate(face, new TorusGeometry(0.15, 0.035, 6, 18), STONE_LIGHT, [
    [-0.68, 2.05, 0.61],
    [0.68, 2.05, 0.61],
  ]);
  decorate(face, new BoxGeometry(0.16, 0.1, 0.02), MAGENTA, [
    [-0.55, 3.1, 0.61],
    [0.45, 1.1, 0.61],
    [-0.2, 0.6, 0.61],
    [0.7, 2.9, 0.61],
  ]);
  decorate(face, new BoxGeometry(0.02, 0.5, 0.01), INK, [
    [0.25, 3.0, 0.61, 0.4],
    [-0.5, 1.0, 0.61, -0.3],
  ]);
  const rest = giant.map((part) => part.position.y);
  const fog = [
    [-0.9, 0.4, 0.5],
    [-0.3, 0.75, 0.42],
    [0.5, 0.6, 0.48],
    [0.95, -0.2, 0.4],
    [-0.95, -0.4, 0.38],
  ].map(([lx, lz, r], i) => ball(r, FOG, ...gat(lx, -0.15, lz), { delay: 0.7 + i * 0.03, noInk: true }));

  // Subsong on the ledge, hood up, whispering into her cupped hands.
  const Y = G + 0.62;
  const girl = figure(kit, {
    x: -0.95,
    z: -0.3,
    y: Y,
    facing: 1.45,
    height: 2.05,
    build: "slim",
    skin: 0xe8c0a0,
    face: { mouth: "open", brows: "raised", marks: 0xc08070 },
    headwear: { kind: "hood", color: COAT },
    top: { kind: "coat", color: COAT, accent: 0x8a6a20 },
    bottom: { kind: "trousers", color: 0x3a3a44 },
    shoes: 0x3a2a22,
    arms: [
      [-0.08, 1.72, 0.2],
      [0.08, 1.7, 0.21],
    ],
    delay: 0.9,
  });
  decorate(girl.headPart, new BoxGeometry(0.28, 0.07, 0.03), 0x1e1a20, [[0, girl.headRadius * 1.06 + 0.12, girl.headRadius * 0.86]]);
  [
    [-0.15, 0.75, 0.2],
    [0.17, 1.05, 0.2],
  ].forEach(([x, y, z], i) => box(0.12, 0.12, 0.02, 0x8a6a20, ...girl.at(x, y, z + 0.06), { delay: 1.3 + i * 0.03, rotation: [0, 1.45, 0.2], noInk: true }));
  // The backpack and its brass horns, taped on.
  box(0.38, 0.5, 0.24, 0x5a3a2a, ...girl.at(0, 1.0, -0.3), { delay: 1.3, rotation: [0, 1.45, 0] });
  [
    [girl.at(0.08, 1.45, -0.36), girl.at(0.2, 2.05, -0.75)],
    [girl.at(-0.1, 1.15, -0.4), girl.at(-0.25, 0.85, -0.85)],
  ].forEach(([from, mouth], i) => {
    limb(kit, from, mouth, 0.035, 0.035, BRASS, { delay: 1.4 + i * 0.05 });
    add(new ConeGeometry(0.15, 0.3, 14, 1, true), BRASS, ...mouth, { delay: 1.45 + i * 0.05, rotation: aim(mouth, from).rotation });
    const mid: Point = [(from[0] + mouth[0]) / 2, (from[1] + mouth[1]) / 2 - 0.05, (from[2] + mouth[2]) / 2];
    box(0.09, 0.09, 0.09, 0x8a8a90, ...mid, { delay: 1.5, rotation: aim(from, mouth).rotation });
  });

  // Infrasound: rings rolling from her mouth to the giant's ear.
  const lips = girl.at(0, 1.74, 0.3);
  const ear = gat(-0.75, 2.2, 0.35);
  const turnTo = Math.atan2(ear[0] - lips[0], ear[2] - lips[2]);
  const rings = [0, 1, 2].map((k) => add(new TorusGeometry(0.12, 0.009, 5, 28), ORANGE, ...lips, { delay: 1.6 + k * 0.1, flat: true, noInk: true, rotation: [0, turnTo, 0] }));

  tick((t) => {
    rings.forEach((ring, k) => {
      const u = (t / 2.4 + k / 3) % 1;
      ring.position.set(lips[0] + (ear[0] - lips[0]) * u * 0.85, lips[1] - 0.12 + (ear[1] - lips[1]) * u * 0.85, lips[2] + (ear[2] - lips[2]) * u * 0.85);
      // Grown about its centre, which sits 0.129 above the part's foot.
      ring.children[0].scale.set(1 + u * 4, 1 + u * 4, 1);
      ring.children[0].position.y = -0.129 * u * 4;
      ring.visible = u < 0.9;
    });
    const breath = Math.sin(t * 0.7) * 0.03;
    giant.forEach((part, i) => (part.position.y = rest[i] + breath));
    fog.forEach((puff, i) => (puff.children[0].position.x = Math.sin(t * 0.4 + i * 1.7) * 0.08));
  });

  return { width: 4.9, height: 4.6, lookY: 1.9 };
}
