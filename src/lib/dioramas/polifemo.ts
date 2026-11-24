import { BoxGeometry, ConeGeometry, CylinderGeometry, ExtrudeGeometry, Shape, SphereGeometry, TorusGeometry, Vector2 } from "three";
import { INK, YELLOW, aim, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { bollard, column, crate } from "@/lib/diorama-props";

/**
 * Polifemo (P089): the one-eyed giant of the Compagnia Lete stands on the quay with a ship's
 * anchor on a chain over his shoulder, ruined temple columns in the water behind him, his single
 * yellow eye sweeping from side to side. The price: behind his back, where he can't see, a little
 * thief tiptoes away with one of the crates he is supposed to be guarding.
 */
export function polifemo(kit: Kit): Framing {
  const { add, box, decorate, tick } = kit;
  const SKIN = 0x9a8090;
  const STONE = 0x3a3e4e;
  const IRON = 0x4c4a5e;
  const CHAIN = 0x6a7080;
  const F = octagonBase(kit, 0x135a78);

  // The quay: the octagon cut along the waterline, a step above the water.
  const ZW = -0.78;
  const ring = Array.from({ length: 8 }, (_, k) => [2.36 * Math.sin(Math.PI / 8 + (k * Math.PI) / 4), 2.36 * Math.cos(Math.PI / 8 + (k * Math.PI) / 4)]);
  const edge: [number, number][] = [];
  ring.forEach((p, k) => {
    const q = ring[(k + 1) % 8];
    if (p[1] >= ZW) edge.push([p[0], p[1]]);
    if (p[1] >= ZW !== q[1] >= ZW) edge.push([p[0] + ((q[0] - p[0]) * (ZW - p[1])) / (q[1] - p[1]), ZW]);
  });
  const quay = add(new ExtrudeGeometry(new Shape(edge.map(([x, z]) => new Vector2(x, -z))), { depth: 0.2, bevelEnabled: false }).rotateX(-Math.PI / 2), STONE, 0, F, 0, { delay: 0.05, ink: 1.01 });
  [-0.45, 0.05, 0.55, 1.05, 1.55].forEach((z) => {
    const half = Math.min(2.1, 2.95 - Math.abs(z));
    decorate(quay, new BoxGeometry(2 * half, 0.004, 0.015), 0x2a2d3a, [[0, 0.202, z]]);
  });
  const kerb = edge.filter(([, z]) => z === ZW).map(([x]) => x);
  box(Math.abs(kerb[1] - kerb[0]) - 0.1, 0.05, 0.14, 0x5a6070, (kerb[0] + kerb[1]) / 2, F + 0.2, ZW + 0.07, { delay: 0.1 });
  const G = F + 0.2;

  // Ruins in the harbour water, rings spreading round them.
  column(kit, -0.95, -1.45, F, 0.15, 1.8, true, 0x5a7090);
  column(kit, 0.5, -1.62, F, 0.2, 2.6, false, 0x5a7090);
  column(kit, 1.25, -1.3, F, 0.24, 2.6, false, 0x5a7090);
  box(1.15, 0.24, 0.42, 0x6a80a0, 0.875, F + 2.66, -1.46, { delay: 0.35, rotation: [0, -0.405, 0] });
  [
    [-0.95, -1.45, 0],
    [0.15, -1.3, 1.1],
    [1.6, -0.95, 0.5],
  ].forEach(([x, z, phase], i) => {
    const ripple = add(new TorusGeometry(0.22, 0.022, 6, 32).rotateX(Math.PI / 2), 0xcfeef7, x, F + 0.002, z, { delay: 0.5 + i * 0.05, flat: true, noInk: true });
    const mesh = ripple.children[0];
    tick((t) => {
      const u = (t / 2.6 + phase) % 1;
      mesh.scale.set(0.5 + u, 1, 0.5 + u);
    });
  });
  bollard(kit, 1.55, 0.75, G, 0.4);
  add(new TorusGeometry(0.16, 0.05, 8, 20).rotateX(Math.PI / 2), 0xc9a46a, 1.35, G, 1.15, { delay: 0.45 });

  // The crates he is guarding, behind him.
  crate(kit, 0.55, -0.62, G, 0.3, 0.42, 0x5e4a3a, 0.2);
  crate(kit, 0.57, -0.62, G + 0.42, 0.35, 0.36, 0x6b5442, -0.15);
  crate(kit, 1.05, -0.72, G, 0.38, 0.38, 0x5e4a3a, 0.5);

  // The thief tiptoeing off with one, out of the giant's sight.
  const thief = figure(kit, {
    x: 1.45,
    z: -0.25,
    y: G,
    facing: 1.2,
    height: 2.0,
    build: "slim",
    skin: 0xd8a888,
    hair: { style: "short", color: 0x2a1e1c },
    face: { mouth: "smirk", brows: "raised" },
    headwear: { kind: "beanie", color: 0x23222b, accent: 0x7a2f55 },
    top: { kind: "shirt", color: 0x7a2f55 },
    bottom: { kind: "trousers", color: 0x23404b },
    shoes: 0x16171e,
    arms: ["forward", "forward"],
    legs: "stride",
    delay: 1.6,
  });
  const [l, r] = thief.hands;
  const loot = box(0.4, 0.3, 0.3, 0x6b5442, (l[0] + r[0]) / 2, (l[1] + r[1]) / 2 - 0.15, (l[2] + r[2]) / 2, { delay: 1.9, rotation: [0, 1.2, 0] });
  decorate(loot, new BoxGeometry(0.36, 0.025, 0.01), 0x3e3028, [
    [0, 0.09, 0.152],
    [0, 0.21, 0.152],
  ]);
  const sneak = [...thief.parts, loot];
  const sneakRest = sneak.map((part) => part.position.y);

  // Polifemo: bald, a black beard, a torn vest, one eye.
  const FACE = 0.3;
  const giant = figure(kit, {
    x: -0.45,
    z: 0.35,
    y: G,
    facing: FACE,
    height: 3.3,
    build: "broad",
    skin: SKIN,
    hair: { style: "bald", color: 0x1a1820 },
    face: { blank: true },
    top: { kind: "jacket", color: 0x2f5866, accent: 0x7a6474, sleeves: "short" },
    bottom: { kind: "trousers", color: 0x34485a },
    shoes: 0x2a2622,
    belt: 0x3a2a22,
    arms: [[-0.72, 2.7, 0.42], "down"],
    delay: 0.7,
  });
  const at = giant.at;
  const turn: [number, number, number] = [0, FACE, 0];
  const head = giant.headPart;
  const RH = giant.headRadius;
  const cy = RH * 1.06;
  decorate(head, new CylinderGeometry(0.12, 0.12, 0.02, 22).rotateX(Math.PI / 2), 0xf2eee0, [[0, cy + 0.05, 0.3]]);
  decorate(head, new CylinderGeometry(0.08, 0.08, 0.02, 18).rotateX(Math.PI / 2), YELLOW, [[0, cy + 0.05, 0.313]]);
  decorate(head, new BoxGeometry(0.026, 0.12, 0.01), INK, [[0, cy + 0.05, 0.325]]);
  decorate(head, new BoxGeometry(0.17, 0.055, 0.05), 0x1a1820, [
    [-0.08, cy + 0.18, 0.26, -0.25],
    [0.08, cy + 0.18, 0.26, 0.25],
  ]);
  decorate(head, new BoxGeometry(0.08, 0.1, 0.08), 0x8a6a7a, [[0, cy - 0.1, 0.29]]);
  decorate(head, new SphereGeometry(0.07, 10, 8), SKIN, [
    [-0.3, cy, 0],
    [0.3, cy, 0],
  ]);
  decorate(head, new BoxGeometry(0.22, 0.05, 0.06), 0x1a1820, [[0, cy - 0.15, 0.26]]);
  const [hx, hy, hz] = giant.head;
  const beard = add(new SphereGeometry(0.29, 14, 10).scale(1.05, 1.33, 0.78), 0x1a1820, hx + 0.18 * Math.sin(FACE), hy - 0.85, hz + 0.18 * Math.cos(FACE), { delay: 1.2, rotation: turn });
  const beardRest = beard.position.clone();
  [-1, 1].forEach((side) =>
    [0, 1].forEach((k) => {
      const p = at(side * (0.72 + k * 0.08), 2.28 - k * 0.05, 0.05 - k * 0.12);
      add(new ConeGeometry(0.07, 0.24, 5), 0x2f5866, ...p, { delay: 1.15, rotation: aim(p, at(side * (1.3 + k * 0.2), 1.2, 0.1)).rotation });
    }),
  );

  // The anchor, standing on its crown in front of him.
  const AX = -0.98;
  const AZ = 0.7;
  box(0.12, 1.42, 0.12, IRON, ...at(AX, 0.08, AZ), { delay: 1.3, rotation: turn });
  add(new TorusGeometry(0.11, 0.03, 6, 16), IRON, ...at(AX, 1.48, AZ), { delay: 1.35, rotation: turn });
  box(0.08, 0.08, 0.6, IRON, ...at(AX, 1.26, AZ), { delay: 1.36, rotation: turn });
  add(new TorusGeometry(0.45, 0.065, 8, 20, Math.PI).rotateZ(Math.PI), IRON, ...at(AX, 0, AZ), { delay: 1.32, rotation: turn });
  [-1, 1].forEach((side) => {
    const fluke = add(new ConeGeometry(0.12, 0.26, 4).scale(1, 1, 0.35), IRON, ...at(AX + side * 0.45, 0.36, AZ), { delay: 1.38 });
    fluke.rotation.order = "YXZ";
    fluke.rotation.set(0, FACE, -side * 0.35);
  });

  // The chain: from the anchor's ring up to his fist and over his shoulder.
  const [fist] = giant.hands;
  const path: Point[] = [at(AX, 1.66, AZ), at(-0.92, 2.1, 0.62), fist, at(-0.66, 2.74, 0.0), at(-0.6, 2.55, -0.36), at(-0.52, 2.1, -0.5)];
  const links = [new TorusGeometry(0.065, 0.022, 6, 12).scale(1, 1.45, 1), new TorusGeometry(0.065, 0.022, 6, 12).rotateY(Math.PI / 2).scale(1, 1.45, 1)];
  let n = 0;
  path.slice(1).forEach((q, k) => {
    const p = path[k];
    const { length, rotation } = aim(p, q);
    const count = Math.max(1, Math.round(length / 0.14));
    for (let i = 0; i < count; i++) {
      const v = i / count;
      add(links[n % 2].clone(), CHAIN, p[0] + (q[0] - p[0]) * v, p[1] + (q[1] - p[1]) * v, p[2] + (q[2] - p[2]) * v, { delay: 1.4 + n * 0.015, rotation });
      n++;
    }
  });

  tick((t) => {
    // His eye sweeps the quay, never quite far enough round; the thief tiptoes.
    const a = Math.sin(t * 0.6) * 0.3;
    head.rotation.y = FACE + a;
    beard.rotation.y = FACE + a;
    const dx = beardRest.x - hx;
    const dz = beardRest.z - hz;
    beard.position.set(hx + dx * Math.cos(a) + dz * Math.sin(a), beardRest.y, hz - dx * Math.sin(a) + dz * Math.cos(a));
    const hop = Math.abs(Math.sin(t * 4)) * 0.04;
    sneak.forEach((part, i) => (part.position.y = sneakRest[i] + hop));
  });

  return { width: 4.9, height: 4.6, lookY: 1.9 };
}
