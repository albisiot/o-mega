import { BoxGeometry, ConeGeometry, CylinderGeometry, TorusGeometry } from "three";
import { CYAN, INK, MAGENTA, ORANGE, YELLOW, aim, cable, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { column, facade, floor, puddle, ring, wallLantern } from "@/lib/diorama-props";

/**
 * Dowser (P138): the old finder of the vanished, wrapped in a heavy fringed shawl and a
 * headscarf, holds her iron rod out over the wet cobbles of an old-town lane; it quivers over a
 * ring of light where a man's hat lies and his faint shape flickers. Beside it his dog still
 * sits waiting, the leash trailing, which is why there is anything to find. Behind, a votive
 * niche with candles and a lantern. The price: her scowl, she has nothing nice to say.
 */
export function dowser(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const SHAWL = 0x2c4060;
  const F = octagonBase(kit, 0x1a1c26);
  const G = floor(kit, F, 0.06, 0x2e3242, 0x22252f, 0.3);

  // The lane: a house front with a votive niche and a lantern, an old column, puddles.
  const wall = facade(kit, -0.35, -1.45, G, 0.1, { width: 3.0, height: 2.9, color: 0x2e2c40, windows: 3, floors: 2, lit: ORANGE, shutters: 0x23404b });
  decorate(wall, new BoxGeometry(0.42, 0.6, 0.02), 0x14121c, [[0.95, 1.75, 0.16]]);
  decorate(wall, new BoxGeometry(0.52, 0.06, 0.04), 0x8a8a9a, [[0.95, 2.08, 0.17]]);
  box(0.56, 0.05, 0.16, 0x8a8a9a, 0.6, G + 1.42, -1.22, { delay: 0.25 });
  const candles = [0.48, 0.6, 0.72].map((x, i) => {
    cylinder(0.025, 0.025, 0.1 + (i % 2) * 0.04, 0xe8e2d0, x, G + 1.47, -1.2, { delay: 0.3 + i * 0.02 }, 8);
    return ball(0.025, YELLOW, x, G + 1.57 + (i % 2) * 0.04, -1.2, { delay: 0.34 + i * 0.02, flat: true, noInk: true });
  });
  const lantern = wallLantern(kit, -1.45, -1.3, G + 2.3, 0.3);
  column(kit, 1.7, -0.75, G, 0.25, 2.5, false, 0x6a7088);
  puddle(kit, -0.5, 1.45, G, 0.4, 0.35, ORANGE);
  puddle(kit, 0.3, 1.75, G, 0.45, 0.25, MAGENTA);

  // The spot where he vanished: a ring of light, his hat, his faint shape.
  const SX = 0.7;
  const SZ = 0.55;
  const glow = ring(kit, [SX, G + 0.01, SZ], 0.42, CYAN, 1.6);
  ring(kit, [SX, G + 0.01, SZ], 0.3, 0x0a5a78, 1.65);
  cylinder(0.17, 0.17, 0.02, 0x3a3440, SX - 0.1, G, SZ + 0.12, { delay: 1.7 }, 14);
  cylinder(0.1, 0.11, 0.1, 0x3a3440, SX - 0.1, G + 0.02, SZ + 0.12, { delay: 1.72 }, 14);
  const ghost = [
    add(new CylinderGeometry(0.22, 0.03, 1.2, 12), 0x24607e, SX, G + 0.45, SZ - 0.05, { delay: 1.8, flat: true, noInk: true }),
    ball(0.14, 0x2c6c8a, SX, G + 1.68, SZ - 0.05, { delay: 1.85, flat: true, noInk: true }),
  ];

  // His dog, sitting by the spot, still waiting; the leash trails into the ring.
  const DX = 1.5;
  const DZ = 0.6;
  const FUR = 0xb07a4a;
  ball(0.2, FUR, DX + 0.1, G, DZ, { delay: 1.0 });
  limb(kit, [DX + 0.05, G + 0.2, DZ], [DX - 0.08, G + 0.56, DZ], 0.15, 0.12, FUR, { delay: 1.04 });
  [-0.07, 0.07].forEach((dz) => limb(kit, [DX - 0.08, G + 0.35, DZ + dz], [DX - 0.12, G, DZ + dz], 0.04, 0.04, FUR, { delay: 1.06 }));
  const head = ball(0.14, FUR, DX - 0.12, G + 0.56, DZ, { delay: 1.1 });
  decorate(head, new BoxGeometry(0.14, 0.09, 0.1), 0x8a5a34, [[-0.15, 0.1, 0]]);
  decorate(head, new BoxGeometry(0.04, 0.04, 0.04), INK, [[-0.23, 0.13, 0]]);
  decorate(head, new BoxGeometry(0.03, 0.03, 0.01), INK, [
    [-0.08, 0.18, 0.12],
    [-0.08, 0.18, -0.12],
  ]);
  [-0.07, 0.07].forEach((dz) => add(new ConeGeometry(0.05, 0.12, 4), 0x8a5a34, DX - 0.08, G + 0.8, DZ + dz, { delay: 1.12, rotation: [dz * 3, 0, 0.3] }));
  add(new TorusGeometry(0.11, 0.025, 6, 14).rotateX(Math.PI / 2), MAGENTA, DX - 0.07, G + 0.5, DZ, { delay: 1.14, rotation: [0, 0, -0.4] });
  cable(kit, [[DX - 0.12, G + 0.47, DZ + 0.06], [DX - 0.35, G + 0.08, DZ + 0.2], [SX + 0.15, G + 0.02, SZ + 0.15]], 0.014, MAGENTA, 1.2);
  const tail = add(new CylinderGeometry(0.025, 0.04, 0.3, 6), FUR, DX + 0.27, G + 0.08, DZ, { delay: 1.16, rotation: [0, 0, -0.9] });

  // Dowser: short and heavy in a long dark skirt, headscarf, the shawl over all.
  const D = 0.65;
  const finder = figure(kit, {
    x: -0.55,
    z: 0.45,
    y: G,
    facing: D,
    height: 2.15,
    build: "heavy",
    skin: 0xd8a888,
    face: { mouth: "frown", brows: "angry", marks: 0xa07a62 },
    headwear: { kind: "hood", color: 0x2c4a6a },
    top: { kind: "robe", color: 0x2a2a3a },
    shoes: 0x2a2622,
    arms: [
      [-0.15, 1.24, 0.5],
      [0.28, 1.26, 0.62],
    ],
    delay: 0.6,
  });
  const at = finder.at;
  const shawl = add(new CylinderGeometry(0.27, 0.58, 0.72, 18).scale(1, 1, 0.8), SHAWL, ...at(0, 1.0, 0), { delay: 1.0, rotation: [0, D, 0] });
  decorate(shawl, new TorusGeometry(0.5, 0.018, 4, 24).rotateX(Math.PI / 2).scale(1, 1, 0.8), 0x7a4a34, [[0, 0.15, 0]]);
  decorate(shawl, new TorusGeometry(0.39, 0.018, 4, 24).rotateX(Math.PI / 2).scale(1, 1, 0.8), 0x7a4a34, [[0, 0.4, 0]]);
  decorate(
    shawl,
    new BoxGeometry(0.018, 0.16, 0.018),
    0x4a5a7a,
    Array.from({ length: 28 }, (_, k) => {
      const a = (k / 28) * Math.PI * 2;
      return [Math.sin(a) * 0.57, -0.05, Math.cos(a) * 0.57 * 0.8] as Point;
    }),
  );
  // The iron rod, held out over the spot, quivering.
  const rodFrom = at(-0.3, 1.24, 0.42);
  const rodTo = at(0.95, 1.22, 1.05);
  const rod = limb(kit, rodFrom, rodTo, 0.022, 0.018, 0x6a5a5a, { delay: 1.3 });
  const rest = aim(rodFrom, rodTo).rotation;
  const buzz = [0.08, 0.15].map((r, i) => add(new TorusGeometry(r, 0.01, 4, 12, 1.2).rotateZ(-0.6), CYAN, rodTo[0], rodTo[1] - r * 0.4, rodTo[2], { delay: 1.5 + i * 0.05, flat: true, noInk: true, rotation: [0, D, 0] }));

  tick((t) => {
    // The rod trembles; the ring breathes; the shape flickers; the dog's tail wags.
    rod.rotation.set(rest[0] + Math.sin(t * 37) * 0.012, rest[1], rest[2] + Math.sin(t * 29) * 0.012);
    buzz.forEach((arc, i) => (arc.visible = Math.floor(t * 5 + i) % 3 !== 2));
    glow.children[0].scale.setScalar(1 + Math.sin(t * 2) * 0.06);
    ghost.forEach((part) => (part.visible = Math.floor(t * 4) % 9 !== 5 && Math.sin(t * 0.9) > -0.85));
    tail.rotation.set(Math.sin(t * 6) * 0.4, 0, -0.9);
    lantern.visible = Math.floor(t * 7) % 17 !== 8;
    candles.forEach((candle, i) => (candle.children[0].scale.y = 1 + Math.sin(t * 11 + i * 2) * 0.25));
  });

  return { width: 4.9, height: 4.3, lookY: 1.4 };
}
