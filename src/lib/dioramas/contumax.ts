import { BoxGeometry, Color, ConeGeometry, CylinderGeometry, MathUtils, SphereGeometry } from "three";
import { CYAN, INK, MAGENTA, YELLOW, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, table } from "@/lib/diorama-props";

/**
 * Contumax (P158): the old supervillain, now the weatherman of a TV channel, stands in the studio
 * in his heavy black cloak with the big black beads, both gnarled hands on his sceptre. On the
 * weather wall behind him a cloud slides over the city's sun, and as it does the studio's
 * spotlight goes dim: he took the sun away once, for eleven months. The camera's red light
 * blinks; his armchair waits with a glass of water, because his legs no longer hold him long.
 */
export function contumax(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const FRAME = 0x2a2a36;
  const SCREEN = 0x13233a;
  const CLOTH = 0x2a2834;
  const BEAD = 0x4a4458;
  const STEEL = 0x4a4f5c;
  const F = octagonBase(kit, 0x1d1b28);
  const G = floor(kit, F, 0.06, 0x24222e, 0x1a1822, 0.6);

  // The weather wall: the coast in cyan, the sun in yellow, a cloud that drifts across it.
  [-1.3, 0.5].forEach((x) => box(0.08, 0.56, 0.08, FRAME, x, G, -1.45, { delay: 0.1 }));
  const wall = box(2.1, 1.4, 0.1, FRAME, -0.4, G + 0.55, -1.45, { delay: 0.14, ink: 1.02 });
  decorate(wall, new BoxGeometry(1.96, 1.26, 0.01), SCREEN, [[0, 0.7, 0.052]]);
  decorate(wall, new BoxGeometry(0.34, 0.025, 0.01), CYAN, [
    [-0.75, 0.32, 0.058, 0.35],
    [-0.45, 0.42, 0.058, -0.25],
    [-0.15, 0.38, 0.058, 0.3],
    [0.15, 0.5, 0.058, -0.45],
    [0.45, 0.6, 0.058, 0.2],
    [0.75, 0.58, 0.058, -0.1],
  ]);
  decorate(wall, new BoxGeometry(0.06, 0.06, 0.01), 0x2f8fb0, [
    [-0.55, 0.22, 0.058],
    [-0.1, 0.25, 0.058],
    [0.4, 0.3, 0.058],
  ]);
  decorate(wall, new CylinderGeometry(0.15, 0.15, 0.01, 20).rotateX(Math.PI / 2), YELLOW, [[0.35, 1.0, 0.06]]);
  decorate(
    wall,
    new BoxGeometry(0.03, 0.08, 0.01),
    YELLOW,
    Array.from({ length: 8 }, (_, k) => {
      const a = (k / 8) * Math.PI * 2;
      return [0.35 + Math.sin(a) * 0.22, 1.0 + Math.cos(a) * 0.22, 0.06, -a] as [number, number, number, number];
    }),
  );
  const sunX = -0.05;
  const cloudY = G + 1.43;
  const cloud = [
    [-0.15, 0, 0.12],
    [0, 0.06, 0.16],
    [0.15, 0, 0.11],
  ].map(([dx, dy, r], i) => ball(r, 0xc8d0dc, sunX + 0.5 + dx, cloudY + dy, -1.34, { delay: 0.3 + i * 0.03 }));
  const cloudDx = [-0.15, 0, 0.15];

  // The studio spotlight on its stand, aimed at him.
  cylinder(0.03, 0.04, 1.8, STEEL, 1.3, G, -0.95, { delay: 0.2 }, 8);
  [0, 2.1, 4.2].forEach((a) => limb(kit, [1.3, G + 0.3, -0.95], [1.3 + Math.sin(a) * 0.3, G, -0.95 + Math.cos(a) * 0.3], 0.02, 0.02, STEEL, { delay: 0.22, noInk: true }));
  const housing = add(new CylinderGeometry(0.17, 0.13, 0.32, 14).rotateX(Math.PI / 2), FRAME, 1.3, G + 1.68, -0.95, { delay: 0.26 });
  housing.rotation.order = "YXZ";
  housing.rotation.set(0.2, Math.atan2(-1.5, 1.25), 0);
  const lamp = decorate(housing, new CylinderGeometry(0.15, 0.15, 0.01, 16).rotateX(Math.PI / 2), YELLOW, [[0, 0.17, 0.165]]);

  // The camera on its tripod, its red light on.
  const camAt: Point = [1.45, G + 1.0, 0.85];
  const yaw = Math.atan2(-0.15 - camAt[0], 0.25 - camAt[2]);
  [0.4, 2.5, 4.6].forEach((a) => limb(kit, [camAt[0] + Math.sin(a) * 0.36, G, camAt[2] + Math.cos(a) * 0.36], [camAt[0], camAt[1], camAt[2]], 0.022, 0.03, STEEL, { delay: 0.3 }));
  const body = box(0.3, 0.32, 0.52, FRAME, ...camAt, { delay: 0.34, rotation: [0, yaw, 0] });
  decorate(body, new BoxGeometry(0.31, 0.04, 0.3), STEEL, [[0, 0.28, -0.05]]);
  add(new CylinderGeometry(0.1, 0.12, 0.22, 14).rotateX(Math.PI / 2), INK, camAt[0] + Math.sin(yaw) * 0.32, camAt[1] + 0.06, camAt[2] + Math.cos(yaw) * 0.32, { delay: 0.38, rotation: [0, yaw, 0] });
  const tally = box(0.07, 0.05, 0.05, MAGENTA, camAt[0] + Math.sin(yaw) * 0.2, camAt[1] + 0.32, camAt[2] + Math.cos(yaw) * 0.2, { delay: 0.4, flat: true });

  // His armchair, and a glass of water with his pills.
  const ARMCHAIR = 0xd8cfb8;
  box(0.75, 0.42, 0.65, ARMCHAIR, -1.45, G, 0.45, { delay: 0.3, rotation: [0, 0.5, 0] });
  box(0.75, 0.6, 0.16, ARMCHAIR, -1.45 - Math.sin(0.5) * 0.28, G + 0.42, 0.45 - Math.cos(0.5) * 0.28, { delay: 0.33, rotation: [0, 0.5, 0] });
  [-1, 1].forEach((side) => box(0.14, 0.2, 0.62, 0xc8bea4, -1.45 + Math.cos(0.5) * side * 0.33, G + 0.42, 0.45 - Math.sin(0.5) * side * 0.33, { delay: 0.35, rotation: [0, 0.5, 0] }));
  table(kit, -1.0, 1.35, G, 0.4, true, 0x3a4050, 0.6);
  cylinder(0.05, 0.045, 0.14, 0xbfe8f0, -1.05, G + 0.64, 1.32, { delay: 0.5 }, 12);
  cylinder(0.035, 0.035, 0.09, 0xf2f0ea, -0.88, G + 0.64, 1.42, { delay: 0.52 }, 10);

  // Contumax, both hands on the sceptre.
  const theta = 0.3;
  const villain = figure(kit, {
    x: -0.15,
    z: 0.25,
    y: G,
    facing: theta,
    height: 2.25,
    build: "slim",
    skin: 0xd8a890,
    hair: { style: "bald", color: 0xe8e4da },
    face: { mouth: "frown", brows: "angry", marks: 0xa07060 },
    top: { kind: "robe", color: CLOTH },
    cape: 0x1e1c28,
    scarf: CLOTH,
    shoes: 0x14121c,
    arms: [
      [-0.2, 1.38, 0.38],
      [-0.15, 1.18, 0.4],
    ],
    delay: 0.9,
  });
  const at = villain.at;
  // A white fringe round the back of his bald head.
  [-1, 1].forEach((s) => [0.0, -0.1].forEach((dz, k) => ball(0.075, 0xe8e4da, ...at(s * (0.17 - k * 0.03), 1.92, dz - 0.04), { delay: 1.35 })));
  // The black beads over his right shoulder.
  (
    [
      [-0.05, 1.28, 0.23],
      [-0.13, 1.4, 0.23],
      [-0.21, 1.52, 0.21],
      [-0.28, 1.64, 0.17],
      [-0.34, 1.76, 0.09],
      [-0.38, 1.82, -0.04],
      [-0.4, 1.72, -0.16],
      [-0.4, 1.58, -0.24],
      [-0.38, 1.44, -0.28],
    ] as Point[]
  ).forEach((p, i) => ball(0.068, BEAD, ...at(p[0], p[1] - 0.068, p[2]), { delay: 1.4 + i * 0.02 }));
  // The sceptre: dark wood, iron rings, a knob on top.
  const foot = at(-0.21, 0, 0.42);
  const top = at(-0.19, 1.58, 0.38);
  limb(kit, foot, top, 0.03, 0.035, 0x3a2a24, { delay: 1.3 });
  ball(0.075, 0x4a3a30, top[0], top[1], top[2], { delay: 1.35 });
  add(new ConeGeometry(0.035, 0.12, 8), 0x4a3a30, top[0], top[1] + 0.14, top[2], { delay: 1.38 });
  add(new SphereGeometry(0.03, 8, 6), YELLOW, top[0], top[1] + 0.26, top[2], { delay: 1.4, flat: true });

  const lampOn = new Color(YELLOW);
  const lampOff = new Color(0x3a3420);
  tick((t) => {
    // The cloud creeps over the sun on the screen, and the spotlight dies with it.
    const p = t % 8;
    const cover = MathUtils.smoothstep(p, 2, 3.5) * (1 - MathUtils.smoothstep(p, 6, 7.5));
    const x = sunX + 0.5 * (1 - cover);
    cloud.forEach((puff, i) => (puff.position.x = x + cloudDx[i]));
    lamp.color.lerpColors(lampOn, lampOff, cover * 0.85);
    tally.visible = Math.floor(t * 1.6) % 2 === 0;
  });

  return { width: 4.9, height: 4.4, lookY: 1.45 };
}
