import { BoxGeometry, ConeGeometry, Group, SphereGeometry, TorusGeometry } from "three";
import { INK, YELLOW, cable, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";

/**
 * Ansa (P187): the sea serpent of the Banco lies coiled round the whole gulf, a ring of grey
 * stone scales crusted with barnacles, shells and seaweed; its neck rises from the water inside
 * the ring and its head, a meadow on top with sheep grazing, holds the tip of its own tail in
 * its jaws while water pours off its chin. Rings of water spread across the gulf, and a walker
 * in a yellow raincoat goes round and round on its back, never getting anywhere.
 */
export function ansa(kit: Kit): Framing {
  const { add, box, ball, decorate, tick } = kit;
  const SCALE = 0x5f6e66;
  const SCALE_DARK = 0x4c5a54;
  const BARNACLE = 0xdcd6c8;
  const WEED = 0x2f7a4a;
  const GRASS = 0x4f8a3a;
  const FOAM = 0xcfeef7;
  const WOOL = 0xf2f0ea;
  const F = octagonBase(kit, 0x0e3448);

  /** A ring spreading on the water, again and again. */
  const ripple = (x: number, z: number, radius: number, period: number, phase: number, delay: number) => {
    const mesh = add(new TorusGeometry(radius, 0.016, 6, 36).rotateX(Math.PI / 2), FOAM, x, F + 0.002, z, { delay, flat: true, noInk: true }).children[0];
    tick((t) => {
      const u = ((Math.max(0, t - delay) + phase) / period) % 1;
      mesh.scale.set(0.3 + u * 1.4, 1, 0.3 + u * 1.4);
      mesh.visible = u < 0.85;
    });
  };

  // The far shore with the lights of the town.
  box(2.3, 0.08, 0.32, 0x2a2a3a, 0, F, -2.0, { delay: 0.05 });
  [-1.0, -0.72, -0.45, -0.18, 0.1, 0.38, 0.66, 0.92].forEach((x, i) => {
    const h = 0.18 + ((i * 5) % 4) * 0.08;
    const house = box(0.24, h, 0.18, i % 2 ? 0x2a2f4a : 0x3a2a4a, x, F + 0.08, -2.02, { delay: 0.08 + i * 0.02 });
    decorate(house, new BoxGeometry(0.04, 0.04, 0.01), YELLOW, [[0, h * 0.6, 0.091]]);
  });

  // The coil round the gulf: stone scales, barnacles, shells, seaweed and patches of grass.
  const R = 1.7;
  const CZ = 0.15;
  const coil = add(new TorusGeometry(R, 0.27, 12, 72).rotateX(Math.PI / 2), SCALE, 0, F - 0.2, CZ, { delay: 0.15 });
  const around = (n: number, radius: number, y: number, skew: number) =>
    Array.from({ length: n }, (_, k) => {
      const a = (k / n) * Math.PI * 2 + skew;
      const r = radius + Math.sin(k * 2.7) * 0.08;
      return [Math.cos(a) * r, y, Math.sin(a) * r] as Point;
    });
  decorate(coil, new SphereGeometry(0.09, 8, 6).scale(1.4, 0.3, 1), SCALE_DARK, around(30, R, 0.52, 0.1));
  decorate(coil, new ConeGeometry(0.035, 0.06, 6), BARNACLE, around(26, R, 0.54, 0.35));
  decorate(coil, new BoxGeometry(0.03, 0.22, 0.03), WEED, around(22, R + 0.27, 0.29, 0.2));
  decorate(coil, new SphereGeometry(0.06, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.4, 1), 0xe8c8a8, around(9, R + 0.2, 0.45, 0.8));
  decorate(coil, new BoxGeometry(0.22, 0.02, 0.16), GRASS, around(7, R, 0.54, 1.2));

  // The neck out of the water, the head with its meadow and sheep, the tail held in its jaws.
  cable(kit, [[0.05, F - 0.1, -0.75], [0.12, F + 0.9, -0.85], [-0.02, F + 1.85, -0.6], [0.12, F + 2.55, -0.15]], 0.3, SCALE, 0.4);
  // The tail, thinning to a point, curls up out of the water into the mouth.
  const tail: Point[] = [
    [0.8, F - 0.05, -0.4],
    [0.9, F + 0.6, -0.2],
    [0.7, F + 1.3, 0.15],
    [0.4, F + 1.95, 0.45],
    [0.08, F + 2.4, 0.58],
  ];
  const radii = [0.2, 0.16, 0.12, 0.08, 0.04];
  tail.slice(1).forEach((to, i) => {
    limb(kit, tail[i], to, radii[i], radii[i + 1], SCALE_DARK, { delay: 0.6 + i * 0.04 });
    ball(radii[i + 1], SCALE_DARK, to[0], to[1] - radii[i + 1], to[2], { delay: 0.62 + i * 0.04 });
  });
  const HX = 0.2;
  const HY = F + 2.62;
  const HZ = 0.12;
  const head = add(new SphereGeometry(0.48, 18, 14).scale(0.8, 0.8, 1.4), SCALE, HX, HY - 0.38, HZ, { delay: 0.8 });
  head.rotation.order = "YXZ";
  head.rotation.set(0.15, -0.4, 0);
  decorate(head, new BoxGeometry(0.72, 0.03, 0.62), INK, [[0, 0.28, 0.38]]);
  decorate(head, new BoxGeometry(0.1, 0.05, 0.02), YELLOW, [
    [-0.2, 0.47, 0.56, -0.3],
    [0.2, 0.47, 0.56, 0.3],
  ]);
  decorate(head, new BoxGeometry(0.16, 0.04, 0.06), SCALE_DARK, [
    [-0.2, 0.53, 0.5, -0.3],
    [0.2, 0.53, 0.5, 0.3],
  ]);
  decorate(head, new ConeGeometry(0.03, 0.05, 6), BARNACLE, [
    [-0.36, 0.4, 0.1],
    [0.37, 0.35, -0.05],
    [0.33, 0.45, 0.25],
  ]);
  add(new SphereGeometry(0.42, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.75, 0.3, 1.3), GRASS, HX, HY + 0.27, HZ, { delay: 0.9, rotation: [0.15, -0.4, 0] });
  // Sheep on four legs: one on the head, three on the coil, nodding as they graze.
  const sheep = (at: Point, turn: number, delay: number) => {
    const body = add(new SphereGeometry(0.06, 10, 8).scale(1.4, 1, 1), WOOL, at[0], at[1] + 0.04, at[2], { delay, rotation: [0, turn, 0] });
    decorate(body, new BoxGeometry(0.018, 0.05, 0.018), 0x2a2622, [
      [-0.05, -0.015, -0.03],
      [-0.05, -0.015, 0.03],
      [0.05, -0.015, -0.03],
      [0.05, -0.015, 0.03],
    ]);
    const nod = ball(0.032, 0x2a2622, at[0] + Math.cos(turn) * 0.09, at[1] + 0.08, at[2] - Math.sin(turn) * 0.09, { delay: delay + 0.03 });
    return { body, nod, rest: nod.position.y };
  };
  const flock = [
    sheep([HX + 0.08, HY + 0.34, HZ - 0.22], 0.9, 1.0),
    sheep([-R * 0.98, F + 0.33, CZ - R * 0.15], -1.2, 1.05),
    sheep([-R * 0.72, F + 0.33, CZ + R * 0.69], -0.6, 1.1),
    sheep([R * 0.98, F + 0.33, CZ + R * 0.2], 1.8, 1.15),
  ];
  // Water pouring off its chin and down its neck.
  [
    [-0.05, 0.62, 0.7],
    [0.12, 0.5, 0.55],
    [0.3, 0.25, 0.6],
  ].forEach(([x, z, h], i) => box(0.035, h, 0.02, 0x9fe8ff, x, HY - 0.36 - h, z, { delay: 1.2 + i * 0.03, flat: true, noInk: true, rotation: [0, 0.35, 0] }));
  ripple(0.05, -0.75, 0.3, 3, 0, 1.2);
  ripple(0.8, -0.45, 0.25, 3, 1.5, 1.25);
  ripple(0.4, 0.55, 0.2, 2.4, 0.6, 1.3);
  ripple(-0.7, 0.6, 0.3, 3.4, 1.8, 1.35);
  ripple(-1.85, -1.3, 0.2, 3, 0.9, 1.4);

  // The walker on its back, going round the gulf; turned as a whole round the coil's centre.
  const walker = figure(kit, {
    x: R,
    z: CZ,
    y: F + 0.335,
    facing: Math.PI,
    height: 0.5,
    build: "slim",
    skin: 0xe0b08f,
    face: { mouth: "neutral" },
    headwear: { kind: "hood", color: YELLOW },
    top: { kind: "coat", color: YELLOW },
    bottom: { kind: "trousers", color: 0x2a3a5a },
    arms: ["down", "back"],
    legs: "stride",
    delay: 1.4,
  });
  const loop = new Group();
  loop.position.set(0, 0, CZ);
  walker.parts[0].parent?.add(loop);
  walker.parts.forEach((part) => {
    part.position.z -= CZ;
    loop.add(part);
  });

  tick((t) => {
    loop.rotation.y = -1.25 + t * 0.12;
    flock.forEach(({ nod, rest }, i) => (nod.position.y = rest - Math.max(0, Math.sin(t * 1.5 + i * 1.7)) * 0.04));
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}
