import { BoxGeometry, ConeGeometry, CylinderGeometry, ExtrudeGeometry, Group, Shape, SphereGeometry } from "three";
import { INK, ORANGE, cable, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";

/**
 * Fuliggine (P301): the chimney thief of the Figli dell'Ultima pours out of a chimney top as a
 * cloud of soot under the full moon, the temple on its hill behind the roofs, embers rising round
 * him. He reaches for us with a pearl necklace, all the loot he can carry: the little safe he
 * roped on the tiles below has not moved an inch however hard he pulls.
 */
export function fuliggine(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const F = octagonBase(kit, 0x1a1c2a);
  const TILE = 0x6a2f4a;
  const TILE_LINE = 0x3a1a2c;
  const BRICK = 0x5a3a48;
  const SOOT = 0x26232e;
  const PALE = 0xb8c0d8;

  // The moon, and the temple on its hill behind the roofs.
  add(new CylinderGeometry(0.36, 0.36, 0.02, 24).rotateX(Math.PI / 2), 0xe8ecdf, 1.15, F + 3.0, -1.6, { delay: 0.1, flat: true, noInk: true });
  add(new SphereGeometry(0.8, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 1.4, 0.35), 0x262a40, 0.75, F, -1.6, { delay: 0.1 });
  box(0.62, 0.05, 0.26, PALE, 0.75, F + 1.1, -1.6, { delay: 0.2 });
  [-0.27, -0.13, 0, 0.13, 0.27].forEach((dx, i) => cylinder(0.025, 0.025, 0.22, PALE, 0.75 + dx, F + 1.15, -1.52, { delay: 0.22 + i * 0.02 }, 8));
  box(0.66, 0.05, 0.3, PALE, 0.75, F + 1.37, -1.6, { delay: 0.3 });
  add(new ConeGeometry(0.36, 0.12, 4).rotateY(Math.PI / 4).scale(1, 1, 0.5), PALE, 0.75, F + 1.42, -1.6, { delay: 0.32 });

  // The roof: a pitched slope of tiles over the whole base, a gutter along the eave.
  const RZ = -0.2;
  const RH = 0.75;
  const shape = new Shape();
  shape.moveTo(-1.3, 0);
  shape.lineTo(1.3, 0);
  shape.lineTo(0, RH);
  shape.closePath();
  const roof = add(new ExtrudeGeometry(shape, { depth: 3, bevelEnabled: false }).rotateY(Math.PI / 2).translate(-1.5, 0, 0), TILE, 0, F, RZ, { delay: 0.2, ink: 1.02 });
  const rows: Point[] = [];
  for (let k = 1; k < 8; k++) for (const side of [-1, 1]) rows.push([0, (RH * k) / 8 + 0.01, side * 1.3 * (1 - k / 8) + side * 0.012]);
  decorate(roof, new BoxGeometry(3, 0.014, 0.014), TILE_LINE, rows);
  box(3.04, 0.07, 0.1, TILE_LINE, 0, F + RH - 0.04, RZ, { delay: 0.3 });
  box(3, 0.06, 0.08, 0x4a4f5c, 0, F, 1.13, { delay: 0.3 });
  const slope = (z: number) => F + (RH * (1.1 - z)) / 1.3;

  // A second stack on the ridge, with chimney pots.
  box(0.32, 0.7, 0.3, BRICK, -1.05, F + 0.5, RZ, { delay: 0.35 });
  [-0.07, 0.08].forEach((dx, i) => cylinder(0.06, 0.08, 0.18, 0xb0603a, -1.05 + dx, F + 1.2, RZ, { delay: 0.4 + i * 0.03 }, 10));

  // The chimney he pours out of.
  const CX = -0.25;
  const CZ = 0.05;
  const TOP = F + 1.6;
  const stack = box(0.72, 1.6, 0.72, BRICK, CX, F, CZ, { delay: 0.4 });
  decorate(
    stack,
    new BoxGeometry(0.73, 0.012, 0.73),
    0x3a2430,
    Array.from({ length: 8 }, (_, k) => [0, 0.72 + k * 0.12, 0] as Point),
  );
  box(0.86, 0.08, 0.86, 0x3a3044, CX, TOP, CZ, { delay: 0.45 });

  // Fuliggine: his legs are smoke inside the stack; from the waist up, a thief in black.
  const H = 2.35;
  const u = H / 2.4;
  const thief = figure(kit, {
    x: CX,
    z: CZ,
    y: TOP + 0.1 - 1.08 * u,
    facing: 0.3,
    height: H,
    build: "slim",
    skin: 0xd8b8a8,
    hair: { style: "wild", color: 0x14121a },
    face: { mouth: "frown", brows: "angry", marks: 0x3a3440 },
    top: { kind: "jacket", color: 0x23252f, accent: 0x2c2e3a },
    bottom: { kind: "trousers", color: 0x1c1d26 },
    gloves: 0x16151c,
    scarf: 0x3a3c4a,
    arms: [[-0.5, 1.35, 0.35], [0.45, 1.75, 0.7]],
    delay: 0.9,
  });
  // The soot: a ring of cloud at the chimney's mouth and a plume billowing behind him.
  const puffs: Group[] = [];
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2;
    const r = 0.14 + (k % 3) * 0.03;
    puffs.push(ball(r, k % 3 ? SOOT : 0x4a2448, CX + Math.sin(a) * 0.36, TOP + 0.06 - r, CZ + Math.cos(a) * 0.36, { delay: 1.4 + k * 0.02 }));
  }
  [
    [-0.2, 1.12, -0.3, 0.2],
    [-0.3, 1.35, -0.35, 0.22],
    [-0.42, 1.55, -0.45, 0.2],
    [-0.5, 1.75, -0.5, 0.26],
    [-0.6, 1.95, -0.5, 0.18],
    [-0.62, 2.15, -0.55, 0.2],
    [-0.42, 2.5, -0.7, 0.16],
    [0.2, 1.2, -0.35, 0.2],
    [0.3, 1.55, -0.4, 0.18],
    [0.32, 1.85, -0.45, 0.22],
    [0.52, 2.25, -0.6, 0.17],
  ].forEach(([x, y, z, r], k) => {
    const [px, py, pz] = thief.at(x, y, z);
    puffs.push(ball(r, k % 2 ? 0x4a2448 : SOOT, px, py - r, pz, { delay: 1.5 + k * 0.03 }));
  });
  add(new CylinderGeometry(0.28, 0.28, 0.01, 12), INK, CX, TOP + 0.081, CZ, { delay: 0.5, flat: true, noInk: true });

  // The safe he cannot lift, roped on the tiles; the rope taut to his right hand.
  const SZ = 0.65;
  const safe = box(0.42, 0.42, 0.38, 0x4a5068, -1.05, slope(SZ), SZ, { delay: 0.6, rotation: [Math.atan(RH / 1.3), 0.2, 0] });
  decorate(safe, new CylinderGeometry(0.06, 0.06, 0.02, 14).rotateX(Math.PI / 2), 0xa8b0c0, [[0.06, 0.24, 0.195]]);
  decorate(safe, new BoxGeometry(0.03, 0.12, 0.03), 0xa8b0c0, [[-0.12, 0.22, 0.2]]);
  const [pull, loot] = thief.hands;
  const knot: Point = [-1.05, slope(SZ) + 0.38, SZ + 0.2];
  cable(kit, [pull, [(pull[0] + knot[0]) / 2, (pull[1] + knot[1]) / 2 - 0.03, (pull[2] + knot[2]) / 2], knot], 0.02, 0xc9a46a, 1.6);
  // The pearl necklace: all he could carry.
  const pearls = Array.from({ length: 9 }, (_, k) => {
    const s = (k - 4) / 4;
    return ball(0.028, 0xf4f0e6, loot[0] + s * 0.1, loot[1] - 0.2 + s * s * 0.17, loot[2] + 0.02, { delay: 1.7 + k * 0.02 });
  });
  const swing = new Group();
  swing.position.set(...loot);
  pearls[0].parent?.add(swing);
  pearls.forEach((pearl) => {
    pearl.position.sub(swing.position);
    swing.add(pearl);
  });

  motes(14, ORANGE, 0.028, [CX - 0.4, TOP, CZ - 0.4], [CX + 0.4, TOP + 1.3, CZ + 0.4], 0.8);
  motes(10, 0x3a3444, 0.035, [CX - 0.8, TOP + 0.3, CZ - 0.6], [CX + 0.5, TOP + 1.9, CZ + 0.2], 1.0);

  const rest = puffs.map((puff) => puff.position.clone());
  const safeX = safe.position.x;
  tick((t) => {
    puffs.forEach((puff, k) => {
      puff.position.x = rest[k].x + Math.sin(t * 0.9 + k) * 0.04;
      puff.position.y = rest[k].y + Math.sin(t * 1.3 + k * 2) * 0.03;
    });
    swing.rotation.z = Math.sin(t * 1.6) * 0.18;
    // He tugs now and then; the safe barely trembles.
    safe.position.x = safeX + (Math.sin(t * 0.7) > 0.8 ? Math.sin(t * 40) * 0.006 : 0);
  });

  return { width: 4.9, height: 4.4, lookY: 1.7 };
}
