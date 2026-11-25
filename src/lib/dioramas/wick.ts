import { BoxGeometry, CatmullRomCurve3, Color, ConeGeometry, CylinderGeometry, OctahedronGeometry, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { CYAN, MAGENTA, ORANGE, YELLOW, archMouth, archedWall, colorOf, limb, octagonBase, type Framing, type Kit } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { facade, floor, steps } from "@/lib/diorama-props";

/**
 * Wick (P198): at the foot of the old stairway of the Fosse, at night, the girl of the Lanterne
 * holds the stair's lantern up high while poor people with their bundles climb past her.
 * Their hands glow with their Signs, and the sparks of those powers drift off them into her
 * lantern: on this stair she pays the price for them, and it shows as bruises on her face.
 */
export function wick(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick } = kit;
  const STONE = 0x5d6680;
  const BRASS = 0xb08d3c;
  const F = octagonBase(kit, 0x1a1a26);
  const G = floor(kit, F, 0.06, 0x34323e, 0x24222c, 0.45);

  // The stairway up to a lit doorway, its iron handrail, and an old house of the Fosse.
  const SX = -0.65;
  const SZ = 0.5;
  const TREAD = 0.28;
  const RISE = 0.17;
  steps(kit, SX, SZ, G, 0.15, { width: 1.2, count: 8, tread: TREAD, rise: RISE, color: STONE });
  add(archedWall(1.5, 2.7, 0.2, { x: -0.1, half: 0.3, spring: 2.0 }), 0x3a3348, SX + 0.1, G, -1.78, { delay: 0.1, ink: 1.02 });
  add(archMouth(0.3, 2.0), YELLOW, SX, G, -1.9, { delay: 0.14, flat: true, noInk: true });
  const rail = SX + 0.55;
  limb(kit, [rail, G + 0.85, SZ], [rail, G + 0.85 + 8 * RISE, SZ - 8 * TREAD], 0.022, 0.022, 0x23222b, { delay: 0.3 });
  [0, 2, 4, 6, 8].forEach((k) => box(0.03, 0.85, 0.03, 0x23222b, rail, G + k * RISE, SZ - k * TREAD + 0.05, { delay: 0.32, noInk: true }));
  facade(kit, 1.15, -1.3, G, 0.2, { width: 1.2, height: 2.4, color: 0x2e2a40, windows: 2, floors: 2, lit: ORANGE });

  // The people climbing, their Signs glowing in their hands.
  const climbers = [
    { step: 2, x: SX - 0.15, color: CYAN, cloth: 0x4a4458, head: 0x6a4a5a },
    { step: 5, x: SX + 0.2, color: MAGENTA, cloth: 0x3a4a52, head: 0x2a3a42 },
  ].map(({ step, x, color, cloth, head }, i) =>
    figure(kit, {
      x,
      z: SZ - step * TREAD - TREAD / 2,
      y: G + (step + 1) * RISE,
      facing: Math.PI - 0.5 + i * 0.3,
      height: 2.2,
      build: i ? "normal" : "slim",
      skin: 0xc49072,
      hair: { style: "bob", color: 0x2a201c },
      headwear: { kind: i ? "beanie" : "bandana", color: head },
      top: { kind: "robe", color: cloth },
      gloves: color,
      arms: i ? ["down", [0.45, 1.25, 0.25]] : [[-0.45, 1.3, 0.2], "down"],
      delay: 0.6 + i * 0.1,
    }),
  );
  // The bundle of all he owns, on the second one's back.
  add(new SphereGeometry(0.26, 12, 10).scale(1.1, 0.9, 0.8), 0xb8a888, ...climbers[1].at(0, 1.25, -0.42), { delay: 1.0 });

  // Wick, the lantern up high.
  const girl = figure(kit, {
    x: 0.65,
    z: 0.65,
    y: G,
    facing: 0.25,
    height: 2.3,
    build: "slim",
    skin: 0xd8a888,
    hair: { style: "curly", color: 0x2a1e1c },
    face: { mouth: "neutral", brows: "calm", marks: 0x7a3a4a },
    top: { kind: "coat", color: 0x3a3a46, accent: 0x5a3a3a },
    bottom: { kind: "long-skirt", color: 0x7a5a30 },
    scarf: 0xa02040,
    shoes: 0x2a2622,
    arms: ["up", [0.32, 0.95, 0.3]],
    delay: 0.9,
  });
  // A second layer of skirt, and the lantern hanging from her raised hand.
  add(new CylinderGeometry(0.27, 0.42, 0.95, 16).scale(1, 1, 0.85), 0x8a6a34, ...girl.at(0, 0.1, 0), { delay: 1.28, rotation: [0, 0.25, 0] });
  add(new CylinderGeometry(0.3, 0.46, 0.5, 16).scale(1, 1, 0.85), 0x6a2a2a, ...girl.at(0, 0.55, 0), { delay: 1.3, rotation: [0, 0.25, 0] });
  const [lx, ly, lz] = girl.hands[0];
  add(new TorusGeometry(0.06, 0.012, 6, 14), BRASS, lx, ly - 0.1, lz, { delay: 1.4, rotation: [0, 0.25, 0] });
  add(new ConeGeometry(0.13, 0.1, 8), 0x23222b, lx, ly - 0.2, lz, { delay: 1.42 });
  const light = box(0.17, 0.24, 0.17, YELLOW, lx, ly - 0.45, lz, { delay: 1.44, flat: true, rotation: [0, 0.25, 0] });
  decorate(light, new BoxGeometry(0.02, 0.24, 0.18), 0x23222b, [
    [-0.085, 0, 0],
    [0.085, 0, 0],
  ]);
  decorate(light, new BoxGeometry(0.18, 0.02, 0.18), 0x23222b, [[0, 0.12, 0]]);
  cylinder(0.11, 0.1, 0.05, 0x23222b, lx, ly - 0.5, lz, { delay: 1.46 }, 8);

  // The sparks of their powers, drifting along to her lantern.
  const target = new Vector3(lx, ly - 0.33, lz);
  const paths = climbers.map((climber, i) => {
    const hand = climber.hands[i ? 1 : 0];
    const start = new Vector3(...hand);
    const mid = start.clone().lerp(target, 0.5).add(new Vector3(0, 0.45, 0.2));
    return new CatmullRomCurve3([start, mid, target]);
  });
  const sparks = paths.flatMap((path, i) =>
    [0, 1, 2, 3].map((k) => {
      const p = path.getPoint(k / 4);
      return add(new OctahedronGeometry(0.05), i ? MAGENTA : CYAN, p.x, p.y, p.z, { delay: 1.6 + k * 0.05, flat: true, noInk: true });
    }),
  );

  const warm = new Color(YELLOW);
  const hot = new Color(0xfff4c0);
  tick((t) => {
    sparks.forEach((spark, n) => {
      const path = paths[Math.floor(n / 4)];
      spark.position.copy(path.getPoint((t * 0.3 + (n % 4) / 4) % 1));
      spark.rotation.y = t * 3;
    });
    colorOf(light).lerpColors(warm, hot, (Math.sin(t * 6) + 1) / 2);
  });

  return { width: 4.9, height: 4.5, lookY: 1.55 };
}
