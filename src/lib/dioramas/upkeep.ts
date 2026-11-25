import { BoxGeometry, CylinderGeometry, TorusGeometry, type Group } from "three";
import { INK, archedWall, cable, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, puddle } from "@/lib/diorama-props";

/**
 * Upkeep (P218): the only maintainer of the low quarters' waterworks, in the pump room among
 * rusty teal pipes and pressure gauges, the harbour seen through the doorway behind. Grey curls,
 * a leather apron, a respirator round her neck, a coil of hose on her shoulder and the big brass
 * key on its chain: she leans on the main valve wheel and turns it, and the gauge needles swing.
 * A joint drips into a bucket. No magic, no visions: just the pump.
 */
export function upkeep(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick } = kit;
  const PIPE = 0x2f6f76;
  const RUST = 0xb0603a;
  const BRASS = 0xffa630;
  const F = octagonBase(kit, 0x1d1b26);
  const G = floor(kit, F, 0.06, 0x2c3038, 0x1c2026, 0.4);

  // The back wall with a doorway on the harbour.
  add(new BoxGeometry(1.1, 2.2, 0.04), 0x3a8aa8, 0.85, G, -1.95, { delay: 0.06, flat: true, noInk: true });
  [
    [0.5, 0.55, 0.3],
    [0.8, 0.85, 0.22],
    [1.1, 0.6, 0.3],
  ].forEach(([x, h, w], i) => box(w, h, 0.03, 0x23506a, x, G + 0.5, -1.9, { delay: 0.08 + i * 0.02, flat: true, noInk: true }));
  box(1.1, 0.5, 0.03, 0x1d5a78, 0.85, G, -1.88, { delay: 0.08, flat: true, noInk: true });
  add(archedWall(3.6, 2.9, 0.3, { x: 0.85, half: 0.45, spring: 1.5 }), 0x3a3440, 0, G, -1.65, { delay: 0.1, ink: 1.02 });

  /** A pipe between two points with flanges at its ends; rust patches on it. */
  const flange = (at: Point, rotation: Point, r: number, delay: number) =>
    add(new CylinderGeometry(r * 1.35, r * 1.35, 0.08, 16).translate(0, -0.04, 0), PIPE, ...at, { delay, rotation });
  const tall = cylinder(0.24, 0.24, 3.0, PIPE, -1.55, G, -1.0, { delay: 0.2 }, 16);
  decorate(tall, new BoxGeometry(0.14, 0.18, 0.02), RUST, [
    [0.05, 0.6, 0.24],
    [-0.1, 2.2, 0.235],
  ]);
  [0.3, 1.2, 2.5].forEach((y, i) => flange([-1.55, G + y, -1.0], [0, 0, 0], 0.24, 0.24 + i * 0.03));
  const along = cylinder(0.17, 0.17, 2.2, PIPE, -1.4, G + 2.0, -1.2, { delay: 0.3, rotation: [0, 0, -Math.PI / 2] }, 14);
  decorate(along, new BoxGeometry(0.02, 0.16, 0.12), RUST, [[0.17, 1.1, 0.05]]);
  flange([-0.45, G + 2.0, -1.2], [0, 0, -Math.PI / 2], 0.17, 0.36);
  cylinder(0.17, 0.17, 1.95, PIPE, 0.8 - 0.0, G + 0.05, -1.2, { delay: 0.38 }, 14);
  // The right-hand riser with its leaking joint.
  cylinder(0.13, 0.13, 1.8, PIPE, 1.55, G, -0.35, { delay: 0.4 }, 14);
  flange([1.55, G + 1.25, -0.35], [0, 0, 0], 0.13, 0.44);

  /** A pressure gauge facing the camera; returns its needle. */
  const gauge = (at: Point, r: number, delay: number): Group => {
    const face = add(new CylinderGeometry(r, r, 0.08, 22).rotateX(Math.PI / 2), 0xe8e2d0, at[0], at[1] - r, at[2], { delay, rotation: [0, 0.3, 0] });
    decorate(face, new TorusGeometry(r * 0.97, 0.025, 6, 24), RUST, [[0, r, 0.045]]);
    decorate(face, new BoxGeometry(0.015, 0.05, 0.01), INK, [-1, -0.5, 0, 0.5, 1].map((a) => [Math.sin(a * 1.2) * r * 0.75, r + Math.cos(a * 1.2) * r * 0.75, 0.045, -a * 1.2] as [number, number, number, number]));
    const dx = 0.05 * Math.sin(0.3);
    const dz = 0.05 * Math.cos(0.3);
    return add(new BoxGeometry(0.025, r * 0.75, 0.01).translate(0, (r * 0.75) / 2, 0), 0xc02030, at[0] + dx, at[1], at[2] + dz, { delay: delay + 0.05, noInk: true, rotation: [0, 0.3, 0] });
  };
  const needles = [gauge([-1.5, G + 1.75, -0.7], 0.22, 0.5), gauge([1.6, G + 1.95, -0.2], 0.18, 0.55)];

  // The drip into the bucket, the puddle round it.
  cylinder(0.06, 0.06, 0.3, PIPE, 1.55, G + 1.12, -0.3, { delay: 0.5, rotation: [Math.PI / 2, 0, 0] }, 10);
  cylinder(0.16, 0.13, 0.3, 0x5a6270, 1.55, G, 0.08, { delay: 0.6 }, 14);
  cylinder(0.14, 0.14, 0.02, 0x1f8fb0, 1.55, G + 0.27, 0.08, { delay: 0.62, flat: true, noInk: true }, 14);
  puddle(kit, 1.2, 0.55, G, 0.6, 0.35, 0x16c8ff);
  const drops = [0, 1].map((k) => box(0.03, 0.06, 0.03, 0x9fe8ff, 1.55, G + 1.05, 0.02, { delay: 0.7 + k * 0.1, flat: true, noInk: true }));

  // The main valve: a stem out of the floor, a big hand wheel.
  const V: Point = [0.15, G, 0.75];
  cylinder(0.16, 0.2, 0.75, PIPE, ...V, { delay: 0.7 }, 14);
  flange([V[0], G + 0.35, V[2]], [0, 0, 0], 0.17, 0.74);
  cylinder(0.05, 0.05, 0.3, 0x5a6270, V[0], G + 0.75, V[2], { delay: 0.76 }, 8);
  const wheel = add(new TorusGeometry(0.5, 0.05, 8, 32).rotateX(Math.PI / 2), PIPE, V[0], G + 0.98, V[2], { delay: 0.8, rotation: [0.25, 0, 0] });
  decorate(wheel, new BoxGeometry(0.95, 0.05, 0.06), PIPE, [[0, 0.05, 0]]);
  decorate(wheel, new BoxGeometry(0.06, 0.05, 0.95), PIPE, [[0, 0.05, 0]]);
  decorate(wheel, new BoxGeometry(0.1, 0.02, 0.06), RUST, [
    [0.48, 0.1, 0.1],
    [-0.3, 0.1, -0.4],
  ]);

  // Upkeep, leaning on the wheel.
  const facing = 0.3;
  const her = figure(kit, {
    x: 0.0,
    z: 0.15,
    y: G,
    facing,
    height: 2.3,
    build: "heavy",
    skin: 0xb07858,
    hair: { style: "curly", color: 0x9aa0ab },
    face: { mouth: "frown", brows: "angry", marks: 0x8a5a40 },
    top: { kind: "apron", color: 0x3a3a46, accent: 0x5a4030, sleeves: "short" },
    bottom: { kind: "long-skirt", color: 0x2a2a34 },
    shoes: 0x2a2220,
    arms: [
      [-0.45, 1.12, 0.55],
      [0.42, 1.1, 0.62],
    ],
    delay: 0.9,
  });
  const { at } = her;
  // The respirator round her neck.
  const mask = box(0.16, 0.12, 0.1, 0x5a6270, ...at(0, 1.6, 0.3), { delay: 1.4, rotation: [0, facing, 0] });
  decorate(mask, new CylinderGeometry(0.07, 0.07, 0.1, 12).rotateX(Math.PI / 2), 0x8a93a3, [
    [-0.13, 0.04, 0.02],
    [0.13, 0.04, 0.02],
  ]);
  // The key on its chain.
  cable(kit, [at(-0.12, 1.72, 0.25), at(-0.06, 1.35, 0.33), at(0, 1.2, 0.34)], 0.012, BRASS, 1.45);
  cable(kit, [at(0.12, 1.72, 0.25), at(0.06, 1.35, 0.33), at(0, 1.2, 0.34)], 0.012, BRASS, 1.45);
  add(new TorusGeometry(0.05, 0.016, 6, 14), BRASS, ...at(0, 1.1, 0.36), { delay: 1.5, rotation: [0, facing, 0] });
  const shaft = box(0.03, 0.26, 0.03, BRASS, ...at(0, 0.85, 0.36), { delay: 1.52, rotation: [0, facing, 0] });
  decorate(shaft, new BoxGeometry(0.06, 0.03, 0.02), BRASS, [
    [0.03, 0.03, 0],
    [0.03, 0.09, 0],
  ]);
  // The coil of hose over her right shoulder.
  [0, 1, 2].forEach((k) =>
    add(new TorusGeometry(0.34 - k * 0.02, 0.045, 8, 24), 0x26343a, ...at(-0.5 - k * 0.05, 1.05, -0.05 - k * 0.04), { delay: 1.55 + k * 0.03, rotation: [0.1, facing + Math.PI / 2 - 0.2, 0.15 * k] }),
  );

  const wheelParts = [wheel, ...her.parts];
  const rest = wheelParts.map((part) => part.position.x);
  tick((t) => {
    // She heaves the wheel round a quarter turn, rests, heaves again.
    const u = t % 4;
    const heave = u < 1.5 ? Math.sin((u / 1.5) * Math.PI) : 0;
    wheel.rotation.y = Math.floor(t / 4) * 0.8 + (u < 1.5 ? (u / 1.5) * 0.8 : 0.8);
    wheelParts.forEach((part, i) => (part.position.x = rest[i] + (i ? heave * 0.03 : 0)));
    needles.forEach((needle, i) => (needle.rotation.z = -0.9 + heave * (i ? 0.9 : 1.4) + Math.sin(t * 13 + i) * 0.03));
    drops.forEach((drop, k) => (drop.position.y = G + 1.05 - ((t * 0.8 + k * 0.5) % 1) * 0.75));
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}
