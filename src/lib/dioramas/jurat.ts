import { BoxGeometry, Euler, ExtrudeGeometry, Group, Shape, TorusGeometry, Vector3 } from "three";
import { CYAN, INK, MAGENTA, octagonBase, type Framing, type Kit } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { bollard, crate, towerCrane } from "@/lib/diorama-props";

/**
 * Jurat (P151): the marine claims inspector of the Banco stands on the quay in his turned-up
 * grey coat, a steel case in each hand, looking straight past the weeping shipowner on his crate.
 * Behind them the ship lies half sunk and listing, bubbles rising round it, a crane over it; from
 * its mast swings a stamped inventory tag: not sunk, discontinued.
 */
export function jurat(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick, motes } = kit;
  const WATER = 0x0e3a4e;
  const FOAM = 0xcfeef7;
  const STONE = 0x4a4f62;
  const STEEL = 0x9aa3b0;
  const F = octagonBase(kit, WATER);

  // The quay: the front of the octagon raised in stone with a pier on the left, kerbs, bollards.
  const quay = new Shape();
  [
    [-0.9, 2.18],
    [0.9, 2.18],
    [2.18, 0.9],
    [2.18, 0.5],
    [-0.75, 0.5],
    [-0.75, -1.6],
    [-1.48, -1.6],
    [-2.18, -0.9],
    [-2.18, 0.9],
  ].forEach(([x, z], i) => (i ? quay.lineTo(x, -z) : quay.moveTo(x, -z)));
  quay.closePath();
  const deck = add(new ExtrudeGeometry(quay, { depth: 0.3, bevelEnabled: false }).rotateX(-Math.PI / 2), STONE, 0, F, 0, { delay: 0.06, ink: 1.01 });
  [1.0, 1.5, 1.95].forEach((z) => decorate(deck, new BoxGeometry(2 * Math.min(2.14, 3.04 - z), 0.004, 0.014), 0x353a4c, [[0, 0.302, z]]));
  decorate(deck, new BoxGeometry(0.014, 0.004, 2.1), 0x353a4c, [[-1.4, 0.302, -0.55]]);
  const G = F + 0.3;
  box(2.93, 0.06, 0.16, 0x5d6680, 0.715, G, 0.58, { delay: 0.1 });
  box(0.16, 0.06, 2.1, 0x5d6680, -0.67, G, -0.55, { delay: 0.1 });
  bollard(kit, 0.75, 0.8, G, 0.15);
  bollard(kit, 1.75, 0.8, G, 0.17);

  // The wreck, listing towards us, bow up, stern under water.
  const WX = 0.8;
  const WZ = -0.85;
  const wreck = new Group();
  wreck.position.set(WX, F, WZ);
  const hullShape = new Shape();
  hullShape.moveTo(-1.0, -0.32);
  hullShape.lineTo(0.55, -0.32);
  hullShape.quadraticCurveTo(0.88, -0.22, 1.0, 0);
  hullShape.quadraticCurveTo(0.88, 0.22, 0.55, 0.32);
  hullShape.lineTo(-1.0, 0.32);
  hullShape.closePath();
  const ship = [
    add(new ExtrudeGeometry(hullShape, { depth: 0.7, bevelEnabled: false }).rotateX(-Math.PI / 2), 0x5a2a3a, 0, -0.2, 0, { delay: 0.3 }),
    box(0.5, 0.42, 0.46, 0xb8b4aa, -0.45, 0.45, 0, { delay: 0.36 }),
    cylinder(0.11, 0.12, 0.5, 0x2a2a34, -0.05, 0.45, 0, { delay: 0.4 }, 12),
    cylinder(0.122, 0.122, 0.09, CYAN, -0.05, 0.8, 0, { delay: 0.42, flat: true, noInk: true }, 12),
    cylinder(0.035, 0.04, 1.6, 0x8a93a3, 0.4, 0.45, 0, { delay: 0.45 }, 6),
    box(0.6, 0.035, 0.035, 0x8a93a3, 0.4, 1.7, 0, { delay: 0.48, noInk: true }),
  ];
  decorate(ship[0], new BoxGeometry(1.6, 0.07, 0.65), MAGENTA, [[-0.15, 0.48, 0]]);
  decorate(ship[1], new BoxGeometry(0.1, 0.08, 0.01), CYAN, [
    [-0.12, 0.28, 0.232],
    [0.12, 0.28, 0.232],
  ]);
  ship[0].parent?.add(wreck);
  ship.forEach((part) => wreck.add(part));
  const tilt = new Euler(0.3, 0.35, 0.5, "YXZ");
  wreck.rotation.copy(tilt);
  // The tag hanging from the crossbar's end, in world space under the tilted mast.
  const end = new Vector3(0.68, 1.72, 0).applyEuler(tilt).add(wreck.position);
  const tagPivot = new Group();
  tagPivot.position.copy(end);
  wreck.parent?.add(tagPivot);
  const string = box(0.008, 0.22, 0.008, INK, end.x, end.y - 0.22, end.z, { delay: 1.0, noInk: true });
  const tag = box(0.3, 0.4, 0.014, 0xe8e2d0, end.x, end.y - 0.62, end.z, { delay: 1.05, rotation: [0, 0.35, 0] });
  decorate(tag, new TorusGeometry(0.03, 0.009, 6, 12), INK, [[0, 0.35, 0.009]]);
  decorate(tag, new BoxGeometry(0.18, 0.18, 0.004), MAGENTA, [[0.01, 0.15, 0.009, 0.25]]);
  decorate(tag, new BoxGeometry(0.13, 0.13, 0.005), 0xe8e2d0, [[0.01, 0.15, 0.01, 0.25]]);
  [string, tag].forEach((part) => {
    part.position.sub(end);
    tagPivot.add(part);
  });
  const ripples = [0, 1, 2].map((k) =>
    add(new TorusGeometry(0.6 + k * 0.22, 0.016, 6, 36).rotateX(Math.PI / 2), FOAM, WX, F + 0.002, WZ, { delay: 0.6, flat: true, noInk: true }),
  );
  motes(12, FOAM, 0.03, [WX - 0.6, F, WZ - 0.4], [WX + 0.6, F + 0.9, WZ + 0.4], 0.8);
  const crane = towerCrane(kit, -1.45, -1.0, G, 0.5, 3.1, 2.0);

  // The shipowner on his crate, head in his hands.
  crate(kit, -1.05, 0.9, G, 0.7, 0.5, 0x5e4a3a, 0.5);
  figure(kit, {
    x: -1.05,
    z: 0.9,
    y: G,
    facing: 0.95,
    height: 2.2,
    build: "heavy",
    skin: 0xc89070,
    hair: { style: "short", color: 0x9a9aa0 },
    face: { mouth: "frown", brows: "worried", beard: "full", beardColor: 0xb0b0b6 },
    headwear: { kind: "cap", color: 0x1e2a44, accent: 0x1a1a22 },
    top: { kind: "coat", color: 0x23304a, accent: 0x2f5866 },
    bottom: { kind: "trousers", color: 0x2a2f3a },
    arms: ["chin", "chin"],
    legs: "sit",
    delay: 0.9,
  });

  // Jurat: grey coat, collar up, a steel case in each hand.
  const facing = 0.3;
  const inspector = figure(kit, {
    x: 0.2,
    z: 1.05,
    y: G,
    facing,
    height: 2.5,
    skin: 0xd8a888,
    hair: { style: "curly", color: 0x2a2020 },
    face: { mouth: "neutral", brows: "calm", beard: "stubble", beardColor: 0x2a2020 },
    top: { kind: "coat", color: 0x3a4458, accent: 0x2a3040 },
    bottom: { kind: "trousers", color: 0x262a36 },
    shoes: 0x1a1a1e,
    scarf: 0x3a4458,
    arms: [[-0.62, 0.95, 0.12], [0.62, 0.95, 0.12]],
    delay: 1.1,
  });
  inspector.hands.forEach((hand, i) => {
    const flight = box(0.46, 0.4, 0.18, STEEL, ...inspector.at((i ? 1 : -1) * 0.66, 0.47, 0.12), { delay: 1.6 + i * 0.04, rotation: [0, facing, 0] });
    decorate(flight, new BoxGeometry(0.51, 0.025, 0.19), 0x6a7280, [
      [0, 0.06, 0],
      [0, 0.34, 0],
    ]);
    decorate(flight, new BoxGeometry(0.05, 0.05, 0.01), 0x4a4f5c, [
      [-0.15, 0.3, 0.092],
      [0.15, 0.3, 0.092],
    ]);
    box(0.14, 0.04, 0.03, 0x2a2a30, hand[0], hand[1] - 0.1, hand[2], { delay: 1.62, rotation: [0, facing, 0] });
  });

  tick((t) => {
    wreck.rotation.set(tilt.x + Math.sin(t * 0.8) * 0.02, tilt.y, tilt.z + Math.sin(t * 0.6) * 0.015);
    tagPivot.rotation.z = Math.sin(t * 1.6) * 0.18;
    ripples.forEach((ripple, k) => {
      const u = (t * 0.3 + k / 3) % 1;
      ripple.children[0].scale.set(0.6 + u * 0.7, 1, 0.6 + u * 0.7);
      ripple.visible = u < 0.85;
    });
    crane.visible = Math.floor(t * 2) % 3 !== 2;
  });

  return { width: 4.9, height: 4.5, lookY: 1.6 };
}
