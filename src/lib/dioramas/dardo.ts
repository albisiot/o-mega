import { BoxGeometry, ConeGeometry, Group, Vector3 } from "three";
import { CYAN, MAGENTA, YELLOW, aim, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { column, floor, rubble, steps } from "@/lib/diorama-props";

/**
 * Dardo (P318): the former javelin champion on the cracked track of a ruined stadium under a
 * floodlight, a fan of steel darts in her hand. On a fallen block, a row of tin cans, every one
 * already pierced dead centre; the dart she has just thrown flies to the last. She has no Sign
 * and no glow of her own: only the floodlight lights her.
 */
export function dardo(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick } = kit;
  const STEEL = 0xc8ccd8;
  const SUIT = 0x3a2260;
  const F = octagonBase(kit, 0x1c1a26);
  const G = floor(kit, F, 0.06, 0x3a2a48, 0x2a1e36, 0);

  // Lane lines across the track.
  const inner = 2.36 * Math.cos(Math.PI / 8) - 0.05;
  [-0.55, 0.15, 0.85, 1.55].forEach((z, i) => {
    const half = Math.min(inner, inner * Math.SQRT2 - Math.abs(z));
    box(half * 2, 0.004, 0.035, 0xd8d4e4, 0, G, z, { delay: 0.1 + i * 0.02, flat: true, noInk: true });
  });

  // The broken stands at the back, two snapped columns on top, and the floodlight.
  steps(kit, 0.2, -0.8, G, 0.15, { width: 2.2, count: 4, tread: 0.25, rise: 0.24, color: 0x46506a });
  column(kit, -0.4, -1.6, G + 0.96, 0.3, 1.6, true, 0x5d6680);
  column(kit, 0.85, -1.6, G + 0.96, 0.34, 2.2, true, 0x5d6680);
  rubble(kit, 0.4, -1.1, G + 0.72, 0.35, 5, 0.4, 0x3a4058);
  rubble(kit, -1.0, -0.55, G, 0.38, 4, 0.3, 0x3a4058);
  cylinder(0.06, 0.08, 3.4, 0x23222b, -1.5, G, -1.2, { delay: 0.3 }, 8);
  const panel = box(0.72, 0.52, 0.1, 0x23222b, -1.5, G + 3.2, -1.15, { delay: 0.36, rotation: [0.25, 0.6, 0] });
  const bulbs: Point[] = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) bulbs.push([-0.22 + c * 0.22, 0.1 + r * 0.16, 0.055]);
  decorate(panel, new BoxGeometry(0.13, 0.1, 0.01), YELLOW, bulbs.slice(1));
  const blink = decorate(panel, new BoxGeometry(0.13, 0.1, 0.01), YELLOW, bulbs.slice(0, 1));

  // A fallen block with tin cans, each pierced through the middle by a dart.
  const alpha = 0.85;
  const C: Point = [-0.6 + Math.sin(alpha) * 1.95, G, -0.15 + Math.cos(alpha) * 1.95];
  const dir = new Vector3(Math.sin(alpha), 0, Math.cos(alpha));
  const side = new Vector3(Math.cos(alpha), 0, -Math.sin(alpha));
  box(1.0, 0.55, 0.42, 0x5d6680, ...C, { delay: 0.4, rotation: [0, alpha, 0] });
  const dart = (tail: Point, tip: Point, delay: number) => {
    const parts = [limb(kit, tail, tip, 0.014, 0.014, STEEL, { delay, noInk: true })];
    parts.push(add(new ConeGeometry(0.03, 0.08, 6), STEEL, ...tip, { delay, rotation: aim(tail, tip).rotation }));
    parts.push(box(0.012, 0.08, 0.07, MAGENTA, ...tail, { delay, flat: true, noInk: true, rotation: aim(tail, tip).rotation }));
    return parts;
  };
  const cans = [-0.36, -0.12, 0.12, 0.36].map((off, k) => {
    const at = new Vector3(...C).addScaledVector(side, off);
    const can = cylinder(0.075, 0.075, 0.18, k % 2 ? CYAN : MAGENTA, at.x, G + 0.55, at.z, { delay: 0.5 + k * 0.04 }, 12);
    const mid = at.clone().setY(G + 0.64);
    const stuck = dart(mid.clone().addScaledVector(dir, -0.22).toArray() as Point, mid.clone().addScaledVector(dir, 0.08).toArray() as Point, 0.6 + k * 0.04);
    return { can, stuck, mid };
  });
  const last = cans[3];

  // Dardo, follow-through after the throw, the rest of her darts fanned in her hand.
  const D = figure(kit, {
    x: -0.6,
    z: -0.15,
    y: G,
    facing: alpha,
    height: 2.4,
    build: "slim",
    skin: 0xe8c0a0,
    hair: { style: "ponytail", color: 0xb08a50 },
    face: { mouth: "smirk", brows: "angry" },
    top: { kind: "shirt", color: SUIT },
    bottom: { kind: "trousers", color: SUIT },
    gloves: 0x22202a,
    shoes: 0x22202a,
    belt: 0x22202a,
    arms: [[-0.15, 1.75, 0.8], [0.75, 1.5, -0.35]],
    legs: "stride",
    delay: 0.8,
  });
  const hand = D.hands[0];
  [-0.5, -0.2, 0.1, 0.4].forEach((spread, k) => {
    const a = alpha + spread * 0.6;
    dart([hand[0], hand[1] - 0.02, hand[2]], [hand[0] + Math.sin(a) * 0.42, hand[1] + 0.02 + k * 0.05, hand[2] + Math.cos(a) * 0.42], 1.4 + k * 0.03);
  });
  [-1, 1].forEach((s) => {
    box(0.12, 0.2, 0.1, 0x22202a, ...D.at(s * 0.27, 0.78, 0.04), { delay: 1.3, rotation: [0, alpha, 0] });
    [-0.03, 0.03].forEach((dx) => cylinder(0.012, 0.012, 0.12, STEEL, ...D.at(s * 0.27 + dx, 0.98, 0.04), { delay: 1.35, noInk: true }, 6));
  });

  // The thrown dart, in flight towards the last can.
  const flying = new Group();
  panel.parent?.add(flying);
  dart([0, 0, -0.3], [0, 0, 0], 1.5).forEach((part) => flying.add(part));
  flying.add(box(0.02, 0.6, 0.02, MAGENTA, 0, 0, -0.95, { delay: 1.5, flat: true, noInk: true, rotation: [Math.PI / 2, 0, 0] }));
  flying.lookAt(dir);
  const from = new Vector3(hand[0], hand[1] + 0.05, hand[2]);
  const to = last.mid.clone().addScaledVector(dir, 0.08);
  const canRest = last.can.position.clone();

  tick((t) => {
    const u = (t / 2.4 + 0.45) % 1;
    const k = Math.min(1, u / 0.6);
    flying.position.lerpVectors(from, to, k);
    flying.position.y += Math.sin(k * Math.PI) * 0.15;
    flying.visible = u < 0.6;
    last.stuck.forEach((part) => (part.visible = u >= 0.6));
    const rock = u >= 0.6 ? Math.sin((u - 0.6) * 40) * Math.max(0, 0.75 - u) * 0.8 : 0;
    last.can.position.copy(canRest);
    last.can.rotation.set(rock * side.x, 0, -rock * side.z);
    blink.color.set(Math.floor(t * 9) % 17 === 5 ? 0x5a4a20 : YELLOW);
  });

  return { width: 4.9, height: 4.5, lookY: 1.6 };
}
