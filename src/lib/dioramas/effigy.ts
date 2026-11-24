import { BoxGeometry, Color, ConeGeometry, CylinderGeometry, DodecahedronGeometry, Group, SphereGeometry } from "three";
import { MAGENTA, YELLOW, aim, cable, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { column, floor, rubble } from "@/lib/diorama-props";

/**
 * Effigy (P079): in a gallery of the archaeological museum the gorgon reaches out a claw of
 * stone, her snakes rearing and her eyes burning yellow; beyond the velvet rope a visitor has
 * turned to stone mid-photo beside the broken column on show. The stone is climbing her too,
 * from the floor up to her knees, and the tall mirror at her side is shrouded in a sheet.
 */
export function effigy(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick } = kit;
  const STONE = 0x8c909c;
  const STONE_DARK = 0x6a6e7a;
  const BRASS = 0xc8963a;
  const F = octagonBase(kit, 0x1d1b28);
  const G = floor(kit, F, 0.06, 0x343850, 0x262838, 0.6);

  // The gallery: a back wall with a magenta frieze, a broken column on show behind a velvet rope.
  const wall = box(2.8, 2.5, 0.2, 0x2a2e44, 0, G, -1.75, { delay: 0.1, ink: 1.02 });
  decorate(wall, new BoxGeometry(2.8, 0.08, 0.01), MAGENTA, [[0, 2.2, 0.105]]);
  decorate(wall, new BoxGeometry(0.7, 1.2, 0.01), 0x22253a, [[-0.75, 1.0, 0.105], [0.75, 1.0, 0.105]]);
  box(0.6, 0.35, 0.6, 0x5d6680, 1.35, G, -1.15, { delay: 0.2 });
  column(kit, 1.35, -1.15, G + 0.35, 0.25, 1.7, true, 0x9aa4b4);

  // The visitor turned to stone, phone held up for a photo, now roped off like the exhibits.
  const posts: Point[] = [[-2.0, G, 0.25], [-0.95, G, 0.0]];
  posts.forEach((p, i) => {
    cylinder(0.025, 0.04, 0.7, BRASS, ...p, { delay: 0.35 + i * 0.03 }, 8);
    cylinder(0.05, 0.05, 0.08, BRASS, p[0], G + 0.7, p[2], { delay: 0.37 + i * 0.03 }, 8);
  });
  cable(kit, [[-2.0, G + 0.68, 0.25], [-1.47, G + 0.45, 0.13], [-0.95, G + 0.68, 0.0]], 0.025, 0x9a1a4a, 0.42);
  const visitor = figure(kit, {
    x: -1.35, z: -0.6, y: G, facing: 0.75, height: 2.2,
    skin: STONE,
    hair: { style: "short", color: STONE_DARK },
    face: { mouth: "open", brows: "worried" },
    headwear: { kind: "cap", color: STONE_DARK },
    top: { kind: "hoodie", color: STONE },
    bottom: { kind: "shorts", color: STONE_DARK },
    shoes: STONE_DARK,
    arms: [[-0.06, 1.72, 0.42], [0.08, 1.68, 0.42]],
    legs: "stride",
    delay: 0.5,
  });
  box(0.09, 0.16, 0.02, STONE_DARK, ...visitor.at(0.01, 1.68, 0.47), { delay: 1.0, rotation: [0, 0.75, 0] });
  box(0.3, 0.38, 0.18, STONE_DARK, ...visitor.at(0, 1.05, -0.3), { delay: 1.0, rotation: [0, 0.75, 0] });

  // The tall mirror under a sheet; one corner of glass shows at the bottom.
  const MX = 1.45;
  const MZ = 0.85;
  [-0.25, 0.25].forEach((dx) => box(0.05, 0.3, 0.3, 0x4a3a30, MX + dx, G, MZ, { delay: 0.45, rotation: [0, 0.3, 0] }));
  const glass = box(0.62, 1.5, 0.06, 0x4a3a30, MX, G + 0.2, MZ, { delay: 0.5, rotation: [0, 0.3, 0] });
  decorate(glass, new BoxGeometry(0.16, 0.12, 0.01), 0x9fe8ff, [[0.2, 0.12, 0.035]]);
  const sheet = box(0.7, 1.4, 0.12, 0xd0cabc, MX, G + 0.42, MZ, { delay: 0.55, rotation: [0, 0.3, 0.02] });
  decorate(sheet, new BoxGeometry(0.03, 1.3, 0.01), 0xa8a294, [[-0.2, 0.68, 0.065], [0.05, 0.7, 0.065], [0.24, 0.66, 0.065]]);
  add(new SphereGeometry(0.4, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.25, 0.3), 0xd0cabc, MX, G + 1.82, MZ, { delay: 0.6, rotation: [0, 0.3, 0] });

  // Effigy: grey-blue skin, black armoured gown, magenta cape and collar, a stone claw out.
  const facing = 0.45;
  const CLAW: Point = [-0.66, 1.5, 0.48];
  const h = 2.55;
  const u = h / 2.4;
  const gorgon = figure(kit, {
    x: -0.1, z: 0.3, y: G, facing, height: h, build: "slim",
    skin: 0x8aa2b8,
    hair: { style: "bald", color: 0x2f6a7a },
    face: { eyes: YELLOW, glow: true, mouth: "neutral", brows: "angry" },
    top: { kind: "dress", color: 0x1a1f2e },
    gloves: 0xa0a6b0,
    shoes: STONE,
    arms: [CLAW, "down"],
    delay: 0.8,
  });
  const rot: Point = [0, facing, 0];
  add(new CylinderGeometry(0.36, 0.8, 1.72, 18).scale(1, 1, 0.32), 0xb0245a, ...gorgon.at(0, 0.05, -0.17), { delay: 0.85, rotation: rot });
  [-1, 1].forEach((side) => box(0.26, 0.48, 0.04, 0x8a1a40, ...gorgon.at(side * 0.19, 1.66, -0.1), { delay: 1.2, rotation: [0, facing, -side * 0.42] }));

  // The right forearm gone to stone, cracked, ending in claws.
  const shoulder: Point = [-0.34 * u, 1.72 * u, 0];
  const elbow = gorgon.at((shoulder[0] + CLAW[0]) / 2 - 0.14 * u, (shoulder[1] + CLAW[1]) / 2 - 0.1 * u, (shoulder[2] + CLAW[2]) / 2 - 0.04 * u);
  const claw = gorgon.hands[0];
  limb(kit, elbow, claw, 0.105, 0.095, 0xa0a6b0, { delay: 1.4 });
  [0.3, 0.6].forEach((k, i) => add(new DodecahedronGeometry(0.06), STONE_DARK, elbow[0] + (claw[0] - elbow[0]) * k, elbow[1] + (claw[1] - elbow[1]) * k - 0.02, elbow[2] + (claw[2] - elbow[2]) * k, { delay: 1.45 + i * 0.03, rotation: [i, 1, 0] }));
  const reach = aim(elbow, claw);
  [-1, 0, 1].forEach((k, i) => {
    const tip = add(new ConeGeometry(0.02, 0.16, 5), 0xe8e2d0, claw[0] + k * 0.045, claw[1] - 0.02, claw[2] + k * 0.02, { delay: 1.5 + i * 0.02, rotation: reach.rotation });
    tip.rotation.z += k * 0.25;
  });

  // The stone creeping up from the floor over her gown, chunks round her feet.
  const RW = 0.25 * u;
  const sheath = add(new CylinderGeometry(RW * 1.45, RW * 1.7, 0.55, 18).scale(1, 1, 0.82), STONE, ...gorgon.at(0, 0.1, 0), { delay: 1.1, rotation: rot });
  decorate(sheath, new BoxGeometry(0.015, 0.3, 0.01), STONE_DARK, [[-0.1, 0.25, RW * 1.4, 0.4], [0.15, 0.3, RW * 1.35, -0.3]]);
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2;
    add(new DodecahedronGeometry(0.07 + (k % 3) * 0.02), k % 2 ? STONE : STONE_DARK, ...gorgon.at(Math.sin(a) * RW * 1.45, 0.58 + (k % 3) * 0.05, Math.cos(a) * RW * 1.2), { delay: 1.15 + k * 0.02, rotation: [k, k * 2, 0] });
  }
  rubble(kit, gorgon.at(0, 0, 0)[0], gorgon.at(0, 0, 0)[2], G, 1.0, 6, 0.5, STONE_DARK);

  // Her snakes, rearing from her scalp, heads swaying.
  const R = gorgon.headRadius;
  const snakes: { head: Group; y: number; yaw: number }[] = [];
  [
    [-1.2, 0.5],
    [-0.6, 0.35],
    [0, 0.25],
    [0.6, 0.35],
    [1.2, 0.5],
    [-1.7, 1.0],
    [1.7, 1.0],
    [-2.6, 0.7],
    [2.6, 0.7],
  ].forEach(([a, b], i) => {
    // `a` turns round the head from the front, `b` leans out from the top.
    const out = (r: number, up: number): Point => gorgon.at(Math.sin(a) * Math.sin(b + up) * r, 2.14 * u + Math.cos(b + up) * r, Math.cos(a) * Math.sin(b + up) * r * 0.8 - 0.05);
    const base = out(R * 0.9, 0);
    const bend = out(R + 0.22, 0.35);
    const tip = out(R + 0.38, 0.75);
    const color = i % 2 ? 0x7a2a5a : 0x2f6a7a;
    cable(kit, [base, [bend[0], bend[1] + 0.12, bend[2]], tip], 0.04, color, 1.4 + i * 0.03);
    const yaw = facing + a;
    const head = add(new SphereGeometry(0.075, 10, 8).scale(1, 0.75, 1.5), color, tip[0], tip[1] - 0.056, tip[2], { delay: 1.6 + i * 0.03, rotation: [0, yaw, 0] });
    decorate(head, new BoxGeometry(0.02, 0.02, 0.01), MAGENTA, [[-0.035, 0.08, 0.085], [0.035, 0.08, 0.085]]);
    decorate(head, new BoxGeometry(0.01, 0.006, 0.08), 0xff4060, [[0, 0.04, 0.15]]);
    snakes.push({ head, y: tip[1] - 0.056, yaw });
  });

  // Her eyes, glowing brighter now and then.
  const fz = R * 0.9;
  const cy = R * 1.06;
  const eyes = decorate(gorgon.headPart, new BoxGeometry(0.055 * u, 0.04 * u, 0.02), YELLOW, [[-0.08 * u, cy + 0.03 * u, fz + 0.012], [0.08 * u, cy + 0.03 * u, fz + 0.012]]);
  const pebble = add(new DodecahedronGeometry(0.03), STONE, ...claw, { delay: 2.0 });

  const glowFrom = new Color(YELLOW);
  const glowTo = new Color(0xffffff);
  tick((t) => {
    snakes.forEach(({ head, y, yaw }, i) => {
      head.position.y = y + Math.sin(t * 2.1 + i * 1.7) * 0.02;
      head.rotation.y = yaw + Math.sin(t * 1.6 + i) * 0.35;
    });
    eyes.color.lerpColors(glowFrom, glowTo, Math.max(0, Math.sin(t * 1.2)) ** 3);
    // A crumb of stone falls from her claw, again and again.
    const fall = (t * 0.6) % 1;
    pebble.position.set(claw[0], claw[1] - 0.1 - fall * fall * (claw[1] - G - 0.1), claw[2]);
    pebble.visible = fall < 0.95;
  });

  return { width: 4.9, height: 4.4, lookY: 1.55 };
}
