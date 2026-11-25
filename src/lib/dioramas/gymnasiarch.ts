import { BoxGeometry, CircleGeometry, CylinderGeometry, TorusGeometry } from "three";
import { INK, YELLOW, aim, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Gymnasiarch (P229): in the old palaestra of the noble houses, under tall arched windows and the
 * framed portraits of the ancestors, the coach of the heirs stands in her green tracksuit and
 * white headband, a stopwatch on her chest and a long wooden rod in her hand, prodding the ribs
 * of a young heir who hangs from the bar with gritted teeth, trembling. The stopwatch's hand
 * sweeps on: his grandfather held on longer.
 */
export function gymnasiarch(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const GREEN = 0x1f6a44;
  const GREEN_DARK = 0x174e34;
  const GLOW = 0x7fe6c4;
  const F = octagonBase(kit, 0x1a1e1c);
  const G = floor(kit, F, 0.06, 0x4e3a2c, 0x3a2a20, 0.35);

  // The hall's back wall: two arched windows glowing green, three ancestors in their frames.
  const wall = box(3.4, 3.1, 0.2, 0x26322e, -0.15, G, -1.35, { delay: 0.1, ink: 1.02 });
  const front = 0.101;
  [-1.05, 0.75].forEach((x) => {
    decorate(wall, new BoxGeometry(0.7, 1.3, 0.01), GLOW, [[x, 1.45, front]]);
    decorate(wall, new CircleGeometry(0.35, 18, 0, Math.PI), GLOW, [[x, 2.1, front]]);
    decorate(wall, new BoxGeometry(0.03, 1.6, 0.01), GREEN_DARK, [[x, 1.6, front + 0.004]]);
    decorate(wall, new BoxGeometry(0.7, 0.03, 0.01), GREEN_DARK, [
      [x, 1.2, front + 0.004],
      [x, 1.75, front + 0.004],
    ]);
  });
  decorate(wall, new BoxGeometry(3.4, 0.5, 0.01), 0x1e2826, [[0, 0.25, front]]);
  [-0.4, 0.05, 1.6].forEach((x, k) => {
    decorate(wall, new BoxGeometry(0.34, 0.44, 0.012), k === 1 ? YELLOW : 0x5e4a3a, [[x, 2.35, front + 0.002]]);
    decorate(wall, new BoxGeometry(0.26, 0.36, 0.012), 0xb8a888, [[x, 2.35, front + 0.006]]);
    decorate(wall, new CircleGeometry(0.07, 12), 0x5a4a3a, [[x, 2.42, front + 0.01]]);
    decorate(wall, new BoxGeometry(0.16, 0.12, 0.01), 0x5a4a3a, [[x, 2.25, front + 0.01]]);
  });

  // The bar: two posts and the crossbar, and the heir hanging from it.
  const HX = 0.55;
  const HZ = -0.35;
  const T = 0.3;
  const across: Point = [Math.cos(T), 0, -Math.sin(T)];
  const BAR = G + 2.9;
  [-1, 1].forEach((s) => box(0.1, 2.95, 0.1, 0x3a3e46, HX + across[0] * s * 0.75, G, HZ + across[2] * s * 0.75, { delay: 0.3, rotation: [0, T, 0] }));
  add(new CylinderGeometry(0.035, 0.035, 1.6, 10).rotateZ(Math.PI / 2), 0xb8bcc8, HX, BAR - 0.035, HZ, { delay: 0.35, rotation: [0, T, 0] });
  const heir = figure(kit, {
    x: HX,
    z: HZ,
    y: BAR - 2.6,
    facing: T,
    height: 2.3,
    skin: 0x8a5a3a,
    hair: { style: "curly", color: 0x1a1414 },
    face: { mouth: "grin", brows: "angry" },
    top: { kind: "tank", color: GREEN, accent: 0xe8e4da },
    bottom: { kind: "shorts", color: GREEN_DARK },
    shoes: 0xe8e4da,
    arms: [[-0.36, 2.6, 0.04], [0.36, 2.6, 0.04]],
    delay: 0.8,
  });
  // The white trim of his vest.
  heir.parts.push(add(new TorusGeometry(0.3, 0.018, 6, 20).rotateX(Math.PI / 2).scale(1, 1, 0.72), 0xe8e4da, ...heir.at(0, 1.66, 0), { delay: 1.2, rotation: [0, T, 0] }));

  // Gymnasiarch: green tracksuit, white headband, stopwatch on her chest, the rod in her left hand.
  const CF = 0.75;
  const coach = figure(kit, {
    x: -0.8,
    z: 0.55,
    y: G,
    facing: CF,
    height: 2.4,
    build: "heavy",
    skin: 0x7a4a30,
    hair: { style: "curly", color: 0x1a1414 },
    face: { mouth: "frown", brows: "angry" },
    headwear: { kind: "headband", color: 0xece8de },
    top: { kind: "jacket", color: GREEN, accent: GREEN_DARK, sleeves: "short" },
    bottom: { kind: "trousers", color: GREEN_DARK },
    shoes: 0xe8e4da,
    arms: ["hip", [0.5, 1.35, 0.48]],
    delay: 0.9,
  });
  const at = coach.at;
  // White stripes down her sleeves and trouser legs.
  [-1, 1].forEach((s) => {
    limb(kit, at(s * 0.5, 1.68, 0.02), at(s * 0.62, 1.38, 0.02), 0.03, 0.03, 0xece8de, { delay: 1.3, noInk: true });
    box(0.03, 0.9, 0.02, 0xece8de, ...at(s * 0.3, 0.15, 0.06), { delay: 1.3, rotation: [0, CF, 0], noInk: true });
  });
  // The stopwatch on its lanyard; its hand is a part of its own, turning about the dial's centre.
  limb(kit, at(-0.12, 1.86, 0.16), at(0, 1.4, 0.36), 0.012, 0.012, 0x1f7a4a, { delay: 1.35, noInk: true });
  limb(kit, at(0.12, 1.86, 0.16), at(0, 1.4, 0.36), 0.012, 0.012, 0x1f7a4a, { delay: 1.35, noInk: true });
  const dial = at(0, 1.3, 0.38);
  add(new CylinderGeometry(0.11, 0.11, 0.04, 20).rotateX(Math.PI / 2), 0xc8ccd4, ...dial, { delay: 1.4, rotation: [0, CF, 0] });
  const out = (k: number): Point => [dial[0] + Math.sin(CF) * k, dial[1], dial[2] + Math.cos(CF) * k];
  const face = add(new CylinderGeometry(0.09, 0.09, 0.01, 20).rotateX(Math.PI / 2), 0xf4f0e6, ...lifted(out(0.022), 0.02), { delay: 1.42, rotation: [0, CF, 0], noInk: true });
  decorate(face, new BoxGeometry(0.012, 0.02, 0.01), INK, [0, 1, 2, 3].map((k) => [Math.sin((k * Math.PI) / 2) * 0.07, 0.09 + Math.cos((k * Math.PI) / 2) * 0.07, 0.008] as Point));
  const needle = box(0.014, 0.08, 0.008, YELLOW, ...lifted(out(0.03), 0.11), { delay: 1.5, flat: true, noInk: true });
  ball(0.025, 0xc8ccd4, dial[0], dial[1] + 0.22, dial[2], { delay: 1.45 });

  // The rod, from her fist to the heir's ribs.
  const [, rodHand] = coach.hands;
  const ribs = heir.at(0.05, 1.45, 0.24);
  const rod = aim(rodHand, ribs);
  const back: Point = [rodHand[0] - (ribs[0] - rodHand[0]) * (0.3 / rod.length), rodHand[1] - (ribs[1] - rodHand[1]) * (0.3 / rod.length), rodHand[2] - (ribs[2] - rodHand[2]) * (0.3 / rod.length)];
  const pole = add(new CylinderGeometry(0.024, 0.03, rod.length + 0.25, 8), 0xd8b878, ...back, { delay: 1.5, rotation: rod.rotation });
  decorate(pole, new BoxGeometry(0.052, 0.008, 0.052), 0x5a4020, Array.from({ length: 6 }, (_, k) => [0, 0.2 + k * 0.25, 0] as Point));

  // A chalk bowl and a medicine ball on the floor.
  cylinder(0.24, 0.18, 0.2, 0x8a8f9c, 1.55, G, 0.55, { delay: 0.5 }, 14);
  cylinder(0.2, 0.2, 0.02, 0xf4f0e6, 1.55, G + 0.18, 0.55, { delay: 0.55, noInk: true }, 14);
  ball(0.24, 0x7a2a3a, 1.2, G, 1.15, { delay: 0.55 });

  const rest = heir.parts.map((part) => part.position.x);
  const restZ = heir.parts.map((part) => part.position.z);
  tick((t) => {
    // He trembles on the bar, harder now and then; the stopwatch's hand sweeps round.
    const strain = 0.006 + (Math.sin(t * 0.7) > 0.4 ? 0.012 : 0);
    const shake = Math.sin(t * 37) * strain;
    heir.parts.forEach((part, i) => {
      part.position.x = rest[i] + shake * across[0];
      part.position.z = restZ[i] + shake * across[2];
    });
    needle.rotation.order = "YXZ";
    needle.rotation.set(0, CF, -t * 1.05);
  });

  return { width: 4.9, height: 4.5, lookY: 1.7 };
}

/** A point raised by `dy`. */
function lifted([x, y, z]: Point, dy: number): Point {
  return [x, y + dy, z];
}
