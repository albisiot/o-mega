import { BoxGeometry, TorusGeometry, type Group } from "three";
import { ORANGE, cable, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, steps, wallLantern } from "@/lib/diorama-props";

/**
 * Diaria (P191): at night at the top of a flight of old-town steps, under a wall lantern, the
 * team leader in his taped green jacket waits on the landing with an orange rope coiled in his
 * hand and counts his people in: two of them climb the steps roped to him, in a helmet and a
 * beanie. On the wall beside him his tally is chalked, nineteen strokes, the last one ticked
 * again and again as he counts; a pot steams on a camp stove, because next they eat.
 */
export function diaria(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick, motes } = kit;
  const STONE = 0x4a4f62;
  const CHALK = 0xe8e8f0;
  const F = octagonBase(kit, 0x181a22);
  const G = floor(kit, F, 0.06, 0x2c2e3a, 0x20222c, 0.4);

  // The wall of the old town, its lantern, and the chalked tally.
  const wall = box(3.1, 3.3, 0.3, 0x3a3440, 0, G, -1.3, { delay: 0.08, ink: 1.02 });
  decorate(
    wall,
    new BoxGeometry(0.5, 0.24, 0.01),
    0x332e3a,
    Array.from({ length: 14 }, (_, k) => [-1.2 + (k % 5) * 0.6 + (Math.floor(k / 5) % 2) * 0.3, 0.4 + Math.floor(k / 5) * 1.0 + (k % 2) * 0.3, 0.151] as Point),
  );
  const lantern = wallLantern(kit, 1.2, -1.15, G + 2.75, 0.2, ORANGE);
  const H = 0.12;
  const L = G + 5 * H;
  const marks: Point[] = [];
  const slashes: [number, number, number, number][] = [];
  for (let g = 0; g < 3; g++) {
    const x0 = -1.0 + g * 0.3;
    for (let k = 0; k < 4; k++) marks.push([x0 + k * 0.05, 2.55, 0.155]);
    slashes.push([x0 + 0.075, 2.55, 0.156, -1.0]);
  }
  decorate(wall, new BoxGeometry(0.018, 0.2, 0.01), CHALK, marks);
  decorate(wall, new BoxGeometry(0.018, 0.27, 0.01), CHALK, slashes);
  const last = [0, 1, 2, 3].map((k) => box(0.018, 0.2, 0.01, CHALK, -0.1 + k * 0.05, G + 2.45, -1.145, { delay: 0.3 + k * 0.03, flat: true, noInk: true }));

  // The steps up from the lane, and the landing at the top.
  steps(kit, -1.75, 0, G, 0.12, { width: 1.5, count: 5, tread: 0.32, rise: H, color: STONE, facing: -Math.PI / 2 });
  const landing = box(1.85, 5 * H, 1.85, STONE, 0.775, G, -0.175, { delay: 0.3, ink: 1.02 });
  decorate(landing, new BoxGeometry(1.85, 0.004, 0.012), 0x363a48, [-0.6, -0.15, 0.3, 0.75].map((z) => [0, 5 * H + 0.002, z] as Point));
  decorate(landing, new BoxGeometry(0.012, 0.004, 1.85), 0x363a48, [-0.45, 0.1, 0.55].map((x) => [x, 5 * H + 0.002, 0] as Point));

  // The camp stove and the pot: next, they eat.
  cylinder(0.14, 0.16, 0.12, 0x23222b, 1.35, L, 0.5, { delay: 0.5 }, 10);
  cylinder(0.12, 0.12, 0.02, ORANGE, 1.35, L + 0.12, 0.5, { delay: 0.52, flat: true, noInk: true }, 10);
  const pot = cylinder(0.15, 0.13, 0.18, 0x8a93a3, 1.35, L + 0.14, 0.5, { delay: 0.54 }, 14);
  decorate(pot, new TorusGeometry(0.15, 0.012, 4, 16).rotateX(Math.PI / 2), 0x5a6070, [[0, 0.18, 0]]);
  motes(8, 0xd8dce4, 0.025, [1.25, L + 0.35, 0.4], [1.45, L + 1.1, 0.6], 1);

  // Diaria, on the landing, the rope coiled in his right hand, counting on his left.
  const lead = figure(kit, {
    x: 0.75,
    z: 0.15,
    y: L,
    facing: 0.05,
    height: 2.45,
    build: "broad",
    skin: 0xc08a68,
    hair: { style: "short", color: 0x2a201a },
    face: { mouth: "neutral", brows: "calm", beard: "stubble", beardColor: 0x3a2e26 },
    top: { kind: "jacket", color: 0x3a5a3a, accent: 0x2a4a2a },
    bottom: { kind: "trousers", color: 0x2a2c2a },
    shoes: 0x4a3a2a,
    arms: ["down", [0.42, 1.55, 0.36]],
    delay: 0.7,
  });
  // Tape crosses on the jacket, a notebook in the pocket, straps of a pack.
  [
    [0.22, 1.5, 0.33],
    [-0.25, 1.2, 0.34],
  ].forEach(([lx, ly, lz], i) => {
    const tape = box(0.001, 0.001, 0.001, 0xa8acb4, ...lead.at(lx, ly, lz), { delay: 1.1 + i * 0.02, flat: true, noInk: true, rotation: [0, 0.05, 0] });
    decorate(tape, new BoxGeometry(0.04, 0.16, 0.01), 0xa8acb4, [
      [0, 0, 0, 0.7],
      [0, 0, 0, -0.7],
    ]);
  });
  box(0.12, 0.16, 0.03, 0x1a1a22, ...lead.at(-0.18, 1.48, 0.34), { delay: 1.15, rotation: [0, 0.05, 0] });
  box(0.12, 0.02, 0.031, ORANGE, ...lead.at(-0.18, 1.62, 0.34), { delay: 1.16, flat: true, noInk: true, rotation: [0, 0.05, 0] });
  [-1, 1].forEach((side) => box(0.07, 0.5, 0.03, 0x1a1a22, ...lead.at(side * 0.28, 1.35, 0.3), { delay: 1.12, rotation: [0, 0.05, 0] }));
  const [right] = lead.hands;
  [0, 1, 2].forEach((k) => add(new TorusGeometry(0.2, 0.04, 6, 18), ORANGE, right[0] - 0.02, right[1] - 0.42 + k * 0.03, right[2] + 0.02 + k * 0.03, { delay: 1.2 + k * 0.02, rotation: [0, 1.4, 0.1 * k] }));

  // Two of his team on the steps, roped to him, climbing.
  const climber = (step: number, z: number, hat: "helmet" | "beanie", hatColor: number, coat: number, delay: number) =>
    figure(kit, {
      x: -1.75 + step * 0.32 + 0.16,
      z,
      y: G + (step + 1) * H,
      facing: Math.PI / 2 - 0.3,
      height: 2.2,
      skin: step ? 0xd8a888 : 0x9a6a4a,
      hair: { style: "short", color: 0x2a1e1c },
      face: { mouth: "open", brows: "worried" },
      headwear: { kind: hat, color: hatColor },
      top: { kind: "jacket", color: coat },
      bottom: { kind: "trousers", color: 0x2a2c34 },
      arms: ["forward", "back"],
      legs: "stride",
      delay,
    });
  const team = [climber(2, 0.3, "helmet", 0xe8e8e8, 0x2a3a4a, 1.3), climber(0, -0.3, "beanie", 0x7a3a2a, 0x3a4a3a, 1.5)];
  const waist = team.map((member) => member.at(0, 1.1, 0));
  cable(kit, [[right[0], right[1] - 0.3, right[2]], [0.05, L - 0.05, 0.3], waist[0], [-1.25, G + 0.6, 0.0], waist[1]], 0.02, ORANGE, 1.7);

  const climbers: { parts: Group[]; rest: number[] }[] = team.map((member) => ({ parts: member.parts, rest: member.parts.map((part) => part.position.y) }));
  tick((t) => {
    // The team trudges up; he ticks the last strokes one by one; the lantern gutters.
    climbers.forEach(({ parts, rest }, k) => {
      const bob = Math.abs(Math.sin(t * 2.4 + k * 1.3)) * 0.04;
      parts.forEach((part, i) => (part.position.y = rest[i] + bob));
    });
    const count = (Math.floor(t / 1.2) + 4) % 6;
    last.forEach((mark, k) => (mark.visible = k < Math.min(4, count)));
    lantern.visible = Math.floor(t * 7) % 15 !== 8;
  });

  return { width: 4.9, height: 4.6, lookY: 1.85 };
}
