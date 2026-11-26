import { BoxGeometry, SphereGeometry, TorusGeometry } from "three";
import { CYAN, YELLOW, archMouth, archedWall, cable, octagonBase, zigzag, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure, shade } from "@/lib/diorama-figure";
import { floor, puddle } from "@/lib/diorama-props";

/**
 * Epigrafe (P287): the wandering mage barred from the Academy, before an old wall by an arched
 * underpass. She cannot speak, a gold collar locked round her neck, so she writes: the wall is
 * chalked with what is coming (a storm cloud and its bolt, a whirlwind, spirals, little figures
 * running and arrows that say move aside), and her raised finger draws a golden line in the
 * air, over and over. A young man walks past with his eyes on his phone; above the arch the
 * real storm is already gathering.
 */
export function epigrafe(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const WALL = 0x343a52;
  const CHALK = 0xbfefff;
  const PINK = 0xff7aa8;
  const F = octagonBase(kit, 0x1c1a24);
  const G = floor(kit, F, 0.06, 0x2c2c3a, 0x1e1e2a, 0.45);

  // The wall and its arched underpass, chalked all over.
  const wall = add(archedWall(3.4, 2.8, 0.3, { x: 1.05, half: 0.42, spring: 1.0 }), WALL, 0, G, -1.45, { delay: 0.1 });
  add(archMouth(0.42, 1.0), 0x0c0b14, 1.05, G, -1.58, { delay: 0.15, flat: true, noInk: true });
  const z = 0.153;
  decorate(wall, new BoxGeometry(3.4, 0.02, 0.01), shade(WALL, 0.7), [0.6, 1.2, 1.8, 2.4].map((y) => [0, y, z - 0.002] as Point));
  // A storm cloud and its bolt.
  decorate(wall, new TorusGeometry(0.15, 0.014, 4, 16, Math.PI), CHALK, [
    [-0.55, 2.3, z],
    [-0.3, 2.4, z],
    [-0.05, 2.3, z],
  ]);
  decorate(wall, new BoxGeometry(0.66, 0.014, 0.01), CHALK, [[-0.3, 2.3, z]]);
  decorate(wall, new BoxGeometry(0.014, 0.18, 0.01), CHALK, [
    [-0.3, 2.17, z, 0.5],
    [-0.33, 2.03, z, -0.5],
    [-0.3, 1.89, z, 0.5],
  ]);
  // A whirlwind: rings narrowing to the ground.
  [0.3, 0.23, 0.16, 0.11, 0.06].forEach((r, k) =>
    decorate(wall, new TorusGeometry(r, 0.016, 4, 20).scale(1, 0.3, 1), PINK, [[-0.75 + k * 0.035, 1.55 - k * 0.2, z]]),
  );
  // Spirals.
  [0.07, 0.13, 0.19].forEach((r) =>
    decorate(wall, new TorusGeometry(r, 0.012, 4, 20, Math.PI * 1.5), CHALK, [
      [0.15, 1.6, z, r * 9],
      [-1.35, 2.45, z, r * 7],
    ]),
  );
  // Little figures running from it, and arrows: move aside.
  [-0.45, -0.25].forEach((x) => {
    decorate(wall, new TorusGeometry(0.04, 0.01, 4, 12), CHALK, [[x, 0.98, z]]);
    decorate(wall, new BoxGeometry(0.012, 0.14, 0.01), CHALK, [
      [x + 0.02, 0.86, z, -0.3],
      [x - 0.02, 0.72, z, 0.5],
      [x + 0.05, 0.72, z, -0.5],
      [x + 0.06, 0.88, z, 1.2],
    ]);
  });
  decorate(wall, new BoxGeometry(0.36, 0.016, 0.01), PINK, [
    [0.08, 1.0, z],
    [0.08, 0.7, z],
  ]);
  decorate(wall, new BoxGeometry(0.016, 0.12, 0.01), PINK, [
    [0.24, 1.04, z, 0.8],
    [0.24, 0.96, z, -0.8],
    [0.24, 0.74, z, 0.8],
    [0.24, 0.66, z, -0.8],
  ]);
  puddle(kit, 0.9, 0.95, G, 0.5, 0.4, CYAN);

  // The real storm gathering over the arch, a bolt flashing in it.
  [
    [0.7, 3.05, -1.55, 0.3],
    [1.05, 3.15, -1.5, 0.36],
    [1.4, 3.0, -1.4, 0.28],
    [0.9, 2.95, -1.3, 0.24],
  ].forEach(([x, y, cz, r], i) => add(new SphereGeometry(r, 14, 10).scale(1.2, 0.75, 0.8), i % 2 ? 0x2a2a44 : 0x34345a, x, G + y - r * 0.75, cz, { delay: 0.3 + i * 0.04 }));
  const bolt = zigzag(kit, [[1.25, G + 2.9, -1.2], [1.15, G + 2.6, -1.15], [1.3, G + 2.45, -1.12], [1.2, G + 2.15, -1.1]], 0.04, 0xeaffff, 0.5);

  // Epigrafe: short grey hair, a long blue coat, the locked gold collar, chalk in her satchel.
  const facing = 0.45;
  const u = 1;
  const mage = figure(kit, {
    x: -0.6,
    z: 0.4,
    y: G,
    facing,
    height: 2.4,
    build: "slim",
    skin: 0xd8a890,
    hair: { style: "short", color: 0xc0c4cc },
    face: { mouth: "neutral", brows: "calm", eyes: 0x2a3a5a },
    top: { kind: "coat", color: 0x26304a, accent: 0x3a4a6a },
    bottom: { kind: "long-skirt", color: 0x2a3a52 },
    shoes: 0x1e1a22,
    scarf: 0xc89a3a,
    arms: [[-0.4, 2.12, 0.32], "down"],
    delay: 0.8,
  });
  const lock = box(0.07, 0.07, 0.03, 0xc89a3a, ...mage.at(0, 1.73 * u, 0.18), { delay: 1.4, rotation: [0, facing, 0] });
  decorate(lock, new TorusGeometry(0.025, 0.008, 4, 10, Math.PI), 0xc89a3a, [[0, 0.07, 0]]);
  // The satchel on its strap, chalk sticking out.
  const strap = box(0.05, 0.95, 0.02, 0x3a2a22, ...mage.at(0.02, 1.08 * u, 0.24), { delay: 1.3, rotation: [0, facing, 0] });
  strap.rotation.order = "YXZ";
  strap.rotation.set(0, facing, -0.55);
  const bag = box(0.34, 0.28, 0.12, 0x3a2a22, ...mage.at(0.36, 0.85 * u, 0.18), { delay: 1.35, rotation: [0, facing, 0] });
  decorate(bag, new BoxGeometry(0.34, 0.1, 0.02), shade(0x3a2a22, 1.3), [[0, 0.24, 0.065]]);
  [-0.08, -0.02, 0.05].forEach((dx, i) => cylinder(0.016, 0.016, 0.12, 0xf2efe6, ...mage.at(0.36 + dx, 0.85 * u + 0.24, 0.16), { delay: 1.45 + i * 0.02, rotation: [0, 0, (i - 1) * 0.2] }, 6));
  // The raised finger, its tip lit, and the golden line it draws in the air.
  const [hand] = mage.hands;
  cylinder(0.018, 0.022, 0.14, 0xd8a890, hand[0], hand[1] + 0.05, hand[2], { delay: 1.4 }, 6);
  const tip = ball(0.04, YELLOW, hand[0], hand[1] + 0.17, hand[2], { delay: 1.5, flat: true, noInk: true });
  const path: Point[] = [];
  for (let k = 0; k <= 24; k++) {
    const s = k / 24;
    const curl = s > 0.55 ? (s - 0.55) * 14 : 0;
    path.push([
      hand[0] + 0.1 + s * 1.9 + (curl ? Math.sin(curl) * 0.18 : 0),
      hand[1] + 0.25 + Math.sin(s * 9) * 0.12 + (curl ? (1 - Math.cos(curl)) * 0.18 : 0),
      hand[2] - s * 0.6,
    ]);
  }
  const strokes = Array.from({ length: 8 }, (_, k) => cable(kit, path.slice(k * 3, k * 3 + 4), 0.018, YELLOW, 1.6 + k * 0.05));
  cable(kit, [[hand[0], hand[1] + 0.2, hand[2]], [hand[0] + 0.05, hand[1] + 0.25, hand[2]], path[0]], 0.016, YELLOW, 1.55);

  // The young man who walks on, eyes on his phone.
  const walker = figure(kit, {
    x: 1.35,
    z: 1.0,
    y: G,
    facing: -0.75,
    height: 2.3,
    build: "slim",
    skin: 0xc89070,
    hair: { style: "spiky", color: 0x2a1e1c },
    face: { mouth: "smile", brows: "calm" },
    top: { kind: "hoodie", color: 0x6a2a5a, accent: 0x8a3a72 },
    bottom: { kind: "trousers", color: 0x22283a },
    shoes: 0xe8e2d0,
    arms: [[-0.05, 1.6, 0.42], "down"],
    legs: "stride",
    delay: 1.0,
  });
  const phone = walker.hands[0];
  const screen = box(0.1, 0.16, 0.02, 0x14121c, phone[0], phone[1] - 0.02, phone[2], { delay: 1.6, rotation: [-0.5, -0.75, 0] });
  decorate(screen, new BoxGeometry(0.08, 0.13, 0.01), CYAN, [[0, 0.08, 0.012]]);

  const rest = walker.parts.map((part) => part.position.y);
  tick((t) => {
    // She writes the line again and again; the bolt flashes; he walks on.
    const drawn = t < 1.5 ? 8 : Math.floor((t * 4) % 12);
    strokes.forEach((stroke, k) => (stroke.visible = k < drawn));
    tip.visible = Math.floor(t * 6) % 2 === 0 || t < 1.5;
    bolt.forEach((piece) => (piece.visible = Math.floor(t * 3) % 7 === 0 || t < 0.4));
    const bob = Math.abs(Math.sin(t * 3)) * 0.02;
    walker.parts.forEach((part, i) => (part.position.y = rest[i] + bob));
  });

  return { width: 4.9, height: 4.6, lookY: 1.65 };
}
