import { BoxGeometry, CatmullRomCurve3, Color, CylinderGeometry, Group, OctahedronGeometry, SphereGeometry, TubeGeometry, Vector3 } from "three";
import { CYAN, INK, MAGENTA, YELLOW, cable, colorOf, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { car, facade, floor, wallLantern } from "@/lib/diorama-props";

/**
 * Busker (P123): the hooded alien who came through the rift plays his mandolin at the traffic
 * lights, on the kerb by a zebra crossing, and golden strands of his one song wind out over the
 * waiting car while the lights change. A tin bucket of coins at his feet; beside it his little
 * amplifier, its plug lying on the pavement, because he never worked out where it goes.
 */
export function busker(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick, motes } = kit;
  const SKIN = 0xb4c2ce;
  const ROBE = 0x34404e;
  const WOOD = 0x7a4a2a;
  const DARK = 0x23222b;
  const F = octagonBase(kit, 0x1c1b26);
  const G = floor(kit, F, 0.06, 0x262532, 0x1c1b24, 0);

  // The pavement and kerb at the back, a house front with a lantern, the crossing and the stop line.
  const kerb = box(2.8, 0.14, 1.5, 0x4a4f60, 0, G, -1.1, { delay: 0.08, ink: 1.02 });
  decorate(kerb, new BoxGeometry(0.012, 0.004, 1.5), 0x363a48, [-0.9, -0.3, 0.3, 0.9].map((x) => [x, 0.142, 0] as Point));
  const P = G + 0.14;
  facade(kit, -0.25, -1.68, P, 0.12, { width: 2.3, height: 2.5, color: 0x2f3a52, windows: 3, floors: 2, door: true, shutters: 0x23707e });
  wallLantern(kit, -1.0, -1.53, P + 1.95, 0.3);
  const zebra = box(0.001, 0.001, 0.001, 0xe8e6e0, -0.35, G, 0.7, { delay: 0.2, noInk: true });
  decorate(zebra, new BoxGeometry(0.75, 0.006, 0.2), 0xe8e6e0, [-0.95, -0.55, -0.15, 0.25, 0.65, 1.05].map((z) => [0, 0.003, z] as Point));
  box(0.05, 0.006, 1.75, 0xe8e6e0, 0.35, G, 0.75, { delay: 0.22, flat: true, noInk: true });

  // The car waiting at the light, headlamps on.
  const [body] = car(kit, 1.1, 0.8, G, 0.4, 0x3a4a7a, 0);
  decorate(body, new BoxGeometry(0.02, 0.07, 0.13), YELLOW, [
    [-0.655, 0.2, -0.2],
    [-0.655, 0.2, 0.2],
  ]);

  // The traffic light on the corner of the kerb: magenta, yellow, cyan, round and round.
  const LX = 1.15;
  const LZ = -0.5;
  cylinder(0.04, 0.05, 2.0, DARK, LX, P, LZ, { delay: 0.3 }, 8);
  box(0.24, 0.66, 0.18, DARK, LX, P + 1.4, LZ, { delay: 0.35, rotation: [0, 0.35, 0] });
  const lamps = [MAGENTA, YELLOW, CYAN].map((color, k) =>
    add(new CylinderGeometry(0.065, 0.065, 0.03, 16).rotateX(Math.PI / 2), color, LX + 0.1 * Math.sin(0.35), P + 1.89 - k * 0.2, LZ + 0.1 * Math.cos(0.35), {
      delay: 0.4 + k * 0.03,
      flat: true,
      noInk: true,
      rotation: [0, 0.35, 0],
    }),
  );

  // Busker: grey-blue skin, a long ragged poncho with a knitted shawl, the mandolin across him.
  const facing = 0.35;
  const alien = figure(kit, {
    x: -0.35,
    z: -0.85,
    y: P,
    facing,
    height: 2.35,
    build: "slim",
    skin: SKIN,
    hair: { style: "bald", color: SKIN },
    face: { blank: true },
    top: { kind: "robe", color: ROBE },
    shoes: DARK,
    scarf: 0x5e6a78,
    arms: [
      [-0.1, 1.3, 0.44],
      [0.4, 1.78, 0.38],
    ],
    delay: 0.8,
  });
  // His head: a tall egg narrowing to the chin, two big black eyes, under a hood; two antennae.
  const [hx, hy, hz] = alien.head;
  const R = alien.headRadius * 1.15;
  const egg = new SphereGeometry(R, 18, 14);
  const v = egg.getAttribute("position");
  for (let i = 0; i < v.count; i++) {
    const k = v.getY(i) < 0 ? 1 + (v.getY(i) / R) * 0.42 : 1;
    v.setXYZ(i, v.getX(i) * k, v.getY(i) * 1.3, v.getZ(i) * k);
  }
  egg.computeVertexNormals();
  const cranium = add(egg, SKIN, hx, hy + 0.05 - R * 1.3, hz, { delay: 1.15, rotation: [0, facing, 0] });
  decorate(cranium, new SphereGeometry(0.07, 12, 8).scale(1.45, 0.72, 0.45), INK, [
    [-0.09, R * 1.3 + 0.0, R * 0.86, -0.45],
    [0.09, R * 1.3 + 0.0, R * 0.86, 0.45],
  ]);
  decorate(cranium, new BoxGeometry(0.05, 0.01, 0.02), 0x5a6470, [[0, R * 0.55, R * 0.62]]);
  const hood = new SphereGeometry(R * 1.25, 18, 12, Math.PI / 2 + 0.8, Math.PI * 2 - 1.6, 0, Math.PI * 0.72).scale(1, 1.25, 1.05);
  hood.computeBoundingBox();
  add(hood, ROBE, hx, hy + 0.05 + (hood.boundingBox?.min.y ?? 0), hz - 0.03, { delay: 1.18, rotation: [0, facing, 0] });
  const top = hy - P + 0.05 + R * 1.45;
  const antennae = [-1, 1].map((side) => {
    const p = (dx: number, dy: number, dz: number): Point => alien.at(side * dx, top + dy, dz);
    const points = [p(0.06, -0.04, 0), p(0.16, 0.28, 0.02), p(0.38, 0.55, 0.06), p(0.55, 0.5, 0.1), p(0.5, 0.38, 0.12)];
    const part = cable(kit, points, 0.016, 0xd8e0e8, 1.3);
    const [ox, oy, oz] = part.position.toArray();
    const tip = points[4];
    decorate(part, new SphereGeometry(0.035, 8, 6), 0xd8e0e8, [[tip[0] - ox, tip[1] - oy, tip[2] - oz]]);
    return part;
  });

  // The mandolin, built round its own centre and then laid across him.
  const neck = new Group();
  const bowl = add(new SphereGeometry(0.2, 16, 12).scale(1, 1.28, 0.55), WOOD, 0, -0.256, 0, { delay: 1.3 });
  decorate(bowl, new CylinderGeometry(0.17, 0.17, 0.01, 20).rotateX(Math.PI / 2).scale(1, 1.25, 1), 0xc89a5a, [[0, 0.256, 0.1]]);
  decorate(bowl, new CylinderGeometry(0.055, 0.055, 0.012, 16).rotateX(Math.PI / 2), INK, [[0, 0.3, 0.105]]);
  decorate(bowl, new BoxGeometry(0.008, 0.62, 0.006), YELLOW, [-0.03, -0.01, 0.01, 0.03].map((x) => [x, 0.42, 0.112] as Point));
  const arm = box(0.075, 0.5, 0.04, 0x4a2c1c, 0, 0.2, 0.06, { delay: 1.33 });
  const head = box(0.1, 0.15, 0.035, 0x4a2c1c, 0, 0.69, 0.04, { delay: 1.36, rotation: [-0.25, 0, 0] });
  decorate(head, new SphereGeometry(0.018, 6, 4), 0xd8c080, [
    [-0.06, 0.04, 0],
    [0.06, 0.04, 0],
    [-0.06, 0.1, 0],
    [0.06, 0.1, 0],
  ]);
  bowl.parent?.add(neck);
  neck.add(bowl, arm, head);
  neck.position.set(...alien.at(-0.03, 1.38, 0.33));
  neck.rotation.order = "YXZ";
  neck.rotation.set(-0.15, facing, -0.8);

  // His one song: golden strands from the soundhole, sparks running along them.
  const S = alien.at(-0.02, 1.36, 0.45);
  const strands: Point[][] = [
    [S, [0.3, P + 1.75, -0.2], [0.8, P + 1.35, 0.2], [1.15, P + 1.7, 0.55], [1.55, P + 1.25, 0.85]],
    [S, [-0.1, P + 0.95, 0.2], [0.35, P + 1.25, 0.75], [-0.05, P + 1.65, 1.15], [-0.65, P + 1.35, 1.2]],
    [S, [-0.8, P + 1.95, -0.35], [-1.35, P + 1.5, 0.25], [-1.65, P + 2.0, 0.55]],
  ];
  const curves = strands.map((points) => new CatmullRomCurve3(points.map((point) => new Vector3(...point))));
  curves.forEach((curve, i) => {
    const tube = new TubeGeometry(curve, 48, 0.016, 5);
    tube.computeBoundingBox();
    add(tube, YELLOW, 0, tube.boundingBox?.min.y ?? 0, 0, { delay: 1.5 + i * 0.08, flat: true, noInk: true });
  });
  const sparks = curves.flatMap((curve, i) =>
    [0, 1, 2].map((k) => ({ part: add(new OctahedronGeometry(0.045), 0xfff2a0, 0, 0, 0, { delay: 1.6, flat: true, noInk: true }), curve, phase: k / 3 + i * 0.15 })),
  );
  motes(8, YELLOW, 0.022, [-0.6, P + 1.0, -0.5], [0.6, P + 2.2, 0.6], 1.6);

  // The tin bucket with the day's coins, one still spinning on the kerb.
  const bucket = cylinder(0.17, 0.13, 0.26, 0x8a93a3, 0.32, P, -0.52, { delay: 0.6 }, 16);
  decorate(bucket, new CylinderGeometry(0.155, 0.155, 0.01, 16), 0x3a3f4a, [[0, 0.252, 0]]);
  decorate(bucket, new CylinderGeometry(0.035, 0.035, 0.012, 10), YELLOW, [
    [-0.05, 0.262, 0.03],
    [0.06, 0.264, -0.02],
    [0.0, 0.266, -0.07],
    [0.04, 0.27, 0.06],
  ]);
  const coin = add(new CylinderGeometry(0.04, 0.04, 0.012, 12).rotateX(Math.PI / 2), YELLOW, 0.62, P, -0.42, { delay: 0.7 });

  // The amplifier, and its plug on the pavement, far from any socket.
  const amp = box(0.36, 0.32, 0.22, 0x2a2834, -1.1, P, -0.6, { delay: 0.65, rotation: [0, 0.5, 0] });
  decorate(amp, new CylinderGeometry(0.1, 0.1, 0.01, 16).rotateX(Math.PI / 2), 0x14121c, [[0, 0.15, 0.112]]);
  decorate(amp, new BoxGeometry(0.03, 0.03, 0.01), 0x3a3a46, [[0.12, 0.27, 0.112]]);
  cable(kit, [[-0.95, P + 0.06, -0.62], [-0.85, P + 0.02, -0.4], [-0.95, P + 0.015, -0.25], [-0.78, P + 0.015, -0.2]], 0.012, INK, 0.75);
  const plug = box(0.07, 0.05, 0.1, 0x2a2834, -0.74, P, -0.2, { delay: 0.78, rotation: [0, 1.2, 0] });
  decorate(plug, new BoxGeometry(0.012, 0.012, 0.05), 0xc0c4cc, [
    [-0.015, 0.025, 0.07],
    [0.015, 0.025, 0.07],
  ]);

  const lit = [MAGENTA, YELLOW, CYAN].map((color) => new Color(color));
  const dim = lit.map((color) => color.clone().multiplyScalar(0.22));
  const neckRest = neck.rotation.z;
  tick((t) => {
    // The lights: magenta, then cyan, a short yellow between.
    const phase = t % 7;
    const on = phase < 3 ? 0 : phase < 6 ? 2 : 1;
    lamps.forEach((lamp, k) => colorOf(lamp).copy(k === on ? lit[k] : dim[k]));
    for (const s of sparks) {
      const u = (t * 0.18 + s.phase) % 1;
      s.part.position.copy(s.curve.getPointAt(u));
      s.part.rotation.y = t * 3;
    }
    // He sways with the tune; the antennae keep time; the coin spins.
    neck.rotation.z = neckRest + Math.sin(t * 4) * 0.04;
    antennae.forEach((part, k) => (part.rotation.z = Math.sin(t * 2 + k * Math.PI) * 0.06));
    coin.rotation.y = t * 6;
  });

  return { width: 4.9, height: 4.4, lookY: 1.55 };
}
