import { BoxGeometry, ConeGeometry, CylinderGeometry, Group, SphereGeometry, TorusGeometry } from "three";
import { CYAN, INK, ORANGE, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { facade, flame, floor, potted } from "@/lib/diorama-props";

/**
 * Unbidden (P213): the neighbourhood intelligence sits on the roof of a tenement, a drum of
 * orange lights with one cyan eye, and lets down its mechanical arms on every side: one hooks a
 * man in pyjamas out of the house on fire next door, one waters a balcony plant, one holds an
 * umbrella over an old lady who never asked for it. The price, no strength at all: the arm
 * carrying the man sags and shakes under him.
 */
export function unbidden(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const STEEL = 0x5a6070;
  const STEEL_DARK = 0x3a3e4a;
  const F = octagonBase(kit, 0x1d1b26);
  const G = floor(kit, F, 0.06, 0x2c2a38, 0x1c1a24, 0.4);

  // The tenement, and the house next door on fire.
  const C: Point = [-0.25, G + 2.55, -0.65];
  const house = box(1.5, 2.55, 1.2, 0x3a3450, C[0], G, C[2], { delay: 0.1, ink: 1.02 });
  const lit = 0xffa630;
  const front: Point[] = [];
  const dark: Point[] = [];
  [0.75, 1.5, 2.15].forEach((y, f) => [-0.45, 0, 0.45].forEach((x, c) => ((f + c) % 3 === 1 ? dark : front).push([x, y, 0.605])));
  decorate(house, new BoxGeometry(0.2, 0.32, 0.01), lit, front);
  decorate(house, new BoxGeometry(0.2, 0.32, 0.01), 0x141a26, dark);
  decorate(house, new BoxGeometry(0.01, 0.32, 0.2), lit, [
    [0.755, 1.5, 0.25],
    [0.755, 2.15, -0.2],
  ]);
  decorate(house, new BoxGeometry(0.34, 0.55, 0.012), 0x23222b, [[0, 0.275, 0.606]]);
  box(0.6, 0.05, 0.28, 0x2a2838, C[0] - 0.45, G + 1.25, C[2] + 0.72, { delay: 0.2 });
  box(0.6, 0.22, 0.02, 0x23222b, C[0] - 0.45, G + 1.3, C[2] + 0.85, { delay: 0.22, noInk: true });
  potted(kit, C[0] - 0.55, C[2] + 0.72, G + 1.3, 0.26);
  facade(kit, 1.45, -1.25, G, 0.15, { width: 1.1, height: 1.5, color: 0x4a3040, windows: 2, floors: 1, lit: ORANGE, depth: 0.5 });
  const fire = [flame(kit, 1.2, -1.25, G + 1.5, 0.4, 1.3), flame(kit, 1.65, -1.2, G + 1.5, 0.45, 1.0), flame(kit, 1.6, -0.95, G + 0.5, 0.5, 0.7)].flat();

  // The crown: a drum ringed with orange lights, its one cyan eye, a dome and an aerial.
  cylinder(0.6, 0.62, 0.4, STEEL_DARK, C[0], C[1], C[2], { delay: 0.5 }, 20);
  const lights = Array.from({ length: 14 }, (_, k) => {
    const a = (k / 14) * Math.PI * 2;
    return ball(0.045, ORANGE, C[0] + Math.sin(a) * 0.62, C[1] + 0.3, C[2] + Math.cos(a) * 0.62, { delay: 0.6 + k * 0.01, flat: true, noInk: true });
  });
  add(new SphereGeometry(0.5, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), STEEL, C[0], C[1] + 0.4, C[2], { delay: 0.56 });
  cylinder(0.015, 0.02, 0.5, INK, C[0], C[1] + 0.85, C[2], { delay: 0.6 }, 6);
  const eyeAt: Point = [C[0] + Math.sin(0.3) * 0.62, C[1] + 0.06, C[2] + Math.cos(0.3) * 0.62];
  const socket = add(new CylinderGeometry(0.19, 0.19, 0.08, 18).rotateX(Math.PI / 2), INK, ...eyeAt, { delay: 0.65, rotation: [0, 0.3, 0] });
  decorate(socket, new CylinderGeometry(0.13, 0.13, 0.02, 18).rotateX(Math.PI / 2), CYAN, [[0, 0.19, 0.04]]);
  decorate(socket, new CylinderGeometry(0.05, 0.05, 0.02, 12).rotateX(Math.PI / 2), 0xe8fbff, [[0.03, 0.22, 0.05]]);

  /** A mechanical arm from the drum through the points, jointed, ending in a hook unless told not to. */
  const arm = (points: Point[], delay: number, hook = true): Group[] => {
    const parts: Group[] = [];
    points.slice(1).forEach((to, i) => {
      parts.push(limb(kit, points[i], to, 0.05 - i * 0.008, 0.06 - i * 0.008, i % 2 ? STEEL : STEEL_DARK, { delay: delay + i * 0.04 }));
      parts.push(ball(0.07, STEEL_DARK, to[0], to[1] - 0.07, to[2], { delay: delay + i * 0.04 + 0.02 }));
    });
    const end = points[points.length - 1];
    if (hook) {
      const out = Math.atan2(end[0] - C[0], end[2] - C[2]);
      parts.push(add(new TorusGeometry(0.1, 0.025, 6, 14, Math.PI * 1.4).rotateZ(Math.PI * 0.8), STEEL, end[0], end[1] - 0.3, end[2], { delay: delay + 0.14, rotation: [0, out + Math.PI / 2, 0] }));
    }
    return parts;
  };
  const from = (a: number, r: number, dy: number): Point => [C[0] + Math.sin(a) * r, C[1] + dy, C[2] + Math.cos(a) * r];
  // Idle arms hanging round the back and sides.
  [-2.4, -1.9, -1.35, 2.0, 2.55, 3.1, -2.95].forEach((a, i) => arm([from(a, 0.55, 0.25), from(a, 1.05, 0.55), from(a, 1.4, -0.2)], 0.7 + i * 0.03));

  // The umbrella nobody asked for, over the old lady.
  const lady = figure(kit, {
    x: -1.4,
    z: 0.85,
    y: G,
    facing: 0.55,
    height: 2.0,
    build: "heavy",
    skin: 0xd8a888,
    hair: { style: "bun", color: 0xc8ccd4 },
    face: { mouth: "frown", brows: "angry" },
    top: { kind: "coat", color: 0x7a2a52, accent: 0x3a2030 },
    bottom: { kind: "skirt", color: 0x2a2838 },
    shoes: 0x2a2228,
    arms: ["hip", [0.42, 0.85, 0.3]],
    delay: 1.0,
  });
  const top: Point = [lady.head[0] + 0.05, G + 2.75, lady.head[2]];
  arm([from(-0.9, 0.55, 0.25), from(-0.75, 1.2, 0.65), top], 0.9, false);
  add(new ConeGeometry(0.62, 0.28, 8), 0x23707e, top[0], top[1] - 0.3, top[2], { delay: 1.2 });
  cylinder(0.015, 0.015, 0.6, INK, top[0], top[1] - 0.85, top[2], { delay: 1.22, noInk: true }, 6);
  ball(0.1, 0x4a3628, lady.hands[1][0], lady.hands[1][1] - 0.18, lady.hands[1][2], { delay: 1.3 });

  // The watering can over the balcony.
  const canAt: Point = [C[0] - 0.75, G + 2.0, C[2] + 0.95];
  arm([from(-0.2, 0.55, 0.25), from(-0.45, 1.0, 0.5), [canAt[0] + 0.1, canAt[1] + 0.3, canAt[2]]], 0.85, false);
  const can = add(new CylinderGeometry(0.1, 0.11, 0.2, 12), 0x2f8f6a, ...canAt, { delay: 1.1, rotation: [0, 0, 0.5] });
  decorate(can, new CylinderGeometry(0.015, 0.025, 0.25, 6), 0x2f8f6a, [[-0.14, 0.12, 0, 1.1]]);
  const drops = [0, 1, 2].map((k) => box(0.02, 0.06, 0.02, 0x9fe8ff, canAt[0] - 0.2, G + 1.6, canAt[2], { delay: 1.3 + k * 0.05, flat: true, noInk: true }));

  // The man in pyjamas carried off by the weakest arm, which sags under him.
  const man = figure(kit, {
    x: 0.85,
    z: 0.75,
    y: G + 0.6,
    facing: 0.25,
    height: 1.85,
    build: "slim",
    skin: 0xe0b08f,
    hair: { style: "short", color: 0x3a2a22 },
    face: { mouth: "open", brows: "worried" },
    top: { kind: "shirt", color: 0x2f6f86 },
    bottom: { kind: "trousers", color: 0x2f6f86 },
    barefoot: true,
    arms: ["up", "up"],
    delay: 1.2,
  });
  const grip: Point = [(man.hands[0][0] + man.hands[1][0]) / 2, man.hands[0][1] + 0.08, (man.hands[0][2] + man.hands[1][2]) / 2];
  const strained = arm([from(0.9, 0.55, 0.25), from(0.95, 1.15, 0.2), [grip[0] - 0.1, grip[1] + 0.35, grip[2] - 0.2], grip], 1.1, false);
  strained.push(box(0.5, 0.05, 0.05, STEEL, grip[0], grip[1] - 0.04, grip[2], { delay: 1.4, rotation: [0, 0.25, 0] }));
  cylinder(0.32, 0.32, 0.004, 0x14121c, man.at(0, 0, 0)[0], G + 0.002, man.at(0, 0, 0)[2], { delay: 1.2, flat: true, noInk: true }, 18);
  const shaky = new Group();
  strained[0].parent?.add(shaky);
  [...strained.slice(2), ...man.parts].forEach((part) => shaky.add(part));

  tick((t) => {
    // The lights run round the drum; the eye glances about.
    lights.forEach((light, k) => (light.visible = (k + Math.floor(t * 8)) % 7 !== 0));
    socket.rotation.y = 0.3 + Math.sin(t * 0.7) * 0.25;
    // No strength: the arm dips and trembles under the man.
    shaky.position.y = -0.04 - Math.abs(Math.sin(t * 0.9)) * 0.07 + Math.sin(t * 31) * 0.008;
    drops.forEach((drop, k) => (drop.position.y = G + 1.95 - ((t * 0.9 + k / 3) % 1) * 0.55));
    fire.forEach((part, i) => (part.rotation.z = Math.sin(t * 9 + i * 2) * 0.08));
  });

  return { width: 4.9, height: 4.6, lookY: 1.75 };
}
