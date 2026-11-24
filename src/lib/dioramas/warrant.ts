import { BoxGeometry, Color, ConeGeometry, CylinderGeometry, Group, SphereGeometry, TorusGeometry } from "three";
import { CYAN, INK, YELLOW, colorOf, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, rubble } from "@/lib/diorama-props";

/**
 * Warrant (P022): the bounty hunter behind a harbour warehouse at night, spiked collar and long
 * coat, a taped club in one hand, sniffing a torn rag of his quarry's in the other; a wanted
 * poster on the wall. The glowing footprints he tracks run in a loop and end at his own boots,
 * and he has already knocked a bin flat: he finds everything, understands little, sneaks never.
 */
export function warrant(kit: Kit): Framing {
  const { add, box, ball, decorate, tick } = kit;
  const PLANK = 0x2a3a48;
  const F = octagonBase(kit, 0x1c2028);
  const G = floor(kit, F, 0.06, 0x2a2e3a, 0x1e212b, 0.5);

  /** A part hung from a pivot at its top, swung by `angle` about the z axis. */
  const swing = (part: Group, pivot: Point, length: number, angle: number) => {
    part.rotation.z = angle;
    part.position.set(pivot[0] + length * Math.sin(angle), pivot[1] - length * Math.cos(angle), pivot[2]);
  };

  // The warehouse: a wall of boards, a big sliding door braced with an X, a lamp swinging over it.
  const wall = box(3.4, 2.9, 0.2, 0x26303c, 0, G, -1.25, { delay: 0.1, ink: 1.02 });
  decorate(wall, new BoxGeometry(0.015, 2.9, 0.01), 0x1c242e, [-1.4, -1.0, -0.6, 1.0, 1.4].map((x) => [x, 1.45, 0.101] as Point));
  const door = box(1.6, 2.1, 0.08, PLANK, 0.3, G, -1.11, { delay: 0.2 });
  const brace = Math.atan2(2.0, 1.5);
  decorate(door, new BoxGeometry(0.1, 2.45, 0.02), 0x3a4a5a, [
    [0, 1.05, 0.045, brace - Math.PI / 2],
    [0, 1.05, 0.045, Math.PI / 2 - brace],
  ]);
  decorate(door, new BoxGeometry(1.6, 0.1, 0.02), 0x3a4a5a, [
    [0, 0.05, 0.045],
    [0, 2.05, 0.045],
  ]);
  box(1.9, 0.06, 0.1, 0x4a5060, 0.3, G + 2.15, -1.08, { delay: 0.25 });
  box(0.04, 0.4, 0.04, 0x23222b, 0.3, G + 2.5, -1.0, { delay: 0.3, noInk: true });
  const pivot: Point = [0.3, G + 2.5, -0.9];
  const shade = add(new ConeGeometry(0.2, 0.16, 12), 0x2a3440, 0, 0, 0, { delay: 0.35 });
  const bulb = ball(0.06, YELLOW, 0, 0, 0, { delay: 0.38, flat: true, noInk: true });
  // The wanted poster: a face drawn in lines, no words.
  const poster = box(0.5, 0.66, 0.01, 0xd8ccb0, -1.25, G + 1.25, -1.14, { delay: 0.4, noInk: true });
  decorate(poster, new TorusGeometry(0.12, 0.012, 6, 20), INK, [[0, 0.42, 0.006]]);
  decorate(poster, new BoxGeometry(0.03, 0.03, 0.01), INK, [
    [-0.045, 0.45, 0.007],
    [0.045, 0.45, 0.007],
  ]);
  decorate(poster, new BoxGeometry(0.3, 0.03, 0.01), 0x7a2f3a, [
    [0, 0.17, 0.007],
    [0, 0.1, 0.007],
  ]);

  // The bin he walked into, lying on its side, its rubbish out and a can still rolling.
  add(new CylinderGeometry(0.16, 0.14, 0.45, 12).rotateZ(Math.PI / 2 - 0.1), 0x2f6f60, 1.35, G, -0.45, { delay: 0.5, rotation: [0, 0.6, 0] });
  rubble(kit, 1.0, -0.2, G, 0.55, 4, 0.3, 0x5a5048);
  const can = add(new CylinderGeometry(0.05, 0.05, 0.13, 10).rotateZ(Math.PI / 2), 0x8a93a3, 0.9, G, 0.2, { delay: 0.6 });
  decorate(can, new BoxGeometry(0.13, 0.03, 0.03), 0x7a2f3a, [[0, 0.09, 0.03]]);

  // The trail: glowing footprints in a loop that ends under his own heels.
  const prints: Group[] = [];
  const N = 14;
  for (let k = 0; k < N; k++) {
    const a = -Math.PI / 2 + ((k + 0.7) / (N + 0.4)) * Math.PI * 2;
    const tangent = Math.atan2(-Math.sin(a) * 1.3, Math.cos(a) * 0.7);
    const side = k % 2 ? 0.07 : -0.07;
    const x = 0.1 + Math.cos(a) * 1.3 + Math.cos(tangent) * side;
    const z = 1.0 + Math.sin(a) * 0.7 - Math.sin(tangent) * side;
    prints.push(add(new CylinderGeometry(0.055, 0.055, 0.006, 10).scale(0.75, 1, 1.5), CYAN, x, G, z, { delay: 1.6 + k * 0.03, flat: true, noInk: true, rotation: [0, tangent, 0] }));
  }

  // Warrant: big, stubbled, a spiked collar, a long coat, the club down, the rag at his nose.
  const hunter = figure(kit, {
    x: 0.1,
    z: 0.3,
    y: G,
    facing: 0.25,
    height: 2.55,
    build: "broad",
    skin: 0xc8a08a,
    hair: { style: "bald", color: 0x1e1a22 },
    face: { mouth: "frown", brows: "angry", beard: "stubble", beardColor: 0x2a2228 },
    top: { kind: "coat", color: 0x23404b, accent: 0x2f5866 },
    bottom: { kind: "trousers", color: 0x1c2430 },
    belt: 0x2a2026,
    shoes: 0x1a1618,
    arms: [
      [-0.55, 1.05, 0.3],
      [0.24, 2.0, 0.42],
    ],
    delay: 0.8,
  });
  const u = 2.55 / 2.4;
  // His short hair, built here: the figure's own sits low and lets the scalp show.
  const cap = add(new SphereGeometry(hunter.headRadius * 1.04, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.97, 1.06, 1), 0x1e1a22, ...hunter.head, { delay: 1.3 });
  cap.rotation.order = "YXZ";
  cap.rotation.set(-0.45, 0.25, 0);
  const neck = hunter.at(0, 1.8 * u, 0);
  add(new TorusGeometry(0.15, 0.045, 6, 18).rotateX(Math.PI / 2), 0x1c1a20, neck[0], neck[1], neck[2], { delay: 1.3 });
  [-1.2, -0.6, 0, 0.6, 1.2].forEach((a, k) => {
    const spike = hunter.at(Math.sin(a) * 0.19, 1.8 * u + 0.02, Math.cos(a) * 0.19);
    add(new ConeGeometry(0.025, 0.09, 5).rotateX(Math.PI / 2), 0xc8ccd4, spike[0], spike[1], spike[2], { delay: 1.35 + k * 0.02, rotation: [0, 0.25 + a, 0] });
  });
  const [grip, sniff] = hunter.hands;
  const tip = hunter.at(-0.85, 0.28, 0.75);
  const club = limb(kit, [grip[0], grip[1] + 0.12, grip[2]], tip, 0.035, 0.065, 0x4a3a30, { delay: 1.4 });
  decorate(club, new TorusGeometry(0.05, 0.012, 5, 12).rotateX(Math.PI / 2), 0xb8b0a0, [0.35, 0.5, 0.65, 0.8].map((y) => [0, y, 0] as Point));
  const ragPivot: Point = [sniff[0] + 0.02, sniff[1] - 0.02, sniff[2] + 0.05];
  const rag = add(new BoxGeometry(0.16, 0.3, 0.02), 0xd8bcc4, 0, 0, 0, { delay: 1.45 });
  decorate(rag, new ConeGeometry(0.03, 0.07, 4).rotateX(Math.PI), 0xd8bcc4, [
    [-0.05, -0.02, 0],
    [0.04, -0.03, 0],
  ]);
  // Handcuffs at his belt.
  const cuffs = hunter.at(-0.32, 1.0 * u, 0.22);
  [0, 0.09].forEach((dx, k) => add(new TorusGeometry(0.045, 0.012, 6, 14), 0xc8ccd4, cuffs[0] - dx, cuffs[1] - 0.12, cuffs[2], { delay: 1.5 + k * 0.03, rotation: [0, 0.25, 0] }));

  const dim = new Color(0x0e4a62);
  const bright = new Color(CYAN);
  tick((t) => {
    // The lamp swings; the rag sways at his nose; the trail lights up step by step to his feet.
    const lampAngle = Math.sin(t * 1.3) * 0.18;
    swing(shade, pivot, 0.16, lampAngle);
    bulb.position.set(pivot[0] + 0.2 * Math.sin(lampAngle), pivot[1] - 0.2 * Math.cos(lampAngle) - 0.06, pivot[2]);
    swing(rag, ragPivot, 0.3, Math.sin(t * 2.2) * 0.12);
    prints.forEach((print, k) => {
      const wave = ((t * 4 - k) % N + N) % N;
      colorOf(print).lerpColors(dim, bright, wave < 3 ? 1 - wave / 3 : 0.25);
    });
    // The can rolls to and fro about its own axis (its origin is at its foot, hence the shift).
    const roll = Math.sin(t * 1.1) * 0.25;
    const turn = roll / 0.05;
    can.rotation.x = turn;
    can.position.set(0.9, G + 0.05 - 0.05 * Math.cos(turn), 0.2 + roll - 0.05 * Math.sin(turn));
  });

  return { width: 4.9, height: 4.3, lookY: 1.5 };
}
