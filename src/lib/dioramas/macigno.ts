import { BoxGeometry, CylinderGeometry, Group } from "three";
import { INK, ORANGE, YELLOW, octagonBase, type Framing, type Kit } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { column, facade, floor, ring, rubble, towerCrane } from "@/lib/diorama-props";

/**
 * Macigno (P266): the nameless quarryman of the Ferrigni on a demolition site of the Compagnia
 * Lete, a half-pulled-down house and a ruined temple behind, a lantern swinging from the crane.
 * Huge, his skin grey as granite, he carries a millstone across his shoulders and lumbers on,
 * puzzled; the name badge on his apron is sealed over with wax, and the chalk circle where the
 * stone should go is right behind him, the other way.
 */
export function macigno(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const STONE = 0x5d6680;
  const SKIN = 0xa89488;
  const F = octagonBase(kit, 0x1e1c26);
  const G = floor(kit, F, 0.06, 0x34323c, 0x24222c, 0.5);

  // The site: a house half pulled down, rubble, the temple's columns, the crane.
  facade(kit, -1.05, -1.45, G, 0.1, { width: 1.7, height: 1.6, color: 0x3a2f4e, windows: 3, floors: 2, lit: 0x141a26 });
  [
    [-1.6, 1.6, 0.5],
    [-1.15, 1.75, -0.3],
    [-0.5, 1.6, 0.8],
  ].forEach(([x, y, turn], i) => box(0.35, 0.3, 0.25, 0x3a2f4e, x, G + y, -1.45, { delay: 0.2 + i * 0.03, rotation: [0, 0, turn] }));
  rubble(kit, -1.35, -0.75, G, 0.3, 9, 0.55, 0x4a4060);
  rubble(kit, 1.3, 0.75, G, 0.35, 5, 0.35);
  column(kit, 0.75, -1.4, G, 0.25, 2.3, false, 0x7c9cb4);
  column(kit, 1.35, -1.1, G, 0.3, 2.3, true, 0x7c9cb4);
  box(0.9, 0.22, 0.4, 0x8aa8c0, 1.0, G + 0.02, -0.5, { delay: 0.35, rotation: [0, 0.6, 0.12] });
  const warning = towerCrane(kit, 1.75, -0.4, G, 0.4, 3.4, -1.0, YELLOW);
  const pivot = new Group();
  pivot.position.set(1.2, G + 3.4, -0.4);
  const rope = box(0.012, 0.6, 0.012, INK, 1.2, G + 2.8, -0.4, { delay: 0.6, noInk: true });
  const lantern = box(0.14, 0.18, 0.14, YELLOW, 1.2, G + 2.62, -0.4, { delay: 0.65, flat: true });
  const cap = box(0.18, 0.04, 0.18, 0x23222b, 1.2, G + 2.8, -0.4, { delay: 0.66 });
  rope.parent?.add(pivot);
  [rope, lantern, cap].forEach((part) => {
    part.position.sub(pivot.position);
    pivot.add(part);
  });

  // The chalk circle where the stone should go, and its two flagged stakes: behind him.
  ring(kit, [0.45, G + 0.004, -0.35], 0.42, ORANGE, 0.5);
  cylinder(0.08, 0.08, 0.008, ORANGE, 0.45, G + 0.002, -0.35, { delay: 0.52, flat: true, noInk: true }, 12);
  [
    [-0.05, -0.65],
    [0.9, -0.05],
  ].forEach(([x, z], i) => {
    cylinder(0.015, 0.015, 0.55, 0x8a6a4a, x, G, z, { delay: 0.55 + i * 0.03 }, 6);
    box(0.14, 0.09, 0.01, ORANGE, x + 0.07, G + 0.44, z, { delay: 0.58 + i * 0.03, flat: true });
  });

  // Macigno, lumbering away from the circle with the millstone on his back.
  const X = -0.45;
  const Z = 0.4;
  const FACE = 0.45;
  const giant = figure(kit, {
    x: X,
    z: Z,
    y: G,
    facing: FACE,
    height: 2.7,
    build: "broad",
    skin: SKIN,
    hair: { style: "short", color: 0x2a2a30 },
    face: { mouth: "open", brows: "worried", marks: 0x6a5a56 },
    top: { kind: "apron", color: 0x5a6270, accent: 0xb8a88a, sleeves: "long" },
    bottom: { kind: "trousers", color: 0x3a3e48 },
    shoes: 0x2a2622,
    arms: [
      [-0.72, 2.45, -0.36],
      [0.72, 2.45, -0.36],
    ],
    legs: "stride",
    delay: 0.8,
  });
  const o = (delay: number, tilt = 0): { delay: number; rotation: [number, number, number] } => ({ delay, rotation: [tilt, FACE, 0] });
  const extra = [
    // The black band across the apron, the apron's lower half, and the badge sealed with wax.
    box(0.56, 0.08, 0.02, 0x1e1c22, ...giant.at(0, 1.5, 0.37), o(1.2)),
    box(0.58, 0.45, 0.03, 0xb8a88a, ...giant.at(0, 0.78, 0.34), o(1.22)),
    box(0.15, 0.09, 0.015, 0xe8e2d0, ...giant.at(0.14, 1.66, 0.36), o(1.26)),
    ball(0.05, 0xc81e3a, ...giant.at(0.15, 1.64, 0.38), { delay: 1.3 }),
  ];
  // The millstone: nearly upright, its face to us, resting across his upper back.
  const tilt = 0.3;
  const centre = giant.at(0, 2.6, -0.55);
  const lift = 0.8 * Math.cos(tilt) + 0.15 * Math.sin(tilt);
  const stone = add(new CylinderGeometry(0.8, 0.8, 0.3, 28).rotateX(Math.PI / 2 - tilt), STONE, centre[0], centre[1] - lift, centre[2], o(1.5));
  decorate(stone, new CylinderGeometry(0.14, 0.14, 0.01, 16).rotateX(Math.PI / 2 - tilt), 0x1a1822, [[0, lift + 0.155 * Math.sin(tilt), 0.155 * Math.cos(tilt)]]);
  decorate(stone, new CylinderGeometry(0.5, 0.5, 0.01, 24).rotateX(Math.PI / 2 - tilt), 0x52597a, [[0, lift + 0.152 * Math.sin(tilt), 0.152 * Math.cos(tilt)]]);
  decorate(stone, new BoxGeometry(0.02, 0.3, 0.01), INK, [
    [-0.3, lift + 0.25, 0.15, 0.6],
    [0.35, lift - 0.3, 0.2, -0.4],
  ]);
  extra.push(stone);
  motes(10, 0xb0a8a0, 0.025, [-1.8, G, -1.2], [1.6, G + 1.6, 1.0], 0.8);

  const moving = [...giant.parts, ...extra];
  const rest = moving.map((part) => part.position.y);
  tick((t) => {
    // A slow, heavy step; the lantern swings; the crane's light blinks.
    const step = Math.abs(Math.sin(t * 1.4)) * 0.04;
    moving.forEach((part, i) => (part.position.y = rest[i] + step));
    pivot.rotation.z = Math.sin(t * 1.1) * 0.18;
    warning.visible = Math.floor(t * 1.5) % 2 === 0;
  });

  return { width: 4.9, height: 4.6, lookY: 1.7 };
}
