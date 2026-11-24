import { ConeGeometry, CylinderGeometry, SphereGeometry, type Group } from "three";
import { MAGENTA, YELLOW, aim, cable, jag, limb, octagonBase, zigzag, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { facade, floor, potted } from "@/lib/diorama-props";

/**
 * Gazetteer (P088): the block's harpy perches on her balcony parapet in a flowered dressing
 * gown with a lace collar, curlers in her hair, wings half open and yellow talons gripping the
 * edge. One hand cupped to her mouth, one finger pointed down at the street, she shouts her
 * opinion at everyone below, between the geraniums and her washing.
 */
export function gazetteer(kit: Kit): Framing {
  const { add, box, cylinder, ball, tick } = kit;
  const SKIN = 0xd8b0a0;
  const TALON = 0xd8b040;
  const GOWN = 0x34367a;
  const F = octagonBase(kit, 0x1a1826);
  const G = floor(kit, F, 0.06, 0x2e2a3c, 0x1e1a2a, 0.35);

  // Her building, the washing line, and the parapet with geraniums.
  facade(kit, -0.2, -1.5, G, 0.1, { width: 2.8, height: 3.3, color: 0x2e2a46, windows: 3, floors: 2, door: true, lit: YELLOW, shutters: 0x23404b });
  cylinder(0.035, 0.045, 2.5, 0x3a3440, 1.45, G, -0.55, { delay: 0.2 }, 8);
  const from: Point = [-1.3, G + 2.5, -1.33];
  const to: Point = [1.45, G + 2.45, -0.55];
  cable(kit, [from, [0.1, G + 2.3, -0.95], to], 0.01, 0x8a8a9a, 0.25);
  const yaw = Math.atan2(-(to[2] - from[2]), to[0] - from[0]);
  const washing: Group[] = [
    [0.2, 0.3, 0.22, 0xe8e0e8],
    [0.42, 0.24, 0.46, MAGENTA],
    [0.62, 0.07, 0.36, 0x2f6f86],
    [0.68, 0.07, 0.36, 0x2f6f86],
    [0.85, 0.22, 0.2, 0xe8e0e8],
  ].map(([u, w, h, color], i) => {
    const part = box(w, h, 0.02, color, from[0] + (to[0] - from[0]) * u, from[1] + (to[1] - from[1]) * u - Math.sin(Math.PI * u) * 0.2 - 0.01, from[2] + (to[2] - from[2]) * u, { delay: 0.3 + i * 0.04, noInk: true });
    part.rotation.order = "YXZ";
    part.rotation.set(Math.PI, yaw, 0);
    return part;
  });
  box(2.6, 0.62, 0.24, 0x3a3450, -0.1, G, 0.75, { delay: 0.35 });
  box(2.7, 0.06, 0.3, 0x4a4466, -0.1, G + 0.62, 0.75, { delay: 0.4 });
  const top = G + 0.68;
  [-1.15, 0.85].forEach((x, i) => {
    potted(kit, x, 0.75, top, 0.45 + i * 0.05);
    [
      [-0.1, 0.32, 0.05],
      [0.08, 0.36, 0.08],
      [0.02, 0.28, 0.15],
    ].forEach(([dx, dy, dz]) => ball(0.055, MAGENTA, x + dx, top + dy, 0.75 + dz, { delay: 0.55 + i * 0.05 }));
  });

  // Gazetteer, on the parapet.
  const FACE = 0.3;
  const H = 2.25;
  const u = H / 2.4;
  const harpy = figure(kit, {
    x: -0.3,
    z: 0.72,
    y: top,
    facing: FACE,
    height: H,
    build: "slim",
    skin: SKIN,
    hair: { style: "curly", color: 0xd8d4e0 },
    face: { mouth: "open", brows: "angry", eyes: YELLOW, glow: true, marks: 0xa07a70 },
    top: { kind: "robe", color: GOWN, accent: 0x4a3a8a },
    shoes: TALON,
    scarf: 0xece4f0,
    arms: [[-0.42, 1.42, 0.55], [0.17, 1.9, 0.21]],
    delay: 0.7,
  });
  const at = harpy.at;
  const turned = (part: Group, x: number, z: number) => {
    part.rotation.order = "YXZ";
    part.rotation.set(x, FACE, z);
    return part;
  };

  // Talons over the edge of the parapet.
  [-1, 1].forEach((side) =>
    [-0.06, 0, 0.06].forEach((dx, k) => {
      const root = at(side * 0.16 + dx, 0.05, 0.2);
      const tip = at(side * 0.16 + dx * 1.5, -0.07, 0.38);
      limb(kit, root, tip, 0.03, 0.022, TALON, { delay: 1.1 + k * 0.02 });
      add(new ConeGeometry(0.02, 0.09, 5).rotateX(Math.PI), 0x2a2420, tip[0], tip[1] - 0.09, tip[2], { delay: 1.15 + k * 0.02 });
    }),
  );

  // Flowers on the gown, on the skirt and the bodice.
  const RW = 0.25 * u;
  const RC = 0.3 * u;
  const ankle = 0.12 * u;
  const waist = 1.08 * u;
  const shoulder = 1.72 * u;
  const flowers: [number, number][] = [
    [-0.1, 0.35],
    [0.13, 0.5],
    [-0.04, 0.76],
    [0.15, 0.92],
    [-0.13, 1.18],
    [0.08, 1.36],
    [0.2, 0.24],
    [-0.21, 0.6],
  ];
  flowers.forEach(([x, y], i) => {
    const skirt = y < waist;
    const r = skirt ? RW * 1.6 - RW * 0.55 * ((y - ankle) / (waist - ankle)) : RW + (RC - RW) * ((y - waist) / (shoulder - waist));
    const z = (skirt ? 0.8 : 0.72) * Math.sqrt(Math.max(0, r * r - x * x));
    const p = at(x, y, z);
    ball(0.035, 0xff6aa8, p[0], p[1] - 0.035, p[2], { delay: 1.2 + i * 0.02, flat: true, noInk: true });
  });

  // A hooked nose, curlers in her hair.
  const headY = harpy.head[1] - top;
  const noseFrom = at(0, headY - 0.03, 0.17);
  const noseTo = at(0, headY - 0.11, 0.3);
  const nose = aim(noseFrom, noseTo);
  add(new ConeGeometry(0.04, nose.length, 6), 0xc89888, ...noseFrom, { delay: 1.25, rotation: nose.rotation });
  [
    [0, 0.25],
    [1.2, 0.85],
    [-1.2, 0.85],
    [2.3, 0.95],
    [-2.3, 0.95],
    [Math.PI, 0.5],
  ].forEach(([a, b], i) => {
    const r = 0.255 * u / 0.94;
    const p = at(Math.sin(a) * Math.sin(b) * r, headY + Math.cos(b) * r, Math.cos(a) * Math.sin(b) * r + 0.01);
    turned(add(new CylinderGeometry(0.04, 0.04, 0.13, 10).rotateZ(Math.PI / 2), MAGENTA, p[0], p[1] - 0.04, p[2], { delay: 1.3 + i * 0.02 }), 0, 0);
  });

  // The pointing finger, and her shouting.
  const [pointing] = harpy.hands;
  const fingerTip = at(-0.48, 1.32, 0.7);
  limb(kit, pointing, fingerTip, 0.025, 0.02, SKIN, { delay: 1.3 });
  const shouts = [
    [headY + 0.22, 0.45],
    [headY - 0.06, 0.42],
    [headY - 0.34, 0.38],
  ].map(([y, z], k) => zigzag(kit, jag(at(-0.24, headY - 0.1 + (y - headY) * 0.25, 0.3), at(-0.85, y, z), 4, 0.04, k + 1), 0.03, YELLOW, 1.4 + k * 0.05));

  // The wings: broad feathers fanned from her shoulder blades.
  const angles = [0.15, 0.38, 0.6, 0.82, 1.05, 1.28, 1.5, 1.72];
  const lengths = [1.0, 1.25, 1.4, 1.45, 1.4, 1.25, 1.05, 0.85];
  const colours = [0x23285a, 0x3a2a6a, 0x234a66, 0x5a2a6a];
  const feathers: { part: Group; side: number; angle: number; back: number }[] = [];
  [-1, 1].forEach((side) => {
    const pivot = at(side * 0.12, 1.5, -0.16);
    angles.forEach((angle, k) => {
      const back = -0.35 - (k % 2) * 0.07;
      const part = add(new SphereGeometry(1, 10, 8).scale(0.17, lengths[k] / 2, 0.05), colours[k % 4], ...pivot, { delay: 0.9 + k * 0.03 });
      turned(part, back, -side * angle);
      feathers.push({ part, side, angle, back });
    });
  });

  tick((t) => {
    // The wings beat slowly, the shouting comes in bursts, the washing sways.
    const flap = Math.sin(t * 2.2) * 0.12;
    feathers.forEach(({ part, side, angle, back }) => part.rotation.set(back, FACE, -side * (angle + flap)));
    shouts.forEach((line, k) => line.forEach((bar) => (bar.visible = (t * 4 + k) % 3 < 2.4)));
    washing.forEach((part, i) => part.rotation.set(Math.PI + Math.sin(t * 1.3 + i) * 0.1, yaw, 0));
  });

  return { width: 4.9, height: 4.6, lookY: 1.95 };
}
