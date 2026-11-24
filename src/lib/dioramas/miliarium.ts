import { BoxGeometry, Color, CylinderGeometry, ExtrudeGeometry, Group, Shape, TorusGeometry } from "three";
import { INK, MAGENTA, archedWall, colorOf, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Miliarium (P161): the prophet of the milestones stands by an old Roman road, his face behind
 * a shield-shaped iron plate, an ochre stole over his shoulders hung with dozens of little stone
 * tablets that sway as he breathes; his hand rests on a milestone whose carved rings light up
 * one by one, a crescendo, then all at once. Two hooded followers kneel on the far side of the
 * road, an aqueduct stands behind; a modern road sign lies knocked flat in the grass.
 */
export function miliarium(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick } = kit;
  const BASALT = [0x4a4f5c, 0x565b68, 0x40444f];
  const OCHRE = 0xb07a28;
  const STONE = 0xa8a494;
  const TABLET = 0xd8d0b8;
  const BRICK = 0x6a4a40;
  const F = octagonBase(kit, 0x1f1d22);
  const G = floor(kit, F, 0.06, 0x3a3530, 0x2c2824, 0);

  // The aqueduct along the left, two arches and its channel.
  [-0.95, -0.13].forEach((z, i) => add(archedWall(0.82, 1.9, 0.32, { x: 0, half: 0.24, spring: 0.95 }), BRICK, -1.65, G, z, { delay: 0.1 + i * 0.05, ink: 1.02, rotation: [0, Math.PI / 2, 0] }));
  const channel = box(0.4, 0.2, 1.66, 0x7a5a4c, -1.65, G + 1.9, -0.54, { delay: 0.2 });
  decorate(channel, new BoxGeometry(0.01, 0.03, 1.66), 0x4a342e, [[0.201, 0.06, 0]]);
  add(new CylinderGeometry(0.01, 0.26, 2.3, 10), 0x1f4a32, -0.25, G, -1.8, { delay: 0.22 });

  // The Roman road: big basalt slabs from the front of the base to the back.
  const A: [number, number] = [1.4, 1.75];
  const d: [number, number] = [-0.258, -0.966];
  const n: [number, number] = [0.966, -0.258];
  let k = 0;
  for (let s = 0.15; s < 3.85; s += 0.3)
    for (const w of [-0.32, 0, 0.32]) {
      const shift = (Math.round(s / 0.3) % 2) * 0.12;
      const x = A[0] + d[0] * s + n[0] * (w + shift - 0.06);
      const z = A[1] + d[1] * s + n[1] * (w + shift - 0.06);
      if (Math.abs(x) > 2.05 || Math.abs(z) > 2.05 || Math.abs(x) + Math.abs(z) > 2.95) continue;
      cylinder(0.15, 0.16, 0.05, BASALT[k % 3], x, G, z, { delay: 0.25 + k * 0.008, rotation: [0, k * 0.7, 0] }, 6);
      k++;
    }

  // The modern sign, knocked flat beside the road.
  cylinder(0.025, 0.025, 1.0, 0x23222b, -0.75, G + 0.025, 1.4, { delay: 0.4, rotation: [0, 0, Math.PI / 2] }, 8);
  const disc = cylinder(0.2, 0.2, 0.03, 0x2a6ac8, -1.75, G, 1.35, { delay: 0.44 }, 20);
  decorate(disc, new TorusGeometry(0.15, 0.02, 6, 20).rotateX(Math.PI / 2), 0xf4f0e6, [[0, 0.032, 0]]);

  // The milestone, with five carved rings that light up in turn.
  const theta = 0.3;
  const prophet = figure(kit, {
    x: -0.4,
    z: 0.75,
    y: G,
    facing: theta,
    height: 2.55,
    build: "broad",
    skin: 0x2a2420,
    face: { blank: true },
    headwear: { kind: "helmet", color: 0x4a4a52, accent: 0x3a3a40 },
    top: { kind: "robe", color: 0x8a8a80 },
    cape: OCHRE,
    scarf: OCHRE,
    gloves: 0x4a3a2e,
    arms: ["down", [0.68, 1.36, 0.12]],
    delay: 0.9,
  });
  const at = prophet.at;
  const turn: Point = [0, theta, 0];
  const stone = at(0.78, 0, 0.12);
  box(0.62, 0.16, 0.62, 0x8a8678, ...stone, { delay: 0.5, rotation: turn });
  const shaft = cylinder(0.24, 0.27, 1.1, STONE, stone[0], G + 0.16, stone[2], { delay: 0.55 }, 16);
  decorate(
    shaft,
    new BoxGeometry(0.08, 0.06, 0.01),
    0xd08a2a,
    [
      [0.2, 0.25],
      [0.5, 0.62],
      [-0.3, 0.9],
      [0.9, 0.4],
      [0.1, 1.0],
    ].map(([a, h]) => [Math.sin(theta + a) * 0.262, h, Math.cos(theta + a) * 0.262, a] as [number, number, number, number]),
  );
  const rings = [0.2, 0.38, 0.56, 0.74, 0.92].map((h, i) =>
    add(new TorusGeometry(0.262, 0.022, 6, 28).rotateX(Math.PI / 2), MAGENTA, stone[0], G + 0.16 + h, stone[2], { delay: 0.6 + i * 0.04, flat: true, noInk: true }),
  );

  // The ochre mantle over his shoulders, and the shield-shaped plate over his face.
  add(new CylinderGeometry(0.46, 0.74, 0.56, 18).scale(1, 1, 0.72), OCHRE, ...at(0, 1.42, 0), { delay: 1.25, rotation: turn });
  const plateShape = new Shape();
  plateShape.moveTo(-0.17, 0.22);
  plateShape.lineTo(0.17, 0.22);
  plateShape.lineTo(0.17, -0.02);
  plateShape.quadraticCurveTo(0.15, -0.2, 0, -0.3);
  plateShape.quadraticCurveTo(-0.15, -0.2, -0.17, -0.02);
  plateShape.closePath();
  const plate = add(new ExtrudeGeometry(plateShape, { depth: 0.04, bevelEnabled: false }), 0xd8d0b8, ...at(0, 1.98, 0.22), { delay: 1.4, rotation: turn });
  decorate(plate, new BoxGeometry(0.34, 0.07, 0.01), OCHRE, [[0.0, 0.3, 0.045, 0.75]]);
  decorate(plate, new BoxGeometry(0.22, 0.022, 0.01), INK, [[0, 0.37, 0.046]]);

  // The tablets: plaques stuck all over the mantle, and a fringe of them swinging from its hem.
  const mantle = (a: number, h: number, out: number): Point => {
    const r = 0.74 - (0.28 * h) / 0.56 + out;
    return at(Math.sin(a) * r, 1.42 + h, Math.cos(a) * r * 0.72);
  };
  [-0.9, -0.55, -0.2, 0.2, 0.55, 0.9].forEach((a, i) =>
    box(0.08, 0.12, 0.025, TABLET, ...mantle(a, 0.2 + (i % 2) * 0.12, 0.02), { delay: 1.5 + i * 0.02, rotation: [-0.35, theta + a * 0.8, 0] }),
  );
  const swings: Group[] = [];
  for (let i = 0; i < 9; i++) {
    const a = -1.0 + i * 0.25;
    const top = mantle(a, 0, 0.01);
    const hang = 0.05 + (i % 3) * 0.05;
    const string = box(0.008, hang, 0.008, 0x3a2e24, top[0], top[1] - hang, top[2], { delay: 1.55 + i * 0.02, noInk: true });
    const tablet = box(0.07, 0.11, 0.025, TABLET, top[0], top[1] - hang - 0.11, top[2], { delay: 1.6 + i * 0.02, rotation: [0, theta + a * 0.8, 0] });
    decorate(tablet, new BoxGeometry(0.03, 0.04, 0.01), 0x6a6458, [[0, 0.06, 0.013]]);
    const pivot = new Group();
    pivot.position.set(...top);
    string.parent?.add(pivot);
    [string, tablet].forEach((part) => {
      part.position.set(part.position.x - top[0], part.position.y - top[1], part.position.z - top[2]);
      pivot.add(part);
    });
    swings.push(pivot);
  }

  // Two hooded followers kneel on the far side of the road.
  const followers = [
    [1.7, -0.15],
    [1.2, -1.3],
  ].map(([x, z], i) =>
    figure(kit, {
      x,
      z,
      y: G,
      facing: -1.2,
      height: 2.0,
      skin: 0x2a2420,
      face: { blank: true },
      headwear: { kind: "hood", color: 0x4a3a30 },
      top: { kind: "robe", color: 0x4a3a30 },
      arms: ["chin", "chin"],
      legs: "kneel",
      delay: 0.7 + i * 0.1,
    }),
  );
  const bowRest = followers.map((f) => f.parts.map((part) => part.position.y));

  const dim = new Color(0x4a2a3a);
  const lit = new Color(MAGENTA);
  const flash = new Color(0xffd0e4);
  tick((t) => {
    // The rings climb the milestone one at a time, then all flare together, then go dark.
    const p = (t * 0.3 + 0.45) % 1;
    const count = Math.floor(p * 6);
    rings.forEach((ring, i) => colorOf(ring).copy(count >= 5 ? flash : i < count ? lit : dim));
    swings.forEach((pivot, i) => (pivot.rotation.z = Math.sin(t * 1.6 + i * 0.8) * 0.18));
    followers.forEach((f, j) => f.parts.forEach((part, i) => (part.position.y = bowRest[j][i] - Math.max(0, Math.sin(t * 1.2 + j)) * 0.04)));
  });

  return { width: 4.9, height: 4.5, lookY: 1.55 };
}
