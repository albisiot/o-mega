import { BoxGeometry, ConeGeometry, CylinderGeometry, DodecahedronGeometry, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { ORANGE, YELLOW, aim, cable, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Favilla (P349): the firefighter who died on the night of the Ora Zero, in the ashes of a
 * burnt-out building, his black turnout coat banded in yellow, eyes glowing like coals, his left
 * fist raised. His right arm is still made of embers: glowing chunks climb from the heap where
 * he fell and fit themselves back into place, while sparks rise all round. His helmet lies on
 * the heap. Someone already emptied a fire extinguisher on him: it lies in its puddle of foam.
 */
export function favilla(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const CHAR = 0x2a201c;
  const COAT = 0x2a2e36;
  const COAL = 0x2a2024;
  const F = octagonBase(kit, 0x1e1820);
  const G = floor(kit, F, 0.06, 0x2e2a30, 0x221e24, 0.55);

  // The burnt building: a scorched wall with a window still burning, charred posts and beams.
  const back = box(1.2, 1.6, 0.14, 0x3a2a30, 0.95, G, -1.6, { delay: 0.1 });
  decorate(back, new BoxGeometry(0.42, 0.5, 0.01), 0xff5a3a, [[0, 0.95, 0.075]]);
  decorate(back, new BoxGeometry(0.3, 0.32, 0.012), YELLOW, [[0, 0.9, 0.078]]);
  const posts: [number, number, number][] = [
    [-1.5, -1.3, 2.9],
    [-0.45, -1.62, 3.2],
    [0.6, -1.62, 2.1],
    [1.55, -1.2, 2.6],
  ];
  posts.forEach(([x, z, h], i) => {
    const post = box(0.16, h, 0.16, CHAR, x, G, z, { delay: 0.14 + i * 0.04, rotation: [0, 0.2 * i, (i % 2 ? 1 : -1) * 0.04] });
    decorate(post, new BoxGeometry(0.06, 0.04, 0.17), ORANGE, [
      [0, h * 0.35, 0],
      [0.03, h * 0.7, 0],
    ]);
  });
  const beam = (from: Point, to: Point, delay: number) => {
    const { length, rotation } = aim(from, to);
    const part = box(0.13, length, 0.13, CHAR, ...from, { delay, rotation });
    decorate(part, new BoxGeometry(0.135, 0.05, 0.05), ORANGE, [
      [0, length * 0.3, 0.05],
      [0, length * 0.65, -0.04],
    ]);
  };
  beam([-1.5, G + 2.75, -1.3], [-0.45, G + 2.75, -1.62], 0.3);
  beam([-0.45, G + 2.3, -1.62], [0.6, G + 2.0, -1.62], 0.34);
  beam([0.6, G + 2.0, -1.62], [1.35, G + 0.05, -0.75], 0.38);
  /** A fire: a glowing knot and tongues of flame round a yellow core. */
  const fire = (x: number, z: number, y: number, size: number, delay: number) => {
    ball(0.13 * size, ORANGE, x, y, z, { delay, flat: true });
    return [
      [0, 0.13, 0.5, 0, ORANGE],
      [-0.1, 0.07, 0.3, 0.5, ORANGE],
      [0.1, 0.07, 0.28, -0.5, ORANGE],
      [0, 0.07, 0.32, 0, YELLOW],
    ].map(([dx, r, h, lean, color], k) => {
      const part = add(new ConeGeometry(r * size, h * size, 7), color, x + dx * size, y + 0.08 * size, z + (k === 3 ? 0.08 * size : 0), { delay: delay + k * 0.03, flat: true, noInk: k === 3, rotation: [0, 0, lean] });
      return { part, lean };
    });
  };
  const flames = [fire(-1.35, -1.05, G, 1.0, 0.5), fire(0.55, -1.2, G, 0.8, 0.55), fire(-0.98, -1.46, G + 2.8, 0.6, 0.6)];

  // The heap of embers where he fell, his helmet on it.
  const HX = -0.7;
  const HZ = 0.7;
  for (let k = 0; k < 9; k++) {
    const a = k * 2.4;
    const r = 0.12 + (k % 3) * 0.12;
    add(new DodecahedronGeometry(0.07 + (k % 3) * 0.03), k % 3 ? COAL : ORANGE, HX + Math.cos(a) * r, G - 0.02, HZ + Math.sin(a) * r * 0.8, { delay: 0.5 + k * 0.02, flat: !(k % 3), rotation: [k, k * 2, 0] });
  }
  const helmet = add(new SphereGeometry(0.2, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), COAT, HX - 0.25, G + 0.04, HZ + 0.25, { delay: 0.6, rotation: [0.3, 0.6, 0.4] });
  decorate(helmet, new TorusGeometry(0.2, 0.02, 6, 20).rotateX(Math.PI / 2), YELLOW, [[0, 0.06, 0]]);
  decorate(helmet, new BoxGeometry(0.1, 0.12, 0.02), 0xc89a3c, [[0, 0.1, 0.19]]);
  box(0.5, 0.03, 0.52, COAT, HX - 0.25, G + 0.02, HZ + 0.2, { delay: 0.58, rotation: [0.3, 0.6, 0.4] });

  // The emptied extinguisher in its puddle of foam.
  add(new CylinderGeometry(0.85, 0.85, 0.008, 12).scale(0.55, 1, 0.4), 0xdff4fa, 0.95, G, 1.15, { delay: 0.4, noInk: true, rotation: [0, 0.3, 0] });
  [
    [0.7, 1.2, 0.07],
    [0.85, 1.32, 0.05],
    [1.15, 1.25, 0.06],
    [0.62, 1.05, 0.045],
  ].forEach(([x, z, r], i) => kit.ball(r, 0xf4faff, x, G, z, { delay: 0.45 + i * 0.02 }));
  const can = add(new CylinderGeometry(0.11, 0.11, 0.5, 14).rotateZ(Math.PI / 2), 0xc8202a, 1.2, G, 0.95, { delay: 0.42, rotation: [0, 0.5, 0] });
  decorate(can, new BoxGeometry(0.12, 0.06, 0.225), 0xe8e2d0, [[0.02, 0.11, 0]]);
  cylinder(0.05, 0.05, 0.1, 0x23222b, 1.42, G + 0.1, 0.83, { delay: 0.44, rotation: [0, 0, -1.4] });
  cable(kit, [[1.45, G + 0.16, 0.82], [1.55, G + 0.04, 1.05], [1.05, G + 0.03, 1.3], [0.85, G + 0.03, 1.2]], 0.018, 0x16141a, 0.46);

  // Favilla, left fist up; his right forearm and hand are not there yet.
  const fighter = figure(kit, {
    x: 0.15,
    z: 0.3,
    y: G,
    facing: 0.3,
    height: 2.55,
    build: "broad",
    skin: 0xd09a7a,
    hair: { style: "short", color: 0x2a2020 },
    face: { mouth: "frown", brows: "angry", eyes: ORANGE, glow: true, marks: ORANGE },
    top: { kind: "coat", color: COAT, accent: 0x1e2228 },
    bottom: { kind: "trousers", color: COAT },
    shoes: 0x16141a,
    gloves: 0x1e2026,
    arms: [
      [-0.62, 1.2, 0.35],
      "fist",
    ],
    legs: "wide",
    delay: 0.8,
  });
  const u = 2.55 / 2.4;
  const parts = fighter.parts;
  [11, 12, 13].forEach((k) => (parts[k].visible = false));
  // Reflective bands on the coat, the sleeves and the trouser legs.
  const band = (radius: number, squash: number) => new CylinderGeometry(radius, radius, 0.09, 18, 1, true).scale(1, 1, squash);
  decorate(parts[8], band(0.46 * u, 0.72), YELLOW, [[0, 0.42 * u, 0]]);
  decorate(parts[7], band(0.51 * u, 0.78), YELLOW, [[0, 0.12, 0]]);
  [1, 4, 10, 15, 16].forEach((k) => decorate(parts[k], new TorusGeometry(0.16 * u, 0.035, 6, 16).rotateX(Math.PI / 2), YELLOW, [[0, 0.22, 0]]));

  // Embers climbing from the heap and fitting together into his right forearm.
  const elbow = new Vector3(...fighter.elbows[0]);
  const hand = new Vector3(...fighter.hands[0]);
  [0.08, 0.26, 0.44, 0.62, 0.8, 1.0].forEach((s, k) => {
    const p = elbow.clone().lerp(hand, s);
    const r = k === 5 ? 0.11 : 0.085 - k * 0.004;
    add(new DodecahedronGeometry(r), k % 2 ? ORANGE : COAL, p.x, p.y - r, p.z, { delay: 1.4 + k * 0.04, flat: k % 2 === 1, rotation: [k, k * 2, 0] });
  });
  // Seams of fire on the right shoulder, arm and side, where he is still coming apart.
  const seam = new BoxGeometry(0.022, 0.13, 0.022);
  decorate(parts[9], seam, ORANGE, [
    [0.12 * u, 0.2 * u, 0.12 * u, 0.5],
    [-0.05, 0.28 * u, 0.15 * u, -0.4],
  ]);
  decorate(parts[10], seam, ORANGE, [
    [0.11 * u, 0.12, 0.11 * u, 0.3],
    [-0.12 * u, 0.25, 0.1 * u, -0.5],
  ]);
  decorate(parts[8], seam, ORANGE, [
    [-0.3 * u, 0.55 * u, 0.24 * u, 0.4],
    [-0.36 * u, 0.32 * u, 0.2 * u, -0.3],
    [-0.24 * u, 0.15 * u, 0.25 * u, 0.6],
  ]);
  const climbing = Array.from({ length: 12 }, (_, k) => {
    const to = elbow.clone().lerp(hand, (k % 6) / 5).add(new Vector3(Math.sin(k * 2.7) * 0.06, Math.cos(k * 1.9) * 0.06, Math.sin(k * 1.3) * 0.06));
    const from = new Vector3(HX + Math.cos(k * 2.4) * 0.2, G + 0.05, HZ + Math.sin(k * 2.4) * 0.16);
    const part = add(new DodecahedronGeometry(0.045 + (k % 3) * 0.018), k % 2 ? COAL : ORANGE, from.x, from.y, from.z, { delay: 1.5 + k * 0.02, flat: k % 2 === 0, rotation: [k, k * 2, 0] });
    return { part, from, to, phase: k / 12 };
  });
  motes(16, ORANGE, 0.03, [-1.0, G + 0.2, -0.4], [0.2, G + 3.0, 0.9], 1.2);
  motes(10, YELLOW, 0.025, [-1.6, G + 0.5, -1.4], [1.6, G + 3.2, -0.6], 0.6);

  tick((t) => {
    climbing.forEach(({ part, from, to, phase }) => {
      const s = (t * 0.3 + phase) % 1;
      const k = Math.min(1, s / 0.8);
      const ease = k * k * (3 - 2 * k);
      part.position.set(from.x + (to.x - from.x) * ease, from.y + (to.y - from.y) * ease + Math.sin(k * Math.PI) * 0.35, from.z + (to.z - from.z) * ease);
      part.rotation.set(t * 2 + phase * 6, t * 1.5, 0);
      part.visible = s < 0.95;
    });
    flames.forEach((tongues, k) => tongues.forEach(({ part, lean }, j) => (part.rotation.z = lean + Math.sin(t * (7 + k) + j * 2) * 0.12)));
  });

  return { width: 4.9, height: 4.5, lookY: 1.65 };
}
