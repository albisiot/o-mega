import { BoxGeometry, ConeGeometry, SphereGeometry } from "three";
import { CYAN, YELLOW, aim, colorOf, octagonBase, zigzag, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, puddle } from "@/lib/diorama-props";

/**
 * Semaphore (P108): the Compagnia Lete executive stands on the glass plaza in her sharp cream
 * suit, hands behind her back, a mirror over one eye and a fan of mirrors round her neck. Her
 * beam bounces off a tall mirror into the head of a young woman looking at herself, and a bulb
 * lights over her: an idea she will swear is her own. Lete's towers glitter behind.
 */
export function semaphore(kit: Kit): Framing {
  const { add, box, ball, cylinder, decorate, tick } = kit;
  const SUIT = 0xe6dcc4;
  const GLASS = 0xa8dcea;
  const TOWER = 0x22344a;
  const F = octagonBase(kit, 0x1a1c26);
  const G = floor(kit, F, 0.06, 0x2a2d3c, 0x1c1e28, 0.6);

  // Lete's towers: lit windows and a giant mirror screen reflecting the city.
  const left = box(1.0, 3.3, 0.6, TOWER, -1.1, G, -1.3, { delay: 0.1, ink: 1.02 });
  const right = box(0.85, 2.6, 0.6, 0x2a2f4a, 0.75, G, -1.55, { delay: 0.14, ink: 1.02 });
  const windows = (w: number, h: number) => {
    const spots: Point[] = [];
    for (let r = 0; r < Math.floor(h / 0.28); r++) for (let c = 0; c < 3; c++) if ((r * 3 + c * 5) % 4) spots.push([-w / 3 + (c * w) / 3, 0.2 + r * 0.28, 0.301]);
    return spots;
  };
  decorate(left, new BoxGeometry(0.12, 0.14, 0.01), YELLOW, windows(1.0, 1.3));
  decorate(right, new BoxGeometry(0.1, 0.14, 0.01), CYAN, windows(0.85, 2.5));
  decorate(left, new BoxGeometry(0.86, 1.6, 0.01), 0x7fb8d0, [[0, 2.35, 0.302]]);
  decorate(left, new BoxGeometry(0.16, 0.9, 0.01), 0x3a5a78, [
    [-0.25, 1.95, 0.305],
    [0.02, 2.1, 0.305],
    [0.26, 1.85, 0.305],
  ]);

  // The tall mirror on its stand, angled at the woman; in it, her face and the idea above it.
  const MX = 1.6;
  const MZ = -0.15;
  const turn = -0.5;
  [-0.4, 0.4].forEach((dx, i) => box(0.06, 2.45, 0.06, 0x4a5060, MX + dx * Math.cos(turn), G, MZ - dx * Math.sin(turn), { delay: 0.3 + i * 0.03 }));
  const mirror = box(0.84, 1.9, 0.05, GLASS, MX, G + 0.5, MZ, { delay: 0.35, flat: true, rotation: [0, turn, 0] });
  decorate(mirror, new BoxGeometry(0.84, 0.03, 0.01), 0xffffff, [
    [0, 0.5, 0.03, 0.6],
    [0.1, 0.62, 0.03, 0.6],
  ]);
  decorate(mirror, new SphereGeometry(0.14, 12, 10).scale(1, 1.1, 0.1), 0x3a2418, [[0.02, 1.5, 0.03]]);
  decorate(mirror, new SphereGeometry(0.12, 12, 10).scale(0.95, 1.1, 0.1), 0xe0b090, [[0.02, 1.44, 0.035]]);
  decorate(mirror, new BoxGeometry(0.5, 0.36, 0.01), 0x2a5a6a, [[0.02, 1.08, 0.03]]);
  decorate(mirror, new SphereGeometry(0.07, 10, 8).scale(1, 1, 0.1), YELLOW, [[0.02, 1.78, 0.04]]);

  // The young woman, looking at herself; the bulb lighting over her head.
  const woman = figure(kit, {
    x: 1.1,
    z: 0.72,
    y: G,
    facing: 2.65,
    height: 2.2,
    skin: 0xe0b090,
    hair: { style: "bob", color: 0x3a2418 },
    face: { mouth: "open", brows: "raised" },
    top: { kind: "jacket", color: 0x2a5a6a, accent: 0xe8e2d0 },
    bottom: { kind: "skirt", color: 0x23283a },
    shoes: 0x1a1a1e,
    arms: ["chin", "down"],
    delay: 0.6,
  });
  const idea: Point = [woman.head[0], woman.top + 0.35, woman.head[2]];
  const bulb = ball(0.1, YELLOW, idea[0], idea[1], idea[2], { delay: 1.2, flat: true });
  cylinder(0.05, 0.05, 0.07, 0x8a90a0, idea[0], idea[1] - 0.06, idea[2], { delay: 1.22 }, 10);
  const rays = [0.6, 1.3, 2.0, 2.7, 3.4, 4.1].map((a, k) => {
    const from: Point = [idea[0] + Math.cos(a) * 0.15, idea[1] + 0.1 + Math.sin(a) * 0.15, idea[2]];
    const to: Point = [idea[0] + Math.cos(a) * 0.26, idea[1] + 0.1 + Math.sin(a) * 0.26, idea[2]];
    return box(0.025, aim(from, to).length, 0.025, YELLOW, ...from, { delay: 1.25 + k * 0.02, flat: true, noInk: true, rotation: aim(from, to).rotation });
  });

  // Semaphore: cream suit with pointed shoulders, a mirror over her right eye, the fan collar.
  const facing = 0.5;
  const exec = figure(kit, {
    x: -0.5,
    z: 0.3,
    y: G,
    facing,
    height: 2.5,
    build: "slim",
    skin: 0x6a4030,
    hair: { style: "curly", color: 0x14100e },
    face: { mouth: "smirk", brows: "calm" },
    top: { kind: "suit", color: SUIT, accent: 0xd8ccb0, tie: SUIT },
    bottom: { kind: "trousers", color: 0xd8ccb0 },
    shoes: 0x1a1a1e,
    arms: ["back", "back"],
    delay: 0.8,
  });
  const u = 2.5 / 2.4;
  const RH = exec.headRadius;
  decorate(exec.headPart, new BoxGeometry(0.15 * u, 0.1 * u, 0.04), GLASS, [[-0.085 * u, RH * 1.06 + 0.035 * u, RH * 0.9 + 0.02]]);
  decorate(exec.headPart, new BoxGeometry(0.03, 0.03, 0.01), YELLOW, [[-0.12 * u, RH * 1.06 + 0.05 * u, RH * 0.9 + 0.045]]);
  [-1, 1].forEach((side, i) => {
    const from = exec.at(side * 0.3 * u, 1.66 * u, 0);
    const to = exec.at(side * 0.62 * u, 1.86 * u, 0);
    add(new ConeGeometry(0.11, aim(from, to).length, 4), SUIT, ...from, { delay: 1.3 + i * 0.03, rotation: aim(from, to).rotation });
  });
  const slats = Array.from({ length: 11 }, (_, k) => {
    const angle = -1.25 + k * 0.25;
    const slat = box(0.075, 0.34, 0.02, k % 3 === 1 ? 0x2a3a4a : GLASS, ...exec.at(0, 1.78 * u, 0.07), { delay: 1.35 + k * 0.02 });
    slat.rotation.order = "YXZ";
    slat.rotation.set(-0.7, facing, Math.PI + angle);
    return slat;
  });

  // Her beam: from the mirror over her eye, off the tall mirror, into the woman's head.
  const eye: Point = exec.at(-0.085 * u, exec.head[1] - G + 0.035, 0.24);
  const bounce: Point = [MX - 0.05, G + 1.5, MZ + 0.06];
  const target: Point = [woman.head[0], woman.head[1] + 0.05, woman.head[2]];
  const beam = [...zigzag(kit, [eye, bounce], 0.022, CYAN, 1.6), ...zigzag(kit, [bounce, target], 0.022, CYAN, 1.65)];
  const spark = ball(0.05, 0xe8fbff, ...eye, { delay: 1.7, flat: true, noInk: true });
  puddle(kit, -1.0, 1.2, G, 0.5, 0.4, CYAN);
  puddle(kit, 0.4, 1.35, G, 0.52, 0.3, YELLOW);

  const lerp = (a: Point, b: Point, k: number): Point => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  tick((t) => {
    const p = (t * 0.5) % 1;
    const at = p < 0.55 ? lerp(eye, bounce, p / 0.55) : lerp(bounce, target, (p - 0.55) / 0.45);
    spark.position.set(at[0], at[1] - 0.05, at[2]);
    const lit = t === 0 || p > 0.9 || p < 0.5;
    bulb.visible = lit;
    rays.forEach((ray) => (ray.visible = lit));
    beam.forEach((bar, k) => (bar.visible = t === 0 || Math.floor(t * 10 + k) % 9 !== 0));
    const shine = Math.floor(t * 6) % 14;
    slats.forEach((slat, k) => colorOf(slat).set(k === shine ? 0xffffff : k % 3 === 1 ? 0x2a3a4a : GLASS));
  });

  return { width: 4.9, height: 4.5, lookY: 1.65 };
}
