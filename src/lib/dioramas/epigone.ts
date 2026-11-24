import { BoxGeometry, Color, CylinderGeometry, OctahedronGeometry, type Group } from "three";
import { MAGENTA, archMouth, archedWall, colorOf, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, flame, ring } from "@/lib/diorama-props";

/**
 * Epigone (P011): the newest of the Figli dell'Ultima, round-faced and beaming in his teal hooded
 * robe, stands in the glowing circle of their cellar with the biscuit tin he brought on his first
 * day under his arm; his new dark magic, stars swirling over his palm, levitates a biscuit. On
 * the altar the candles burn round a plate of biscuits, his sleeping roll lies in the corner
 * (he never left), and a trail of crumbs leads straight from the door to him.
 */
export function epigone(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const STONE = 0x3a3450;
  const BISCUIT = 0xd8a45a;
  const ROBE = 0x23505a;
  const F = octagonBase(kit, 0x1e1a28);
  const G = floor(kit, F, 0.06, 0x2c2838, 0x1e1a28, 0.4);

  // The cellar wall with the arched door they came down through.
  const wall = add(archedWall(3.4, 2.6, 0.3, { x: -1.15, half: 0.42, spring: 1.25 }), STONE, 0, G, -1.3, { delay: 0.1, ink: 1.02 });
  decorate(
    wall,
    new BoxGeometry(0.34, 0.16, 0.01),
    0x4a4266,
    [
      [0.3, 0.3],
      [0.9, 0.55],
      [1.4, 0.25],
      [0.5, 1.1],
      [1.2, 1.4],
      [0.2, 1.9],
      [0.95, 2.2],
      [-0.5, 0.7],
      [-1.4, 2.0],
      [-0.4, 2.3],
    ].map(([x, y]) => [x, y, 0.152] as Point),
  );
  add(archMouth(0.42, 1.25), 0x0c0a12, -1.15, G, -1.47, { delay: 0.14, noInk: true });

  // The altar: candles round a plate of biscuits, a magenta cloth.
  const altar = box(1.0, 0.7, 0.5, STONE, 0.95, G, -0.7, { delay: 0.3 });
  decorate(altar, new BoxGeometry(0.3, 0.72, 0.01), MAGENTA, [[0, 0.35, 0.252]]);
  cylinder(0.22, 0.2, 0.03, 0xe8e2d0, 0.95, G + 0.7, -0.65, { delay: 0.4 }, 16);
  [-0.08, 0.06, 0, -0.02].forEach((dx, k) => cylinder(0.07, 0.07, 0.025, BISCUIT, 0.95 + dx, G + 0.73 + k * 0.025, -0.65 + (k % 2) * 0.05, { delay: 0.45 + k * 0.02 }, 12));
  const flames: Group[] = [];
  [
    [0.55, -0.8, 0.34],
    [0.68, -0.6, 0.22],
    [1.25, -0.8, 0.4],
    [1.37, -0.6, 0.26],
  ].forEach(([x, z, h], i) => {
    cylinder(0.04, 0.04, h, 0xe8e2d0, x, G + 0.7, z, { delay: 0.5 + i * 0.03 }, 8);
    flames.push(...flame(kit, x, z - 0.03, G + 0.7 + h, 0.6 + i * 0.03, 0.3));
  });

  // His sleeping roll and pillow in the corner.
  add(new CylinderGeometry(0.16, 0.16, 0.8, 12).rotateZ(Math.PI / 2), 0x2f6a76, -1.35, G, 0.55, { delay: 0.5, rotation: [0, 0.8, 0] });
  box(0.4, 0.12, 0.28, 0xd8d2c4, -0.85, G, 1.05, { delay: 0.55, rotation: [0, 0.6, 0] });

  // The circle on the floor, with its strokes, and the crumbs from the door.
  const X = 0.0;
  const Z = 0.45;
  const circle = ring(kit, [X, G + 0.005, Z], 0.85, MAGENTA, 0.6);
  ring(kit, [X, G + 0.005, Z], 0.7, MAGENTA, 0.65);
  [0, 1, 2, 3, 4, 5].forEach((k) => {
    const a = (k / 6) * Math.PI * 2;
    box(0.04, 0.006, 0.14, MAGENTA, X + Math.sin(a) * 0.775, G + 0.004, Z + Math.cos(a) * 0.775, { delay: 0.7 + k * 0.02, flat: true, noInk: true, rotation: [0, a, 0] });
  });
  [
    [-1.1, -0.95],
    [-0.95, -0.7],
    [-0.8, -0.45],
    [-0.62, -0.22],
    [-0.45, -0.02],
    [-0.3, 0.15],
  ].forEach(([x, z], i) => cylinder(0.05, 0.05, 0.025, BISCUIT, x + (i % 2) * 0.08, G, z, { delay: 0.75 + i * 0.03 }, 8));

  // Epigone: short and round, rosy, curls under the hood; the tin under one arm, the other palm up.
  const H = 2.2;
  const u = H / 2.4;
  const adept = figure(kit, {
    x: X,
    z: Z,
    y: G,
    facing: 0.3,
    height: H,
    build: "heavy",
    skin: 0xe8b8a0,
    face: { mouth: "smile", brows: "raised", marks: 0xe07080 },
    headwear: { kind: "hood", color: ROBE },
    top: { kind: "robe", color: ROBE, accent: 0x2f6a76 },
    arms: [[-0.36, 1.15, 0.3], [0.42, 1.45, 0.45]],
    delay: 0.8,
  });
  [-0.1, 0, 0.1].forEach((dx, i) => ball(0.055 * u * 1.2, 0x5a3a24, ...adept.at(dx * u, (2.3 - (i % 2 ? 0 : 0.03)) * u, 0.15 * u), { delay: 1.3 + i * 0.02 }));
  // The tin: blue, the biscuits painted round it.
  const [tinHand, palm] = adept.hands;
  const tin = cylinder(0.2, 0.2, 0.16, 0x2f5a8a, tinHand[0] + 0.05, tinHand[1] - 0.06, tinHand[2] + 0.02, { delay: 1.4 }, 18);
  decorate(tin, new CylinderGeometry(0.05, 0.05, 0.01, 12).rotateX(Math.PI / 2), BISCUIT, [
    [-0.08, 0.08, 0.19],
    [0.06, 0.08, 0.195],
  ]);
  cylinder(0.205, 0.205, 0.03, 0x3a70a8, tinHand[0] + 0.05, tinHand[1] + 0.1, tinHand[2] + 0.02, { delay: 1.45 }, 18);

  // Over his palm: a biscuit turning in the air, stars wheeling round it.
  const B: Point = [palm[0] + 0.05, palm[1] + 0.32, palm[2]];
  const floating = cylinder(0.1, 0.1, 0.03, BISCUIT, ...B, { delay: 1.5, rotation: [1.2, 0, 0] }, 12);
  const stars = [0, 1, 2, 3, 4].map((k) => add(new OctahedronGeometry(0.05 + (k % 2) * 0.02).scale(1, 1.6, 0.4), MAGENTA, ...B, { delay: 1.55 + k * 0.03, flat: true, noInk: true }));
  motes(10, MAGENTA, 0.025, [palm[0] - 0.3, palm[1], palm[2] - 0.2], [palm[0] + 0.3, palm[1] + 0.9, palm[2] + 0.2], 1.6);

  const deep = new Color(MAGENTA);
  const pale = new Color(0xff9ac0);
  tick((t) => {
    // The stars wheel round, the biscuit bobs and turns, the circle breathes, the candles flicker.
    stars.forEach((star, k) => {
      const a = t * 2 + (k / 5) * Math.PI * 2;
      star.position.set(B[0] + Math.cos(a) * 0.28, B[1] - 0.05 + Math.sin(a * 1.5 + k) * 0.08, B[2] + Math.sin(a) * 0.28);
      star.rotation.y = a;
    });
    floating.position.y = B[1] + Math.sin(t * 2.2) * 0.05;
    floating.rotation.set(1.2, t * 1.5, 0);
    colorOf(circle).lerpColors(deep, pale, (Math.sin(t * 1.5) + 1) / 2);
    flames.forEach((part, i) => (part.children[0].scale.y = 1 + Math.sin(t * 11 + i * 2) * 0.15));
  });

  return { width: 4.9, height: 4.3, lookY: 1.45 };
}
