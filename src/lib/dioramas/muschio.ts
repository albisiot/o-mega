import { BoxGeometry, Color, CylinderGeometry, SphereGeometry } from "three";
import { CYAN, INK, MAGENTA, colorOf, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { column, floor, lamp, skyline } from "@/lib/diorama-props";

/**
 * Muschio (P264): the tracker of the Gente della Selva reads the moss in an overgrown ruin
 * garden at night, the city's towers behind. Kneeling in his patched coat, his hand on the moss
 * of a fallen column, he looks up: past it a trail of footprints lights up one after the other
 * towards a child's lost shoe. People lie, footprints don't; nor does he need the phone that lies
 * in the moss with its map still glowing, and that he has never learnt to use.
 */
export function muschio(kit: Kit): Framing {
  const { add, box, ball, decorate, tick, motes } = kit;
  const MOSS = [0x3f7a3a, 0x5a8a30, 0x2f6a3a];
  const BLOOM = [0x8a2a6a, 0xa8306a];
  const MARBLE = 0x7c9cb4;
  const F = octagonBase(kit, 0x1c2420);
  const G = floor(kit, F, 0.06, 0x223428, 0x1a2a20, 0);

  // The city far behind, a lamp, a broken column, magenta shrubs and moss everywhere.
  skyline(kit, -1.95, G, 0.1, [0x2a2f4a, 0x3a2a4a, 0x22344a], -1.15, 1.15);
  const light = lamp(kit, 1.6, -0.6, G, 0.3, 2.3);
  column(kit, -1.45, -0.95, G, 0.2, 2.2, true, MARBLE);
  ball(0.17, MOSS[1], -1.45, G + 1.38, -0.95, { delay: 0.45 });
  const tuft = (x: number, z: number, r: number, color: number, delay: number) =>
    add(new SphereGeometry(r, 12, 8).scale(1, 0.3, 1), color, x, G, z, { delay, ink: 1.03 });
  [
    [-1.0, -0.3, 0.45],
    [0.4, -0.9, 0.5],
    [1.4, 0.2, 0.4],
    [-1.6, 0.6, 0.35],
    [0.9, 1.5, 0.35],
    [-0.4, 1.5, 0.3],
  ].forEach(([x, z, r], i) => tuft(x, z, r, MOSS[i % 3], 0.2 + i * 0.03));
  [
    [-1.75, -0.35, 0.28],
    [-1.2, -1.3, 0.22],
    [0.95, -1.35, 0.26],
    [1.95, -0.1, 0.2],
  ].forEach(([x, z, r], i) => {
    ball(r, BLOOM[i % 2], x, G, z, { delay: 0.3 + i * 0.04 });
    ball(r * 0.7, BLOOM[(i + 1) % 2], x + r * 0.7, G, z + 0.1, { delay: 0.32 + i * 0.04 });
  });
  // A column drum fallen on its side, half drowned in moss.
  const drum = add(new CylinderGeometry(0.22, 0.22, 0.8, 12).rotateZ(Math.PI / 2), MARBLE, 0.75, G, -1.05, { delay: 0.4, rotation: [0, 0.5, 0] });
  decorate(drum, new BoxGeometry(0.8, 0.02, 0.01), 0x5d7a90, [[0, 0.22, 0.2]]);
  tuft(0.75, -1.05, 0.3, MOSS[0], 0.45).position.y = G + 0.3;

  // Muschio, kneeling in his patched coat over a green hood, his hand on a mossy drum.
  const X = -0.45;
  const Z = 0.1;
  const FACE = 0.4;
  const c = Math.cos(FACE);
  const s = Math.sin(FACE);
  const at = (lx: number, ly: number, lz: number): Point => [X + lx * c + lz * s, G + ly, Z - lx * s + lz * c];
  const log = at(-0.95, 0, 0.35);
  const drumSide = add(new CylinderGeometry(0.26, 0.26, 1.0, 14).rotateZ(Math.PI / 2), MARBLE, ...log, { delay: 0.5, rotation: [0, FACE, 0] });
  decorate(drumSide, new BoxGeometry(1.0, 0.02, 0.01), 0x5d7a90, [
    [0, 0.2, 0.17],
    [0, 0.34, 0.25],
  ]);
  add(new SphereGeometry(0.42, 12, 8).scale(1.25, 0.22, 0.65), MOSS[1], log[0], G + 0.44, log[2], { delay: 0.56, rotation: [0, FACE, 0] });
  const tracker = figure(kit, {
    x: X,
    z: Z,
    y: G,
    facing: FACE,
    height: 2.4,
    build: "slim",
    skin: 0xc89a78,
    hair: { style: "curly", color: 0x2a3a2e },
    face: { mouth: "neutral", brows: "raised", eyes: 0x3a4a2a, marks: 0x7a4a2a },
    top: { kind: "coat", color: 0x7a5232, accent: 0x2f5a3a },
    bottom: { kind: "trousers", color: 0x2a3a30 },
    shoes: 0x2a2622,
    arms: [
      [-0.62, 0.66, 0.42],
      [0.22, 0.66, 0.46],
    ],
    legs: "kneel",
    delay: 0.8,
  });
  const o = (delay: number): { delay: number; rotation: [number, number, number] } => ({ delay, rotation: [0, FACE, 0] });
  add(new SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0x2f5a3a, ...tracker.at(0, 1.36, -0.2), o(1.25));
  // Patches on the coat, the satchel at his hip and its strap.
  [
    [-0.15, 1.2, 0x5a3a22],
    [0.14, 0.95, 0x8a6a42],
  ].forEach(([lx, ly, color], i) => box(0.12, 0.12, 0.02, color, ...tracker.at(lx, ly, 0.22), o(1.3 + i * 0.02)));
  box(0.26, 0.24, 0.12, 0x5a3a22, ...tracker.at(0.38, 0.55, 0.12), o(1.32));
  limb(kit, tracker.at(-0.22, 1.4, 0.2), tracker.at(0.36, 0.78, 0.22), 0.022, 0.022, 0x3a2a1c, { delay: 1.34, noInk: true });

  // The trail past the drum: footprints lighting up one after the other, to a lost shoe.
  const trail: [number, number, number][] = [
    [-0.1, 1.05, 0.2],
    [0.25, 1.2, 0.1],
    [0.6, 1.3, 0.0],
    [0.95, 1.2, -0.2],
    [1.25, 1.02, -0.5],
    [1.5, 0.78, -0.7],
  ];
  const prints = trail.map(([x, z, turn], i) =>
    add(new CylinderGeometry(0.075, 0.075, 0.01, 10).scale(1, 1, 1.8), 0x2a5a4a, x, G + 0.004, z + (i % 2 ? 0.06 : -0.06), {
      delay: 1.0 + i * 0.05,
      flat: true,
      noInk: true,
      rotation: [0, turn + Math.PI / 2, 0],
    }),
  );
  const shoe = box(0.14, 0.1, 0.24, MAGENTA, 1.8, G, 0.45, { delay: 1.4, rotation: [0, 0.8, 0.3] });
  decorate(shoe, new BoxGeometry(0.12, 0.012, 0.03), 0xf4f0e6, [[0, 0.1, 0.05]]);

  // The phone in the moss, map still on, which he has no use for.
  const phone = box(0.22, 0.03, 0.38, 0x1a1a22, -0.95, G + 0.01, 1.3, { delay: 1.1, rotation: [0, 0.3, 0] });
  const screen = decorate(phone, new BoxGeometry(0.18, 0.004, 0.32), 0x1f6a8a, [[0, 0.031, 0]]);
  decorate(phone, new BoxGeometry(0.045, 0.006, 0.045), MAGENTA, [[0.03, 0.034, -0.04]]);
  decorate(phone, new BoxGeometry(0.01, 0.006, 0.22), INK, [[-0.03, 0.035, 0.03, 0]]);
  tuft(-0.86, 1.48, 0.14, MOSS[0], 1.15);

  motes(10, 0xd8ff6a, 0.025, [-1.6, G + 0.3, -1.2], [1.6, G + 2.2, 1.2], 1);
  const dim = new Color(0x2a5a4a);
  const lit = new Color(CYAN);
  tick((t) => {
    const head = (t * 2.2) % (prints.length + 3);
    prints.forEach((print, i) => colorOf(print).lerpColors(dim, lit, Math.max(0, 1 - Math.abs(head - i) * 0.55)));
    screen.color.setHex(Math.floor(t * 1.5) % 4 === 3 ? 0x2a8ab0 : 0x1f6a8a);
    light.visible = Math.floor(t * 6) % 23 !== 11;
  });

  return { width: 4.9, height: 4.2, lookY: 1.3 };
}
