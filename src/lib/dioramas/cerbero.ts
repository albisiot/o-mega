import { BoxGeometry, ConeGeometry, CylinderGeometry, ExtrudeGeometry, Shape, SphereGeometry, TorusGeometry, type Group } from "three";
import { INK, ORANGE, aim, archMouth, archedWall, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, rubble } from "@/lib/diorama-props";

/**
 * Cerbero (P087): the three-headed dog of the necropolis under the metro stands on the tracks
 * by a tunnel mouth and an old shrine, one studded collar round all three necks, a broken chain
 * hanging from it, orange eyes burning. The two side heads snap at each other over the same
 * dented bowl, with one bone in it, while the middle one growls at us.
 */
export function cerbero(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const FUR = 0x262540;
  const FUR_LIGHT = 0x37355a;
  const MANE = 0x7a2a5e;
  const STONE = 0x5d6680;
  const IVORY = 0xe8e0d0;
  const F = octagonBase(kit, 0x15131c);
  const G = floor(kit, F, 0.06, 0x2a2632, 0x1e1a26, 0.45);

  // The tunnel mouth, its lamps going off into the dark, and the tracks running out of it.
  const TX = 0.9;
  const dark = add(archMouth(0.45, 0.95), 0x08070c, TX, G, -1.72, { delay: 0.08, flat: true, noInk: true });
  decorate(dark, new BoxGeometry(0.05, 0.04, 0.01), ORANGE, [
    [-0.3, 0.9, 0.025],
    [0.3, 0.9, 0.025],
    [-0.16, 0.98, 0.025],
    [0.16, 0.98, 0.025],
    [0, 1.02, 0.025],
  ]);
  const arch = add(archedWall(1.3, 2.1, 0.3, { x: 0, half: 0.45, spring: 0.95 }), 0x3a2a40, TX, G, -1.55, { delay: 0.1, ink: 1.02 });
  decorate(
    arch,
    new BoxGeometry(0.07, 0.15, 0.01),
    0x6a3060,
    Array.from({ length: 9 }, (_, k) => (k / 8) * Math.PI).map((a) => [Math.cos(a) * 0.53, 0.95 + Math.sin(a) * 0.53, 0.152, a - Math.PI / 2] as [number, number, number, number]),
  );
  const bed = box(0.6, 0.02, 2.85, 0x1a1820, TX, G, -0.05, { delay: 0.12, noInk: true });
  decorate(bed, new BoxGeometry(0.55, 0.012, 0.08), 0x3e3028, Array.from({ length: 11 }, (_, k) => [0, 0.02, -1.3 + k * 0.26] as Point));
  [-0.18, 0.18].forEach((dx, i) => box(0.04, 0.06, 2.85, 0x6a7080, TX + dx, G + 0.02, -0.05, { delay: 0.15 + i * 0.03 }));

  // An old shrine of the necropolis with a faceless statue in it.
  const AF = 0.7;
  const ax = (lx: number, ly: number, lz: number): Point => [-1.6 + lx * Math.cos(AF) + lz * Math.sin(AF), G + ly, -0.55 - lx * Math.sin(AF) + lz * Math.cos(AF)];
  const rot: [number, number, number] = [0, AF, 0];
  box(0.9, 0.3, 0.6, 0x46506a, ...ax(0, 0, 0), { delay: 0.2, rotation: rot });
  box(0.8, 1.3, 0.08, 0x343c52, ...ax(0, 0.3, -0.25), { delay: 0.22, rotation: rot });
  [-0.35, 0.35].forEach((lx, i) => cylinder(0.06, 0.07, 1.3, STONE, ...ax(lx, 0.3, 0.18), { delay: 0.24 + i * 0.02 }, 10));
  box(0.95, 0.08, 0.65, 0x46506a, ...ax(0, 1.6, 0), { delay: 0.28, rotation: rot });
  const gable = new Shape();
  gable.moveTo(-0.48, 0);
  gable.lineTo(0.48, 0);
  gable.lineTo(0, 0.3);
  gable.closePath();
  add(new ExtrudeGeometry(gable, { depth: 0.5, bevelEnabled: false }).translate(0, 0, -0.25), STONE, ...ax(0, 1.68, 0), { delay: 0.3, rotation: rot });
  const [sx, , sz] = ax(0, 0, -0.02);
  figure(kit, {
    x: sx,
    z: sz,
    y: G + 0.3,
    facing: AF,
    height: 1.2,
    skin: STONE,
    face: { blank: true },
    headwear: { kind: "hood", color: STONE },
    top: { kind: "robe", color: STONE },
    shoes: STONE,
    arms: ["crossed", "crossed"],
    delay: 0.32,
  });
  rubble(kit, -1.0, -1.25, G, 0.4, 5, 0.4);

  // Cerbero, in his own frame: body, legs, tail.
  const DF = 0.3;
  const c = Math.cos(DF);
  const s = Math.sin(DF);
  const d = (lx: number, ly: number, lz: number): Point => [-0.25 + lx * c + lz * s, G + ly, 0.15 - lx * s + lz * c];
  const turn: [number, number, number] = [0, DF, 0];
  add(new SphereGeometry(0.5, 16, 12).scale(1.05, 0.85, 1.45), FUR, ...d(0, 0.45, -0.45), { delay: 0.5, rotation: turn });
  ball(0.5, FUR, ...d(0, 0.55, 0.12), { delay: 0.55 });
  [-1, 1].forEach((side, i) => {
    const D = 0.6 + i * 0.03;
    ball(0.3, FUR, ...d(side * 0.3, 0.5, -0.85), { delay: D });
    limb(kit, d(side * 0.3, 0.85, 0.22), d(side * 0.36, 0.12, 0.45), 0.19, 0.14, FUR, { delay: D + 0.04 });
    const hock = d(side * 0.38, 0.32, -1.12);
    limb(kit, d(side * 0.36, 0.7, -0.95), hock, 0.18, 0.12, FUR, { delay: D + 0.06 });
    limb(kit, hock, d(side * 0.37, 0.12, -0.9), 0.11, 0.1, FUR, { delay: D + 0.08 });
    [0.5, -0.88].forEach((z, j) => {
      add(new SphereGeometry(0.15, 12, 8).scale(1, 0.55, 1.25), FUR_LIGHT, ...d(side * 0.37, 0, z), { delay: D + 0.1 + j * 0.02, rotation: turn });
      [-0.07, 0, 0.07].forEach((dx) => add(new ConeGeometry(0.025, 0.09, 5).rotateX(Math.PI / 2), IVORY, ...d(side * 0.37 + dx, 0.02, z + 0.17), { delay: D + 0.14, rotation: turn }));
    });
  });
  const tailFrom = d(0, 1.0, -1.12);
  const tailTo = (t: number) => d(Math.sin(t * 7) * 0.22, 1.55, -1.45);
  const tail = limb(kit, tailFrom, tailTo(0), 0.08, 0.03, FUR, { delay: 0.75 });

  // Three necks out of one shaggy chest.
  limb(kit, d(0, 1.25, 0.15), d(0, 1.8, 0.45), 0.23, 0.2, FUR, { delay: 0.8 });
  [-1, 1].forEach((side) => limb(kit, d(side * 0.32, 1.2, 0.1), d(side * 0.62, 1.58, 0.42), 0.22, 0.19, FUR, { delay: 0.82 }));
  [
    [0, 1.62, 0.18, 0, 1, -0.5],
    [0.56, 1.12, 0.22, 1, 0.6, 0.2],
    [-0.56, 1.12, 0.22, -1, 0.6, 0.2],
    [0.48, 1.4, 0.0, 0.8, 1, -0.3],
    [-0.48, 1.4, 0.0, -0.8, 1, -0.3],
    [0.5, 0.85, 0.35, 1, 0.1, 0.3],
    [-0.5, 0.85, 0.35, -1, 0.1, 0.3],
  ].forEach(([lx, ly, lz, ox, oy, oz], i) => {
    const p = d(lx, ly, lz);
    const q = d(lx + ox, ly + oy, lz + oz);
    add(new ConeGeometry(0.1, 0.34, 5), i % 2 ? MANE : 0x5a2a66, ...p, { delay: 0.85 + i * 0.02, rotation: aim(p, q).rotation });
  });

  // A head: skull, muzzle with fangs, a jaw hinged at the back, burning eyes, ears.
  const head = (C: Point, yaw: number, delay: number) => {
    const hx = (lx: number, ly: number, lz: number): Point => [C[0] + lx * Math.cos(yaw) + lz * Math.sin(yaw), C[1] + ly, C[2] - lx * Math.sin(yaw) + lz * Math.cos(yaw)];
    const yxz = (part: Group, x: number, z: number) => {
      part.rotation.order = "YXZ";
      part.rotation.set(x, yaw, z);
      return part;
    };
    const parts = [ball(0.25, FUR, C[0], C[1] - 0.25, C[2], { delay })];
    const snout = yxz(box(0.24, 0.17, 0.34, FUR_LIGHT, ...hx(0, -0.17, 0.27), { delay: delay + 0.03 }), 0, 0);
    decorate(snout, new ConeGeometry(0.022, 0.1, 5).rotateX(Math.PI), IVORY, [
      [-0.08, -0.04, 0.13],
      [0.08, -0.04, 0.13],
    ]);
    const jaw = yxz(add(new BoxGeometry(0.2, 0.07, 0.32).translate(0, 0, 0.16), 0x1e1c30, ...hx(0, -0.29, 0.12), { delay: delay + 0.05 }), 0.3, 0);
    decorate(jaw, new ConeGeometry(0.02, 0.08, 5), IVORY, [
      [-0.07, 0.1, 0.27],
      [0.07, 0.1, 0.27],
    ]);
    parts.push(snout, jaw, ball(0.085, 0x8a1a3a, ...hx(0, -0.3, 0.22), { delay: delay + 0.04 }), ball(0.06, INK, ...hx(0, -0.05, 0.43), { delay: delay + 0.06 }));
    parts.push(yxz(box(0.28, 0.06, 0.09, FUR, ...hx(0, 0.08, 0.21), { delay: delay + 0.04 }), 0, 0));
    [-1, 1].forEach((side) => {
      parts.push(yxz(box(0.085, 0.042, 0.02, ORANGE, ...hx(side * 0.095, 0.02, 0.235), { delay: delay + 0.08, flat: true, noInk: true }), 0, side * 0.3));
      parts.push(yxz(add(new ConeGeometry(0.08, 0.24, 6), FUR, ...hx(side * 0.14, 0.12, -0.05), { delay: delay + 0.06 }), -0.25, -side * 0.35));
    });
    return { parts, jaw, rest: parts.map((part) => part.position.clone()) };
  };
  const middle = head(d(0, 1.88, 0.52), DF, 1.0);
  const left = head(d(0.7, 1.64, 0.48), DF - 0.85, 1.05);
  const right = head(d(-0.7, 1.64, 0.48), DF + 0.85, 1.1);

  // One collar for three necks, studded, and the broken chain.
  const collar = add(new TorusGeometry(0.54, 0.07, 8, 36).rotateX(Math.PI / 2).scale(1, 1, 0.85), 0x3a3040, ...d(0, 1.3, 0.15), { delay: 1.2, rotation: turn });
  decorate(collar, new SphereGeometry(0.032, 8, 6), 0xa0a8b8, Array.from({ length: 10 }, (_, k) => (k / 10) * Math.PI * 2).map((a) => [Math.sin(a) * 0.54, 0.07, Math.cos(a) * 0.46] as Point));
  for (let k = 0; k < 4; k++) {
    const link = k === 3 ? new TorusGeometry(0.06, 0.018, 6, 12, 4.4) : new TorusGeometry(0.06, 0.018, 6, 12);
    add(link.scale(1, 1.5, 1), 0x8a90a0, ...d(0, 1.2 - k * 0.16, 0.68 + k * 0.01), { delay: 1.25 + k * 0.03, rotation: [0, DF + (k % 2 ? Math.PI / 2 : 0), k === 3 ? 0.5 : 0] });
  }

  // The bowl, dented and cracked, one bone in it.
  const bowl = d(0, 0, 1.2);
  const dish = cylinder(0.3, 0.24, 0.13, 0x7a8090, ...bowl, { delay: 0.9 }, 20);
  decorate(dish, new CylinderGeometry(0.25, 0.25, 0.01, 20), 0x2a2a34, [[0, 0.131, 0]]);
  decorate(dish, new TorusGeometry(0.29, 0.018, 6, 24).rotateX(Math.PI / 2), 0x9aa0ac, [[0, 0.13, 0]]);
  decorate(dish, new BoxGeometry(0.014, 0.09, 0.01), INK, [
    [0.09, 0.07, 0.262, 0.4],
    [0.115, 0.03, 0.255, -0.3],
  ]);
  const BONE = 0.6;
  add(new CylinderGeometry(0.03, 0.03, 0.3, 8).rotateZ(Math.PI / 2), IVORY, bowl[0], G + 0.12, bowl[2], { delay: 0.95, rotation: [0, BONE, 0] });
  [-1, 1].forEach((end) =>
    [-1, 1].forEach((side) => ball(0.04, IVORY, bowl[0] + end * 0.15 * Math.cos(BONE) + side * 0.03 * Math.sin(BONE), G + 0.12, bowl[2] - end * 0.15 * Math.sin(BONE) + side * 0.03 * Math.cos(BONE), { delay: 0.98 })),
  );

  const inward: Point = [-c, 0, s];
  tick((t) => {
    // The side heads snap at each other in turn and lunge for the bowl; the middle one growls; the tail wags.
    [left, right].forEach((h, k) => {
      const bite = Math.max(0, Math.sin(t * 3 + k * Math.PI));
      const sign = k ? -1 : 1;
      h.jaw.rotation.x = 0.3 + bite * 0.5;
      h.parts.forEach((part, i) => part.position.set(h.rest[i].x + inward[0] * sign * bite * 0.08, h.rest[i].y - bite * 0.05, h.rest[i].z + inward[2] * sign * bite * 0.08));
    });
    middle.jaw.rotation.x = 0.45 + Math.sin(t * 20) * 0.02;
    tail.rotation.set(...aim(tailFrom, tailTo(t)).rotation);
  });

  return { width: 4.9, height: 4.3, lookY: 1.4 };
}
