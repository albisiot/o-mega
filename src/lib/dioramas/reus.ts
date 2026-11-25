import { BoxGeometry, CatmullRomCurve3, OctahedronGeometry, Vector3, type Mesh, type MeshToonMaterial } from "three";
import { INK, MAGENTA, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Reus (P219): the last prisoner of the Compagnia Lete, in a glass cell under a flickering
 * green tube, a bare cot and a dead wall phone behind him. He presses his palm to the glass
 * with a thin smile; outside, on a school visit, a boy presses his own small hand to it, while
 * the father looks at his phone. Little sparks of magenta grudge drift out through the glass
 * into the father's head: Reus gives the resentment back.
 */
export function reus(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick } = kit;
  const GREEN = 0x7fffd0;
  const CONCRETE = 0x3a4448;
  const F = octagonBase(kit, 0x1d1b26);
  const G = floor(kit, F, 0.06, 0x2a3034, 0x1c2024, 0.5);

  // The cell: concrete walls, a green-lit floor, the cot, the dead phone, the tube light.
  box(3.0, 0.02, 1.4, 0x2a3a38, -0.15, G, -0.95, { delay: 0.06, noInk: true });
  const back = box(3.0, 2.8, 0.2, CONCRETE, -0.15, G, -1.7, { delay: 0.1, ink: 1.02 });
  decorate(back, new BoxGeometry(0.012, 2.8, 0.01), 0x2a3236, [-0.9, 0, 0.9].map((x) => [x, 1.4, 0.105] as Point));
  box(0.2, 2.8, 1.55, CONCRETE, -1.6, G, -0.95, { delay: 0.12 });
  const tube = box(1.3, 0.08, 0.1, GREEN, -0.2, G + 2.55, -1.55, { delay: 0.2, flat: true });
  box(1.4, 0.05, 0.14, 0x2a3236, -0.2, G + 2.63, -1.55, { delay: 0.18 });
  box(1.4, 0.32, 0.6, 0x5a6064, 0.65, G, -1.25, { delay: 0.3 });
  box(1.3, 0.1, 0.56, 0xc8d0c8, 0.65, G + 0.32, -1.25, { delay: 0.34 });
  box(0.35, 0.1, 0.4, 0xe8ece4, 1.1, G + 0.42, -1.25, { delay: 0.38 });
  const phone = box(0.18, 0.3, 0.08, 0x23222b, -1.1, G + 1.3, -1.58, { delay: 0.4 });
  decorate(phone, new BoxGeometry(0.14, 0.05, 0.02), 0x14121c, [[0, 0.24, 0.045]]);
  cylinder(0.01, 0.01, 0.4, INK, -1.1, G + 0.9, -1.56, { delay: 0.42, noInk: true }, 6);

  // Reus, his palm on the glass.
  const facing = 0.3;
  const prisoner = figure(kit, {
    x: 0.05,
    z: -0.8,
    y: G,
    facing,
    height: 2.45,
    build: "slim",
    skin: 0xd8b090,
    hair: { style: "short", color: 0x4a3426 },
    face: { mouth: "smirk", brows: "calm", eyes: 0x2a6a5a },
    top: { kind: "shirt", color: 0x6a7470 },
    bottom: { kind: "trousers", color: 0x6a7470 },
    belt: INK,
    shoes: 0x2a2a30,
    arms: [[-0.32, 1.98, 0.5], "down"],
    delay: 0.6,
  });
  const palm = prisoner.hands[0];
  const glassZ = palm[2] + 0.1;
  // His open hand flat on the glass.
  const hand = box(0.17, 0.2, 0.04, 0xd8b090, palm[0], palm[1] - 0.08, glassZ - 0.04, { delay: 1.0 });
  decorate(hand, new BoxGeometry(0.035, 0.12, 0.04), 0xd8b090, [-0.06, -0.02, 0.02, 0.06].map((x, i) => [x, 0.24 - (i === 0 ? 0.04 : 0), 0, i === 0 ? 0.5 : 0] as [number, number, number, number]));

  // The glass front, in a steel frame, with two streaks of shine.
  const pane = box(3.0, 2.6, 0.03, 0xa8f0dc, -0.15, G, glassZ, { delay: 0.9, noInk: true });
  const material = (pane.children[0] as Mesh).material as MeshToonMaterial;
  material.transparent = true;
  material.opacity = 0.2;
  material.depthWrite = false;
  pane.children[0].renderOrder = 2;
  decorate(pane, new BoxGeometry(0.03, 0.45, 0.01), 0xeafff8, [
    [-1.0, 1.9, 0.02, 0.6],
    [-0.85, 1.75, 0.02, 0.6],
  ]);
  [-1.65, -0.55, 1.35].forEach((x, i) => box(0.08, 2.65, 0.08, 0x2a3236, x, G, glassZ, { delay: 0.85 + i * 0.02 }));
  box(3.1, 0.1, 0.1, 0x2a3236, -0.15, G + 2.6, glassZ, { delay: 0.92 });
  box(3.1, 0.08, 0.12, 0x2a3236, -0.15, G, glassZ, { delay: 0.92 });

  // Outside: the boy with his hand on the glass, the father on his phone.
  figure(kit, {
    x: 0.95,
    z: 0.4,
    y: G,
    facing: -2.6,
    height: 1.45,
    build: "child",
    skin: 0xe8c0a0,
    hair: { style: "spiky", color: 0x8a5a30 },
    face: { mouth: "open", brows: "raised" },
    headwear: { kind: "cap", color: 0xffd60a },
    top: { kind: "hoodie", color: 0x23707e },
    bottom: { kind: "shorts", color: 0x2a3a5a },
    shoes: 0xe8e4dc,
    arms: [[-0.1, 1.3, 0.6], "down"],
    delay: 1.1,
  });
  const dad = figure(kit, {
    x: -1.15,
    z: 0.75,
    y: G,
    facing: 0.55,
    height: 2.35,
    skin: 0xc89070,
    hair: { style: "short", color: 0x2a201c },
    face: { mouth: "frown", brows: "worried", beard: "moustache" },
    top: { kind: "jacket", color: 0x7a2a52, accent: 0xe8e2d0 },
    bottom: { kind: "trousers", color: 0x2a2c38 },
    arms: [[-0.12, 1.45, 0.42], "down"],
    delay: 1.2,
  });
  const screen = box(0.13, 0.22, 0.03, INK, dad.hands[0][0], dad.hands[0][1] - 0.04, dad.hands[0][2] + 0.04, { delay: 1.6, rotation: [-0.9, 0.55, 0] });
  decorate(screen, new BoxGeometry(0.1, 0.17, 0.01), 0x16c8ff, [[0, 0.11, 0.016]]);

  // The grudge: sparks out of his palm, through the glass, into the father's head.
  const path = new CatmullRomCurve3([palm, [palm[0] - 0.5, palm[1] + 0.45, glassZ + 0.35], [dad.head[0] + 0.45, dad.head[1] + 0.55, dad.head[2] - 0.2], [dad.head[0], dad.head[1] + 0.25, dad.head[2]]].map((p) => new Vector3(...p)));
  const sparks = [0, 1, 2, 3, 4].map((k) => add(new OctahedronGeometry(0.05), MAGENTA, ...palm, { delay: 1.8 + k * 0.05, flat: true, noInk: true }));
  const point = new Vector3();

  tick((t) => {
    tube.visible = Math.floor(t * 7) % 17 !== 9 && Math.floor(t * 7) % 17 !== 11;
    sparks.forEach((spark, k) => {
      const u = (t * 0.25 + k / 5) % 1;
      path.getPoint(u, point);
      spark.position.set(point.x, point.y - 0.05, point.z);
      spark.rotation.y = t * 3 + k;
    });
  });

  return { width: 4.9, height: 4.4, lookY: 1.45 };
}
