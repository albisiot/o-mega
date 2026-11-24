import { BoxGeometry, Color, ConeGeometry, CylinderGeometry, SphereGeometry, TorusGeometry } from "three";
import { INK, MAGENTA, YELLOW, colorOf, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Almoner (P155): the old superintendent stands in his villa garden, hands behind his back, in a
 * wide-brimmed hat and a long gardener's apron with the shears hanging from it, between cypresses
 * and a lemon tree in a stone urn. A marble statue weeps on its pedestal and its tears fly, not
 * fall, into the flower bed below, which drinks them and glows; in the wheelbarrow, the sack of
 * fertiliser nobody asks about. He has no power of his own: the garden does the drinking.
 */
export function almoner(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const MARBLE = 0xd8d4c8;
  const STONE = 0xb8b2a4;
  const LEAF = 0x2a5a38;
  const CYPRESS = 0x1f4a32;
  const APRON = 0xd8cfb0;
  const F = octagonBase(kit, 0x1f2420);
  const G = floor(kit, F, 0.06, 0x3c3a36, 0x2e2c28, 0.45);

  // The garden's back: cypresses, a clipped hedge, and the lemon tree in its urn.
  [
    [-1.6, -1.2, 2.7],
    [-0.6, -1.8, 2.4],
  ].forEach(([x, z, h], i) => add(new ConeGeometry(0.3, h, 10), [CYPRESS, 0x24553a][i], x, G, z, { delay: 0.1 + i * 0.05 }));
  const hedge = box(0.35, 0.55, 1.2, LEAF, -1.95, G, 0.25, { delay: 0.2 });
  decorate(hedge, new BoxGeometry(0.01, 0.4, 1.0), 0x24503a, [[0.176, 0.28, 0]]);
  box(0.42, 0.3, 0.42, STONE, -1.25, G, -0.7, { delay: 0.25 });
  cylinder(0.3, 0.17, 0.42, MARBLE, -1.25, G + 0.3, -0.7, { delay: 0.3 }, 16);
  add(new TorusGeometry(0.3, 0.035, 6, 20).rotateX(Math.PI / 2), MARBLE, -1.25, G + 0.69, -0.7, { delay: 0.32 });
  cylinder(0.05, 0.06, 0.55, 0x5e4a3a, -1.25, G + 0.7, -0.7, { delay: 0.34 }, 8);
  const lemons = (part: ReturnType<typeof ball>, r: number, spots: [number, number][]) =>
    decorate(
      part,
      new SphereGeometry(0.045, 8, 6),
      YELLOW,
      spots.map(([a, h]) => [Math.sin(a) * r * Math.sqrt(1 - h * h), r + h * r, Math.cos(a) * r * Math.sqrt(1 - h * h)] as Point),
    );
  const crown = ball(0.4, LEAF, -1.25, G + 1.1, -0.7, { delay: 0.4 });
  lemons(crown, 0.41, [
    [0.2, 0.1],
    [0.9, -0.3],
    [-0.5, 0.4],
    [1.5, 0.3],
    [0.5, -0.6],
    [-0.2, -0.2],
  ]);
  const crown2 = ball(0.26, 0x24503a, -1.0, G + 1.05, -0.55, { delay: 0.44 });
  lemons(crown2, 0.27, [
    [0.6, 0],
    [1.2, -0.4],
    [0, 0.5],
  ]);

  // The weeping statue on its pedestal, and the flower bed that drinks its tears.
  const pedestal = box(0.55, 0.85, 0.55, MARBLE, 0.95, G, -1.15, { delay: 0.3 });
  decorate(pedestal, new BoxGeometry(0.6, 0.06, 0.6), STONE, [
    [0, 0.03, 0],
    [0, 0.82, 0],
  ]);
  const statue = figure(kit, {
    x: 0.95,
    z: -1.02,
    y: G + 0.85,
    facing: 0.3,
    height: 1.35,
    build: "slim",
    skin: MARBLE,
    hair: { style: "bun", color: 0xc8c4b8 },
    face: { mouth: "frown", brows: "worried", eyes: 0x8a8a96 },
    top: { kind: "robe", color: MARBLE },
    shoes: MARBLE,
    arms: ["chin", "down"],
    delay: 0.5,
  });
  const eye = statue.at(0.05, 1.22, 0.12);
  const bed = box(1.0, 0.2, 0.5, STONE, 0.95, G, -0.5, { delay: 0.45 });
  decorate(bed, new BoxGeometry(0.9, 0.01, 0.4), 0x2a2020, [[0, 0.201, 0]]);
  const blooms = [
    [0.6, -0.55],
    [0.8, -0.4],
    [0.95, -0.6],
    [1.12, -0.42],
    [1.3, -0.56],
  ].map(([x, z], i) => {
    cylinder(0.014, 0.014, 0.22 + (i % 2) * 0.06, LEAF, x, G + 0.2, z, { delay: 0.6 + i * 0.03, noInk: true }, 6);
    return ball(0.075, MAGENTA, x, G + 0.38 + (i % 2) * 0.06, z, { delay: 0.65 + i * 0.03, flat: true });
  });
  const target: Point = [0.95, G + 0.42, -0.5];
  const drops = [0, 1].map((i) => ball(0.035, MAGENTA, eye[0], eye[1], eye[2], { delay: 1.2 + i * 0.1, flat: true, noInk: true }));

  // The wheelbarrow and its sack of fertiliser, faintly glowing.
  add(new CylinderGeometry(0.42, 0.3, 0.28, 4).rotateY(Math.PI / 4).scale(1.3, 1, 0.8), 0x2f5a4a, 1.25, G + 0.22, 0.8, { delay: 0.5, rotation: [0, -0.3, 0] });
  add(new TorusGeometry(0.13, 0.04, 6, 16), INK, 1.25 + Math.cos(-0.3) * 0.45, G, 0.8 - Math.sin(-0.3) * 0.45, { delay: 0.55, rotation: [0, -0.3, 0] });
  [-1, 1].forEach((side) => {
    const [dx, dz] = [-0.55, side * 0.2];
    const c = Math.cos(-0.3);
    const s = Math.sin(-0.3);
    box(0.6, 0.04, 0.04, 0x5e4a3a, 1.25 + dx * c + dz * s, G + 0.4, 0.8 - dx * s + dz * c, { delay: 0.58, rotation: [0, -0.3, -0.15] });
    box(0.04, 0.24, 0.04, 0x23222b, 1.25 + -0.25 * c + dz * s, G, 0.8 + 0.25 * s + dz * c, { delay: 0.56, noInk: true });
  });
  const sack = add(new SphereGeometry(0.26, 14, 10).scale(1.2, 0.85, 0.9), 0xa08a62, 1.25, G + 0.38, 0.8, { delay: 0.65, rotation: [0, -0.3, 0.2] });
  decorate(sack, new BoxGeometry(0.16, 0.12, 0.01), 0x6a5a40, [[0.05, 0.25, 0.23]]);
  motes(6, MAGENTA, 0.025, [1.05, G + 0.6, 0.65], [1.45, G + 1.4, 0.95], 1.4);

  // Almoner, hands behind his back, apron to his shins.
  const theta = 0.3;
  const keeper = figure(kit, {
    x: -0.3,
    z: 0.4,
    y: G,
    facing: theta,
    height: 2.45,
    build: "slim",
    skin: 0xc8946c,
    hair: { style: "short", color: 0xb8b8b0 },
    face: { mouth: "smirk", brows: "calm", beard: "stubble", beardColor: 0xd0d0c8 },
    headwear: { kind: "hat", color: 0x5a5a38, accent: 0x3a3a24 },
    top: { kind: "apron", color: 0x3f5a3a, accent: APRON, sleeves: "long" },
    bottom: { kind: "trousers", color: 0x2f3a2a },
    belt: APRON,
    shoes: 0x3a2c22,
    arms: ["back", "back"],
    delay: 0.9,
  });
  const at = keeper.at;
  const turn: Point = [0, theta, 0];
  const apron = box(0.62, 0.92, 0.03, APRON, ...at(0, 0.2, 0.25), { delay: 1.3, rotation: turn });
  decorate(apron, new BoxGeometry(0.62, 0.02, 0.01), 0xa89a7a, [[0, 0.2, 0.016]]);
  decorate(apron, new BoxGeometry(0.2, 0.16, 0.01), 0xc0b494, [[0.14, 0.62, 0.017]]);
  // The shears, hanging from the apron string.
  const shears = box(0.04, 0.26, 0.02, 0x9aa0ab, ...at(-0.22, 0.66, 0.29), { delay: 1.4, rotation: [0, theta, 0.15] });
  decorate(shears, new BoxGeometry(0.04, 0.24, 0.02), 0x9aa0ab, [[0.02, 0.12, 0.012, -0.3]]);
  decorate(shears, new BoxGeometry(0.05, 0.1, 0.025), 0x8a2a2a, [
    [-0.02, 0.3, 0.01],
    [0.05, 0.3, 0.01],
  ]);

  const bloomFrom = new Color(MAGENTA);
  const bloomTo = new Color(0xffc0dc);
  tick((t) => {
    // Each tear is drawn sideways to the bed; the flowers flush as they drink it.
    let flush = 0;
    drops.forEach((drop, i) => {
      const u = (t * 0.55 + 0.5 + i * 0.5) % 1;
      drop.position.set(eye[0] + (target[0] - eye[0]) * u, eye[1] + (target[1] - eye[1]) * u * u, eye[2] + (target[2] - eye[2]) * u);
      drop.visible = u < 0.96;
      flush = Math.max(flush, u < 0.25 ? 1 - u * 4 : 0);
    });
    blooms.forEach((bloom, i) => colorOf(bloom).lerpColors(bloomFrom, bloomTo, flush * (0.6 + 0.4 * ((i + 1) % 2))));
  });

  return { width: 4.9, height: 4.4, lookY: 1.45 };
}
