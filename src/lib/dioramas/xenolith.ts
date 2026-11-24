import { BoxGeometry, ConeGeometry, CylinderGeometry, DodecahedronGeometry, OctahedronGeometry } from "three";
import { INK, MAGENTA, YELLOW, limb, octagonBase, zigzag, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { column, floor, rubble } from "@/lib/diorama-props";

/**
 * Xenolith (P120): in the quarry by the temple dig, under a crane, the burly quarryman in open
 * overalls rests one hand on a boulder and the other on his sledgehammer; a violet crystal from the
 * excavations juts out of his chest, glowing veins running from it, and it swells now and then:
 * it grows each time he uses it. Its light pools on the ground round him: he can't hide (FUR 1).
 */
export function xenolith(kit: Kit): Framing {
  const { add, box, ball, decorate, tick, motes } = kit;
  const ROCK = 0x4a4452;
  const VIOLET = 0xa85cff;
  const SKIN = 0xb08068;
  const DENIM = 0x3a3e48;
  const F = octagonBase(kit, 0x221e26);
  const G = floor(kit, F, 0.06, 0x3a3640, 0x2a2630, 0.6);

  // The quarry: cut terraces at the back, blocks, a crane, the temple's columns on the rim.
  const terrace = box(2.6, 1.2, 0.6, ROCK, 0.1, G, -1.5, { delay: 0.1, ink: 1.02, rotation: [0, 0.1, 0] });
  decorate(terrace, new BoxGeometry(2.6, 0.02, 0.01), 0x2e2a36, [
    [0, 0.4, 0.31],
    [0, 0.8, 0.31],
  ]);
  decorate(terrace, new BoxGeometry(0.02, 0.4, 0.01), 0x2e2a36, [-0.9, -0.2, 0.5, 1.0].map((x, k) => [x, 0.2 + (k % 2) * 0.4, 0.31] as Point));
  box(1.6, 0.6, 0.5, 0x544e5c, -0.3, G + 1.2, -1.6, { delay: 0.15, rotation: [0, 0.1, 0] });
  column(kit, -0.75, -1.6, G + 1.8, 0.25, 1.3, false, 0x8a8a7a);
  column(kit, -0.05, -1.65, G + 1.8, 0.28, 1.3, false, 0x8a8a7a);
  box(1.05, 0.14, 0.42, 0x8a8a7a, -0.4, G + 3.1, -1.62, { delay: 0.35 });
  column(kit, 0.55, -1.55, G + 1.2, 0.3, 0.9, true, 0x8a8a7a);
  // A crawler crane on the rim, its boom lifting a block out of the dig.
  box(0.6, 0.25, 0.85, 0x2a2a32, 1.6, G, -0.95, { delay: 0.2, rotation: [0, 0.5, 0] });
  const cab = box(0.5, 0.45, 0.55, YELLOW, 1.6, G + 0.25, -0.95, { delay: 0.25, rotation: [0, 0.5, 0] });
  decorate(cab, new BoxGeometry(0.3, 0.16, 0.01), 0x0b3d50, [[0, 0.28, 0.28]]);
  const tip: Point = [0.75, G + 3.3, -1.45];
  const boom = limb(kit, [1.5, G + 0.6, -1.0], tip, 0.06, 0.05, YELLOW, { delay: 0.3 });
  decorate(boom, new BoxGeometry(0.13, 0.015, 0.015), INK, Array.from({ length: 8 }, (_, k) => [0, 0.3 + k * 0.33, 0.055, k % 2 ? 0.6 : -0.6] as [number, number, number, number]));
  box(0.012, 0.95, 0.012, INK, tip[0], tip[1] - 0.95, tip[2], { delay: 0.35, noInk: true });
  box(0.34, 0.26, 0.26, 0x8a8a9a, tip[0], tip[1] - 1.2, tip[2], { delay: 0.4 });
  const beacon = ball(0.05, MAGENTA, tip[0], tip[1], tip[2], { delay: 0.45, flat: true, noInk: true });
  [
    [1.45, 0.75, 0.4, 0.2],
    [1.5, 0.75, 0.32, -0.15],
    [1.0, 1.25, 0.34, 0.5],
  ].forEach(([x, z, s, turn], i) => box(s * 1.4, s, s, 0x8a8a9a, x, G + (i === 1 ? 0.4 : 0), z, { delay: 0.4 + i * 0.04, rotation: [0, turn, 0] }));
  rubble(kit, -1.4, 0.9, G, 0.45, 6, 0.5, 0x5a5464);

  // The violet glow pooling round his feet.
  add(new CylinderGeometry(0.95, 0.95, 0.006, 24).scale(1, 1, 0.8), 0x3a2060, -0.15, G + 0.004, 0.4, { delay: 0.7, flat: true, noInk: true });

  // Xenolith: broad, grey curls, stubble, bare arms, overalls open on his chest.
  const man = figure(kit, {
    x: -0.15,
    z: 0.35,
    y: G,
    facing: 0.3,
    height: 2.5,
    build: "broad",
    skin: SKIN,
    hair: { style: "curly", color: 0x8a8a90 },
    face: { mouth: "frown", brows: "angry", beard: "stubble", beardColor: 0x8a8a90 },
    top: { kind: "vest", color: DENIM, accent: SKIN },
    bottom: { kind: "trousers", color: DENIM },
    shoes: 0x3a2c22,
    arms: ["down", [0.66, 1.0, 0.3]],
    delay: 0.8,
  });
  const turn: [number, number, number] = [0, 0.3, 0];
  // One strap over the shoulder, the other hanging loose.
  box(0.07, 0.55, 0.03, DENIM, ...man.at(-0.2, 1.3, 0.3), { delay: 1.3, rotation: [-0.25, 0.3, 0] });
  box(0.07, 0.5, 0.03, DENIM, ...man.at(0.32, 0.75, 0.3), { delay: 1.3, rotation: [0, 0.3, -0.2] });
  // The boulder under his left hand, the sledgehammer in his right.
  add(new DodecahedronGeometry(0.5).scale(1, 0.85, 1), 0x5a5464, ...man.at(0.85, 0, 0.35), { delay: 0.6, rotation: [0.3, 0.5, 0.1] });
  const [hammerHand] = man.hands;
  const headAt = man.at(-0.62, 0, 0.28);
  const grip: Point = [hammerHand[0] + (hammerHand[0] - headAt[0]) * 0.12, hammerHand[1] + 0.1, hammerHand[2] + (hammerHand[2] - headAt[2]) * 0.12];
  limb(kit, [headAt[0], G + 0.1, headAt[2]], grip, 0.035, 0.035, 0x6a4a32, { delay: 1.2 });
  box(0.36, 0.2, 0.2, 0x4a4f5c, ...headAt, { delay: 1.25, rotation: turn });

  // The crystal in his chest, and the veins it lights.
  const crystals = [
    add(new OctahedronGeometry(0.24).scale(0.8, 1.6, 0.7), VIOLET, ...man.at(0.02, 1.38, 0.3), { delay: 1.4, flat: true, rotation: [0.25, 0.3, 0.1] }),
    ...[
      [-0.15, 1.5, 0.75],
      [0.17, 1.46, -0.8],
      [0.1, 1.3, -1.9],
    ].map(([x, y, lean], i) => add(new ConeGeometry(0.05, 0.26, 5), 0xd0a0ff, ...man.at(x, y, 0.3), { delay: 1.45 + i * 0.04, rotation: [0.6, 0.3, lean] })),
  ];
  const veins = [
    [man.at(-0.05, 1.6, 0.3), man.at(-0.22, 1.85, 0.25), man.at(-0.48, 1.75, 0.1), man.at(-0.58, 1.3, 0.12)],
    [man.at(0.1, 1.62, 0.3), man.at(0.3, 1.82, 0.22), man.at(0.5, 1.78, 0.1)],
    [man.at(0.12, 1.5, 0.3), man.at(0.4, 1.7, 0.2), man.at(0.6, 1.45, 0.25), man.at(0.64, 1.15, 0.32)],
  ].map((points, k) => zigzag(kit, points, 0.022, k === 1 ? MAGENTA : VIOLET, 1.6 + k * 0.05));
  motes(10, VIOLET, 0.03, [-0.9, G + 0.1, -0.2], [0.6, G + 2.2, 0.9], 1.5);

  tick((t) => {
    // It swells in fits, a little bigger each time, then settles.
    const u = (t % 5) / 5;
    const swell = u > 0.7 ? 1 + Math.sin(((u - 0.7) / 0.3) * Math.PI) * 0.22 : 1;
    crystals.forEach((crystal) => crystal.children.forEach((child) => child.scale.setScalar(swell)));
    veins.forEach((vein, k) => vein.forEach((piece) => (piece.visible = swell > 1.05 || Math.floor(t * 5 + k * 2) % 7 !== 6)));
    beacon.visible = Math.floor(t * 1.5) % 2 === 0;
  });

  return { width: 4.9, height: 4.5, lookY: 1.75 };
}
