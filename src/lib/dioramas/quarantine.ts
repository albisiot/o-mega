import { BoxGeometry, Color, CylinderGeometry, type Group, type Mesh, type MeshToonMaterial, SphereGeometry, TorusGeometry } from "three";
import { YELLOW, archMouth, archedWall, cable, colorOf, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Quarantine (P182): in the Custodi's vaulted quarantine bay, open on the gulf at dusk, the
 * stranger sits barefoot in a glass sphere hung on four cables, hugging his knees in his rough
 * robe, a bolted collar round his neck. His world's biology spreads round him: glowing bell
 * plants pulse and sway, spores drift up, and the chalk ward circle drawn round the sphere, his
 * price, lies dead and broken, its magic no match for him.
 */
export function quarantine(kit: Kit): Framing {
  const { add, cylinder, ball, decorate, tick, motes } = kit;
  const STEEL = 0x5a6070;
  const WALL = 0x343448;
  const BLOOM = 0x6ff0c4;
  const BLOOM_LIGHT = 0xc8fff0;
  const LEAF = 0x1e5548;
  const CHALK = 0x8a8e98;
  const F = octagonBase(kit, 0x1a1c24);
  const G = floor(kit, F, 0.06, 0x2e323c, 0x20232b, 0.45);

  // The back wall of the bay, an arch open on the gulf: the sea and the lights of the old town.
  const AX = 0.75;
  const view = add(archMouth(0.45, 1.25), 0x2a4a6a, AX, G, -1.72, { delay: 0.08, flat: true, noInk: true });
  decorate(view, new BoxGeometry(0.9, 0.5, 0.01), 0x0e2a3c, [[0, 0.25, 0.022]]);
  decorate(view, new BoxGeometry(0.05, 0.05, 0.01), YELLOW, [
    [-0.3, 0.58, 0.024],
    [-0.14, 0.66, 0.024],
    [0.04, 0.6, 0.024],
    [0.22, 0.7, 0.024],
    [0.32, 0.56, 0.024],
  ]);
  const wall = add(archedWall(3.1, 3.3, 0.3, { x: AX, half: 0.45, spring: 1.25 }), WALL, 0, G, -1.55, { delay: 0.1, ink: 1.02 });
  decorate(
    wall,
    new BoxGeometry(0.07, 0.15, 0.01),
    0x45455e,
    Array.from({ length: 9 }, (_, k) => (k / 8) * Math.PI).map((a) => [AX + Math.cos(a) * 0.53, 1.25 + Math.sin(a) * 0.53, 0.152, a - Math.PI / 2] as [number, number, number, number]),
  );
  // Ring bolts high on the wall, for the upper cables.
  const bolts: Point[] = [
    [-1.2, G + 2.85, -1.36],
    [1.25, G + 2.85, -1.36],
  ];
  bolts.forEach((p, i) => add(new TorusGeometry(0.08, 0.025, 6, 14), STEEL, p[0], p[1] - 0.1, p[2], { delay: 0.2 + i * 0.03 }));

  // The sphere: glass on a steel collar, hanging, its clamps lit.
  const C: Point = [-0.15, G + 1.62, 0.15];
  const R = 1.1;
  const glass = ball(R, 0xa8f0dc, C[0], C[1] - R, C[2], { delay: 0.5, noInk: true });
  glass.children[0].renderOrder = 2;
  const glassMaterial = (glass.children[0] as Mesh).material as MeshToonMaterial;
  glassMaterial.transparent = true;
  glassMaterial.opacity = 0.2;
  glassMaterial.depthWrite = false;
  // A highlight just inside the glass's edge as seen at rest, and a steel hoop low round it.
  const shine = new TorusGeometry(R * 0.93, 0.022, 4, 16, 0.8).rotateZ(1.95).translate(0, 0, R * 0.37);
  add(shine, 0xf4fffb, C[0], C[1] + R * 0.93 * Math.sin(2.75) - 0.022, C[2], { delay: 0.6, flat: true, noInk: true, rotation: [0, 0.35, 0] });
  const hoopY = -0.62;
  const hoopR = Math.sqrt(R * R - hoopY * hoopY) + 0.02;
  add(new TorusGeometry(hoopR, 0.035, 6, 36).rotateX(Math.PI / 2), STEEL, C[0], C[1] + hoopY - 0.035, C[2], { delay: 0.55 });
  cylinder(0.3, 0.16, 0.12, STEEL, C[0], C[1] - R - 0.04, C[2], { delay: 0.56 }, 12);
  cylinder(0.56, 0.5, 0.05, 0x3a3f4c, C[0], C[1] - R + 0.13, C[2], { delay: 0.58 }, 18);
  // Four clamps and their cables: two up to the wall, two down to the floor.
  const dirs: Point[] = [
    [-0.72, 0.6, -0.35],
    [0.72, 0.6, -0.35],
    [-0.75, -0.5, 0.45],
    [0.62, -0.5, 0.6],
  ];
  const anchors: Point[] = [bolts[0], bolts[1], [-1.65, G, 1.2], [1.25, G, 1.5]];
  const lights: Group[] = [];
  dirs.forEach((d, i) => {
    const n = Math.hypot(...d);
    const on: Point = [C[0] + (d[0] / n) * R, C[1] + (d[1] / n) * R, C[2] + (d[2] / n) * R];
    const out: Point = [C[0] + (d[0] / n) * (R + 0.18), C[1] + (d[1] / n) * (R + 0.18), C[2] + (d[2] / n) * (R + 0.18)];
    limb(kit, on, out, 0.08, 0.07, STEEL, { delay: 0.62 + i * 0.03 });
    lights.push(ball(0.035, YELLOW, out[0], out[1] - 0.035, out[2], { delay: 0.7 + i * 0.03, flat: true, noInk: true }));
    cable(kit, [out, anchors[i]], 0.025, 0x2a2c34, 0.75 + i * 0.04);
    if (i > 1) cylinder(0.09, 0.11, 0.08, STEEL, anchors[i][0], G, anchors[i][2], { delay: 0.7 }, 10);
  });

  // The chalk ward round the sphere, broken and dead: magic does nothing to him.
  const ward = (from: number, arc: number, delay: number) =>
    add(new TorusGeometry(1.35, 0.018, 4, 30, arc).rotateX(Math.PI / 2).rotateY(-from), CHALK, C[0], G + 0.002, C[2], { delay, flat: true, noInk: true });
  ward(0.3, 1.9, 0.3);
  ward(2.6, 1.6, 0.32);
  ward(4.6, 1.2, 0.34);
  const sigil = add(new BoxGeometry(0.001, 0.001, 0.001), CHALK, C[0], G + 0.004, C[2], { delay: 0.36, flat: true, noInk: true });
  decorate(
    sigil,
    new BoxGeometry(0.12, 0.004, 0.03),
    CHALK,
    [0.9, 1.7, 3.1, 3.9, 5.2].map((a) => [Math.cos(a) * 1.5, 0, Math.sin(a) * 1.5] as Point),
  );

  // His world's plants, grown through the floor: broad leaves and glowing bells on stalks.
  [
    [-1.6, 0.55, 0.4],
    [-1.25, 1.25, -0.6],
    [1.1, 1.05, 1.2],
    [-1.75, -0.35, 2.2],
  ].forEach(([x, z, turn], i) =>
    add(new SphereGeometry(0.34, 12, 8).scale(1, 0.14, 0.5), i % 2 ? LEAF : 0x2a6a58, x, G, z, { delay: 0.85 + i * 0.03, rotation: [0, turn, 0.15] }),
  );
  const bells: { bell: Group; rest: number; phase: number }[] = [];
  [
    [-1.55, 0.25, 0.95, 0.2],
    [-1.05, 1.05, 0.6, 0.16],
    [-1.4, -0.75, 1.3, 0.22],
    [1.2, 0.6, 0.75, 0.18],
    [0.55, 1.45, 0.45, 0.14],
    [1.4, -0.45, 1.15, 0.2],
  ].forEach(([x, z, h, r], i) => {
    cylinder(0.025, 0.035, h, LEAF, x, G, z, { delay: 0.9 + i * 0.04 }, 6);
    const bell = add(new SphereGeometry(r, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), BLOOM, x, G + h, z, { delay: 0.95 + i * 0.04, flat: true });
    decorate(
      bell,
      new BoxGeometry(0.012, r * 1.2, 0.012),
      BLOOM_LIGHT,
      [-0.6, 0, 0.6, 1.8, 3.4].map((a) => [Math.cos(a) * r * 0.7, -r * 0.6, Math.sin(a) * r * 0.7] as Point),
    );
    bells.push({ bell, rest: G + h, phase: i * 1.3 });
  });
  motes(14, BLOOM, 0.022, [-1.8, G + 0.3, -0.9], [1.5, G + 3, 1.4], 1.2);

  // Quarantine, hugging his knees on the sphere's floor, collar bolted round his neck.
  const man = figure(kit, {
    x: C[0],
    z: C[2] - 0.2,
    y: C[1] - R + 0.18,
    facing: 0.8,
    height: 2.2,
    skin: 0xc8906c,
    hair: { style: "curly", color: 0x231a16 },
    face: { mouth: "neutral", brows: "calm", beard: "stubble", beardColor: 0x231a16, eyes: 0x1f5a50 },
    top: { kind: "robe", color: 0xd8d0bc },
    barefoot: true,
    arms: [
      [0.14, 1.12, 0.48],
      [-0.14, 1.06, 0.5],
    ],
    legs: "sit",
    delay: 1.1,
  });
  // Knees drawn up under the robe, the arms folded over them.
  [-1, 1].forEach((side, i) => {
    const hip = man.at(side * 0.16, 0.62, 0);
    const knee = man.at(side * 0.17, 1.08, 0.34);
    const ankle = man.at(side * 0.15, 0.11, 0.5);
    limb(kit, hip, knee, 0.15, 0.13, 0xd8d0bc, { delay: 1.15 + i * 0.02 });
    ball(0.13, 0xd8d0bc, knee[0], knee[1] - 0.13, knee[2], { delay: 1.17 + i * 0.02 });
    limb(kit, knee, ankle, 0.12, 0.1, 0xd8d0bc, { delay: 1.19 + i * 0.02 });
  });
  const collar = add(new TorusGeometry(0.15, 0.05, 8, 18).rotateX(Math.PI / 2), 0x8a909c, ...man.at(0, 1.25, 0.01), { delay: 1.6, rotation: [0, 0.8, 0] });
  decorate(
    collar,
    new CylinderGeometry(0.025, 0.025, 0.03, 8).rotateX(Math.PI / 2),
    0x3a3f4c,
    [-1.2, -0.6, 0, 0.6, 1.2].map((a) => [Math.sin(a) * 0.19, 0.05, Math.cos(a) * 0.19] as Point),
  );

  const from = new Color(BLOOM);
  const to = new Color(BLOOM_LIGHT);
  tick((t) => {
    // The bells breathe and sway; the clamp lights blink one after another.
    bells.forEach(({ bell, rest, phase }) => {
      bell.position.y = rest + Math.sin(t * 1.4 + phase) * 0.03;
      bell.rotation.z = Math.sin(t * 0.9 + phase) * 0.12;
      colorOf(bell).lerpColors(from, to, (Math.sin(t * 2 + phase) + 1) / 4);
    });
    lights.forEach((light, i) => (light.visible = Math.floor(t * 1.5 - i * 0.4) % 4 !== 3));
  });

  return { width: 4.9, height: 4.4, lookY: 1.55 };
}
