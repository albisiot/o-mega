import { BoxGeometry, ConeGeometry, CylinderGeometry, Group, TorusGeometry } from "three";
import { MAGENTA, ORANGE, YELLOW, limb, octagonBase, zigzag, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, table } from "@/lib/diorama-props";

/**
 * Indemnity (P136): the curse underwriter of the Compagnia Lete in the company's hall, a long
 * green frock coat with a double row of brass buttons, a furled black umbrella under his right
 * hand. Over his left palm a thundercloud of bad luck splits into little clouds that drift off
 * into the policy drawers behind him; one has settled over the old lady client at the front,
 * raining on her alone. The price: she glares at him, and he doesn't even look.
 */
export function indemnity(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const GREEN = 0x1f3a2c;
  const BRASS = 0xc9a040;
  const CLOUD = 0x3a2a4a;
  const F = octagonBase(kit, 0x1a1e1c);
  const G = floor(kit, F, 0.06, 0x2e3a36, 0x1e2824, 0.4);

  // The wall of policy drawers, a green banner, and the vault gate glowing at the left.
  const cabinet = box(2.6, 2.4, 0.36, 0x2a3a34, 0.2, G, -1.45, { delay: 0.1, ink: 1.02 });
  const drawers: Point[] = [];
  for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) drawers.push([-1.0 + c * 0.5, 0.3 + r * 0.44, 0.185]);
  decorate(cabinet, new BoxGeometry(0.42, 0.36, 0.01), 0x3a4e46, drawers);
  decorate(cabinet, new BoxGeometry(0.1, 0.03, 0.02), BRASS, drawers.map(([x, y, z]) => [x, y + 0.08, z + 0.01] as Point));
  const banner = box(0.42, 0.95, 0.03, 0x1f5a3a, 0.95, G + 1.35, -1.24, { delay: 0.2 });
  decorate(banner, new BoxGeometry(0.04, 0.95, 0.01), BRASS, [
    [-0.19, 0, 0.02],
    [0.19, 0, 0.02],
  ]);
  add(new ConeGeometry(0.21, 0.22, 3).rotateZ(Math.PI).scale(1, 1, 0.1), 0x1f5a3a, 0.95, G + 1.13, -1.24, { delay: 0.22, rotation: [0, Math.PI / 6, 0] });
  const gate = box(0.9, 1.9, 0.2, 0x2a2a30, -1.55, G, -0.85, { delay: 0.15, rotation: [0, 0.75, 0] });
  decorate(gate, new BoxGeometry(0.72, 1.6, 0.01), ORANGE, [[0, 0.85, 0.101]]);
  decorate(gate, new BoxGeometry(0.035, 1.6, 0.03), 0x14121c, [-0.27, -0.13, 0, 0.13, 0.27].map((x) => [x, 0.85, 0.12] as Point));
  decorate(gate, new BoxGeometry(0.72, 0.035, 0.03), 0x14121c, [[0, 1.2, 0.12]]);

  // A desk with the ledger and a banker's lamp.
  const desk = table(kit, 1.4, -0.55, G, 0.3, false, 0x3a2a20, 0.75);
  decorate(desk, new BoxGeometry(0.42, 0.04, 0.3), 0xe8e2d0, [[-0.15, 0.07, 0.05]]);
  decorate(desk, new BoxGeometry(0.01, 0.045, 0.3), 0x8a8270, [[-0.15, 0.07, 0.05]]);
  cylinder(0.02, 0.06, 0.3, BRASS, 1.65, G + 0.8, -0.7, { delay: 0.45 }, 8);
  const shade = add(new CylinderGeometry(0.06, 0.16, 0.1, 12, 1, true), 0x1f7a4a, 1.65, G + 1.08, -0.7, { delay: 0.5 });
  decorate(shade, new CylinderGeometry(0.05, 0.05, 0.02, 10), YELLOW, [[0, 0.0, 0]]);

  // Indemnity: tall and thin, curly grey hair, the green coat, white collar.
  const agent = figure(kit, {
    x: -0.2,
    z: 0.3,
    y: G,
    facing: 0.3,
    height: 2.6,
    build: "slim",
    skin: 0xd8b090,
    hair: { style: "curly", color: 0x4a4a54 },
    face: { mouth: "smirk", brows: "calm", marks: 0xa07a62 },
    top: { kind: "coat", color: GREEN, accent: 0x24463a },
    bottom: { kind: "trousers", color: 0x1a2a22 },
    shoes: 0x14121c,
    arms: [
      [-0.33, 0.98, 0.26],
      [0.52, 1.72, 0.36],
    ],
    delay: 0.7,
  });
  const at = agent.at;
  cylinder(0.1, 0.13, 0.12, 0xe8e2d0, ...at(0, 1.82, 0.01), { delay: 1.2 });
  // Two rows of brass buttons down the coat.
  const front = (y: number) => (y > 1.17 ? 0.2 + ((y - 1.17) / 0.7) * 0.04 : 0.3 - ((y - 0.52) / 0.65) * 0.07) + 0.012;
  [-0.06, 0.06].forEach((x) => [0.62, 0.82, 1.02, 1.22, 1.42, 1.62].forEach((y, i) => ball(0.022, BRASS, ...at(x, y - 0.022, front(y)), { delay: 1.25 + i * 0.02 })));
  // The furled umbrella, its tip on the floor, his hand on the crook.
  limb(kit, at(-0.37, 0, 0.32), at(-0.33, 0.98, 0.26), 0.012, 0.012, 0x14121c, { delay: 1.2 });
  limb(kit, at(-0.365, 0.14, 0.31), at(-0.345, 0.66, 0.28), 0.02, 0.07, 0x23222b, { delay: 1.22 });
  limb(kit, at(-0.345, 0.66, 0.28), at(-0.335, 0.84, 0.27), 0.07, 0.02, 0x23222b, { delay: 1.24 });

  // Over his left palm the curse: a thundercloud with a flash inside.
  const [px, py, pz] = agent.hands[1];
  const cloudAt: Point = [px, py + 0.42, pz];
  [
    [0, 0, 0, 0.22],
    [-0.2, -0.05, 0.04, 0.16],
    [0.2, -0.04, -0.02, 0.17],
    [0.06, 0.14, -0.06, 0.15],
  ].forEach(([dx, dy, dz, r], i) => ball(r, i % 2 ? 0x2e2040 : CLOUD, cloudAt[0] + dx, cloudAt[1] + dy - r, cloudAt[2] + dz, { delay: 1.5 + i * 0.04 }));
  const flash = zigzag(kit, [[px - 0.08, py + 0.35, pz + 0.25], [px + 0.02, py + 0.25, pz + 0.27], [px - 0.03, py + 0.17, pz + 0.27], [px + 0.06, py + 0.05, pz + 0.25]], 0.025, MAGENTA, 1.7);

  // Little clouds of shared misfortune, drifting into the drawers.
  const puff = (x: number, y: number, z: number, size: number, delay: number): Group => {
    const group = new Group();
    const parts = [
      [0, 0, 0, 1],
      [-0.7, -0.25, 0, 0.7],
      [0.7, -0.2, 0, 0.75],
    ].map(([dx, dy, dz, r]) => ball(size * r, CLOUD, dx * size, dy * size - size * r, dz, { delay }));
    parts[0].parent?.add(group);
    parts.forEach((part) => group.add(part));
    group.position.set(x, y, z);
    return group;
  };
  const targets: Point[] = [drawers[7], drawers[13], drawers[19], drawers[1]].map(([x, y]) => [0.2 + x, G + y + 0.1, -1.2]);
  const drifting = targets.map((_, i) => puff(cloudAt[0], cloudAt[1], cloudAt[2], 0.09, 1.8 + i * 0.05));

  // The client, an old lady with her handbag, rained on by her share.
  const lady = figure(kit, {
    x: 1.4,
    z: 1.0,
    y: G,
    facing: -0.25,
    height: 1.75,
    build: "heavy",
    skin: 0xe0b8a0,
    hair: { style: "bun", color: 0xd8d8e2 },
    face: { mouth: "frown", brows: "angry" },
    top: { kind: "dress", color: 0x7a2f55 },
    shoes: 0x2a2622,
    scarf: 0x2f6f86,
    arms: [[-0.3, 0.8, 0.2], [0.42, 1.55, 0.16]],
    delay: 0.9,
  });
  const [bx, by, bz] = lady.hands[0];
  box(0.22, 0.2, 0.1, 0x14121c, bx, by - 0.24, bz, { delay: 1.4, rotation: [0, -0.25, 0] });
  add(new TorusGeometry(0.07, 0.012, 4, 12, Math.PI), 0x14121c, bx, by - 0.06, bz, { delay: 1.42, rotation: [0, -0.25, 0] });
  const rainTop = lady.top + 0.42;
  const own = puff(lady.head[0], rainTop, lady.head[2], 0.14, 1.9);
  const drops = Array.from({ length: 6 }, (_, k) => box(0.014, 0.09, 0.014, 0x9fd8ff, lady.head[0] - 0.2 + k * 0.08, rainTop - 0.2, lady.head[2] + ((k * 7) % 3) * 0.06 - 0.06, { delay: 2.0, flat: true, noInk: true }));

  tick((t) => {
    // The flash flickers; the little clouds drift to their drawers; it rains on the lady.
    flash.forEach((part) => (part.visible = Math.floor(t * 6) % 7 !== 3));
    drifting.forEach((cloud, i) => {
      const u = (t * 0.22 + i / targets.length) % 1;
      const [tx, ty, tz] = targets[i];
      cloud.position.set(cloudAt[0] + (tx - cloudAt[0]) * u, cloudAt[1] + (ty - cloudAt[1]) * u + Math.sin(u * Math.PI) * 0.35, cloudAt[2] + (tz - cloudAt[2]) * u);
      cloud.visible = u < 0.94;
    });
    own.position.y = rainTop + Math.sin(t * 1.5) * 0.04;
    drops.forEach((drop, k) => (drop.position.y = rainTop - 0.25 - ((t * 1.2 + k * 0.17) % 1) * (rainTop - lady.top - 0.15)));
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}
