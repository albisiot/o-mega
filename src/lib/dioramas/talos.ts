import { BoxGeometry, Color, ConeGeometry, CylinderGeometry, ExtrudeGeometry, Shape, SphereGeometry, TorusGeometry, type Group } from "three";
import { MAGENTA, ORANGE, YELLOW, aim, colorOf, octagonBase, zigzag, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { column, floor, rubble } from "@/lib/diorama-props";

/**
 * Talos (P091): the bronze automaton found in the dig strides out of the excavation between a
 * temple under scaffolding and two braziers of magenta fire, fist raised, a crested helmet over
 * glowing eyes, every seam of his plates burning orange and cracking the ground under his
 * step. The price: the single nail that seals his only vein, in the side of his left ankle,
 * glows and leaks a drop at a time, behind a cordon of tape nobody should cross.
 */
export function talos(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const BRONZE = 0x8a7040;
  const BRONZE_DARK = 0x6e5a32;
  const SCAFFOLD = 0xb03060;
  const F = octagonBase(kit, 0x1c1822);
  const G = floor(kit, F, 0.06, 0x2e2a34, 0x201c26, 0.5);
  const glowing: Group[] = [];

  // The temple behind, its columns and pediment still standing.
  box(1.6, 0.18, 0.6, 0x46506a, 0.75, G, -1.4, { delay: 0.1 });
  column(kit, 0.2, -1.4, G + 0.18, 0.14, 2.4, false, 0x5a6a8a);
  column(kit, 1.25, -1.4, G + 0.18, 0.18, 2.4, false, 0x5a6a8a);
  box(1.55, 0.28, 0.5, 0x5a6a8a, 0.72, G + 2.64, -1.4, { delay: 0.3 });
  const gable = new Shape();
  gable.moveTo(-0.78, 0);
  gable.lineTo(0.78, 0);
  gable.lineTo(0, 0.4);
  gable.closePath();
  add(new ExtrudeGeometry(gable, { depth: 0.45, bevelEnabled: false }).translate(0, 0, -0.225), 0x4a5a7a, 0.72, G + 2.92, -1.4, { delay: 0.34 });

  // Scaffolding on the left, planks on two levels.
  const poles: [number, number][] = [
    [-1.6, -0.95],
    [-0.7, -0.95],
    [-1.6, -1.45],
    [-0.7, -1.45],
  ];
  poles.forEach(([x, z], i) => box(0.045, 2.9, 0.045, SCAFFOLD, x, G, z, { delay: 0.2 + i * 0.02, noInk: true }));
  [0.9, 1.9, 2.8].forEach((y, k) => {
    [-0.95, -1.45].forEach((z) => box(0.95, 0.04, 0.04, SCAFFOLD, -1.15, G + y, z, { delay: 0.25 + k * 0.03, noInk: true }));
    [-1.6, -0.7].forEach((x) => box(0.04, 0.04, 0.55, SCAFFOLD, x, G + y, -1.2, { delay: 0.26 + k * 0.03, noInk: true }));
  });
  [0.94, 1.94].forEach((y, k) => box(0.92, 0.05, 0.48, 0x5e4a3a, -1.15, G + y, -1.2, { delay: 0.32 + k * 0.03 }));
  const brace = aim([-1.6, G, -0.95], [-0.7, G + 0.9, -0.95]);
  box(0.035, brace.length, 0.035, SCAFFOLD, -1.6, G, -0.95, { delay: 0.3, noInk: true, rotation: brace.rotation });

  // Two braziers of magenta fire, a fallen drum and rubble from the dig.
  const flames = [
    [-1.55, 0.6],
    [1.75, 0.15],
  ].map(([x, z], i) => {
    cylinder(0.04, 0.06, 1.0, 0x2a2430, x, G, z, { delay: 0.4 + i * 0.03 }, 8);
    cylinder(0.17, 0.08, 0.12, 0x3a3440, x, G + 1.0, z, { delay: 0.42 + i * 0.03 }, 12);
    return [
      ...[-1, 0, 1].map((k) => add(new ConeGeometry(k ? 0.08 : 0.11, k ? 0.34 : 0.5, 8), MAGENTA, x + k * 0.07, G + 1.08, z, { delay: 0.46 + i * 0.03, flat: true, rotation: [0, 0, -k * 0.3] })),
      add(new ConeGeometry(0.06, 0.26, 8), 0xffc0e0, x, G + 1.1, z + 0.06, { delay: 0.5 + i * 0.03, flat: true, noInk: true }),
    ];
  });
  rubble(kit, -0.95, 1.0, G, 0.5, 6, 0.45);
  add(new CylinderGeometry(0.2, 0.2, 0.36, 12).rotateZ(Math.PI / 2), 0x5a6a8a, -1.35, G, 1.3, { delay: 0.55, rotation: [0, 0.6, 0] });

  // Talos: bronze plates from head to foot, striding, right fist up.
  const FACE = -0.35;
  const turn: [number, number, number] = [0, FACE, 0];
  const H = 3.4;
  const u = H / 2.4;
  const giant = figure(kit, {
    x: 0.15,
    z: 0,
    y: G,
    facing: FACE,
    height: H,
    build: "broad",
    skin: BRONZE,
    hair: { style: "bald", color: BRONZE },
    face: { mouth: "none", brows: "none", eyes: 0xffc040, glow: true },
    top: { kind: "armor", color: BRONZE_DARK, accent: 0x9a7c48 },
    bottom: { kind: "trousers", color: 0x76603a },
    shoes: BRONZE_DARK,
    gloves: BRONZE,
    belt: 0x5e4a28,
    arms: ["fist", "down"],
    legs: "stride",
    delay: 0.7,
  });
  const at = giant.at;
  const [fist] = giant.hands;
  const cy = giant.headRadius * 1.06;
  decorate(giant.headPart, new BoxGeometry(0.1, 0.05, 0.02), 0xffd060, [
    [-0.115, cy + 0.0425, 0.3],
    [0.115, cy + 0.0425, 0.3],
  ]);
  ball(0.21, BRONZE, fist[0], fist[1] - 0.2, fist[2], { delay: 1.2 });

  // A crested helmet with cheek guards, open on the eyes.
  const RH = giant.headRadius;
  const headY = giant.head[1] - G;
  add(new SphereGeometry(RH * 1.12, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.42), BRONZE_DARK, ...at(0, headY + RH * 1.12 * Math.cos(Math.PI * 0.42) + 0.01, 0.0), { delay: 1.25, rotation: turn });
  const guard = new CylinderGeometry(RH * 1.12, RH * 1.16, 0.36, 16, 1, true, Math.PI / 2 + 0.5, Math.PI - 1.0);
  add(guard.clone().scale(-0.97, 1, 0.97), 0x4a3a20, ...at(0, headY - 0.27, 0), { delay: 1.26, rotation: turn, noInk: true });
  add(guard, BRONZE_DARK, ...at(0, headY - 0.27, 0), { delay: 1.26, rotation: turn });
  [-1, 1].forEach((side) => box(0.13, 0.27, 0.07, BRONZE_DARK, ...at(side * 0.2, headY - 0.3, RH * 0.74), { delay: 1.28, rotation: [0, FACE - side * 0.5, 0] }));
  box(0.06, 0.24, 0.05, BRONZE_DARK, ...at(0, headY - 0.17, RH * 0.95), { delay: 1.3, rotation: turn });
  const crest = new CylinderGeometry(0.42, 0.42, 0.07, 18, 1, false, -Math.PI / 2, Math.PI).rotateX(-Math.PI / 2).rotateY(Math.PI / 2);
  add(crest, 0x8a2a4a, ...at(0, headY + RH * 1.05, -0.03), { delay: 1.32, rotation: turn });

  // The seams: glowing rings at neck, waist, knees, elbows and wrists, cracks across the chest.
  const ringAt = (p: Point, dir: Point, r: number, delay: number) => {
    const from = at(...p);
    const to = at(p[0] + dir[0], p[1] + dir[1], p[2] + dir[2]);
    glowing.push(add(new TorusGeometry(r, 0.028, 6, 24).rotateX(Math.PI / 2), ORANGE, ...from, { delay, flat: true, noInk: true, rotation: aim(from, to).rotation }));
  };
  const RL = 0.13 * u;
  ringAt([0, 2.6, 0], [0, 1, 0], RH * 0.6, 1.4);
  ringAt([-0.241, 0.878, 0.31], [0, -0.708, 0.113], RL * 1.15, 1.42);
  ringAt([0.241, 0.834, -0.17], [0, -0.522, -0.425], RL * 1.15, 1.44);
  ringAt([-1.02, 2.664, 0.17], [0.227, 0.651, 0.085], RL * 1.1, 1.46);
  ringAt([0.793, 1.842, 0.02], [-0.028, -0.567, 0.093], RL * 1.1, 1.48);
  ringAt([-0.84, 3.18, 0.237], [0.227, 0.651, 0.085], RL * 1.0, 1.5);
  ringAt([0.77, 1.39, 0.094], [-0.028, -0.567, 0.093], RL * 1.0, 1.52);
  glowing.push(add(new TorusGeometry(0.36 * u * 1.08, 0.03, 6, 32).rotateX(Math.PI / 2).scale(1, 1, 0.76), ORANGE, ...at(0, 1.65, 0), { delay: 1.4, flat: true, noInk: true, rotation: turn }));
  glowing.push(...zigzag(kit, [[-0.05, 2.35], [0.06, 2.2], [-0.03, 2.05], [0.08, 1.9], [0, 1.74]].map(([x, y]) => at(x, y, 0.45)), 0.035, ORANGE, 1.5));
  glowing.push(...zigzag(kit, [[0.32, 2.3], [0.22, 2.15], [0.3, 2.0]].map(([x, y]) => at(x, y, 0.4)), 0.03, ORANGE, 1.55));
  // Cracks in the ground under his front foot.
  const step = at(-0.24, 0, 0.5);
  [
    [0.6, 0.3],
    [-0.5, 0.45],
    [0.1, 0.65],
  ].forEach(([dx, dz], k) => glowing.push(...zigzag(kit, [step, [step[0] + dx * 0.5 + 0.08, G + 0.006, step[2] + dz * 0.5], [step[0] + dx, G + 0.006, step[2] + dz]], 0.035, ORANGE, 1.6 + k * 0.03)));

  // The nail in his left ankle, glowing, leaking.
  const nail: Point = [0.43, 0.38, -0.54];
  glowing.push(add(new CylinderGeometry(0.065, 0.065, 0.05, 14).rotateZ(Math.PI / 2), ORANGE, ...at(nail[0], nail[1] - 0.065, nail[2]), { delay: 1.7, flat: true, rotation: turn }));
  const halo = add(new TorusGeometry(0.12, 0.016, 6, 24).rotateY(Math.PI / 2), YELLOW, ...at(nail[0] + 0.03, nail[1] - 0.12, nail[2]), { delay: 1.75, flat: true, noInk: true, rotation: turn });
  const drip = ball(0.03, ORANGE, ...at(nail[0] + 0.02, nail[1] - 0.12, nail[2]), { delay: 1.8, flat: true, noInk: true });
  add(new CylinderGeometry(0.12, 0.12, 0.006, 16).scale(1, 1, 0.6), ORANGE, ...at(nail[0] + 0.05, 0.002, nail[2] + 0.05), { delay: 1.8, flat: true, noInk: true });

  // A cordon of tape round the heel.
  const posts = [at(0.85, 0, -0.1), at(0.95, 0, -0.75), at(0.5, 0, -1.15)];
  posts.forEach((p, i) => cylinder(0.025, 0.035, 0.55, 0x23222b, ...p, { delay: 1.85 + i * 0.03 }, 8));
  posts.slice(1).forEach((q, i) => {
    const p = posts[i];
    const length = Math.hypot(q[0] - p[0], q[2] - p[2]);
    const tape = box(length, 0.07, 0.012, MAGENTA, (p[0] + q[0]) / 2, G + 0.42, (p[2] + q[2]) / 2, { delay: 1.9 + i * 0.03, noInk: true, rotation: [0, Math.atan2(-(q[2] - p[2]), q[0] - p[0]), 0] });
    decorate(tape, new BoxGeometry(0.07, 0.072, 0.014), 0xf4f0e6, Array.from({ length: Math.floor(length / 0.16) }, (_, k) => [-length / 2 + 0.08 + k * 0.16, 0.035, 0] as Point));
  });

  const hot = new Color(ORANGE);
  const white = new Color(YELLOW);
  const dripFrom = drip.position.y;
  tick((t) => {
    // The seams pulse, the nail's halo breathes, a drop falls, the fires flicker.
    const k = (Math.sin(t * 2) + 1) / 2;
    glowing.forEach((part) => colorOf(part).lerpColors(hot, white, k * 0.7));
    halo.children[0].scale.setScalar(1 + k * 0.25);
    drip.position.y = dripFrom - ((t * 0.8) % 1) * (dripFrom - G);
    flames.forEach((tongues, i) => tongues.forEach((tongue, k) => tongue.children.forEach((mesh) => (mesh.scale.y = 1 + Math.sin(t * 9 + i * 2 + k * 1.7) * 0.14))));
  });

  return { width: 4.9, height: 4.6, lookY: 1.95 };
}
