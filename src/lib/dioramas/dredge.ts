import { CatmullRomCurve3, ConeGeometry, CylinderGeometry, ExtrudeGeometry, Group, Quaternion, Shape, SphereGeometry, TorusGeometry, Vector2, Vector3 } from "three";
import { CYAN, YELLOW, cable, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { bollard, steps, towerCrane } from "@/lib/diorama-props";

/**
 * Dredge (P077): the terror of the port, in his brass diving helmet and captain's coat, has come
 * out of the water at the foot of the harbour stairs, and there he stops, panting, his steel
 * tentacles flailing. Out of the sea he is hopelessly slow: up on the quay a dock worker hauls
 * on a rope tied to one of his claws to help him up the steps.
 */
export function dredge(kit: Kit): Framing {
  const { add, box, ball, decorate, tick } = kit;
  const WATER = 0x12465e;
  const FOAM = 0xcfeef7;
  const BRASS = 0xd0a040;
  const STEEL = 0x4a5468;
  const STEEL_LIGHT = 0x67728a;
  const QUAY = 0x46506a;
  const F = octagonBase(kit, 0x0e3a4e);

  // The quay along the back, the stairs down into the water, the water itself.
  const plane = (points: number[][], height: number, color: number, delay: number, ink: boolean) => {
    const shape = new Shape(points.map(([x, s]) => new Vector2(x, s)));
    return add(new ExtrudeGeometry(shape, { depth: height, bevelEnabled: false }).rotateX(-Math.PI / 2), color, 0, F, 0, ink ? { delay, ink: 1.01 } : { delay, noInk: true, flat: true });
  };
  const QT = F + 0.93;
  plane([[-2.25, 0.57], [2.25, 0.57], [2.25, 1.0], [1.0, 2.25], [-1.0, 2.25], [-2.25, 1.0]], 0.93, QUAY, 0.06, true);
  steps(kit, 1.05, 0.75, F, 0.12, { width: 1.1, count: 6, tread: 0.22, rise: 0.155, color: 0x5d6680 });
  plane([[-2.25, 0.57], [2.25, 0.57], [2.25, -1.0], [1.0, -2.25], [-1.0, -2.25], [-2.25, -1.0]], 0.14, WATER, 0.2, false);
  towerCrane(kit, -1.5, -1.4, QT, 0.3, 2.3, 1.2, 0x4a5a7a);
  bollard(kit, -0.35, -0.8, QT, 0.35);
  bollard(kit, 1.9, -0.8, QT, 0.38);

  // A dock worker up on the quay, hauling on the rope.
  const worker = figure(kit, {
    x: 0.9, z: -1.1, y: QT, facing: -0.25, height: 2.0,
    skin: 0xc89070,
    face: { mouth: "open", brows: "worried" },
    headwear: { kind: "hardhat", color: YELLOW },
    top: { kind: "jacket", color: 0x23404b, accent: 0xe0dccf },
    bottom: { kind: "trousers", color: 0x2b2f3a },
    arms: [[-0.1, 1.15, 0.5], [0.1, 1.1, 0.42]],
    legs: "stride",
    delay: 0.5,
  });

  // Dredge: captain's coat with brass buttons and epaulettes, out of breath.
  const facing = 0.45;
  const diver = figure(kit, {
    x: -0.55, z: 0.55, y: F, facing, height: 2.4, build: "heavy",
    skin: 0xd0a080,
    hair: { style: "short", color: 0x3a2a22 },
    face: { mouth: "open", brows: "worried", beard: "stubble" },
    top: { kind: "coat", color: 0x1e2a48, accent: 0x2c3c60 },
    bottom: { kind: "trousers", color: 0x1a2238 },
    gloves: 0x23222b,
    arms: ["hip", [0.6, 1.4, 0.45]],
    delay: 0.8,
  });
  const rot: Point = [0, facing, 0];
  [-1, 1].forEach((side) => box(0.24, 0.05, 0.22, BRASS, ...diver.at(side * 0.45, 1.7, 0), { delay: 1.25, rotation: rot }));
  [[-0.1, 1.38], [0.1, 1.38], [-0.11, 1.18], [0.11, 1.18]].forEach(([x, y]) => ball(0.03, BRASS, ...diver.at(x, y - 0.03, 0.33), { delay: 1.3 }));

  // The diving helmet: a brass globe open at the front round his face, on a brass collar.
  const [cx, cy, cz] = diver.head;
  const R = diver.headRadius;
  add(new CylinderGeometry(0.3, 0.56, 0.24, 18), BRASS, ...diver.at(0, 1.58, 0), { delay: 1.35, rotation: rot });
  const shell = new SphereGeometry(R * 1.5, 20, 14, 0, Math.PI * 2, 0.85, Math.PI - 0.85).rotateX(Math.PI / 2);
  const globe = add(shell, BRASS, cx, cy - R * 1.5, cz, { delay: 1.4, rotation: rot });
  decorate(globe, new SphereGeometry(0.03, 6, 4), 0x8a6424, [[-R * 1.48, R * 1.5, 0], [R * 1.48, R * 1.5, 0], [0, R * 3, 0]]);
  const rim = diver.at(0, 2.14, R * 0.98);
  add(new TorusGeometry(R * 1.13, 0.05, 8, 28), 0xe0b858, rim[0], rim[1] - R * 1.13 - 0.05, rim[2], { delay: 1.45, rotation: rot });

  // Four steel tentacles from his back: two flailing, one on the water, one up the steps with the rope.
  const UP = new Vector3(0, 1, 0);
  type Arm = { balls: Group[]; radii: number[]; rest: Vector3[]; amp: number; phase: number; claws: Group[] };
  const arms: Arm[] = (
    [
      [[-0.25, 1.55, -0.32], [-0.75, 2.15, -0.5], [-1.15, 2.65, -0.15], [-1.35, 2.45, 0.35], 0.14, 0],
      [[0.25, 1.55, -0.32], [0.55, 2.3, -0.65], [0.15, 2.95, -0.55], [-0.2, 3.05, -0.1], 0.12, 2],
      [[-0.22, 1.1, -0.34], [-0.75, 0.75, -0.3], [-1.1, 0.25, 0.25], [-0.95, 0.2, 0.75], 0.05, 4],
      [[0.25, 1.1, -0.35], [0.75, 0.95, -0.3], [1.2, 0.85, -0.05], [1.54, 0.68, 0.14], 0.03, 1],
    ] as [Point, Point, Point, Point, number, number][]
  ).map(([a, b, c, d, amp, phase], i) => {
    const curve = new CatmullRomCurve3([a, b, c, d].map((p) => new Vector3(...diver.at(...p))));
    const rest = curve.getSpacedPoints(9);
    const radii = rest.map((_, k) => 0.11 - k * 0.005);
    const balls = rest.map((p, k) => ball(radii[k], k % 2 ? STEEL : STEEL_LIGHT, p.x, p.y - radii[k], p.z, { delay: 1.5 + i * 0.08 + k * 0.03 }));
    const claws = [-1, 1].map((side) => add(new ConeGeometry(0.045, 0.24, 6), side < 0 ? STEEL_LIGHT : 0x9aa4b8, ...rest[9].toArray(), { delay: 1.9 + i * 0.08 }));
    return { balls, radii, rest, amp, phase, claws };
  });
  const grip = arms[3].rest[9];
  cable(kit, [[grip.x, grip.y, grip.z], [grip.x - 0.05, QT + 0.2, -0.72], worker.hands[0]], 0.022, 0xc9a46a, 2.0);

  // Ripples round his boots, and sweat flying off his helmet.
  const ripples = [0, 1].map((k) => add(new TorusGeometry(0.5, 0.02, 6, 32).rotateX(Math.PI / 2), FOAM, -0.55, F + 0.142, 0.55, { delay: 1.0 + k * 0.1, flat: true, noInk: true }));
  const drops = [-1, 1].map((side) => ball(0.035, CYAN, cx + side * 0.4, cy + 0.2, cz, { delay: 2.1, flat: true, noInk: true }));

  const point = new Vector3();
  const dir = new Vector3();
  const open = [-1, 1].map((side) => new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), side * 0.4));
  tick((t) => {
    for (const { balls, radii, rest, amp, phase, claws } of arms) {
      balls.forEach((part, k) => {
        const w = (k / 9) ** 1.5 * amp;
        point.copy(rest[k]).add(dir.set(Math.sin(t * 1.3 + phase + k * 0.5) * w, Math.cos(t * 1.1 + phase + k * 0.45) * w * 0.6, Math.sin(t * 0.9 + phase + k * 0.3) * w * 0.7));
        part.position.set(point.x, point.y - radii[k], point.z);
      });
      const tip = balls[9].position;
      const before = balls[8].position;
      dir.set(tip.x - before.x, tip.y + radii[9] - before.y - radii[8], tip.z - before.z).normalize();
      claws.forEach((claw, s) => {
        claw.position.set(tip.x, tip.y + radii[9], tip.z);
        claw.quaternion.setFromUnitVectors(UP, dir).multiply(open[s]);
      });
    }
    ripples.forEach((ring, k) => {
      const u = (t / 2.2 + k / 2) % 1;
      ring.children[0].scale.set(0.6 + u * 1.2, 1, 0.6 + u * 1.2);
      ring.visible = u < 0.85;
    });
    drops.forEach((drop, side) => {
      const u = (t * 0.8 + side * 0.5) % 1;
      drop.position.set(cx + (side ? 1 : -1) * (0.38 + u * 0.25), cy + 0.15 - u * u * 0.9, cz + 0.05);
      drop.visible = u < 0.8;
    });
  });

  return { width: 4.9, height: 4.5, lookY: 1.65 };
}
