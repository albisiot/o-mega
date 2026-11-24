import { BoxGeometry, CatmullRomCurve3, SphereGeometry, TorusGeometry, Vector3, type Group } from "three";
import { CYAN, INK, MAGENTA, YELLOW, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { facade, floor, potted, puddle } from "@/lib/diorama-props";

/**
 * Cicatrix (P083): the half-gecko mutant clings to a brick wall in a back alley at night,
 * sticky fingers splayed on the bricks, head turned to us with huge yellow eyes, his striped tail
 * curling down to the cobbles. Below him the price of it all: the tail he just dropped still
 * wriggles on the ground, and the box of his things from the job he lost sits by the wall.
 */
export function cicatrix(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const SKIN = 0x8fd44a;
  const SPOT = 0xc0408a;
  const LIME = 0xc4f04a;
  const NAVY = 0x22305a;
  const OVERALL = 0x1e2a4e;
  const F = octagonBase(kit, 0x1a1c28);
  const G = floor(kit, F, 0.06, 0x262a3a, 0x181b26, 0.3);

  // The alley: a brick wall on the left with a drainpipe, a dark house front behind, puddles.
  const wall = box(0.3, 3.0, 2.8, 0x221a2c, -1.35, G, -0.2, { delay: 0.1, ink: 1.02 });
  const bricks: Point[] = [];
  const lit: Point[] = [];
  for (let r = 0; r < 14; r++)
    for (let c = 0; c < 8; c++) {
      const z = -1.22 + c * 0.34 + (r % 2) * 0.17;
      if (z < 1.25) ((r * 5 + c * 3) % 7 === 0 ? lit : bricks).push([0.156, 0.12 + r * 0.205, z]);
    }
  decorate(wall, new BoxGeometry(0.012, 0.15, 0.3), 0x4a2f5c, bricks);
  decorate(wall, new BoxGeometry(0.012, 0.15, 0.3), 0x7a3474, lit);
  const pipe = cylinder(0.06, 0.06, 3.0, 0x2f4a6a, -1.12, G, -1.25, { delay: 0.2 }, 10);
  decorate(pipe, new TorusGeometry(0.068, 0.018, 6, 14).rotateX(Math.PI / 2), 0x1a2a3e, [0.6, 1.4, 2.2].map((y) => [0, y, 0] as Point));
  box(0.16, 0.1, 0.14, 0x2f4a6a, -1.02, G, -1.25, { delay: 0.25 });
  facade(kit, 0.15, -1.5, G, 0.12, { width: 2.6, height: 2.6, color: 0x2a2440, windows: 3, floors: 2, door: true, lit: MAGENTA, shutters: 0x23404b });
  puddle(kit, -0.75, -0.85, G, 0.5, 0.3, CYAN);
  puddle(kit, 0.45, 0.25, G, 0.52, 0.36, MAGENTA);

  // The box of his things from the job: a plant, a mug, a photo.
  const BX = 1.05;
  const BZ = 0.5;
  box(0.5, 0.3, 0.38, 0x8a6a48, BX, G, BZ, { delay: 0.4, rotation: [0, 0.3, 0] });
  [-1, 1].forEach((side) => {
    const flap = add(new BoxGeometry(0.5, 0.02, 0.16).translate(0, 0, 0.08), 0x9a7a56, BX + side * 0.18 * Math.sin(0.3), G + 0.29, BZ + side * 0.18 * Math.cos(0.3), { delay: 0.45 });
    flap.rotation.order = "YXZ";
    flap.rotation.set(-0.7, 0.3 + (side < 0 ? Math.PI : 0), 0);
  });
  potted(kit, BX - 0.1, BZ - 0.02, G + 0.12, 0.5);
  cylinder(0.055, 0.05, 0.13, CYAN, BX + 0.13, G + 0.24, BZ + 0.06, { delay: 0.55 }, 10);
  const photo = box(0.17, 0.21, 0.02, 0x2a2430, BX + 0.1, G + 0.2, BZ - 0.1, { delay: 0.58, rotation: [-0.25, 0.3, 0.1] });
  decorate(photo, new BoxGeometry(0.12, 0.15, 0.01), MAGENTA, [[0, 0.105, 0.011]]);

  // Cicatrix, flat to the wall half a metre up, his head turned to us.
  const LIFT = 0.5;
  const FACE = -1.4;
  const gecko = figure(kit, {
    x: -0.72,
    z: 0.25,
    y: G + LIFT,
    facing: FACE,
    height: 2.3,
    build: "slim",
    skin: SKIN,
    hair: { style: "spiky", color: 0x8a2a7a },
    face: { mouth: "smile", brows: "none", eyes: INK },
    top: { kind: "apron", color: OVERALL, accent: 0x283a66 },
    bottom: { kind: "trousers", color: OVERALL },
    barefoot: true,
    arms: [[-0.25, 2.35, 0.36], [0.3, 1.95, 0.45]],
    legs: "stride",
    delay: 0.8,
  });
  const head = gecko.headPart;
  head.rotation.y = FACE + 1.45;
  const RH = gecko.headRadius;
  const cy = RH * 1.06;
  // Bulging yellow eyes with slit pupils, a wide grin, magenta spots.
  decorate(head, new SphereGeometry(0.075, 12, 8), YELLOW, [
    [-0.09, cy + 0.035, 0.155],
    [0.09, cy + 0.035, 0.155],
  ]);
  decorate(head, new TorusGeometry(0.075, 0.012, 6, 18), INK, [
    [-0.09, cy + 0.035, 0.16],
    [0.09, cy + 0.035, 0.16],
  ]);
  decorate(head, new BoxGeometry(0.018, 0.075, 0.01), INK, [
    [-0.09, cy + 0.035, 0.232],
    [0.09, cy + 0.035, 0.232],
  ]);
  decorate(head, new BoxGeometry(0.18, 0.012, 0.01), INK, [[0, cy - 0.085, 0.178]]);
  const onHead = (a: number, b: number): Point => [Math.sin(a) * Math.sin(b) * RH * 0.97, cy + Math.cos(b) * RH * 1.04, Math.cos(a) * Math.sin(b) * RH * 0.97];
  decorate(head, new SphereGeometry(0.028, 8, 6), SPOT, [onHead(1.3, 0.8), onHead(-1.2, 1.0), onHead(2.2, 1.3), onHead(-2.3, 1.1), onHead(1.9, 0.6), onHead(-0.6, 1.9)]);

  // Sticky fingers splayed on the bricks, and pads on the toes.
  const WALL = -1.165;
  const fingers = (at: Point, spread: [number, number][], delay: number) =>
    spread.forEach(([dy, dz], i) => {
      const pad: Point = [WALL, at[1] + dy, at[2] + dz];
      limb(kit, at, pad, 0.026, 0.02, SKIN, { delay: delay + i * 0.02 });
      ball(0.038, LIME, pad[0], pad[1] - 0.038, pad[2], { delay: delay + 0.05 + i * 0.02 });
    });
  const [high, low] = gecko.hands;
  fingers(high, [[0.16, -0.1], [0.19, 0.0], [0.15, 0.1], [0.02, 0.15]], 1.4);
  fingers(low, [[0.15, -0.08], [0.17, 0.03], [0.12, 0.13], [-0.02, 0.16]], 1.45);
  const toe = gecko.at(-0.16, 0.1, 0.48);
  fingers(toe, [[0.08, -0.08], [0.1, 0.02], [0.06, 0.1]], 1.5);

  // His tail: from the small of his back down to the cobbles, curling up, striped.
  const tailPath = [
    [0, 1.0, -0.15],
    [0.05, 0.62, -0.5],
    [0.12, 0.1, -0.72],
    [0.22, -0.4, -0.8],
    [0.42, -0.4, -0.62],
    [0.56, -0.22, -0.48],
    [0.56, 0.06, -0.56],
  ].map(([x, y, z]) => new Vector3(x, y, z));
  const curve = new CatmullRomCurve3(tailPath);
  const N = 20;
  const tailLocal = Array.from({ length: N }, (_, k) => curve.getPoint(k / (N - 1)));
  const radius = (k: number) => 0.12 - 0.085 * (k / (N - 1));
  const tail = tailLocal.map((p, k) => {
    const at = gecko.at(p.x, p.y, p.z);
    return ball(radius(k), Math.floor(k / 2) % 2 ? NAVY : LIME, at[0], at[1] - radius(k), at[2], { delay: 1.2 + k * 0.02 });
  });

  // The tail he dropped, still wriggling.
  const shed: Group[] = [];
  for (let k = 0; k < 9; k++) {
    const r = 0.08 - k * 0.005;
    shed.push(ball(r, Math.floor(k / 2) % 2 ? NAVY : LIME, -0.1 + k * 0.09, G, 1.2, { delay: 1.6 + k * 0.02 }));
  }
  [
    [0.25, 1.48, 0.5],
    [0.38, 1.52, 0],
    [0.5, 1.46, -0.5],
  ].forEach(([x, z, lean], i) => box(0.012, 0.012, 0.14, 0xe8e2d0, x, G + 0.22, z, { delay: 1.8 + i * 0.03, flat: true, noInk: true, rotation: [0.9, lean, 0] }));

  tick((t) => {
    // The dropped tail thrashes; the tip of the new one sways.
    shed.forEach((part, k) => (part.position.z = 1.2 + Math.sin(t * 9 - k * 0.9) * 0.05 * (0.4 + k / 8)));
    for (let k = N - 7; k < N; k++) {
      const p = tailLocal[k];
      const at = gecko.at(p.x + Math.sin(t * 2.2 + k * 0.5) * 0.04 * ((k - N + 8) / 7), p.y, p.z);
      tail[k].position.set(at[0], at[1] - radius(k), at[2]);
    }
  });

  return { width: 4.9, height: 4.4, lookY: 1.6 };
}
