import { BoxGeometry, ConeGeometry, CylinderGeometry, Group, SphereGeometry } from "three";
import { MAGENTA, CYAN, ORANGE, YELLOW, aim, cable, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { crate, flame, floor } from "@/lib/diorama-props";

/**
 * Zolfo (P300): the circus fire-eater turned arsonist of the Figli dell'Ultima, outside the
 * abandoned big top by the port at night, torch held high, blowing a great roaring flame. He
 * never thinks of what comes next: the flame has caught the string of pennants overhead, a can
 * of fuel stands right under it, and the fire bucket lies empty on its side.
 */
export function zolfo(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const F = octagonBase(kit, 0x1e1a24);
  const G = floor(kit, F, 0.06, 0x2e2830, 0x241f28, 0);
  const CANVAS = 0x2c2050;
  const STRIPE = 0x8a1e5a;
  const BRASS = 0xc8a040;

  // The big top: a striped drum and cone, a dark doorway, a pennant on the pole.
  const TX = -0.75;
  const TZ = -1.05;
  const R = 1.0;
  const wall = cylinder(R, R, 0.9, CANVAS, TX, G, TZ, { delay: 0.1 }, 24);
  const roof = add(new ConeGeometry(R * 1.12, 1.4, 24), CANVAS, TX, G + 0.9, TZ, { delay: 0.2 });
  for (let k = 0; k < 6; k++) {
    const from = (k * Math.PI) / 3;
    add(new CylinderGeometry(R * 1.012, R * 1.012, 0.9, 4, 1, true, from, Math.PI / 6), STRIPE, TX, G, TZ, { delay: 0.15, noInk: true });
    add(new ConeGeometry(R * 1.13, 1.41, 4, 1, true, from, Math.PI / 6), STRIPE, TX, G + 0.9, TZ, { delay: 0.25, noInk: true });
  }
  decorate(
    roof,
    new ConeGeometry(0.08, 0.16, 4).rotateX(Math.PI),
    YELLOW,
    Array.from({ length: 14 }, (_, k) => [Math.sin((k * Math.PI) / 7) * R * 1.1, -0.06, Math.cos((k * Math.PI) / 7) * R * 1.1] as Point),
  );
  const door = 0.45;
  decorate(wall, new ConeGeometry(0.32, 0.8, 3).scale(1, 1, 0.08).rotateY(door), 0x120e18, [[Math.sin(door) * R, 0.4, Math.cos(door) * R]]);
  cylinder(0.025, 0.03, 0.55, 0x2a2a34, TX, G + 2.28, TZ, { delay: 0.3 }, 6);
  const flag = box(0.28, 0.14, 0.01, MAGENTA, TX + 0.14, G + 2.66, TZ, { delay: 0.35, flat: true });

  // The string of pennants from the big top to a mast, the near end alight.
  const MX = 1.75;
  const MZ = 0.55;
  cylinder(0.03, 0.04, 2.5, 0x3a3440, MX, G, MZ, { delay: 0.3 }, 8);
  const line: Point[] = [[TX, G + 2.75, TZ], [0.45, G + 2.25, -0.2], [MX, G + 2.5, MZ]];
  cable(kit, line, 0.01, 0x14121c, 0.4);
  const pennants: Group[] = [];
  for (let k = 1; k < 9; k++) {
    const v = k / 9;
    const a = v < 0.5 ? 0 : 1;
    const w = v < 0.5 ? v * 2 : v * 2 - 1;
    const p = [0, 1, 2].map((i) => line[a][i] + (line[a + 1][i] - line[a][i]) * w) as Point;
    const burning = k >= 6;
    pennants.push(add(new ConeGeometry(0.08, 0.2, 3).rotateX(Math.PI).scale(1, 1, 0.2), burning ? 0x2a1a1e : k % 2 ? CYAN : MAGENTA, p[0], p[1] - 0.2, p[2], {
      delay: 0.5 + k * 0.03,
      rotation: [0, 0.6, 0],
    }));
  }
  const fires = [
    flame(kit, 1.05, 0.1, G + 2.28, 1.4, 0.7),
    flame(kit, 1.4, 0.32, G + 2.32, 1.45, 0.6),
  ];

  // Crates, the can of fuel right under the fire, the empty fire bucket on its side.
  crate(kit, -1.65, 0.35, G, 0.4, 0.45, 0x5e2a3a, 0.3);
  crate(kit, -1.6, 0.35, G + 0.45, 0.45, 0.36, 0x23404b, -0.2);
  const can = box(0.26, 0.34, 0.13, 0xa8204a, 1.05, G, 1.0, { delay: 0.5, rotation: [0, 0.4, 0] });
  decorate(can, new BoxGeometry(0.12, 0.04, 0.05), 0x3a1020, [[-0.04, 0.36, 0]]);
  decorate(can, new CylinderGeometry(0.025, 0.025, 0.08, 8), 0x3a1020, [[0.09, 0.37, 0]]);
  decorate(can, new BoxGeometry(0.2, 0.012, 0.135), 0x7a1838, [[0, 0.2, 0]]);
  const bucket = add(new CylinderGeometry(0.14, 0.11, 0.28, 12).rotateZ(Math.PI / 2), 0x5a6a80, -0.75, G, 1.15, { delay: 0.5, rotation: [0, 1.9, 0] });
  decorate(bucket, new CylinderGeometry(0.12, 0.12, 0.01, 12).rotateZ(Math.PI / 2), 0x16141c, [[-0.142, 0.14, 0]]);

  // Zolfo, torch high, blowing fire, brass fuel flasks on his belt.
  const H = 2.45;
  const u = H / 2.4;
  const facing = 0.45;
  const eater = figure(kit, {
    x: 0.15,
    z: 0.35,
    y: G,
    facing,
    height: H,
    skin: 0xc89878,
    hair: { style: "long", color: 0x14101a },
    face: { mouth: "none", brows: "angry", beard: "moustache", beardColor: 0x1a1418, marks: 0x4a3a3a },
    top: { kind: "uniform", color: 0x6a1838, accent: BRASS },
    bottom: { kind: "trousers", color: 0x3a3c48 },
    shoes: 0x1e1a1a,
    belt: 0x2a1c14,
    arms: [[-0.55, 2.2, 0.15], [0.5, 1.35, 0.35]],
    legs: "wide",
    delay: 0.9,
  });
  const RH = 0.22 * u;
  decorate(eater.headPart, new BoxGeometry(0.09 * u, 0.08 * u, 0.03), 0x3a1a20, [[0, RH * 1.06 - 0.1 * u, RH * 0.9 - 0.015]]);
  [
    [-0.24, 0.2],
    [0.24, 0.2],
    [-0.36, 0.02],
    [0.36, 0.02],
  ].forEach(([x, z], i) => cylinder(0.045, 0.045, 0.17, BRASS, ...eater.at(x * u, 0.74 * u, z * u), { delay: 1.4 + i * 0.03 }, 8));
  const [torchHand, flaskHand] = eater.hands;
  limb(kit, [torchHand[0], torchHand[1] - 0.25, torchHand[2]], [torchHand[0], torchHand[1] + 0.25, torchHand[2]], 0.03, 0.035, 0x4a3226, { delay: 1.45 });
  ball(0.08, 0x8a6a4a, torchHand[0], torchHand[1] + 0.2, torchHand[2], { delay: 1.5 });
  const torch = [
    ...flame(kit, torchHand[0], torchHand[2], torchHand[1] + 0.3, 1.55, 0.85),
    ball(0.13, ORANGE, torchHand[0], torchHand[1] + 0.22, torchHand[2], { delay: 1.52, flat: true }),
    ball(0.08, YELLOW, torchHand[0] + 0.03, torchHand[1] + 0.27, torchHand[2] + 0.07, { delay: 1.54, flat: true, noInk: true }),
  ];
  cylinder(0.05, 0.05, 0.16, BRASS, flaskHand[0], flaskHand[1] - 0.12, flaskHand[2], { delay: 1.5 }, 8);

  // The fire breath: a jet at his lips swelling into rolling fireballs that reach the pennants.
  const mouth = eater.at(0, 2.04 * u, 0.24);
  const target: Point = [1.35, G + 2.3, 0.55];
  const { length, rotation } = aim(mouth, target);
  const jet = [
    [0.13, ORANGE],
    [0.07, YELLOW],
  ].map(([r, color], i) =>
    add(new ConeGeometry(r, length * 0.4, 10).rotateX(Math.PI), color, ...mouth, { delay: 1.6 + i * 0.04, rotation, flat: true, ...(i ? { noInk: true } : {}) }),
  );
  const puffs = Array.from({ length: 10 }, (_, k) =>
    add(new SphereGeometry(1, 12, 10), [ORANGE, YELLOW, 0xe0561a][k % 3], ...mouth, { delay: 1.65 + k * 0.03, flat: true }),
  );
  const puffScale = puffs.map((puff) => puff.children.map((child) => child.scale.clone()));
  motes(14, ORANGE, 0.03, [0.6, G + 1.6, 0.0], [1.8, G + 3.2, 0.9], 1.5);
  motes(8, YELLOW, 0.025, [-0.4, G + 2.4, 0.4], [-0.1, G + 3.0, 0.7], 1.6);

  // The moon over the port.
  add(new CylinderGeometry(0.3, 0.3, 0.02, 24).rotateX(Math.PI / 2), 0xe6ecef, 1.25, G + 3.2, -1.5, { delay: 0.2, flat: true, noInk: true });

  const flickers = [...jet, ...fires.flat(), ...torch];
  const base = flickers.map((part) => part.children.map((child) => child.scale.clone()));
  tick((t) => {
    flickers.forEach((part, i) => {
      const k = 1 + Math.sin(t * 13 + i * 1.7) * 0.07 + Math.sin(t * 7.3 + i) * 0.05;
      part.children.forEach((child, j) => child.scale.set(base[i][j].x * k, base[i][j].y * (2 - k), base[i][j].z * k));
    });
    flag.rotation.y = Math.sin(t * 2.2) * 0.3;
    // The fireballs roll out along the breath, growing as they go.
    puffs.forEach((puff, k) => {
      const v = (t * 0.9 + k / puffs.length) % 1;
      const along = 0.3 + v * 0.75;
      const r = 0.09 + v * 0.26;
      puff.position.set(
        mouth[0] + (target[0] - mouth[0]) * along,
        mouth[1] + (target[1] - mouth[1]) * along + Math.sin(k * 2.3 + t * 4) * 0.05,
        mouth[2] + (target[2] - mouth[2]) * along + Math.cos(k * 1.7) * 0.06,
      );
      puff.children.forEach((child, j) => {
        child.scale.copy(puffScale[k][j]).multiplyScalar(r);
        child.position.y = -puffScale[k][j].y * r;
      });
    });
  });

  return { width: 4.9, height: 4.4, lookY: 1.55 };
}
