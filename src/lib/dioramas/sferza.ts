import { BoxGeometry, CatmullRomCurve3, Color, type Group, TubeGeometry, Vector3 } from "three";
import { MAGENTA, colorOf, crawl, limb, octagonBase, zigzag, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { column, floor, rubble, volcanoBackdrop } from "@/lib/diorama-props";

/**
 * Sferza (P258): the fallen duellist in the old duelling ring among the ruins, the volcano
 * glowing behind. Silver braids, a high-collared scale cuirass, a dark cape, and her whip of
 * woven light coiling round her in a spiral, sparks running along it. The ribbons of everyone
 * she has beaten flutter from a column, and behind it the next challenger peeks out, his sword
 * trembling: he is already afraid.
 */
export function sferza(kit: Kit): Framing {
  const { add, box, ball, decorate, tick } = kit;
  const ARMOR = 0x2a5a50;
  const WHIP = 0xe040ff;
  const F = octagonBase(kit, 0x221a24);
  const G = floor(kit, F, 0.06, 0x4a3a40, 0x3a2c32, 0);

  // The ring: a circle of stones round the trodden sand, scorched where the whip struck.
  const C: Point = [-0.1, G, 0.25];
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    box(0.18, 0.1 + (k % 3) * 0.03, 0.16, k % 2 ? 0x6a5a68 : 0x5a4a58, C[0] + Math.sin(a) * 1.5, G, C[2] + Math.cos(a) * 1.5, { delay: 0.1 + k * 0.015, rotation: [0, a + k, 0] });
  }
  [
    [0.7, 0.9, 0.5],
    [-0.9, 0.6, -0.7],
    [0.4, -0.6, 1.3],
  ].forEach(([x, z, turn], k) => box(0.5, 0.006, 0.04, 0x1e1418, x, G, z, { delay: 0.3 + k * 0.03, flat: true, noInk: true, rotation: [0, turn, 0] }));

  // Ruins and the volcano behind.
  volcanoBackdrop(kit, 0, -1.85, G, 0.12, 1.3);
  column(kit, -1.5, -0.8, G, 0.2, 2.4, true, 0x6a7a94);
  rubble(kit, -1.2, -0.35, G, 0.3, 4, 0.35);
  column(kit, 1.5, -0.85, G, 0.24, 2.8, false, 0x6a7a94);
  box(0.46, 0.06, 0.46, 0x5e4a3a, 1.5, G + 1.9, -0.85, { delay: 0.5 });
  // The ribbons of the beaten, hanging from the knot and fluttering.
  const ribbons = [0xe8e2d0, 0x16c8ff, 0x7a3a5a, 0x3a7a8a, 0x8a93a3].map((color, k) => {
    const a = -0.6 + k * 0.45;
    return add(new BoxGeometry(0.07, 0.55, 0.012).translate(0, -0.275, 0), color, 1.5 + Math.sin(a) * 0.26, G + 1.92 - 0.55, -0.85 + Math.cos(a) * 0.26, { delay: 0.55 + k * 0.03, rotation: [0, a, 0] });
  });

  // The next challenger, peeking out from behind the column, sword shaking.
  const rival = figure(kit, {
    x: 1.1,
    z: -1.25,
    y: G,
    facing: -0.55,
    height: 2.1,
    build: "slim",
    skin: 0xe0b498,
    hair: { style: "short", color: 0x5a3a28 },
    face: { mouth: "open", brows: "worried" },
    top: { kind: "shirt", color: 0x3a4a6a },
    bottom: { kind: "trousers", color: 0x2a2a3a },
    arms: [[-0.2, 1.45, 0.45], "down"],
    delay: 0.6,
  });
  const [grip] = rival.hands;
  rival.parts.push(limb(kit, grip, rival.at(-0.26, 2.1, 0.7), 0.025, 0.015, 0xc8d0dc, { delay: 1.0 }));
  rival.parts.push(box(0.18, 0.03, 0.04, 0x8a93a3, grip[0], grip[1] + 0.02, grip[2], { delay: 1.02, rotation: [0, -0.55, 0] }));

  // Sferza: silver braids, pale eyes, teal scale cuirass, high collar, dark cape.
  const f = 0.25;
  const duellist = figure(kit, {
    x: C[0],
    z: C[2],
    y: G,
    facing: f,
    height: 2.5,
    skin: 0xe8c8b0,
    hair: { style: "braids", color: 0xe0dccc },
    face: { mouth: "smirk", brows: "angry", eyes: 0xe8f0a0 },
    top: { kind: "armor", color: ARMOR, accent: 0x3a7a68 },
    bottom: { kind: "trousers", color: 0x22403a },
    shoes: 0x1e2a28,
    gloves: ARMOR,
    belt: 0x1e2a28,
    cape: 0x1e1c2a,
    arms: [[-0.42, 1.0, 0.3], "hip"],
    legs: "wide",
    delay: 0.8,
  });
  const at = duellist.at;
  const collar = kit.cylinder(0.15, 0.17, 0.22, ARMOR, ...at(0, 1.74, 0), { delay: 1.15 }, 14);
  decorate(collar, new BoxGeometry(0.3, 0.02, 0.02), 0x3a7a68, [[0, 0.2, 0.15]]);
  const cuirass = add(new BoxGeometry(0.001, 0.001, 0.001), ARMOR, ...at(0, 0, 0), { delay: 1.2, noInk: true, rotation: [0, f, 0] });
  decorate(cuirass, new BoxGeometry(0.03, 0.03, 0.02), 0x1e3a34, [-0.12, 0, 0.12].flatMap((x) => [1.25, 1.42].map((y) => [x, y, 0.27] as Point)));

  // The whip: a dark grip, and a lash of light spiralling round her up over her head.
  const [hand] = duellist.hands;
  const end = at(-0.48, 0.86, 0.55);
  limb(kit, hand, end, 0.03, 0.026, 0x1a1820, { delay: 1.3 });
  ball(0.035, WHIP, end[0], end[1] - 0.035, end[2], { delay: 1.32, flat: true, noInk: true });
  const spiral: Point[] = [
    end,
    ...[
      [-1.0, 1.0, 0.7],
      [0.0, 1.1, 0.45],
      [0.9, 1.05, 0.55],
      [1.8, 1.05, 0.9],
      [2.7, 1.05, 1.35],
      [3.6, 1.0, 1.85],
      [4.5, 1.0, 2.3],
      [5.3, 0.95, 2.7],
      [6.1, 0.8, 3.0],
      [6.8, 0.55, 3.15],
    ].map(([a, r, y]) => at(Math.sin(a) * r, y, Math.cos(a) * r)),
  ];
  const curve = new CatmullRomCurve3(spiral.map((p) => new Vector3(...p)));
  const tube = (r: number) => new TubeGeometry(curve, 90, r, 6).translate(-end[0], -end[1], -end[2]);
  const lashGeometry = tube(0.026);
  lashGeometry.computeBoundingBox();
  const low = lashGeometry.boundingBox?.min.y ?? 0;
  const lash = add(lashGeometry, WHIP, end[0], end[1] + low, end[2], { delay: 1.4, flat: true, outline: tube(0.044) });
  // Sparks running along the lash, a stretch at a time.
  const sparks: Group[][] = [0, 3, 6].map((from, k) => zigzag(kit, crawl(spiral.slice(from + 1, from + 5), 4, 0.07, k), 0.014, 0xffe0ff, 1.6 + k * 0.05));

  const rest = rival.parts.map((part) => part.position.x);
  const from = new Color(WHIP);
  const to = new Color(MAGENTA);
  tick((t) => {
    colorOf(lash).lerpColors(from, to, (Math.sin(t * 3) + 1) / 2);
    const lit = Math.floor(t * 4) % 3;
    sparks.forEach((spark, k) => spark.forEach((piece) => (piece.visible = k === lit)));
    ribbons.forEach((ribbon, k) => (ribbon.rotation.x = Math.sin(t * 2.4 + k) * 0.2));
    // The challenger cannot keep still.
    const shake = Math.sin(t * 43) * 0.008;
    rival.parts.forEach((part, k) => (part.position.x = rest[k] + shake));
  });

  return { width: 4.9, height: 4.6, lookY: 1.75 };
}
