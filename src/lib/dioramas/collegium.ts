import { BoxGeometry, Color, ConeGeometry, TorusGeometry, type MeshBasicMaterial } from "three";
import { CYAN, INK, MAGENTA, aim, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { barrel, column, flame, floor } from "@/lib/diorama-props";

/**
 * Collegium (P137): the union leader of the rune-bearers on the picket line at the gates of the
 * works, red neckerchief, sleeves rolled up, the stone yoke of nine colleagues' runes on her
 * shoulders and its chains gripped in her fists; behind her two workers in caps hold up a
 * banner, the chimneys smoke, a brazier burns and a flag flies. The price: she is so loaded
 * that the paving cracks under her boots; she isn't going anywhere fast.
 */
export function collegium(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick, motes } = kit;
  const IRON = 0x23222b;
  const STONE = 0x6a6676;
  const F = octagonBase(kit, 0x221a1e);
  const G = floor(kit, F, 0.06, 0x3a3438, 0x2a2428, 0.35);

  // The works behind: two chimneys, the iron fence with spikes, a column of the old temple.
  [
    [-1.2, -1.8, 0.18, 3.3],
    [-0.6, -2.0, 0.15, 2.9],
  ].forEach(([x, z, r, h], i) => {
    const stack = cylinder(r * 0.85, r, h, 0x4a4250, x, G, z, { delay: 0.05 + i * 0.04 }, 12);
    decorate(stack, new TorusGeometry(r * 0.9, 0.02, 4, 14).rotateX(Math.PI / 2), MAGENTA, [[0, h - 0.25, 0]]);
    motes(5, 0x5a5262, 0.04, [x - 0.12, G + h, z - 0.1], [x + 0.2, G + h + 0.7, z + 0.1], 0.6);
  });
  for (let k = 0; k <= 11; k++) {
    const x = -1.65 + k * 0.3;
    box(0.035, 1.4, 0.035, IRON, x, G, -1.45, { delay: 0.12 + k * 0.01, noInk: true });
    add(new ConeGeometry(0.04, 0.14, 4), IRON, x, G + 1.4, -1.45, { delay: 0.14 + k * 0.01, noInk: true });
  }
  [0.35, 1.15].forEach((y) => box(3.35, 0.04, 0.04, IRON, 0, G + y, -1.45, { delay: 0.12, noInk: true }));
  column(kit, 1.35, -1.3, G, 0.2, 2.6, false, 0x8a8a9a);

  // Two colleagues in caps hold up a blank banner between their poles.
  const poles: Point[] = [];
  [
    [-0.95, -0.85, 0.5],
    [1.0, -0.8, -0.1],
  ].forEach(([x, z, facing], i) => {
    const worker = figure(kit, {
      x,
      z,
      y: G,
      facing,
      height: 2.25,
      build: "normal",
      skin: i ? 0xc8906c : 0xb07a58,
      hair: { style: "short", color: 0x2a1e1c },
      face: { mouth: "frown", brows: "angry", beard: i ? "moustache" : "goatee" },
      headwear: { kind: "cap", color: 0x3a3a44, accent: 0x2a2a32 },
      top: { kind: "jacket", color: i ? 0x3a3a48 : 0x34404a, accent: 0x4a4a58 },
      bottom: { kind: "trousers", color: 0x2a2a32 },
      scarf: i ? 0x8e1840 : undefined,
      arms: i ? [[-0.42, 1.95, 0.2], "down"] : ["down", [0.42, 1.95, 0.2]],
      delay: 0.5 + i * 0.1,
    });
    const hand = worker.hands[i ? 0 : 1];
    cylinder(0.025, 0.025, 3.1, 0x5e4a3a, hand[0], G, hand[2], { delay: 0.8 }, 8);
    poles.push([hand[0], G + 2.55, hand[2]]);
  });
  const span = aim(poles[0], poles[1]).length;
  const yaw = Math.atan2(-(poles[1][2] - poles[0][2]), poles[1][0] - poles[0][0]);
  const banner = box(span - 0.05, 0.48, 0.03, MAGENTA, (poles[0][0] + poles[1][0]) / 2, poles[0][1], (poles[0][2] + poles[1][2]) / 2, { delay: 1.0, rotation: [0, yaw, 0] });
  decorate(banner, new BoxGeometry(span - 0.05, 0.05, 0.01), 0xf4f0e6, [
    [0, 0.06, 0.02],
    [0, 0.42, 0.02],
  ]);

  // A brazier burning at the front, and a flag on its pole.
  barrel(kit, -1.5, 0.9, G, 0.3, 0x3a3440);
  const fire = [...flame(kit, -1.5, 0.9, G + 0.5, 0.4, 0.85), ...flame(kit, -1.4, 0.82, G + 0.5, 0.45, 0.55)];
  cylinder(0.03, 0.035, 2.6, 0x5e4a3a, -1.9, G, 0.1, { delay: 0.35 }, 8);
  const flag = add(new BoxGeometry(0.62, 0.42, 0.02).translate(0.31, 0, 0), MAGENTA, -1.9, G + 2.12, 0.1, { delay: 0.45, rotation: [0, 0.4, 0] });

  // Collegium: broad, dark curls, the red neckerchief, sleeves rolled, fists on the chains.
  const D = 0.3;
  const leader = figure(kit, {
    x: 0.1,
    z: 0.4,
    y: G,
    facing: D,
    height: 2.45,
    build: "broad",
    skin: 0xc89070,
    hair: { style: "curly", color: 0x2a1e1c },
    face: { mouth: "neutral", brows: "calm", marks: 0x9a6a50 },
    top: { kind: "shirt", color: 0x3a3a46, sleeves: "short" },
    bottom: { kind: "trousers", color: 0x2e2e38 },
    shoes: 0x2a2622,
    belt: 0x4e4e5c,
    scarf: 0xc0283a,
    arms: [
      [-0.66, 0.98, 0.14],
      [0.66, 0.98, 0.14],
    ],
    delay: 0.9,
  });
  const at = leader.at;
  // The yoke: two carved stone arms over her shoulders, joined behind the neck.
  const turn: [number, number, number] = [0, D, 0];
  const halves = [-1, 1].map((side) => box(0.66, 0.22, 0.34, STONE, ...at(side * 0.55, 1.88, -0.02), { delay: 1.4, rotation: turn }));
  box(0.5, 0.22, 0.14, STONE, ...at(0, 1.88, -0.26), { delay: 1.42, rotation: turn });
  [-1, 1].forEach((side) => box(0.14, 0.34, 0.36, 0x5a5666, ...at(side * 0.9, 1.76, -0.02), { delay: 1.44, rotation: turn }));
  // Nine runes, glowing in turn: four on one arm, five on the other.
  const runes: MeshBasicMaterial[] = [];
  halves.forEach((half, h) =>
    (h ? [-0.24, -0.12, 0, 0.12, 0.24] : [-0.2, -0.07, 0.07, 0.2]).forEach((x, k) =>
      runes.push(
        (k + h) % 2
          ? decorate(half, new TorusGeometry(0.035, 0.012, 4, 12), CYAN, [[x, 0.11, 0.172]])
          : decorate(half, new BoxGeometry(0.055, 0.055, 0.01), CYAN, [[x, 0.11, 0.172, Math.PI / 4]]),
      ),
    ),
  );
  // The chains, from the yoke's ends through her fists.
  [-1, 1].forEach((side, s) => {
    const from = at(side * 0.9, 1.74, 0.0);
    const to = at(side * 0.7, 0.55, 0.16);
    const { length, rotation } = aim(from, to);
    const links = Math.round(length / 0.09);
    for (let k = 0; k < links; k++) {
      const u = k / links;
      const p: Point = [from[0] + (to[0] - from[0]) * u, from[1] + (to[1] - from[1]) * u, from[2] + (to[2] - from[2]) * u];
      add(new TorusGeometry(0.04, 0.013, 4, 10).rotateY(k % 2 ? Math.PI / 2 : 0), 0x8a8f9e, p[0], p[1] - 0.04, p[2], { delay: 1.5 + s * 0.05 + k * 0.01, noInk: true, rotation });
    }
  });
  // The paving cracks under her weight.
  [0.3, 1.4, 2.5, 3.6, 4.7, 5.6].forEach((angle, i) => {
    const r = 0.35 + (i % 2) * 0.12;
    box(r, 0.006, 0.025, INK, 0.1 + Math.cos(angle) * (0.2 + r / 2), G, 0.4 + Math.sin(angle) * (0.2 + r / 2), { delay: 1.0, flat: true, noInk: true, rotation: [0, -angle, 0] });
  });

  const off = new Color(0x0a5a78);
  const on = new Color(CYAN);
  tick((t) => {
    // The runes light up one after another; the fire flickers; the flag and banner wave.
    runes.forEach((rune, k) => rune.color.lerpColors(off, on, 0.3 + 0.7 * Math.max(0, Math.cos(t * 2 - k * 0.7))));
    fire.forEach((part, i) => (part.children[0].scale.y = 1 + Math.sin(t * 10 + i * 2) * 0.15));
    flag.rotation.y = 0.4 + Math.sin(t * 2.2) * 0.25;
    banner.rotation.x = Math.sin(t * 1.3) * 0.08;
  });

  return { width: 4.9, height: 4.5, lookY: 1.6 };
}
