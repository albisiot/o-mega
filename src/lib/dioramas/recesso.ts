import { BoxGeometry, DodecahedronGeometry, Group, SphereGeometry, TorusGeometry } from "three";
import { CYAN, MAGENTA, ORANGE, aim, cable, jag, octagonBase, zigzag, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, puddle, wallLantern } from "@/lib/diorama-props";

/**
 * Recesso (P224): the eviction officer of the Fosse, an evicted man himself, in a brick alley of
 * the old town at night: the door behind him is taped shut, a chair and a suitcase wait on the
 * cobbles, and he carries his own life in a green tarpaulin bundle on his shoulder. A stone flies
 * at him; he flinches and looks the wrong way, but the copper comb registered to him rises in his
 * fist and sends it straight back in a burst of orange sparks.
 */
export function recesso(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick } = kit;
  const BRICK = 0x4a2a32;
  const COAT = 0x2e3a4a;
  const TARP = 0x2f6a3a;
  const ROPE = 0xc9a46a;
  const COPPER = 0xd0803a;
  const WOOD = 0x5e4a3a;
  const GLARE = 0xffc070;
  const F = octagonBase(kit, 0x1a1c26);
  const G = floor(kit, F, 0.06, 0x283042, 0x1a2030, 0.26);

  // The alley wall: brick courses, the taped-up door with its blank notice, a lantern.
  const wall = box(3.3, 2.7, 0.2, BRICK, -0.3, G, -1.3, { delay: 0.1, ink: 1.02 });
  const joints: Point[] = [];
  const heads: Point[] = [];
  for (let r = 0; r < 13; r++) {
    joints.push([0, 0.2 + r * 0.2, 0.101]);
    for (let c = 0; c < 8; c++) heads.push([-1.5 + c * 0.42 + (r % 2) * 0.21, 0.1 + r * 0.2, 0.101]);
  }
  decorate(wall, new BoxGeometry(3.3, 0.02, 0.01), 0x2a161c, joints);
  decorate(wall, new BoxGeometry(0.02, 0.2, 0.01), 0x2a161c, heads);
  decorate(wall, new BoxGeometry(0.64, 1.3, 0.02), 0x1e1418, [[-0.85, 0.65, 0.105]]);
  decorate(wall, new BoxGeometry(1.1, 0.07, 0.02), MAGENTA, [
    [-0.85, 0.7, 0.118, 0.95],
    [-0.85, 0.7, 0.12, -0.95],
  ]);
  decorate(wall, new BoxGeometry(0.2, 0.26, 0.02), 0xe8e4da, [[-0.85, 1.05, 0.125]]);
  wallLantern(kit, 0.55, -1.2, G + 2.25, 0.3, ORANGE);
  puddle(kit, 0.75, 1.2, G, 0.4, 0.42, CYAN);

  // The evicted belongings on the cobbles: a chair, a suitcase, a framed picture.
  const CH: Point = [-1.5, G, -0.45];
  [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => box(0.04, 0.42, 0.04, WOOD, CH[0] + sx * 0.17, G, CH[2] + sz * 0.17, { delay: 0.35, noInk: true })));
  box(0.42, 0.05, 0.42, WOOD, CH[0], G + 0.42, CH[2], { delay: 0.38 });
  box(0.42, 0.5, 0.05, WOOD, CH[0], G + 0.47, CH[2] - 0.19, { delay: 0.4 });
  const suitcase = box(0.55, 0.38, 0.18, 0x6a3a2a, -0.85, G, -0.75, { delay: 0.42, rotation: [0, 0.3, 0] });
  decorate(suitcase, new BoxGeometry(0.16, 0.04, 0.04), 0x2a1a14, [[0, 0.4, 0]]);
  decorate(suitcase, new BoxGeometry(0.03, 0.38, 0.01), 0x8a5a3a, [
    [-0.15, 0.19, 0.092],
    [0.15, 0.19, 0.092],
  ]);
  const picture = box(0.4, 0.32, 0.04, 0xb08d3c, CH[0] + 0.02, G + 0.47, CH[2] + 0.05, { delay: 0.45, rotation: [-0.25, 0.2, 0] });
  decorate(picture, new BoxGeometry(0.32, 0.24, 0.01), 0x3a5a6a, [[0, 0.16, 0.022]]);

  // Recesso, braced and startled, the bundle on his shoulder and the comb raised.
  const FACE = 0.6;
  const officer = figure(kit, {
    x: 0.1,
    z: 0.3,
    y: G,
    facing: FACE,
    height: 2.45,
    skin: 0xdcac8c,
    hair: { style: "short", color: 0x2a1e1c },
    face: { mouth: "open", brows: "worried" },
    headwear: { kind: "cap", color: 0x3a4454, accent: 0x323c4a },
    top: { kind: "coat", color: COAT, accent: 0x243040 },
    bottom: { kind: "trousers", color: 0x2a3040 },
    shoes: 0x1e1c1c,
    arms: [[-0.5, 2.05, 0.38], [0.3, 1.82, 0.12]],
    legs: "wide",
    delay: 0.8,
  });
  const at = officer.at;
  const u = 2.45 / 2.4;
  // Iron cuffs round both ankles.
  [at(-0.34 * u, 0.18, 0), at(0.34 * u, 0.18, 0)].forEach((p, i) =>
    add(new TorusGeometry(0.11, 0.03, 6, 14).rotateX(Math.PI / 2), 0x9aa0ab, ...p, { delay: 1.3 + i * 0.03 }),
  );

  // The bundle: a green tarpaulin tied with rope, slung over his left shoulder.
  const sling = new Group();
  sling.position.set(...at(0.42, 1.72, -0.32));
  sling.rotation.order = "YXZ";
  sling.rotation.set(-0.35, FACE, -0.75);
  const sack = add(new SphereGeometry(0.32, 16, 12).scale(1, 1.8, 0.9), TARP, 0, -0.58, 0, { delay: 1.2 });
  decorate(sack, new TorusGeometry(0.28, 0.025, 6, 18).rotateX(Math.PI / 2).scale(1, 1, 0.9), ROPE, [
    [0, 0.3, 0],
    [0, 0.85, 0],
  ]);
  sack.parent?.add(sling);
  sling.add(sack);
  cable(kit, [officer.hands[1], at(0.3, 2.0, -0.05), at(0.5, 2.05, -0.3)], 0.018, ROPE, 1.4);

  // The comb: a pale handle in his fist, a copper spine with its teeth.
  const hand = officer.hands[0];
  const dir: Point = [-0.38, 1, 0.3];
  const n = Math.hypot(...dir);
  const along = (d: number): Point => [hand[0] + (dir[0] / n) * d, hand[1] + (dir[1] / n) * d, hand[2] + (dir[2] / n) * d];
  const { rotation } = aim(hand, along(1));
  cylinder(0.028, 0.028, 0.16, 0xe0d0a8, ...along(-0.06), { delay: 1.5, rotation }, 8);
  const comb = box(0.06, 0.46, 0.022, COPPER, ...along(0.1), { delay: 1.55, rotation });
  decorate(
    comb,
    new BoxGeometry(0.09, 0.014, 0.014),
    COPPER,
    Array.from({ length: 11 }, (_, k) => [0.07, 0.04 + k * 0.038, 0] as Point),
  );
  const tip = along(0.5);

  // The stone and the sparks of the hit.
  const from: Point = [tip[0] - 1.6, tip[1] - 0.9, tip[2] + 1.3];
  const stone = add(new DodecahedronGeometry(0.08), 0x7a8090, ...from, { delay: 1.7 });
  const flash = add(new SphereGeometry(0.09, 12, 8), GLARE, tip[0], tip[1] - 0.09, tip[2], { delay: 1.75, flat: true, noInk: true });
  const bolts = [
    [-0.6, 0.5, 0.3],
    [-0.1, 0.65, 0.4],
    [-0.65, -0.05, 0.5],
    [0.25, 0.45, 0.2],
  ].flatMap(([dx, dy, dz], i) => zigzag(kit, jag(tip, [tip[0] + dx, tip[1] + dy, tip[2] + dz], 4, 0.06, i + 1), 0.022, i % 2 ? ORANGE : GLARE, 1.8));

  const lerp = (a: Point, b: Point, k: number): Point => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  const back: Point = [tip[0] - 1.5, tip[1] + 0.5, tip[2] + 1.1];
  tick((t) => {
    // The stone comes in, meets the comb, and goes straight back where it came from.
    const p = (t * 0.45 + 0.42) % 1;
    const hit = p >= 0.42 && p < 0.58;
    stone.position.set(...(p < 0.42 ? lerp(from, tip, p / 0.42) : p < 0.58 ? tip : lerp(tip, back, (p - 0.58) / 0.42)));
    stone.rotation.set(t * 5, t * 3, 0);
    stone.visible = !hit && p > 0.04 && p < 0.96;
    flash.visible = hit;
    flash.children[0].scale.setScalar(1 + Math.sin(t * 40) * 0.25);
    bolts.forEach((bolt, i) => (bolt.visible = hit ? (Math.floor(t * 18) + i) % 3 !== 0 : (Math.floor(t * 6) + i) % 5 === 0));
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}
