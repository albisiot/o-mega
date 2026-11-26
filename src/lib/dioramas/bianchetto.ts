import { BoxGeometry, ConeGeometry, CylinderGeometry } from "three";
import { MAGENTA, ORANGE, YELLOW, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, skyline } from "@/lib/diorama-props";

/**
 * Bianchetto (P339): the eraser thief on a flat roof under a magenta moon, sweeping his bandaged
 * hand through a jet of fire somebody has thrown at him: where he touches it the fire turns into
 * blank sheets of paper that flutter down onto the roof. His price sits on the stair hut
 * behind him: he once fiddled with the satellite dish, and now it is paper too, sagging.
 */
export function bianchetto(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick } = kit;
  const PAPER = 0xf2eee2;
  const F = octagonBase(kit, 0x1c1a26);
  const G = floor(kit, F, 0.06, 0x2a2836, 0x1c1a28, 0.4);

  // The roof: the city and a magenta moon behind, a stair hut, a skylight, a low parapet.
  skyline(kit, -1.95, G, 0.1, [0x22344a, 0x2a2f4a, 0x3a2a4a], -1.2, 1.25);
  const moon = add(new CylinderGeometry(0.38, 0.38, 0.04, 24).rotateX(Math.PI / 2), MAGENTA, 1.0, G + 2.6, -1.75, { delay: 0.15, flat: true, rotation: [0, 0.33, 0] });
  decorate(moon, new CylinderGeometry(0.1, 0.1, 0.01, 12).rotateX(Math.PI / 2), 0xd8245a, [
    [-0.12, 0.45, 0.025],
    [0.14, 0.25, 0.025],
  ]);
  const hut = box(1.0, 1.5, 0.9, 0x3a3448, -1.0, G, -1.1, { delay: 0.2, rotation: [0, 0.2, 0] });
  decorate(hut, new BoxGeometry(0.42, 0.95, 0.01), 0x1c1a28, [[0.15, 0.475, 0.451]]);
  decorate(hut, new BoxGeometry(0.06, 0.06, 0.01), YELLOW, [[0.3, 0.5, 0.457]]);
  box(1.1, 0.06, 1.0, 0x4a4458, -1.0, G + 1.5, -1.1, { delay: 0.25, rotation: [0, 0.2, 0] });
  // The satellite dish on the hut, turned to paper and sagging off its arm.
  box(0.05, 0.4, 0.05, 0x23222b, -1.15, G + 1.56, -1.2, { delay: 0.4 });
  const dish = add(new CylinderGeometry(0.34, 0.08, 0.1, 18), PAPER, -1.05, G + 1.75, -1.05, { delay: 0.45, rotation: [0.9, 0.3, 0.35] });
  decorate(dish, new CylinderGeometry(0.06, 0.06, 0.01, 10), 0xd8d2c4, [[0, 0.102, 0]]);
  box(0.12, 0.2, 0.006, PAPER, -0.82, G + 1.6, -0.9, { delay: 0.5, rotation: [0.2, 0.3, 0.3] });
  const sky = box(0.7, 0.3, 0.6, 0x3a3f4e, 1.25, G, -0.55, { delay: 0.3, rotation: [0, 0.3, 0] });
  decorate(sky, new BoxGeometry(0.6, 0.01, 0.5), 0x16c8ff, [[0, 0.305, 0]]);
  decorate(sky, new BoxGeometry(0.02, 0.012, 0.5), 0x23222b, [[0, 0.31, 0]]);
  box(0.12, 0.35, 2.2, 0x3a3448, 2.0, G, 0.55, { delay: 0.35, rotation: [0, -0.4, 0] });

  // Bianchetto: platinum hair, a long black coat, a bandaged right hand.
  const thief = figure(kit, {
    x: 0.35,
    z: 0.2,
    y: G,
    facing: 0.3,
    height: 2.45,
    build: "slim",
    skin: 0xe8d0c0,
    hair: { style: "spiky", color: 0xe8e4d0 },
    face: { mouth: "smirk", brows: "raised", eyes: 0x3a4a5a },
    top: { kind: "coat", color: 0x1f2130, accent: 0x14151d },
    bottom: { kind: "trousers", color: 0x1f2130 },
    shoes: 0x14141a,
    arms: [[-0.85, 1.6, 0.35], [0.45, 1.0, -0.12]],
    legs: "wide",
    delay: 0.8,
  });
  const [hand] = thief.hands;
  limb(kit, thief.elbows[0], hand, 0.1, 0.095, PAPER, { delay: 1.3 });
  const glove = cylinder(0.1, 0.1, 0.16, PAPER, hand[0], hand[1] - 0.08, hand[2], { delay: 1.35 }, 12);
  decorate(glove, new BoxGeometry(0.2, 0.012, 0.2), 0xc8c2b4, [
    [0, 0.05, 0],
    [0, 0.11, 0],
  ]);

  // The jet of fire from off the roof; nearest his hand it is already paper.
  const from: Point = [-2.0, G + 1.8, 0.3];
  limb(kit, from, hand, 0.3, 0.07, ORANGE, { delay: 1.4, flat: true });
  limb(kit, lerp(from, hand, 0.78), hand, 0.12, 0.07, PAPER, { delay: 1.5 });
  // Tongues of flame licking up off the jet.
  const tongues = Array.from({ length: 7 }, (_, k) => {
    const v = 0.05 + k * 0.11;
    const p = lerp(from, hand, v);
    const size = 0.13 - v * 0.08;
    const part = add(new ConeGeometry(size, size * 3.2, 8), k % 2 ? YELLOW : ORANGE, p[0], p[1] + 0.12 - v * 0.1, p[2] + (k % 3) * 0.06 - 0.06, {
      delay: 1.45 + k * 0.03,
      flat: true,
      rotation: [0.3 * ((k % 3) - 1), 0, 0.5 - (k % 2) * 0.3],
    });
    return { part, scales: part.children.map((mesh) => mesh.scale.y) };
  });

  // The sheets it turns into, fluttering down, and those already on the roof.
  [
    [-0.9, 1.35, 0.4],
    [-0.35, 1.55, 1.7],
    [0.6, 1.3, 2.6],
    [-1.4, 0.75, 1.1],
    [1.1, 0.85, 0.3],
  ].forEach(([x, z, r], k) => box(0.2, 0.006, 0.26, PAPER, x, G, z, { delay: 1.0 + k * 0.03, rotation: [0, r, 0], noInk: true }));
  const sheets = Array.from({ length: 9 }, (_, k) => ({
    part: box(0.18, 0.24, 0.006, PAPER, ...hand, { delay: 1.6 + k * 0.03 }),
    k,
  }));

  tick((t) => {
    tongues.forEach(({ part, scales }, k) => {
      const flick = 1 + Math.sin(t * 13 + k * 2.1) * 0.25;
      part.children.forEach((mesh, i) => (mesh.scale.y = scales[i] * flick));
    });
    sheets.forEach(({ part, k }) => {
      const v = (t * 0.28 + k / sheets.length) % 1;
      part.position.set(hand[0] - 0.1 - v * 0.7 + Math.sin(v * 9 + k) * 0.15, hand[1] - 0.15 - v * (hand[1] - G - 0.1), hand[2] + 0.1 + v * 0.55);
      part.rotation.set(Math.sin(v * 7 + k) * 0.9, v * 4 + k, Math.cos(v * 5 + k) * 0.6);
    });
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}

function lerp(a: Point, b: Point, k: number): Point {
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}
