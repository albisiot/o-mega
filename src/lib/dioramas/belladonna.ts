import { BoxGeometry, ConeGeometry, CylinderGeometry, Group, SphereGeometry, TorusGeometry } from "three";
import { MAGENTA, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { facade, floor } from "@/lib/diorama-props";

/**
 * Belladonna (P016): the witch of the Figli dell'Ultima crosses the old town's square at night
 * under the bell tower, a sprig of bellflowers glowing in her raised hand and golden bells all
 * over her robe. The tower's bell swings and every bell on her rings, rings of sound spreading
 * round them: she cannot sneak up on anyone, so the houses behind her have shut every shutter.
 */
export function belladonna(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const GOLD = 0xd9a030;
  const GOLD_DARK = 0x9a6a1a;
  const VIOLET = 0x9b5cff;
  const STEM = 0x2f6f4f;
  const STONE = 0x3a2a4a;
  const STONE_LIGHT = 0x4a3658;
  const HAIR = 0x1a1420;
  const F = octagonBase(kit, 0x221a2a);
  const G = floor(kit, F, 0.06, 0x2e2838, 0x1e1a26, 0.45);

  /** A part hung from a pivot at its top, swung by `angle` about the z axis. */
  const swing = (part: Group, pivot: Point, length: number, angle: number) => {
    part.rotation.z = angle;
    part.position.set(pivot[0] + length * Math.sin(angle), pivot[1] - length * Math.cos(angle), pivot[2]);
  };
  /** A ring of sound spreading round a point, again and again, facing the camera at rest. */
  const echo = (at: Point, radius: number, phase: number, delay: number) => {
    const part = add(new TorusGeometry(radius, 0.014, 6, 32), MAGENTA, at[0], at[1] - radius, at[2], { delay, flat: true, noInk: true, rotation: [0, 0.35, 0] });
    const mesh = part.children[0];
    tick((t) => {
      const u = (t * 0.6 + phase) % 1;
      const s = 0.6 + u * 0.9;
      mesh.scale.setScalar(s);
      part.position.y = at[1] - radius * s;
      mesh.visible = u < 0.85;
    });
  };
  /** A sprig of bellflowers: a stem and little violet bells hanging round its top. */
  const sprig = (x: number, y: number, z: number, height: number, delay: number, size = 1) => {
    cylinder(0.012 * size, 0.016 * size, height, STEM, x, y, z, { delay, noInk: true }, 6);
    [0, 2.1, 4.2, 1.05].forEach((angle, k) =>
      add(new ConeGeometry(0.045 * size, 0.08 * size, 7), VIOLET, x + Math.cos(angle) * 0.06 * size, y + height - (0.1 + k * 0.05) * size, z + Math.sin(angle) * 0.06 * size, {
        delay: delay + 0.05 + k * 0.02,
      }),
    );
  };

  // The bell tower: a stone shaft, an open belfry on four piers, a pyramid roof, the bell inside.
  const TX = -1.25;
  const TZ = -1.0;
  const shaft = box(0.95, 2.5, 0.95, STONE, TX, G, TZ, { delay: 0.1, ink: 1.02 });
  decorate(shaft, new BoxGeometry(0.12, 0.36, 0.01), 0x141a26, [
    [0, 1.75, 0.48],
    [0, 0.95, 0.48],
  ]);
  decorate(shaft, new BoxGeometry(0.95, 0.05, 0.01), STONE_LIGHT, [
    [0, 1.35, 0.48],
    [0, 2.35, 0.48],
  ]);
  [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => box(0.16, 0.75, 0.16, STONE_LIGHT, TX + sx * 0.39, G + 2.5, TZ + sz * 0.39, { delay: 0.2 })));
  box(0.95, 0.06, 0.08, 0x2a1e36, TX, G + 3.19, TZ, { delay: 0.24 });
  box(1.0, 0.12, 1.0, STONE_LIGHT, TX, G + 3.25, TZ, { delay: 0.26 });
  add(new ConeGeometry(0.7, 0.62, 4), 0x2a1e36, TX, G + 3.37, TZ, { delay: 0.3, rotation: [0, Math.PI / 4, 0] });
  const bell = add(new CylinderGeometry(0.1, 0.22, 0.36, 14), GOLD, TX, G + 2.83, TZ, { delay: 0.4 });
  decorate(bell, new TorusGeometry(0.22, 0.025, 6, 20).rotateX(Math.PI / 2), GOLD_DARK, [[0, 0.02, 0]]);
  const belfry: Point = [TX, G + 3.19, TZ];
  echo([TX, G + 3.0, TZ + 0.5], 0.4, 0, 1.0);
  echo([TX, G + 3.0, TZ + 0.5], 0.4, 0.5, 1.0);

  // The houses behind her: every shutter closed as she passes, the door shut.
  const wall = facade(kit, 0.9, -1.3, G, 0.15, { width: 1.6, height: 2.4, color: 0x2e2440, windows: 2, floors: 2, door: true, lit: 0x1a1626, shutters: 0x4a2a52 });
  const shut: Point[] = [
    [-0.4, 0.75, 0.157],
    [-0.4, 1.7, 0.157],
    [0.4, 1.7, 0.157],
  ];
  decorate(wall, new BoxGeometry(0.32, 0.3, 0.012), 0x4a2a52, shut);
  decorate(wall, new BoxGeometry(0.014, 0.3, 0.014), 0x1a1020, shut.map(([x, y, z]) => [x, y, z + 0.004] as Point));

  // Bellflowers sprouting from the cracks of the paving where she walks.
  [
    [-0.75, 1.0],
    [-0.55, 1.15],
    [1.35, 0.85],
    [1.5, 0.7],
  ].forEach(([x, z], i) => sprig(x, G, z, 0.3 + (i % 2) * 0.1, 1.6 + i * 0.05));

  // Belladonna: long black hair, a violet robe and cloak hung with bells, the sprig held up.
  const witch = figure(kit, {
    x: 0.35,
    z: 0.45,
    y: G,
    facing: 0.35,
    height: 2.5,
    build: "slim",
    skin: 0xd6aca2,
    hair: { style: "bald", color: HAIR },
    face: { mouth: "smirk", brows: "angry", eyes: 0x5a3a8a },
    top: { kind: "robe", color: 0x4a1d4f, accent: 0x6a2a6a },
    cape: 0x3a1640,
    scarf: 0x4a1d4f,
    shoes: HAIR,
    arms: [
      [-0.62, 1.15, 0.22],
      [0.34, 1.98, 0.42],
    ],
    delay: 0.8,
  });
  // Her hair is built here (the figure's long hair covers the face and its short hair lets the
  // scalp show): a cap over the crown, a mane down her back and a few big curls round her head.
  const [hx, hy, hz] = witch.head;
  const RH = witch.headRadius;
  const cap = add(new SphereGeometry(RH * 1.04, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.97, 1.06, 1), HAIR, hx, hy, hz, { delay: 1.2 });
  cap.rotation.order = "YXZ";
  cap.rotation.set(-0.5, 0.35, 0);
  add(new CylinderGeometry(RH * 1.05, RH * 1.7, RH * 4.2, 16, 1, true, Math.PI / 2 - 0.3, Math.PI + 0.6), HAIR, hx, hy - RH * 3.5, hz - 0.03, {
    delay: 1.2,
    rotation: [0, 0.35, 0],
  });
  [
    [-0.28, 2.18, -0.1],
    [0.28, 2.2, -0.1],
    [-0.34, 1.9, -0.12],
    [0.34, 1.92, -0.12],
    [0, 2.38, -0.16],
  ].forEach(([x, y, z], i) => {
    const p = witch.at(x, y, z);
    ball(0.12, HAIR, p[0], p[1] - 0.12, p[2], { delay: 1.25 + i * 0.02 });
  });
  const flowers = witch.hands[1];
  sprig(flowers[0], flowers[1] - 0.05, flowers[2] + 0.02, 0.6, 1.35, 1.6);
  motes(8, VIOLET, 0.022, [flowers[0] - 0.2, flowers[1], flowers[2] - 0.15], [flowers[0] + 0.2, flowers[1] + 0.7, flowers[2] + 0.15], 1.5);

  // The bells on her: shoulders, sleeves, collar and hem, each swinging on its own.
  const spots: Point[] = [
    [-0.45, 1.5, 0.12],
    [-0.54, 1.27, 0.2],
    [-0.63, 1.02, 0.28],
    [0.43, 1.6, 0.12],
    [0.52, 1.55, 0.24],
    [-0.2, 1.6, 0.27],
    [0.2, 1.6, 0.27],
    [-0.3, 0.3, 0.3],
    [0.28, 0.5, 0.3],
    [0.02, 0.22, 0.36],
  ];
  const bells = spots.map((spot, i) => {
    const pivot = witch.at(...spot);
    const part = cylinder(0.03, 0.065, 0.11, GOLD, pivot[0], pivot[1] - 0.11, pivot[2], { delay: 1.45 + i * 0.03 });
    return { part, pivot };
  });
  [0, 2, 4, 8].forEach((i, k) => {
    const [x, y, z] = bells[i].pivot;
    echo([x, y - 0.06, z + 0.05], 0.16, k * 0.25, 1.8);
  });

  tick((t) => {
    swing(bell, belfry, 0.36, Math.sin(t * 1.6) * 0.45);
    bells.forEach(({ part, pivot }, i) => swing(part, pivot, 0.11, Math.sin(t * 7 + i * 1.3) * 0.3));
  });

  return { width: 4.9, height: 4.6, lookY: 1.75 };
}
