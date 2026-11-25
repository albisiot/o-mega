import { BoxGeometry, CylinderGeometry, Group, OctahedronGeometry, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { CYAN, INK, YELLOW, aim, archMouth, archedWall, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, rubble } from "@/lib/diorama-props";

/**
 * Picozza (P280): the Ferrigni miner, granite-skinned, braids red, lamp on her brow, grinning
 * her gap-toothed grin as she drives her pick into a wall of blue crystal under the city;
 * shards fly at every blow and nothing about her is quiet. Beside her, the brick mouth of the
 * first gallery she opened, rails running out of it and a cart heaped with crystal; the cash
 * box on it is for whoever wants the next one: those cost more.
 */
export function picozza(kit: Kit): Framing {
  const { add, box, ball, decorate, tick, motes } = kit;
  const BRICK = 0x4a2e44;
  const ICE = 0x9fe8ff;
  const ROPE = 0xc9a46a;
  const STEEL = 0x6a7080;
  const F = octagonBase(kit, 0x1b1a24);
  const G = floor(kit, F, 0.06, 0x2e2a34, 0x221e28, 0);

  // The first gallery: a brick arch, black inside, the rails coming out of it.
  const turn = 0.3;
  const arch = add(archedWall(1.9, 2.3, 0.35, { x: 0, half: 0.48, spring: 1.0 }), BRICK, -0.85, G, -1.45, { delay: 0.1, rotation: [0, turn, 0] });
  const bricks: Point[] = [];
  for (let row = 0; row < 9; row++)
    for (let col = 0; col < 4; col++) {
      const x = -0.7 + col * 0.46 + (row % 2) * 0.23;
      if (Math.abs(x) > 0.62 || row > 6) bricks.push([x, 0.15 + row * 0.25, 0.18]);
    }
  decorate(arch, new BoxGeometry(0.38, 0.03, 0.01), 0x3a2236, bricks);
  add(archMouth(0.48, 1.0), 0x0c0a12, -0.85 - Math.sin(turn) * 0.19, G, -1.45 - Math.cos(turn) * 0.19, { delay: 0.14, flat: true, noInk: true, rotation: [0, turn, 0] });
  const along = (k: number): [number, number] => [-0.85 + Math.sin(turn) * k, -1.45 + Math.cos(turn) * k];
  for (let k = 0.3; k < 1.5; k += 0.3) {
    const [x, z] = along(k);
    box(0.85, 0.04, 0.12, 0x3e3028, x, G, z, { delay: 0.15, noInk: true, rotation: [0, turn, 0] });
  }
  [-0.22, 0.22].forEach((dx) => {
    const [x, z] = along(0.8);
    box(0.05, 0.06, 1.4, STEEL, x + Math.cos(turn) * dx, G + 0.04, z - Math.sin(turn) * dx, { delay: 0.18, rotation: [0, turn, 0] });
  });
  // The cart, heaped with crystal, the cash box riding on top.
  const [cx, cz, ct] = [-1.45, 0.55, -0.4];
  const cart = box(0.62, 0.36, 0.78, 0x5a4a3e, cx, G + 0.12, cz, { delay: 0.3, rotation: [0, ct, 0] });
  decorate(cart, new BoxGeometry(0.64, 0.04, 0.8), 0x3a3038, [
    [0, 0.06, 0],
    [0, 0.32, 0],
  ]);
  [-0.26, 0.26].forEach((dz) =>
    [-0.27, 0.27].forEach((dx) =>
      add(new CylinderGeometry(0.08, 0.08, 0.05, 12).rotateZ(Math.PI / 2), 0x23222b, cx + Math.cos(ct) * dx + Math.sin(ct) * dz, G + 0.06, cz - Math.sin(ct) * dx + Math.cos(ct) * dz, { delay: 0.32, rotation: [0, ct, 0] }),
    ),
  );
  [
    [-0.12, 0.1, 0.2],
    [0.12, -0.15, 0.16],
    [0.05, 0.2, 0.22],
  ].forEach(([dx, dz, r], i) => add(new OctahedronGeometry(r).scale(0.7, 1.4, 0.7), ICE, cx + dx, G + 0.42, cz + dz, { delay: 0.36 + i * 0.03, rotation: [0.2 * i, i, 0.3 - i * 0.2] }));
  const till = box(0.26, 0.16, 0.2, 0x2f5a48, cx + 0.12, G + 0.48, cz + 0.3, { delay: 0.45, rotation: [0, ct, 0] });
  decorate(till, new BoxGeometry(0.1, 0.02, 0.01), INK, [[0, 0.13, 0.101]]);
  decorate(till, new CylinderGeometry(0.035, 0.035, 0.015, 12), YELLOW, [
    [-0.06, 0.168, 0],
    [0.04, 0.172, 0.04],
    [0.07, 0.168, -0.05],
  ]);

  // Where the pick lands, worked out in her frame before she is built.
  const [X, Z, facing] = [0.3, 0.45, 0.75];
  const loc = (x: number, y: number, z: number): Point => [X + x * Math.cos(facing) + z * Math.sin(facing), G + y, Z - x * Math.sin(facing) + z * Math.cos(facing)];
  const S: Point = [-0.15, 1.5, 0.28];
  const E: Point = [0.72, 0.98, 0.95];
  const on = (k: number): Point => [S[0] + (E[0] - S[0]) * k, S[1] + (E[1] - S[1]) * k, S[2] + (E[2] - S[2]) * k];
  const butt = loc(...on(-0.08));
  const head = loc(...E);
  const haft = new Vector3(head[0] - butt[0], head[1] - butt[1], head[2] - butt[2]).normalize();
  const up = new Vector3(0, 1, 0).addScaledVector(haft, -haft.y).normalize();
  const hit = new Vector3(...head).addScaledVector(up, 0.4);

  // The crystal wall she is breaking into, its biggest spire round the point of the pick.
  const crystals: [number, number, number, number, number][] = [
    [hit.x + haft.x * 0.1, hit.z + haft.z * 0.1, 0.55, 2.4, 0.1],
    [1.55, -0.4, 0.45, 2.0, -0.2],
    [1.95, -0.05, 0.3, 1.5, 0.15],
    [1.15, -1.05, 0.4, 2.2, 0.25],
    [0.6, -1.65, 0.3, 1.4, -0.2],
    [1.3, 1.3, 0.25, 0.8, 0.4],
    [1.85, 0.95, 0.2, 0.7, -0.3],
  ];
  crystals.forEach(([x, z, r, h, lean], i) =>
    add(new CylinderGeometry(0, r, h, 6), i % 3 === 1 ? ICE : CYAN, x, G, z, { delay: 0.2 + i * 0.04, flat: i % 2 === 0, rotation: [lean * 0.4, i, lean * 0.6] }),
  );
  rubble(kit, 1.15, 0.95, G, 0.5, 6, 0.3, 0x5a8aa8);

  // Picozza, swinging her pick into the crystal.
  const miner = figure(kit, {
    x: X,
    z: Z,
    y: G,
    facing,
    height: 2.3,
    build: "heavy",
    skin: 0x9a9aa6,
    hair: { style: "braids", color: 0x8a2a3a },
    face: { mouth: "grin", brows: "raised", marks: 0x6a6a76 },
    headwear: { kind: "headband", color: 0x5a4030 },
    top: { kind: "jacket", color: 0x2a3448, accent: 0x5a4030 },
    bottom: { kind: "trousers", color: 0x23283a },
    shoes: 0x2a2026,
    gloves: 0x3a3a44,
    belt: 0x4a3020,
    arms: [on(0.14), on(0.4)],
    legs: "wide",
    delay: 0.8,
  });
  const body: Group[] = [...miner.parts];
  const keep = (part: Group) => (body.push(part), part);
  // The gap in her grin, the lamp on her brow.
  const u = 2.3 / 2.4;
  const R = 0.23 * u;
  decorate(miner.headPart, new BoxGeometry(0.025, 0.04, 0.025), INK, [[0, R * 1.06 - 0.1 * u, R * 0.9 - 0.005]]);
  decorate(miner.headPart, new BoxGeometry(0.11, 0.08, 0.06), 0x9a7a3a, [[0, R * 1.06 + R * 0.62, R * 0.86]]);
  const lamp = decorate(miner.headPart, new CylinderGeometry(0.04, 0.04, 0.02, 12).rotateX(Math.PI / 2), YELLOW, [[0, R * 1.06 + R * 0.62, R * 0.86 + 0.035]]);
  // Leather on the shoulders, rope wound round the forearms.
  [-1, 1].forEach((side) => keep(add(new SphereGeometry(0.17, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.1, 0.6, 1), 0x5a4030, ...miner.at(side * 0.47 * u, 1.72 * u + 0.02, 0), { delay: 1.3, rotation: [0, facing, -side * 0.3] })));
  [0, 1].forEach((i) => {
    const [elbow, hand] = [miner.elbows[i], miner.hands[i]];
    const { rotation } = aim(elbow, hand);
    [0.3, 0.48, 0.66].forEach((k) =>
      keep(add(new TorusGeometry(0.13, 0.025, 6, 16).rotateX(Math.PI / 2), ROPE, elbow[0] + (hand[0] - elbow[0]) * k, elbow[1] + (hand[1] - elbow[1]) * k, elbow[2] + (hand[2] - elbow[2]) * k, { delay: 1.35, rotation })),
    );
  });
  // The pick: haft through both fists, the head biting into the crystal.
  keep(limb(kit, butt, head, 0.04, 0.04, 0x5e4a3a, { delay: 1.4 }));
  keep(limb(kit, head, [head[0] + up.x * 0.42, head[1] + up.y * 0.42, head[2] + up.z * 0.42], 0.06, 0.008, STEEL, { delay: 1.45 }));
  keep(limb(kit, head, [head[0] - up.x * 0.3, head[1] - up.y * 0.3, head[2] - up.z * 0.3], 0.06, 0.01, STEEL, { delay: 1.45 }));
  keep(ball(0.07, STEEL, head[0], head[1] - 0.07, head[2], { delay: 1.42 }));
  const rest = body.map((part) => part.position.y);

  // Shards flying from the blow, dust in the air.
  const shards = Array.from({ length: 10 }, (_, k) => {
    const a = -1.2 + (k / 9) * 2.4;
    const v = new Vector3(-Math.cos(a) * (0.9 + (k % 3) * 0.3), 0.8 + (k % 4) * 0.35, Math.sin(a) * 1.0 + 0.6);
    return { part: add(new OctahedronGeometry(0.045 + (k % 3) * 0.015), k % 2 ? ICE : CYAN, hit.x, hit.y, hit.z, { delay: 1.6, flat: true, rotation: [k, k * 2, 0] }), v, phase: k / 10 };
  });
  motes(10, 0x8a8fa0, 0.03, [hit.x - 0.8, G + 0.3, hit.z - 0.4], [hit.x, G + 1.9, hit.z + 0.5], 1.0);

  tick((t) => {
    const u2 = (t / 1.5) % 1;
    const dip = u2 < 0.12 ? Math.sin((u2 / 0.12) * Math.PI) * 0.04 : 0;
    body.forEach((part, i) => (part.position.y = rest[i] - dip));
    shards.forEach(({ part, v, phase }) => {
      const s = ((u2 + phase * 0.5) % 1) * 1.2;
      part.visible = s < 0.9;
      part.position.set(hit.x + v.x * s, hit.y + v.y * s - 2.2 * s * s, hit.z + v.z * s);
      part.rotation.y = t * 4;
    });
    lamp.color.setHex(Math.floor(t * 7) % 29 === 11 ? 0x8a7a3a : YELLOW);
  });

  return { width: 4.9, height: 4.5, lookY: 1.5 };
}
