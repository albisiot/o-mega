import { BoxGeometry, Color, CylinderGeometry, DodecahedronGeometry, TorusGeometry } from "three";
import { YELLOW, cable, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { bin, crate, floor, rubble } from "@/lib/diorama-props";

/**
 * Strata (P188): at the end of the metro dig, in front of a cut wall striped with the layers of
 * the earth (an ammonite and potsherds in them), the old archaeologist kneels in his muddy
 * jacket and miner's helmet, a coil of rope on his back, and licks a stone to tell its age; one
 * layer of the wall lights up as he reads it. His samples lie in a row on a plank, the water he
 * keeps asking for stands out of reach on a crate, and his price shows in the helmet: one of its
 * three lamps keeps dying, the battery nearly flat.
 */
export function strata(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const MUD = 0x6a4a2a;
  const F = octagonBase(kit, 0x1c1814);
  const G = floor(kit, F, 0.06, 0x3a3026, 0x2e261e, 0);

  // The cut wall: layers of clay, ochre, ash and stone, with what they hold.
  const wall = box(3.1, 2.9, 0.3, 0x3a3440, 0, G, -1.55, { delay: 0.08, ink: 1.02 });
  const layers = [0x4a3a30, 0x8a6a4a, 0x5a5468, 0x7a3a50, 0x6a5a40, 0x46405a, 0x5a4434];
  const bands = layers.map((color, k) =>
    decorate(wall, new BoxGeometry(3.1, 0.36, 0.01), color, [[0, 0.2 + k * 0.4, 0.151, (k % 2 ? 1 : -1) * 0.02]]),
  );
  decorate(wall, new TorusGeometry(0.1, 0.03, 6, 16), 0xe8dcc0, [[-0.85, 1.4, 0.16]]);
  decorate(wall, new TorusGeometry(0.05, 0.02, 6, 12), 0xe8dcc0, [[-0.85, 1.4, 0.165]]);
  decorate(wall, new BoxGeometry(0.12, 0.06, 0.01), 0xc06a3a, [
    [0.6, 0.62, 0.16, 0.4],
    [0.75, 0.6, 0.16, -0.3],
    [-0.3, 2.2, 0.16, 0.2],
  ]);
  decorate(wall, new BoxGeometry(0.2, 0.03, 0.01), 0xe8dcc0, [[1.1, 1.85, 0.16, 0.3]]);
  // Work lights strung along the top of the cut.
  cable(kit, [[-1.5, G + 2.75, -1.36], [-0.5, G + 2.55, -1.36], [0.5, G + 2.6, -1.36], [1.5, G + 2.78, -1.36]], 0.015, 0x14121c, 0.2);
  [-1.0, 0, 1.0].forEach((x, i) => ball(0.06, YELLOW, x, G + 2.48, -1.34, { delay: 0.25 + i * 0.03, flat: true }));
  rubble(kit, -1.55, -0.85, G, 0.2, 6, 0.4, 0x5a4434);

  // The work lamp on its tripod, aimed at him.
  [-0.5, 0.5, 2.6].forEach((a, i) => box(0.03, 1.5, 0.03, 0x23222b, 1.55 + Math.sin(a) * 0.18, G, -0.45 + Math.cos(a) * 0.18, { delay: 0.3 + i * 0.02, noInk: true, rotation: [Math.cos(a) * 0.12, 0, -Math.sin(a) * 0.12] }));
  const head = box(0.3, 0.24, 0.16, 0x23222b, 1.55, G + 1.45, -0.45, { delay: 0.36, rotation: [0.2, -0.75, 0] });
  decorate(head, new BoxGeometry(0.24, 0.18, 0.01), YELLOW, [[0, 0.12, 0.081]]);
  motes(10, 0xe8dcc0, 0.018, [0.2, G + 0.4, -0.6], [1.3, G + 1.6, 0.4], 0.5);

  // His samples in a row on a plank, the bucket, and the water on a crate out of reach.
  const plank = box(1.0, 0.05, 0.26, 0x5e4a3a, -1.05, G, 1.15, { delay: 0.4, rotation: [0, 0.35, 0] });
  layers.slice(1, 6).forEach((color, k) => {
    add(new DodecahedronGeometry(0.06), color, -1.45 + k * 0.19, G + 0.05, 1.3 - k * 0.07, { delay: 0.44 + k * 0.02, rotation: [k, k * 2, 0] });
  });
  decorate(plank, new BoxGeometry(0.07, 0.01, 0.05), 0xf0ece0, [-0.38, -0.19, 0, 0.19, 0.38].map((x) => [x, 0.055, 0.09] as Point));
  bin(kit, -1.55, 0.35, G, 0.48, 0x7a3a50);
  crate(kit, 1.35, 0.9, G, 0.5, 0.45, 0x5e4a3a, 0.3);
  cylinder(0.08, 0.08, 0.32, 0x3fa8c8, 1.35, G + 0.45, 0.9, { delay: 0.6 }, 12);
  cylinder(0.04, 0.04, 0.06, 0xf0ece0, 1.35, G + 0.77, 0.9, { delay: 0.62 }, 8);

  // Strata, kneeling, the stone at his tongue, the rope coiled on his back.
  const man = figure(kit, {
    x: -0.05,
    z: 0.2,
    y: G,
    facing: 0.3,
    height: 2.4,
    skin: 0xc08a68,
    hair: { style: "short", color: 0x5a5048 },
    face: { mouth: "open", brows: "raised", beard: "stubble", beardColor: 0x6a6258 },
    headwear: { kind: "hardhat", color: 0x8a7a5a, accent: 0x6a5a40 },
    top: { kind: "jacket", color: MUD, accent: 0x5a3e24 },
    bottom: { kind: "trousers", color: 0x4a3a2a },
    shoes: 0x3a2c22,
    belt: 0x2a2018,
    arms: [
      [-0.12, 1.58, 0.36],
      [0.2, 0.66, 0.46],
    ],
    legs: "kneel",
    delay: 0.8,
  });
  const tongue = add(new BoxGeometry(0.075, 0.09, 0.03), 0xe0707a, ...man.at(0, 1.62, 0.215), { delay: 1.4, rotation: [0.3, 0.3, 0] });
  const [hand] = man.hands;
  add(new DodecahedronGeometry(0.085).scale(1.3, 1, 0.7), 0xc8a070, hand[0] + 0.03, hand[1] + 0.02, hand[2] + 0.05, { delay: 1.45, rotation: [0.4, 0.3, 0.6] });
  // Pockets on the jacket and a rope coil on his back.
  [-1, 1].forEach((side) => box(0.13, 0.12, 0.04, 0x5a3e24, ...man.at(side * 0.17, 1.08, 0.24), { delay: 1.3, rotation: [0, 0.3, 0] }));
  [0, 1].forEach((k) =>
    add(new TorusGeometry(0.28, 0.065, 8, 20), 0x8a7a60, ...man.at(0.02 * k, 0.85 + k * 0.08, -0.34 - k * 0.06), { delay: 1.35 + k * 0.03, rotation: [0, 0.3, 0] }),
  );
  // Three lamps on the helmet; the left one is dying.
  const brow = man.head[1] - G + man.headRadius * 0.78;
  const lamps = [-0.1, 0, 0.1].map((dx, i) => {
    const at = man.at(dx, brow - (i === 1 ? 0 : 0.04), man.headRadius * 1.08);
    add(new CylinderGeometry(0.05, 0.05, 0.06, 10).rotateX(Math.PI / 2), 0x3a3440, at[0], at[1] - 0.05, at[2] - 0.02, { delay: 1.5 + i * 0.02, rotation: [0, 0.3, 0] });
    return add(new CylinderGeometry(0.042, 0.042, 0.02, 12).rotateX(Math.PI / 2), YELLOW, at[0], at[1] - 0.042, at[2] + 0.02, { delay: 1.55 + i * 0.02, flat: true, noInk: true, rotation: [0, 0.3, 0] });
  });

  const lit = new Color(0xb08d5a);
  tick((t) => {
    // He licks, lets the stone go, licks again; a layer glows while he reads it; a lamp gutters.
    tongue.visible = Math.sin(t * 1.6) > -0.6;
    const k = Math.floor(t / 2.5) % layers.length;
    bands.forEach((band, i) => band.color.set(layers[i]).lerp(lit, i === (k + 3) % layers.length ? 0.5 + Math.sin(t * 2.5) * 0.2 : 0));
    lamps[0].visible = !(Math.floor(t * 8) % 11 === 5 || Math.floor(t * 8) % 11 === 7);
  });

  return { width: 4.9, height: 4.4, lookY: 1.45 };
}
