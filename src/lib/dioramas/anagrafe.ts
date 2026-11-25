import { BoxGeometry, ConeGeometry, Group } from "three";
import { CYAN, INK, archedWall, cable, octagonBase, zigzag, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Anagrafe (P267): the Sovereign's collector of names in the customs hall of the port. Through
 * the great arch the cranes stand against a sky split by the rift, and the new arrivals queue
 * with their luggage; he writes them into his ledger with a quill, his long teal coat stuffed
 * with scrolls. The iron case of the registry is chained to his belt and too heavy for him to
 * lift: it sits on the floor, with the scrape marks of being dragged behind it.
 */
export function anagrafe(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const COAT = 0x1f4a52;
  const SCROLL = 0xe8dcc0;
  const STEEL = 0x8a93a3;
  const BRASS = 0xc8a040;
  const F = octagonBase(kit, 0x1c1e2c);
  const G = floor(kit, F, 0.06, 0x2a2e40, 0x1c1f2e, 0.45);

  // The hall's back wall with its great arch, and the port beyond: sky, cranes, the rift.
  const AX = -0.5;
  const wall = add(archedWall(3.2, 3.0, 0.3, { x: AX, half: 0.7, spring: 1.85 }), 0x2e2a48, 0, G, -1.35, { delay: 0.1, ink: 1.02 });
  decorate(wall, new BoxGeometry(0.06, 3.0, 0.01), 0x3a3658, [
    [AX - 0.95, 1.5, 0.155],
    [AX + 0.95, 1.5, 0.155],
  ]);
  box(1.5, 1.3, 0.04, 0x7a2a6a, AX, G, -1.75, { delay: 0.14, flat: true, noInk: true });
  box(1.5, 1.3, 0.04, 0x1a3a5a, AX, G + 1.3, -1.75, { delay: 0.16, flat: true, noInk: true });
  const SILHOUETTE = 0x15121e;
  [
    [AX - 0.45, 2.1, 0.55],
    [AX + 0.5, 1.7, -0.5],
  ].forEach(([x, h, arm], i) => {
    box(0.08, h, 0.03, SILHOUETTE, x, G, -1.71, { delay: 0.2 + i * 0.04, flat: true, noInk: true });
    box(Math.abs(arm) + 0.2, 0.06, 0.03, SILHOUETTE, x + arm / 2, G + h - 0.1, -1.71, { delay: 0.22 + i * 0.04, flat: true, noInk: true });
    box(0.01, 0.4, 0.02, SILHOUETTE, x + arm * 0.9, G + h - 0.5, -1.71, { delay: 0.24 + i * 0.04, flat: true, noInk: true });
  });
  box(1.1, 0.25, 0.03, SILHOUETTE, AX, G, -1.7, { delay: 0.26, flat: true, noInk: true });
  const crack: Point[] = [
    [AX - 0.12, G + 2.55, -1.72],
    [AX + 0.06, G + 2.35, -1.72],
    [AX - 0.06, G + 2.18, -1.72],
    [AX + 0.14, G + 1.98, -1.72],
    [AX + 0.02, G + 1.8, -1.72],
  ];
  const rift = zigzag(kit, crack, 0.045, 0xe8fbff, 0.3);
  const halo = zigzag(
    kit,
    crack.map(([x, y]) => [x, y, -1.735] as Point),
    0.12,
    CYAN,
    0.3,
  );
  // A candle on a bracket by the arch.
  box(0.05, 0.05, 0.2, 0x23222b, -1.5, G + 1.05, -1.1, { delay: 0.3 });
  cylinder(0.04, 0.04, 0.18, SCROLL, -1.5, G + 1.1, -1.0, { delay: 0.32 }, 8);
  const candle = add(new ConeGeometry(0.04, 0.12, 6), 0xffd060, -1.5, G + 1.29, -1.0, { delay: 0.34, flat: true, noInk: true });

  // Anagrafe, writing in the ledger, his coat full of scrolls.
  const FACE = 0.3;
  const clerk = figure(kit, {
    x: -0.6,
    z: 0.35,
    y: G,
    facing: FACE,
    height: 2.45,
    build: "slim",
    skin: 0xe0c0a8,
    hair: { style: "short", color: 0xd8c890 },
    face: { mouth: "neutral", brows: "calm", glasses: "round", glassesColor: 0x8a93a3 },
    top: { kind: "coat", color: COAT, accent: 0x163a40 },
    bottom: { kind: "trousers", color: 0x1a2a30 },
    shoes: 0x1a1a20,
    belt: 0x2a2226,
    arms: [
      [-0.04, 1.42, 0.46],
      [0.14, 1.3, 0.42],
    ],
    delay: 0.8,
  });
  const o = (delay: number, tilt = 0): { delay: number; rotation: [number, number, number] } => ({ delay, rotation: [tilt, FACE, 0] });
  const tilted = (part: Group, tilt: number) => {
    part.rotation.order = "YXZ";
    part.rotation.set(tilt, FACE, 0);
    return part;
  };
  // Pockets stuffed with scrolls, brass buttons.
  [
    [-0.15, 1.18, 0.2],
    [0.17, 0.62, 0.27],
  ].forEach(([lx, ly, lz], i) => {
    box(0.2, 0.18, 0.04, 0x183a40, ...clerk.at(lx, ly, lz), o(1.3 + i * 0.04));
    [-0.06, 0, 0.06].forEach((dx, k) => cylinder(0.022, 0.022, 0.12, SCROLL, ...clerk.at(lx + dx, ly + 0.1 + (k % 2) * 0.03, lz - 0.005), o(1.34 + i * 0.04 + k * 0.01), 8));
  });
  [1.55, 1.35, 0.95].forEach((ly, i) => ball(0.022, BRASS, ...clerk.at(0.1, ly, 0.23 - (1.55 - ly) * 0.05), { delay: 1.3 + i * 0.02 }));
  // The ledger, open on his left hand; the quill in his right.
  const [writing, holding] = clerk.hands;
  const book = tilted(box(0.4, 0.04, 0.3, 0x5a2a1e, holding[0] - 0.06, holding[1] + 0.02, holding[2] + 0.02, { delay: 1.4 }), -0.25);
  decorate(book, new BoxGeometry(0.36, 0.03, 0.27), 0xe8e2d0, [[0, 0.04, 0]]);
  decorate(book, new BoxGeometry(0.12, 0.012, 0.012), 0x4a5a7a, [
    [-0.1, 0.057, -0.08],
    [-0.1, 0.057, -0.02],
    [0.1, 0.057, -0.06],
    [0.1, 0.057, 0.0],
  ]);
  const quill = add(new ConeGeometry(0.035, 0.42, 4).scale(1, 1, 0.3), 0xf4f0e6, ...writing, o(1.45, -0.5));
  decorate(quill, new BoxGeometry(0.012, 0.06, 0.012), INK, [[0, 0.02, 0]]);
  // The registry's iron case, chained to his belt, sitting on the floor: he can't lift it.
  const caseAt = clerk.at(0.62, 0, 0.38);
  const chest = box(0.42, 0.3, 0.26, 0x3a3a46, ...caseAt, o(1.2));
  decorate(chest, new BoxGeometry(0.05, 0.3, 0.01), BRASS, [
    [-0.18, 0.15, 0.132],
    [0.18, 0.15, 0.132],
  ]);
  decorate(chest, new BoxGeometry(0.08, 0.06, 0.01), BRASS, [[0, 0.2, 0.133]]);
  cable(kit, [clerk.at(0.2, 1.0, 0.2), clerk.at(0.42, 0.55, 0.32), clerk.at(0.6, 0.3, 0.38)], 0.014, STEEL, 1.5);
  [-0.12, 0.12].forEach((dx, i) => {
    const from = clerk.at(0.62 + dx, 0, 0.2);
    box(0.02, 0.006, 0.8, 0x14161f, from[0] - 0.4 * Math.sin(FACE), G, from[2] - 0.4 * Math.cos(FACE), { delay: 1.1 + i * 0.02, flat: true, noInk: true, rotation: [0, FACE, 0] });
  });

  // The arrivals waiting their turn, luggage in hand.
  const newcomer = (x: number, z: number, facing: number, delay: number, cloak: number, hood: boolean) => {
    const person = figure(kit, {
      x,
      z,
      y: G,
      facing,
      height: 2.25,
      skin: hood ? 0xc8946a : 0xd8b098,
      hair: { style: hood ? "long" : "short", color: 0x2a1e1c },
      face: { mouth: "frown", brows: "worried", beard: hood ? undefined : "stubble" },
      headwear: hood ? { kind: "hood", color: cloak } : { kind: "hat", color: 0x23222b, accent: 0x3a3658 },
      top: { kind: hood ? "robe" : "coat", color: cloak },
      bottom: { kind: "trousers", color: 0x23222b },
      arms: ["down", hood ? "down" : "crossed"],
      delay,
    });
    const [hand] = person.hands;
    box(0.4, 0.3, 0.14, 0x6a4a32, hand[0], hand[1] - 0.32, hand[2], { delay: delay + 0.5, rotation: [0, facing, 0] });
  };
  newcomer(0.8, -0.85, -0.3, 1.0, 0x5a2a5a, true);
  newcomer(1.5, 0.15, -0.35, 1.1, 0x2a3a5a, false);

  const quillRest = quill.rotation.z;
  tick((t) => {
    quill.rotation.z = quillRest + Math.sin(t * 9) * 0.08 * (Math.sin(t * 0.9) > -0.3 ? 1 : 0);
    candle.children[0].scale.y = 1 + 0.25 * Math.sin(t * 11);
    const on = Math.floor(t * 5) % 11 !== 4;
    [...rift, ...halo].forEach((piece) => (piece.visible = on));
    halo.forEach((piece) => (piece.children[0].scale.x = 1 + 0.3 * Math.sin(t * 3)));
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}
