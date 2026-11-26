import { BoxGeometry, ConeGeometry, CylinderGeometry, SphereGeometry } from "three";
import { CYAN, INK, YELLOW, aim, archMouth, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Stoccata (P340): the old fencing master of the Fosse gym, lunging down the piste in his white
 * jacket and dark sash, the foil's point flashing. On the wall behind him, among the pupils' masks, hangs the
 * horned helm of the biggest thing he ever faced, with two neat holes in it: two thrusts were
 * enough. Under the moonlit arched window his price waits by the chair: towel, glass of water
 * and the walking stick he needs once the lesson is over.
 */
export function stoccata(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const WOOD = 0x5e4a3a;
  const WHITE = 0xe6e8ee;
  const STEEL = 0xc8d0d8;
  const F = octagonBase(kit, 0x1e1a22);
  const G = floor(kit, F, 0.06, 0x4a3a30, 0x2e241e, 0.3);

  // The piste: two white lines along the lunge.
  [-0.25, 0.65].forEach((dx, k) => box(0.03, 0.004, 3.0, 0xd8d2c4, dx, G, 0.0, { delay: 0.1 + k * 0.02, flat: true, noInk: true, rotation: [0, 0.3, 0] }));

  // The gym wall: an arched window full of moonlight, masks on pegs, the trophy helm.
  const wall = box(3.0, 2.7, 0.2, 0x3a2a3a, 0, G, -1.55, { delay: 0.1, ink: 1.02 });
  decorate(wall, archMouth(0.36, 0.9), 0x2a6a8a, [[-0.95, 0.85, 0.1]]);
  decorate(wall, new BoxGeometry(0.03, 1.25, 0.01), INK, [[-0.95, 1.48, 0.125]]);
  decorate(wall, new BoxGeometry(0.72, 0.03, 0.01), INK, [[-0.95, 1.45, 0.125]]);
  decorate(wall, new BoxGeometry(0.8, 0.06, 0.06), WOOD, [[-0.95, 0.82, 0.12]]);
  decorate(wall, new BoxGeometry(3.0, 0.08, 0.04), WOOD, [[0, 1.05, 0.12]]);
  [0.55, 0.9, 1.25].forEach((x, k) => {
    const mask = add(new SphereGeometry(0.13, 12, 10).scale(1, 1.2, 0.9), 0x2a2a34, x, G + 1.72, -1.36, { delay: 0.3 + k * 0.04 });
    decorate(mask, new BoxGeometry(0.2, 0.012, 0.01), 0x4a4a58, [0.12, 0.17, 0.22].map((y) => [0, y, 0.115] as Point));
    box(0.22, 0.1, 0.04, WHITE, x, G + 1.64, -1.3, { delay: 0.32 + k * 0.04, rotation: [-0.3, 0, 0] });
  });
  // The helm of a monster, two holes through its brow, light shining out.
  add(new CylinderGeometry(0.4, 0.4, 0.05, 16).rotateX(Math.PI / 2), WOOD, -0.12, G + 1.95, -1.42, { delay: 0.4 });
  const helm = add(new SphereGeometry(0.33, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62).scale(1.1, 1, 0.8), 0x3a4458, -0.12, G + 2.12, -1.25, { delay: 0.45 });
  decorate(helm, new BoxGeometry(0.42, 0.05, 0.02), INK, [[0, 0.1, 0.27]]);
  decorate(helm, new CylinderGeometry(0.03, 0.03, 0.02, 10).rotateX(Math.PI / 2), YELLOW, [
    [-0.06, 0.33, 0.21],
    [0.06, 0.33, 0.21],
  ]);
  [
    [-0.3, 0.6],
    [0.3, -0.6],
    [0, 0],
  ].forEach(([dx, lean], k) => add(new ConeGeometry(0.06, 0.3, 8), 0xd8d2c4, -0.12 + dx, G + 2.3 + (k === 2 ? 0.08 : 0), -1.25, { delay: 0.5 + k * 0.03, rotation: [0, 0, lean] }));

  // The hanging lamp.
  box(0.015, 0.5, 0.015, INK, 0.75, G + 2.75, -0.4, { delay: 0.2, noInk: true });
  add(new ConeGeometry(0.2, 0.16, 12), 0x2a2a34, 0.75, G + 2.6, -0.4, { delay: 0.25 });
  const bulb = ball(0.06, YELLOW, 0.75, G + 2.5, -0.4, { delay: 0.3, flat: true, noInk: true });

  // The chair: towel, glass of water, and the walking stick against it.
  const CX = 1.45;
  const CZ = 0.35;
  [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => box(0.04, 0.45, 0.04, WOOD, CX + sx * 0.17, G, CZ + sz * 0.17, { delay: 0.5, noInk: true })));
  box(0.42, 0.05, 0.42, WOOD, CX, G + 0.45, CZ, { delay: 0.55 });
  box(0.42, 0.5, 0.05, WOOD, CX, G + 0.5, CZ - 0.19, { delay: 0.58 });
  box(0.3, 0.35, 0.07, WHITE, CX + 0.04, G + 0.72, CZ - 0.18, { delay: 0.62, rotation: [0, 0, 0.1] });
  cylinder(0.05, 0.04, 0.13, CYAN, CX - 0.08, G + 0.5, CZ + 0.08, { delay: 0.66 }, 12);
  limb(kit, [CX - 0.35, G, CZ + 0.15], [CX - 0.24, G + 0.86, CZ - 0.05], 0.022, 0.022, 0x3a2a22, { delay: 0.7 });
  add(new SphereGeometry(0.06, 10, 6, 0, Math.PI), 0x3a2a22, CX - 0.24, G + 0.84, CZ - 0.05, { delay: 0.72, rotation: [0, 0.3, Math.PI / 2] });

  // Stoccata, in his white jacket and dark sash, mid-lunge.
  const FACE = 0.05;
  const master = figure(kit, {
    x: 0.15,
    z: 0.0,
    y: G,
    facing: FACE,
    height: 2.4,
    skin: 0xe0b8a0,
    hair: { style: "short", color: 0xd8dce2 },
    face: { mouth: "frown", brows: "angry", eyes: 0x3a6a8a },
    top: { kind: "shirt", color: WHITE },
    bottom: { kind: "trousers", color: WHITE },
    shoes: 0xd8d2c4,
    belt: 0x2a2e4a,
    gloves: 0xd8d2c4,
    arms: [[-0.62, 1.64, 0.7], [0.5, 2.05, -0.3]],
    legs: "stride",
    delay: 0.8,
  });
  const [hand] = master.hands;
  const tipAt = master.at(-1.02, 1.74, 1.58);
  const { rotation } = aim(hand, tipAt);
  const guard = lerp(hand, tipAt, 0.07);
  const foil = [
    limb(kit, guard, tipAt, 0.016, 0.01, STEEL, { delay: 1.4 }),
    add(new SphereGeometry(0.1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), STEEL, ...guard, { delay: 1.42, rotation }),
  ];
  const tip = [0, Math.PI / 3, (Math.PI * 2) / 3].map((spin) => box(0.2, 0.03, 0.01, YELLOW, ...tipAt, { delay: 1.6, flat: true, noInk: true, rotation: [0, 0.35, spin + 0.4] }));
  const sash = box(0.12, 0.36, 0.03, 0x2a2e4a, ...master.at(0.24, 0.72, 0.2), { delay: 1.3, rotation: [0.1, FACE, 0.15] });

  const body = [...master.parts, ...foil, ...tip, sash];
  const rest = body.map((part) => part.position.clone());
  const forward = [Math.sin(FACE), Math.cos(FACE)];
  tick((t) => {
    // Lunge and recover, the point flashing at full stretch.
    const reach = Math.max(0, Math.sin(t * 2.2)) * 0.12;
    body.forEach((part, i) => part.position.set(rest[i].x + forward[0] * reach, rest[i].y, rest[i].z + forward[1] * reach));
    tip.forEach((star) => (star.visible = reach > 0.06 || t < 0.4));
    bulb.position.x = 0.75 + Math.sin(t * 1.1) * 0.015;
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}

function lerp(a: Point, b: Point, k: number): Point {
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}
