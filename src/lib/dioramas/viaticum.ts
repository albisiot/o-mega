import { BoxGeometry, Color, CylinderGeometry, SphereGeometry, TorusGeometry, type Group, type Mesh, type MeshToonMaterial } from "three";
import { ORANGE, YELLOW, archMouth, colorOf, limb, octagonBase, zigzag, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Viaticum (P208): the old night nurse in the ward of persistent cases, by moonlight. Tall and
 * stooped in his long grey coat with fourteen buttoned pockets, white cap, felt stole, leaning
 * on an olive-wood cane, he holds up a jar in which a small amber figure glows: what was taken
 * from the old woman asleep in the iron bed, tied to her still by a thread of light, kept for
 * when she wants it back. Tea is going cold on the bedside table. From his own pockets other
 * little amber faces keep peeking out: the ones nobody came back for, that he carries in him.
 */
export function viaticum(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const COAT = 0xb8bcc0;
  const IRON = 0x3a3f4c;
  const LINEN = 0xe8e4dc;
  const AMBER = 0xffb040;
  const F = octagonBase(kit, 0x1c1e2a);
  const G = floor(kit, F, 0.06, 0x40465a, 0x2e3242, 0.4);

  // The ward's back wall: an arched window on the moon over the gulf, a shelf of two jars.
  const wall = box(2.8, 3.0, 0.25, 0x2e3448, 0, G, -1.55, { delay: 0.1, ink: 1.02 });
  decorate(wall, archMouth(0.45, 1.0), 0x16203a, [[-0.65, 1.05, 0.125]]);
  decorate(wall, new BoxGeometry(0.9, 0.3, 0.01), 0x0f3a52, [[-0.65, 1.2, 0.15]]);
  decorate(wall, new BoxGeometry(0.03, 0.03, 0.01), YELLOW, [
    [-0.95, 1.32, 0.156],
    [-0.8, 1.38, 0.156],
    [-0.62, 1.34, 0.156],
    [-0.42, 1.4, 0.156],
  ]);
  decorate(wall, new CylinderGeometry(0.11, 0.11, 0.01, 18).rotateX(Math.PI / 2), 0xf4ecc8, [[-0.5, 2.15, 0.15]]);
  decorate(wall, new BoxGeometry(0.03, 1.45, 0.02), IRON, [[-0.65, 1.78, 0.16]]);
  decorate(wall, new BoxGeometry(0.9, 0.03, 0.02), IRON, [[-0.65, 1.75, 0.16]]);
  box(1.0, 0.05, 0.3, 0x5e4a3a, 0.75, G + 1.55, -1.3, { delay: 0.2 });
  [0.5, 0.95].forEach((x, k) => {
    const jar = cylinder(0.11, 0.11, 0.26, 0x1d3a48, x, G + 1.6, -1.3, { delay: 0.25 + k * 0.04 }, 14);
    decorate(jar, new SphereGeometry(0.03, 8, 6), AMBER, [[0, 0.17, 0.09]]);
    decorate(jar, new BoxGeometry(0.06, 0.08, 0.01), AMBER, [[0, 0.08, 0.1]]);
    cylinder(0.08, 0.08, 0.04, 0xb08d3c, x, G + 1.86, -1.3, { delay: 0.28 + k * 0.04 }, 12);
  });

  // The iron bed, head to the wall; an old woman asleep under a grey-blue blanket.
  const BX = 1.22;
  [-0.62, 1.05].forEach((z, k) =>
    [-1, 1].forEach((side) => cylinder(0.025, 0.025, k ? 0.62 : 0.95, IRON, BX + side * 0.42, G, z, { delay: 0.3, noInk: true }, 8)),
  );
  box(0.86, 0.03, 0.03, IRON, BX, G + 0.93, -0.62, { delay: 0.32, noInk: true });
  box(0.86, 0.03, 0.03, IRON, BX, G + 0.6, 1.05, { delay: 0.32, noInk: true });
  [-0.2, 0, 0.2].forEach((dx) => box(0.02, 0.4, 0.02, IRON, BX + dx, G + 0.53, -0.62, { delay: 0.33, noInk: true }));
  box(0.84, 0.2, 1.62, LINEN, BX, G + 0.3, 0.22, { delay: 0.35 });
  box(0.56, 0.12, 0.3, 0xf4f0e6, BX, G + 0.5, -0.38, { delay: 0.38 });
  const blanket = box(0.9, 0.12, 1.15, 0x4a5a78, BX, G + 0.48, 0.42, { delay: 0.4 });
  decorate(blanket, new BoxGeometry(0.92, 0.02, 0.1), LINEN, [[0, 0.11, -0.5]]);
  add(new SphereGeometry(0.2, 14, 10).scale(1, 0.55, 2.2), 0x4a5a78, BX, G + 0.58, 0.35, { delay: 0.42 });
  const sleeper = ball(0.15, 0xe0b8a0, BX, G + 0.6, -0.36, { delay: 0.45 });
  decorate(sleeper, new BoxGeometry(0.05, 0.012, 0.02), 0x3a2a22, [
    [-0.05, 0.29, 0.05],
    [0.05, 0.29, 0.05],
  ]);
  decorate(sleeper, new BoxGeometry(0.05, 0.012, 0.02), 0x9a4a4a, [[0, 0.28, 0.11]]);
  add(new SphereGeometry(0.16, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(-1.2), 0xc8c8cc, BX, G + 0.6, -0.42, { delay: 0.47 });

  // The bedside table: a cup of tea, its steam, the pot.
  const side = box(0.42, 0.62, 0.38, 0x8a93a3, 0.5, G, -0.78, { delay: 0.5 });
  decorate(side, new BoxGeometry(0.06, 0.03, 0.01), IRON, [[0, 0.42, 0.195]]);
  cylinder(0.08, 0.08, 0.015, LINEN, 0.42, G + 0.62, -0.7, { delay: 0.55 }, 14);
  cylinder(0.05, 0.04, 0.07, LINEN, 0.42, G + 0.635, -0.7, { delay: 0.56 }, 12);
  ball(0.09, 0x2f6f86, 0.6, G + 0.62, -0.84, { delay: 0.58 });
  motes(5, 0xe8eef4, 0.02, [0.38, G + 0.75, -0.72], [0.46, G + 1.2, -0.68], 0.9);

  // Viaticum, stooped, leaning on his cane, the jar held up in his left hand.
  const X = -0.42;
  const Z = 0.42;
  const T = 0.5;
  const nurse = figure(kit, {
    x: X,
    z: Z,
    y: G,
    facing: T,
    height: 2.5,
    build: "slim",
    skin: 0xc89a80,
    hair: { style: "short", color: 0xe0ddd8 },
    face: { mouth: "neutral", brows: "worried", beard: "stubble", beardColor: 0xe8e4dc, marks: 0xa87860 },
    headwear: { kind: "beanie", color: LINEN, accent: 0xd4d0c6 },
    top: { kind: "coat", color: COAT, accent: 0xa8acb0 },
    bottom: { kind: "long-skirt", color: COAT },
    shoes: 0x2a2622,
    scarf: 0x4a4a52,
    arms: [
      [-0.42, 1.0, 0.34],
      [0.38, 1.36, 0.46],
    ],
    delay: 0.8,
  });
  const at = nurse.at;
  const r: Point = [0, T, 0];
  // The felt stole's two ends, fringed, down his chest.
  [-0.06, 0.1].forEach((lx, k) => {
    const end = box(0.11, 0.62, 0.03, 0x4a4a52, ...at(lx, 1.16, 0.25), { delay: 1.3 + k * 0.03, rotation: r });
    decorate(
      end,
      new BoxGeometry(0.012, 0.06, 0.01),
      0x3a3a42,
      [-0.04, -0.015, 0.015, 0.04].map((dx) => [dx, -0.03, 0] as Point),
    );
  });
  // Fourteen pockets, buttoned with bone.
  const pocketAt: Point[] = [];
  [0.34, 0.48, 0.62, 0.76, 0.9, 1.04, 1.18].forEach((y) => [-0.17, 0.17].forEach((lx) => pocketAt.push([lx, y, 0.34 - y * 0.085])));
  pocketAt.forEach(([lx, y, lz], k) => {
    const pocket = box(0.12, 0.1, 0.03, 0xa4a8ae, ...at(lx, y, lz), { delay: 1.35 + k * 0.01, rotation: r });
    decorate(pocket, new SphereGeometry(0.014, 6, 4), 0xf0ead8, [[0, 0.075, 0.018]]);
  });
  // From some of them, small amber faces peep out and duck back.
  const faces: Group[] = pocketAt.map(([lx, y, lz], k) => {
    const face = ball(0.045, AMBER, ...at(lx, y + 0.07, lz + 0.01), { delay: 1.6, flat: true, noInk: true });
    decorate(face, new BoxGeometry(0.012, 0.016, 0.01), 0x6a3a10, [
      [-0.015, 0.05, 0.042],
      [0.015, 0.05, 0.042],
    ]);
    face.visible = k % 5 === 1;
    return face;
  });

  // The olive-wood cane.
  const [grip, hold] = nurse.hands;
  limb(kit, at(-0.46, 0, 0.42), grip, 0.022, 0.025, 0x7a5a3a, { delay: 1.4 });
  add(new TorusGeometry(0.06, 0.02, 6, 12, Math.PI), 0x7a5a3a, grip[0], grip[1] - 0.02, grip[2], { delay: 1.42, rotation: [0, T, 0] });

  // The jar: glass, a brass lid, and the little amber figure glowing in it.
  const jarAt: Point = [hold[0], hold[1] - 0.1, hold[2] + 0.04];
  const glass = cylinder(0.12, 0.12, 0.3, 0xbfeeff, ...jarAt, { delay: 1.5, noInk: true }, 18);
  const material = (glass.children[0] as Mesh).material as MeshToonMaterial;
  material.transparent = true;
  material.opacity = 0.3;
  material.depthWrite = false;
  cylinder(0.125, 0.125, 0.05, 0xb08d3c, jarAt[0], jarAt[1] + 0.3, jarAt[2], { delay: 1.52 }, 18);
  const soul = [
    cylinder(0.035, 0.05, 0.1, AMBER, jarAt[0], jarAt[1] + 0.05, jarAt[2], { delay: 1.55, flat: true, noInk: true }, 10),
    ball(0.035, AMBER, jarAt[0], jarAt[1] + 0.15, jarAt[2], { delay: 1.56, flat: true, noInk: true }),
  ];
  // The thread of light from the jar to her, so she can still ask for it.
  const head: Point = [BX, G + 0.78, -0.36];
  const lid: Point = [jarAt[0], jarAt[1] + 0.36, jarAt[2]];
  const thread = zigzag(
    kit,
    Array.from({ length: 9 }, (_, k) => {
      const u = k / 8;
      return [lid[0] + (head[0] - lid[0]) * u, lid[1] + (head[1] - lid[1]) * u + Math.sin(u * Math.PI) * 0.45, lid[2] + (head[2] - lid[2]) * u] as Point;
    }),
    0.012,
    AMBER,
    1.6,
  );

  const amber = new Color(AMBER);
  const pale = new Color(0xfff0c0);
  const dim = new Color(ORANGE);
  tick((t) => {
    // The residue breathes in its jar, the thread with it; the faces in his pockets come and go.
    const k = (Math.sin(t * 1.8) + 1) / 2;
    soul.forEach((part) => colorOf(part).lerpColors(amber, pale, k));
    thread.forEach((piece, i) => colorOf(piece).lerpColors(dim, pale, (Math.sin(t * 3 - i * 0.6) + 1) / 2));
    const turn = Math.floor(t / 1.3);
    faces.forEach((face, i) => (face.visible = (i * 5 + turn) % 7 === 1));
  });

  return { width: 4.9, height: 4.4, lookY: 1.45 };
}
