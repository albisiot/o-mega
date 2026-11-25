import { BoxGeometry, type BufferGeometry, Color, ConeGeometry, CylinderGeometry, ExtrudeGeometry, type Material, type Mesh, Shape, TorusGeometry } from "three";
import { CYAN, MAGENTA, colorOf, limb, octagonBase, type Framing, type Kit, type PartOptions, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { barrel, crate, facade, floor, wallLantern } from "@/lib/diorama-props";

/**
 * Legatura (P254): the duellist hunter in a wet alley behind the old port, a ship's mast at its
 * end, gripping his long glaive with the violet blade. Swords that failed to kill him lie
 * snapped on the cobbles; the ones he kept stick out of the case on his back, and its last slot
 * is empty and glowing: he still has room at the back.
 */
export function legatura(kit: Kit): Framing {
  const { add, box, ball, decorate, tick, motes } = kit;
  const ROBE = 0x1e2a30;
  const LEATHER = 0x5a3a28;
  const STEEL = 0xb8c0cc;
  const GLOW = 0xb84dff;
  const WOOD = 0x5e4a3a;
  const F = octagonBase(kit, 0x1c1a26);
  const G = floor(kit, F, 0.06, 0x2e3040, 0x1e2030, 0.35);
  /** A geometry built round a point of its own, put with that point at a place. */
  const put = (geometry: BufferGeometry, color: number, [x, y, z]: Point, options: PartOptions) => {
    geometry.computeBoundingBox();
    return add(geometry, color, x, y + (geometry.boundingBox?.min.y ?? 0), z, options);
  };

  // The alley: a plastered side wall, a house at the back with a lantern, a mast beyond.
  const side = box(0.3, 2.6, 2.15, 0x3a2a48, -1.85, G, -0.17, { delay: 0.08, ink: 1.02 });
  decorate(side, new BoxGeometry(0.01, 0.28, 0.18), 0x141a26, [
    [0.152, 1.0, -0.6],
    [0.152, 1.9, 0.3],
  ]);
  decorate(side, new BoxGeometry(0.01, 0.28, 0.18), 0xff8a00, [[0.152, 1.9, -0.6]]);
  facade(kit, -0.35, -1.45, G, 0.1, { width: 2.4, height: 2.8, color: 0x2e2a40, windows: 3, floors: 2, door: true, lit: 0xff8a00 });
  const lantern = wallLantern(kit, 0.6, -1.3, G + 2.0, 0.3, 0xff8a00);
  // A ship moored at the end of the alley: hull, mast, furled sails, rigging.
  box(1.1, 0.6, 0.45, 0x22202c, 1.4, G, -1.25, { delay: 0.2, rotation: [0, -0.6, 0] });
  box(0.07, 3.2, 0.07, 0x3e3028, 1.4, G + 0.6, -1.25, { delay: 0.24 });
  [2.75, 2.05].forEach((y, k) => add(new CylinderGeometry(0.065, 0.065, 1.1 - k * 0.25, 10).rotateZ(Math.PI / 2), 0xd8d0bc, 1.4, G + 0.535 + y, -1.25, { delay: 0.26 + k * 0.03, rotation: [0, 0.97, 0] }));
  [
    [1.85, -0.94],
    [0.95, -1.56],
  ].forEach(([x, z], k) => limb(kit, [1.4, G + 3.7, -1.25], [x, G + 0.6, z], 0.008, 0.008, 0x1a1820, { delay: 0.3 + k * 0.02, noInk: true }));
  barrel(kit, 1.6, 0.15, G, 0.3, 0x2f4a5a);
  barrel(kit, 1.95, -0.25, G, 0.33, 0x3a2f4a);
  crate(kit, 1.3, 0.7, G, 0.36, 0.38, WOOD, 0.4);

  // Swords that did not kill him, snapped on the cobbles.
  [
    [-0.95, 1.0, 0.6],
    [0.95, 1.25, -0.9],
    [-0.3, 1.6, 1.9],
  ].forEach(([x, z, turn], k) => {
    const d = 0.5 + k * 0.04;
    // A part turned by `turn` has its own +z along (sin, cos): the blade runs that way.
    const along = (u: number): Point => [x + u * Math.sin(turn), G, z + u * Math.cos(turn)];
    box(0.045, 0.014, 0.3, STEEL, ...along(0.18), { delay: d, rotation: [0, turn, 0] });
    box(0.17, 0.035, 0.04, 0x6a7286, x, G, z, { delay: d + 0.02, rotation: [0, turn, 0] });
    box(0.035, 0.035, 0.14, LEATHER, ...along(-0.08), { delay: d + 0.03, rotation: [0, turn, 0] });
    put(new ConeGeometry(0.03, 0.2, 4).rotateX(Math.PI / 2).scale(1, 0.3, 1).rotateY(turn + 2.2), STEEL, [x + 0.35 * Math.cos(turn), G + 0.01, z - 0.35 * Math.sin(turn)], { delay: d + 0.05 });
  });

  // Legatura: hairless ridged skull, long nose, pale lit eyes, a strapped black robe.
  const f = 0.3;
  const hunter = figure(kit, {
    x: 0,
    z: 0.2,
    y: G,
    facing: f,
    height: 2.5,
    build: "broad",
    skin: 0x8a6a50,
    hair: { style: "bald", color: 0x5a4030 },
    face: { mouth: "none", brows: "none", eyes: 0xd8f4ff, glow: true, marks: 0x5a4030 },
    top: { kind: "robe", color: ROBE },
    shoes: 0x1a1a22,
    gloves: 0x2a2a30,
    belt: LEATHER,
    arms: [
      [-0.32, 1.45, 0.45],
      [0.15, 1.05, 0.52],
    ],
    delay: 0.8,
  });
  const at = hunter.at;
  const RH = hunter.headRadius;
  put(new ConeGeometry(0.06, 0.3, 6).rotateX(2.45).rotateY(f), 0x7a5a42, at(0, 2.17, RH * 0.95), { delay: 1.2 });
  decorate(hunter.headPart, new BoxGeometry(0.026, 0.022, 0.2), 0x6a5038, [
    [-0.08, RH * 2.04, -0.02],
    [0.08, RH * 2.04, -0.02],
    [0, RH * 2.12, 0.02],
  ]);
  ball(0.22, ROBE, ...at(0, 1.6, -0.2), { delay: 1.1 });
  [-1, 1].forEach((side) => put(new BoxGeometry(0.07, 0.78, 0.03).rotateZ(side * 0.55).rotateY(f), LEATHER, at(0, 1.45, 0.32), { delay: 1.15 }));
  [1.45, 1.22].forEach((y) => put(new BoxGeometry(0.08, 0.07, 0.025).rotateY(f), 0x8a7a50, at(0, y, 0.35), { delay: 1.2 }));

  // The case on his back: four hilts, and one empty slot glowing.
  const holder = box(0.64, 0.55, 0.28, WOOD, ...at(-0.32, 1.72, -0.5), { delay: 1.0, rotation: [0, f, 0] });
  decorate(holder, new BoxGeometry(0.66, 0.05, 0.3), LEATHER, [
    [0, 0.12, 0],
    [0, 0.42, 0],
  ]);
  [-0.44, -0.32, -0.2, -0.08].forEach((x, k) => {
    box(0.2, 0.035, 0.05, k % 2 ? 0x8a93a3 : STEEL, ...at(x, 2.27, -0.5), { delay: 1.3 + k * 0.03, rotation: [0, f, 0] });
    limb(kit, at(x, 2.3, -0.5), at(x, 2.55, -0.5), 0.028, 0.026, [MAGENTA, LEATHER, CYAN, 0x3a3a48][k], { delay: 1.32 + k * 0.03 });
    ball(0.042, STEEL, ...at(x, 2.55, -0.5), { delay: 1.34 + k * 0.03 });
  });
  const slot = box(0.1, 0.02, 0.2, GLOW, ...at(-0.56, 2.265, -0.5), { delay: 1.45, flat: true, noInk: true, rotation: [0, f, 0] });
  // Above the empty slot, a faint glow where the next blade will go.
  const waiting = kit.cylinder(0.07, 0.04, 0.4, GLOW, ...at(-0.56, 2.28, -0.5), { delay: 1.5, flat: true, noInk: true }, 10);
  const haze = (waiting.children[0] as Mesh).material as Material;
  haze.transparent = true;
  haze.depthWrite = false;

  // The glaive: a long shaft through both hands, the crescent blade at its foot.
  const upper = at(-0.81, 1.87, 0.38);
  const lower = at(0.566, 0.696, 0.582);
  const shaft = limb(kit, upper, lower, 0.032, 0.032, 0x2a2430, { delay: 1.25 });
  decorate(shaft, new TorusGeometry(0.035, 0.01, 6, 12).rotateX(Math.PI / 2), 0x8a7a50, [
    [0, 0.2, 0],
    [0, 1.55, 0],
  ]);
  const crescent = new Shape();
  crescent.moveTo(0, -0.045);
  crescent.lineTo(0, 0.05);
  crescent.quadraticCurveTo(0.45, 0.07, 0.82, 0.3);
  crescent.quadraticCurveTo(0.5, -0.15, 0, -0.045);
  const blade = put(
    new ExtrudeGeometry(crescent, { depth: 0.03, bevelEnabled: false, curveSegments: 14 }).translate(0, 0, -0.015).rotateZ(-0.705).rotateY(f),
    GLOW,
    lower,
    { delay: 1.4, flat: true },
  );
  motes(10, 0xd8a0ff, 0.025, [lower[0], G + 0.2, lower[2] - 0.2], [lower[0] + 0.8, G + 1.2, lower[2] + 0.2], 1.6);

  const from = new Color(GLOW);
  const to = new Color(0xff7ae6);
  tick((t) => {
    const k = (Math.sin(t * 2.2) + 1) / 2;
    colorOf(blade).lerpColors(from, to, k);
    colorOf(slot).lerpColors(from, new Color(0x2a1040), (Math.sin(t * 3) + 1) / 4);
    haze.opacity = 0.45 + Math.sin(t * 3) * 0.2;
    lantern.visible = Math.floor(t * 5) % 19 !== 7;
  });

  return { width: 4.9, height: 4.4, lookY: 1.55 };
}
