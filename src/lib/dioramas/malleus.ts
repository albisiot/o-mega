import { BoxGeometry, CylinderGeometry, ExtrudeGeometry, Group, Shape, TorusGeometry, TorusKnotGeometry } from "three";
import { CYAN, INK, MAGENTA, YELLOW, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Malleus (P029): the Compagnia's bruiser was told to go into the warehouse, and he did: the
 * roller shutter of the loading bay has a hole his exact shape, while the intercom beside it
 * blinks unpressed and the crowbar they gave him lies on the ground tied in a knot. He waits in
 * front of it, fist in palm, for the next order; a torn slat still swings in the hole.
 */
export function malleus(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick, motes } = kit;
  const STEEL = 0x47586e;
  const DARK = 0x0b0a10;
  const F = octagonBase(kit, 0x1c1e26);
  const G = floor(kit, F, 0.06, 0x30343e, 0x23262f, 0.6);

  // The bay: a concrete wall, the dark warehouse behind the shutter, a hazard-striped frame.
  const SX = -0.45;
  const SZ = -1.2;
  const W = 2.3;
  const H = 2.75;
  const wall = box(3.3, 3.25, 0.2, 0x2c303b, 0, G, SZ - 0.3, { delay: 0.1, ink: 1.02 });
  decorate(wall, new BoxGeometry(3.3, 0.02, 0.01), 0x22252e, [0.6, 1.2, 1.8, 2.4, 3.0].map((y) => [0, y, 0.101] as Point));
  box(W, H, 0.02, DARK, SX, G, SZ - 0.15, { delay: 0.14, flat: true, noInk: true });
  const stripes = (part: Group, w: number, h: number, z: number, along: "x" | "y") => {
    const spots: [number, number, number, number][] = [];
    const n = Math.floor((along === "x" ? w : h) / 0.2);
    for (let k = 0; k < n; k++) spots.push(along === "x" ? [-w / 2 + 0.1 + k * 0.2, h / 2, z, 0.7] : [0, 0.1 + k * 0.2, z, 0.7]);
    decorate(part, new BoxGeometry(along === "x" ? 0.07 : w + 0.02, along === "x" ? h + 0.02 : 0.07, 0.01), INK, spots);
  };
  [-1, 1].forEach((side) => stripes(box(0.18, H + 0.2, 0.22, YELLOW, SX + side * (W / 2 + 0.09), G, SZ, { delay: 0.18 }), 0.18, H + 0.2, 0.111, "y"));
  stripes(box(W + 0.36, 0.22, 0.22, YELLOW, SX, G + H + 0.2, SZ, { delay: 0.2 }), W + 0.36, 0.22, 0.111, "x");

  // The shutter, with the hole of a big man walked straight through it.
  // The hole is drawn at 2.4 tall and stretched to his size (K across, KY up).
  const HX = -0.35;
  const K = 1.08;
  const KY = 1.14;
  const outline = new Shape();
  outline.moveTo(-W / 2, 0);
  outline.lineTo(HX - 0.42 * K, 0);
  [[-0.44, 0.95], [-0.66, 0.9], [-0.7, 1.7], [-0.45, 1.95], [-0.12, 2.02]].forEach(([x, y]) => outline.lineTo(HX + x * K, y * KY));
  outline.absellipse(HX, 2.2 * KY, 0.2 * K, 0.2 * KY, (Math.PI * 4) / 3, -Math.PI / 3, true, 0);
  [[0.45, 1.95], [0.7, 1.7], [0.66, 0.9], [0.44, 0.95], [0.42, 0]].forEach(([x, y]) => outline.lineTo(HX + x * K, y * KY));
  outline.lineTo(W / 2, 0);
  outline.lineTo(W / 2, H);
  outline.lineTo(-W / 2, H);
  outline.closePath();
  const sliver = new Shape();
  sliver.moveTo(HX - 0.07, 0);
  sliver.lineTo(HX + 0.07, 0);
  sliver.lineTo(HX, 0.8 * KY);
  sliver.closePath();
  const shutter = add(new ExtrudeGeometry([outline, sliver], { depth: 0.05, bevelEnabled: false, curveSegments: 12 }).translate(0, 0, -0.025), STEEL, SX, G, SZ, { delay: 0.24, ink: 1.01 });
  const halfAt = (y: number) =>
    y < 0.88 ? 0.46 : y < 1.72 ? 0.72 : y < 1.97 ? 0.72 - (y - 1.72) * 1.1 : y < 2.42 ? Math.max(0.14, Math.sqrt(Math.max(0, 0.04 - (y - 2.2) ** 2)) + 0.04) : 0;
  const half = (y: number) => halfAt(y / KY) * K;
  for (let y = 0.1; y < H - 0.05; y += 0.15) {
    const gap = half(y);
    const pieces: [number, number][] = gap ? [[-W / 2, HX - gap], [HX + gap, W / 2]] : [[-W / 2, W / 2]];
    for (const [a, b] of pieces) if (b - a > 0.05) decorate(shutter, new BoxGeometry(b - a, 0.025, 0.01), 0x33404f, [[(a + b) / 2, y, 0.028]]);
  }
  // Torn slats on the ground, one still hanging from the hole's shoulder.
  [[-1.25, -0.65, 0.4], [-0.45, -0.55, -0.7], [-0.85, -0.3, 1.9]].forEach(([x, z, turn], i) =>
    box(0.5, 0.02, 0.12, STEEL, x, G, z, { delay: 0.4 + i * 0.04, rotation: [0, turn, 0.04] }),
  );
  add(new TorusGeometry(0.18, 0.05, 4, 12, Math.PI).rotateX(Math.PI / 2).scale(1, 1, 0.4), STEEL, -1.4, G, -0.25, { delay: 0.5, rotation: [0, 0.6, 0] });
  const slatTop: Point = [SX + HX - 0.6, G + 2.18, SZ + 0.04];
  const slat = box(0.1, 0.45, 0.02, STEEL, slatTop[0], slatTop[1] - 0.45, slatTop[2], { delay: 0.45 });

  // The intercom he never pressed, and the crowbar he was given.
  const intercom = box(0.16, 0.26, 0.06, 0x3a3f4a, 1.45, G + 1.5, SZ - 0.17, { delay: 0.5 });
  decorate(intercom, new BoxGeometry(0.1, 0.06, 0.01), 0x1a1c22, [[0, 0.18, 0.031]]);
  const button = decorate(intercom, new CylinderGeometry(0.03, 0.03, 0.02, 12).rotateX(Math.PI / 2), MAGENTA, [[0, 0.08, 0.035]]);
  add(new TorusKnotGeometry(0.13, 0.026, 64, 8, 2, 3).rotateX(Math.PI / 2), 0xb03030, 0.15, G, 1.25, { delay: 0.6, rotation: [0, 0.4, 0] });
  cylinder(0.026, 0.026, 0.3, 0xb03030, 0.4, G + 0.03, 1.32, { delay: 0.62, rotation: [0, 0, Math.PI / 2 - 0.05] }, 8);
  // A striped bollard and a lamp on the wall.
  const post = cylinder(0.09, 0.09, 0.95, YELLOW, 1.8, G, 0.55, { delay: 0.3 }, 12);
  decorate(post, new CylinderGeometry(0.093, 0.093, 0.1, 12), INK, [[0, 0.25, 0], [0, 0.55, 0], [0, 0.85, 0]]);
  box(0.3, 0.08, 0.2, 0x23222b, 0.95, G + 2.7, SZ - 0.12, { delay: 0.3 });
  box(0.26, 0.04, 0.16, CYAN, 0.95, G + 2.66, SZ - 0.1, { delay: 0.32, flat: true, noInk: true });

  // Malleus: bald, huge, in his dark work jacket, fist in palm.
  const brute = figure(kit, {
    x: 0.8,
    z: 0.35,
    y: G,
    facing: 0.05,
    height: 2.8,
    build: "broad",
    skin: 0xd89a8a,
    hair: { style: "bald", color: 0x3a2a26 },
    face: { mouth: "frown", brows: "calm" },
    top: { kind: "jacket", color: 0x1d3a44, accent: 0x2a5260 },
    bottom: { kind: "trousers", color: 0x1e2028 },
    shoes: 0x15151a,
    arms: [[-0.06, 1.52, 0.5], [0.12, 1.5, 0.52]],
    legs: "wide",
    delay: 0.8,
  });
  motes(8, 0x8a8f9c, 0.03, [SX + HX - 0.5, G + 0.2, SZ + 0.1], [SX + HX + 0.5, G + 2.0, SZ + 0.5], 1.2);

  const rest = brute.parts.map((part) => part.position.y);
  tick((t) => {
    // Breathing, the slat swinging from its corner, the intercom blinking in vain.
    const breath = Math.sin(t * 1.6) * 0.012;
    brute.parts.forEach((part, i) => (part.position.y = rest[i] + breath));
    const swing = Math.sin(t * 2.2) * 0.25;
    slat.rotation.z = swing;
    slat.position.set(slatTop[0] + 0.45 * Math.sin(swing), slatTop[1] - 0.45 * Math.cos(swing), slatTop[2]);
    button.color.setHex(Math.floor(t * 2) % 2 ? 0x5a1030 : MAGENTA);
  });

  return { width: 4.9, height: 4.5, lookY: 1.55 };
}
