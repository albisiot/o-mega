import { BoxGeometry, CatmullRomCurve3, ConeGeometry, DodecahedronGeometry, type Group, OctahedronGeometry, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { ORANGE, YELLOW, aim, cable, limb, octagonBase, zigzag, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { floor, volcanoBackdrop } from "@/lib/diorama-props";

/**
 * Mordacchia (P186): on a lava-rock outcrop over the bay at night, the volcano glowing behind,
 * the great grey wolf of the Figli dell'Ultima stands with its forepaws up on a rock, a ceramic
 * wedge roped crosswise in its jaws, its legs white with ash. A broken pact stone lies split
 * behind it and embers drift up. Every few seconds it tugs at its chain, to count: and its price
 * is plain, the chain's iron stake already lies pulled out of the ground and it never noticed.
 */
export function mordacchia(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const FUR = 0x3a3a48;
  const FUR_DARK = 0x2a2a36;
  const FUR_LIGHT = 0x55556a;
  const ASH = 0xcfcac0;
  const CERAMIC = 0xece4d0;
  const ROPE = 0xa08860;
  const IRON = 0x3a3440;
  const ROCK = 0x2a2630;
  const F = octagonBase(kit, 0x15131a);
  const G = floor(kit, F, 0.06, 0x24202a, 0x1a1720, 0);

  // The volcano behind, lava down its side, and the lights of the bay below it.
  volcanoBackdrop(kit, 1.05, -1.85, G, 0.08, 1.7);
  zigzag(kit, [[0.95, G + 1.45, -1.8], [1.05, G + 1.1, -1.8], [0.9, G + 0.75, -1.8], [1.0, G + 0.4, -1.8]], 0.035, ORANGE, 0.2);
  [-1.55, -1.3, -1.08, -0.82, -0.6, -0.35].forEach((x, i) => {
    const h = 0.18 + ((i * 7) % 3) * 0.07;
    const house = box(0.2, h, 0.12, 0x2a2a44, x, G, -1.62 + (i % 2) * 0.08, { delay: 0.12 + i * 0.02 });
    decorate(house, new BoxGeometry(0.04, 0.04, 0.01), YELLOW, [[0, h * 0.6, 0.061]]);
  });
  // Lava rock: boulders, glowing cracks in the ground, the broken pact stone.
  [
    [-1.75, -0.6, 0.4],
    [1.7, 0.35, 0.35],
    [-1.4, 1.35, 0.28],
    [1.55, -0.75, 0.3],
  ].forEach(([x, z, r], i) => add(new DodecahedronGeometry(r).scale(1.2, 0.7, 1), ROCK, x, G, z, { delay: 0.2 + i * 0.03, rotation: [i, i * 2, 0] }));
  zigzag(kit, [[-0.9, G + 0.005, 1.5], [-0.6, G + 0.005, 1.3], [-0.4, G + 0.005, 1.55], [-0.1, G + 0.005, 1.4]], 0.04, ORANGE, 0.3);
  zigzag(kit, [[0.6, G + 0.005, 1.6], [0.9, G + 0.005, 1.4], [1.2, G + 0.005, 1.5]], 0.04, ORANGE, 0.32);
  const half = box(0.5, 0.75, 0.16, 0x5d6680, -1.6, G, 0.45, { delay: 0.35, rotation: [0, 1.0, 0.18] });
  decorate(half, new BoxGeometry(0.5, 0.04, 0.02), ORANGE, [[0, 0.73, 0.07, 0.1]]);
  box(0.5, 0.16, 0.6, 0x5d6680, -1.2, G, 1.15, { delay: 0.38, rotation: [0, 0.7, 0] });

  // The wolf, in its own frame.
  const DF = 0.9;
  const X0 = -0.05;
  const Z0 = -0.1;
  const d = (lx: number, ly: number, lz: number): Point => [X0 + lx * Math.cos(DF) + lz * Math.sin(DF), G + ly, Z0 - lx * Math.sin(DF) + lz * Math.cos(DF)];
  const turn: [number, number, number] = [0, DF, 0];
  const under = d(0, 0, 0.62);
  add(new DodecahedronGeometry(0.5).scale(1.4, 0.6, 1.1), ROCK, under[0], G - 0.05, under[2], { delay: 0.4, rotation: turn });
  const beast: Group[] = [];
  const keep = (part: Group) => (beast.push(part), part);
  const orb = (r: number, color: number, at: Point, delay: number, scale: [number, number, number] = [1, 1, 1]) =>
    keep(add(new SphereGeometry(r, 16, 12).scale(...scale), color, at[0], at[1] - r * scale[1], at[2], { delay, rotation: turn }));
  orb(0.5, FUR, d(0, 1.42, -0.45), 0.6, [0.95, 0.9, 1.55]);
  orb(0.46, FUR, d(0, 1.32, -1.05), 0.62);
  orb(0.55, FUR_LIGHT, d(0, 1.5, 0.2), 0.64);
  [-1, 1].forEach((side, i) => {
    const D = 0.7 + i * 0.03;
    // Forelegs up on the rock, ash-white from the elbow down.
    keep(limb(kit, d(side * 0.3, 1.35, 0.3), d(side * 0.34, 0.92, 0.48), 0.17, 0.15, FUR, { delay: D }));
    keep(limb(kit, d(side * 0.34, 0.92, 0.48), d(side * 0.34, 0.5, 0.62), 0.14, 0.12, ASH, { delay: D + 0.02 }));
    orb(0.15, ASH, d(side * 0.34, 0.55, 0.7), D + 0.04, [1, 0.55, 1.3]);
    // Hind legs.
    orb(0.28, FUR, d(side * 0.32, 1.25, -1.1), D + 0.04);
    keep(limb(kit, d(side * 0.34, 1.1, -1.15), d(side * 0.37, 0.42, -1.38), 0.17, 0.12, FUR, { delay: D + 0.06 }));
    keep(limb(kit, d(side * 0.37, 0.42, -1.38), d(side * 0.36, 0.08, -1.15), 0.11, 0.1, ASH, { delay: D + 0.08 }));
    orb(0.14, ASH, d(side * 0.36, 0.08, -1.08), D + 0.1, [1, 0.55, 1.3]);
  });
  keep(limb(kit, d(0, 1.4, -1.42), d(0.1, 0.75, -1.85), 0.12, 0.09, FUR_DARK, { delay: 0.85 }));
  // Neck and ruff.
  keep(limb(kit, d(0, 1.6, 0.25), d(0, 2.08, 0.58), 0.34, 0.28, FUR, { delay: 0.9 }));
  [
    [-0.32, 1.85, 0.35, -1],
    [0.32, 1.85, 0.35, 1],
    [-0.2, 2.05, 0.3, -0.6],
    [0.2, 2.05, 0.3, 0.6],
    [0, 2.1, 0.25, 0],
  ].forEach(([lx, ly, lz, ox], i) => {
    const p = d(lx, ly, lz);
    keep(add(new ConeGeometry(0.11, 0.36, 5), i % 2 ? FUR_DARK : FUR_LIGHT, ...p, { delay: 0.92 + i * 0.02, rotation: aim(p, d(lx + ox * 0.5, ly + 0.3, lz - 0.45)).rotation }));
  });
  // The head: skull, muzzle, jaw, yellow eyes, ears.
  orb(0.28, FUR, d(0, 2.26, 0.72), 1.0);
  const snout = keep(box(0.26, 0.2, 0.42, FUR_LIGHT, ...d(0, 2.04, 1.0), { delay: 1.03, rotation: turn }));
  decorate(snout, new BoxGeometry(0.14, 0.09, 0.06), 0x14121c, [[0, 0.18, 0.2]]);
  const jaw = keep(box(0.22, 0.07, 0.36, FUR_DARK, ...d(0, 1.9, 0.94), { delay: 1.05, rotation: [0.18, DF, 0] }));
  decorate(jaw, new ConeGeometry(0.022, 0.08, 5), CERAMIC, [
    [-0.08, 0.1, 0.15],
    [0.08, 0.1, 0.15],
  ]);
  decorate(snout, new ConeGeometry(0.022, 0.08, 5).rotateX(Math.PI), CERAMIC, [
    [-0.09, -0.03, 0.17],
    [0.09, -0.03, 0.17],
  ]);
  const eyes = [-1, 1].map((side) => keep(box(0.08, 0.04, 0.02, YELLOW, ...d(side * 0.12, 2.3, 0.98), { delay: 1.1, flat: true, noInk: true, rotation: [0, DF, side * 0.25] })));
  [-1, 1].forEach((side) => keep(add(new ConeGeometry(0.09, 0.26, 6), FUR, ...d(side * 0.15, 2.42, 0.66), { delay: 1.08, rotation: [-0.1, DF, -side * 0.3] })));
  // The ceramic wedge, crosswise in the jaws, roped at both corners.
  keep(add(new OctahedronGeometry(0.12).scale(6, 0.9, 1.3), CERAMIC, ...d(0, 1.9, 1.0), { delay: 1.15, rotation: turn }));
  [-0.27, 0.27].forEach((lx, i) => keep(add(new TorusGeometry(0.1, 0.03, 6, 14).rotateY(Math.PI / 2), ROPE, ...d(lx, 1.9, 1.0), { delay: 1.2 + i * 0.02, rotation: turn })));
  // The collar and the chain, slack across the rock to the stake that is no longer in the ground.
  keep(add(new TorusGeometry(0.33, 0.05, 8, 24).rotateX(Math.PI / 2), IRON, ...d(0, 1.65, 0.36), { delay: 1.25, rotation: [-0.55, DF, 0] }));
  const ring = d(0, 1.62, 0.7);
  const stake: Point = [0.1, G + 0.04, 1.75];
  const path: Point[] = [ring, [0.75, G + 0.9, 0.8], [0.55, G + 0.06, 1.3], [0.3, G + 0.05, 1.6], stake];
  cable(kit, path, 0.022, IRON, 1.3);
  const curve = new CatmullRomCurve3(path.map((p) => new Vector3(...p)));
  for (let k = 1; k < 12; k++) {
    const p = curve.getPoint(k / 12);
    const q = p.clone().add(curve.getTangent(k / 12));
    const link = new TorusGeometry(0.055, 0.018, 6, 12).scale(1, 1.5, 1);
    if (k % 2) link.rotateY(Math.PI / 2);
    add(link, IRON, p.x, p.y - 0.06, p.z, { delay: 1.32 + k * 0.01, rotation: aim([p.x, p.y, p.z], [q.x, q.y, q.z]).rotation });
  }
  const peg = cylinder(0.035, 0.02, 0.6, IRON, ...stake, { delay: 1.35, rotation: [0, 0.4, Math.PI / 2 - 0.15] }, 8);
  decorate(peg, new TorusGeometry(0.07, 0.02, 6, 12), IRON, [[0, 0.62, 0]]);
  cylinder(0.08, 0.08, 0.004, 0x0c0a10, 0.6, G + 0.002, 1.85, { delay: 1.3, flat: true, noInk: true }, 12);
  [0.2, 2.4, 4.3].forEach((a, i) => ball(0.04, 0x3a3028, 0.6 + Math.cos(a) * 0.14, G, 1.85 + Math.sin(a) * 0.12, { delay: 1.32 + i * 0.02 }));
  motes(16, ORANGE, 0.03, [-1.8, G + 0.1, -1.2], [1.7, G + 3.2, 1.4], 1.4);

  const rest = beast.map((part) => part.position.clone());
  const back = [-Math.sin(DF), -Math.cos(DF)];
  const restPeg = peg.position.y;
  tick((t) => {
    // A tug every few seconds, back against the chain: the loose stake jumps, and the eyes flare.
    const p = t % 3.5;
    const pull = p < 0.5 ? Math.sin((p / 0.5) * Math.PI) : 0;
    beast.forEach((part, i) => {
      part.position.x = rest[i].x + back[0] * pull * 0.09;
      part.position.z = rest[i].z + back[1] * pull * 0.09;
      part.position.y = rest[i].y + pull * 0.02;
    });
    peg.position.y = restPeg + pull * 0.08;
    peg.rotation.x = pull * 0.3;
    eyes.forEach((eye) => (eye.visible = Math.floor(t * 2) % 9 !== 8));
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}
