import { BoxGeometry, Color, ConeGeometry, CylinderGeometry, Group } from "three";
import { INK, MAGENTA, colorOf, octagonBase, zigzag, type Framing, type Kit } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { column, floor, table } from "@/lib/diorama-props";

/**
 * Ortica (P269): the herbalist of the Gente della Selva at her stall under the colonnade of the
 * market, bunches of herbs drying from a beam and swaying, the Banco's licence pinned to a column.
 * Grey braids full of leaves, her cheek veined like wood, she holds up a fistful of nettles
 * that spit stinging sparks and a vial of green tincture that glows. Jars and roots crowd her
 * counter, and the Banco's card reader sits there unused, a sprout growing out of its slot.
 */
export function ortica(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const LEAF = 0x3f8a3a;
  const GLASS = [0x2a5a5a, 0x5a2a4a, 0x3a4a6a];
  const F = octagonBase(kit, 0x1e1c28);
  const G = floor(kit, F, 0.06, 0x2e2a3a, 0x1e1a28, 0.4);

  // The colonnade, the beam across it, herbs drying on a line, a lantern.
  column(kit, -1.25, -1.25, G, 0.1, 2.6, false, 0x5a6a84);
  column(kit, 0.95, -1.4, G, 0.14, 2.6, false, 0x5a6a84);
  box(2.75, 0.2, 0.3, 0x46506a, -0.15, G + 2.6, -1.33, { delay: 0.2, rotation: [0, 0.06, 0] });
  const bunches: Group[] = [];
  [-0.85, -0.45, -0.05, 0.35, 0.7].forEach((x, i) => {
    const z = -1.2 - x * 0.06;
    const hang = G + 2.42 - (i % 2) * 0.12;
    const pivot = new Group();
    pivot.position.set(x, hang, z);
    const stems = cylinder(0.025, 0.025, 0.12, 0x8a6a4a, x, hang - 0.12, z, { delay: 0.3 + i * 0.03 }, 6);
    const leaves = add(new ConeGeometry(0.1, 0.42, 7).rotateX(Math.PI), i % 2 ? LEAF : 0x5a7a30, x, hang - 0.54, z, { delay: 0.32 + i * 0.03 });
    stems.parent?.add(pivot);
    [stems, leaves].forEach((part) => {
      part.position.sub(pivot.position);
      pivot.add(part);
    });
    bunches.push(pivot);
  });
  box(0.02, 0.3, 0.02, INK, 0.6, G + 2.3, -0.95, { delay: 0.4, noInk: true });
  const light = box(0.15, 0.2, 0.15, 0xffa630, 0.6, G + 2.1, -0.95, { delay: 0.44, flat: true });
  box(0.19, 0.04, 0.19, 0x23222b, 0.6, G + 2.3, -0.95, { delay: 0.46 });
  // The Banco's licence on the column: a sealed sheet, no writing.
  const licence = box(0.32, 0.42, 0.01, 0xe8e2d0, 0.95, G + 1.2, -1.18, { delay: 0.5 });
  decorate(licence, new BoxGeometry(0.22, 0.015, 0.006), 0x8a93a3, [
    [0, 0.32, 0.008],
    [0, 0.27, 0.008],
    [0, 0.22, 0.008],
  ]);
  decorate(licence, new CylinderGeometry(0.05, 0.05, 0.01, 14).rotateX(Math.PI / 2), 0xc81e3a, [[0.06, 0.1, 0.01]]);

  // The counter: jars, a basket of roots, and the card reader she never uses.
  const counter = table(kit, 0.95, 0.6, G, 0.4, false, 0x5e4a3a);
  decorate(counter, new BoxGeometry(0.95, 0.01, 0.01), 0x3e3028, [[0, 0.05, 0.351]]);
  const desk = G + 0.8;
  [
    [0.65, 0.5, 0.11, 0.3],
    [0.85, 0.38, 0.09, 0.24],
    [1.25, 0.42, 0.1, 0.28],
  ].forEach(([x, z, r, h], i) => {
    const jar = cylinder(r, r, h, GLASS[i], x, desk, z, { delay: 0.55 + i * 0.04 }, 12);
    decorate(jar, new BoxGeometry(r * 1.2, h * 0.5, 0.01), 0x8aa060 + i * 0x101010, [[0, h * 0.4, r * 0.95]]);
    cylinder(r * 0.8, r * 0.8, 0.06, 0x9a7a5a, x, desk + h, z, { delay: 0.58 + i * 0.04 }, 10);
  });
  cylinder(0.2, 0.16, 0.14, 0x7a5a3a, 1.05, desk, 0.78, { delay: 0.65 }, 12);
  [-0.08, 0, 0.08].forEach((dx, i) => add(new ConeGeometry(0.035, 0.24, 6).rotateZ(Math.PI / 2 - 0.3), 0xd8b080, 1.05 + dx, desk + 0.12, 0.78 + (i - 1) * 0.05, { delay: 0.68 + i * 0.02 }));
  const reader = box(0.2, 0.07, 0.3, 0x23222b, 0.68, desk, 0.8, { delay: 0.7, rotation: [0.25, 0.3, 0] });
  decorate(reader, new BoxGeometry(0.15, 0.006, 0.11), 0x1f6a8a, [[0, 0.071, -0.06]]);
  decorate(reader, new BoxGeometry(0.03, 0.006, 0.03), 0x3a3a46, [
    [-0.05, 0.071, 0.05],
    [0, 0.071, 0.05],
    [0.05, 0.071, 0.05],
  ]);
  add(new ConeGeometry(0.035, 0.2, 5), LEAF, 0.66, desk + 0.08, 0.74, { delay: 0.75 });
  [-0.6, 0.6].forEach((roll, i) => add(new BoxGeometry(0.1, 0.012, 0.05), 0x5aa040, 0.66 + (i ? 0.04 : -0.04), desk + 0.2 + i * 0.04, 0.74, { delay: 0.78, rotation: [0, 0, roll] }));

  // Ortica: grey braids with leaves in them, a dark green dress, a long apron, pouches.
  const FACE = 0.35;
  const healer = figure(kit, {
    x: -0.4,
    z: 0.25,
    y: G,
    facing: FACE,
    height: 2.3,
    build: "slim",
    skin: 0xc8a080,
    hair: { style: "braids", color: 0x9aaa9a },
    face: { mouth: "smirk", brows: "raised", marks: 0x7a5a40, eyes: 0x3a5a3a },
    top: { kind: "apron", color: 0x1f4a32, accent: 0xa89878, sleeves: "long" },
    bottom: { kind: "long-skirt", color: 0x1f4a32 },
    shoes: 0x2a2226,
    gloves: 0x5a3a24,
    belt: 0x5a4030,
    arms: [
      [-0.5, 1.72, 0.3],
      [0.48, 1.58, 0.32],
    ],
    delay: 0.8,
  });
  const o = (delay: number, tilt = 0): { delay: number; rotation: [number, number, number] } => ({ delay, rotation: [tilt, FACE, 0] });
  const apron = box(0.42, 0.62, 0.03, 0xa89878, ...healer.at(0, 0.32, 0.36), o(1.2));
  apron.rotation.order = "YXZ";
  apron.rotation.set(-0.2, FACE, 0);
  decorate(apron, new BoxGeometry(0.12, 0.16, 0.01), 0x6a6050, [[0.08, 0.3, 0.02, 0.3]]);
  [
    [-0.24, 0x7a5a3a],
    [-0.1, 0x4a6a3a],
    [0.12, 0x8a6a4a],
    [0.26, 0x5a3a4a],
  ].forEach(([lx, color], i) => ball(0.065, color, ...healer.at(lx, 0.78 - (i % 2) * 0.05, 0.26), { delay: 1.25 + i * 0.02 }));
  [
    [-0.12, 2.32, 0.08, 0.5],
    [0.1, 2.36, 0.05, -0.6],
    [0.2, 2.2, 0.1, -1.2],
    [-0.2, 2.18, 0.12, 1.1],
  ].forEach(([lx, ly, lz, roll], i) => box(0.1, 0.02, 0.05, i % 2 ? LEAF : 0x5a8a30, ...healer.at(lx, ly, lz), { delay: 1.3 + i * 0.02, rotation: [0.3, FACE, roll] }));

  // The nettles in her right fist, spitting stings.
  const [nettleHand, vialHand] = healer.hands;
  [-0.5, -0.2, 0.1, 0.4, 0.7].forEach((lean, i) => {
    const leaf = add(new ConeGeometry(0.08, 0.32, 4).scale(1, 1, 0.3), i % 2 ? LEAF : 0x2f6a3a, nettleHand[0], nettleHand[1] + 0.04, nettleHand[2], {
      delay: 1.4 + i * 0.03,
      rotation: [0.15 * (i - 2), FACE, lean],
    });
    decorate(leaf, new BoxGeometry(0.008, 0.2, 0.004), 0x1a3a1a, [[0, 0.14, 0.012]]);
  });
  const stings = [0, 1, 2].map((k) => {
    const x = nettleHand[0] - 0.18 + k * 0.15;
    const y = nettleHand[1] + 0.42 + (k % 2) * 0.08;
    return zigzag(
      kit,
      [
        [x, y, nettleHand[2] + 0.05],
        [x + 0.05, y + 0.06, nettleHand[2] + 0.05],
        [x - 0.01, y + 0.1, nettleHand[2] + 0.05],
        [x + 0.04, y + 0.16, nettleHand[2] + 0.05],
      ],
      0.022,
      MAGENTA,
      1.6,
    );
  });
  // The vial of green tincture in her left hand, glowing.
  const vial = add(new CylinderGeometry(0.08, 0.09, 0.22, 12), 0x8aff6a, vialHand[0], vialHand[1] - 0.04, vialHand[2] + 0.02, { delay: 1.45, flat: true });
  cylinder(0.035, 0.04, 0.08, 0x8aff6a, vialHand[0], vialHand[1] + 0.18, vialHand[2] + 0.02, { delay: 1.48, flat: true }, 10);
  cylinder(0.04, 0.035, 0.06, 0x9a7a5a, vialHand[0], vialHand[1] + 0.26, vialHand[2] + 0.02, { delay: 1.5 }, 10);
  motes(6, 0xb8ff9a, 0.02, [vialHand[0] - 0.12, vialHand[1] + 0.3, vialHand[2] - 0.1], [vialHand[0] + 0.12, vialHand[1] + 1.0, vialHand[2] + 0.12], 1.6);

  const dim = new Color(0x4ab03a);
  const bright = new Color(0xd8ffb0);
  tick((t) => {
    bunches.forEach((pivot, i) => (pivot.rotation.z = Math.sin(t * 1.3 + i * 0.9) * 0.08));
    colorOf(vial).lerpColors(dim, bright, (Math.sin(t * 2.2) + 1) / 2);
    stings.forEach((pieces, k) => pieces.forEach((piece) => (piece.visible = (t * 2.5 + k * 0.33) % 1 < 0.55)));
    light.visible = Math.floor(t * 6) % 17 !== 5;
  });

  return { width: 4.9, height: 4.3, lookY: 1.5 };
}
