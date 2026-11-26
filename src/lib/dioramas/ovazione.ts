import { BoxGeometry, ConeGeometry, CylinderGeometry, Group, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { CYAN, INK, MAGENTA, YELLOW, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Ovazione (P319): the Compagnia Lete's sponsored "hero" in the wrestling ring, bald, bearded
 * and beaming in his shiny jacket, both fists up as confetti falls. He swells with every wave of
 * applause, and never notices where it comes from: the crowd round the ring is a row of
 * identical cardboard cut-outs, the cheering a loudspeaker on a pole.
 */
export function ovazione(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick } = kit;
  const CARD = 0xb08a5a;
  const F = octagonBase(kit, 0x1c1a26);
  const G = floor(kit, F, 0.06, 0x2a2834, 0x1e1c28, 0.6);

  // The ring: apron, canvas, corner posts with pads, three ropes a side.
  const RING = 1.25;
  const Z0 = -0.05;
  const apron = box(RING * 2 + 0.1, 0.35, RING * 2 + 0.1, 0x2a1e3a, 0, G, Z0, { delay: 0.1, ink: 1.02 });
  decorate(apron, new BoxGeometry(RING * 2 + 0.12, 0.08, RING * 2 + 0.12), MAGENTA, [[0, 0.2, 0]]);
  const M = G + 0.35;
  box(RING * 2, 0.02, RING * 2, 0x3a4a6a, 0, M, Z0, { delay: 0.14, noInk: true });
  const corners: Point[] = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => [sx * (RING - 0.06), M, Z0 + sz * (RING - 0.06)] as Point));
  corners.forEach(([x, y, z], i) => {
    cylinder(0.06, 0.06, 1.15, 0x23222b, x, y, z, { delay: 0.2 + i * 0.03 }, 10);
    box(0.14, 0.7, 0.14, CYAN, x, y + 0.3, z, { delay: 0.24 + i * 0.03 });
  });
  [0.4, 0.7, 1.0].forEach((h, k) => {
    const y = M + h;
    const L = RING * 2 - 0.12;
    box(L, 0.035, 0.035, MAGENTA, 0, y, Z0 - RING + 0.06, { delay: 0.3 + k * 0.03, noInk: true });
    box(L, 0.035, 0.035, MAGENTA, 0, y, Z0 + RING - 0.06, { delay: 0.3 + k * 0.03, noInk: true });
    [-1, 1].forEach((s) => box(0.035, 0.035, L, MAGENTA, s * (RING - 0.06), y, Z0, { delay: 0.3 + k * 0.03, noInk: true }));
  });
  [-1, 1].forEach((s) => {
    const lampAt: Point = [s * (RING - 0.06), M + 1.15, Z0 - RING + 0.06];
    const can = cylinder(0.12, 0.09, 0.22, 0x23222b, ...lampAt, { delay: 0.4, rotation: [0.9, s * -0.5, 0] }, 12);
    decorate(can, new CylinderGeometry(0.1, 0.1, 0.01, 12), YELLOW, [[0, 0.225, 0]]);
  });

  // The "crowd": identical cardboard cut-outs on stakes, arms up, all smiling the same smile.
  const fans: [number, number, number][] = [
    [-0.9, -1.75, 0],
    [-0.3, -1.8, 0],
    [0.3, -1.8, 0],
    [0.9, -1.75, 0],
    [-1.75, -0.75, Math.PI / 2 - 0.2],
    [-1.8, 0.1, Math.PI / 2],
    [-1.7, 0.95, Math.PI / 2 + 0.2],
  ];
  fans.forEach(([x, z, turn], i) => {
    const d = 0.5 + i * 0.04;
    const [c, s] = [Math.cos(turn), Math.sin(turn)];
    const at = (lx: number, ly: number): Point => [x + lx * c, G + ly, z - lx * s];
    const o = { delay: d, rotation: [0, turn, 0] as [number, number, number] };
    box(0.04, 0.6, 0.03, 0x5e4a3a, ...at(0, 0), o);
    const body = box(0.42, 0.62, 0.025, CARD, ...at(0, 0.55), o);
    decorate(body, new BoxGeometry(0.36, 0.55, 0.01), i % 2 ? CYAN : MAGENTA, [[0, 0.31, 0.014]]);
    const head = add(new CylinderGeometry(0.16, 0.16, 0.025, 16).rotateX(Math.PI / 2), CARD, ...at(0, 1.15), o);
    decorate(head, new CylinderGeometry(0.14, 0.14, 0.01, 16).rotateX(Math.PI / 2), 0xe8c0a0, [[0, 0.16, 0.014]]);
    decorate(head, new BoxGeometry(0.03, 0.03, 0.01), INK, [
      [-0.05, 0.2, 0.02],
      [0.05, 0.2, 0.02],
    ]);
    decorate(head, new BoxGeometry(0.1, 0.025, 0.01), 0x8a2a3a, [[0, 0.1, 0.02]]);
    [-1, 1].forEach((side) => box(0.07, 0.36, 0.025, CARD, ...at(side * 0.24, 1.08), { delay: d + 0.02, rotation: [0, turn, -side * 0.5] }));
  });

  // The loudspeaker on its pole, blaring recorded applause at the ring.
  cylinder(0.04, 0.05, 2.3, 0x23222b, 1.75, G, -0.75, { delay: 0.6 }, 8);
  const mouth = new Vector3(1.36, G + 2.3, -0.41);
  add(new ConeGeometry(0.22, 0.45, 14, 1, true).rotateZ(-Math.PI / 2), 0x8a93a3, 1.525, G + 2.08, -0.55, { delay: 0.65, rotation: [0, 0.72, 0] });
  box(0.16, 0.16, 0.16, 0x23222b, 1.75, G + 2.22, -0.75, { delay: 0.66 });
  const waves = [0, 1, 2].map((k) => add(new TorusGeometry(0.22, 0.02, 6, 24), YELLOW, mouth.x, mouth.y - 0.22, mouth.z, { delay: 1.2 + k * 0.1, flat: true, noInk: true, rotation: [0, -0.7, 0] }));
  const out = new Vector3(-0.75, -0.2, 0.66).normalize();

  // Ovazione, fists up, swelling with the noise.
  const W = figure(kit, {
    x: 0.05,
    z: 0.05,
    y: M + 0.02,
    facing: 0.3,
    height: 2.5,
    build: "heavy",
    skin: 0xd8a888,
    hair: { style: "bald", color: 0x2a1e1c },
    face: { mouth: "none", brows: "raised" },
    top: { kind: "jacket", color: 0x8a1e40, accent: 0x2a1a24 },
    bottom: { kind: "trousers", color: 0x1e1a24 },
    shoes: 0x14121c,
    belt: 0x2a1a24,
    arms: ["fist", "fist"],
    legs: "wide",
    delay: 0.8,
  });
  [
    [0.22, 1.62, YELLOW],
    [0.22, 1.45, CYAN],
    [-0.24, 1.6, 0xe8e4dc],
  ].forEach(([dx, y, color], i) => W.parts.push(box(0.16, 0.1, 0.02, color, ...W.at(dx, y, 0.36), { delay: 1.4 + i * 0.03, flat: true, noInk: true, rotation: [0, 0.3, 0] })));
  // His own beard, so the grin can show through it.
  const RH = W.headRadius;
  const beard = add(new SphereGeometry(RH * 0.95, 14, 10).scale(1.02, 1, 0.8), 0x2a1e1c, ...W.at(0, W.head[1] - M - 0.02 - RH * 1.7, RH * 0.3), { delay: 1.15, rotation: [0, 0.3, 0] });
  decorate(beard, new BoxGeometry(0.14, 0.05, 0.02), 0xf4f0e6, [[0, RH * 1.7 - 0.1, RH * 0.74]]);
  decorate(beard, new BoxGeometry(0.16, 0.035, 0.02), 0x2a1e1c, [[0, RH * 1.7 - 0.06, RH * 0.76]]);
  W.parts.push(beard);
  const feet = new Vector3(...W.at(0, 0, 0));
  const grow = new Group();
  apron.parent?.add(grow);
  grow.position.copy(feet);
  W.parts.forEach((part) => {
    part.position.sub(feet);
    grow.add(part);
  });

  // Confetti falling on the ring.
  const COLORS = [MAGENTA, CYAN, YELLOW, 0xf4f0e6];
  const confetti = Array.from({ length: 26 }, (_, k) => {
    const x = Math.sin(k * 12.9898) * 1.15;
    const z = Z0 + Math.cos(k * 78.233) * 1.15;
    return { part: box(0.08, 0.05, 0.005, COLORS[k % 4], x, M + 1, z, { delay: 1.5, flat: true, noInk: true }), x, z, speed: 0.35 + (k % 5) * 0.08, phase: (k * 0.37) % 1 };
  });

  tick((t) => {
    const cheer = (Math.sin(t * 1.6) + 1) / 2;
    grow.scale.setScalar(1 + 0.07 * cheer);
    waves.forEach((wave, k) => {
      const u = (t * 0.7 + k / 3) % 1;
      const size = 0.6 + u * 1.6;
      wave.position.copy(mouth).addScaledVector(out, u * 1.1);
      wave.position.y -= 0.22 * size;
      wave.children.forEach((mesh) => mesh.scale.setScalar(size));
      wave.visible = u < 0.85;
    });
    confetti.forEach(({ part, x, z, speed, phase }, k) => {
      const fall = (t * speed * 0.3 + phase) % 1;
      part.position.set(x + Math.sin(t * 2 + k) * 0.08, M + 3.0 - fall * 2.95, z);
      part.rotation.set(t * 3 + k, t * 2, k);
    });
  });

  return { width: 4.9, height: 4.5, lookY: 1.65 };
}
