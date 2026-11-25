import { BoxGeometry, CylinderGeometry, ExtrudeGeometry, OctahedronGeometry, Shape } from "three";
import { CYAN, ORANGE, YELLOW, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, ring, table } from "@/lib/diorama-props";

/**
 * Soffiata (P248): the alien informer in her velvet booth in a cellar bar, between magenta
 * curtains, a lantern and a bottle on the table, an amber drink in one ringed hand and the
 * other at her cheek as she whispers, her great fin ears spread. Behind her the room's patrons
 * chat in the smoke; a cyan ring of appraisal drifts from head to head and always comes back to
 * settle on the same plain-looking man: the one worth the most in the room.
 */
export function soffiata(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick, motes } = kit;
  const VELVET = 0x6a1e44;
  const BOOTH = 0x4a1e3a;
  const SKIN = 0xb89ad0;
  const F = octagonBase(kit, 0x1f1a26);
  const G = floor(kit, F, 0.06, 0x2a1e2e, 0x1e1422, 0.45);

  // The cellar's back wall and two velvet curtains.
  box(3.0, 2.6, 0.2, 0x2a2236, 0, G, -1.75, { delay: 0.06, ink: 1.02 });
  [
    [-1.75, -0.4],
    [1.55, -0.65],
  ].forEach(([x, z], i) => {
    const curtain = box(0.42, 2.9, 0.18, VELVET, x, G, z, { delay: 0.1 + i * 0.04, rotation: [0, 0.35, 0] });
    decorate(curtain, new BoxGeometry(0.04, 2.85, 0.01), 0x4a1030, [
      [-0.12, 1.45, 0.091],
      [0.02, 1.45, 0.091],
      [0.15, 1.45, 0.091],
    ]);
  });

  // The patrons, chatting in the smoke at the back of the room.
  const patrons = [
    { x: -1.05, z: -1.35, facing: 0.7, color: 0x23404b, hair: 0x2a1e1c, height: 2.4 },
    { x: 0.25, z: -1.55, facing: -0.15, color: 0x3a3a44, hair: 0x6a4a30, height: 2.3 },
    { x: 1.2, z: -1.0, facing: -0.8, color: 0x3a2a4a, hair: 0x1a1418, height: 2.45 },
  ].map((p, i) =>
    figure(kit, {
      x: p.x,
      z: p.z,
      y: G,
      facing: p.facing,
      height: p.height,
      skin: [0xc8a088, 0xd8b098, 0x8a6a58][i],
      hair: { style: i === 2 ? "bald" : "short", color: p.hair },
      face: { mouth: i === 1 ? "neutral" : "smile", brows: "calm" },
      headwear: i === 2 ? { kind: "hat", color: 0x2a2030, accent: 0x8a2a5a } : undefined,
      top: { kind: i === 1 ? "hoodie" : "suit", color: p.color, tie: 0x8a2a5a },
      bottom: { kind: "trousers", color: 0x1e1e28 },
      arms: i === 0 ? ["hip", "down"] : i === 1 ? ["down", "down"] : ["down", "chin"],
      delay: 0.3 + i * 0.1,
    }),
  );
  motes(14, 0x6a5a8a, 0.05, [-1.4, G + 1.2, -1.6], [1.4, G + 3.0, -0.6], 0.5);

  // The booth: a velvet bench with a tall padded back.
  const H = 0.45;
  const P = (lx: number, ly: number, lz: number): Point => [-0.55 + lx * Math.cos(H) + lz * Math.sin(H), G + ly, 0.3 - lx * Math.sin(H) + lz * Math.cos(H)];
  const turned: [number, number, number] = [0, H, 0];
  box(1.5, 0.47, 0.6, BOOTH, ...P(0, 0, -0.08), { delay: 0.5, rotation: turned });
  const back = box(1.5, 0.95, 0.16, 0x5a2446, ...P(0, 0.4, -0.42), { delay: 0.54, rotation: turned });
  decorate(
    back,
    new CylinderGeometry(0.025, 0.025, 0.02, 8).rotateX(Math.PI / 2),
    0x3a1028,
    [-0.5, -0.17, 0.17, 0.5].flatMap((x) => [0.35, 0.7].map((y) => [x, y, 0.085] as Point)),
  );

  // The table: a lantern and a bottle.
  table(kit, ...xz(P(0.75, 0, 0.75)), G, 0.6, true, 0x3a2a30, 0.72);
  const [lx, , lz] = P(0.85, 0, 0.6);
  box(0.16, 0.03, 0.16, 0x2a1e1c, lx, G + 0.76, lz, { delay: 0.7 });
  const flame = box(0.12, 0.17, 0.12, ORANGE, lx, G + 0.79, lz, { delay: 0.72, flat: true });
  decorate(flame, new BoxGeometry(0.015, 0.17, 0.125), 0x2a1e1c, [
    [-0.03, 0.085, 0],
    [0.03, 0.085, 0],
  ]);
  add(new CylinderGeometry(0.02, 0.09, 0.08, 6), 0x2a1e1c, lx, G + 0.96, lz, { delay: 0.74 });
  const [bx, , bz] = P(0.55, 0, 0.9);
  cylinder(0.06, 0.06, 0.26, 0x1f4a3a, bx, G + 0.76, bz, { delay: 0.76 }, 10);
  cylinder(0.02, 0.04, 0.1, 0x1f4a3a, bx, G + 1.02, bz, { delay: 0.78 }, 8);

  // Soffiata, seated, glass in hand, the other hand at her cheek.
  const spy = figure(kit, {
    x: -0.55,
    z: 0.3,
    y: G,
    facing: H,
    height: 2.4,
    build: "slim",
    skin: SKIN,
    hair: { style: "bald", color: SKIN },
    face: { mouth: "smirk", brows: "raised", eyes: 0x2a8aa0 },
    top: { kind: "coat", color: 0x1e2638, accent: 0x8a2a5a },
    bottom: { kind: "trousers", color: 0x1e2638 },
    shoes: 0x1a1420,
    scarf: 0x6a1e44,
    arms: [[-0.14, 1.15, 0.36], [0.15, 1.62, 0.17]],
    legs: "sit",
    delay: 0.9,
  });
  const [gx, gy, gz] = spy.hands[0];
  cylinder(0.05, 0.04, 0.11, 0xffa630, gx, gy + 0.02, gz + 0.02, { delay: 1.5, flat: true }, 12);
  add(new CylinderGeometry(0.055, 0.055, 0.015, 12), 0xd8e8f0, gx, gy + 0.13, gz + 0.02, { delay: 1.52, noInk: true });
  add(new CylinderGeometry(0.02, 0.02, 0.012, 8), YELLOW, spy.hands[1][0], spy.hands[1][1] - 0.07, spy.hands[1][2], { delay: 1.55, flat: true, noInk: true, rotation: turned });
  // Her fin ears: scalloped fans ribbed in magenta, swept back.
  const fan = new Shape();
  fan.moveTo(0, 0);
  for (let i = 0; i <= 8; i++) {
    const a = -0.7 + i * (2.1 / 8);
    const r = i % 2 ? 0.27 : 0.32;
    fan.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  fan.closePath();
  const lift = 0.32 * Math.sin(0.7);
  const hy = spy.head[1] - G;
  const R = spy.headRadius;
  const ears = [-1, 1].map((side, i) => {
    const ear = add(new ExtrudeGeometry(fan, { depth: 0.016, bevelEnabled: false }).translate(0, 0, -0.008), 0xc8a8e0, ...offset(P(side * R * 0.85, hy + 0.02, -0.03), -lift), {
      delay: 1.4 + i * 0.03,
      rotation: [0, side > 0 ? H + 0.4 : H + Math.PI - 0.4, 0],
    });
    decorate(
      ear,
      new BoxGeometry(0.26, 0.012, 0.004).translate(0.13, 0, 0),
      0xd04a8a,
      [-0.45, -0.05, 0.35, 0.75, 1.1].flatMap((a) => [[0, lift, 0.01, a] as [number, number, number, number], [0, lift, -0.01, a] as [number, number, number, number]]),
    );
    return ear;
  });

  // The appraising ring, scanning the patrons and settling on the one who counts.
  const tops = patrons.map((p) => [p.head[0], p.top + 0.32, p.head[2]] as Point);
  const marker = ring(kit, tops[1], 0.2, CYAN, 1.8);
  const gem = add(new OctahedronGeometry(0.06), 0x9fe8ff, tops[1][0], tops[1][1] + 0.1, tops[1][2], { delay: 1.85, flat: true });
  tick((t) => {
    const u = t % 6;
    const seat = (k: number): Point => tops[k];
    const go = (a: Point, b: Point, f: number): Point => {
      const s = f * f * (3 - 2 * f);
      return [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s, a[2] + (b[2] - a[2]) * s];
    };
    const at = u < 3 ? seat(1) : u < 4 ? go(seat(1), seat(0), u - 3) : u < 5 ? go(seat(0), seat(2), u - 4) : go(seat(2), seat(1), u - 5);
    marker.position.set(...at);
    gem.position.set(at[0], at[1] + 0.1 + Math.sin(t * 3) * 0.03, at[2]);
    gem.rotation.y = t * 2;
    gem.visible = u < 3;
    ears.forEach((ear, i) => (ear.rotation.y = (i ? H + 0.4 : H + Math.PI - 0.4) + (Math.sin(t * 0.9) > 0.85 ? Math.sin(t * 30) * 0.08 : 0)));
    flame.visible = Math.floor(t * 9) % 17 !== 5;
  });

  return { width: 4.9, height: 4.4, lookY: 1.55 };
}

/** A point's x and z, for the props that take them apart from the height. */
function xz(p: Point): [number, number] {
  return [p[0], p[2]];
}

/** A point moved up or down. */
function offset(p: Point, dy: number): Point {
  return [p[0], p[1] + dy, p[2]];
}
