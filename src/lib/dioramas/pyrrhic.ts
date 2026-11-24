import { BoxGeometry, Color, SphereGeometry, type Group } from "three";
import { ORANGE, YELLOW, colorOf, crawl, octagonBase, zigzag, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { car, floor, ring, rubble } from "@/lib/diorama-props";

/**
 * Pyrrhic (P005): the human bomb of the Compagnia Lete has just come through a brick wall, one
 * step from a door he never thought of using. Fists up and grinning, he glows through the cracks
 * in his skin; every pulse sends a shock ring over the ground, a brick on a car roof has set off
 * its alarm, and his burning footprints show he has never once tried to be quiet.
 */
export function pyrrhic(kit: Kit): Framing {
  const { box, decorate, tick, motes } = kit;
  const WALL = 0x4a2238;
  const BRICK = 0x6e2a46;
  const SKIN = 0xb4553e;
  const SCORCH = 0x17111a;
  const F = octagonBase(kit, 0x2a1e26);
  const G = floor(kit, F, 0.06, 0x2f2830, 0x1f1a22, 0.45);

  // The wall: bricks showing through the plaster, a door on the left, the hole he made on the right.
  const WZ = -1.2;
  const bricks = (part: Group, w: number, h: number, seed: number) =>
    decorate(
      part,
      new BoxGeometry(0.26, 0.11, 0.01),
      BRICK,
      Array.from({ length: Math.floor(h / 0.15) * Math.floor(w / 0.3) }, (_, k) => {
        const columns = Math.floor(w / 0.3);
        const r = Math.floor(k / columns);
        const c = k % columns;
        return [-w / 2 + 0.17 + c * 0.3 + (r % 2) * 0.12, 0.09 + r * 0.15, 0.152] as Point;
      }).filter((_, k) => (k * 7 + seed) % 5 < 2),
    );
  const left = box(1.3, 2.5, 0.3, WALL, -1.2, G, WZ, { delay: 0.1, ink: 1.02 });
  bricks(left, 1.3, 2.5, 1);
  decorate(left, new BoxGeometry(0.58, 1.02, 0.01), 0x2a1622, [[0, 0.51, 0.152]]);
  decorate(left, new BoxGeometry(0.46, 0.92, 0.01), 0x23707e, [[0, 0.46, 0.158]]);
  decorate(left, new BoxGeometry(0.06, 0.06, 0.01), YELLOW, [[0.17, 0.46, 0.165]]);
  bricks(box(1.2, 2.2, 0.3, WALL, 1.15, G, WZ, { delay: 0.14, ink: 1.02 }), 1.2, 2.2, 3);
  box(1.13, 0.22, 0.3, WALL, 0, G, WZ, { delay: 0.16 });
  bricks(box(1.13, 0.32, 0.3, WALL, 0, G + 2.05, WZ, { delay: 0.18 }), 1.13, 0.32, 2);
  // Broken bricks round the hole, and the dark room behind with a fire still going.
  [
    [-0.47, 0.55],
    [-0.49, 1.2],
    [-0.45, 1.75],
    [0.47, 0.45],
    [0.49, 1.0],
    [0.45, 1.6],
    [-0.22, 1.93],
    [0.2, 1.95],
  ].forEach(([x, y], i) => box(0.2, 0.13, 0.3, i % 3 ? WALL : BRICK, x, G + y, WZ, { delay: 0.22 + i * 0.02, rotation: [0, 0, (i % 2 ? 1 : -1) * 0.2] }));
  box(1.2, 2.1, 0.04, 0x120c16, 0, G, WZ - 0.12, { delay: 0.2, noInk: true });
  const fire = box(0.7, 0.16, 0.03, ORANGE, 0, G + 0.22, WZ - 0.08, { delay: 0.3, flat: true, noInk: true });

  // Bricks thrown over the street, one of them on the roof of a car whose alarm is going off.
  rubble(kit, 0.05, -0.65, G, 0.35, 7, 0.55, BRICK);
  [
    [-0.7, -0.4, 0.4],
    [1.0, -0.3, -0.8],
    [0.1, 0.95, 1.2],
  ].forEach(([x, z, turn], i) => box(0.26, 0.11, 0.13, BRICK, x, G, z, { delay: 0.4 + i * 0.03, rotation: [0, turn, 0] }));
  const CX = -1.55;
  const CZ = 0.45;
  const CF = Math.PI / 2;
  car(kit, CX, CZ, G, 0.45, 0x2c4a6e, CF);
  const onCar = (dx: number, dz: number): [number, number] => [CX + dx * Math.cos(CF) + dz * Math.sin(CF), CZ - dx * Math.sin(CF) + dz * Math.cos(CF)];
  const [bx, bz] = onCar(0.05, 0);
  box(0.26, 0.11, 0.13, BRICK, bx, G + 0.66, bz, { delay: 0.7, rotation: [0.3, CF + 0.5, 0.2] });
  const hazards = [
    [0.66, 0.24],
    [0.66, -0.24],
    [-0.66, 0.24],
    [-0.66, -0.24],
  ].map(([dx, dz], i) => {
    const [x, z] = onCar(dx, dz);
    return box(0.06, 0.08, 0.1, ORANGE, x, G + 0.26, z, { delay: 0.6 + i * 0.02, flat: true, noInk: true, rotation: [0, CF, 0] });
  });

  // Scorched ground under him and the burning footprints from the hole to where he stands.
  const X = 0.75;
  const Z = 0.45;
  kit.cylinder(0.75, 0.75, 0.006, SCORCH, X, G, Z, { delay: 0.5, flat: true, noInk: true }, 18);
  const prints = [
    [0.1, -0.78],
    [0.38, -0.5],
    [0.5, -0.18],
  ].map(([x, z], i) => {
    box(0.2, 0.006, 0.32, SCORCH, x, G + 0.004, z, { delay: 0.55 + i * 0.05, flat: true, noInk: true, rotation: [0, 0.7, 0] });
    return box(0.11, 0.008, 0.22, ORANGE, x, G + 0.006, z, { delay: 0.6 + i * 0.05, flat: true, noInk: true, rotation: [0, 0.7, 0] });
  });
  const shock = ring(kit, [X, G + 0.01, Z], 0.6, ORANGE, 1.6);

  // Pyrrhic: huge, bare-chested under a torn vest, fists up, grinning; his eyes and cracks glow.
  const H = 2.6;
  const u = H / 2.4;
  const bomb = figure(kit, {
    x: X,
    z: Z,
    y: G,
    facing: 0.3,
    height: H,
    build: "broad",
    skin: SKIN,
    hair: { style: "spiky", color: 0x2a1418 },
    face: { mouth: "grin", brows: "angry", eyes: YELLOW, glow: true, marks: ORANGE },
    top: { kind: "vest", color: 0x3a2a44, accent: SKIN, sleeves: "none" },
    bottom: { kind: "trousers", color: 0x2a2430 },
    belt: 0x141016,
    shoes: 0x1e1a1c,
    arms: ["fist", "fist"],
    legs: "wide",
    delay: 0.8,
  });
  // His hair, as a cap of its own: the figure's spiky cap leaves the top of the head bare.
  const [hx, hy, hz] = bomb.head;
  kit.add(new SphereGeometry(bomb.headRadius * 1.1, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.42), 0x2a1418, hx, hy + 0.06, hz - 0.02, { delay: 1.25, rotation: [-0.1, 0.3, 0] });
  // Glowing cracks winding round both arms and down the chest.
  const SW = 0.5 * u;
  const top = 1.72 * u;
  const cracks: Group[] = [];
  [-1, 1].forEach((s, i) => {
    const shoulder = bomb.at(s * SW, top, 0);
    const elbow = bomb.at(s * (SW + 0.22 * u), top + 0.16 * u, 0.12 * u);
    const hand = bomb.at(s * (SW + 0.06 * u), top + 0.62 * u, 0.18 * u);
    cracks.push(...zigzag(kit, crawl([shoulder, elbow, hand], 3, 0.18, i * 2), 0.03, ORANGE, 1.5 + i * 0.05));
  });
  cracks.push(
    ...zigzag(
      kit,
      [
        [0.02, 1.78, 0.36],
        [0.06, 1.62, 0.37],
        [-0.04, 1.48, 0.37],
        [0.04, 1.34, 0.35],
        [-0.02, 1.2, 0.33],
      ].map(([x, y, z]) => bomb.at(x * u, y * u, z * u)),
      0.03,
      ORANGE,
      1.6,
    ),
  );

  motes(14, 0x5e4e66, 0.06, [-0.2, G + 0.6, -1.15], [0.8, G + 3.2, -0.6], 1.2);
  motes(12, ORANGE, 0.03, [X - 0.7, G + 0.3, Z - 0.4], [X + 0.7, G + 3, Z + 0.5], 1.5);

  const cool = new Color(ORANGE);
  const hot = new Color(YELLOW);
  const rest = bomb.parts.map((part) => part.position.x);
  tick((t) => {
    // He glows harder and harder, the street shakes, then the pulse rolls out and it starts again.
    const charge = (t * 0.6) % 1;
    for (const crack of [...cracks, fire, ...prints]) colorOf(crack).lerpColors(cool, hot, charge);
    const tremble = charge > 0.7 ? Math.sin(t * 60) * 0.012 : 0;
    bomb.parts.forEach((part, i) => (part.position.x = rest[i] + tremble));
    const wave = shock.children[0];
    wave.scale.set(0.5 + charge * 2, 1, 0.5 + charge * 2);
    wave.visible = charge < 0.9;
    const on = Math.floor(t * 3) % 2 === 0;
    hazards.forEach((light) => (light.visible = on));
  });

  return { width: 4.9, height: 4.4, lookY: 1.55 };
}
