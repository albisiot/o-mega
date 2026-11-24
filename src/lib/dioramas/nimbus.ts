import { BoxGeometry, Color, ConeGeometry, SphereGeometry, type Group } from "three";
import { YELLOW, colorOf, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { column, floor, rubble } from "@/lib/diorama-props";

/**
 * Nimbus (P068): in the ruined colonnade of an old temple, a trail of magenta and cyan mist
 * winds up from the ground to the top of a broken column, where the hooded woman with the
 * lantern has just come back together: legs still smoke, a surprised look down. She never
 * knows where she will re-form, and she hasn't the strength to climb down.
 */
export function nimbus(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick } = kit;
  const MARBLE = 0x5d6a90;
  const MISTS = [0xc0307a, 0x2f8fc8, 0x6a4ab0, 0x9a3aa0];
  const F = octagonBase(kit, 0x1a1a26);
  const G = floor(kit, F, 0.06, 0x343a52, 0x262a3e, 0.6);

  // The colonnade behind: whole columns under a broken lintel.
  column(kit, -1.5, -1.0, G, 0.1, 3.0, false, MARBLE);
  column(kit, -0.4, -1.75, G, 0.14, 3.0, false, MARBLE);
  column(kit, 0.95, -1.55, G, 0.18, 1.6, true, MARBLE);
  box(1.6, 0.3, 0.5, 0x6a7aa0, -0.95, G + 3.0, -1.38, { delay: 0.3, rotation: [0, 0.6, 0.04] });
  rubble(kit, 1.5, -0.6, G, 0.35, 5, 0.4, 0x46506a);
  box(0.9, 0.22, 0.4, 0x6a7aa0, 1.55, G, -0.85, { delay: 0.38, rotation: [0, -0.5, 0.12] });

  // The broken column she has re-formed on.
  const CX = 0.55;
  const CZ = 0.25;
  const top = G + 1.05;
  box(0.75, 0.12, 0.75, 0x6a7aa0, CX, G, CZ, { delay: 0.4 });
  const shaft = cylinder(0.3, 0.33, 0.93, MARBLE, CX, G + 0.12, CZ, { delay: 0.44 }, 12);
  decorate(shaft, new BoxGeometry(0.03, 0.85, 0.01), 0x46506a, [-0.5, -0.15, 0.2, 0.55].map((a) => [Math.sin(a) * 0.32, 0.46, Math.cos(a) * 0.32] as Point));
  [0.2, 2.6, 4.2].forEach((a, k) => add(new ConeGeometry(0.09, 0.2, 5), MARBLE, CX + Math.sin(a) * 0.24, top, CZ + Math.cos(a) * 0.24 - 0.05, { delay: 0.48 + k * 0.02, rotation: [0.2, a, 0.3] }));

  // Nimbus: hooded, long coat, the lantern held out.
  const woman = figure(kit, {
    x: CX,
    z: CZ + 0.02,
    y: top,
    facing: 0.25,
    height: 2.2,
    build: "slim",
    skin: 0xe0c4b8,
    hair: { style: "bob", color: 0x1f1b22 },
    face: { mouth: "open", brows: "raised" },
    headwear: { kind: "hood", color: 0x3a3f52 },
    top: { kind: "robe", color: 0x3a3f52 },
    gloves: 0x2a2e3c,
    arms: [[-0.6, 1.3, 0.4], [0.32, 1.55, 0.35]],
    delay: 0.8,
  });
  // The lantern: a frame, a glowing glass, a ring to hold it by.
  const [hand] = woman.hands;
  const LX = hand[0];
  const LY = hand[1] - 0.5;
  const LZ = hand[2];
  cylinder(0.11, 0.13, 0.05, 0x2a2630, LX, LY, LZ, { delay: 1.4 }, 8);
  const glass = cylinder(0.09, 0.09, 0.22, YELLOW, LX, LY + 0.05, LZ, { delay: 1.42, flat: true }, 8);
  add(new ConeGeometry(0.12, 0.1, 8), 0x2a2630, LX, LY + 0.27, LZ, { delay: 1.44 });
  box(0.015, 0.15, 0.015, 0x2a2630, LX, LY + 0.36, LZ, { delay: 1.46, noInk: true });
  [-1, 1].forEach((s) => box(0.015, 0.22, 0.015, 0x2a2630, LX + s * 0.09, LY + 0.05, LZ + 0.02, { delay: 1.45, noInk: true }));

  // The mist: a spiral of puffs from where she vanished up to her legs, and a cloud round them.
  const FROM: Point = [-1.25, G + 0.1, 1.0];
  const TO: Point = [CX, top + 0.3, CZ];
  /** A puff of mist: a slightly squashed ball. */
  const puff = (r: number, color: number, p: Point, delay: number, k: number) =>
    add(new SphereGeometry(r, 12, 8).scale(1.15, 0.85, 1.05), color, ...p, { delay, ink: k % 3 ? 1.05 : 1.03 });
  const trail = Array.from({ length: 30 }, (_, k) => ({ puff: puff(0.08 + (k % 4) * 0.025, MISTS[k % MISTS.length], FROM, 1.0 + k * 0.02, k), s0: k / 30 }));
  const at = woman.at;
  const cloud: { puff: Group; p: Point }[] = [];
  for (let k = 0; k < 12; k++) {
    const a = k * 2.1;
    const p = at(Math.cos(a) * 0.38, 0.05 + (k % 4) * 0.13, Math.sin(a) * 0.3);
    cloud.push({ puff: puff(0.1 + (k % 3) * 0.03, MISTS[(k + 1) % MISTS.length], p, 1.2 + k * 0.03, k), p });
  }
  puff(0.22, MISTS[2], [FROM[0], G, FROM[2]], 0.9, 0);
  puff(0.16, MISTS[0], [FROM[0] + 0.3, G, FROM[2] - 0.15], 0.92, 0);
  puff(0.12, MISTS[1], [FROM[0] - 0.15, G, FROM[2] + 0.25], 0.94, 1);

  const warm = new Color(YELLOW);
  const white = new Color(0xfff6d0);
  tick((t) => {
    trail.forEach(({ puff, s0 }, k) => {
      const s = (s0 + t * 0.07) % 1;
      const a = s * Math.PI * 5 + k * 0.7;
      puff.position.set(FROM[0] + (TO[0] - FROM[0]) * s + Math.cos(a) * 0.2, FROM[1] + (TO[1] - FROM[1]) * s + Math.sin(s * Math.PI) * 0.5, FROM[2] + (TO[2] - FROM[2]) * s + Math.sin(a) * 0.2);
      puff.children[0].scale.setScalar(0.7 + Math.sin(s * Math.PI) * 0.5);
    });
    cloud.forEach(({ puff, p }, k) => puff.position.set(p[0] + Math.sin(t * 1.3 + k) * 0.04, p[1] + Math.sin(t * 0.9 + k * 2) * 0.05, p[2]));
    colorOf(glass).lerpColors(warm, white, (Math.sin(t * 7) + Math.sin(t * 11)) * 0.25 + 0.5);
  });

  return { width: 4.9, height: 4.6, lookY: 1.75 };
}
