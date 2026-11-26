import { BoxGeometry, Color, ConeGeometry, CylinderGeometry, Group, SphereGeometry, Vector3 } from "three";
import { MAGENTA, ORANGE, YELLOW, cable, colorOf, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Pressa (P334): the old foundry hand in the Lete's open-cage hydraulic exoskeleton, on the
 * casting floor while a tilted crucible pours molten iron behind him. He stamps one hot plate
 * after another on the block, always the same slow lift and the same blow, sparks flying, and
 * the stamped plates rise in a perfect stack. He is so slow that a pigeon roosts on his cage.
 */
export function pressa(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const EXO = 0x2f7484;
  const EXO_DARK = 0x1f4a58;
  const CHROME = 0xb8c4cc;
  const IRON = 0x30364a;
  const SUIT = 0x3a3e4a;
  const F = octagonBase(kit, 0x1c1a22);
  const G = floor(kit, F, 0.06, 0x2c2a30, 0x1c1a20, 0.5);

  // The casting floor: a steel frame, a crucible tilted on its chains, pouring into a mould.
  [-1.6, 1.2].forEach((x) => {
    const post = box(0.16, 2.7, 0.16, 0x3a3a48, x, G, -1.35, { delay: 0.1 });
    decorate(post, new BoxGeometry(0.04, 2.6, 0.17), 0x2a2a36, [[0, 1.35, 0]]);
  });
  box(3.0, 0.16, 0.16, 0x3a3a48, -0.2, G + 2.7, -1.35, { delay: 0.15 });
  const C: Point = [0.3, G + 1.62, -1.3];
  const crucible = add(new CylinderGeometry(0.3, 0.24, 0.5, 14), 0x2a2a34, ...C, { delay: 0.2, rotation: [0, 0, -0.7] });
  decorate(crucible, new CylinderGeometry(0.27, 0.27, 0.02, 14), ORANGE, [[0, 0.49, 0]]);
  [-0.12, 0.12].forEach((dz) => box(0.025, 0.7, 0.025, 0x1a1a22, C[0] + 0.25, G + 2.0, C[2] + dz, { delay: 0.25, noInk: true }));
  const stream = cylinder(0.04, 0.05, 1.52, ORANGE, C[0] + 0.55, G + 0.3, C[2], { delay: 0.35, flat: true, noInk: true }, 8);
  const mould = box(0.62, 0.3, 0.46, IRON, C[0] + 0.55, G, C[2] + 0.05, { delay: 0.3 });
  decorate(mould, new BoxGeometry(0.5, 0.01, 0.36), YELLOW, [[0, 0.301, 0]]);
  motes(10, YELLOW, 0.025, [C[0] + 0.3, G + 0.3, C[2] - 0.15], [C[0] + 0.8, G + 1.0, C[2] + 0.25], 0.6);

  // His day's work: a stack of identical stamped plates.
  for (let k = 0; k < 13; k++) {
    const plate = box(0.46, 0.035, 0.46, 0x5a6070, -1.4, G + k * 0.04, 0.45, { delay: 0.4 + k * 0.02, rotation: [0, 0.3 + (k % 2) * 0.03, 0] });
    if (k === 12) decorate(plate, new CylinderGeometry(0.12, 0.12, 0.01, 16), 0x3a404e, [[0, 0.036, 0]]);
  }

  // Pressa: grey stubble and a worker's overalls inside the exoskeleton.
  const H = 2.5;
  const u = H / 2.4;
  const man = figure(kit, {
    x: 0.15,
    z: -0.1,
    y: G,
    facing: 0.3,
    height: H,
    build: "broad",
    skin: 0xc8a088,
    hair: { style: "short", color: 0x9aa0a8 },
    face: { mouth: "frown", brows: "angry", beard: "stubble", beardColor: 0x9aa0a8 },
    top: { kind: "uniform", color: SUIT, accent: 0x2a2e38 },
    bottom: { kind: "trousers", color: 0x34383f },
    shoes: 0x1a1c22,
    belt: EXO_DARK,
    arms: [[-0.6, 1.66, 0.08], [0.66, 1.05, 0.26]],
    legs: "wide",
    delay: 0.7,
  });
  const m = man.at;

  // The block, and the hot plate on it.
  box(0.55, 0.8, 0.5, IRON, ...m(-0.38, 0, 0.74), { delay: 0.5, rotation: [0, 0.3, 0] });
  const hotPlate = box(0.42, 0.04, 0.4, ORANGE, ...m(-0.38, 0.8, 0.74), { delay: 0.55, rotation: [0, 0.3, 0], flat: true });

  // The cage: struts up his back to a roll bar over his head, a pump pack, struts down his legs.
  const rot: [number, number, number] = [0, 0.3, 0];
  box(0.5, 0.62, 0.26, EXO_DARK, ...m(0, 1.05, -0.36), { delay: 1.2, rotation: rot });
  [-1, 1].forEach((side) => box(0.07, 1.6, 0.07, EXO, ...m(side * 0.34, 1.0, -0.32), { delay: 1.22, rotation: rot }));
  box(0.75, 0.07, 0.07, EXO, ...m(0, 2.6, -0.32), { delay: 1.26, rotation: rot });
  [-1, 1].forEach((side) => box(0.08, 0.62, 0.04, EXO, ...m(side * 0.2, 1.12, 0.3), { delay: 1.24, rotation: [0.1, 0.3, side * 0.12] }));
  motes(6, 0xcfd8e0, 0.04, m(-0.1, 1.7, -0.45), m(0.1, 2.4, -0.4), 1.5);
  [-1, 1].forEach((side) => {
    const sx = side * 0.36 * u;
    limb(kit, m(sx + side * 0.12, 1.08 * u, 0), m(sx + side * 0.1, 0.62 * u, 0.04), 0.045, 0.045, EXO, { delay: 1.3 });
    limb(kit, m(sx + side * 0.1, 0.62 * u, 0.04), m(sx + side * 0.06, 0.14, 0.04), 0.045, 0.045, EXO, { delay: 1.32 });
    add(new CylinderGeometry(0.08, 0.08, 0.06, 14).rotateZ(Math.PI / 2), CHROME, ...m(sx + side * 0.12, 0.62 * u - 0.08, 0.04), { delay: 1.34, rotation: rot });
    box(0.32, 0.18, 0.46, EXO, ...m(sx, 0, 0.06 * u), { delay: 1.28, rotation: rot });
    add(new SphereGeometry(0.27, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), EXO, ...m(side * 0.56, 1.7, 0), { delay: 1.36, rotation: [0, 0.3, -side * 0.35] });
  });

  // His left arm: a plated forearm with its piston and a fist of steel.
  const elbowL = man.elbows[1];
  const handL = man.hands[1];
  limb(kit, elbowL, handL, 0.15, 0.14, EXO, { delay: 1.4 });
  limb(kit, [elbowL[0] + 0.12, elbowL[1] + 0.05, elbowL[2]], [handL[0] + 0.12, handL[1] + 0.1, handL[2]], 0.03, 0.03, CHROME, { delay: 1.42 });
  box(0.28, 0.26, 0.28, EXO, handL[0], handL[1] - 0.13, handL[2], { delay: 1.44, rotation: rot });
  cable(kit, [m(0.2, 1.3, -0.48), m(0.55, 1.5, -0.3), elbowL], 0.025, 0x1a1a22, 1.5);

  // His right arm, built whole so it can lift and fall from the shoulder.
  const S = m(-0.56, 1.66, 0);
  const E = m(-0.74, 1.25, 0.34);
  const W = m(-0.38, 1.0, 0.72);
  const arm: Group[] = [
    limb(kit, S, E, 0.13, 0.12, SUIT, { delay: 1.1 }),
    limb(kit, lerp(S, E, 0.2), lerp(S, E, 0.85), 0.16, 0.15, EXO, { delay: 1.12 }),
    ball(0.15, EXO_DARK, E[0], E[1] - 0.15, E[2], { delay: 1.14 }),
    limb(kit, E, W, 0.15, 0.15, EXO, { delay: 1.16 }),
    limb(kit, [E[0] - 0.12, E[1] + 0.06, E[2] - 0.04], [W[0] - 0.12, W[1] + 0.14, W[2] - 0.02], 0.03, 0.03, CHROME, { delay: 1.18 }),
    limb(kit, [E[0] - 0.12, E[1] + 0.06, E[2] - 0.04], lerp([E[0] - 0.12, E[1] + 0.06, E[2] - 0.04], [W[0] - 0.12, W[1] + 0.14, W[2] - 0.02], 0.5), 0.05, 0.05, EXO_DARK, { delay: 1.2 }),
  ];
  const fist = box(0.32, 0.28, 0.32, EXO, W[0], G + 0.84, W[2], { delay: 1.22, rotation: rot });
  decorate(fist, new BoxGeometry(0.06, 0.06, 0.04), CHROME, [-0.11, -0.04, 0.04, 0.11].map((x) => [x, 0.18, 0.17] as Point));
  arm.push(fist);
  cable(kit, [m(-0.2, 1.3, -0.48), m(-0.6, 1.55, -0.25), m(-0.62, 1.66, 0)], 0.025, 0x1a1a22, 1.5);
  const pivot = new Group();
  fist.parent?.add(pivot);
  const shoulder = new Vector3(...S);
  pivot.position.copy(shoulder);
  arm.forEach((part) => {
    part.position.sub(shoulder);
    pivot.add(part);
  });
  const axis = new Vector3(Math.cos(0.3), 0, -Math.sin(0.3));

  // A pigeon roosting on the roll bar: he is that slow.
  const P = m(0.18, 2.635, -0.32);
  const bird = add(new SphereGeometry(0.09, 12, 10).scale(1.45, 0.9, 0.95), 0x8a8f9a, ...P, { delay: 1.7, rotation: rot });
  decorate(bird, new BoxGeometry(0.1, 0.04, 0.2), 0x6a6f7a, [[0.05, 0.1, 0]]);
  const neck = m(0.08, 2.72, -0.32);
  const head = ball(0.055, 0x8a8f9a, neck[0], neck[1], neck[2], { delay: 1.75 });
  decorate(head, new BoxGeometry(0.08, 0.025, 0.1), MAGENTA, [[0.0, 0.0, 0]]);
  decorate(head, new ConeGeometry(0.015, 0.05, 6).rotateZ(Math.PI / 2), 0xd8c25a, [[-0.065, 0.06, 0]]);
  decorate(head, new BoxGeometry(0.014, 0.014, 0.1), 0x14121c, [[-0.03, 0.075, 0]]);
  head.rotation.y = 0.3;

  // Sparks off the plate at every blow.
  const hit = m(-0.38, 0.86, 0.74);
  const sparks = Array.from({ length: 12 }, (_, k) => {
    const a = (k / 12) * Math.PI * 2;
    const v = new Vector3(Math.cos(a) * (0.8 + (k % 3) * 0.3), 1.2 + (k % 4) * 0.35, Math.sin(a) * (0.8 + (k % 2) * 0.4));
    return { part: box(0.05, 0.05, 0.05, k % 2 ? YELLOW : ORANGE, ...hit, { delay: 1.8, flat: true, noInk: true }), v };
  });

  const glowing = new Color(0xfff0b0);
  const hot = new Color(ORANGE);
  const flow = stream.children[0];
  tick((t) => {
    // Lift slowly for 2.4 s, drop in 0.3 s, always the same.
    const u2 = (t / 2.7) % 1;
    const lift = u2 < 0.89 ? Math.sin((u2 / 0.89) * (Math.PI / 2)) : 1 - (u2 - 0.89) / 0.11;
    pivot.quaternion.setFromAxisAngle(axis, -0.95 * lift);
    const since = (u2 + 0.0001) * 2.7;
    sparks.forEach(({ part, v }) => {
      part.visible = since < 0.5;
      part.position.set(hit[0] + v.x * since, hit[1] + v.y * since - 4 * since * since, hit[2] + v.z * since);
    });
    colorOf(hotPlate).lerpColors(glowing, hot, Math.min(1, since));
    flow.position.x = Math.sin(t * 9) * 0.006;
    head.position.y = neck[1] + Math.abs(Math.sin(t * 3)) * 0.025;
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}

function lerp(a: Point, b: Point, k: number): Point {
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}
