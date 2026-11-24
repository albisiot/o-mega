import { BoxGeometry, Color, CylinderGeometry, TorusGeometry } from "three";
import { CYAN, MAGENTA, colorOf, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { bin, column, floor, orb, ring, steps } from "@/lib/diorama-props";

/**
 * Ephemeris (P006): the frail seer of the Sciolti stands at the foot of a ruined temple under a
 * crescent moon, blind eyes lit, one hand raised over a vision of a column falling again and
 * again. She leans on a cane and drags her leaflets in a shopping trolley; the wind takes them
 * one by one, and the bin beside her is full of the ones nobody wanted.
 */
export function ephemeris(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const STONE = 0x4a4466;
  const ROBE = 0x3a2456;
  const PAPER = 0xe8e2d0;
  const MOON = 0xffe6a0;
  const F = octagonBase(kit, 0x221d2c);
  const G = floor(kit, F, 0.06, 0x2c2838, 0x1e1a28, 0.5);

  // The temple: three steps, the platform, two columns under a piece of beam and a broken one.
  steps(kit, 0, -0.25, G, 0.1, { width: 3.4, count: 3, color: STONE });
  const P = G + 0.48;
  box(3.0, 0.48, 0.6, STONE, 0, G, -1.39, { delay: 0.18, ink: 1.02 });
  column(kit, -1.05, -1.35, P, 0.25, 2.3, false, 0x6f7aa0);
  column(kit, -0.05, -1.35, P, 0.3, 2.3, false, 0x6f7aa0);
  column(kit, 0.95, -1.35, P, 0.35, 2.3, true, 0x6f7aa0);
  box(1.4, 0.24, 0.5, 0x5d6690, -0.55, P + 2.36, -1.35, { delay: 0.45 });
  add(new CylinderGeometry(0.2, 0.2, 0.55, 10).rotateZ(Math.PI / 2), 0x6f7aa0, 1.45, G, 0.25, { delay: 0.4, rotation: [0, 0.5, 0] });
  // The crescent moon behind the temple.
  add(new TorusGeometry(0.42, 0.09, 8, 28, Math.PI * 1.15), MOON, 0.95, P + 2.2, -1.75, { delay: 0.5, flat: true, rotation: [0, 0, 2.3] });

  // Her bin, full of leaflets nobody took.
  bin(kit, -1.35, 0.55, G, 0.5, 0x2f4f60);
  [
    [-1.42, 0.5],
    [-1.28, 0.62],
    [-1.36, 0.66],
  ].forEach(([x, z], i) => ball(0.08, PAPER, x, G + 0.47, z, { delay: 0.6 + i * 0.03 }));
  box(0.16, 0.005, 0.22, PAPER, -1.0, G, 0.95, { delay: 0.62, rotation: [0, 0.6, 0] });

  // Ephemeris: hooded robe, white hair, blind eyes lit, hand raised; she leans on a cane.
  const seer = figure(kit, {
    x: -0.15,
    z: 0.5,
    y: G,
    facing: 0.3,
    height: 2.35,
    build: "slim",
    skin: 0xd8c0b8,
    hair: { style: "long", color: 0xd4d8e4 },
    face: { mouth: "frown", brows: "worried", eyes: 0xc8f4ff, glow: true },
    headwear: { kind: "hood", color: ROBE },
    top: { kind: "robe", color: ROBE, accent: 0x4c3270 },
    scarf: 0x2c1c46,
    arms: [
      [-0.32, 2.0, 0.42],
      [0.42, 1.0, 0.22],
    ],
    delay: 0.8,
  });
  const [raised, holding] = seer.hands;
  cylinder(0.025, 0.025, holding[1] - G + 0.05, 0x5e4a3a, holding[0] + 0.02, G, holding[2], { delay: 1.3 }, 8);
  // White hair spilling out of the hood, and a moon pendant on her chest.
  [-1, 1].forEach((s) => limb(kit, seer.at(s * 0.2, 2.1, 0.06), seer.at(s * 0.24, 1.55, 0.2), 0.06, 0.04, 0xd4d8e4, { delay: 1.25 }));
  ball(0.05, MOON, ...seer.at(0, 1.42, 0.27), { delay: 1.35, flat: true });

  // The vision over her raised hand: a ring of light and a little column that keeps falling.
  const V: Point = [raised[0] - 0.05, raised[1] + 0.36, raised[2] + 0.1];
  const halo = ring(kit, V, 0.3, CYAN, 1.5, true);
  box(0.2, 0.035, 0.1, MAGENTA, V[0], V[1] - 0.2, V[2], { delay: 1.55, flat: true, noInk: true });
  const falling = cylinder(0.04, 0.045, 0.34, 0xc8f4ff, V[0] + 0.05, V[1] - 0.165, V[2], { delay: 1.6, flat: true, noInk: true }, 8);
  const spark = orb(kit, [V[0] - 0.08, V[1] + 0.06, V[2]], 0.025, MAGENTA, 1.65);

  // Her shopping trolley, full of leaflets; the wind takes them off it.
  const TX = 0.75;
  const TZ = 0.55;
  const bag = box(0.34, 0.46, 0.24, MAGENTA, TX, G + 0.12, TZ, { delay: 0.7, rotation: [0, 0.3, 0] });
  decorate(bag, new BoxGeometry(0.34, 0.03, 0.01), 0x6a1a40, [
    [0, 0.12, 0.122],
    [0, 0.26, 0.122],
    [0, 0.4, 0.122],
  ]);
  decorate(bag, new BoxGeometry(0.03, 0.46, 0.01), 0x6a1a40, [[0, 0.23, 0.124]]);
  [-1, 1].forEach((s) => add(new CylinderGeometry(0.08, 0.08, 0.04, 12).rotateX(Math.PI / 2).rotateY(Math.PI / 2), 0x23222b, TX + s * 0.17, G, TZ - 0.08, { delay: 0.72, rotation: [0, 0.3, 0] }));
  cylinder(0.015, 0.015, 0.9, 0x23222b, TX - 0.04, G + 0.12, TZ - 0.15, { delay: 0.74, rotation: [-0.2, 0, 0] }, 6);
  [-0.08, 0, 0.07].forEach((dx, i) => box(0.14, 0.2, 0.005, PAPER, TX + dx, G + 0.52, TZ + 0.02 * i, { delay: 0.76 + i * 0.02, rotation: [0, 0.3, (i - 1) * 0.25] }));
  const leaflets = [0, 1, 2, 3].map((k) => box(0.14, 0.005, 0.2, PAPER, TX, G + 0.7, TZ, { delay: 1.0 + k * 0.05, noInk: true }));

  motes(10, 0xbfaef0, 0.025, [-0.8, G + 0.5, -0.2], [0.6, G + 3.0, 0.8], 1.4);

  const cold = new Color(CYAN);
  const warm = new Color(MAGENTA);
  tick((t) => {
    // The column topples, lies there a moment, and stands up to fall again.
    const u = (t * 0.4) % 1;
    falling.rotation.z = u < 0.5 ? 0 : Math.min(1.45, (u - 0.5) * 6);
    halo.rotation.y = Math.sin(t * 0.8) * 0.4;
    colorOf(halo).lerpColors(cold, warm, (Math.sin(t * 2) + 1) / 4);
    spark.position.y = V[1] - 0.05 + Math.sin(t * 3) * 0.05;
    // The leaflets fly off the trolley one after another, up and away to the right.
    leaflets.forEach((leaf, k) => {
      const w = (t * 0.22 + k / 4) % 1;
      leaf.position.set(TX + 0.15 + w * 1.1, G + 0.65 + w * 2.2 + Math.sin(w * 9 + k) * 0.12, TZ - w * 1.4);
      leaf.rotation.set(w * 7 + k, w * 4, w * 5);
    });
  });

  return { width: 4.9, height: 4.4, lookY: 1.6 };
}
