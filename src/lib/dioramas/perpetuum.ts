import { BoxGeometry, CatmullRomCurve3, Group, TorusGeometry, TubeGeometry, Vector3 } from "three";
import { CYAN, MAGENTA, cable, crawl, octagonBase, zigzag, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { column, floor, ring } from "@/lib/diorama-props";

/**
 * Perpetuum (P114): in the vault under the power plant the old man sits wrapped in his blanket on
 * a copper throne, reading, while thick copper cables run out of the throne into the walls and
 * the floor and sparks crawl along them; rings of the magnetic field he holds up spread over the
 * floor. Readers have left a pile of books at his feet; cobwebs in the throne say he never gets up.
 */
export function perpetuum(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick, motes } = kit;
  const COPPER = 0xb8602a;
  const COPPER_DARK = 0x7a3a1c;
  const F = octagonBase(kit, 0x1e2230);
  const G = floor(kit, F, 0.06, 0x2a2d3a, 0x1e2029, 0.5);
  const T = 0.3;
  const at = (lx: number, ly: number, lz: number): Point => [lx * Math.cos(T) + lz * Math.sin(T), G + ly, -0.3 - lx * Math.sin(T) + lz * Math.cos(T)];
  const turn: [number, number, number] = [0, T, 0];

  // The vault: a back wall with dim lamps, a column, a low dais.
  const wall = box(3.2, 3.5, 0.25, 0x262a3a, ...at(0, 0, -1.35), { delay: 0.1, rotation: turn, ink: 1.02 });
  decorate(wall, new BoxGeometry(0.22, 0.05, 0.01), 0xdff8ff, [
    [-1.2, 2.9, 0.13],
    [1.2, 2.9, 0.13],
    [-1.2, 1.6, 0.13],
  ]);
  decorate(wall, new BoxGeometry(3.2, 0.04, 0.01), 0x1a1d2a, [
    [0, 1.2, 0.13],
    [0, 2.4, 0.13],
  ]);
  column(kit, ...lxz(at(1.25, 0, -0.95)), G, 0.2, 3.1, false, 0x6a7890);
  const octagon: [number, number, number] = [0, Math.PI / 8, 0];
  cylinder(1.15, 1.2, 0.12, 0x3a3e4e, ...at(0, 0, 0), { delay: 0.25, rotation: octagon }, 8);
  cylinder(0.95, 1.0, 0.12, 0x444858, ...at(0, 0.12, 0), { delay: 0.3, rotation: octagon }, 8);
  const D = 0.24;

  // The copper throne, white panels down its arms.
  box(1.1, 0.62, 0.8, COPPER, ...at(0, D, 0.05), { delay: 0.4, rotation: turn });
  const back = box(1.2, 2.15, 0.22, COPPER, ...at(0, D, -0.42), { delay: 0.45, rotation: turn });
  decorate(back, new BoxGeometry(0.12, 1.5, 0.01), COPPER_DARK, [
    [-0.4, 1.3, 0.115],
    [0.4, 1.3, 0.115],
  ]);
  [-1, 1].forEach((s, i) => {
    const arm = box(0.24, 1.1, 0.9, COPPER, ...at(s * 0.66, D, 0.02), { delay: 0.5 + i * 0.03, rotation: turn });
    decorate(arm, new BoxGeometry(0.11, 0.62, 0.01), 0xd8e8f0, [[0, 0.62, 0.455]]);
  });
  // VEL 0: cobwebs in the corner of the throne.
  const web: [number, number, number, number][] = [0.2, 0.55, 0.9, 1.25].map((a) => [-0.6 + Math.sin(a) * 0.2, 2.15 - Math.cos(a) * 0.2, 0.12, a]);
  decorate(back, new BoxGeometry(0.008, 0.4, 0.004), 0xc8ccd8, web);
  decorate(back, new BoxGeometry(0.2, 0.008, 0.004), 0xc8ccd8, [
    [-0.5, 1.97, 0.12, 0.75],
    [-0.47, 1.87, 0.12, 0.7],
  ]);

  // Copper cables out of the throne, up into the wall and down into the floor.
  const upper: Point[][] = [-1, 1].flatMap((s) => [
    [at(s * 0.42, D + 2.0, -0.45), at(s * 0.55, D + 2.6, -0.75), at(s * 0.75, 3.15, -1.1), at(s * 0.8, 3.2, -1.3)],
    [at(s * 0.18, D + 2.05, -0.45), at(s * 0.2, D + 2.75, -0.7), at(s * 0.3, 3.45, -1.05), at(s * 0.32, 3.4, -1.3)],
  ]);
  const lower: Point[][] = [-1, 1].flatMap((s) => [
    [at(s * 0.5, D + 0.15, -0.35), at(s * 0.95, D, -0.5), at(s * 1.45, 0.03, -0.35), at(s * 1.95, 0.03, 0.05)],
    [at(s * 0.35, D + 0.1, 0.42), at(s * 0.6, D, 0.85), at(s * 0.85, 0.03, 1.35), at(s * 0.9, 0.03, 1.85)],
  ]);
  [...upper, ...lower].forEach((points, i) => cable(kit, points, 0.06, i % 2 ? COPPER : COPPER_DARK, 0.6 + i * 0.03));

  // Perpetuum, wrapped in his blanket, reading.
  const man = figure(kit, {
    x: at(0, 0, 0.05)[0],
    z: at(0, 0, 0.05)[2],
    y: G + D - 0.02,
    facing: T,
    build: "broad",
    skin: 0xc4927a,
    hair: { style: "bald", color: 0x3a2e2a },
    face: { mouth: "frown", brows: "calm", marks: 0x8a5040, beard: "stubble", beardColor: 0x4a4040 },
    top: { kind: "robe", color: 0x4e3c30 },
    shoes: 0x2a2220,
    arms: [
      [-0.17, 1.02, 0.45],
      [0.17, 1.02, 0.45],
    ],
    legs: "sit",
    delay: 0.9,
  });
  add(new TorusGeometry(0.37, 0.12, 8, 20).rotateX(Math.PI / 2).scale(1, 1, 0.8), 0x5e4a3a, ...man.at(0, 1.2, 0), { delay: 1.3, rotation: turn });
  // The open book, and a page that turns now and then.
  const spine = man.at(0, 1.04, 0.47);
  [-1, 1].forEach((s) => {
    const half = box(0.2, 0.03, 0.28, 0x6a2030, spine[0], spine[1], spine[2], { delay: 1.4, rotation: [0, T, s * 0.25] });
    decorate(half, new BoxGeometry(0.17, 0.012, 0.25), 0xf0e8d4, [[0, 0.035, 0]]);
    half.children.forEach((child) => (child.position.x += s * 0.1));
  });
  const leaf = box(0.17, 0.006, 0.25, 0xf0e8d4, 0.085, 0.045, 0, { delay: 1.5, noInk: true });
  const hinge = new Group();
  hinge.position.set(...spine);
  hinge.rotation.order = "YXZ";
  leaf.parent?.add(hinge);
  hinge.add(leaf);

  // Readers' offerings: piles of books at the foot of the dais.
  [
    [-1.45, 0.75, 5],
    [-1.05, 1.25, 3],
    [1.4, 0.9, 2],
  ].forEach(([lx, lz, n], p) => {
    for (let k = 0; k < n; k++)
      box(0.42 - (k % 2) * 0.06, 0.09, 0.3, [MAGENTA, 0x2f5866, 0x7a2f55, 0x1f7f9c, 0x5a4a6a][(k + p) % 5], ...at(lx, k * 0.09, lz), { delay: 1.6 + p * 0.1 + k * 0.03, rotation: [0, T + k * 0.3 - p, 0] });
  });

  // The field: rings spreading over the floor, sparks crawling along the cables.
  const ripples = [0, 1].map((k) => ring(kit, at(0, 0.005, 0), 1.25, CYAN, 0.8 + k * 0.1));
  const sparks = [upper[0], upper[3], lower[1], lower[2], upper[2]].map((path, k) => zigzag(kit, crawl(path, 3, 0.09, k), 0.02, k % 2 ? 0xdff8ff : CYAN, 1.8));
  motes(10, 0x9fe8ff, 0.025, [-1.4, G + 0.2, -1.2], [1.4, G + 3, 0.6], 1.5);
  // A faint arc of the field over his head.
  const arc = new TubeGeometry(new CatmullRomCurve3([at(-0.9, 2.6, -0.6), at(0, 3.4, -0.6), at(0.9, 2.6, -0.6)].map((p) => new Vector3(...p))), 20, 0.012, 5);
  arc.translate(0, -G - 2.6, 0);
  add(arc, MAGENTA, 0, G + 2.6, 0, { delay: 2, flat: true, noInk: true });

  tick((t) => {
    ripples.forEach((r, k) => {
      const u = (t / 3 + k * 0.5) % 1;
      r.children[0].scale.set(1 + u * 0.5, 1, 1 + u * 0.5);
      r.children[0].visible = u < 0.9;
    });
    sparks.forEach((spark, k) => {
      const on = Math.floor(t * 7 + k * 3) % 5 !== 4 || t === 0;
      spark.forEach((piece) => (piece.visible = on));
    });
    const u = (t % 6) / 6;
    const flip = u < 0.15 ? (1 - Math.cos((u / 0.15) * Math.PI)) / 2 : 1;
    hinge.rotation.set(0, T, 0.2 + flip * (Math.PI - 0.4));
  });

  return { width: 4.9, height: 4.5, lookY: 1.75 };
}

function lxz(p: Point): [number, number] {
  return [p[0], p[2]];
}
