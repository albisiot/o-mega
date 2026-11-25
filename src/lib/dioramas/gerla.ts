import { BoxGeometry, Color, CylinderGeometry, SphereGeometry, TorusGeometry } from "three";
import { MAGENTA, archMouth, archedWall, cable, colorOf, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { column, steps, volcanoBackdrop } from "@/lib/diorama-props";

/**
 * Gerla (P281): the little bearer of the Seal climbs out of the crypts under the oracle temple,
 * a towering wicker basket on his back, the Seal of the Third Smith wrapped inside and glowing
 * through the weave. Ginger beard, mustard beanie, quilted jacket, a walking stick; in the dark
 * arch at the foot of the stairs, eyes wait for him to put it down. Its threads trail round him
 * and its marks drift at his head, then fade: he cannot read, so the Seal cannot write him.
 */
export function gerla(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const STONE = 0x4a5068;
  const WICKER = 0x8a6a40;
  const WICKER_DARK = 0x5e4628;
  const F = octagonBase(kit, 0x1c1a24);

  // The landing at street level, the crypt stairs going down behind it into the arch.
  const L = 0.6;
  const landing = box(2.6, L, 1.95, STONE, 0.05, F, 0.85, { delay: 0.06, ink: 1.01 });
  const joints: Point[] = [];
  for (let k = 1; k < 6; k++) joints.push([-1.3 + k * 0.44 + (k % 2) * 0.1, L / 2, 0.976]);
  decorate(landing, new BoxGeometry(0.02, L, 0.01), 0x363a50, joints);
  decorate(landing, new BoxGeometry(2.6, 0.02, 0.01), 0x363a50, [[0, L / 2, 0.976]]);
  decorate(landing, new BoxGeometry(2.6, 0.01, 1.95), 0x3a3f56, [[0, L + 0.002, 0]]);
  steps(kit, 0.05, -1.85, F, 0.1, { width: 1.7, count: 4, tread: 0.43, rise: L / 4, facing: Math.PI, color: STONE });
  const G = F + L;
  const crypt = add(archedWall(2.1, 1.55, 0.3, { x: 0, half: 0.48, spring: 0.62 }), 0x3a3550, 0.05, F, -2.0, { delay: 0.14 });
  decorate(crypt, new BoxGeometry(0.4, 0.04, 0.01), 0x2e2a42, [
    [-0.8, 0.4, 0.16],
    [0.8, 0.8, 0.16],
    [-0.75, 1.2, 0.16],
    [0.85, 1.35, 0.16],
  ]);
  add(archMouth(0.48, 0.62), 0x08060c, 0.05, F, -2.17, { delay: 0.16, flat: true, noInk: true });
  const eyes = [
    [-0.18, 0.55],
    [0.22, 0.7],
    [0.02, 0.32],
  ].map(([x, y], i) => {
    const pair = box(0.13, 0.035, 0.01, 0x08060c, 0.05 + x, F + y, -2.15, { delay: 0.5 + i * 0.05, noInk: true });
    decorate(pair, new BoxGeometry(0.035, 0.03, 0.01), MAGENTA, [
      [-0.045, 0.018, 0.008],
      [0.045, 0.018, 0.008],
    ]);
    return pair;
  });
  column(kit, -1.55, 0.35, G, 0.2, 2.6, false, 0x5a6488);
  column(kit, 1.5, 0.15, G, 0.24, 1.3, true, 0x5a6488);
  volcanoBackdrop(kit, 1.5, -1.35, F, 0.3, 1.05);
  motes(8, 0xff8a00, 0.03, [1.42, F + 1.0, -1.4], [1.62, F + 1.9, -1.3], 0.8);

  // Gerla: small, broad, ginger, climbing with his stick.
  const facing = 0.3;
  const H = 2.0;
  const bearer = figure(kit, {
    x: -0.05,
    z: 0.7,
    y: G,
    facing,
    height: H,
    build: "broad",
    skin: 0xe0a080,
    hair: { style: "short", color: 0xc8602a },
    face: { mouth: "frown", brows: "worried", beard: "full", beardColor: 0xc8602a },
    headwear: { kind: "beanie", color: 0xc8962a, accent: 0xa87a22 },
    top: { kind: "jacket", color: 0x7a4a30, accent: 0x5e3a26 },
    bottom: { kind: "trousers", color: 0x3a4a5a },
    shoes: 0x4a3024,
    scarf: 0x5a7088,
    arms: [
      [-0.42, 0.95, 0.42],
      [0.2, 1.38, 0.25],
    ],
    legs: "stride",
    delay: 0.8,
  });
  const o = (delay: number) => ({ delay, rotation: [0, facing, 0] as [number, number, number] });
  // The stick, planted on the step ahead.
  const [right] = bearer.hands;
  limb(kit, [right[0] + 0.05, G, right[2] + 0.12], [right[0] - 0.02, right[1] + 0.3, right[2] - 0.03], 0.03, 0.035, 0x6a5240, { delay: 1.3 });
  // The straps over his shoulders.
  [-1, 1].forEach((side) => {
    limb(kit, bearer.at(side * 0.2, 1.0, 0.24), bearer.at(side * 0.22, 1.5, 0.12), 0.035, 0.035, 0x3a2a22, { delay: 1.32 });
    limb(kit, bearer.at(side * 0.22, 1.5, 0.12), bearer.at(side * 0.22, 1.55, -0.3), 0.035, 0.035, 0x3a2a22, { delay: 1.33 });
  });

  // The basket: a tall cone of wicker, bound, with the Seal's bundle heaped inside.
  const base = bearer.at(0, 0.95, -0.5);
  const basket = add(new CylinderGeometry(0.46, 0.3, 1.3, 16).scale(1, 1, 0.8), WICKER, ...base, { ...o(1.35), rotation: [0.12, facing, 0] });
  decorate(basket, new TorusGeometry(0.4, 0.022, 6, 20).rotateX(Math.PI / 2).scale(1, 1, 0.8), WICKER_DARK, [0.15, 0.45, 0.75, 1.05, 1.25].map((y) => [0, y, 0] as Point));
  decorate(
    basket,
    new BoxGeometry(0.025, 1.25, 0.02),
    WICKER_DARK,
    [-1.2, -0.6, 0, 0.6, 1.2].map((a) => [Math.sin(a) * 0.38, 0.62, Math.cos(a) * 0.32, Math.sin(a) * 0.12] as [number, number, number, number]),
  );
  const top = bearer.at(0, 0.95 + 1.29, -0.345);
  add(new TorusGeometry(0.3, 0.13, 8, 18).rotateX(Math.PI / 2).scale(1, 1, 0.8), 0x4a2a3a, top[0], top[1] - 0.12, top[2], o(1.45));
  const glow = add(new SphereGeometry(0.24, 14, 10).scale(1, 0.75, 0.85), MAGENTA, top[0], top[1] - 0.1, top[2], { ...o(1.5), flat: true });
  // The Seal itself: an iron stamp, its wooden knob sticking out of the bundle, tied with rope.
  cylinder(0.05, 0.07, 0.32, 0x3a3f4e, top[0] - 0.12, top[1] + 0.05, top[2] - 0.05, { delay: 1.55, rotation: [0.25, 0, 0.3] }, 10);
  ball(0.08, 0x6a4a30, top[0] - 0.2, top[1] + 0.32, top[2] - 0.12, { delay: 1.58 });
  add(new TorusGeometry(0.34, 0.025, 6, 20).rotateX(Math.PI / 2), 0xc9a46a, top[0], top[1] + 0.02, top[2], { delay: 1.6, rotation: [0.3, facing, 0.2] });

  // The Seal's threads trailing round him.
  const threads = [
    [top, [top[0] - 0.7, top[1] - 0.1, top[2] + 0.2], [top[0] - 1.2, top[1] - 0.5, top[2] + 0.6], [top[0] - 1.5, top[1] - 0.4, top[2] + 1.0]],
    [top, [top[0] + 0.6, top[1] + 0.15, top[2] - 0.1], [top[0] + 1.1, top[1] - 0.2, top[2] + 0.4], [top[0] + 1.45, top[1] - 0.05, top[2] + 0.75]],
    [top, [top[0] + 0.4, top[1] + 0.5, top[2] - 0.3], [top[0] + 0.9, top[1] + 0.7, top[2] - 0.2], [top[0] + 1.2, top[1] + 0.55, top[2] + 0.1]],
  ].map((points, k) => cable(kit, points as Point[], 0.018, MAGENTA, 1.7 + k * 0.05));
  // Its marks drifting at his head and fading before they touch him.
  const head = bearer.head;
  const marks = Array.from({ length: 4 }, (_, k) => ({
    part: add(new TorusGeometry(0.06, 0.014, 4, 4), MAGENTA, top[0], top[1], top[2], { delay: 1.8, flat: true, noInk: true }),
    phase: k / 4,
  }));

  const dim = new Color(0x7a1a3a);
  const bright = new Color(MAGENTA);
  tick((t) => {
    colorOf(glow).lerpColors(dim, bright, (Math.sin(t * 2.2) + 1) / 2 * 0.6 + 0.4);
    marks.forEach(({ part, phase }) => {
      const s = (t * 0.35 + phase) % 1;
      part.position.set(top[0] + (head[0] - top[0]) * s + Math.sin(s * 6 + phase * 9) * 0.15, top[1] + 0.25 + (head[1] + 0.25 - top[1] - 0.25) * s, top[2] + (head[2] + 0.5 - top[2]) * s);
      part.rotation.set(t, s * 3, 0);
      part.visible = s < 0.85;
      part.children[0].scale.setScalar(1 - s * 0.6);
    });
    threads.forEach((thread, k) => (thread.rotation.y = Math.sin(t * 0.8 + k * 2) * 0.06));
    eyes.forEach((pair, k) => (pair.visible = Math.floor(t * 2 + k * 1.7) % 6 !== 4));
  });

  return { width: 4.9, height: 4.5, lookY: 1.7 };
}
