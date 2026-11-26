import { BoxGeometry, CylinderGeometry, TorusGeometry } from "three";
import { CYAN, MAGENTA, YELLOW, archMouth, archedWall, jag, octagonBase, zigzag, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, puddle, ring, rubble } from "@/lib/diorama-props";

/**
 * Boato (P348): the tram driver of the line under the temple, grey-bearded in a torn green
 * uniform with brass buttons, standing on the tracks in front of the tunnel where his tram
 * waits between two stone telamons. He throws his punch at us: the fist is cracked with yellow
 * light, shock rings burst out of it and rings of water spread round his boots. "Sorry," says
 * his face. The price: no feel for machines, he has torn the tram's control lever clean off and
 * holds it, sparking; his cap lies on the sleepers.
 */
export function boato(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const STONE = 0x4a4e66;
  const GREEN = 0x1f4a44;
  const BRASS = 0xc89a3c;
  const F = octagonBase(kit, 0x1a1a24);
  const G = floor(kit, F, 0.06, 0x2e2c38, 0x22202c, 0.5);

  // The tunnel mouth under the temple: an arched stone wall, the dark beyond, the tram inside.
  const wall = add(archedWall(2.6, 2.9, 0.35, { x: 0, half: 0.65, spring: 1.15 }), STONE, 0, G, -1.75, { delay: 0.1, ink: 1.02 });
  const joints: Point[] = [];
  for (let r = 1; r < 7; r++) for (let c = 0; c < 3; c++) joints.push([-1.1 + c * 0.9 + (r % 2) * 0.35, r * 0.4, 0.18]);
  decorate(wall, new BoxGeometry(0.3, 0.02, 0.01), 0x363a50, joints);
  add(archMouth(0.65, 1.15), 0x06060a, 0, G, -1.93, { delay: 0.12, flat: true, noInk: true });
  const tram = box(1.15, 1.55, 0.6, 0xd8cfb8, 0, G + 0.05, -1.65, { delay: 0.2 });
  decorate(tram, new BoxGeometry(0.95, 0.55, 0.01), 0x16303e, [[0, 1.05, 0.305]]);
  decorate(tram, new BoxGeometry(1.16, 0.1, 0.61), MAGENTA, [[0, 0.6, 0]]);
  decorate(tram, new BoxGeometry(1.16, 0.3, 0.61), GREEN, [[0, 0.15, 0]]);
  const headlight = add(new CylinderGeometry(0.1, 0.1, 0.04, 14).rotateX(Math.PI / 2), YELLOW, 0, G + 0.45, -1.33, { delay: 0.28, flat: true });

  // Two stone telamons hold up the cornice either side of the arch.
  box(2.6, 0.16, 0.5, 0x5a6080, 0, G + 2.5, -1.45, { delay: 0.6 });
  [-1.02, 1.02].forEach((x, i) => {
    box(0.6, 0.32, 0.42, 0x5a6080, x, G, -1.42, { delay: 0.3 + i * 0.04 });
    figure(kit, {
      x,
      z: -1.42,
      y: G + 0.32,
      facing: i ? -0.2 : 0.2,
      height: 2.0,
      skin: 0x6a7090,
      hair: { style: "curly", color: 0x5a6080 },
      face: { mouth: "frown", brows: "angry", eyes: 0x3a3f56, beard: "full", beardColor: 0x5a6080 },
      top: { kind: "robe", color: 0x5a6080 },
      arms: ["up", "up"],
      delay: 0.35 + i * 0.05,
    });
  });

  // The tracks running out of the tunnel towards us.
  [-0.38, 0.38].forEach((x, i) => box(0.06, 0.06, 3.35, 0x8a93a3, x, G + 0.04, 0.35, { delay: 0.14 + i * 0.02 }));
  for (let z = -1.2; z < 2; z += 0.36) box(1.05, 0.04, 0.16, 0x3e3028, 0, G, z, { delay: 0.12 });
  puddle(kit, 0.95, 0.55, G, 0.3, 0.32, CYAN);
  puddle(kit, -1.05, 0.2, G, 0.32, 0.28, MAGENTA);
  rubble(kit, -1.15, 1.05, G, 0.4, 5, 0.4);

  // Boato on the sleepers, punching straight at us.
  const facing = 0.3;
  const driver = figure(kit, {
    x: 0,
    z: 0.4,
    y: G + 0.04,
    facing,
    height: 2.5,
    build: "broad",
    skin: 0xd09878,
    hair: { style: "short", color: 0x9a9aa0 },
    face: { mouth: "frown", brows: "worried", beard: "full", beardColor: 0xb8b8bc, marks: YELLOW },
    top: { kind: "uniform", color: GREEN, accent: BRASS },
    bottom: { kind: "trousers", color: 0x22303a },
    shoes: 0x2a2420,
    arms: [
      [-0.22, 1.8, 0.85],
      [0.55, 1.25, 0.1],
    ],
    legs: "stride",
    delay: 0.8,
  });
  const [punch, grip] = driver.hands;
  const fist = ball(0.17, 0xd09878, punch[0], punch[1] - 0.15, punch[2] + 0.04, { delay: 1.3 });
  const cracks = decorate(fist, new BoxGeometry(0.02, 0.12, 0.012), YELLOW, [
    [-0.06, 0.2, 0.16, 0.5],
    [0.04, 0.14, 0.16, -0.7],
    [0.07, 0.24, 0.15, 0.2],
    [-0.02, 0.08, 0.15, 1.2],
  ]);
  decorate(fist, new BoxGeometry(0.2, 0.03, 0.03), 0xb07a5e, [[0, 0.24, 0.13]]);

  // The price: the tram's control lever, torn off, in his other hand; his cap on the sleepers.
  box(0.05, 0.36, 0.05, BRASS, grip[0], grip[1] - 0.3, grip[2], { delay: 1.35, rotation: [0.2, 0, -0.15] });
  ball(0.06, 0x3a2a22, grip[0] - 0.02, grip[1] + 0.02, grip[2], { delay: 1.38 });
  const sparkAt: Point = [grip[0] + 0.05, grip[1] - 0.33, grip[2] + 0.06];
  const sparks = [0, 1].map((k) => zigzag(kit, jag(sparkAt, [sparkAt[0] + (k ? 0.18 : -0.1), sparkAt[1] - 0.22, sparkAt[2] + 0.12], 4, 0.04, k + 1), 0.018, k ? YELLOW : CYAN, 1.5));
  const cap = cylinder(0.17, 0.15, 0.1, GREEN, 0.85, G + 0.04, 1.15, { delay: 0.5, rotation: [0.25, 0.4, 0.3] }, 14);
  decorate(cap, new BoxGeometry(0.06, 0.04, 0.01), BRASS, [[0, 0.06, 0.16]]);
  box(0.26, 0.02, 0.14, 0x16141a, 0.92, G + 0.06, 1.3, { delay: 0.52, rotation: [0.25, 0.4, 0.3] });

  // Shock rings out of the fist; rings of water round his boots.
  const forward: Point = [Math.sin(facing), 0, Math.cos(facing)];
  const shocks = [0, 1, 2].map((k) =>
    add(new TorusGeometry(0.28, 0.035, 6, 32), k === 1 ? 0xff7ab0 : MAGENTA, punch[0], punch[1], punch[2], { delay: 1.5 + k * 0.05, flat: true, noInk: true, rotation: [0, facing, 0] }),
  );
  const ripples = [0, 1, 2].map((k) => ring(kit, [driver.at(0, 0, 0)[0], G + 0.07, driver.at(0, 0, 0)[2]], 0.4, CYAN, 1.4 + k * 0.05));

  tick((t) => {
    shocks.forEach((shock, k) => {
      const u = (t * 0.8 + k / 3) % 1;
      const s = 0.6 + u * 1.6;
      shock.children[0].scale.setScalar(s);
      const d = 0.1 + u * 0.8;
      shock.position.set(punch[0] + forward[0] * d, punch[1] - 0.04 - 0.315 * s, punch[2] + forward[2] * d);
      shock.visible = u < 0.9;
    });
    ripples.forEach((ripple, k) => {
      const u = (t * 0.45 + k / 3) % 1;
      ripple.children[0].scale.set(0.6 + u * 3, 1, 0.6 + u * 3);
      ripple.visible = u < 0.88;
    });
    const on = Math.floor(t * 8) % 5 !== 2;
    sparks.forEach((spark, k) => spark.forEach((bar) => (bar.visible = k ? on : !on || t === 0)));
    cracks.color.setHex(Math.sin(t * 4) > 0.6 ? 0xfff6c8 : YELLOW);
    headlight.visible = Math.floor(t * 3) % 7 !== 5;
  });

  return { width: 4.9, height: 4.5, lookY: 1.6 };
}
