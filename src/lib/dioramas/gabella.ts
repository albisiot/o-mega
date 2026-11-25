import { BoxGeometry, CylinderGeometry, ExtrudeGeometry, Group, Shape, SphereGeometry, TorusGeometry } from "three";
import { CYAN, MAGENTA, cable, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { bollard, towerCrane } from "@/lib/diorama-props";

/**
 * Gabella (P237): the empire's tithe collector, now taking mooring dues on the quay. She sits in
 * a high-backed chair at her toll desk, round glasses, grey bun, black robe and a heavy gold chain
 * of office, one hand on the ledger and the other on the abacus, whose bead clicks back and forth.
 * A fishing boat rocks below the quay, its mooring rope padlocked to the bollard until it pays.
 * She can carry nothing and goes nowhere fast: her takings ride on a trolley, her cane leans on
 * the desk.
 */
export function gabella(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const WATER = 0x0e3a4e;
  const FOAM = 0xcfeef7;
  const STONE = 0x464a5c;
  const WOOD = 0x3a2a22;
  const GOLD = 0xc9a040;
  const ROBE = 0x1e2a30;
  const ROPE = 0x8a90a8;
  const F = octagonBase(kit, WATER);

  // The quay: the base's octagon cut along x = −1, raised above the water.
  const corners = Array.from({ length: 8 }, (_, k) => [2.3 * Math.cos(Math.PI / 8 + (k * Math.PI) / 4), 2.3 * Math.sin(Math.PI / 8 + (k * Math.PI) / 4)]);
  const kept: [number, number][] = [];
  corners.forEach(([x, z], k) => {
    const [nx, nz] = corners[(k + 1) % 8];
    if (x >= -1) kept.push([x, z]);
    if (x >= -1 !== nx >= -1) kept.push([-1, z + ((nz - z) * (-1 - x)) / (nx - x)]);
  });
  const outline = new Shape();
  kept.forEach(([x, z], k) => (k ? outline.lineTo(x, z) : outline.moveTo(x, z)));
  outline.closePath();
  const quay = add(new ExtrudeGeometry(outline, { depth: 0.25, bevelEnabled: false }).rotateX(Math.PI / 2), STONE, 0, F, 0, { delay: 0.06, ink: 1.01 });
  const G = F + 0.25;
  const inner = 2.06;
  const half = (d: number) => Math.min(inner, inner * Math.SQRT2 - Math.abs(d));
  for (let x = -0.5; x < 2.1; x += 0.5) decorate(quay, new BoxGeometry(0.012, 0.004, 2 * half(x)), 0x30323f, [[x, 0.252, 0]]);
  for (let z = -1.5; z < 1.6; z += 0.5) decorate(quay, new BoxGeometry(half(z) + 1, 0.004, 0.012), 0x30323f, [[(half(z) - 1) / 2, 0.252, z]]);
  box(0.2, 0.06, 4.0, 0x5a5e72, -0.9, G, 0, { delay: 0.1 });

  // The fishing boat below the quay, rocking.
  const hullShape = (s: number) => {
    const shape = new Shape();
    shape.moveTo(1.2 * s, -0.42 * s);
    shape.lineTo(-0.5 * s, -0.42 * s);
    shape.quadraticCurveTo(-1.05 * s, -0.36 * s, -1.3 * s, 0);
    shape.quadraticCurveTo(-1.05 * s, 0.36 * s, -0.5 * s, 0.42 * s);
    shape.lineTo(1.2 * s, 0.42 * s);
    shape.quadraticCurveTo(1.3 * s, 0, 1.2 * s, -0.42 * s);
    return shape;
  };
  const hull = (s: number, depth: number) => new ExtrudeGeometry(hullShape(s), { depth, bevelEnabled: false, curveSegments: 10 }).rotateX(Math.PI / 2);
  const BX = -1.62;
  const BZ = 0.1;
  const along: { delay: number; rotation: [number, number, number] } = { delay: 0.2, rotation: [0, Math.PI / 2, 0] };
  const boat = [
    add(hull(0.7, 0.15), 0x1e1c30, BX, F - 0.05, BZ, along),
    add(hull(0.8, 0.36), 0x2e2a5a, BX, F + 0.05, BZ, { ...along, delay: 0.22 }),
    add(hull(0.81, 0.05), CYAN, BX, F + 0.2, BZ, { ...along, delay: 0.24, flat: true, noInk: true }),
    add(hull(0.82, 0.05), 0xe0dacb, BX, F + 0.4, BZ, { ...along, delay: 0.26 }),
  ];
  const cabin = box(0.45, 0.4, 0.42, 0xe0dacb, BX, F + 0.44, BZ - 0.45, { delay: 0.3 });
  decorate(cabin, new BoxGeometry(0.26, 0.1, 0.01), CYAN, [[0, 0.28, 0.211]]);
  boat.push(cabin, box(0.5, 0.04, 0.48, 0x23222b, BX, F + 0.84, BZ - 0.45, { delay: 0.32 }));
  boat.push(cylinder(0.025, 0.03, 0.9, 0x23222b, BX, F + 0.44, BZ + 0.3, { delay: 0.34 }, 8));
  boat.push(box(0.2, 0.12, 0.01, MAGENTA, BX + 0.1, F + 1.18, BZ + 0.3, { delay: 0.36, flat: true }));
  const rock = new Group();
  rock.position.set(BX, F, BZ);
  boat[0].parent?.add(rock);
  boat.forEach((part) => {
    part.position.sub(rock.position);
    rock.add(part);
  });
  const wave = add(new TorusGeometry(0.5, 0.018, 6, 36).rotateX(Math.PI / 2).scale(0.8, 1, 2.2), FOAM, BX, F + 0.002, BZ, { delay: 0.4, flat: true, noInk: true });

  // The bollard, the mooring rope, and the padlocked chain round both.
  bollard(kit, -0.72, 0.6, G, 0.4);
  cable(kit, [[-0.72, G + 0.12, 0.6], [-1.1, F + 0.25, 0.78], [BX + 0.05, F + 0.44, BZ + 0.82]], 0.025, ROPE, 0.5);
  [0, 1, 2, 3].forEach((k) =>
    add(new TorusGeometry(0.035, 0.012, 6, 10), 0x8a93a3, -0.72 + Math.sin(k * 0.9 - 1.2) * 0.1, G + 0.08 - k * 0.025, 0.6 + Math.cos(k * 0.9 - 1.2) * 0.1, {
      delay: 0.55 + k * 0.02,
      rotation: [0, k * 0.9, k % 2 ? 1.2 : 0],
    }),
  );
  const padlock = box(0.12, 0.11, 0.06, GOLD, -0.62, G - 0.06, 0.74, { delay: 0.62, rotation: [0, -0.3, 0] });
  decorate(padlock, new TorusGeometry(0.04, 0.012, 6, 12, Math.PI), 0x8a93a3, [[0, 0.11, 0]]);
  decorate(padlock, new BoxGeometry(0.02, 0.035, 0.01), 0x23222b, [[0, 0.05, 0.031]]);

  // The crane behind the toll desk.
  const warning = towerCrane(kit, 1.55, -1.25, G, 0.3, 3.0, -1.5, 0x3a4a6a);

  // Her chair, her desk with its ledger and abacus.
  const facing = 0.3;
  const X = 0.55;
  const Z = -0.25;
  const at = (lx: number, ly: number, lz: number): Point => [X + lx * Math.cos(facing) + lz * Math.sin(facing), G + ly, Z - lx * Math.sin(facing) + lz * Math.cos(facing)];
  const o = (delay: number, extra = {}) => ({ delay, rotation: [0, facing, 0] as [number, number, number], ...extra });
  box(0.62, 0.5, 0.55, WOOD, ...at(0, 0, 0.12), o(0.5));
  const back = box(0.72, 1.75, 0.1, WOOD, ...at(0, 0, -0.42), o(0.52));
  decorate(back, new BoxGeometry(0.5, 1.1, 0.01), 0x5a2a3a, [[0, 1.05, 0.051]]);
  [-1, 1].forEach((side) => ball(0.06, GOLD, ...at(side * 0.33, 1.75, -0.42), o(0.56)));
  const top = box(1.25, 0.06, 0.6, WOOD, ...at(0, 0.76, 0.62), o(0.6));
  decorate(top, new BoxGeometry(0.08, 0.065, 0.08), GOLD, [
    [-0.6, 0.0, 0.28],
    [0.6, 0.0, 0.28],
  ]);
  const panel = box(1.25, 0.72, 0.05, 0x2e2019, ...at(0, 0.04, 0.9), o(0.62));
  decorate(panel, new BoxGeometry(1.0, 0.03, 0.01), GOLD, [
    [0, 0.12, 0.026],
    [0, 0.6, 0.026],
  ]);
  [-0.55, 0.55].forEach((lx, i) => box(0.06, 0.76, 0.06, WOOD, ...at(lx, 0, 0.4), o(0.6 + i * 0.02)));
  const ledger = box(0.42, 0.11, 0.32, 0x3a2430, ...at(-0.28, 0.82, 0.6), o(0.7));
  decorate(ledger, new BoxGeometry(0.4, 0.07, 0.01), 0xe8e2d0, [[0, 0.055, 0.161]]);
  decorate(ledger, new BoxGeometry(0.05, 0.05, 0.02), GOLD, [[0, 0.055, 0.17]]);
  const abacus = box(0.5, 0.03, 0.3, WOOD, ...at(0.32, 0.82, 0.6), o(0.72));
  decorate(abacus, new BoxGeometry(0.03, 0.12, 0.3), WOOD, [
    [-0.24, 0.06, 0],
    [0.24, 0.06, 0],
  ]);
  const rods = [-0.1, -0.03, 0.04, 0.11];
  decorate(abacus, new CylinderGeometry(0.007, 0.007, 0.46, 6).rotateZ(Math.PI / 2), 0x8a93a3, rods.map((z) => [0, 0.08, z] as Point));
  const bead = new SphereGeometry(0.03, 8, 6).scale(0.7, 1, 1);
  rods.forEach((z, r) =>
    decorate(
      abacus,
      bead,
      r % 2 ? CYAN : MAGENTA,
      [-0.19, -0.13, -0.07, 0.15].slice(0, 3 + (r % 2)).map((x) => [x + r * 0.02, 0.08, z] as Point),
    ),
  );
  decorate(abacus, bead, GOLD, [[0.1, 0.08, -0.03]]);
  const counted = abacus.children[abacus.children.length - 1];

  // Gabella in the chair: grey bun, round gold glasses, black robe.
  figure(kit, {
    x: X,
    z: Z,
    y: G,
    facing,
    height: 2.3,
    build: "heavy",
    skin: 0xe0b8a0,
    hair: { style: "bun", color: 0xb8bcc8 },
    face: { mouth: "frown", brows: "angry", glasses: "round", glassesColor: GOLD },
    top: { kind: "robe", color: ROBE },
    arms: [
      [-0.3, 0.99, 0.56],
      [0.32, 0.97, 0.56],
    ],
    legs: "sit",
    delay: 0.9,
  });
  // A high collar open at the front, lined, and the chain of office.
  const collar = new CylinderGeometry(0.2, 0.17, 0.3, 16, 1, true, 0.9, Math.PI * 2 - 1.8);
  add(collar, ROBE, ...at(0, 1.2, -0.01), o(1.3));
  add(collar.clone().scale(-0.95, 1, 0.95), 0x2c3c44, ...at(0, 1.2, -0.01), o(1.3, { noInk: true }));
  const chain = [at(-0.27, 1.22, 0.16), at(-0.2, 1.02, 0.31), at(0, 0.9, 0.35), at(0.2, 1.02, 0.31), at(0.27, 1.22, 0.16)];
  cable(kit, chain, 0.018, GOLD, 1.4);
  const disc = (r: number) => new CylinderGeometry(r, r, 0.025, 12).rotateX(Math.PI / 2);
  [at(-0.21, 1.06, 0.31), at(-0.11, 0.95, 0.34), at(0.11, 0.95, 0.34), at(0.21, 1.06, 0.31)].forEach((p, i) => add(disc(0.045), GOLD, p[0], p[1] - 0.045, p[2], o(1.45 + i * 0.02)));
  const pendant = at(0, 0.8, 0.37);
  add(disc(0.08), GOLD, pendant[0], pendant[1] - 0.08, pendant[2], o(1.5));

  // Her takings on a trolley, and her cane against the desk.
  const CX = 1.62;
  const CZ = 0.7;
  box(0.62, 0.05, 0.46, 0x23222b, CX, G + 0.08, CZ, { delay: 0.8 });
  [-0.24, 0.24].forEach((dx) =>
    [-0.17, 0.17].forEach((dz) => add(new CylinderGeometry(0.06, 0.06, 0.04, 12).rotateZ(Math.PI / 2), 0x14121c, CX + dx, G, CZ + dz, { delay: 0.82 })),
  );
  limb(kit, [CX - 0.3, G + 0.13, CZ], [CX - 0.5, G + 0.75, CZ - 0.05], 0.02, 0.02, 0x23222b, { delay: 0.84 });
  const chest = box(0.5, 0.3, 0.36, WOOD, CX, G + 0.13, CZ, { delay: 0.86 });
  decorate(chest, new BoxGeometry(0.04, 0.31, 0.37), GOLD, [
    [-0.18, 0.15, 0],
    [0.18, 0.15, 0],
  ]);
  const coin = new CylinderGeometry(0.05, 0.05, 0.015, 10);
  decorate(
    chest,
    coin,
    GOLD,
    [-0.15, -0.05, 0.05, 0.15].flatMap((x, i) => [[x, 0.305, -0.08 + (i % 2) * 0.05], [x + 0.04, 0.32, 0.07 - (i % 2) * 0.04]] as Point[]),
  );
  box(0.5, 0.34, 0.04, WOOD, CX, G + 0.43, CZ - 0.2, { delay: 0.9, rotation: [-0.35, 0, 0] });
  const strayCoins = add(new BoxGeometry(0.001, 0.001, 0.001), GOLD, CX - 0.2, G, CZ + 0.4, { delay: 0.95, flat: true, noInk: true });
  decorate(strayCoins, coin, GOLD, [
    [0, 0.008, 0],
    [0.12, 0.008, 0.08],
    [-0.1, 0.008, 0.12],
  ]);
  const caneFoot = at(-0.8, 0, 0.75);
  const caneTop = at(-0.64, 0.86, 0.66);
  limb(kit, caneFoot, caneTop, 0.022, 0.022, 0x14121c, { delay: 1.0 });
  ball(0.045, GOLD, caneTop[0], caneTop[1] - 0.02, caneTop[2], { delay: 1.02 });

  tick((t) => {
    rock.rotation.z = Math.sin(t * 1.6) * 0.05;
    rock.position.y = F + Math.sin(t * 1.6 + 1) * 0.02;
    wave.children[0].scale.setScalar(1 + Math.sin(t * 1.6) * 0.06);
    const p = (t * 0.7) % 2;
    counted.position.x = p < 1 ? 0.1 - 0.2 * Math.min(1, p * 4) : -0.1 + 0.2 * Math.min(1, (p - 1) * 4);
    warning.visible = Math.floor(t * 1.5) % 2 === 0;
  });

  return { width: 4.9, height: 4.5, lookY: 1.5 };
}
