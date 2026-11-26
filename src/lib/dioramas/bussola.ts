import { BoxGeometry, ConeGeometry, CylinderGeometry, Group, SphereGeometry, TorusGeometry } from "three";
import { CYAN, INK, MAGENTA, YELLOW, aim, cable, colorOf, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { column, floor, rubble } from "@/lib/diorama-props";

/**
 * Bussola (P326): the Banco's relic hunter, far outside the city, stands on the podium of a
 * ruined hill temple in her climbing harness, the rope she came up by tied round a column and
 * dropping to the grass. Her open brass compass glows and its needle swings, then settles; an
 * amphora she has already dug up waits below. Nuova Megara is a few small lights in the
 * distance, the volcano behind it, and her camping lantern is running out of power.
 */
export function bussola(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick, motes } = kit;
  const STONE = 0x5a5a7a;
  const ROPE = 0xc9a46a;
  const F = octagonBase(kit, 0x1d1b26);
  const G = floor(kit, F, 0.06, 0x2c3a3a, 0x24302f, 0);

  // The hill: grass tufts and stones.
  [
    [-1.6, 0.4],
    [-0.4, 1.4],
    [1.3, 0.9],
    [0.4, 1.6],
    [-1.2, 1.2],
    [1.7, 0.2],
  ].forEach(([x, z], i) => add(new ConeGeometry(0.06, 0.18, 5), 0x2f6f4f, x, G, z, { delay: 0.1 + i * 0.02, rotation: [0.2 * (i % 3) - 0.2, i, 0.15] }));
  rubble(kit, -1.55, 0.8, G, 0.15, 4, 0.3, 0x46506a);

  // The temple podium, its blocks cracked, a column standing and one broken.
  const PH = 0.8;
  const podium = box(2.2, PH, 1.55, STONE, -0.2, G, -0.82, { delay: 0.1, ink: 1.02 });
  decorate(podium, new BoxGeometry(2.2, 0.02, 0.01), 0x46466a, [[0, 0.4, 0.776]]);
  decorate(podium, new BoxGeometry(0.02, 0.4, 0.01), 0x46466a, [-0.75, 0.05, 0.6].map((x, i) => [x, i % 2 ? 0.2 : 0.6, 0.776] as Point));
  decorate(podium, new BoxGeometry(0.4, 0.012, 0.01), INK, [[0.3, 0.55, 0.777, 0.5]]);
  column(kit, -0.95, -1.25, G + PH, 0.3, 2.0, false, 0x7c8cb4);
  column(kit, 0.55, -1.3, G + PH, 0.35, 2.0, true, 0x7c8cb4);
  rubble(kit, 0.55, -0.85, G + PH, 0.45, 3, 0.25, 0x7c8cb4);

  // The city far off: a few lit blocks, a tiny crane, the volcano behind; a ridge in between.
  const city: [number, number, number, number][] = [
    [1.15, -0.55, 0.14, 0.3],
    [1.33, -0.7, 0.12, 0.45],
    [1.5, -0.45, 0.16, 0.22],
    [1.25, -0.95, 0.15, 0.36],
    [1.48, -0.95, 0.12, 0.28],
    [1.65, -0.7, 0.13, 0.33],
  ];
  add(new CylinderGeometry(0.06, 0.45, 0.6, 4).rotateY(Math.PI / 4).scale(1, 1, 0.3), 0x3a2a40, 1.45, G, -1.45, { delay: 0.4 });
  box(0.1, 0.03, 0.02, 0xff8a00, 1.45, G + 0.58, -1.38, { delay: 0.45, flat: true, noInk: true });
  city.forEach(([x, z, w, h], i) => {
    const block = box(w, h, w, i % 2 ? 0x2a2f4a : 0x3a2a4a, x, G, z, { delay: 0.45 + i * 0.03, ink: 1.04 });
    decorate(block, new BoxGeometry(0.025, 0.03, 0.005), i % 3 ? YELLOW : CYAN, [
      [-w * 0.2, h * 0.7, w / 2 + 0.003],
      [w * 0.2, h * 0.4, w / 2 + 0.003],
    ]);
  });
  box(0.02, 0.5, 0.02, YELLOW, 1.05, G, -0.85, { delay: 0.6, noInk: true });
  box(0.3, 0.02, 0.02, YELLOW, 1.13, G + 0.5, -0.85, { delay: 0.62, noInk: true });
  rubble(kit, 1.3, -0.15, G, 0.5, 5, 0.35, 0x3a3f4e);

  // Her finds and her gear below: the amphora, the rope's coil, the tired lantern.
  cylinder(0.04, 0.09, 0.12, 0xb0603a, -0.95, G, 0.55, { delay: 0.5 }, 10);
  add(new SphereGeometry(0.18, 14, 10).scale(1, 1.35, 1), 0xb0603a, -0.95, G + 0.08, 0.55, { delay: 0.52 });
  cylinder(0.06, 0.07, 0.2, 0xb0603a, -0.95, G + 0.52, 0.55, { delay: 0.54 }, 10);
  [-1, 1].forEach((side) => add(new TorusGeometry(0.08, 0.018, 6, 12, Math.PI), 0x8a4a2a, -0.95 + side * 0.08, G + 0.48, 0.55, { delay: 0.56, rotation: [0, 0, side * 1.9] }));
  [0, 1, 2].forEach((k) => add(new TorusGeometry(0.2 - k * 0.02, 0.03, 6, 20).rotateX(Math.PI / 2), ROPE, 0.25, G + k * 0.05, 0.55, { delay: 0.6 + k * 0.03 }));
  cylinder(0.08, 0.09, 0.04, 0x23222b, 0.95, G, 0.5, { delay: 0.6 }, 10);
  const glass = cylinder(0.07, 0.07, 0.16, YELLOW, 0.95, G + 0.04, 0.5, { delay: 0.62, flat: true }, 10);
  cylinder(0.04, 0.08, 0.06, 0x23222b, 0.95, G + 0.2, 0.5, { delay: 0.64 }, 10);
  add(new TorusGeometry(0.06, 0.008, 4, 12, Math.PI), 0x23222b, 0.95, G + 0.26, 0.5, { delay: 0.66, noInk: true });

  // Bussola on the podium's edge, the rope in her right hand, the compass in her left.
  const facing = 0.3;
  const H = 2.35;
  const u = H / 2.4;
  const top = G + PH;
  const hunter = figure(kit, {
    x: 0.1,
    z: -0.42,
    y: top,
    facing,
    height: H,
    skin: 0xd8a888,
    hair: { style: "short", color: 0xc8ccd4 },
    face: { mouth: "neutral", brows: "calm", marks: 0xb08a70 },
    top: { kind: "uniform", color: 0x8a7a58, accent: 0x4a3e2a },
    bottom: { kind: "trousers", color: 0x7a6c4e },
    shoes: 0x2a2622,
    belt: 0x2a2a30,
    arms: [[-0.32, 1.35, 0.42], [0.32, 1.55, 0.55]],
    legs: "wide",
    delay: 0.8,
  });
  // The harness: shoulder straps, leg loops, karabiners on the belt.
  [-1, 1].forEach((side) => {
    add(new CylinderGeometry(0.35 * u * 1.04, 0.3 * u * 1.04, 0.7 * u * 0.94, 2, 1, true, side * 0.45 - 0.08, 0.16).scale(1, 1, 0.72), 0x2a2a30, ...hunter.at(0, 1.04 * u + 0.02, 0), {
      delay: 1.2,
      noInk: true,
      rotation: [0, facing, 0],
    });
    const hip = hunter.at(side * 0.17 * u, 1.08 * u, 0);
    const knee = hunter.at(side * 0.27 * u, 0.62 * u, 0.03);
    const at: Point = [hip[0] + (knee[0] - hip[0]) * 0.2, hip[1] + (knee[1] - hip[1]) * 0.2, hip[2] + (knee[2] - hip[2]) * 0.2];
    add(new TorusGeometry(0.135, 0.025, 6, 16).rotateX(Math.PI / 2), 0x2a2a30, ...at, { delay: 1.22, rotation: aim(hip, knee).rotation });
  });
  [-0.12, 0, 0.12].forEach((dx, k) => add(new TorusGeometry(0.035, 0.01, 4, 10), 0xb8c0cc, ...hunter.at(dx + 0.08, 0.96 * u, 0.26), { delay: 1.25 + k * 0.02, noInk: true, rotation: [0, facing, 0.3] }));

  // The rope: round the column, to her hand, down the podium to its coil.
  const [grip, held] = hunter.hands;
  add(new TorusGeometry(0.21, 0.03, 6, 18).rotateX(Math.PI / 2), ROPE, -0.95, top + 1.1, -1.25, { delay: 1.3 });
  cable(kit, [[-0.8, top + 1.12, -1.1], [-0.45, top + 1.2, -0.6], [grip[0] - 0.05, grip[1] + 0.05, grip[2] - 0.15], grip], 0.025, ROPE, 1.35);
  cable(kit, [grip, [grip[0] + 0.04, top - 0.02, 0.0], [grip[0] + 0.12, G + 0.35, 0.12], [0.1, G + 0.12, 0.45], [0.25, G + 0.15, 0.6]], 0.025, ROPE, 1.4);

  // The compass, open in her palm, tipped towards her: case, lid, glowing face, needle.
  const compass = new Group();
  const parts = [
    cylinder(0.1, 0.1, 0.035, 0xb08d3c, 0, 0, 0, { delay: 1.5 }, 18),
    cylinder(0.085, 0.085, 0.008, 0xfff0b0, 0, 0.035, 0, { delay: 1.52, flat: true, noInk: true }, 18),
    cylinder(0.1, 0.1, 0.012, 0xb08d3c, 0, 0.03, -0.1, { delay: 1.54, rotation: [-1.3, 0, 0] }, 18),
  ];
  const needle = box(0.016, 0.008, 0.15, MAGENTA, 0, 0.044, 0, { delay: 1.56, flat: true, noInk: true });
  decorate(needle, new BoxGeometry(0.017, 0.009, 0.075), CYAN, [[0, 0.004, -0.0375]]);
  parts[0].parent?.add(compass);
  [...parts, needle].forEach((part) => compass.add(part));
  compass.position.set(held[0], held[1] + 0.02, held[2] + 0.02);
  compass.rotation.order = "YXZ";
  compass.rotation.set(0.55, facing, 0);
  motes(8, YELLOW, 0.018, [held[0] - 0.15, held[1], held[2] - 0.1], [held[0] + 0.15, held[1] + 0.6, held[2] + 0.15], 1.6);

  tick((t) => {
    // The needle swings, then settles on the next find.
    const s = t % 5;
    needle.rotation.y = 0.7 + Math.sin(t * 5) * 0.6 * Math.max(0, 1 - s / 2.5);
    // The lantern's battery is nearly flat.
    const k = Math.floor(t * 8);
    colorOf(glass).setHex(k % 11 === 4 || k % 17 === 9 ? 0x5a4a20 : YELLOW);
  });

  return { width: 4.9, height: 4.6, lookY: 1.85 };
}
