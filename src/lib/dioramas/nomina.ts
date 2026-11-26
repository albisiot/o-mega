import { BackSide, BoxGeometry, Color, ConeGeometry, CylinderGeometry, ExtrudeGeometry, Shape, type Material, type Mesh, type MeshBasicMaterial } from "three";
import { MAGENTA, YELLOW, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure, shade } from "@/lib/diorama-figure";
import { flame, floor } from "@/lib/diorama-props";

/**
 * Nomina (P288): the Sovereign in her tower at night, a gothic window on the spires and the
 * moon, red candles, shelves of registers. Pale, black hair drawn back, the great pointed
 * collar, a gown of copper scales; she holds her register open and lets hot red wax drip on a
 * name. The man kneeling beside her is that name: he fades from the feet up and comes back,
 * fades again. On her gown the names of her own subjects light up row by row. She never
 * walks anywhere: her train lies pooled on the floor behind her.
 */
export function nomina(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const COPPER = 0x9a5a3a;
  const COPPER_DARK = 0x6a3a28;
  const COPPER_LIGHT = 0xb8744a;
  const WAX = 0xd81e3a;
  const STONE = 0x2a2436;
  const F = octagonBase(kit, 0x1a1822);
  const G = floor(kit, F, 0.06, 0x2a2232, 0x1c1624, 0.5);

  // The tower room: a pointed window on the spires and the moon, shelves of registers.
  const wall = box(3.6, 3.0, 0.25, STONE, 0, G, -1.5, { delay: 0.1, ink: 1.02 });
  const W = 0.75;
  const z = 0.126;
  decorate(wall, new BoxGeometry(1.0, 1.55, 0.01), 0x1e1a40, [[W, 1.45, z]]);
  decorate(wall, new CylinderGeometry(0.5, 0.5, 0.01, 24, 1, false, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2), 0x1e1a40, [[W, 2.22, z]]);
  decorate(wall, new CylinderGeometry(0.12, 0.12, 0.01, 18).rotateX(Math.PI / 2), 0xf2efe6, [[W + 0.22, 2.3, z + 0.002]]);
  decorate(wall, new CylinderGeometry(0.3, 0.3, 0.01, 16).rotateX(Math.PI / 2).scale(1.6, 0.25, 1), 0x6a2a5a, [
    [W - 0.2, 2.0, z + 0.002],
    [W + 0.2, 1.75, z + 0.002],
  ]);
  [
    [-0.32, 1.1, 0.14],
    [-0.12, 1.5, 0.18],
    [0.08, 1.25, 0.12],
    [0.28, 0.95, 0.15],
  ].forEach(([dx, h, r], k) =>
    decorate(wall, new ConeGeometry(r, h, 4).scale(1, 1, 0.05), k % 2 ? 0x3a2e6a : 0x4a3a7e, [[W + dx, 0.68 + h / 2, z + 0.004]]),
  );
  decorate(wall, new BoxGeometry(0.03, 0.04, 0.01), YELLOW, [
    [W - 0.12, 1.1, z + 0.006],
    [W + 0.08, 0.95, z + 0.006],
    [W - 0.32, 0.9, z + 0.006],
    [W + 0.28, 0.8, z + 0.006],
  ]);
  decorate(wall, new BoxGeometry(0.06, 1.6, 0.04), 0x14121c, [
    [W - 0.52, 1.45, z + 0.01],
    [W + 0.52, 1.45, z + 0.01],
    [W, 1.6, z + 0.01],
  ]);
  decorate(wall, new BoxGeometry(1.16, 0.08, 0.06), 0x3a3448, [[W, 0.64, z + 0.02]]);
  const shelf = box(0.85, 2.4, 0.32, 0x2e2028, -1.3, G, -1.15, { delay: 0.2 });
  [0.15, 0.7, 1.25, 1.8].forEach((y, row) => {
    decorate(shelf, new BoxGeometry(0.8, 0.03, 0.02), 0x1a1218, [[0, y, 0.165]]);
    [MAGENTA, 0x6a1a2a, 0x23707e, 0x8a6a3a].forEach((color, k) => {
      const h = 0.4 - ((k + row) % 3) * 0.05;
      decorate(shelf, new BoxGeometry(0.08, h, 0.02), color, [
        [-0.33 + k * 0.09, y + 0.02 + h / 2, 0.166],
        [0.03 + k * 0.09, y + 0.02 + h / 2, 0.166],
      ]);
    });
  });
  // The candle stand, three red candles.
  cylinder(0.025, 0.04, 1.35, 0x23222b, -0.95, G, 0.15, { delay: 0.3 }, 8);
  box(0.5, 0.04, 0.06, 0x23222b, -0.95, G + 1.35, 0.15, { delay: 0.33 });
  const flames = [-0.2, 0, 0.2].flatMap((dx, k) => {
    const h = 0.26 - Math.abs(dx) * 0.4;
    cylinder(0.035, 0.035, h, WAX, -0.95 + dx, G + 1.39, 0.15, { delay: 0.36 + k * 0.03 }, 10);
    return flame(kit, -0.95 + dx, 0.15, G + 1.39 + h, 0.4 + k * 0.03, 0.35);
  });

  // Nomina: pale, black hair drawn back, a gown of copper scales, the great pointed collar.
  const facing = 0.3;
  const u = 2.55 / 2.4;
  const queen = figure(kit, {
    x: -0.15,
    z: 0.1,
    y: G,
    facing,
    height: 2.55,
    build: "slim",
    skin: 0xead2c6,
    hair: { style: "bun", color: 0x1c141c },
    face: { mouth: "neutral", brows: "calm", eyes: 0x3a1a2a },
    top: { kind: "dress", color: COPPER },
    arms: [
      [-0.08, 1.62, 0.5],
      [0.28, 1.4, 0.42],
    ],
    delay: 0.8,
  });
  // The train pooled behind her.
  add(new CylinderGeometry(0.55, 0.7, 0.05, 20, 1, false, Math.PI / 2, Math.PI).scale(1, 1, 1.5), COPPER_DARK, ...queen.at(0, 0, -0.05), { delay: 0.85, rotation: [0, facing, 0] });
  // The collar: two stiff points rising behind her head.
  const wing = new Shape();
  wing.moveTo(-0.32, 0);
  wing.lineTo(-0.78, 0.5);
  wing.lineTo(-0.22, 0.3);
  wing.lineTo(0, 0.36);
  wing.lineTo(0.22, 0.3);
  wing.lineTo(0.78, 0.5);
  wing.lineTo(0.32, 0);
  wing.closePath();
  const collar = add(new ExtrudeGeometry(wing, { depth: 0.04, bevelEnabled: false }), 0x3a3a4c, ...queen.at(0, 1.7 * u, -0.12), { delay: 1.3 });
  collar.rotation.order = "YXZ";
  collar.rotation.set(-0.35, facing, 0);
  // Scales over the gown, and the rows of names that light on it.
  const ankle = 0.12 * u;
  const waist = 1.08 * u;
  const length = waist - ankle;
  const [top, bottom] = [0.25 * u * 1.05 * 1.01, 0.25 * u * 1.6 * 1.01];
  const gown = add(new CylinderGeometry(top, bottom, length, 18).scale(1, 1, 0.81), COPPER, ...queen.at(0, ankle, 0), { delay: 1.0, noInk: true, rotation: [0, facing, 0] });
  const radius = (h: number) => bottom + ((top - bottom) * h) / length;
  const spot = (a: number, h: number, out = 0.004): Point => [Math.sin(a) * radius(h), h, Math.cos(a) * radius(h) * 0.81 + out];
  const angles = [-1.05, -0.7, -0.35, 0, 0.35, 0.7, 1.05];
  angles.forEach((a, c) =>
    [0, 1].forEach((odd) => {
      const spots: Point[] = [];
      for (let r = 0; r < 10; r++) if (r % 2 === odd) spots.push(spot(a, 0.1 + r * 0.09 + (c % 2) * 0.045));
      decorate(gown, new CylinderGeometry(0.075, 0.075, 0.012, 10, 1, false, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2).rotateY(a), odd ? COPPER_LIGHT : shade(COPPER, 0.85), spots);
    }),
  );
  const names = Array.from({ length: 8 }, (_, r) =>
    decorate(
      gown,
      new BoxGeometry(0.07, 0.018, 0.006),
      COPPER_DARK,
      angles.map((a, c) => spot(a + 0.03, 0.12 + r * 0.115 + (c % 2) * 0.05, 0.014)),
    ),
  );

  // The open register, and the red wax stick dripping on a name.
  const [pen, hold] = queen.hands;
  const B: Point = [(pen[0] + hold[0]) / 2, hold[1] + 0.02, (pen[2] + hold[2]) / 2 + 0.05];
  [-1, 1].forEach((side) => {
    const page = box(0.3, 0.025, 0.4, 0xe8dcc0, B[0], B[1], B[2], { delay: 1.4, rotation: [0, facing, side * 0.2] });
    page.position.x += Math.cos(facing) * side * 0.14;
    page.position.z -= Math.sin(facing) * side * 0.14;
    decorate(page, new BoxGeometry(0.2, 0.004, 0.012), 0x5a3a3a, [-0.12, -0.06, 0, 0.06, 0.12].map((dz) => [0, 0.026, dz] as Point));
  });
  box(0.66, 0.04, 0.44, 0x4a1a22, B[0], B[1] - 0.04, B[2], { delay: 1.35, rotation: [0, facing, 0] });
  cylinder(0.025, 0.025, 0.2, WAX, pen[0], pen[1] - 0.12, pen[2] + 0.04, { delay: 1.45, rotation: [0.5, 0, 0.3] }, 8);
  const tip: Point = [pen[0] - 0.02, pen[1] - 0.14, pen[2] + 0.07];
  const drip = ball(0.022, WAX, ...tip, { delay: 1.6, flat: true, noInk: true });
  box(0.07, 0.008, 0.05, WAX, tip[0], B[1] + 0.03, tip[2], { delay: 1.6, flat: true, noInk: true });

  // The subject she has stopped writing, kneeling, fading from the feet up.
  const subject = figure(kit, {
    x: 1.2,
    z: 0.55,
    y: G,
    facing: -1.0,
    height: 2.3,
    build: "normal",
    skin: 0xd0a080,
    hair: { style: "short", color: 0x3a2a22 },
    face: { mouth: "open", brows: "worried" },
    top: { kind: "shirt", color: 0x3a5a6a },
    bottom: { kind: "trousers", color: 0x2a3040 },
    arms: ["forward", "forward"],
    legs: "kneel",
    delay: 1.1,
  });
  const fading = subject.parts.map((part) => ({
    y: part.position.y,
    meshes: part.children.flatMap((child) => {
      const material = (child as Mesh).material as Material;
      if (material.side === BackSide) return [];
      material.transparent = true;
      return [{ child, material: material as MeshBasicMaterial }];
    }),
    ink: part.children.filter((child) => ((child as Mesh).material as Material).side === BackSide),
  }));
  const unwrite = (t: number) => {
    const line = G - 0.3 + ((t * 0.22 + 0.46) % 1.15) * 2.6;
    fading.forEach(({ y, meshes, ink }) => {
      const k = Math.min(1, Math.max(0, (line - y) / 0.35));
      meshes.forEach(({ material }) => (material.opacity = 1 - k * 0.88));
      ink.forEach((outline) => (outline.visible = k < 0.05));
    });
  };
  unwrite(0);

  const glow = new Color(0xff5a6a);
  const dull = new Color(COPPER_DARK);
  tick((t) => {
    unwrite(t);
    const lit = (Math.floor(t * 1.1) + 3) % 10;
    names.forEach((material, r) => material.color.copy(r < lit ? glow : dull));
    const fall = (t * 1.2) % 1;
    drip.position.y = tip[1] - fall * (tip[1] - B[1] - 0.04);
    flames.forEach((f, i) => (f.children[0].scale.y = 1 + Math.sin(t * 8 + i * 1.7) * 0.15));
  });

  return { width: 4.9, height: 4.5, lookY: 1.55 };
}
