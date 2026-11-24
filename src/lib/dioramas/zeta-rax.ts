import { BoxGeometry, ConeGeometry, CylinderGeometry, TorusGeometry } from "three";
import { INK, MAGENTA, aim, archMouth, archedWall, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { bin, floor, puddle, wallLantern } from "@/lib/diorama-props";

/**
 * Zeta Rax (P099): the alien bounty hunter in her long purple coat stalks an old-town alley under
 * a brick arch, rifle on her shoulder, a sack of cash at her belt, eyes on the tracker in her
 * hand, whose target rings spin and beep. She has crossed three galaxies for the man she wants,
 * and with so little in her head she never looks down: he is peeping out from under the manhole
 * lid at her feet.
 */
export function zetaRax(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const SCALE = 0x5a7a98;
  const COAT = 0x4a2a6a;
  const GLOW = 0xc8ff3a;
  const BRICK = 0x4a2a44;
  const F = octagonBase(kit, 0x1f1d28);
  const G = floor(kit, F, 0.06, 0x2e2a3a, 0x221e2c, 0.3);

  // The alley: a brick wall with an arch onto steps in the dark, a lantern, a bin, a puddle.
  const wall = add(archedWall(3.0, 2.7, 0.3, { x: 0.45, half: 0.5, spring: 1.2 }), BRICK, 0, G, -1.5, { delay: 0.1, ink: 1.02 });
  decorate(
    wall,
    new BoxGeometry(0.3, 0.1, 0.01),
    0x3a2036,
    [
      [-1.1, 0.4],
      [-0.6, 0.9],
      [-1.2, 1.5],
      [-0.4, 2.1],
      [1.2, 0.6],
      [1.0, 1.8],
      [0.2, 2.4],
    ].map(([x, y]) => [x, y, 0.155] as Point),
  );
  add(archMouth(0.5, 1.2), 0x100c18, 0.45, G, -1.66, { delay: 0.15, noInk: true });
  [0, 1, 2].forEach((k) => box(0.95, 0.12, 0.3 - k * 0.08, 0x2e2a3a, 0.45, G + k * 0.12, -1.5 - k * 0.04, { delay: 0.2 + k * 0.03, noInk: true }));
  const lantern = wallLantern(kit, -0.4, -1.35, G + 2.0, 0.3, 0x9fe8ff);
  bin(kit, 1.55, -0.85, G, 0.35);
  puddle(kit, -0.9, 1.05, G, 0.35, 0.36, MAGENTA);

  // The manhole, its lid lifted a crack: two eyes and four fingers under it.
  const MX = 0.75;
  const MZ = 0.85;
  add(new TorusGeometry(0.33, 0.04, 6, 24).rotateX(Math.PI / 2), 0x4a4f5c, MX, G, MZ, { delay: 0.4, noInk: true });
  cylinder(0.31, 0.31, 0.01, INK, MX, G, MZ, { delay: 0.42, flat: true, noInk: true }, 20);
  const lid = add(new CylinderGeometry(0.31, 0.31, 0.05, 20).translate(0, 0, 0.31), 0x3a3f4e, MX - 0.07, G + 0.01, MZ - 0.3, { delay: 0.45 });
  lid.rotation.order = "YXZ";
  lid.rotation.set(-0.3, 0.25, 0);
  decorate(lid, new BoxGeometry(0.4, 0.01, 0.03), 0x23222b, [-0.1, 0, 0.1].map((dz) => [0, 0.051, 0.31 + dz] as Point));
  const eyes = [-1, 1].map((s, i) => {
    const eye = ball(0.05, 0xf4f0e6, MX + s * 0.08 + 0.03, G + 0.02, MZ + 0.12, { delay: 1.8 + i * 0.03, rotation: [0, -0.5, 0] });
    decorate(eye, new CylinderGeometry(0.022, 0.022, 0.01, 10).rotateX(Math.PI / 2), INK, [[-0.012, 0.06, 0.045]]);
    return eye;
  });
  [-0.15, -0.05, 0.05, 0.15].forEach((dx, i) => cylinder(0.022, 0.022, 0.08, 0xd8a888, MX + dx + 0.04, G + 0.01, MZ + 0.27 - Math.abs(dx) * 0.4, { delay: 1.85 + i * 0.02, rotation: [1.2, 0, 0] }, 8));

  // Zeta Rax: scaled skin, fins, a long coat over her armour, yellow eyes on the tracker.
  const FACE = 0.4;
  const hunter = figure(kit, {
    x: -0.35,
    z: 0.15,
    y: G,
    facing: FACE,
    height: 2.5,
    build: "slim",
    skin: SCALE,
    hair: { style: "bald", color: 0x3a5a78 },
    face: { mouth: "smirk", brows: "angry", eyes: GLOW, glow: true, marks: 0x3a5a78 },
    top: { kind: "coat", color: COAT, accent: 0x2e1a44 },
    bottom: { kind: "trousers", color: 0x2a1e3a },
    shoes: 0x1a1424,
    belt: 0x23222b,
    gloves: SCALE,
    arms: [[-0.45, 1.92, 0.16], [0.28, 1.55, 0.5]],
    legs: "wide",
    delay: 0.7,
  });
  const u = 2.5 / 2.4;
  const hy = hunter.head[1];
  const RH = 0.22 * u;
  // A crest of fins on the back of her head, and one on each cheek.
  [
    [0, 0.2, -0.12, -0.8, 0],
    [0, 0.05, -0.2, -1.4, 0],
    [-0.17, 0.0, -0.06, -0.5, 0.9],
    [0.17, 0.0, -0.06, -0.5, -0.9],
  ].forEach(([x, y, z, tilt, roll], i) => {
    const at = hunter.at(x, hy - G + y, z);
    const fin = add(new ConeGeometry(0.07, 0.28, 4).scale(0.35, 1, 1), 0x3a5a78, ...at, { delay: 1.2 + i * 0.03 });
    fin.rotation.order = "YXZ";
    fin.rotation.set(tilt, FACE, roll);
  });
  // Two fangs over her lip.
  const head = hunter.headPart;
  decorate(head, new ConeGeometry(0.012, 0.04, 4).rotateX(Math.PI), 0xf4f0e6, [
    [-0.04 * u, RH * 1.06 - 0.12 * u, RH * 0.88],
    [0.04 * u, RH * 1.06 - 0.12 * u, RH * 0.88],
  ]);
  // Pouches on the belt, and the sack of cash.
  [-0.18, 0.0, 0.18].forEach((x, i) => box(0.1, 0.12, 0.08, 0x23222b, ...hunter.at(x, 1.03 * u, 0.22), { delay: 1.25 + i * 0.02, rotation: [0, FACE, 0] }));
  const sackAt = hunter.at(0.33, 0.78 * u, 0.12);
  ball(0.13, 0x6a5a3a, ...sackAt, { delay: 1.3 });
  [-0.04, 0.04].forEach((dx, i) => box(0.12, 0.05, 0.01, 0x2f8f6f, sackAt[0] + dx, sackAt[1] + 0.24, sackAt[2], { delay: 1.32 + i * 0.02, rotation: [0.2, FACE, (i ? -1 : 1) * 0.5] }));

  // The rifle on her right shoulder.
  const [rifleHand, trackerHand] = hunter.hands;
  const butt: Point = [rifleHand[0] - 0.05, rifleHand[1] - 0.08, rifleHand[2] + 0.18];
  const muzzle = hunter.at(-1.0, 2.55, -0.65);
  const rifle = aim(butt, muzzle);
  const gun = box(0.09, rifle.length, 0.12, 0x2e1a44, ...butt, { delay: 1.35, rotation: rifle.rotation });
  decorate(gun, new BoxGeometry(0.05, 0.3, 0.05), INK, [[0, rifle.length * 0.55, 0.08]]);
  decorate(gun, new BoxGeometry(0.1, 0.25, 0.04), MAGENTA, [[0, rifle.length * 0.3, -0.07]]);
  add(new CylinderGeometry(0.025, 0.025, 0.35, 8), INK, ...muzzle, { delay: 1.38, rotation: rifle.rotation });

  // The tracker in her left hand, its target rings spinning over the screen.
  const tracker = box(0.13, 0.2, 0.05, 0x23222b, trackerHand[0], trackerHand[1] - 0.04, trackerHand[2] + 0.05, { delay: 1.4, rotation: [-0.5, FACE, 0] });
  const screen = decorate(tracker, new BoxGeometry(0.09, 0.12, 0.01), GLOW, [[0, 0.11, 0.028]]);
  const over: Point = [trackerHand[0] + 0.02, trackerHand[1] + 0.2, trackerHand[2] + 0.12];
  const rings = [0.1, 0.17].map((r, i) =>
    add(new TorusGeometry(r, 0.008, 4, 28), GLOW, over[0], over[1] - r, over[2], { delay: 1.5 + i * 0.05, flat: true, noInk: true, rotation: [0.9, FACE, 0] }),
  );
  ball(0.025, GLOW, over[0], over[1] - 0.025, over[2], { delay: 1.55, flat: true, noInk: true });

  tick((t) => {
    // The tracker beeps faster and faster, the rings spin; the man under the lid peeps and ducks.
    rings.forEach((ring, i) => (ring.rotation.z = t * (i ? -2 : 3)));
    const beep = Math.floor(t * 6) % 3 !== 2;
    screen.color.set(beep ? GLOW : 0x3a5010);
    const peep = Math.sin(t * 0.9);
    const up = peep > -0.4;
    lid.rotation.x = up ? -0.3 : -0.05;
    eyes.forEach((eye) => (eye.visible = up && Math.floor(t * 2) % 7 !== 3));
    lantern.visible = Math.floor(t * 5) % 17 !== 9;
  });

  return { width: 4.9, height: 4.5, lookY: 1.6 };
}
