import { BoxGeometry, CylinderGeometry, SphereGeometry, TorusGeometry, type Mesh } from "three";
import { CYAN, INK, MAGENTA, YELLOW, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Recusant (P153): the recovery agent waits at the dead end of a disused metro siding, in front of
 * the tiled wall where he keeps his secret archive: a filing cabinet with a drawer pulled out and
 * a pile of tied reports gathering dust that nobody ever asked for. The tape recorder on his back
 * turns its reels and its aerial blinks, an old space helmet hangs from his hand, the red signal
 * blinks over the buffer stop; no power at all, only what he wrote down.
 */
export function recusant(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick, motes } = kit;
  const TILE = 0x7d8a86;
  const JOINT = 0x56625e;
  const BAND = 0x2f6f60;
  const STEEL = 0x4a4f5c;
  const OLIVE = 0x4f5a40;
  const STRAP = 0x3f5a38;
  const PAPER = 0xd8cfb0;
  const F = octagonBase(kit, 0x1d1b24);
  const G = floor(kit, F, 0.06, 0x2e3238, 0x22252a, 0.4);

  // The tiled corner of the old station: a back wall and a side wall, a green band along both.
  const tiles = (wall: ReturnType<typeof box>, width: number, height: number, face: number, alongX: boolean) => {
    const spots: Point[] = [];
    for (let y = 0.25; y < height; y += 0.25) spots.push(alongX ? [0, y, face] : [face, y, 0]);
    decorate(wall, alongX ? new BoxGeometry(width, 0.012, 0.01) : new BoxGeometry(0.01, 0.012, width), JOINT, spots);
    const columns: Point[] = [];
    for (let k = -width / 2 + 0.25; k < width / 2; k += 0.25) columns.push(alongX ? [k, height / 2, face] : [face, height / 2, k]);
    decorate(wall, alongX ? new BoxGeometry(0.012, height, 0.01) : new BoxGeometry(0.01, height, 0.012), JOINT, columns);
    decorate(wall, alongX ? new BoxGeometry(width, 0.16, 0.012) : new BoxGeometry(0.012, 0.16, width), BAND, [alongX ? [0, 1.05, face] : [face, 1.05, 0]]);
  };
  const back = box(2.6, 2.6, 0.2, TILE, -0.3, G, -1.5, { delay: 0.1, ink: 1.02 });
  tiles(back, 2.6, 2.6, 0.105, true);
  const side = box(0.2, 2.6, 1.7, TILE, -1.75, G, -0.55, { delay: 0.14, ink: 1.02 });
  tiles(side, 1.7, 2.6, 0.105, false);
  cylinder(0.05, 0.05, 2.6, STEEL, 1.0, G + 2.3, -1.36, { delay: 0.2, rotation: [0, 0, Math.PI / 2], noInk: true }, 8);

  // The track of the siding and its buffer stop, the red signal over it.
  [0.95, 1.45].forEach((x) => box(0.06, 0.08, 2.7, STEEL, x, G, 0.25, { delay: 0.2, noInk: true }));
  for (let k = 0; k < 8; k++) box(0.85, 0.04, 0.12, 0x3e3028, 1.2, G, -0.95 + k * 0.35, { delay: 0.18 + k * 0.02, noInk: true });
  [0.95, 1.45].forEach((x) => box(0.1, 0.6, 0.1, STEEL, x, G, -1.17, { delay: 0.3 }));
  const beam = box(0.85, 0.2, 0.14, YELLOW, 1.2, G + 0.5, -1.12, { delay: 0.34 });
  decorate(beam, new BoxGeometry(0.09, 0.24, 0.01), INK, [-0.27, 0, 0.27].map((x) => [x, 0.1, 0.071, 0.7] as [number, number, number, number]));
  [0.95, 1.45].forEach((x) => add(new CylinderGeometry(0.07, 0.07, 0.12, 12).rotateX(Math.PI / 2), INK, x, G + 0.2, -1.04, { delay: 0.38 }));
  cylinder(0.035, 0.035, 1.95, STEEL, 1.9, G, -0.45, { delay: 0.4 }, 8);
  const head = box(0.18, 0.42, 0.14, 0x1d1b24, 1.9, G + 1.75, -0.45, { delay: 0.44 });
  decorate(head, new CylinderGeometry(0.055, 0.055, 0.02, 12).rotateX(Math.PI / 2), 0x203a2a, [[0, 0.11, 0.075]]);
  const signal = add(new CylinderGeometry(0.06, 0.06, 0.03, 12).rotateX(Math.PI / 2), MAGENTA, 1.9, G + 2.02, -0.37, { delay: 0.48, flat: true });

  // The archive: a filing cabinet with a drawer out, and the reports nobody asked for, tied and dusty.
  const cabinet = box(0.62, 1.4, 0.55, 0x4a5a54, -1.3, G, -1.08, { delay: 0.5 });
  decorate(cabinet, new BoxGeometry(0.54, 0.012, 0.01), INK, [0.35, 0.7, 1.05].map((y) => [0, y, 0.276] as Point));
  decorate(cabinet, new BoxGeometry(0.14, 0.035, 0.02), 0xb0b4ba, [0.22, 0.57, 1.25].map((y) => [0, y, 0.28] as Point));
  const drawer = box(0.52, 0.3, 0.42, 0x56685f, -1.3, G + 0.74, -0.66, { delay: 0.6 });
  decorate(drawer, new BoxGeometry(0.14, 0.035, 0.02), 0xb0b4ba, [[0, 0.17, 0.215]]);
  decorate(
    drawer,
    new BoxGeometry(0.44, 0.14, 0.012),
    PAPER,
    [-0.12, -0.04, 0.04, 0.12].map((z, i) => [0, 0.34 + (i % 2) * 0.03, z, (i - 1.5) * 0.06] as [number, number, number, number]),
  );
  [
    [0.5, 0.16, 0x8a6a3a, 0.1],
    [0.46, 0.14, PAPER, -0.12],
    [0.48, 0.15, 0x6a7a8a, 0.2],
    [0.42, 0.13, 0x8a6a3a, -0.05],
  ].forEach(([w, h, color, turn], i, list) => {
    const y = list.slice(0, i).reduce((sum, item) => sum + item[1], 0);
    const pile = box(w, h, w * 0.75, color, -0.85, G + y, -0.3, { delay: 0.65 + i * 0.04, rotation: [0, turn, 0] });
    decorate(pile, new BoxGeometry(0.015, h + 0.004, w * 0.75 + 0.004), 0xc9a46a, [[0, h / 2, 0]]);
  });
  box(0.38, 0.012, 0.3, 0x9a9890, -0.85, G + 0.58, -0.3, { delay: 0.85, rotation: [0, -0.05, 0], noInk: true });
  motes(6, 0x9a9890, 0.018, [-1.05, G + 0.6, -0.5], [-0.65, G + 1.3, -0.1], 1.2);

  // Recusant in his grey flight suit, one hand on the recorder's strap, the helmet in the other.
  const theta = 0.3;
  const agent = figure(kit, {
    x: 0.05,
    z: 0.5,
    y: G,
    facing: theta,
    height: 2.45,
    skin: 0xd0a080,
    hair: { style: "short", color: 0x9a9a96 },
    face: { mouth: "frown", brows: "calm", beard: "stubble", beardColor: 0xb0b0aa },
    top: { kind: "jacket", color: 0x7a7f86, accent: 0x5a5f66 },
    bottom: { kind: "trousers", color: 0x747980 },
    belt: STRAP,
    shoes: 0x2a2622,
    arms: [[-0.17, 1.6, 0.32], "down"],
    delay: 0.9,
  });
  const at = agent.at;
  const turn: Point = [0, theta, 0];
  limb(kit, at(-0.3, 1.78, 0.18), at(0.22, 1.1, 0.25), 0.03, 0.03, STRAP, { delay: 1.3 });
  limb(kit, at(0.3, 1.78, 0.18), at(-0.22, 1.1, 0.25), 0.03, 0.03, STRAP, { delay: 1.32 });
  // The reel-to-reel recorder on his back, its aerial up.
  const deck = box(0.44, 0.44, 0.26, OLIVE, ...at(-0.42, 1.78, -0.24), { delay: 1.2, rotation: turn });
  decorate(deck, new BoxGeometry(0.4, 0.03, 0.01), 0x3a4230, [[0, 0.05, 0.131]]);
  const reels = [-0.53, -0.31].map((x, i) => {
    const reel = add(new CylinderGeometry(0.085, 0.085, 0.03, 16).rotateX(Math.PI / 2), 0xe0dccf, ...at(x, 1.93, -0.095), { delay: 1.3 + i * 0.03, rotation: turn });
    decorate(reel, new CylinderGeometry(0.03, 0.03, 0.035, 10).rotateX(Math.PI / 2), INK, [[0, 0.085, 0]]);
    decorate(reel, new BoxGeometry(0.15, 0.022, 0.01), 0x6a6a70, [
      [0, 0.085, 0.017],
      [0, 0.085, 0.017, Math.PI / 2],
    ]);
    return reel.children.slice(-2) as Mesh[];
  });
  limb(kit, at(-0.6, 2.2, -0.22), at(-0.78, 2.9, -0.28), 0.012, 0.01, STEEL, { delay: 1.4, noInk: true });
  const tip = add(new SphereGeometry(0.04, 10, 8), YELLOW, ...at(-0.78, 2.88, -0.28), { delay: 1.45, flat: true });
  // The old space helmet, white with a dark visor, hanging from his left hand.
  const [, hand] = agent.hands;
  const helmet = add(new SphereGeometry(0.22, 18, 14), 0xe8e4da, hand[0] + 0.03, hand[1] - 0.52, hand[2] + 0.06, { delay: 1.5, rotation: [0.15, theta, 0] });
  decorate(helmet, new SphereGeometry(0.17, 16, 12).scale(1, 0.78, 0.5), 0x1a2433, [[0, 0.23, 0.14]]);
  decorate(helmet, new BoxGeometry(0.06, 0.03, 0.01), CYAN, [[-0.06, 0.29, 0.225, 0.4]]);
  decorate(helmet, new TorusGeometry(0.17, 0.035, 6, 20).rotateX(Math.PI / 2), 0x9aa0ab, [[0, 0.03, 0]]);
  decorate(helmet, new CylinderGeometry(0.04, 0.04, 0.05, 10).rotateZ(Math.PI / 2), 0x9aa0ab, [[0.22, 0.22, 0]]);
  limb(kit, [hand[0], hand[1] - 0.05, hand[2]], [hand[0] + 0.03, hand[1] - 0.1, hand[2] + 0.06], 0.012, 0.012, STRAP, { delay: 1.52, noInk: true });

  tick((t) => {
    // The reels turn, the aerial calls out, the signal blinks red.
    reels.forEach((spokes, i) => spokes.forEach((mesh, k) => (mesh.rotation.z = (k * Math.PI) / 2 - t * (i ? 2.2 : 1.6))));
    tip.visible = Math.floor(t * 2) % 3 !== 2;
    signal.visible = Math.floor(t * 1.5) % 2 === 0;
  });

  return { width: 4.9, height: 4.4, lookY: 1.45 };
}
