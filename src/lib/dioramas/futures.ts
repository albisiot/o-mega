import { BoxGeometry, CylinderGeometry, Group, SphereGeometry } from "three";
import { MAGENTA, YELLOW, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { crate, floor, puddle, towerCrane } from "@/lib/diorama-props";

/**
 * Futures (P106): the old debt collector of the port stands in the rain on the quay, fists in
 * boxing wraps, one hand on his belly and the other holding up the stopwatch of his ninety
 * seconds. A heavy bag swings from the crane's hook, a poster of him at twenty-two peels off a
 * container, the ring of yellow ticks round his feet goes out one by one; his debts are in a
 * paper notebook, because phones are beyond him.
 */
export function futures(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick } = kit;
  const WRAP = 0xe8e2d0;
  const F = octagonBase(kit, 0x1c1a22);
  const G = floor(kit, F, 0.06, 0x30323e, 0x22242e, 0.55);

  // The quay: two containers, an old fight poster, the crane, puddles catching the lights.
  const low = box(1.3, 0.62, 0.6, 0x7a2040, 0.8, G, -1.25, { delay: 0.1 });
  box(1.3, 0.62, 0.6, 0x1f6f86, 0.68, G + 0.62, -1.28, { delay: 0.16, rotation: [0, 0.06, 0] });
  decorate(low, new BoxGeometry(0.012, 0.56, 0.01), 0x521428, Array.from({ length: 9 }, (_, k) => [0.08 + k * 0.065, 0.31, 0.301] as Point));
  decorate(low, new BoxGeometry(0.36, 0.48, 0.01), 0xe8d8b0, [[-0.3, 0.31, 0.302]]);
  decorate(low, new SphereGeometry(0.045, 10, 8).scale(1, 1, 0.2), MAGENTA, [[-0.3, 0.42, 0.306]]);
  decorate(low, new BoxGeometry(0.11, 0.17, 0.01), MAGENTA, [[-0.3, 0.27, 0.306]]);
  decorate(low, new BoxGeometry(0.035, 0.13, 0.01), MAGENTA, [
    [-0.39, 0.4, 0.306, -0.6],
    [-0.21, 0.4, 0.306, 0.6],
    [-0.33, 0.13, 0.306, 0.15],
    [-0.27, 0.13, 0.306, -0.15],
  ]);
  decorate(low, new BoxGeometry(0.06, 0.06, 0.01), 0xd02848, [
    [-0.44, 0.46, 0.307],
    [-0.16, 0.46, 0.307],
  ]);
  towerCrane(kit, -1.8, -0.6, G, 0.25, 3.0, 1.0, 0xc89a2a);
  puddle(kit, -0.7, 1.3, G, 0.3, 0.38, YELLOW);
  puddle(kit, 1.25, 0.95, G, 0.32, 0.3, MAGENTA);
  // His paper notebook of debts, on a crate.
  crate(kit, -1.4, 0.45, G, 0.35, 0.45, 0x5e4a3a, 0.4);
  const book = box(0.3, 0.03, 0.22, 0xe8e2d0, -1.4, G + 0.45, 0.45, { delay: 0.45, rotation: [0, 0.3, 0] });
  decorate(book, new BoxGeometry(0.012, 0.01, 0.22), 0x8a7a60, [[0, 0.03, 0]]);
  decorate(book, new BoxGeometry(0.1, 0.006, 0.01), 0x6a6a76, [0.05, 0.09, -0.05, -0.09].map((z, k) => [k < 2 ? -0.08 : 0.08, 0.032, z] as Point));
  box(0.012, 0.012, 0.18, YELLOW, -1.32, G + 0.48, 0.52, { delay: 0.5, rotation: [0, 1.1, 0] });

  // The heavy bag, hanging from the crane's hook by a chain, swinging.
  const swing = new Group();
  swing.position.set(-1.0, G + 2.16, -0.6);
  const bag = [
    box(0.02, 0.32, 0.02, 0x4a4f5c, 0, -0.32, 0, { delay: 0.55, noInk: true }),
    cylinder(0.2, 0.2, 0.8, 0x8a1e3a, 0, -1.12, 0, { delay: 0.6 }, 14),
    cylinder(0.21, 0.21, 0.06, 0x2a2228, 0, -0.42, 0, { delay: 0.62 }, 14),
  ];
  bag.forEach((part) => {
    const at = part.position.clone();
    part.parent?.add(swing);
    swing.add(part);
    part.position.copy(at);
  });

  // Futures: seventy, heavy, scarred, in his red sleeveless jacket, the stopwatch held high.
  const boxer = figure(kit, {
    x: 0.3,
    z: 0.35,
    y: G,
    facing: 0.3,
    height: 2.5,
    build: "heavy",
    skin: 0xc8906e,
    hair: { style: "short", color: 0x6a5e56 },
    face: { mouth: "frown", brows: "angry", beard: "stubble", beardColor: 0x9a9088, marks: 0xa05a4a },
    top: { kind: "vest", color: 0x8a1e2a, accent: 0x1a1a22, sleeves: "none" },
    bottom: { kind: "trousers", color: 0x2a2630 },
    shoes: 0x2a2622,
    belt: 0x3a2a22,
    gloves: WRAP,
    arms: [[-0.12, 1.25, 0.45], [0.45, 2.15, 0.25]],
    delay: 0.8,
  });
  // Boxing wraps up the forearms, from the hands halfway to the elbows.
  const elbows: Point[] = [
    [-0.45, 1.42, 0.18],
    [0.62, 1.87, 0.08],
  ];
  const wristLocal: Point[] = [
    [-0.12, 1.25, 0.45],
    [0.45, 2.15, 0.25],
  ];
  wristLocal.forEach((hand, i) => {
    const half: Point = [(hand[0] + elbows[i][0]) / 2, (hand[1] + elbows[i][1]) / 2, (hand[2] + elbows[i][2]) / 2];
    limb(kit, boxer.at(...hand), boxer.at(...half), 0.14, 0.14, WRAP, { delay: 1.4 + i * 0.03 });
  });

  // The stopwatch on its chain, its hand sweeping round.
  const fist = boxer.hands[1];
  const W: Point = [fist[0] + 0.02, fist[1] - 0.38, fist[2] + 0.08];
  box(0.012, 0.22, 0.012, 0xc8ccd4, W[0], W[1] + 0.16, W[2], { delay: 1.5, noInk: true });
  const watch = add(new CylinderGeometry(0.14, 0.14, 0.045, 22).rotateX(Math.PI / 2), 0xc8ccd4, W[0], W[1] - 0.14, W[2], { delay: 1.55, rotation: [0, 0.35, 0] });
  decorate(watch, new CylinderGeometry(0.12, 0.12, 0.01, 22).rotateX(Math.PI / 2), 0xf4f0e6, [[0, 0.14, 0.022]]);
  decorate(watch, new BoxGeometry(0.012, 0.025, 0.01), 0x2a2a34, [0, 1, 2, 3].map((k) => [Math.sin((k * Math.PI) / 2) * 0.095, 0.14 + Math.cos((k * Math.PI) / 2) * 0.095, 0.028, (k * Math.PI) / 2] as [number, number, number, number]));
  box(0.04, 0.04, 0.04, 0xc8ccd4, W[0], W[1] + 0.14, W[2], { delay: 1.56 });
  const sweep = box(0.014, 0.1, 0.006, MAGENTA, W[0] + 0.034 * Math.sin(0.35), W[1], W[2] + 0.034 * Math.cos(0.35), { delay: 1.6, flat: true, noInk: true });
  sweep.rotation.order = "YXZ";
  sweep.rotation.set(0, 0.35, 0);

  // Ninety seconds: a ring of ticks round his feet, going out one by one.
  const ticks = Array.from({ length: 12 }, (_, k) => {
    const a = (k / 12) * Math.PI * 2;
    return box(0.05, 0.01, 0.16, YELLOW, 0.3 + Math.sin(a) * 0.72, G, 0.35 + Math.cos(a) * 0.72, { delay: 1.7 + k * 0.02, flat: true, noInk: true, rotation: [0, a, 0] });
  });

  // Rain over the quay.
  const drops = Array.from({ length: 18 }, (_, k) => {
    const r = (n: number) => {
      const v = Math.sin((k + 1) * 91.7 + n * 47.3) * 43758.5453;
      return v - Math.floor(v);
    };
    const x = -1.9 + r(1) * 3.8;
    const z = -1.3 + r(2) * 3.0;
    const scale = Math.min(1, 3.0 / (Math.abs(x) + Math.abs(z) + 0.01));
    return { part: box(0.014, 0.3, 0.014, 0x9fd8ff, x * scale, G + 0.3, z * scale, { delay: 0.2, flat: true, noInk: true }), phase: r(3) };
  });

  tick((t) => {
    swing.rotation.z = Math.sin(t * 1.6) * 0.12;
    swing.rotation.x = Math.sin(t * 1.1) * 0.05;
    sweep.rotation.z = -t * ((Math.PI * 2) / 6);
    const out = Math.floor((t % 9) / 0.7);
    ticks.forEach((mark, k) => (mark.visible = k >= out));
    drops.forEach(({ part, phase }) => (part.position.y = G + 0.1 + ((((phase - t * 0.9) % 1) + 1) % 1) * 3.9));
  });

  return { width: 4.9, height: 4.6, lookY: 1.7 };
}
