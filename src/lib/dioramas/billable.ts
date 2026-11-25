import { BoxGeometry, CylinderGeometry, Group, SphereGeometry, TorusGeometry } from "three";
import { INK, MAGENTA, ORANGE, aim, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, rubble, skyline, towerCrane } from "@/lib/diorama-props";

/**
 * Billable (P222): in the ruins of a collapsed house by the port, the welder for hire props up a
 * fallen floor with a steel beam, welding it with the living torch that is his left arm while
 * sparks spray. With his other hand he holds out the bill, already as long as his leg; beside him
 * a taxi meter ticks his hours, and from under the rubble a hand waves, waiting to be paid for.
 */
export function billable(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const HIVIS = 0xff6a1a;
  const STRIPE = 0xcfd6dc;
  const ARMOUR = 0x24232c;
  const BUCKLE = 0x9aa0ab;
  const CONCRETE = 0x5a5e6a;
  const PRIMER = 0x8a2a4a;
  const PAPER = 0xf0ece0;
  const SPARK = 0xffe6a0;
  const F = octagonBase(kit, 0x1f1d28);
  const G = floor(kit, F, 0.06, 0x2c2a34, 0x1e1c26, 0.45);

  // The harbour at the back, and what is left of the house: a ragged wall with empty windows.
  skyline(kit, -1.85, G, 0.08, [0x22283e, 0x2a2440, 0x1e2a3a], -1.4, 0.9);
  towerCrane(kit, 1.55, -1.3, G, 0.15, 3.2, -1.1, 0x35607a);
  [
    [-1.55, 1.7],
    [-0.95, 2.3],
    [-0.35, 1.9],
    [0.2, 1.4],
  ].forEach(([x, h], i) => {
    const wall = box(0.6, h, 0.22, 0x3a3446, x, G, -1.2, { delay: 0.1 + i * 0.04, ink: 1.02 });
    decorate(wall, new BoxGeometry(0.2, 0.3, 0.01), 0x14121c, [[0, h - 0.6, 0.112]]);
    [-0.15, 0.1].forEach((dx, k) => cylinder(0.012, 0.012, 0.25 + k * 0.1, INK, x + dx, G + h, -1.2, { delay: 0.3, noInk: true, rotation: [0.3, 0, dx] }, 5));
  });
  rubble(kit, 1.45, 0.25, G, 0.2, 7, 0.55, 0x4a4e5c);
  rubble(kit, -1.4, -0.55, G, 0.22, 5, 0.45, 0x4a4e5c);

  // Billable, bored, the bill in his right hand and the welding organism in place of his left arm.
  const FACE = 0.5;
  const worker = figure(kit, {
    x: -0.45,
    z: 0.35,
    y: G,
    facing: FACE,
    height: 2.4,
    skin: 0xdcae8c,
    hair: { style: "short", color: 0x4a2e20 },
    face: { mouth: "smirk", brows: "calm" },
    top: { kind: "jacket", color: HIVIS, accent: 0x2a2a30 },
    bottom: { kind: "trousers", color: 0x2a2d36 },
    shoes: 0x2a2622,
    gloves: 0x1e1e22,
    arms: [[-0.32, 1.38, 0.55], [0.66, 1.3, 0.5]],
    delay: 0.8,
  });
  const at = worker.at;
  const turn: Point = [0, FACE, 0];
  // A cap worn backwards (the figure's own cap has its brim in front).
  const RH = worker.headRadius;
  const crownY = worker.head[1] - G + RH * 0.55;
  add(new SphereGeometry(RH * 1.1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0x2a3448, ...at(0, crownY - 0.03, -0.01), { delay: 1.2, rotation: turn });
  box(RH * 1.3, 0.03, RH * 0.85, 0x222a3a, ...at(0, crownY - 0.02, -RH * 1.15), { delay: 1.22, rotation: [0.15, FACE, 0] });
  // Reflective bands round the jacket, and the bum bag across his chest stuffed with cash.
  [1.2, 1.5].forEach((y, i) =>
    add(new CylinderGeometry(0.33 + i * 0.015, 0.33 + i * 0.015, 0.05, 18, 1, true).scale(1, 1, 0.76), STRIPE, ...at(0, y, 0), { delay: 1.1, rotation: turn, noInk: true }),
  );
  box(0.05, 0.75, 0.03, 0x14121c, ...at(0.02, 1.1, 0.27), { delay: 1.15, rotation: [0, FACE, 0.75], noInk: true });
  const bag = box(0.34, 0.16, 0.12, 0x1a1a20, ...at(-0.04, 1.3, 0.3), { delay: 1.18, rotation: [0, FACE, 0.3] });
  decorate(bag, new BoxGeometry(0.09, 0.08, 0.01), 0xc8d8b0, [
    [-0.08, 0.18, 0.02, 0.2],
    [0.02, 0.19, 0.0, -0.15],
    [0.1, 0.17, 0.03, 0.3],
  ]);

  // The arm: a black tube of buckled segments from shoulder to fist, ending in a glowing nozzle.
  const shoulder = at(0.4, 1.72, 0);
  const [billHand, torchHand] = worker.hands;
  const elbow = worker.elbows[1];
  const segments: Group[] = [];
  [
    [shoulder, elbow, 0.17],
    [elbow, torchHand, 0.14],
  ].forEach(([from, to, r], j) => {
    const a = from as Point;
    const b = to as Point;
    [0, 1, 2].forEach((k) => {
      const lerp = (u: number): Point => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
      const seg = limb(kit, lerp(k / 3), lerp((k + 0.86) / 3), r as number, (r as number) * 0.94, ARMOUR, { delay: 1.3 + j * 0.1 + k * 0.03 });
      const length = aim(lerp(k / 3), lerp((k + 0.86) / 3)).length;
      decorate(seg, new BoxGeometry(0.07, 0.06, 0.05), BUCKLE, [
        [0, length * 0.5, (r as number) * 0.95],
        [0, length * 0.5, -(r as number) * 0.95],
      ]);
      segments.push(seg);
    });
  });
  // The beam he is welding: primer-red steel, propping a fallen floor slab that leans down onto
  // the rubble behind it; the weld is on the face of the beam turned to him.
  const B = at(0.9, 0, 0.95);
  const BH = 1.75;
  const reach = Math.hypot(B[0] - torchHand[0], B[2] - torchHand[2]);
  const weld: Point = [B[0] - ((B[0] - torchHand[0]) / reach) * 0.14, G + 1.3, B[2] - ((B[2] - torchHand[2]) / reach) * 0.14];
  limb(kit, torchHand, weld, 0.07, 0.025, 0xb07a40, { delay: 1.6 });
  const tip = ball(0.05, ORANGE, weld[0], weld[1] - 0.05, weld[2], { delay: 1.62, flat: true });
  const beamTurn: Point = [0, Math.atan2(B[0] - torchHand[0], B[2] - torchHand[2]), 0];
  const beam = box(0.28, BH, 0.05, PRIMER, B[0], G, B[2], { delay: 0.4, rotation: beamTurn });
  box(0.05, BH, 0.24, PRIMER, B[0], G, B[2], { delay: 0.42, rotation: beamTurn });
  box(0.42, 0.04, 0.42, 0x6a2038, B[0], G, B[2], { delay: 0.44, rotation: beamTurn });
  decorate(beam, new BoxGeometry(0.22, 0.035, 0.01), ORANGE, [[0, 1.2, 0.03]]);
  const low: Point = [1.3, G + 0.25, -1.05];
  const top: Point = [B[0] + 0.1, G + BH + 0.02, B[2] - 0.05];
  const slope = aim(top, low);
  const slab = box(1.35, slope.length + 0.3, 0.16, CONCRETE, top[0], top[1] - 0.12, top[2], { delay: 0.5, rotation: slope.rotation });
  decorate(slab, new BoxGeometry(0.02, 0.9, 0.01), 0x3a3e4a, [
    [-0.2, 0.9, 0.085, 0.3],
    [0.3, 1.3, 0.085, -0.4],
    [-0.35, 1.1, -0.085, -0.3],
    [0.2, 0.7, -0.085, 0.5],
    [0.45, 1.5, -0.085, 0.1],
  ]);
  decorate(slab, new BoxGeometry(0.012, 0.28, 0.012), INK, [
    [-0.5, -0.06, 0],
    [-0.2, -0.08, 0],
    [0.15, -0.05, 0],
    [0.45, -0.09, 0],
  ]);
  rubble(kit, low[0], low[2] + 0.1, G, 0.55, 6, 0.4, 0x5a5e6a);

  // A hand sticks out of the rubble beside the slab, waving now and then: the client, waiting.
  const H: Point = [1.75, G + 0.05, -0.3];
  rubble(kit, H[0], H[2], G, 0.9, 5, 0.3, 0x4a4e5c);
  limb(kit, H, [H[0] - 0.03, H[1] + 0.34, H[2] + 0.05], 0.065, 0.06, 0x3a4a6a, { delay: 1.0 });
  const waver = ball(0.09, 0xd8a888, H[0] - 0.03, H[1] + 0.3, H[2] + 0.05, { delay: 1.05 });
  decorate(waver, new CylinderGeometry(0.018, 0.018, 0.1, 6), 0xd8a888, [
    [-0.05, 0.19, 0, 0.3],
    [-0.015, 0.21, 0, 0.1],
    [0.02, 0.21, 0, -0.1],
    [0.055, 0.18, 0, -0.35],
  ]);

  // The bill: a long paper strip hanging from his right hand, swaying on a pivot at his fist.
  const pivot = new Group();
  pivot.position.set(billHand[0], billHand[1] + 0.04, billHand[2] + 0.06);
  pivot.rotation.y = FACE;
  const strip = box(0.18, 0.85, 0.01, PAPER, 0, -0.85, 0, { delay: 1.5 });
  decorate(
    strip,
    new BoxGeometry(0.12, 0.012, 0.004),
    0x8a8f9c,
    Array.from({ length: 9 }, (_, k) => [k % 3 === 2 ? 0.02 : -0.01, 0.12 + k * 0.08, 0.008] as Point),
  );
  decorate(strip, new BoxGeometry(0.14, 0.03, 0.004), MAGENTA, [[0, 0.06, 0.008]]);
  strip.parent?.add(pivot);
  pivot.add(strip);

  // His taxi meter on a post: the hand turns, the light on top says he is on the clock.
  const M: Point = [-1.45, G, 1.0];
  cylinder(0.04, 0.05, 1.0, 0x23222b, ...M, { delay: 0.6 }, 8);
  const meter = box(0.34, 0.4, 0.18, 0x23222b, M[0], G + 1.0, M[2], { delay: 0.65, rotation: [0, 0.35, 0] });
  decorate(meter, new CylinderGeometry(0.13, 0.13, 0.01, 20).rotateX(Math.PI / 2), 0xe8e4da, [[0, 0.22, 0.095]]);
  decorate(meter, new TorusGeometry(0.13, 0.012, 6, 20), MAGENTA, [[0, 0.22, 0.1]]);
  const needle = box(0.02, 0.11, 0.01, INK, M[0] + Math.sin(0.35) * 0.11, G + 1.22, M[2] + Math.cos(0.35) * 0.11, { delay: 0.75, flat: true, noInk: true });
  const lamp = box(0.12, 0.08, 0.08, ORANGE, M[0], G + 1.4, M[2], { delay: 0.7, flat: true, rotation: [0, 0.35, 0] });

  // Sparks spraying from the weld.
  const sparks = Array.from({ length: 9 }, (_, k) => {
    const angle = -0.6 + k * 0.42;
    const dir: Point = [Math.cos(angle) * 0.7 + 0.3, Math.sin(angle) * 0.5 + 0.2, Math.sin(k * 1.7) * 0.5 + 0.4];
    const spark = box(0.025, 0.025, 0.07, k % 3 ? SPARK : ORANGE, ...weld, { delay: 1.7, flat: true, noInk: true, rotation: aim([0, 0, 0], dir).rotation });
    return { spark, dir, phase: (k * 0.37) % 1 };
  });

  tick((t) => {
    sparks.forEach(({ spark, dir, phase }) => {
      const u = (t * 1.6 + phase) % 1;
      spark.position.set(weld[0] + dir[0] * u * 0.6, weld[1] + dir[1] * u * 0.6 - u * u * 0.5, weld[2] + dir[2] * u * 0.6);
      spark.visible = u < 0.9;
    });
    tip.children[0].scale.setScalar(0.8 + 0.5 * Math.abs(Math.sin(t * 23)));
    pivot.rotation.z = Math.sin(t * 1.3) * 0.06;
    needle.rotation.set(0, 0.35, -t * 1.2);
    lamp.visible = Math.floor(t * 1.5) % 4 !== 3;
    waver.position.x = H[0] - 0.03 + (Math.sin(t * 0.9) > 0.5 ? Math.sin(t * 9) * 0.05 : 0);
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}
