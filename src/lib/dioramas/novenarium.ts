import { BoxGeometry, Color, CylinderGeometry, DodecahedronGeometry, Group, SphereGeometry, TorusGeometry, type Mesh, type MeshBasicMaterial } from "three";
import { INK, colorOf, limb, octagonBase, zigzag, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { column, coolingTower, floor } from "@/lib/diorama-props";

/**
 * Novenarium (P217): the nine seconds of the Ora Zero, still going on: out of a cracked crater
 * rises a column of nine glowing rings with a vast blank face on top, and caught in it a
 * temple front, a broken column, a chimney, rocks and two people turn round and round. Every
 * few seconds the loop starts again and the rings flare. On the rim a TV camera on its tripod
 * still points at it, red light on, the operator's headphones left on the ground: "Camera Tre,
 * siamo pronti". The face has nothing behind its eyes.
 */
export function novenarium(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const GLOW = 0xffe9a8;
  const ROCK = 0x3a3646;
  const F = octagonBase(kit, 0x1a1822);
  const G = floor(kit, F, 0.06, 0x24222e, 0x18161e, 0);
  const C: Point = [0, G, -0.25];

  // The crater: a rim of rocks, glowing cracks running out of it.
  for (let k = 0; k < 11; k++) {
    const a = (k / 11) * Math.PI * 2 + 0.2;
    const r = 1.05 + ((k * 7) % 3) * 0.06;
    const size = 0.16 + ((k * 5) % 4) * 0.04;
    add(new DodecahedronGeometry(size).scale(1.4, 0.7, 1), k % 2 ? ROCK : 0x4a4656, C[0] + Math.sin(a) * r, G - 0.02, C[2] + Math.cos(a) * r, { delay: 0.1 + k * 0.02, rotation: [0, a, 0] });
  }
  cylinder(0.95, 0.95, 0.01, 0x0c0a12, C[0], G, C[2], { delay: 0.08, flat: true, noInk: true }, 24);
  [0.5, 2.1, 3.6, 5.0].forEach((a, i) =>
    zigzag(kit, [0, 1, 2, 3].map((k) => [C[0] + Math.sin(a + (k % 2) * 0.12) * (1.15 + k * 0.28), G + 0.01, C[2] + Math.cos(a + (k % 2) * 0.12) * (1.15 + k * 0.28)] as Point), 0.035, GLOW, 0.3 + i * 0.03),
  );
  // What is left round it: a broken column, the power plant's tower.
  column(kit, -1.55, -1.1, G, 0.2, 1.8, true);
  coolingTower(kit, 1.45, -1.25, G, 0.25, 1.5);

  // The column of nine rings round a pale core, the blank face on top.
  const core = add(new CylinderGeometry(0.55, 0.72, 3.5, 24, 1, true), GLOW, C[0], G + 0.05, C[2], { delay: 0.5, flat: true, noInk: true });
  const coreMaterial = (core.children[0] as Mesh).material as MeshBasicMaterial;
  coreMaterial.transparent = true;
  coreMaterial.opacity = 0.32;
  coreMaterial.depthWrite = false;
  const rings = Array.from({ length: 9 }, (_, k) =>
    add(new TorusGeometry(0.72 - k * 0.018, 0.035, 6, 36, Math.PI * 1.75).rotateX(Math.PI / 2), GLOW, C[0], G + 0.25 + k * 0.38, C[2], {
      delay: 0.6 + k * 0.05,
      flat: true,
      noInk: true,
      rotation: [Math.sin(k) * 0.08, k, Math.cos(k) * 0.08],
    }),
  );
  const face = add(new SphereGeometry(0.42, 18, 14).scale(0.9, 1.1, 0.8), GLOW, C[0], G + 3.3, C[2], { delay: 1.2, rotation: [0, 0.3, 0] });
  decorate(face, new BoxGeometry(0.14, 0.04, 0.02), 0xffffff, [
    [-0.13, 0.52, 0.32],
    [0.13, 0.52, 0.32],
  ]);
  decorate(face, new BoxGeometry(0.06, 0.14, 0.06), 0xe8c880, [[0, 0.43, 0.33]]);
  decorate(face, new BoxGeometry(0.14, 0.025, 0.02), 0xc8a060, [[0, 0.27, 0.31]]);

  // The debris, all turning together round the column.
  const swirl = new Group();
  swirl.position.set(C[0], 0, C[2]);
  const spin = (part: Group) => {
    part.position.x -= C[0];
    part.position.z -= C[2];
    swirl.add(part);
    return part;
  };
  const at = (a: number, r: number, y: number): Point => [C[0] + Math.sin(a) * r, G + y, C[2] + Math.cos(a) * r];
  // A temple front, tumbling: steps, three columns, the pediment.
  const temple = new Group();
  temple.position.set(...at(-0.95, 0.95, 2.1));
  temple.position.x -= C[0];
  temple.position.z -= C[2];
  temple.rotation.set(0.25, -0.9, 0.35);
  swirl.add(temple);
  const piece = (part: Group) => temple.add(part);
  piece(box(0.66, 0.07, 0.3, 0x9ab4c8, 0, 0, 0, { delay: 1.0 }));
  [-0.24, 0, 0.24].forEach((dx, i) => piece(cylinder(0.045, 0.05, 0.38, 0x7c9cb4, dx, 0.07, 0, { delay: 1.02 + i * 0.02 }, 8)));
  piece(box(0.7, 0.06, 0.32, 0x9ab4c8, 0, 0.45, 0, { delay: 1.06 }));
  piece(add(new CylinderGeometry(0.42, 0.42, 0.28, 3).rotateX(Math.PI / 2).rotateZ(Math.PI).scale(1, 0.42, 1), 0x7c9cb4, 0, 0.51, 0, { delay: 1.08 }));
  // A drum of column, a chimney, rocks.
  spin(cylinder(0.14, 0.15, 0.4, 0x7c9cb4, ...at(1.4, 0.95, 1.1), { delay: 1.1, rotation: [1.2, 0.4, 0.3] }, 10));
  const chimney = spin(cylinder(0.08, 0.1, 0.8, 0x6a6e7a, ...at(2.6, 0.9, 1.6), { delay: 1.12, rotation: [0.3, 0, -0.5] }, 10));
  decorate(chimney, new CylinderGeometry(0.085, 0.085, 0.06, 10), 0xff2e6c, [[0, 0.65, 0]]);
  [
    [0.4, 1.0, 0.6],
    [3.4, 0.95, 2.7],
    [4.4, 1.0, 0.9],
    [5.4, 0.9, 3.1],
    [-2.0, 1.0, 1.8],
  ].forEach(([a, r, y], i) => spin(add(new DodecahedronGeometry(0.08 + (i % 3) * 0.03), ROCK, ...at(a, r, y), { delay: 1.15 + i * 0.02, rotation: [i, i * 2, 0] })));
  // Two people caught in it, arms flung out.
  [
    [0.15, 0.88, 1.25, 0.6, 0x7a2a52],
    [3.9, 0.9, 2.55, -0.8, 0x23404b],
  ].forEach(([a, r, y, tilt, coat], i) => {
    const p = at(a, r, y);
    const who = figure(kit, {
      x: p[0],
      z: p[2],
      y: p[1],
      facing: a + 0.4,
      height: 0.85,
      build: "slim",
      skin: 0xd8a888,
      hair: { style: "short", color: 0x2a201c },
      face: { mouth: "open", brows: "worried" },
      top: { kind: "coat", color: coat },
      bottom: { kind: "trousers", color: 0x2a2a34 },
      arms: ["out", "up"],
      legs: "stride",
      delay: 1.25 + i * 0.1,
    });
    const body = new Group();
    body.position.set(...p);
    body.rotation.z = tilt;
    swirl.add(body);
    who.parts.forEach((part) => {
      part.position.x -= p[0];
      part.position.y -= p[1];
      part.position.z -= p[2];
      body.add(part);
    });
  });
  core.parent?.add(swirl);

  // Camera Tre on the rim, still pointing at it; the operator's headphones on the ground.
  const T: Point = [1.25, G, 1.0];
  [0, 2.1, 4.2].forEach((a, i) => limb(kit, [T[0], G + 0.95, T[2]], [T[0] + Math.sin(a) * 0.32, G, T[2] + Math.cos(a) * 0.32], 0.02, 0.02, INK, { delay: 1.4 + i * 0.02 }));
  const cam = box(0.24, 0.26, 0.5, 0x2a2a34, T[0], G + 0.95, T[2], { delay: 1.5, rotation: [0, -2.3, 0] });
  decorate(cam, new CylinderGeometry(0.09, 0.11, 0.2, 14).rotateX(Math.PI / 2), INK, [[0, 0.13, 0.32]]);
  decorate(cam, new CylinderGeometry(0.07, 0.07, 0.01, 14).rotateX(Math.PI / 2), 0x16c8ff, [[0, 0.13, 0.425]]);
  box(0.06, 0.12, 0.16, 0x2a2a34, T[0] - 0.05, G + 1.2, T[2] + 0.02, { delay: 1.52, rotation: [0, -2.3, 0] });
  const tally = ball(0.035, 0xff2e3a, T[0] + 0.06, G + 1.21, T[2] + 0.18, { delay: 1.55, flat: true, noInk: true });
  add(new TorusGeometry(0.11, 0.018, 6, 16, Math.PI), INK, 0.55, G, 1.6, { delay: 1.6, rotation: [-Math.PI / 2, 0, 0.6] });
  [-1, 1].forEach((side) => cylinder(0.04, 0.04, 0.03, 0x2a2a34, 0.55 + side * 0.1 * Math.cos(0.6), G, 1.6 - side * 0.1 * Math.sin(0.6), { delay: 1.62 }, 10));

  // The aura: light rising round the column.
  motes(22, GLOW, 0.03, [C[0] - 1, G + 0.2, C[2] - 0.9], [C[0] + 1, G + 3.9, C[2] + 0.9], 1.3);

  const base = new Color(GLOW);
  const flare = new Color(0xffffff);
  tick((t) => {
    swirl.rotation.y = t * 0.45;
    rings.forEach((ring, k) => (ring.rotation.y = k + t * (k % 2 ? 0.8 : -0.6)));
    // Nine seconds, again and again: at the start of each loop the rings flare from the bottom up.
    const u = t % 9;
    rings.forEach((ring, k) => {
      const lit = u > 0.1 * k && u < 0.1 * k + 0.5;
      colorOf(ring).copy(lit ? flare : base);
      ring.children[0].scale.setScalar(lit ? 1.12 : 1);
    });
    coreMaterial.opacity = 0.32 + Math.sin(t * 2) * 0.06;
    tally.visible = Math.floor(t * 2) % 2 === 0;
  });

  return { width: 4.9, height: 4.7, lookY: 1.95 };
}
