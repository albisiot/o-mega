import { BoxGeometry, ConeGeometry, CylinderGeometry, ExtrudeGeometry, Shape, TorusGeometry } from "three";
import { INK, MAGENTA, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { column, floor, table } from "@/lib/diorama-props";

/**
 * Acuto (P296): the opera chorister of the Lanterne lets out his chest-voice high C on the square
 * before the opera house, arms flung wide. Rings of sound pour from his mouth, the tall lit
 * windows behind him burst and glass flies everywhere, the score blows off its stand, and on the
 * café table beside him a wine glass has just exploded. Keeping quiet is beyond him.
 */
export function acuto(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick } = kit;
  const F = octagonBase(kit, 0x1c1a28);
  const G = floor(kit, F, 0.06, 0x35303f, 0x262230, 0.55);
  const STONE = 0x8a92b8;
  const LIT = 0xffc860;
  const GLASS = 0xc8f2ff;
  const PAPER = 0xeeeae0;

  // The opera house: tall arched windows, a colonnade on its plinth, a pediment.
  const wall = box(3, 3, 0.3, 0x2c2f4a, 0, G, -1.55, { delay: 0.1, ink: 1.02 });
  const face = 0.156;
  const windows = [-0.9, 0, 0.9];
  decorate(wall, new BoxGeometry(0.46, 1.1, 0.012), LIT, windows.map((x) => [x, 1.45, face] as Point));
  decorate(wall, new CylinderGeometry(0.23, 0.23, 0.012, 16, 1, false, Math.PI / 2, Math.PI).rotateX(Math.PI / 2), LIT, windows.map((x) => [x, 2.0, face] as Point));
  decorate(wall, new BoxGeometry(0.02, 1.3, 0.014), INK, windows.map((x) => [x, 1.55, face + 0.002] as Point));
  decorate(wall, new BoxGeometry(0.46, 0.02, 0.014), INK, windows.map((x) => [x, 1.65, face + 0.002] as Point));
  // Burst panes: dark holes with jagged cracks.
  decorate(wall, new BoxGeometry(0.16, 0.26, 0.014), 0x141826, [
    [-0.98, 1.3, face + 0.001, 0.4],
    [0.1, 1.85, face + 0.001, -0.5],
    [0.82, 1.25, face + 0.001, 0.2],
  ]);
  decorate(wall, new BoxGeometry(0.012, 0.3, 0.014), INK, [
    [-0.85, 1.2, face + 0.003, 0.9],
    [-0.8, 1.45, face + 0.003, -0.7],
    [0.05, 1.3, face + 0.003, 0.5],
    [0.95, 1.5, face + 0.003, -0.4],
    [0.9, 1.9, face + 0.003, 0.8],
  ]);
  box(3, 0.18, 0.55, STONE, 0, G, -1.15, { delay: 0.15 });
  [-1.35, -0.45, 0.45, 1.35].forEach((x, i) => column(kit, x, -1.15, G + 0.18, 0.2 + i * 0.04, 2.6, false, STONE));
  box(3.1, 0.22, 0.6, STONE, 0, G + 2.84, -1.2, { delay: 0.4 });
  const gable = new Shape();
  gable.moveTo(-1.55, 0);
  gable.lineTo(1.55, 0);
  gable.lineTo(0, 0.55);
  gable.closePath();
  const pediment = add(new ExtrudeGeometry(gable, { depth: 0.5, bevelEnabled: false }).translate(0, 0, -0.25), STONE, 0, G + 3.06, -1.2, { delay: 0.45 });
  decorate(pediment, new CylinderGeometry(0.1, 0.1, 0.01, 16).rotateX(Math.PI / 2), LIT, [[0, 0.22, 0.255]]);

  // Acuto, arms flung wide, mouth wide open on the high C.
  const H = 2.45;
  const u = H / 2.4;
  const facing = 0.3;
  const tenor = figure(kit, {
    x: 0.1,
    z: 0.35,
    y: G,
    facing,
    height: H,
    build: "broad",
    skin: 0xe8b89a,
    hair: { style: "curly", color: 0x8a8a98 },
    face: { mouth: "none", brows: "angry" },
    top: { kind: "uniform", color: 0x7a1a36, accent: 0xe0b040 },
    bottom: { kind: "trousers", color: 0x1a1a26 },
    shoes: 0x1a1a22,
    belt: 0x16141e,
    scarf: 0xc0203c,
    arms: [[-1.0, 1.62, 0.3], [1.0, 1.62, 0.3]],
    legs: "wide",
    delay: 0.9,
  });
  const RH = 0.23 * u; // the broad build's head
  decorate(tenor.headPart, new BoxGeometry(0.1 * u, 0.1 * u, 0.03), 0x3a1a20, [[0, RH * 1.06 - 0.11 * u, RH * 0.9 - 0.015]]);
  // Gold frogging across the jacket (the torso is the figure's eighth part).
  const torso = tenor.parts[7];
  [0.2, 0.32, 0.44, 0.56].forEach((h) => decorate(torso, new BoxGeometry(0.24 * u, 0.025, 0.02), 0xe0b040, [[0, h * u, (0.36 + 0.09 * (h / 0.7)) * u * 0.72 + 0.005]]));

  // Rings of sound rolling out of his mouth.
  const ahead: Point = [Math.sin(facing), 0, Math.cos(facing)];
  const mouth = tenor.at(0, 2.03 * u, 0.24);
  const rings = [0, 1, 2].map((k) =>
    add(new TorusGeometry(0.3, 0.015, 6, 36), MAGENTA, ...mouth, { delay: 1.6 + k * 0.1, flat: true, noInk: true, rotation: [0, facing, 0] }),
  );

  // Flying glass: shards bursting from the windows and the wine glass.
  const shard = new ConeGeometry(0.07, 0.26, 3).scale(1, 1, 0.25);
  const shards = Array.from({ length: 12 }, (_, k) => {
    const from: Point = k < 9 ? [windows[k % 3], G + 1.2 + (k % 4) * 0.3, -1.3] : [1.5, G + 0.95, 0.65];
    const part = add(shard.clone(), GLASS, ...from, { delay: 1.7 + k * 0.03 });
    const push: Point = k < 9 ? [((k * 37) % 9) / 9 - 0.5, 0.25 + (k % 3) * 0.15, 1.0 + (k % 4) * 0.22] : [(k - 10) * 0.25, 0.45, 0.2];
    return { part, from, push };
  });

  // The café table: one glass still standing, the other exploded.
  const top = table(kit, 1.45, 0.75, G, 0.4, true, 0x3a4050);
  decorate(top, new CylinderGeometry(0.12, 0.12, 0.004, 12), 0x8a1a3a, [[0.05, 0.044, -0.05]]);
  cylinder(0.012, 0.03, 0.14, GLASS, 1.32, G + 0.79, 0.85, { delay: 0.6 }, 8);
  add(new CylinderGeometry(0.07, 0.035, 0.12, 12, 1, true), GLASS, 1.32, G + 0.93, 0.85, { delay: 0.62 });
  cylinder(0.012, 0.03, 0.12, GLASS, 1.55, G + 0.79, 0.65, { delay: 0.6 }, 8);
  add(new ConeGeometry(0.03, 0.06, 5), GLASS, 1.55, G + 0.91, 0.65, { delay: 0.62 });

  // The music stand, its score blowing away.
  const SX = -1.25;
  const SZ = 0.65;
  [0, 2.1, 4.2].forEach((a) => limb(kit, [SX + Math.cos(a) * 0.22, G, SZ + Math.sin(a) * 0.22], [SX, G + 0.35, SZ], 0.015, 0.015, INK, { delay: 0.5 }));
  cylinder(0.015, 0.015, 0.85, INK, SX, G + 0.35, SZ, { delay: 0.52 }, 6);
  const desk = box(0.5, 0.36, 0.03, 0x2a2a34, SX, G + 1.1, SZ, { delay: 0.55, rotation: [-0.35, facing, 0] });
  decorate(desk, new BoxGeometry(0.42, 0.3, 0.005), PAPER, [[0, 0.18, 0.018]]);
  decorate(
    desk,
    new BoxGeometry(0.36, 0.006, 0.004),
    INK,
    [0.08, 0.1, 0.12, 0.14, 0.16, 0.22, 0.24, 0.26, 0.28, 0.3].map((y) => [0, y, 0.022] as Point),
  );
  const score = box(0.2, 0.27, 0.005, PAPER, SX, G + 1.6, SZ, { delay: 0.7, noInk: true });
  decorate(
    score,
    new BoxGeometry(0.16, 0.005, 0.004),
    INK,
    [0.06, 0.08, 0.1, 0.12, 0.17, 0.19, 0.21, 0.23].map((y) => [0, y, 0.004] as Point),
  );

  const ringLift = 0.315;
  tick((t) => {
    rings.forEach((r, k) => {
      const v = (t * 0.55 + k / 3) % 1;
      const d = 0.15 + v * 1.7;
      const s = 1.25 + v * 1.9;
      r.position.set(mouth[0] + ahead[0] * d, mouth[1], mouth[2] + ahead[2] * d);
      r.children[0].scale.setScalar(s);
      r.children[0].position.y = -ringLift * s;
    });
    shards.forEach(({ part, from, push }, k) => {
      const v = (t * 0.4 + k * 0.137) % 1;
      part.position.set(from[0] + push[0] * v * 1.6, from[1] + push[1] * v * 1.6 - v * v * 0.9, from[2] + push[2] * v * 1.6);
      part.rotation.set(v * 9 + k, v * 7, v * 5);
    });
    const w = (t * 0.3 + 0.35) % 1;
    score.position.set(SX + w * 0.9, G + 1.35 + Math.sin(w * Math.PI) * 1.1, SZ - w * 0.3);
    score.rotation.set(Math.sin(t * 3) * 0.6, w * 4, Math.cos(t * 2.5) * 0.4);
  });

  return { width: 4.9, height: 4.5, lookY: 1.75 };
}
