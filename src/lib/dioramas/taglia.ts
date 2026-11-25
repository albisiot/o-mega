import { BoxGeometry, CatmullRomCurve3, Color, CylinderGeometry, SphereGeometry, TorusGeometry, Vector3, type Group } from "three";
import { CYAN, INK, MAGENTA, aim, colorOf, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { bollard, floor, lamp } from "@/lib/diorama-props";

/**
 * Taglia (P247): the alien bounty hunter on the harbour wall at night, under a cyan moon, a
 * ship moored behind. Spiny crest out of her hood, her cloak hung with the medals of every
 * hunt, she has just netted her quarry: the man kneels under a magenta net still tied to the
 * launcher on her forearm, while her other hand lets a glowing chain uncoil to the ground. On
 * the lamp post, his wanted poster: one face, one reward, no partners.
 */
export function taglia(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const STONE = 0x3a4258;
  const CLOAK = 0x2a2440;
  const SKIN = 0x8a9a88;
  const CHAIN = 0xff5a2a;
  const F = octagonBase(kit, 0x1c1f2c);
  const G = floor(kit, F, 0.06, 0x2c3040, 0x1e2230, 0.45);

  // The harbour wall, the moon and a moored ship beyond it.
  const wall = box(3.2, 0.5, 0.3, STONE, 0, G, -1.4, { delay: 0.08 });
  decorate(wall, new BoxGeometry(3.2, 0.03, 0.01), 0x2a3044, [[0, 0.25, 0.151]]);
  [-1.1, 0.4].forEach((x, i) => bollard(kit, x, -1.4, G + 0.5, 0.14 + i * 0.03));
  add(new CylinderGeometry(0.36, 0.36, 0.02, 28).rotateX(Math.PI / 2), 0x9fe8ff, -0.95, G + 2.75, -1.85, { delay: 0.12, flat: true, noInk: true });
  box(0.9, 0.3, 0.3, 0x2a2238, 0.75, G + 0.4, -1.8, { delay: 0.16 });
  cylinder(0.025, 0.025, 1.6, INK, 0.75, G + 0.7, -1.8, { delay: 0.2, noInk: true }, 6);
  [1.2, 1.65, 2.1].forEach((y, i) => ball(0.035, i === 1 ? CYAN : MAGENTA, 0.75, G + y, -1.77, { delay: 0.24 + i * 0.02, flat: true, noInk: true }));

  // The lamp post with the wanted poster: a face and a reward, nothing written.
  lamp(kit, -1.55, 0.55, G, 0.2, 2.2, 0xffd060);
  const poster = box(0.36, 0.46, 0.01, 0xd8cfb8, -1.55, G + 1.05, 0.6, { delay: 0.3, rotation: [0, 0.35, 0] });
  decorate(poster, new CylinderGeometry(0.09, 0.09, 0.01, 16).rotateX(Math.PI / 2), 0x8a7a68, [[0, 0.28, 0.006]]);
  decorate(poster, new BoxGeometry(0.2, 0.06, 0.01), 0x4a3020, [[0, 0.37, 0.007]]);
  decorate(poster, new BoxGeometry(0.22, 0.04, 0.01), 0xc04030, [[0, 0.08, 0.006]]);

  // The quarry, kneeling under the net, arms up.
  const NX = 0.95;
  const NZ = 0.8;
  const quarry = figure(kit, {
    x: NX,
    z: NZ,
    y: G,
    facing: -0.6,
    height: 2.2,
    skin: 0xd8a888,
    hair: { style: "short", color: 0x4a3020 },
    face: { mouth: "open", brows: "worried" },
    top: { kind: "jacket", color: 0x3a4a5a, accent: 0x4a5a6a },
    bottom: { kind: "trousers", color: 0x2a2a34 },
    arms: [[-0.3, 1.25, 0.15], [0.3, 1.3, 0.12]],
    legs: "kneel",
    delay: 0.6,
  });
  const net: Group[] = [];
  [0.25, 0.75, 1.25, 1.7].forEach((h, i) => {
    const r = 0.62 * Math.sqrt(1 - (h / 2.1) ** 2);
    net.push(add(new TorusGeometry(r, 0.012, 4, 28).rotateX(Math.PI / 2), MAGENTA, NX, G + h, NZ, { delay: 1.2 + i * 0.03, flat: true, noInk: true }));
  });
  [0, 1, 2, 3].forEach((k) =>
    net.push(add(new TorusGeometry(0.62, 0.012, 4, 24, Math.PI).scale(1, 2.1 / 0.62, 1), MAGENTA, NX, G - 0.01, NZ, { delay: 1.3 + k * 0.03, flat: true, noInk: true, rotation: [0, (k * Math.PI) / 4, 0] })),
  );
  [0, 1, 2, 3, 4, 5].forEach((k) => {
    const a = (k / 6) * Math.PI * 2;
    ball(0.05, 0x4a4a58, NX + Math.sin(a) * 0.62, G, NZ + Math.cos(a) * 0.62, { delay: 1.35 });
  });

  // Taglia, in her medalled cloak.
  const H = 0.45;
  const hunter = figure(kit, {
    x: -0.55,
    z: -0.1,
    y: G,
    facing: H,
    height: 2.5,
    build: "slim",
    skin: SKIN,
    hair: { style: "bald", color: SKIN },
    face: { blank: true },
    top: { kind: "robe", color: CLOAK, accent: 0x3a3456 },
    shoes: 0x1e1a28,
    belt: 0x4a3426,
    gloves: SKIN,
    cape: CLOAK,
    arms: [[-0.4, 1.05, 0.3], [0.5, 1.5, 0.62]],
    delay: 0.9,
  });
  const P = hunter.at;
  const turned: [number, number, number] = [0, H, 0];
  const R = hunter.headRadius;
  const cy = R * 1.06;
  // Her face: huge slanted black eyes, a long snout, and a crest of spines out of the hood.
  decorate(hunter.headPart, new SphereGeometry(0.06, 10, 8).scale(1.3, 0.75, 0.5), INK, [
    [-0.085, cy + 0.04, R * 0.9, 0.35],
    [0.085, cy + 0.04, R * 0.9, -0.35],
  ]);
  decorate(hunter.headPart, new BoxGeometry(0.02, 0.02, 0.01), 0xe8f4ff, [
    [-0.07, cy + 0.06, R * 1.04],
    [0.1, cy + 0.06, R * 1.04],
  ]);
  const hy = hunter.head[1] - G;
  const snout = add(new SphereGeometry(0.11, 12, 10).scale(0.75, 0.6, 1.3), SKIN, ...P(0, hy - 0.14, R * 0.72), { delay: 1.5, rotation: turned });
  decorate(snout, new BoxGeometry(0.02, 0.012, 0.01), INK, [
    [-0.025, 0.08, 0.14],
    [0.025, 0.08, 0.14],
  ]);
  [-1.05, -0.7, -0.35, 0, 0.35, 0.7, 1.05].forEach((c, i) => {
    const reach = 0.3 - Math.abs(c) * 0.1;
    const from = P(Math.sin(c) * R * 0.85, hy + Math.cos(c) * R * 0.85, -0.05);
    const to = P(Math.sin(c) * (R + reach), hy + Math.cos(c) * (R + reach), -0.1);
    limb(kit, from, to, 0.05, 0.006, 0xa8b8a0, { delay: 1.55 + i * 0.02 });
  });
  // Her hood, fallen back behind the crest.
  add(new SphereGeometry(R * 1.35, 16, 10, Math.PI, Math.PI, 0.35, Math.PI * 0.55), CLOAK, ...P(0, hy - R * 0.75, -0.06), { delay: 1.45, rotation: turned });
  // The mantle of medals over her shoulders.
  const mantle = add(new CylinderGeometry(0.2, 0.46, 0.55, 16).scale(1, 1, 0.8), CLOAK, ...P(0, 1.3, -0.02), { delay: 1.4, rotation: turned });
  const medal = new CylinderGeometry(0.034, 0.034, 0.012, 10).rotateX(Math.PI / 2);
  const medals: Point[][] = [[], [], []];
  [0.12, 0.27, 0.42].forEach((h, row) =>
    [-0.9, -0.55, -0.2, 0.15, 0.5, 0.85].forEach((phi, k) => {
      const r = 0.46 - 0.26 * (h / 0.55);
      medals[(row + k) % 3].push([Math.sin(phi + row * 0.15) * r, h, Math.cos(phi + row * 0.15) * r * 0.8 + 0.01]);
    }),
  );
  [0xc8ccd4, 0xb08d3c, MAGENTA].forEach((color, i) => decorate(mantle, medal, color, medals[i]));
  // The net launcher on her left forearm, its lines still running to the net.
  const elbow = hunter.elbows[1];
  const hand = hunter.hands[1];
  const muzzle: Point = [hand[0] + (hand[0] - elbow[0]) * 0.3, hand[1] + (hand[1] - elbow[1]) * 0.3, hand[2] + (hand[2] - elbow[2]) * 0.3];
  limb(kit, elbow, muzzle, 0.085, 0.1, 0x3a3a48, { delay: 1.6 });
  ball(0.06, MAGENTA, muzzle[0], muzzle[1] - 0.06, muzzle[2], { delay: 1.65, flat: true, noInk: true });
  [
    [NX - 0.2, G + 1.7, NZ - 0.2],
    [NX, G + 2.05, NZ],
    [NX - 0.35, G + 1.2, NZ + 0.1],
  ].forEach((to, i) => limb(kit, muzzle, to as Point, 0.012, 0.012, MAGENTA, { delay: 1.7 + i * 0.03, flat: true, noInk: true }));
  motes(6, 0x6a6a7a, 0.025, [muzzle[0] - 0.08, muzzle[1], muzzle[2] - 0.08], [muzzle[0] + 0.08, muzzle[1] + 0.5, muzzle[2] + 0.08], 1.8);

  // The glowing chain, from her right hand down to a coil on the ground.
  const grip = hunter.hands[0];
  const curve = new CatmullRomCurve3(
    [grip, [grip[0] - 0.05, G + 0.5, grip[2] + 0.1], [grip[0] + 0.25, G + 0.05, grip[2] + 0.55], [grip[0] - 0.2, G + 0.05, grip[2] + 0.8], [grip[0] - 0.5, G + 0.05, grip[2] + 0.45], [grip[0] - 0.15, G + 0.05, grip[2] + 0.3]].map(
      (p) => new Vector3(...p),
    ),
  );
  const link = new TorusGeometry(0.045, 0.013, 6, 12).scale(1, 1.5, 1);
  const twisted = link.clone().rotateY(Math.PI / 2);
  const N = 26;
  const chain = Array.from({ length: N }, (_, i) => {
    const a = curve.getPoint(i / N);
    const b = curve.getPoint((i + 1) / N);
    const { rotation } = aim([a.x, a.y, a.z], [b.x, b.y, b.z]);
    return add(i % 2 ? twisted : link, CHAIN, a.x, a.y, a.z, { delay: 1.8 + i * 0.01, flat: true, noInk: true, rotation });
  });

  const cold = new Color(0xc0281a);
  const hot = new Color(0xffb040);
  const rest = quarry.parts.map((part) => part.position.x);
  tick((t) => {
    // A pulse runs down the chain; the man under the net struggles now and then.
    chain.forEach((piece, i) => colorOf(piece).lerpColors(cold, hot, Math.max(0, Math.sin(t * 4 - i * 0.45)) ** 2));
    const struggle = Math.sin(t * 1.3) > 0.4 ? Math.sin(t * 22) * 0.025 : 0;
    quarry.parts.forEach((part, i) => (part.position.x = rest[i] + struggle));
  });

  return { width: 4.9, height: 4.5, lookY: 1.6 };
}
