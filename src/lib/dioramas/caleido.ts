import { BoxGeometry, CylinderGeometry, OctahedronGeometry } from "three";
import { CYAN, MAGENTA, ORANGE, YELLOW, aim, archMouth, colorOf, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Caleido (P329): the Faro team's glassmaker in the glassworks at night, in her white
 * protective coat with crystal prisms on her shoulders, smiling, both fists thrown out: from each
 * one a fan of rainbow beams shimmers. Behind her the furnace's mouth glows orange, a blowpipe
 * rests in it with a gather of molten glass, and finished vases line the shelf. Specks of every
 * colour dance on the floor all round her: wherever she is, she cannot hide.
 */
export function caleido(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const BRICK = 0x4a2e44;
  const F = octagonBase(kit, 0x1c1a26);
  const G = floor(kit, F, 0.06, 0x332c3a, 0x241e2a, 0.4);

  // The furnace: a brick block with a glowing arched mouth and a chimney.
  const [fx, fz] = [-0.8, -1.2];
  const furnace = box(1.45, 1.45, 0.95, BRICK, fx, G, fz, { delay: 0.1, ink: 1.02 });
  const bricks: Point[] = [];
  for (let r = 0; r < 6; r++) for (let c = 0; c < 4; c++) bricks.push([-0.54 + c * 0.36 + (r % 2) * 0.18, 0.12 + r * 0.24, 0.476]);
  decorate(furnace, new BoxGeometry(0.3, 0.025, 0.01), 0x3a2236, bricks);
  decorate(furnace, archMouth(0.4, 0.45), 0x2a1a26, [[0, 0.18, 0.474]]);
  const mouth = decorate(furnace, archMouth(0.32, 0.42), ORANGE, [[0, 0.2, 0.478]]);
  decorate(furnace, archMouth(0.18, 0.3), YELLOW, [[0, 0.2, 0.482]]);
  box(0.4, 0.9, 0.4, BRICK, fx - 0.3, G + 1.45, fz - 0.15, { delay: 0.16 });
  motes(8, ORANGE, 0.025, [fx - 0.3, G + 0.4, fz + 0.5], [fx + 0.3, G + 1.4, fz + 0.7], 0.6);

  // The blowpipe, its gather of molten glass in the furnace's mouth.
  const gather: Point = [fx + 0.05, G + 0.48, fz + 0.62];
  limb(kit, [fx + 0.75, G + 0.02, fz + 1.35], gather, 0.022, 0.022, 0x6a7080, { delay: 0.3 });
  const glob = ball(0.09, ORANGE, gather[0], gather[1] - 0.09, gather[2], { delay: 0.34, flat: true });

  // The shelf of finished glass.
  const [sx, sz] = [0.95, -1.3];
  [-0.55, 0.55].forEach((dx) => box(0.05, 1.5, 0.32, 0x3e3028, sx + dx, G, sz, { delay: 0.2 }));
  [0.5, 1.0, 1.45].forEach((y, k) => box(1.15, 0.04, 0.32, 0x5e4a3a, sx, G + y, sz, { delay: 0.22 + k * 0.03 }));
  [
    [-0.35, 0.54, 0.09, 0.22, CYAN],
    [-0.05, 0.54, 0.07, 0.3, MAGENTA],
    [0.3, 0.54, 0.1, 0.18, 0x9b5cff],
    [-0.25, 1.04, 0.06, 0.28, 0x9fe8ff],
    [0.15, 1.04, 0.1, 0.2, MAGENTA],
    [0.4, 1.04, 0.06, 0.25, CYAN],
  ].forEach(([dx, y, r, h, color], i) => {
    cylinder(r * 0.7, r, h, color, sx + dx, G + y, sz, { delay: 0.3 + i * 0.03 }, 12);
    ball(r, color, sx + dx, G + y + h * 0.4, sz, { delay: 0.32 + i * 0.03 });
  });

  // Caleido, fists out, the light coming apart in her hands.
  const facing = 0.3;
  const glazier = figure(kit, {
    x: 0.15,
    z: 0.35,
    y: G,
    facing,
    height: 2.4,
    build: "slim",
    skin: 0x6a4430,
    hair: { style: "braids", color: 0x1a1414 },
    face: { mouth: "smile", brows: "calm" },
    top: { kind: "coat", color: 0xd8dce4, accent: 0xb8c0cc },
    bottom: { kind: "trousers", color: 0xc8ccd8 },
    shoes: 0x2a2a34,
    gloves: 0x1a1a22,
    belt: 0xb8c0cc,
    arms: [[-0.78, 1.8, 0.4], [0.78, 1.62, 0.42]],
    delay: 0.8,
  });
  // A bun on top and more braids down her back.
  const RH = glazier.headRadius;
  const bun = glazier.at(0, 2.14 + RH * 0.85, -0.04);
  ball(0.1, 0x1a1414, bun[0], bun[1], bun[2], { delay: 1.3 });
  [-0.1, 0, 0.1].forEach((dx, k) =>
    limb(kit, glazier.at(dx, 2.18, -RH * 0.85), glazier.at(dx * 1.6, 1.35 + (k % 2) * 0.1, -0.28), 0.035, 0.03, 0x1a1414, { delay: 1.32 + k * 0.02 }),
  );
  // Prisms on her shoulders.
  [-1, 1].forEach((side) => {
    const pad = glazier.at(side * 0.34, 1.74, 0);
    add(new OctahedronGeometry(0.15).scale(1, 0.75, 1), 0x9fe8ff, ...pad, { delay: 1.35, rotation: [0, facing + 0.4, side * 0.3] });
    add(new OctahedronGeometry(0.07), 0xe8f4ff, pad[0], pad[1] + 0.12, pad[2], { delay: 1.4, flat: true, rotation: [0, facing, 0] });
  });

  // A fan of rainbow beams from each fist.
  const RAINBOW = [0xff2e6c, ORANGE, YELLOW, 0x3ad06a, CYAN, 0x3a6aff, 0x9b5cff];
  const beams = glazier.hands.flatMap((hand, i) => {
    const side = i ? 1 : -1;
    return RAINBOW.map((color, k) => {
      const lx = side * 0.8;
      const ly = 0.05 + (k - 3) * 0.13;
      const lz = 0.55 + (3 - Math.abs(k - 3)) * 0.04;
      const dir: Point = [lx * Math.cos(facing) + lz * Math.sin(facing), ly, -lx * Math.sin(facing) + lz * Math.cos(facing)];
      const n = Math.hypot(...dir);
      const end: Point = [hand[0] + (dir[0] / n) * 1.05, hand[1] + (dir[1] / n) * 1.05, hand[2] + (dir[2] / n) * 1.05];
      const { length, rotation } = aim(hand, end);
      return cylinder(0.055, 0.012, length, color, ...hand, { delay: 1.6 + k * 0.03, flat: true, noInk: true, rotation }, 6);
    });
  });

  // Specks of every colour on the floor round her.
  const specks = Array.from({ length: 16 }, (_, k) => {
    const a = k * 2.39;
    const r = 0.7 + ((k * 7) % 9) * 0.13;
    return add(new CylinderGeometry(0.05, 0.05, 0.006, 10), RAINBOW[k % 7], 0.15 + Math.cos(a) * r, G + 0.002, 0.35 + Math.sin(a) * r * 0.85, { delay: 1.7 + k * 0.02, flat: true, noInk: true });
  });

  tick((t) => {
    beams.forEach((beam, k) => {
      const mesh = beam.children[0];
      const pulse = 0.82 + 0.18 * Math.sin(t * 3 + k * 0.7);
      mesh.scale.set(1 + (1 - pulse), pulse, 1 + (1 - pulse));
    });
    specks.forEach((speck, k) => (speck.visible = Math.floor(t * 2 + k * 1.3) % 5 !== 3));
    const heat = (Math.sin(t * 2.4) + 1) / 2;
    mouth.color.setRGB(1, 0.42 + heat * 0.12, heat * 0.05);
    colorOf(glob).setRGB(1, 0.45 + heat * 0.2, 0.05);
  });

  return { width: 4.9, height: 4.4, lookY: 1.55 };
}
