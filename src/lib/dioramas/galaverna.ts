import { BoxGeometry, ConeGeometry, CylinderGeometry, ExtrudeGeometry, OctahedronGeometry, Shape, TorusGeometry, Vector3 } from "three";
import { INK, aim, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { bollard, lamp } from "@/lib/diorama-props";

/**
 * Galaverna (P342): the priestess of the Figli dell'Ultima on the harbour quay at night, long
 * black hair and a long dark coat with a collar of frost, her hands thrust out and ice shards
 * bursting from them over the water. The harbour freezes in a fan of spikes, an old sailing
 * ship is locked in the ice, the quay clock ticks towards the last hour and the lamp beside her
 * gutters with cold. Snow falls. The price: she cannot hide, a trail of frozen footprints leads
 * straight to her.
 */
export function galaverna(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick } = kit;
  const ICE = 0xc4f0ff;
  const ICE_DEEP = 0x6fd0f0;
  const STONE = 0x4a5064;
  const WOOD = 0x3a2a30;
  const F = octagonBase(kit, 0x0c2436);

  // The quay: cobbles over the left and back of the base, its edge running down into the water.
  const Q = 0.22;
  const outline: [number, number][] = [[0, 2.2], [-0.91, 2.2], [-2.2, 0.91], [-2.2, -0.91], [-0.91, -2.2], [0.91, -2.2]];
  const shape = new Shape();
  outline.forEach(([x, z], i) => (i ? shape.lineTo(x, -z) : shape.moveTo(x, -z)));
  shape.closePath();
  const quay = add(new ExtrudeGeometry(shape, { depth: Q, bevelEnabled: false }).rotateX(-Math.PI / 2), 0x343848, 0, F, 0, { delay: 0.08, ink: 1.015 });
  const edge = (z: number) => (0.91 * (2.2 - z)) / 4.4;
  for (let z = -1.85; z < 2.1; z += 0.38) {
    const left = -Math.min(2.2, 3.11 - Math.abs(z)) + 0.05;
    const right = edge(z) - 0.1;
    decorate(quay, new BoxGeometry(right - left, 0.004, 0.014), 0x262a35, [[(left + right) / 2, Q + 0.002, z]]);
    const joints: Point[] = [];
    for (let x = left + 0.3 + (Math.abs(Math.round(z * 3)) % 2) * 0.25; x < right - 0.1; x += 0.55) joints.push([x, Q + 0.002, z + 0.19]);
    if (joints.length) decorate(quay, new BoxGeometry(0.014, 0.004, 0.36), 0x262a35, joints);
  }
  box(0.14, 0.07, 4.3, STONE, 0.38, F + Q, 0, { delay: 0.12, rotation: [0, -0.204, 0] });
  const G = F + Q;

  // The price: frozen footprints from the back of the quay to where she stands.
  decorate(
    quay,
    new CylinderGeometry(0.055, 0.055, 0.004, 10).scale(1, 1, 1.7),
    ICE,
    Array.from({ length: 7 }, (_, k) => {
      const u = k / 7;
      return [-1.75 + u * 1.05 + (k % 2 ? 0.09 : -0.09), Q + 0.003, -1.55 + u * 1.65] as Point;
    }),
  );
  add(new CylinderGeometry(0.85, 0.85, 0.006, 9), 0x9cd4ea, -0.55, G, 0.4, { delay: 0.5, flat: true, noInk: true, rotation: [0, 0.3, 0] });

  // The harbour frozen in a fan of spikes, the old ship locked in the ice.
  add(new CylinderGeometry(1, 1, 0.03, 7).scale(1, 1, 1.5), 0xcfeef7, 1.25, F, 0.1, { delay: 0.2, noInk: true });
  const spikes: [number, number, number, number][] = [
    [0.0, 0.8, 0.32, G],
    [0.2, 0.2, 0.45, G],
    [0.7, 0.95, 0.55, F],
    [1.05, 0.45, 0.85, F],
    [1.55, 1.0, 0.5, F],
    [0.9, -0.2, 0.6, F],
    [1.4, -0.45, 0.4, F],
    [1.9, 0.3, 0.45, F],
    [1.15, 1.45, 0.35, F],
  ];
  spikes.forEach(([x, z, h, y], i) => {
    const d = new Vector3(x + 0.6, 0, z - 0.3).normalize();
    add(new ConeGeometry(h * 0.22, h, 5), i % 2 ? ICE_DEEP : ICE, x, y + 0.02, z, { delay: 1.6 + i * 0.04, rotation: [d.z * 0.4, 0, -d.x * 0.4] });
  });
  // The ship: a hull with a pointed bow, listing in the ice, its yards hung with icicles.
  const [SX, SZ] = [1.4, -0.75];
  const hullShape = new Shape();
  [[0.7, 0], [0.35, 0.3], [-0.6, 0.28], [-0.68, 0], [-0.6, -0.28], [0.35, -0.3]].forEach(([x, y], i) => (i ? hullShape.lineTo(x, y) : hullShape.moveTo(x, y)));
  hullShape.closePath();
  const hull = add(new ExtrudeGeometry(hullShape, { depth: 0.4, bevelEnabled: false }).rotateX(-Math.PI / 2), WOOD, SX, F - 0.06, SZ, { delay: 0.3 });
  hull.rotation.order = "YXZ";
  hull.rotation.set(0.1, 1.2, 0);
  decorate(hull, new ExtrudeGeometry(hullShape, { depth: 0.05, bevelEnabled: false }).rotateX(-Math.PI / 2).scale(1.01, 1, 1.01), 0x8a2a4a, [[0, 0.28, 0]]);
  cylinder(0.045, 0.055, 2.7, WOOD, SX, F + 0.3, SZ, { delay: 0.36 }, 8);
  [1.85, 2.5].forEach((y, k) => {
    const width = 1.05 - k * 0.25;
    box(width, 0.05, 0.05, WOOD, SX, F + y, SZ, { delay: 0.4 + k * 0.04, rotation: [0, -0.37, 0] });
    add(new CylinderGeometry(0.06, 0.06, width * 0.85, 8).rotateZ(Math.PI / 2), 0xd8d2c4, SX, F + y - 0.1, SZ, { delay: 0.44 + k * 0.04, rotation: [0, -0.37, 0] });
    [-0.3, 0, 0.3].forEach((dx, i) =>
      add(new ConeGeometry(0.025, 0.14 + i * 0.03, 5).rotateX(Math.PI), ICE, SX + dx * 0.93 * width, F + y - 0.26, SZ + dx * 0.36 * width, { delay: 0.5 + i * 0.02, noInk: true }),
    );
  });
  [0.6, -0.6].forEach((along, k) =>
    limb(kit, [SX + along * 0.36, F + 0.34, SZ - along * 0.93], [SX, F + 2.95, SZ], 0.008, 0.008, INK, { delay: 0.5 + k * 0.03, noInk: true }),
  );

  // The quay clock at five to midnight, the lamp guttering, a bollard capped with ice.
  cylinder(0.05, 0.06, 2.2, 0x23222b, -1.45, G, -1.0, { delay: 0.3 }, 8);
  const face: [number, number, number] = [0, 0.35, 0];
  const clock = add(new CylinderGeometry(0.3, 0.3, 0.06, 24).rotateX(Math.PI / 2), 0xe8f2ff, -1.45, G + 2.0, -1.0, { delay: 0.36, rotation: face });
  decorate(
    clock,
    new BoxGeometry(0.02, 0.06, 0.01),
    INK,
    Array.from({ length: 12 }, (_, k) => [Math.sin((k * Math.PI) / 6) * 0.24, 0.3 + Math.cos((k * Math.PI) / 6) * 0.24, 0.032, -(k * Math.PI) / 6] as [number, number, number, number]),
  );
  decorate(clock, new ConeGeometry(0.025, 0.12, 5).rotateX(Math.PI), ICE, [
    [-0.12, -0.04, 0.02],
    [0.1, -0.06, 0.02],
  ]);
  const centre = new Vector3(0, 0, 0.045).applyAxisAngle(new Vector3(0, 1, 0), 0.35).add(new Vector3(-1.45, G + 2.3, -1.0));
  const hands = [
    [0.035, 0.15, 0.05],
    [0.025, 0.24, 0.52],
  ].map(([w, h, angle], k) => {
    const hand = box(w, h, 0.012, INK, centre.x, centre.y, centre.z, { delay: 0.42 + k * 0.03, noInk: true });
    hand.rotation.order = "YXZ";
    hand.rotation.set(0, 0.35, angle);
    return hand;
  });
  const light = lamp(kit, -1.7, 0.75, G, 0.4, 2.25, 0x9fe8ff);
  [0.1, 0.2, 0.32].forEach((dx, i) => add(new ConeGeometry(0.02, 0.12 + i * 0.04, 5).rotateX(Math.PI), ICE, -1.7 + dx, G + 2.05 - i * 0.02, 0.75, { delay: 0.55, noInk: true }));
  bollard(kit, -0.2, 1.55, G, 0.45);
  cylinder(0.13, 0.13, 0.05, ICE, -0.2, G + 0.2, 1.55, { delay: 0.6 });

  // Galaverna, both hands thrust out, the frost on her collar and her hem.
  const priestess = figure(kit, {
    x: -0.6,
    z: 0.3,
    y: G,
    facing: 0.95,
    height: 2.45,
    build: "slim",
    skin: 0xead6cf,
    hair: { style: "long", color: 0x16141e },
    face: { mouth: "frown", brows: "angry", eyes: 0xa8ecff, glow: true },
    top: { kind: "robe", color: 0x2a2c3a },
    scarf: 0xe4eef6,
    gloves: 0x23283a,
    arms: [
      [-0.32, 1.78, 0.78],
      [0.42, 1.5, 0.8],
    ],
    delay: 0.8,
  });
  add(new TorusGeometry(0.4, 0.035, 6, 20).rotateX(Math.PI / 2).scale(1, 1, 0.82), 0xe4eef6, ...priestess.at(0, 0.12, 0), { delay: 1.2, rotation: [0, 0.95, 0] });

  // Ice shards bursting from her hands, flying out and growing again.
  const shards = priestess.hands.flatMap((hand, side) => {
    const d = new Vector3(...hand).sub(new Vector3(...priestess.elbows[side])).normalize();
    return [0, 1, 2, 3, 4, 5, 6].map((k) => {
      const spread = new Vector3(Math.sin(k * 2.1) * 0.3, Math.cos(k * 1.7) * 0.22 - 0.1, Math.sin(k * 1.3) * 0.3);
      const dir = d.clone().add(spread).normalize();
      const from: Point = [hand[0] + dir.x * 0.1, hand[1] + dir.y * 0.1 - 0.05, hand[2] + dir.z * 0.1];
      const to: Point = [from[0] + dir.x, from[1] + dir.y, from[2] + dir.z];
      const shard = add(new OctahedronGeometry(1).scale(0.06, 0.22 + (k % 3) * 0.08, 0.06), k % 2 ? ICE_DEEP : ICE, ...from, {
        delay: 1.4 + k * 0.03,
        rotation: aim(from, to).rotation,
      });
      return { shard, from, dir, phase: k / 7 + side * 0.07 };
    });
  });

  // Snow falling over the quay.
  const flakes = Array.from({ length: 14 }, (_, k) => ({
    flake: add(new OctahedronGeometry(0.03), 0xf4faff, -1.8 + ((k * 7) % 14) * 0.26, G + 3, -1.4 + ((k * 5) % 9) * 0.33, { delay: 1.8, flat: true, noInk: true }),
    phase: (k * 0.37) % 1,
  }));

  tick((t) => {
    shards.forEach(({ shard, from, dir, phase }) => {
      const u = (t * 0.7 + phase) % 1;
      shard.position.set(from[0] + dir.x * u * 0.9, from[1] + dir.y * u * 0.9, from[2] + dir.z * u * 0.9);
      shard.visible = u < 0.9;
    });
    flakes.forEach(({ flake, phase }) => (flake.position.y = G + 3.1 - ((t * 0.18 + phase) % 1) * 3));
    hands[1].rotation.z = 0.52 - (Math.floor(t) % 12) * (0.52 / 12);
    light.visible = Math.floor(t * 6) % 11 !== 5;
  });

  return { width: 4.9, height: 4.5, lookY: 1.6 };
}
