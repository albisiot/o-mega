import { BoxGeometry, CatmullRomCurve3, ConeGeometry, TorusGeometry, TubeGeometry, Vector3 } from "three";
import { CYAN, INK, MAGENTA, YELLOW, colorOf, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { column, floor, orb } from "@/lib/diorama-props";

/**
 * Codicil (P115): in the city archive, among filing cabinets and an Ionic column, the archivist
 * raises her fountain pen with a glowing ledger open in her other hand while loose sheets circle
 * round her. A tower of files that she could never have caught (FOR 1) is toppling beside her and
 * stays frozen in mid-fall, tied by a line of glowing ink from her nib: one clause, and it's over.
 */
export function codicil(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const PAPER = 0xe8e2d0;
  const F = octagonBase(kit, 0x221f2a);
  const G = floor(kit, F, 0.06, 0x3a2f2c, 0x2a2220, 0.3);

  // The archive: filing cabinets, a shelf of ledgers, an Ionic column.
  [
    [-1.55, -0.75, 0.75],
    [-1.05, -1.15, 0.6],
    [-0.45, -1.45, 0.45],
  ].forEach(([x, z, turn], i) => {
    const cabinet = box(0.6, 1.6, 0.5, 0x34445a, x, G, z, { delay: 0.1 + i * 0.05, rotation: [0, turn, 0] });
    decorate(cabinet, new BoxGeometry(0.5, 0.32, 0.01), 0x4a5c74, [0.25, 0.63, 1.01, 1.39].map((y) => [0, y, 0.255] as Point));
    decorate(cabinet, new BoxGeometry(0.12, 0.03, 0.02), YELLOW, [0.32, 0.7, 1.08, 1.46].map((y) => [0, y, 0.265] as Point));
  });
  const shelf = box(1.3, 2.1, 0.4, 0x3e3028, 0.55, G, -1.55, { delay: 0.2, rotation: [0, 0.2, 0] });
  [0.05, 0.75, 1.45].forEach((y, row) =>
    decorate(
      shelf,
      new BoxGeometry(0.09, 0.5, 0.3),
      [0x7a2f55, 0x2f5866, 0x5a2a2a][row],
      Array.from({ length: 11 }, (_, k) => [-0.52 + k * 0.104 + (k % 3) * 0.004, y + 0.27, 0.07, k % 4 === 3 ? 0.12 : 0] as [number, number, number, number]),
    ),
  );
  column(kit, 1.55, -0.6, G, 0.3, 3.1, false, 0x8a8a7a);
  [-1, 1].forEach((s) => add(new TorusGeometry(0.09, 0.035, 6, 14), 0x8a8a7a, 1.55 + s * 0.27, G + 2.84, -0.45, { delay: 0.45 }));

  // Codicil: grey curls, round glasses, a long dark coat with brass buttons and ribbon markers.
  const archivist = figure(kit, {
    x: -0.35,
    z: 0.25,
    y: G,
    facing: 0.25,
    height: 2.35,
    build: "slim",
    skin: 0xe8c0a8,
    hair: { style: "curly", color: 0xc8c4c8 },
    face: { mouth: "smirk", brows: "calm", glasses: "round", glassesColor: 0x8a7a5a },
    top: { kind: "coat", color: 0x23232e, accent: 0x6a2a3a },
    bottom: { kind: "trousers", color: 0x23232e },
    shoes: 0x2a2220,
    arms: ["up", [0.16, 1.3, 0.42]],
    delay: 0.8,
  });
  [1.05, 1.25, 1.45].forEach((y, i) => [-0.08, 0.08].forEach((x) => ball(0.022, YELLOW, ...archivist.at(x, y, 0.21), { delay: 1.3 + i * 0.02, noInk: true })));
  [
    [-0.24, MAGENTA],
    [-0.19, YELLOW],
  ].forEach(([x, color], i) => box(0.04, 0.32, 0.012, color, ...archivist.at(x, 0.62, 0.22), { delay: 1.35 + i * 0.02, noInk: true, rotation: [0, 0.25, 0.1] }));

  // The fountain pen, nib up and lit.
  const [penHand, bookHand] = archivist.hands;
  cylinder(0.02, 0.025, 0.3, INK, penHand[0], penHand[1], penHand[2], { delay: 1.4, rotation: [0, 0, 0.12] }, 8);
  const nibAt: Point = [penHand[0] - 0.035, penHand[1] + 0.3, penHand[2]];
  add(new ConeGeometry(0.022, 0.08, 6), YELLOW, ...nibAt, { delay: 1.45, rotation: [0, 0, 0.12] });
  const glint = orb(kit, [nibAt[0] - 0.01, nibAt[1] + 0.14, nibAt[2]], 0.045, YELLOW, 1.5);

  // The ledger, open and glowing.
  [-1, 1].forEach((s) => {
    const half = box(0.24, 0.035, 0.32, 0x4a2a1e, bookHand[0], bookHand[1] + 0.03, bookHand[2] + 0.04, { delay: 1.4, rotation: [0.55, 0.25, s * 0.2] });
    decorate(half, new BoxGeometry(0.21, 0.012, 0.29), YELLOW, [[0, 0.04, 0]]);
    half.children.forEach((child) => (child.position.x += s * 0.12));
  });

  // The tower of files, toppling and frozen, bound by a ring of ink.
  const stack: [number, number, number][] = [];
  let sx = 1.25;
  let sy = G;
  for (let k = 0; k < 7; k++) {
    const lean = 0.1 + k * 0.08;
    stack.push([sx, sy, lean]);
    sx -= Math.sin(lean) * 0.2 + (k > 4 ? 0.06 : 0);
    sy += Math.cos(lean) * 0.2 + (k > 4 ? 0.05 : 0);
  }
  const files = stack.map(([x, y, lean], k) => {
    const file = box(0.52, 0.18, 0.38, [0x8a6a48, 0x2f5866, 0x7a2f55][k % 3], x, y, 0.65 - k * 0.02, { delay: 0.6 + k * 0.05, rotation: [0, 0.35, lean] });
    decorate(file, new BoxGeometry(0.46, 0.012, 0.32), PAPER, [[0.02, 0.18, 0]]);
    return file;
  });
  const bindAt: Point = [stack[3][0] - 0.05, stack[3][1] - 0.02, 0.6];
  const bind = add(new TorusGeometry(0.42, 0.02, 6, 30).rotateX(Math.PI / 2), CYAN, ...bindAt, { delay: 1.7, flat: true, noInk: true, rotation: [0, 0, 0.4] });
  const sealAt: Point = [stack[4][0] - 0.03, stack[4][1] + 0.02, 0.86];
  cylinder(0.07, 0.07, 0.02, MAGENTA, ...sealAt, { delay: 1.8, rotation: [Math.PI / 2, 0, 0] }, 14);
  // The clause: a glowing line of ink from the nib to the stack.
  const line = new TubeGeometry(
    new CatmullRomCurve3([nibAt, [0.1, G + 3.0, 0.6], [0.85, G + 2.3, 0.75], [bindAt[0] + 0.2, bindAt[1] + 0.25, 0.85]].map((p) => new Vector3(...p))),
    40,
    0.014,
    5,
  );
  line.computeBoundingBox();
  add(line, CYAN, 0, line.boundingBox?.min.y ?? 0, 0, { delay: 1.9, flat: true, noInk: true });

  // Loose sheets circling round her.
  const sheets = Array.from({ length: 9 }, (_, k) => ({
    part: box(0.2, 0.006, 0.27, PAPER, 0, 0, 0, { delay: 1 + k * 0.04, outline: new BoxGeometry(0.23, 0.02, 0.3) }),
    angle: (k / 9) * Math.PI * 2,
    radius: 0.85 + (k % 3) * 0.25,
    height: 0.9 + ((k * 5) % 9) * 0.25,
  }));

  tick((t) => {
    colorOf(glint).setHex(Math.sin(t * 4) > 0.3 ? 0xfff4b0 : YELLOW);
    bind.rotation.y = t * 0.8;
    sheets.forEach(({ part, angle, radius, height }, k) => {
      const a = angle + t * (0.35 + (k % 2) * 0.1);
      part.position.set(-0.35 + Math.cos(a) * radius, G + height + Math.sin(t * 1.3 + k) * 0.08, 0.25 + Math.sin(a) * radius * 0.8);
      part.rotation.set(Math.sin(t + k) * 0.6, -a, Math.cos(t * 0.8 + k) * 0.5);
    });
    // The frozen stack shivers, now and then, against the clause.
    const shiver = Math.sin(t * 0.9) > 0.85 ? Math.sin(t * 40) * 0.015 : 0;
    files.forEach((file, k) => (file.rotation.z = stack[k][2] + shiver * k * 0.3));
  });

  return { width: 4.9, height: 4.4, lookY: 1.65 };
}
