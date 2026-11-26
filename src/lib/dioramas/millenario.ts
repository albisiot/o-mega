import { BackSide, BoxGeometry, Color, ConeGeometry, CylinderGeometry, ExtrudeGeometry, Group, Shape, SphereGeometry, TorusGeometry, type Material, type Mesh, type MeshBasicMaterial } from "three";
import { YELLOW, cable, limb, octagonBase, zigzag, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { shade } from "@/lib/diorama-figure";
import { column, floor, rubble } from "@/lib/diorama-props";

/**
 * Millenario (P290): the olive tree that has walked for two thousand years, among the ruins of
 * a temple by the sea. A trunk of twisted strands with a calm face and two glowing eyes, roots
 * for legs, one of them mid-step; birds asleep in its silver-green crown, its aura breathing.
 * Over the sea the greatest storm is gathering, lightning in it, and every leaf turns at once
 * towards the water, silver side up. It is in no hurry at all: a tortoise is overtaking it.
 */
export function millenario(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const BARK = 0x5a5a6a;
  const BARK_DARK = 0x3e3e4c;
  const LEAF = 0x4f8a78;
  const SILVER = 0xc8e0e0;
  const F = octagonBase(kit, 0x1a1c22);
  const G = floor(kit, F, 0.06, 0x2c2c38, 0x20202a, 0.55);

  // The ruins: two columns with their beam, a broken one, a fallen drum.
  column(kit, -1.65, -0.75, G, 0.1, 2.4, false, 0x6a7c96);
  column(kit, -1.05, -1.4, G, 0.14, 2.4, false, 0x6a7c96);
  box(1.25, 0.22, 0.42, 0x7c8ea8, -1.35, G + 2.4, -1.08, { delay: 0.3, rotation: [0, 0.82, 0] });
  column(kit, 0.65, -1.6, G, 0.2, 2.0, true, 0x6a7c96);
  add(new CylinderGeometry(0.2, 0.2, 0.5, 12).rotateZ(Math.PI / 2), 0x6a7c96, -1.35, G, 0.95, { delay: 0.35, rotation: [0, 0.5, 0] });
  rubble(kit, -0.6, 1.2, G, 0.4, 5, 0.4);

  // The sea on the right, waves running in, and the storm over it.
  const shore = new Shape();
  [
    [1.15, -1.85],
    [2.12, -0.88],
    [2.12, 0.88],
    [1.15, 1.85],
    [0.95, 1.2],
    [1.2, 0.5],
    [1.0, -0.3],
    [1.25, -1.1],
  ].forEach(([x, z], k) => (k ? shore.lineTo(x, -z) : shore.moveTo(x, -z)));
  shore.closePath();
  add(new ExtrudeGeometry(shore, { depth: 0.03, bevelEnabled: false }).rotateX(-Math.PI / 2), 0x123a58, 0, G, 0, { delay: 0.15, flat: true, noInk: true });
  rubble(kit, 1.05, 0.1, G, 0.2, 6, 0.9, 0x3a4256);
  const foam = [0, 1, 2].map((k) => box(0.03, 0.012, 1.5 - k * 0.25, 0x9fe8ff, 2.0, G + 0.03, 0, { delay: 0.4, flat: true, noInk: true }));
  [
    [1.25, 2.95, -1.35, 0.34],
    [1.7, 3.05, -1.2, 0.3],
    [1.45, 2.75, -0.95, 0.28],
    [1.95, 2.8, -0.7, 0.24],
  ].forEach(([x, y, z, r], i) => add(new SphereGeometry(r, 14, 10).scale(1.3, 0.7, 1), i % 2 ? 0x2a2a44 : 0x3a3456, x, G + y - r * 0.7, z, { delay: 0.45 + i * 0.04 }));
  const bolt = zigzag(kit, [[1.6, G + 2.7, -1.0], [1.5, G + 2.35, -0.95], [1.68, G + 2.15, -0.92], [1.55, G + 1.8, -0.9]], 0.045, 0xeaffff, 0.6);

  // Millenario, in its own frame: facing us, the sea to its left.
  const T = { x: -0.25, z: -0.1 };
  const phi = 0.3;
  const at = (lx: number, ly: number, lz: number): Point => [T.x + lx * Math.cos(phi) + lz * Math.sin(phi), G + ly, T.z - lx * Math.sin(phi) + lz * Math.cos(phi)];
  const D = 0.7;
  // Roots for legs, the right one mid-step, and roots spreading behind.
  [
    [[-0.15, 0.75, 0], [-0.42, 0.42, 0.12], [-0.58, 0.0, 0.22]],
    [[0.15, 0.75, 0], [0.38, 0.52, 0.32], [0.48, 0.0, 0.62]],
    [[0.0, 0.65, -0.15], [0.12, 0.25, -0.5], [0.25, 0.0, -0.78]],
    [[-0.2, 0.6, -0.1], [-0.62, 0.2, -0.35], [-0.88, 0.0, -0.42]],
  ].forEach(([hip, knee, foot], i) => {
    limb(kit, at(...(hip as Point)), at(...(knee as Point)), 0.15, 0.12, BARK, { delay: D + i * 0.03 });
    limb(kit, at(...(knee as Point)), at(...(foot as Point)), 0.12, 0.08, BARK, { delay: D + 0.04 + i * 0.03 });
    [-0.6, 0, 0.6].forEach((spread, j) => {
      const [fx, , fz] = foot as Point;
      const out = Math.atan2(fx, fz) + spread;
      limb(kit, at(fx, 0.02, fz), at(fx + Math.sin(out) * 0.25, 0.0, fz + Math.cos(out) * 0.25), 0.05, 0.015, BARK_DARK, { delay: D + 0.1 + j * 0.02 });
    });
  });
  // The trunk: a core wound with four strands.
  cylinder(0.17, 0.25, 2.0, BARK_DARK, ...at(0, 0.55, 0), { delay: D + 0.1 }, 12);
  for (let k = 0; k < 4; k++) {
    const points: Point[] = [0.55, 0.95, 1.35, 1.75, 2.15, 2.55].map((h) => {
      const a = (k * Math.PI) / 2 + h * 1.3;
      const r = 0.27 - h * 0.04;
      return at(Math.cos(a) * r, h, Math.sin(a) * r);
    });
    cable(kit, points, 0.12, k % 2 ? BARK : shade(BARK, 1.2), D + 0.15 + k * 0.03);
  }
  // The face: a smooth knot of bark with two glowing eyes and a straight mouth.
  const face = add(new SphereGeometry(0.22, 16, 12).scale(1, 1.4, 0.5), shade(BARK, 1.1), ...at(0, 1.62, 0.27), { delay: D + 0.3, rotation: [0, phi, 0] });
  const eyes = decorate(face, new CylinderGeometry(0.045, 0.045, 0.02, 14).rotateX(Math.PI / 2), 0xd8ff8a, [
    [-0.085, 0.38, 0.1],
    [0.085, 0.38, 0.1],
  ]);
  decorate(face, new TorusGeometry(0.058, 0.014, 5, 16), 0x24242e, [
    [-0.085, 0.38, 0.1],
    [0.085, 0.38, 0.1],
  ]);
  decorate(face, new BoxGeometry(0.16, 0.02, 0.02), 0x24242e, [[0, 0.2, 0.105]]);
  // Branches up into the crown: clumps of silver-green leaves, birds asleep on top.
  const clumps: [number, number, number, number][] = [
    [-1.0, 2.95, 0.1, 0.48],
    [-0.45, 3.4, -0.15, 0.55],
    [0.25, 3.5, -0.05, 0.55],
    [0.9, 3.1, 0.0, 0.48],
    [1.25, 2.7, 0.2, 0.36],
    [-1.25, 2.55, 0.3, 0.34],
    [0.05, 2.95, 0.4, 0.44],
  ];
  const crown: Group[] = [];
  const leaves: MeshBasicMaterial[] = [];
  clumps.forEach(([cx, cy, cz, r], i) => {
    limb(kit, at(cx * 0.15, 2.45, 0), at(cx * 0.85, cy - r * 0.3, cz * 0.8), 0.09, 0.04, BARK, { delay: D + 0.35 + i * 0.02 });
    const clump = add(new SphereGeometry(r, 14, 10).scale(1.25, 0.7, 1), i % 2 ? LEAF : shade(LEAF, 0.85), ...at(cx, cy - r * 0.7, cz), { delay: D + 0.45 + i * 0.04, rotation: [0, phi, 0] });
    const spots: [number, number, number, number][] = [];
    for (let k = 0; k < 12; k++) {
      const theta = -1.3 + (2.6 * (k % 6)) / 5;
      const up = k < 6 ? 0.1 : 0.65;
      spots.push([1.25 * r * Math.cos(up) * Math.sin(theta), 0.7 * r * (1 + Math.sin(up)), r * Math.cos(up) * Math.cos(theta) + 0.01, (k % 3) - 1]);
    }
    leaves.push(decorate(clump, new BoxGeometry(0.13, 0.035, 0.03), shade(LEAF, 1.3), spots));
    crown.push(clump);
  });
  [0, 2, 3].forEach((i, k) => {
    const [cx, cy, cz] = clumps[i];
    const perch = at(cx + 0.1, cy + clumps[i][3] * 0.62, cz + 0.1);
    add(new SphereGeometry(0.07, 10, 8).scale(1.4, 0.9, 0.9), k === 1 ? 0x8a8ea4 : 0x6a6e84, ...perch, { delay: 1.6 + k * 0.05 });
    const head = ball(0.045, 0x8a8ea4, perch[0] + 0.08, perch[1] + 0.08, perch[2], { delay: 1.65 + k * 0.05 });
    decorate(head, new ConeGeometry(0.014, 0.05, 5).rotateZ(-Math.PI / 2), YELLOW, [[0.06, 0.045, 0]]);
    box(0.08, 0.02, 0.05, 0x4a4e64, perch[0] - 0.1, perch[1] + 0.06, perch[2], { delay: 1.66 + k * 0.05, rotation: [0, 0, 0.3] });
  });

  // The aura breathing round it.
  const aura = add(new SphereGeometry(1, 20, 14).scale(1.6, 2.1, 1.15), 0xa0ffe8, ...at(0, -0.05, 0), { delay: 0.4, flat: true, noInk: true });
  const glow = (aura.children[0] as Mesh).material as Material;
  glow.side = BackSide;
  glow.transparent = true;
  glow.opacity = 0.16;
  glow.depthWrite = false;

  // The tortoise overtaking it.
  const shell = add(new SphereGeometry(0.17, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.25, 0.85, 1), 0x6a7a3a, 0, G + 0.05, 0, { delay: 1.4 });
  decorate(shell, new CylinderGeometry(0.05, 0.05, 0.01, 6), 0x4a5a2a, [
    [0, 0.145, 0],
    [0.1, 0.11, 0.06],
    [-0.1, 0.11, -0.06],
  ]);
  const turtleParts = [
    shell,
    ball(0.06, 0x8a9a5a, 0.24, G + 0.05, 0, { delay: 1.45 }),
    ...[
      [0.12, 0.1],
      [-0.12, 0.1],
      [0.12, -0.1],
      [-0.12, -0.1],
    ].map(([dx, dz]) => cylinder(0.035, 0.035, 0.08, 0x8a9a5a, dx, G, dz, { delay: 1.45 }, 8)),
  ];
  const turtle = new Group();
  shell.parent?.add(turtle);
  turtleParts.forEach((part) => turtle.add(part));
  const walk = (t: number) => {
    const s = (t * 0.05) % 1;
    turtle.position.set(-1.0 + s * 2.0, 0, 1.25 - s * 0.15);
    turtle.rotation.y = -0.08;
  };
  walk(0);

  const green = new Color(shade(LEAF, 1.3));
  const silver = new Color(SILVER);
  tick((t) => {
    // Now and then every leaf turns at once towards the sea, silver side up, and the crown leans.
    const turn = Math.max(0, Math.sin(t * 0.6)) ** 2;
    leaves.forEach((material) => material.color.lerpColors(green, silver, turn));
    crown.forEach((clump, i) => (clump.rotation.z = -0.12 * turn + Math.sin(t * 1.3 + i) * 0.015));
    bolt.forEach((piece) => (piece.visible = t < 0.5 || Math.floor(t * 3) % 6 === 0));
    foam.forEach((line, k) => {
      const s = (t * 0.25 + k / 3) % 1;
      line.position.x = 2.0 - s * 0.75;
      line.visible = s < 0.9;
    });
    glow.opacity = 0.13 + Math.sin(t * 1.2) * 0.04;
    eyes.color.setHex(Math.floor(t * 0.4) % 9 === 4 ? 0x5a6a3a : 0xd8ff8a);
    walk(t);
  });

  return { width: 4.9, height: 4.7, lookY: 1.95 };
}
