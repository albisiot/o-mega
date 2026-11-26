import { BoxGeometry, CylinderGeometry, DodecahedronGeometry, Group, OctahedronGeometry, TorusGeometry } from "three";
import { CYAN, INK, MAGENTA, colorOf, limb, octagonBase, type Framing, type Kit } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { facade, floor, stall, table } from "@/lib/diorama-props";

/**
 * Pulce (P302): the snatcher of the Figli dell'Ultima has jumped clean over a fence's table in
 * the night market, grinning, the black bag hugged to her chest and one stone of the Alphabet
 * held up high. Below, the fence stares at the gap in his velvet tray, hands spread, and looks
 * left and right; she bobs in the air over her own shadow. The price of having no magic: the
 * stones on the tray glow, the one in her hand has gone dull.
 */
export function pulce(kit: Kit): Framing {
  const { add, box, ball, decorate, tick } = kit;
  const PURPLE = 0x5a2a8a;
  const VIOLET = 0x8a3ad0;
  const VELVET = 0x5a1630;
  const F = octagonBase(kit, 0x1f1b2a);
  const G = floor(kit, F, 0.06, 0x2c2838, 0x1c1a26, 0.4);

  // The market at night: house fronts, a fruit stall under its striped awning.
  facade(kit, -0.1, -1.6, G, 0.1, { width: 3.6, height: 2.7, color: 0x33284a, windows: 5, floors: 2, door: true });
  const desk = stall(kit, 1.15, -0.95, G, 0.25, 1.3, [MAGENTA, 0x23707e]);
  decorate(desk, new BoxGeometry(0.13, 0.13, 0.13), 0xd8304a, [
    [-0.42, 0.81, 0.08],
    [-0.26, 0.81, -0.05],
    [-0.1, 0.81, 0.1],
    [0.3, 0.81, 0.02],
    [0.45, 0.81, -0.08],
  ]);
  decorate(desk, new BoxGeometry(0.11, 0.11, 0.11), 0x7a3a9a, [
    [0.1, 0.8, 0.12],
    [0.22, 0.8, -0.12],
  ]);

  // The fence's folding table: a velvet tray of glowing stones with one empty hollow.
  const top = table(kit, -0.75, 0.55, G, 0.35, false, VELVET, 0.72);
  decorate(top, new BoxGeometry(0.75, 0.04, 0.42), 0x3a0e20, [[0, 0.06, 0]]);
  const glow = decorate(top, new OctahedronGeometry(0.06), CYAN, [
    [-0.27, 0.12, -0.08],
    [0.0, 0.12, 0.1],
    [0.27, 0.12, -0.08],
  ]);
  decorate(top, new OctahedronGeometry(0.06), MAGENTA, [
    [-0.13, 0.12, 0.1],
    [0.27, 0.12, 0.1],
  ]);
  decorate(top, new CylinderGeometry(0.06, 0.06, 0.012, 12), 0x14080e, [[0.0, 0.085, -0.08]]);
  // A bare bulb over the table on its wire.
  box(0.012, 0.9, 0.012, INK, -1.45, G + 2.4, 0.55, { delay: 0.45, noInk: true });
  ball(0.08, 0xff8a00, -1.45, G + 2.25, 0.55, { delay: 0.5, flat: true });

  // The fence behind his table: bald, moustached, hands spread over the gap in the tray.
  const fence = figure(kit, {
    x: -0.85,
    z: -0.1,
    y: G,
    facing: 0.45,
    height: 2.3,
    build: "heavy",
    skin: 0xd8a888,
    hair: { style: "bald", color: 0x3a2a22 },
    face: { mouth: "open", brows: "worried", beard: "moustache", beardColor: 0x2a1e1a },
    top: { kind: "coat", color: 0x5a4030, accent: 0xc8b89a },
    bottom: { kind: "trousers", color: 0x2e2a34 },
    arms: [
      [-0.62, 1.35, 0.45],
      [0.62, 1.35, 0.45],
    ],
    delay: 0.6,
  });

  // Pulce in the air: the bag hugged in her left arm, the stolen stone up in her right, her
  // left knee drawn up and her right leg trailing behind, the whole body leaning into the jump.
  const H = G + 1.3;
  const u = 2.2 / 2.4;
  const flea = figure(kit, {
    x: 0.55,
    z: 0.35,
    y: H,
    facing: 0.15,
    height: 2.2,
    build: "slim",
    skin: 0xf0c8b0,
    hair: { style: "spiky", color: VIOLET },
    face: { mouth: "grin", brows: "raised", marks: 0xc07860 },
    top: { kind: "jacket", color: PURPLE, accent: 0x1c1a24 },
    bottom: { kind: "trousers", color: 0x4a2272 },
    shoes: 0x1c1a22,
    gloves: 0xf0c8b0,
    arms: ["up", [0.08, 1.08, 0.36]],
    legs: "kneel",
    delay: 0.9,
  });
  // Her legs are her own: the left knee drawn up high, the right leg trailing behind.
  for (let i = 0; i < 6; i++) flea.parts[i].visible = false;
  const TROUSERS = 0x4a2272;
  const leg = (side: number, knee: number[], ankle: number[], toe: number[], delay: number): Group[] => {
    const joint = flea.at(side * 0.17 * u, 0.78 * u, 0);
    const k = flea.at(knee[0] * u, knee[1] * u, knee[2] * u);
    const a = flea.at(ankle[0] * u, ankle[1] * u, ankle[2] * u);
    const shoe = limb(kit, a, flea.at(toe[0] * u, toe[1] * u, toe[2] * u), 0.09, 0.075, 0x1c1a22, { delay: delay + 0.03 });
    decorate(shoe, new BoxGeometry(0.15, 0.02, 0.02), MAGENTA, [[0, 0.1, 0.075]]);
    return [
      limb(kit, joint, k, 0.11 * u * 1.25, 0.11 * u * 1.12, TROUSERS, { delay }),
      ball(0.1 * u * 1.12, TROUSERS, k[0], k[1] - 0.1 * u * 1.12, k[2], { delay: delay + 0.01 }),
      limb(kit, k, a, 0.1 * u * 1.08, 0.1 * u * 0.95, TROUSERS, { delay: delay + 0.02 }),
      shoe,
    ];
  };
  const hip = flea.at(0, 0.78 * u, 0);
  const trailing = [
    ...leg(-1, [-0.2, 0.42, -0.3], [-0.22, 0.5, -0.78], [-0.22, 0.3, -0.98], 0.95),
    ...leg(1, [0.2, 1.0, 0.45], [0.2, 0.56, 0.3], [0.2, 0.42, 0.5], 1.0),
  ];
  const [stoneHand, bagHand] = flea.hands;
  const bag = add(new CylinderGeometry(0.17, 0.17, 0.46, 14).rotateZ(Math.PI / 2), 0x1a1820, bagHand[0] - 0.02, bagHand[1] - 0.16, bagHand[2] + 0.02, {
    delay: 1.5,
    rotation: [0, 0.15, 0.25],
  });
  decorate(bag, new BoxGeometry(0.4, 0.02, 0.01), 0x8a8e98, [[0, 0.3, 0.12]]);
  decorate(bag, new TorusGeometry(0.12, 0.015, 6, 14, Math.PI), 0x2a2830, [[0, 0.33, 0]]);
  const stone = add(new DodecahedronGeometry(0.075), 0x6a6670, stoneHand[0], stoneHand[1] + 0.04, stoneHand[2], { delay: 1.6 });
  const jump = new Group();
  jump.position.set(...hip);
  flea.parts[0].parent?.add(jump);
  for (const part of [...flea.parts, ...trailing, bag, stone]) {
    part.position.sub(jump.position);
    jump.add(part);
  }
  jump.rotation.set(0.22, 0, -0.08);

  // Her shadow on the cobbles, the dust where she took off and the lines of the jump.
  const shadow = add(new CylinderGeometry(0.42, 0.42, 0.004, 20).scale(1, 1, 0.7), 0x14121c, 0.55, G, 0.4, { delay: 0.7, flat: true, noInk: true });
  [
    [1.3, 1.0, 0.11],
    [1.48, 0.82, 0.08],
    [1.15, 1.2, 0.07],
  ].forEach(([x, z, r], i) => ball(r, 0x5a5468, x, G - r * 0.4, z, { delay: 0.75 + i * 0.04, noInk: true }));
  (
    [
      [0.25, 0.75, 0.9, MAGENTA],
      [0.55, 0.6, 1.1, CYAN],
      [0.85, 0.4, 0.8, MAGENTA],
    ] as [number, number, number, number][]
  ).forEach(([x, z, length, color], i) => box(0.025, length, 0.025, color, x, G + 0.3, z, { delay: 1.7 + i * 0.05, flat: true, noInk: true }));

  const shadowMesh = shadow.children[0];
  const lit = colorOf(stone);
  const fenceHead = fence.headPart;
  tick((t) => {
    // A slow hang in the air, the shadow growing as she comes down.
    const lift = Math.sin(t * 2.2) * 0.08;
    jump.position.y = hip[1] + lift;
    shadowMesh.scale.set(1 - lift, 1, 1 - lift);
    // The fence searching the tray; the stones on it pulsing; the stolen one dead in her hand.
    fenceHead.rotation.y = 0.45 + Math.sin(t * 1.3) * 0.25;
    glow.color.setHSL(0.53, 1, 0.5 + Math.sin(t * 3) * 0.1);
    lit.setHex(Math.floor(t * 2) % 7 === 3 ? 0x8a6aa0 : 0x6a6670);
  });

  return { width: 4.9, height: 4.6, lookY: 1.8 };
}
