import { BoxGeometry, ConeGeometry, CylinderGeometry, TorusGeometry } from "three";
import { CYAN, INK, MAGENTA, YELLOW, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { facade, floor, rubble } from "@/lib/diorama-props";

/**
 * Molla (P298): the boy of the Fosse with springs taped under his trainers bounces on and on in a
 * little piazza, knees up and arms spread, grinning: he cannot keep still. A dotted trail of
 * cracked craters marks every landing across the paving, the kiosk's awning has a hole where he
 * went through it and its newspapers fly, and the bell tower waits for the next jump.
 */
export function molla(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const F = octagonBase(kit, 0x231d2c);
  const G = floor(kit, F, 0.06, 0x3a3446, 0x28232f, 0.4);
  const STEEL = 0xb8c4d4;
  const KIOSK = 0x2f6f60;
  const PAPER = 0xeeeae0;
  const DARK = 0x141826;

  // A tenement of the Fosse and the bell tower.
  facade(kit, -0.6, -1.45, G, 0.1, { width: 2.1, height: 2.7, color: 0x5a3352, windows: 3, floors: 3, balcony: true });
  const tower = box(0.6, 2.9, 0.6, 0x3a4a6a, 1.0, G, -1.45, { delay: 0.15 });
  decorate(tower, new BoxGeometry(0.28, 0.4, 0.01), DARK, [[0, 2.32, 0.306]]);
  decorate(tower, new CylinderGeometry(0.14, 0.14, 0.01, 12, 1, false, Math.PI / 2, Math.PI).rotateX(Math.PI / 2), DARK, [[0, 2.52, 0.306]]);
  decorate(tower, new BoxGeometry(0.07, 0.22, 0.01), DARK, [
    [0, 1.2, 0.306],
    [0, 1.7, 0.306],
  ]);
  add(new CylinderGeometry(0.05, 0.12, 0.2, 12), 0xc8a040, 1.0, G + 2.18, -1.12, { delay: 0.4 });
  box(0.7, 0.08, 0.7, 0x2c3850, 1.0, G + 2.9, -1.45, { delay: 0.3 });
  add(new ConeGeometry(0.47, 0.55, 4).rotateY(Math.PI / 4), 0x6a2f4a, 1.0, G + 2.98, -1.45, { delay: 0.35 });

  // The kiosk, its awning holed, magazines on the counter.
  const kiosk = box(0.8, 1.05, 0.6, KIOSK, 1.5, G, 0.3, { delay: 0.3 });
  decorate(kiosk, new BoxGeometry(0.1, 0.14, 0.01), CYAN, [
    [-0.25, 0.55, 0.305],
    [0.05, 0.55, 0.305],
  ]);
  decorate(kiosk, new BoxGeometry(0.1, 0.14, 0.01), MAGENTA, [
    [-0.1, 0.55, 0.305],
    [0.22, 0.55, 0.305],
  ]);
  decorate(kiosk, new BoxGeometry(0.1, 0.14, 0.01), PAPER, [
    [-0.18, 0.75, 0.305],
    [0.12, 0.75, 0.305],
  ]);
  box(0.95, 0.08, 0.75, 0x23524a, 1.5, G + 1.05, 0.3, { delay: 0.35 });
  const awning = box(0.95, 0.03, 0.42, MAGENTA, 1.5, G + 0.92, 0.82, { delay: 0.4, rotation: [0.35, 0, 0] });
  decorate(awning, new BoxGeometry(0.07, 0.034, 0.42), 0xeee6f0, [-0.36, -0.18, 0, 0.18, 0.36].map((x) => [x, 0, 0] as Point));
  decorate(awning, new CylinderGeometry(0.13, 0.11, 0.04, 9), DARK, [[-0.12, 0, 0.02]]);
  box(0.16, 0.2, 0.02, MAGENTA, 1.4, G + 0.72, 0.93, { delay: 0.45, rotation: [0.2, 0, 0.3] });
  const papers = [0, 1, 2].map((k) => box(0.22, 0.004, 0.3, PAPER, 1.5, G + 1.4, 0.6, { delay: 1.5 + k * 0.05 }));

  // His landings: cracked craters across the paving, linked by the dotted arcs of his jumps.
  const crater = (x: number, z: number, r: number, delay: number) => {
    const pit = add(new CylinderGeometry(r, r * 0.9, 0.012, 9), 0x1b1722, x, G, z, { delay, flat: true, noInk: true });
    for (let k = 0; k < 5; k++) {
      const a = k * 1.26 + x * 3;
      decorate(pit, new BoxGeometry(r * 0.9, 0.006, 0.02).rotateY(-a), INK, [[Math.cos(a) * r * 1.3, 0.008, Math.sin(a) * r * 1.3]]);
    }
    rubble(kit, x, z, G, delay + 0.05, 3, r * 1.1);
  };
  const landings: Point[] = [
    [-1.5, G, 1.0],
    [-1.0, G, -0.35],
    [0.0, G, 0.62],
  ];
  landings.forEach(([x, , z], i) => crater(x, z, i === 2 ? 0.26 : 0.22, 0.5 + i * 0.1));
  landings.slice(1).forEach((to, i) => {
    const from = landings[i];
    for (let k = 1; k < 10; k++) {
      const v = k / 10;
      ball(0.025, 0xf4f0e6, from[0] + (to[0] - from[0]) * v, G + 4 * v * (1 - v) * 1.3, from[2] + (to[2] - from[2]) * v, { delay: 0.8 + i * 0.2 + k * 0.02, flat: true, noInk: true });
    }
  });
  const shadow = add(new CylinderGeometry(0.3, 0.3, 0.004, 16), 0x0e0c14, 0.0, G + 0.013, 0.62, { delay: 1.2, flat: true, noInk: true });

  // Molla, in mid-bounce over the last crater, knees up, arms spread.
  const H = 2.3;
  const u = H / 2.4;
  const LEG = 0.5;
  const AIR = 0.95;
  const Y0 = G + LEG + AIR;
  const kid = figure(kit, {
    x: -0.34,
    z: 0.16,
    y: Y0,
    facing: 0.6,
    height: H,
    build: "slim",
    skin: 0xf0c0a0,
    hair: { style: "curly", color: 0xc83a3a },
    face: { mouth: "grin", brows: "raised", marks: 0xd08060 },
    top: { kind: "jacket", color: 0x1f7a5a, accent: YELLOW },
    bottom: { kind: "trousers", color: 0x1f6a50 },
    shoes: 0xe8e4da,
    arms: [[-0.8, 1.6, 0.25], [0.8, 1.6, 0.25]],
    legs: "sit",
    delay: 0.9,
  });
  // Silver tape round each trainer, and the springs under them.
  [kid.parts[2], kid.parts[5]].forEach((shoe) => decorate(shoe, new BoxGeometry(0.21 * u, 0.04, 0.2 * u), STEEL, [[0, 0.07 * u, 0]]));
  const springs = [-1, 1].map((side) => {
    const [fx, , fz] = kid.at(side * 0.17 * u, 0, 0.61 * u);
    const coils = Array.from({ length: 6 }, (_, k) =>
      add(new TorusGeometry(0.09, 0.022, 6, 16).rotateX(Math.PI / 2 + (k % 2 ? 0.25 : -0.25)), STEEL, fx, Y0 - 0.1 - k * 0.075, fz, { delay: 1.5 + k * 0.02 }),
    );
    const plate = cylinder(0.11, 0.11, 0.03, INK, fx, Y0 - LEG, fz, { delay: 1.6 });
    return { coils, plate };
  });

  const rest = kid.parts.map((part) => part.position.y);
  tick((t) => {
    // A bounce a second, peaking at t = 0; the springs squash as he lands.
    const v = (t + 0.5) % 1;
    const air = 4 * v * (1 - v) * AIR;
    const squash = air < 0.12 ? 0.55 + (air / 0.12) * 0.45 : 1;
    const soles = G + LEG * squash + air;
    kid.parts.forEach((part, i) => (part.position.y = rest[i] + soles - Y0));
    springs.forEach(({ coils, plate }) => {
      coils.forEach((coil, k) => (coil.position.y = soles - (0.1 + k * 0.075) * squash));
      plate.position.y = soles - LEG * squash;
    });
    const near = 0.6 + (1 - air / AIR) * 0.6;
    shadow.children[0].scale.set(near, 1, near);
    papers.forEach((sheet, k) => {
      const w = (t * 0.35 + k / 3) % 1;
      sheet.position.set(1.5 - w * 0.9 + k * 0.1, G + 1.3 + Math.sin(w * Math.PI) * 1.0 + k * 0.15, 0.6 + w * 0.4);
      sheet.rotation.set(Math.sin(t * 3 + k) * 0.7, w * 5, Math.cos(t * 2 + k) * 0.5);
    });
  });

  return { width: 4.9, height: 4.5, lookY: 1.8 };
}
