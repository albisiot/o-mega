import { BoxGeometry, Color, ConeGeometry, CylinderGeometry, Group, SphereGeometry, TorusGeometry } from "three";
import { INK, MAGENTA, ORANGE, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { column, floor } from "@/lib/diorama-props";

/**
 * Bubalus (P129): the mechanical buffalo built to plough the Piana charges straight through a
 * fence across the furrows, head down, riveted rust-red plates, a shaggy mane, eyes and furnace
 * mouth glowing orange, steam blasting from his nostrils, broken chains swinging. Behind him
 * the plough he was meant to pull lies snapped in two, and the stop sign he never learned to
 * obey is flattened in the furrows.
 */
export function bubalus(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const RUST = 0x8a3a2a;
  const RUST_DARK = 0x5e2a22;
  const STEEL = 0x6a7080;
  const FUR = 0x3a2a24;
  const HORN = 0x2e2a36;
  const WOOD = 0x6a5240;
  const STEAM = 0xe8eef2;
  const F = octagonBase(kit, 0x22202a);
  const G = floor(kit, F, 0.06, 0x3a2e2a, 0x2a201c, 0);

  // Which way he runs, where, and how big: his parts are built in his own frame (z forward).
  const PSI = 0.6;
  const OX = -0.25;
  const OZ = -0.2;
  const K = 1.15;
  const c = Math.cos(PSI);
  const s = Math.sin(PSI);
  const w = (x: number, y: number, z: number): Point => [OX + K * (x * c + z * s), G + K * y, OZ + K * (-x * s + z * c)];

  // The furrows of the Piana, running the way he runs.
  const rows = box(0.001, 0.001, 0.001, FUR, 0, G, 0, { delay: 0.1, noInk: true, rotation: [0, PSI, 0] });
  for (let x = -1.8; x <= 1.81; x += 0.36) {
    const length = 2 * Math.sqrt(Math.max(0, 2.1 * 2.1 - x * x));
    if (length > 0.4) decorate(rows, new BoxGeometry(0.1, 0.05, length), 0x4e3c34, [[x, 0.025, 0]]);
  }
  // Ruins of a temple on the horizon.
  column(kit, 1.3, -1.5, G, 0.2, 2.3, false, 0x7c8cac);
  column(kit, 1.95, -0.85, G, 0.24, 1.3, true, 0x7c8cac);
  // The plough he should be pulling, snapped in two.
  box(0.9, 0.12, 0.12, WOOD, -1.7, G, -0.35, { delay: 0.3, rotation: [0, 1.1, 0.12] });
  box(0.5, 0.12, 0.12, WOOD, -1.45, G, 0.45, { delay: 0.32, rotation: [0, -0.5, 0] });
  add(new ConeGeometry(0.16, 0.42, 4).rotateZ(Math.PI / 2), STEEL, -1.95, G, 0.05, { delay: 0.34, rotation: [0, 2.0, 0] });
  // The stop sign he ran over, flat on the ground.
  const sign = add(new CylinderGeometry(0.3, 0.3, 0.03, 8), MAGENTA, -0.85, G, 1.35, { delay: 0.36, rotation: [0.1, Math.PI / 8, 0.05] });
  decorate(sign, new TorusGeometry(0.25, 0.02, 4, 8).rotateX(Math.PI / 2), 0xf2efe6, [[0, 0.032, 0]]);
  box(0.05, 0.05, 0.8, STEEL, -0.55, G, 0.95, { delay: 0.37, rotation: [0, 0.6, 0] });

  // The fence he is bursting through: posts either side, rails hanging, splinters flying.
  const [FX, , FZ] = w(0, 0, 1.78);
  const across = (k: number): [number, number] => [FX + c * k, FZ - s * k];
  [-1.0, -0.62, 0.62, 0.95].forEach((k) => {
    const [x, z] = across(k);
    box(0.12, 0.8, 0.12, WOOD, x, G, z, { delay: 0.4, rotation: [0, PSI, k > 0 ? -0.12 : 0.15] });
  });
  [0.3, 0.6].forEach((y, i) =>
    [-0.82, 0.8].forEach((k) => {
      const [x, z] = across(k);
      box(0.42, 0.08, 0.06, WOOD, x, G + y, z, { delay: 0.45 + i * 0.02, rotation: [0, PSI, (k > 0 ? -1 : 1) * (i ? 0.3 : 0.12)] });
    }),
  );
  const splinters = Array.from({ length: 6 }, (_, k) => ({
    part: box(0.32 - (k % 3) * 0.06, 0.06, 0.06, k % 2 ? WOOD : 0x8a6a50, FX, G + 0.4, FZ, { delay: 1.6 }),
    v: [s * 0.8 + c * (k - 2.5) * 0.3, 0.9 + (k % 3) * 0.3, c * 0.8 - s * (k - 2.5) * 0.3] as Point,
    phase: k / 6,
  }));

  // Bubalus: a riveted rusty body under a shaggy hump.
  const parts: Group[] = [];
  const keep = (part: Group) => (parts.push(part), part);
  const torso = keep(add(new SphereGeometry(0.6, 18, 12).scale(1.0, 0.85, 1.55), RUST, 0, 0.44, -0.2, { delay: 0.5 }));
  decorate(torso, new SphereGeometry(0.028, 6, 4), RUST_DARK, Array.from({ length: 14 }, (_, k) => {
    const a = -1.3 + (k % 7) * 0.43;
    return [Math.sin(a) * 0.61, 0.51 + Math.cos(a) * 0.49, k < 7 ? 0.3 : -0.5] as Point;
  }));
  decorate(torso, new BoxGeometry(0.62, 0.015, 0.02), INK, [
    [0.35, 0.6, 0.0, 1.4],
    [-0.35, 0.6, 0.0, -1.4],
  ]);
  keep(ball(0.5, FUR, 0, 0.78, 0.35, { delay: 0.55 }));
  [
    [0, 1.55, 0.3, 0, 1, -0.6],
    [0.3, 1.45, 0.25, 1, 0.7, -0.5],
    [-0.3, 1.45, 0.25, -1, 0.7, -0.5],
    [0.45, 1.15, 0.5, 1, 0, -0.1],
    [-0.45, 1.15, 0.5, -1, 0, -0.1],
    [0.15, 1.55, -0.1, 0.3, 1, -0.9],
    [-0.15, 1.55, -0.1, -0.3, 1, -0.9],
    [0.25, 1.3, 0.7, 0.6, 0.4, 0.3],
    [-0.25, 1.3, 0.7, -0.6, 0.4, 0.3],
  ].forEach(([x, y, z, ox, oy, oz], i) =>
    keep(limb(kit, [x, y - 0.1, z], [x + ox * 0.28, y - 0.1 + oy * 0.28, z + oz * 0.28], 0.13, 0.02, i % 2 ? FUR : 0x4a362c, { delay: 0.6 + i * 0.02 })),
  );

  // Legs: steel pistons in rusty sleeves, orange glowing at the joints; mid-gallop.
  const leg = (hip: Point, knee: Point, foot: Point, delay: number) => {
    keep(limb(kit, hip, knee, 0.17, 0.13, RUST, { delay }));
    keep(ball(0.12, STEEL, knee[0], knee[1] - 0.12, knee[2], { delay: delay + 0.02 }));
    keep(box(0.09, 0.06, 0.02, ORANGE, knee[0] + Math.sign(knee[0]) * 0.11, knee[1] + 0.08, knee[2] + 0.06, { delay: delay + 0.03, flat: true, noInk: true, rotation: [0, Math.sign(knee[0]) * 1.2, 0] }));
    keep(limb(kit, knee, foot, 0.09, 0.08, STEEL, { delay: delay + 0.04 }));
    keep(cylinder(0.14, 0.15, 0.12, 0x23222b, foot[0], foot[1] - 0.06, foot[2], { delay: delay + 0.06 }, 8));
  };
  leg([0.35, 0.85, 0.45], [0.38, 0.55, 0.95], [0.38, 0.28, 1.25], 0.7);
  leg([-0.35, 0.85, 0.45], [-0.38, 0.48, 0.5], [-0.38, 0.06, 0.28], 0.72);
  leg([0.35, 0.85, -0.85], [0.38, 0.48, -1.05], [0.38, 0.06, -0.75], 0.74);
  leg([-0.35, 0.85, -0.85], [-0.38, 0.55, -1.0], [-0.38, 0.18, -1.42], 0.76);
  keep(limb(kit, [0, 1.05, -1.1], [0, 1.32, -1.45], 0.05, 0.04, RUST_DARK, { delay: 0.8 }));
  keep(ball(0.08, FUR, 0, 1.24, -1.5, { delay: 0.82 }));

  // The head, low for the charge: plated skull, dark muzzle, furnace mouth, glowing eyes, horns.
  const skull = keep(add(new SphereGeometry(0.4, 16, 12).scale(1.05, 0.9, 1.15), RUST, 0, 0.59, 1.05, { delay: 0.9 }));
  decorate(skull, new BoxGeometry(0.02, 0.6, 0.02), INK, [[0, 0.36, 0.45]]);
  const eyes = decorate(skull, new BoxGeometry(0.13, 0.06, 0.03), ORANGE, [
    [-0.22, 0.46, 0.36, -0.3],
    [0.22, 0.46, 0.36, 0.3],
  ]);
  const muzzle = keep(box(0.46, 0.34, 0.32, 0x3a3440, 0, 0.6, 1.48, { delay: 0.95 }));
  decorate(muzzle, new CylinderGeometry(0.055, 0.055, 0.02, 10).rotateX(Math.PI / 2), INK, [
    [-0.12, 0.22, 0.165],
    [0.12, 0.22, 0.165],
  ]);
  const furnace = decorate(muzzle, new BoxGeometry(0.3, 0.07, 0.02), ORANGE, [[0, 0.07, 0.165]]);
  [-1, 1].forEach((side) => {
    const bones: Point[] = [
      [side * 0.32, 1.1, 1.0],
      [side * 0.72, 1.16, 0.95],
      [side * 0.94, 1.5, 1.05],
      [side * 0.8, 1.82, 1.25],
    ];
    [0.11, 0.09, 0.065, 0.012].slice(0, 3).forEach((r, k) => {
      keep(limb(kit, bones[k], bones[k + 1], r, k === 2 ? 0.012 : r * 0.8, HORN, { delay: 1.0 + k * 0.03 }));
      if (k < 2) keep(ball(r * 0.82, HORN, bones[k + 1][0], bones[k + 1][1] - r * 0.82, bones[k + 1][2], { delay: 1.02 + k * 0.03 }));
    });
  });
  [-0.12, 0.12, 0].forEach((x, i) => keep(limb(kit, [x, 1.0, 1.25], [x * 2, 1.25, 1.45], 0.08, 0.02, FUR, { delay: 1.1 + i * 0.02 })));
  // Broken chains swinging from his neck.
  const chains = [-1, 1].map((side) => {
    const swing = new Group();
    const links = [0, 1, 2, 3].map((k) =>
      add(new TorusGeometry(0.055, 0.016, 6, 12).scale(1, 1.5, 1), 0x8a90a0, 0, -0.18 * (k + 1), 0, { delay: 1.1 + k * 0.03, rotation: [0, k % 2 ? Math.PI / 2 : 0, 0] }),
    );
    links[0].parent?.add(swing);
    swing.add(...links);
    swing.position.set(side * 0.5, 1.0, 0.65);
    return swing;
  });

  const beast = new Group();
  torso.parent?.add(beast);
  beast.add(...parts, ...chains);
  beast.position.set(OX, G, OZ);
  beast.rotation.y = PSI;
  beast.scale.setScalar(K);

  // Steam from his nostrils, dust behind him.
  const puffs = [0, 1, 2, 3].map((k) => ({ part: ball(0.08, STEAM, 0, 0, 0, { delay: 1.2 }), side: k % 2 ? 1 : -1, phase: k / 4 }));
  motes(10, 0x8a6a50, 0.04, w(-0.6, 0, -1.7), w(0.6, 0.6, -1.0), 1.0);

  const glowA = new Color(ORANGE);
  const glowB = new Color(0xffc060);
  tick((t) => {
    // The gallop: he bounces; chains swing; steam blasts; the fence flies apart.
    const bounce = Math.abs(Math.sin(t * 5)) * 0.06;
    beast.position.y = G + bounce;
    chains.forEach((chain, k) => (chain.rotation.x = -0.4 + Math.sin(t * 5 + k) * 0.25));
    const k = (Math.sin(t * 5) + 1) / 2;
    eyes.color.lerpColors(glowA, glowB, k);
    furnace.color.lerpColors(glowA, glowB, 1 - k);
    for (const p of puffs) {
      const v = (t * 0.9 + p.phase) % 1;
      const from = w(p.side * 0.12, 0.8, 1.66);
      const to = w(p.side * 0.55, 0.65, 2.05);
      p.part.position.set(from[0] + (to[0] - from[0]) * v, from[1] + (to[1] - from[1]) * v + bounce, from[2] + (to[2] - from[2]) * v);
      p.part.children.forEach((mesh) => mesh.scale.setScalar(0.6 + v * 1.6));
      p.part.visible = v < 0.9;
    }
    for (const sp of splinters) {
      const v = (t * 0.6 + sp.phase) % 1;
      sp.part.position.set(FX + sp.v[0] * v, G + 0.4 + sp.v[1] * v - 1.8 * v * v, FZ + sp.v[2] * v);
      sp.part.rotation.set(v * 8, v * 5 + sp.phase * 3, v * 6);
      sp.part.visible = sp.part.position.y > G;
    }
  });

  return { width: 4.9, height: 4.3, lookY: 1.35 };
}
