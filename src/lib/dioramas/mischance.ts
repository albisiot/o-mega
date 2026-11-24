import { BoxGeometry, ConeGeometry, CylinderGeometry, ExtrudeGeometry, Group, Shape, SphereGeometry, TorusGeometry } from "three";
import { INK, MAGENTA, YELLOW, aim, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { facade, floor, wallLantern } from "@/lib/diorama-props";

/**
 * Mischance (P131): the black cat that crossed the engineers' path on the night of the Ora Zero
 * pads down a cobbled alley towards us, in pieces of silver armour, amber eyes lit, violet
 * bad luck curling round his paws and glowing in his footprints. Behind him he has walked under
 * a ladder; a mirror has cracked, a flowerpot tips off a balcony, the lamp sputters, and the man
 * he just passed stares at the ice cream he dropped on the cobbles.
 */
export function mischance(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const FUR = 0x1e1a2a;
  const FUR_LIGHT = 0x2c2640;
  const SILVER = 0x9aa0b4;
  const VIOLET = 0x9b5cff;
  const WOOD = 0x6a5240;
  const F = octagonBase(kit, 0x15131c);
  const G = floor(kit, F, 0.06, 0x2a2838, 0x1c1a26, 0.3);

  // The alley: a house front, a side wall, a lantern that sputters.
  facade(kit, 0.1, -1.65, G, 0.1, { width: 2.6, height: 2.7, color: 0x2c2a48, windows: 3, floors: 2, shutters: 0x3a2a5a });
  box(0.25, 2.3, 1.8, 0x24223a, -1.72, G, -0.45, { delay: 0.12, ink: 1.02 });
  const light = wallLantern(kit, -0.95, -1.5, G + 2.05, 0.3, YELLOW);
  const fizz = [0, 1].map((k) => box(0.02, 0.14, 0.02, YELLOW, -0.95 + (k ? 0.1 : -0.1), G + 1.72, -1.28, { delay: 0.4, flat: true, noInk: true, rotation: [0, 0, k ? -0.7 : 0.7] }));

  // The ladder he walked under, against the wall.
  const LX = -0.35;
  [-0.22, 0.22].forEach((dx) => limb(kit, [LX + dx, G, -0.75], [LX + dx, G + 2.25, -1.45], 0.03, 0.03, WOOD, { delay: 0.2 }));
  for (let k = 1; k <= 6; k++) {
    const u = k / 7;
    box(0.44, 0.035, 0.035, WOOD, LX, G + 2.25 * u, -0.75 - 0.7 * u, { delay: 0.22 + k * 0.02 });
  }

  // The mirror leaning on the side wall, cracked from one point.
  const mirror = box(0.55, 0.9, 0.05, 0x5e4a3a, -1.4, G, -0.25, { delay: 0.25, rotation: [-0.12, 0.95, 0] });
  decorate(mirror, new BoxGeometry(0.45, 0.8, 0.01), 0x6a9ab0, [[0, 0.45, 0.026]]);
  decorate(
    mirror,
    new BoxGeometry(0.012, 0.3, 0.01),
    0xf2f0ff,
    [0.3, 1.2, 2.2, 3.1, 4.0, 5.2].map((a) => [0.05 + Math.sin(a) * 0.14, 0.55 + Math.cos(a) * 0.14, 0.033, -a] as [number, number, number, number]),
  );

  // A little balcony with a flowerpot about to go over, and the last one, smashed below.
  box(0.7, 0.06, 0.32, 0x3a3858, 0.85, G + 1.45, -1.34, { delay: 0.3 });
  box(0.7, 0.24, 0.02, 0x14121c, 0.85, G + 1.51, -1.19, { delay: 0.32, noInk: true });
  const pot = new Group();
  const potParts = [
    cylinder(0.11, 0.08, 0.18, 0xb0603a, 0, 0, 0, { delay: 0.5 }, 10),
    ball(0.13, 0x2f8f4f, 0, 0.14, 0, { delay: 0.55 }),
    ball(0.05, MAGENTA, 0.06, 0.32, 0.05, { delay: 0.58 }),
  ];
  potParts[0].parent?.add(pot);
  pot.add(...potParts);
  const potAt: Point = [1.05, G + 1.75, -1.12];
  [
    [0.95, 0.0, 0.3],
    [1.12, -0.18, 1.4],
    [0.85, -0.2, 2.5],
  ].forEach(([x, z, a], i) => add(new CylinderGeometry(0.1, 0.08, 0.1, 6, 1, false, 0, 2), 0xb0603a, x, G, z - 0.85, { delay: 0.45 + i * 0.02, rotation: [0.4, a, 1.2] }));
  add(new SphereGeometry(0.16, 10, 6).scale(1.3, 0.25, 1), 0x3a2a22, 0.98, G, -0.95, { delay: 0.44 });

  // The man he just passed, and his ice cream, on the ground.
  const man = figure(kit, {
    x: 1.4,
    z: 0.3,
    y: G,
    facing: -0.45,
    height: 2.3,
    build: "normal",
    skin: 0xd8a888,
    hair: { style: "short", color: 0x4a3020 },
    face: { mouth: "frown", brows: "worried" },
    top: { kind: "jacket", color: 0x3a5a7a, accent: 0xd8d2c4 },
    bottom: { kind: "trousers", color: 0x2a2a34 },
    arms: [[-0.3, 1.45, 0.42], "down"],
    delay: 0.6,
  });
  const [cx, cy, cz] = man.hands[0];
  add(new ConeGeometry(0.06, 0.2, 10).rotateX(Math.PI), 0xd8a860, cx, cy - 0.05, cz, { delay: 1.2 });
  add(new SphereGeometry(0.12, 12, 8).scale(1.3, 0.35, 1.1), 0xffb0d0, 0.95, G, 0.85, { delay: 0.7 });

  // Mischance, built in his own frame (z forward), then set down larger than life.
  const PSI = 0.7;
  const SIZE = 1.3;
  const w = (x: number, y: number, z: number): Point => [-0.45 + SIZE * (x * Math.cos(PSI) + z * Math.sin(PSI)), G + SIZE * y, 0.05 + SIZE * (-x * Math.sin(PSI) + z * Math.cos(PSI))];
  const d = (x: number, y: number, z: number): Point => [x, y, z];
  const tilt = (part: Group, x: number, z: number) => {
    part.rotation.set(x, 0, z);
    return part;
  };
  const scene = box(0.001, 0.001, 0.001, FUR, 0, G, 0, { delay: 0.8, noInk: true }).parent;
  const first = scene?.children.length ?? 0;
  add(new SphereGeometry(0.34, 16, 12).scale(0.95, 0.85, 1.9), FUR, ...d(0, 0.43, -0.2), { delay: 0.8 });
  ball(0.33, FUR, ...d(0, 0.42, 0.3), { delay: 0.82 });
  // Legs: the right fore paw lifted mid-step, silver greaves on the forelegs.
  const paw = (p: Point, delay: number) => {
    const foot = add(new SphereGeometry(0.09, 10, 8).scale(1, 0.6, 1.3), FUR_LIGHT, ...d(p[0], p[1], p[2]), { delay });
    decorate(foot, new ConeGeometry(0.014, 0.05, 4).rotateX(Math.PI / 2), VIOLET, [-0.05, 0, 0.05].map((x) => [x, 0.03, 0.12] as Point));
  };
  [
    [-0.17, 0.16, 0.66],
    [0.17, 0.0, 0.52],
  ].forEach(([x, y, z], i) => {
    limb(kit, d(x, 0.62, 0.32), d(x * 1.1, y + 0.08, z), 0.1, 0.075, FUR, { delay: 0.84 + i * 0.02 });
    limb(kit, d(x * 1.05, 0.35 + y * 0.6, 0.32 + (z - 0.32) * 0.5), d(x * 1.1, y + 0.1, z - 0.02), 0.09, 0.085, SILVER, { delay: 0.9 + i * 0.02 });
    paw([x * 1.1, y, z], 0.88 + i * 0.02);
  });
  [-0.2, 0.2].forEach((x, i) => {
    ball(0.2, FUR, ...d(x, 0.45, -0.68), { delay: 0.84 });
    limb(kit, d(x, 0.55, -0.7), d(x, 0.22, -0.9), 0.1, 0.07, FUR, { delay: 0.86 + i * 0.02 });
    limb(kit, d(x, 0.22, -0.9), d(x, 0.06, -0.72 + i * 0.12), 0.07, 0.06, FUR, { delay: 0.88 + i * 0.02 });
    paw([x, 0, -0.68 + i * 0.12], 0.9);
  });
  // Head: amber eyes with slit pupils, whiskers, ears, a pointed silver plate on the brow.
  const head = add(new SphereGeometry(0.3, 18, 14).scale(1.1, 0.95, 1.0), FUR, ...d(0, 0.84, 0.6), { delay: 1.0 });
  const eyes = decorate(head, new SphereGeometry(0.06, 12, 8).scale(1.3, 0.9, 0.4), 0xffb020, [
    [-0.12, 0.31, 0.255, -0.25],
    [0.12, 0.31, 0.255, 0.25],
  ]);
  decorate(head, new BoxGeometry(0.02, 0.085, 0.02), INK, [
    [-0.12, 0.31, 0.28],
    [0.12, 0.31, 0.28],
  ]);
  const plate = new Shape();
  plate.moveTo(-0.1, 0.1);
  plate.lineTo(0.1, 0.1);
  plate.lineTo(0.09, -0.02);
  plate.lineTo(0, -0.13);
  plate.lineTo(-0.09, -0.02);
  plate.closePath();
  decorate(head, new ExtrudeGeometry(plate, { depth: 0.03, bevelEnabled: false }), SILVER, [[0, 0.5, 0.17]]);
  const muzzle = add(new SphereGeometry(0.13, 12, 8).scale(1.3, 0.8, 1), FUR_LIGHT, ...d(0, 0.9, 0.82), { delay: 1.04 });
  decorate(muzzle, new BoxGeometry(0.06, 0.04, 0.03), 0x6a2a4a, [[0, 0.13, 0.12]]);
  decorate(muzzle, new BoxGeometry(0.32, 0.007, 0.007), 0xe8e6f0, [
    [-0.2, 0.08, 0.06, 0.12],
    [-0.2, 0.05, 0.06, -0.05],
    [0.2, 0.08, 0.06, -0.12],
    [0.2, 0.05, 0.06, 0.05],
  ]);
  [-1, 1].forEach((side) => {
    const ear = tilt(add(new ConeGeometry(0.1, 0.24, 4), FUR, ...d(side * 0.17, 1.24, 0.55), { delay: 1.06 }), -0.1, -side * 0.35);
    decorate(ear, new ConeGeometry(0.05, 0.14, 4), 0x5a2a4a, [[0, 0.09, 0.04]]);
    tilt(add(new SphereGeometry(0.17, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), SILVER, ...d(side * 0.3, 0.8, 0.35), { delay: 1.1 }), 0, -side * 0.6);
  });
  // The tail, curling up behind.
  const tailRoot = d(0, 0.78, -0.95);
  const L = 0.22;
  const tail = [0, 1, 2, 3].map((k) => limb(kit, tailRoot, [tailRoot[0], tailRoot[1] + L, tailRoot[2]], 0.06 - k * 0.01, 0.05 - k * 0.01, FUR, { delay: 1.1 + k * 0.03 }));
  const tailPoints = (t: number): Point[] => {
    const points: Point[] = [tailRoot];
    for (let k = 0; k < 4; k++) {
      // Each piece rises more steeply than the last and swings a little further to the side.
      const a = 0.35 + k * 0.42 + Math.sin(t * 1.6 - k * 0.6) * 0.08 * (k + 1);
      const side = Math.sin(t * 1.6 - k * 0.6) * 0.05 * k;
      const back = -Math.cos(a) * L;
      const [px, py, pz] = points[k];
      points.push([px + side, py + Math.sin(a) * L, pz + back]);
    }
    return points;
  };
  const placeTail = (t: number) => {
    const points = tailPoints(t);
    tail.forEach((part, k) => {
      part.position.set(...points[k]);
      part.rotation.set(...aim(points[k], points[k + 1]).rotation);
    });
  };
  placeTail(0);

  // Bad luck: violet curls round his paws, glowing footprints behind.
  const curls = [
    [0.19, 0.55],
    [-0.19, 0.68],
    [0.2, -0.6],
  ].map(([x, z], k) => add(new TorusGeometry(0.16, 0.018, 4, 20, 4.2).rotateX(Math.PI / 2), VIOLET, ...d(x, 0.005, z), { delay: 1.3 + k * 0.04, flat: true, noInk: true }));
  const prints = box(0.001, 0.001, 0.001, VIOLET, ...d(0, 0, 0), { delay: 1.35, noInk: true });
  decorate(prints, new CylinderGeometry(0.06, 0.06, 0.004, 10).scale(1, 1, 1.3), 0x6a3ab0, [
    [0.18, 0.003, -1.25],
    [-0.18, 0.003, -1.45],
    [0.18, 0.003, -1.7],
  ]);
  const cat = new Group();
  scene?.add(cat);
  cat.add(...(scene?.children.slice(first, -1) ?? []));
  cat.position.set(-0.45, G, 0.05);
  cat.rotation.y = PSI;
  cat.scale.setScalar(SIZE);
  motes(12, VIOLET, 0.025, w(-0.5, 0, -0.5), w(0.5, 1.0, 0.9), 1.4);

  tick((t) => {
    placeTail(t);
    curls.forEach((curl, k) => (curl.rotation.y = t * (k % 2 ? -1.5 : 1.2)));
    // He blinks; the lantern sputters (lit at the start); the flowerpot tips and drops.
    eyes.visible = t % 4 < 3.85;
    const off = Math.floor(t * 8) % 11 === 4 || Math.floor(t * 8) % 17 === 9;
    light.visible = !off;
    fizz.forEach((spark) => (spark.visible = off));
    const v = (t % 3.5) / 3.5;
    if (v < 0.35) {
      pot.position.set(...potAt);
      pot.rotation.z = -0.15 - Math.sin(v * 40) * 0.08;
      pot.visible = true;
    } else if (v < 0.55) {
      const f = (v - 0.35) / 0.2;
      pot.position.set(potAt[0] + f * 0.1, potAt[1] - (potAt[1] - G) * f * f, potAt[2] + f * 0.15);
      pot.rotation.z = -0.15 - f * 2.5;
    } else pot.visible = false;
  });

  return { width: 4.9, height: 4.3, lookY: 1.4 };
}
