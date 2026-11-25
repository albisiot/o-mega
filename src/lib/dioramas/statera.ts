import { BoxGeometry, CylinderGeometry, Group, TorusGeometry } from "three";
import { INK, YELLOW, cable, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Statera (P220): the living steelyard of the Banco stands in a vault hall before the round
 * vault door, an iron pole wrapped in old measuring tapes, its glowing pivot watching like an
 * eye. From the short arm hangs a pan, and in it stands a clerk in shirt and waistcoat, hands
 * clasped, being weighed; on the long arm the heavy poise slides out until the beam settles at
 * what he is worth. It never moves from its spot: a cobweb ties its foot to the floor.
 */
export function statera(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const IRON = 0x3a3e4a;
  const TAPE = 0xd8c078;
  const F = octagonBase(kit, 0x1d1b26);
  const G = floor(kit, F, 0.06, 0x2a3036, 0x1c2026, 0.45);

  // The vault: a riveted wall, the round door with its wheel.
  const wall = box(3.6, 2.55, 0.3, 0x2c3a3e, 0, G, -1.7, { delay: 0.1, ink: 1.02 });
  decorate(wall, new BoxGeometry(0.04, 0.04, 0.01), 0x46565a, Array.from({ length: 24 }, (_, k) => [-1.6 + (k % 12) * 0.29, k < 12 ? 2.38 : 0.2, 0.155] as Point));
  const D: Point = [0.75, G + 0.25, -1.5];
  add(new TorusGeometry(1.05, 0.1, 8, 36), 0x46565a, D[0], D[1], D[2], { delay: 0.16 });
  const door = add(new CylinderGeometry(1.0, 1.0, 0.12, 32).rotateX(Math.PI / 2), 0x34464c, D[0], D[1] + 0.05, D[2], { delay: 0.2 });
  decorate(door, new BoxGeometry(0.06, 1.7, 0.02), 0x23302f, [0, 1, 2].map((k) => [0, 1.0, 0.07, (k * Math.PI) / 3] as [number, number, number, number]));
  decorate(door, new TorusGeometry(0.35, 0.03, 6, 24), 0x8a93a3, [[0, 1.0, 0.08]]);
  decorate(door, new CylinderGeometry(0.035, 0.035, 0.03, 8).rotateX(Math.PI / 2), 0x8a93a3, Array.from({ length: 12 }, (_, k) => [Math.sin((k / 12) * Math.PI * 2) * 0.85, 1.0 + Math.cos((k / 12) * Math.PI * 2) * 0.85, 0.07] as Point));

  // The steelyard: a round foot, the pole, the glowing pivot with its eye.
  const P: Point = [-0.05, G + 3.0, -0.35];
  cylinder(0.5, 0.58, 0.16, IRON, P[0], G, P[2], { delay: 0.3 }, 20);
  cylinder(0.14, 0.2, 0.2, IRON, P[0], G + 0.16, P[2], { delay: 0.32 }, 14);
  cylinder(0.08, 0.1, 2.75, IRON, P[0], G + 0.3, P[2], { delay: 0.36 }, 12);
  const eye = ball(0.17, YELLOW, P[0], P[1] - 0.17, P[2], { delay: 0.8, flat: true });
  const root = eye.parent;
  decorate(eye, new BoxGeometry(0.04, 0.16, 0.02), INK, [[0.05, 0.17, 0.155]]);
  // Tapes wound round the pole, turning slowly, and loose ends hanging off the beam.
  const helix: Point[] = Array.from({ length: 22 }, (_, k) => [P[0] + Math.sin(k * 1.1) * 0.13, G + 0.35 + k * 0.12, P[2] + Math.cos(k * 1.1) * 0.13]);
  const wound = new Group();
  wound.position.set(P[0], 0, P[2]);
  const tape = cable(kit, helix, 0.022, TAPE, 0.9);
  tape.position.x -= P[0];
  tape.position.z -= P[2];
  // Cobweb at its foot: it never moves.
  [0.2, 0.6, 1.0].forEach((a, i) => box(0.008, 0.008, 0.55, 0xc8ccd4, P[0] + 0.45, G + 0.08, P[2] + 0.25, { delay: 1.8 + i * 0.02, flat: true, noInk: true, rotation: [0.25, a, 0] }));

  // The beam, the pan with the clerk, the poise: each moves on its own.
  const beam = new Group();
  beam.position.set(...P);
  const swing = (part: Group) => {
    part.position.sub(beam.position);
    beam.add(part);
    return part;
  };
  const bar = swing(box(3.1, 0.12, 0.12, IRON, P[0] + 0.45, P[1] - 0.06, P[2], { delay: 0.5 }));
  decorate(bar, new BoxGeometry(0.02, 0.08, 0.13), TAPE, Array.from({ length: 9 }, (_, k) => [0.25 + k * 0.14, 0.02, 0] as Point));
  swing(add(new TorusGeometry(0.1, 0.025, 6, 14, Math.PI * 1.4).rotateZ(Math.PI * 0.8), IRON, P[0] - 1.0, P[1] - 0.3, P[2], { delay: 0.6 }));
  swing(ball(0.06, IRON, P[0] + 1.85, P[1] - 0.08, P[2], { delay: 0.62 }));
  // Loose ends of tape fluttering off the beam.
  [
    [-0.55, 0.9, 0.1],
    [0.6, 1.2, -0.12],
  ].forEach(([dx, drop, sway], i) =>
    swing(cable(kit, [[P[0] + dx, P[1] - 0.04, P[2] + 0.07], [P[0] + dx + sway, P[1] - drop * 0.4, P[2] + 0.12], [P[0] + dx - sway, P[1] - drop * 0.75, P[2] + 0.1], [P[0] + dx + sway * 1.5, P[1] - drop, P[2] + 0.14]], 0.018, TAPE, 0.95 + i * 0.03)),
  );

  const L = -1.0;
  const pan = new Group();
  const hang = (part: Group) => (pan.add(part), part);
  const rim = G + 0.62;
  hang(cylinder(0.5, 0.42, 0.1, 0x8a6a3a, P[0] + L, rim, P[2], { delay: 0.7 }, 22));
  [1.0, 3.1, 5.2].forEach((a, i) => hang(cable(kit, [[P[0] + L, P[1] - 0.32, P[2]], [P[0] + L + Math.sin(a) * 0.46, rim + 0.1, P[2] + Math.cos(a) * 0.46]], 0.012, 0x8a93a3, 0.72 + i * 0.02)));
  const clerk = figure(kit, {
    x: P[0] + L,
    z: P[2] + 0.05,
    y: rim + 0.1,
    facing: 0.35,
    height: 1.85,
    build: "slim",
    skin: 0xe0b8a0,
    hair: { style: "short", color: 0x2a201c },
    face: { mouth: "open", brows: "worried" },
    top: { kind: "suit", color: 0x2a2a34, accent: 0xe8e4dc, tie: 0xff2e6c, sleeves: "long" },
    bottom: { kind: "trousers", color: 0x2a2a34 },
    shoes: INK,
    arms: [
      [-0.04, 1.32, 0.3],
      [0.04, 1.34, 0.32],
    ],
    delay: 1.0,
  });
  clerk.parts.forEach(hang);

  const poise = new Group();
  const ring = add(new TorusGeometry(0.09, 0.025, 6, 14), IRON, P[0] + 1.3, P[1] - 0.15, P[2], { delay: 0.8 });
  const link = cylinder(0.012, 0.012, 0.45, 0x8a93a3, P[0] + 1.3, P[1] - 0.6, P[2], { delay: 0.82, noInk: true }, 6);
  const weight = cylinder(0.3, 0.32, 0.62, 0x4a4e5a, P[0] + 1.3, P[1] - 1.22, P[2], { delay: 0.86 }, 18);
  decorate(weight, new TorusGeometry(0.31, 0.02, 6, 20).rotateX(Math.PI / 2), 0x2a2e38, [
    [0, 0.1, 0],
    [0, 0.52, 0],
  ]);
  [ring, link, weight].forEach((part) => poise.add(part));

  wound.add(tape);
  root?.add(beam, pan, poise, wound);

  tick((t) => {
    // Every eight seconds the poise slides back in, the pan drops, and it is weighed again.
    const u = t % 8;
    const out = u < 2 ? 1 : u < 3 ? 1 - (u - 2) : u < 6 ? (u - 3) / 3 : 1;
    const x = -0.75 + out * 0.75;
    poise.position.x = x;
    const tilt = (1 - out) * 0.1;
    beam.rotation.z = tilt;
    pan.position.y = L * tilt;
    poise.position.y = (1.3 + x) * tilt;
    wound.rotation.y = t * 0.4;
    eye.rotation.y = Math.sin(t * 0.6) * 0.4;
  });

  return { width: 4.9, height: 4.5, lookY: 1.7 };
}
