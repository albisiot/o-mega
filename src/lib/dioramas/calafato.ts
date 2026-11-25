import { BoxGeometry, Color, CylinderGeometry, ExtrudeGeometry, Shape, SphereGeometry, TorusGeometry, type Group } from "three";
import { CYAN, MAGENTA, ORANGE, YELLOW, aim, cable, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Calafato (P232): the rebel ship's mechanic on the slipway of the fishing port. Behind her a
 * trawler sits on its cradle with a fresh patch cut from the starship's hull, its seams still
 * glowing; the wreck's engine ring lies half buried beside a stack of salvaged plates. She grins
 * with a giant wrench on her shoulder while the torch in her other hand spits sparks; the holster
 * on her hip, made for a pistol, only carries a screwdriver.
 */
export function calafato(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick } = kit;
  const STEEL = 0x8a93a3;
  const PLATE = 0x4b4466;
  const HULL = 0x1f5a6e;
  const WHITE = 0xe0dacb;
  const WOOD = 0x5e4a3a;
  const DARK = 0x2e2a3c;
  const F = octagonBase(kit, 0x262a34);
  const G = floor(kit, F, 0.06, 0x363c4a, 0x252a35, 0.45);

  // The trawler on its cradle at the top of the slipway, rails under its keel.
  const BX = -0.7;
  const BZ = -1.25;
  [-0.28, 0.28].forEach((dz, i) => box(2.7, 0.05, 0.08, 0x4a4f5c, BX + 0.1, G, BZ + dz, { delay: 0.1 + i * 0.02 }));
  [-0.75, 0.05, 0.8].forEach((dx, i) => box(0.3, 0.3, 0.6, WOOD, BX + dx, G, BZ, { delay: 0.14 + i * 0.02 }));
  const outline = (s: number) => {
    const shape = new Shape();
    shape.moveTo(1.2 * s, -0.42 * s);
    shape.lineTo(-0.5 * s, -0.42 * s);
    shape.quadraticCurveTo(-1.05 * s, -0.36 * s, -1.3 * s, 0);
    shape.quadraticCurveTo(-1.05 * s, 0.36 * s, -0.5 * s, 0.42 * s);
    shape.lineTo(1.2 * s, 0.42 * s);
    shape.quadraticCurveTo(1.3 * s, 0, 1.2 * s, -0.42 * s);
    return shape;
  };
  const hull = (s: number, depth: number) => new ExtrudeGeometry(outline(s), { depth, bevelEnabled: false, curveSegments: 10 }).rotateX(Math.PI / 2);
  add(hull(0.8, 0.22), DARK, BX, G + 0.3, BZ, { delay: 0.2 });
  add(hull(0.95, 0.52), HULL, BX, G + 0.5, BZ, { delay: 0.24 });
  add(hull(0.965, 0.07), MAGENTA, BX, G + 0.62, BZ, { delay: 0.28, flat: true, noInk: true });
  add(hull(0.98, 0.06), WHITE, BX, G + 1.0, BZ, { delay: 0.3 });
  [-0.75, 0.75].forEach((dx, i) => limb(kit, [BX + dx, G, BZ + 0.95], [BX + dx, G + 0.85, BZ + 0.42], 0.04, 0.04, WOOD, { delay: 0.32 + i * 0.02 }));
  const house = box(0.62, 0.5, 0.56, WHITE, BX + 0.6, G + 1.04, BZ, { delay: 0.36 });
  decorate(house, new BoxGeometry(0.16, 0.12, 0.01), CYAN, [
    [-0.14, 0.32, 0.281],
    [0.14, 0.32, 0.281],
  ]);
  box(0.7, 0.05, 0.64, DARK, BX + 0.6, G + 1.54, BZ, { delay: 0.4 });
  cylinder(0.03, 0.04, 1.1, DARK, BX - 0.35, G + 1.04, BZ, { delay: 0.42 }, 8);
  box(0.5, 0.04, 0.04, DARK, BX - 0.35, G + 1.85, BZ, { delay: 0.44, noInk: true });
  box(0.07, 0.07, 0.07, CYAN, BX - 0.35, G + 2.14, BZ, { delay: 0.46, flat: true, noInk: true });

  // The new patch, a piece of starship hull, its welded seams still hot.
  const patch = box(0.55, 0.34, 0.03, PLATE, BX - 0.3, G + 0.6, BZ + 0.41, { delay: 0.5 });
  const seam = decorate(patch, new BoxGeometry(0.6, 0.025, 0.01), ORANGE, [
    [0, 0, 0.016],
    [0, 0.34, 0.016],
  ]);
  decorate(patch, new BoxGeometry(0.025, 0.36, 0.01), ORANGE, [
    [-0.29, 0.17, 0.016],
    [0.29, 0.17, 0.016],
  ]).color = seam.color;
  const rivet = new SphereGeometry(0.018, 6, 4);
  decorate(patch, rivet, STEEL, [-0.2, -0.07, 0.07, 0.2].flatMap((x) => [[x, 0.07, 0.016], [x, 0.27, 0.016]] as Point[]));

  // The wreck: an engine ring of the ship that fell in pieces, half buried, a few lights still on.
  const ring = add(new TorusGeometry(0.6, 0.17, 10, 24), 0x3a3550, 1.3, G - 0.22, -0.85, { delay: 0.55, rotation: [0, -0.6, 0.2] });
  decorate(ring, new CylinderGeometry(0.44, 0.44, 0.02, 20).rotateX(Math.PI / 2), 0x0b3d50, [[0, 0.77, 0]]);
  decorate(
    ring,
    new BoxGeometry(0.07, 0.42, 0.4),
    DARK,
    [0.3, 1.1, 1.9, 2.7, 3.5, 4.3, 5.1, 5.9].map((a) => [Math.cos(a) * 0.6, 0.77 + Math.sin(a) * 0.6, 0, a - Math.PI / 2] as [number, number, number, number]),
  );
  const lights = decorate(
    ring,
    new BoxGeometry(0.06, 0.06, 0.02),
    MAGENTA,
    [0.7, 1.5, 2.3, 3.1].map((a) => [Math.cos(a) * 0.6, 0.77 + Math.sin(a) * 0.6, 0.18] as Point),
  );
  [0, 1, 2].forEach((k) => {
    const plate = box(0.62, 0.85, 0.04, k % 2 ? PLATE : 0x3e3a58, 1.72 - k * 0.06, G, -0.12 + k * 0.1, { delay: 0.6 + k * 0.04, rotation: [-0.3 + k * 0.08, -0.9, 0] });
    decorate(plate, new BoxGeometry(0.5, 0.015, 0.01), CYAN, [[0, 0.3 + k * 0.12, 0.021]]);
  });

  // Gas bottles for the torch.
  [
    [-0.62, 0.32, 0x2f7f8f],
    [-0.38, 0.12, 0x7a2a4a],
  ].forEach(([x, z, color], i) => {
    cylinder(0.12, 0.12, 0.78, color, x, G, z, { delay: 0.65 + i * 0.03 }, 14);
    cylinder(0.05, 0.08, 0.1, STEEL, x, G + 0.78, z, { delay: 0.68 + i * 0.03 }, 10);
  });

  // Calafato: freckled and grease-smudged, curls under a red bandana, a teal boiler suit.
  const mech = figure(kit, {
    x: 0.5,
    z: 0.55,
    y: G,
    facing: 0.25,
    height: 2.35,
    skin: 0xe6b496,
    hair: { style: "curly", color: 0x1c1418 },
    face: { mouth: "smirk", brows: "calm", marks: 0x5a4648 },
    headwear: { kind: "bandana", color: 0xc8285a },
    top: { kind: "uniform", color: 0x24505c, accent: 0x183a44 },
    bottom: { kind: "trousers", color: 0x214a55 },
    shoes: 0x2a2226,
    gloves: 0x24222a,
    belt: 0x4a3426,
    arms: [
      [-0.4, 1.0, 0.32],
      [0.32, 1.55, 0.3],
    ],
    delay: 0.9,
  });
  const turned = (wait: number): { delay: number; rotation: [number, number, number] } => ({ delay: 1.3 + wait, rotation: [0, 0.25, 0] });
  [-0.15, 0.15].forEach((x, i) => box(0.12, 0.13, 0.08, 0x3e2c22, ...mech.at(x, 0.94, 0.22), turned(i * 0.02)));
  // The holster, cut for a pistol, holding a screwdriver.
  box(0.11, 0.24, 0.07, 0x3e2c22, ...mech.at(-0.31, 0.74, 0.04), turned(0.05));
  cylinder(0.03, 0.03, 0.13, YELLOW, ...mech.at(-0.31, 0.98, 0.04), turned(0.08), 8);

  // The giant wrench on her shoulder.
  const grip = mech.at(0.31, 1.42, 0.38);
  const reach = aim(grip, mech.at(0.8, 2.2, -0.45));
  const L = reach.length;
  const jaw = new Shape();
  jaw.moveTo(-0.04, 0);
  jaw.lineTo(0.04, 0);
  jaw.lineTo(0.04, L - 0.12);
  jaw.lineTo(0.13, L - 0.1);
  jaw.lineTo(0.13, L + 0.12);
  jaw.lineTo(0.05, L + 0.12);
  jaw.lineTo(0.05, L + 0.02);
  jaw.lineTo(-0.06, L + 0.02);
  jaw.lineTo(-0.06, L + 0.17);
  jaw.lineTo(-0.14, L + 0.17);
  jaw.lineTo(-0.14, L - 0.1);
  jaw.lineTo(-0.04, L - 0.12);
  jaw.closePath();
  add(new ExtrudeGeometry(jaw, { depth: 0.07, bevelEnabled: false }).translate(0, 0, -0.035), STEEL, ...grip, { delay: 1.5, rotation: reach.rotation });

  // The torch, its hose back to the bottles, and a fan of sparks.
  const hand = mech.hands[0];
  const tip = mech.at(-0.44, 0.83, 0.54);
  limb(kit, hand, tip, 0.035, 0.025, 0xb08d3c, { delay: 1.5 });
  limb(kit, tip, mech.at(-0.45, 0.78, 0.6), 0.035, 0.005, YELLOW, { delay: 1.55, flat: true, noInk: true });
  cable(kit, [hand, [hand[0] - 0.12, G + 0.1, hand[2] - 0.05], [-0.3, G + 0.08, 0.5], [-0.62, G + 0.84, 0.32]], 0.022, 0x23222b, 1.55);
  const sparks: Group[][] = [[], []];
  for (let k = 0; k < 14; k++) {
    const angle = k * 2.4;
    const length = 0.16 + ((k * 7) % 5) * 0.05;
    const end: Point = [tip[0] + Math.cos(angle) * length, tip[1] - 0.05 - ((k * 3) % 4) * 0.06, tip[2] + Math.sin(angle) * length * 0.7 + 0.05];
    sparks[k % 2].push(box(0.016, aim(tip, end).length, 0.016, k % 3 ? ORANGE : YELLOW, ...tip, { delay: 1.6, flat: true, noInk: true, rotation: aim(tip, end).rotation }));
  }
  const embers = add(new BoxGeometry(0.001, 0.001, 0.001), ORANGE, tip[0], G, tip[2], { delay: 1.6, flat: true, noInk: true });
  decorate(
    embers,
    new BoxGeometry(0.035, 0.01, 0.035),
    ORANGE,
    [0, 1, 2, 3, 4, 5].map((k) => [Math.cos(k * 1.9) * (0.15 + k * 0.04), 0.005, Math.sin(k * 1.9) * (0.12 + k * 0.03)] as Point),
  );

  const hot = new Color(ORANGE);
  const cold = new Color(0x7a2a3a);
  tick((t) => {
    const flick = Math.floor(t * 14) % 2 === 0;
    sparks[0].forEach((spark) => (spark.visible = flick));
    sparks[1].forEach((spark) => (spark.visible = !flick));
    embers.visible = Math.floor(t * 5) % 3 !== 2;
    seam.color.lerpColors(hot, cold, ((1 - Math.cos(t * 1.4)) / 2) * 0.8);
    lights.color.setHex(Math.floor(t * 1.3) % 3 === 2 ? 0x5a1a30 : MAGENTA);
  });

  return { width: 4.9, height: 4.4, lookY: 1.45 };
}
