import { BoxGeometry, Color, ConeGeometry, CylinderGeometry, SphereGeometry, TorusGeometry, type Group } from "three";
import { CYAN, INK, MAGENTA, YELLOW, colorOf, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { bollard, floor, lamp, ring } from "@/lib/diorama-props";

/**
 * Custodia (P202): the yellow memory kiosk of the Compagnia Lete on the quay at dusk, its two lamp
 * eyes reading the queue, a lantern held up over its dome by two thin mechanical arms. A man in a
 * flat cap stares at the receipt it has just printed while the next customer waits with her bag;
 * the paper keeps unrolling down to the paving. Behind it the church dome, and a lamp post whose
 * street-name plate has fallen off, blank, as the declassed memories take their bit of the city.
 */
export function custodia(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const KIOSK = 0xe8b820;
  const KIOSK_DARK = 0xa88214;
  const STEEL = 0x3a3a46;
  const PAPER = 0xf2eee2;
  const STONE = 0x4a5a78;
  const F = octagonBase(kit, 0x1f2230);
  const G = floor(kit, F, 0.06, 0x3a3f4e, 0x282c38, 0.45);

  // The church at the back, on the diagonal: a front with a dark door, and its dome.
  const turnTo = (part: Group, tilt: number, facing: number) => {
    part.rotation.order = "YXZ";
    part.rotation.set(tilt, facing, 0);
    return part;
  };
  const CX = -1.62;
  const CZ = -0.86;
  const church = box(1.7, 1.25, 0.5, 0x3a2f4e, CX, G, CZ, { delay: 0.1, rotation: [0, 1.0, 0], ink: 1.02 });
  decorate(church, new BoxGeometry(0.34, 0.6, 0.02), 0x1a1424, [[0, 0.3, 0.26]]);
  decorate(church, new BoxGeometry(0.14, 0.26, 0.02), YELLOW, [
    [-0.5, 0.75, 0.26],
    [0.5, 0.75, 0.26],
  ]);
  const DX = CX - 0.1;
  const DZ = CZ - 0.07;
  cylinder(0.44, 0.46, 0.34, 0x4a3f5e, DX, G + 1.25, DZ, { delay: 0.16 }, 16);
  const dome = add(new SphereGeometry(0.46, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), STONE, DX, G + 1.59, DZ, { delay: 0.2, rotation: [0, 0.9, 0] });
  decorate(
    dome,
    new BoxGeometry(0.02, 0.36, 0.01),
    0x36425a,
    [-0.7, 0, 0.7].map((a) => [Math.sin(a) * 0.36, 0.2, Math.cos(a) * 0.36, 0] as [number, number, number, number]),
  );
  cylinder(0.08, 0.1, 0.2, 0x4a3f5e, DX, G + 2.03, DZ, { delay: 0.24 }, 10);
  add(new ConeGeometry(0.1, 0.18, 10), STONE, DX, G + 2.23, DZ, { delay: 0.26 });

  // The lamp post at the back right, its street-name plate fallen, blank, at its foot.
  const light = lamp(kit, 1.3, -1.15, G, 0.3, 2.3);
  box(0.04, 0.04, 0.3, STEEL, 1.3, G + 1.5, -1.0, { delay: 0.36, noInk: true });
  const plate = box(0.56, 0.2, 0.03, 0x2f5866, 1.15, G, -0.78, { delay: 0.4, rotation: [0, -0.3, 0] });
  turnTo(plate, -0.35, -0.3);
  decorate(plate, new BoxGeometry(0.5, 0.15, 0.01), 0xe8e4d8, [[0, 0.1, 0.016]]);
  decorate(plate, new BoxGeometry(0.46, 0.11, 0.01), 0x2f5866, [[0, 0.1, 0.021]]);
  bollard(kit, -1.3, 1.45, G, 0.42);

  // Custodia: a kiosk on a steel plinth, turned to us.
  const X = -0.45;
  const Z = -0.2;
  const T = 0.3;
  const c = Math.cos(T);
  const s = Math.sin(T);
  const at = (lx: number, ly: number, lz: number): Point => [X + lx * c + lz * s, G + ly, Z - lx * s + lz * c];
  const r: Point = [0, T, 0];
  box(1.24, 0.12, 1.04, STEEL, ...at(0, 0, 0), { delay: 0.5, rotation: r });
  const body = box(1.1, 2.1, 0.9, KIOSK, ...at(0, 0.12, 0), { delay: 0.55, rotation: r });
  add(new SphereGeometry(0.55, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.5, 0.82), KIOSK, ...at(0, 2.22, 0), { delay: 0.6, rotation: r });
  // Seams, rivets, the low counter window with its drawers of deposits glowing inside.
  decorate(body, new BoxGeometry(1.115, 0.035, 0.915), KIOSK_DARK, [
    [0, 2.04, 0],
    [0, 0.28, 0],
  ]);
  decorate(body, new BoxGeometry(0.02, 1.7, 0.01), KIOSK_DARK, [
    [-0.47, 1.15, 0.452],
    [0.47, 1.15, 0.452],
  ]);
  decorate(body, new BoxGeometry(0.72, 0.56, 0.02), 0x1a1620, [[0, 1.08, 0.452]]);
  const drawers: Point[] = [];
  for (let row = 0; row < 3; row++) for (let k = 0; k < 4; k++) if ((row * 4 + k) % 5 !== 3) drawers.push([-0.24 + k * 0.16, 0.9 + row * 0.15, 0.464]);
  decorate(body, new BoxGeometry(0.11, 0.08, 0.01), CYAN, drawers);
  decorate(body, new BoxGeometry(0.11, 0.08, 0.01), MAGENTA, [[0.08, 0.9, 0.464]]);
  box(0.84, 0.05, 0.28, KIOSK_DARK, ...at(0, 0.12 + 0.78, 0.56), { delay: 0.7, rotation: r });
  turnTo(box(0.9, 0.04, 0.3, KIOSK_DARK, ...at(0, 0.12 + 1.38, 0.56), { delay: 0.72 }), 0.35, T);

  // The lamp eyes, in dark sockets; lids that drop for a blink now and then.
  decorate(body, new CylinderGeometry(0.16, 0.16, 0.05, 20).rotateX(Math.PI / 2), 0x4a3a12, [
    [-0.26, 1.7, 0.46],
    [0.26, 1.7, 0.46],
  ]);
  const eyes = [-0.26, 0.26].map((lx, i) =>
    add(new CylinderGeometry(0.12, 0.12, 0.03, 20).rotateX(Math.PI / 2), 0xfff0b0, ...at(lx, 0.12 + 1.7 - 0.12, 0.49), { delay: 0.8 + i * 0.04, flat: true, noInk: true, rotation: r }),
  );
  const lids = [-0.26, 0.26].map((lx) => box(0.3, 0.3, 0.02, KIOSK, ...at(lx, 0.12 + 1.55, 0.51), { delay: 0.84, noInk: true, rotation: r }));

  // Two thin jointed arms up from its shoulders, holding the lantern over the dome.
  const lanternAt = at(0, 3.0, 0.05);
  [-1, 1].forEach((side, i) => {
    const shoulder = at(side * 0.42, 2.3, 0);
    const elbow = at(side * 0.66, 2.86, 0.04);
    const claw = at(side * 0.14, 3.2, 0.05);
    ball(0.08, STEEL, shoulder[0], shoulder[1] - 0.08, shoulder[2], { delay: 0.9 + i * 0.03 });
    limb(kit, shoulder, elbow, 0.05, 0.045, KIOSK, { delay: 0.92 + i * 0.03 });
    ball(0.065, STEEL, elbow[0], elbow[1] - 0.065, elbow[2], { delay: 0.95 + i * 0.03 });
    limb(kit, elbow, claw, 0.045, 0.04, KIOSK, { delay: 0.97 + i * 0.03 });
    box(0.06, 0.12, 0.08, STEEL, claw[0], claw[1] - 0.08, claw[2], { delay: 1.0 + i * 0.03, rotation: r });
  });
  add(new ConeGeometry(0.13, 0.1, 6), STEEL, lanternAt[0], lanternAt[1] + 0.24, lanternAt[2], { delay: 1.02 });
  const lantern = box(0.17, 0.24, 0.17, YELLOW, ...lanternAt, { delay: 1.04, flat: true, rotation: r });
  decorate(lantern, new BoxGeometry(0.02, 0.24, 0.18), STEEL, [
    [-0.085, 0.12, 0],
    [0.085, 0.12, 0],
  ]);
  cylinder(0.11, 0.1, 0.04, STEEL, lanternAt[0], lanternAt[1] - 0.04, lanternAt[2], { delay: 1.06 }, 8);
  // Its reading, every few seconds: a ring going out from the lantern.
  const pulse = ring(kit, [lanternAt[0], lanternAt[1] - 0.06, lanternAt[2]], 0.28, CYAN, 1.1, true);
  pulse.rotation.y = T;

  // The receipt, unrolling from the slot by the counter down to a curl of paper on the paving.
  const slot = at(0.28, 0.12 + 0.83, 0.62);
  box(0.16, 0.04, 0.06, INK, slot[0], slot[1], slot[2], { delay: 1.1, rotation: r, noInk: true });
  const STRIP = 0.95;
  const strip = turnTo(add(new BoxGeometry(0.1, STRIP, 0.006), PAPER, slot[0], slot[1], slot[2], { delay: 1.14, noInk: true }), Math.PI, T);
  [0, 1].forEach((k) => add(new CylinderGeometry(0.05, 0.05, 0.1, 12).rotateZ(Math.PI / 2), PAPER, ...at(0.36 + k * 0.12, 0, 0.8 + k * 0.1), { delay: 1.2 + k * 0.03, rotation: [0, T + 0.4 + k, 0] }));

  // The queue: a man in a flat cap reading his receipt, a woman with her bag behind him.
  const man = figure(kit, {
    x: at(0.98, 0, 1.12)[0],
    z: at(0.98, 0, 1.12)[2],
    y: G,
    facing: T - 1.7,
    height: 2.25,
    build: "normal",
    skin: 0xd8a88e,
    hair: { style: "short", color: 0x2a2220 },
    headwear: { kind: "cap", color: 0x3a3a48, accent: 0x2e2e3a },
    top: { kind: "coat", color: 0x2e3446, accent: 0x3e465c },
    bottom: { kind: "trousers", color: 0x232733 },
    arms: ["down", [0.12, 1.62, 0.42]],
    delay: 1.2,
  });
  const [, readHand] = man.hands;
  const receipt = box(0.12, 0.22, 0.01, PAPER, readHand[0], readHand[1] - 0.06, readHand[2], { delay: 1.6, rotation: [0, T - 1.7, 0], noInk: true });
  decorate(receipt, new BoxGeometry(0.08, 0.012, 0.012), 0x8a8a96, [
    [0, 0.17, 0],
    [0, 0.13, 0],
  ]);
  decorate(receipt, new BoxGeometry(0.08, 0.02, 0.012), MAGENTA, [[0, 0.06, 0]]);
  const woman = figure(kit, {
    x: at(1.6, 0, 1.85)[0],
    z: at(1.6, 0, 1.85)[2],
    y: G,
    facing: T - 2.35,
    height: 2.12,
    build: "slim",
    skin: 0xe0b8a0,
    hair: { style: "curly", color: 0x3a2420 },
    top: { kind: "coat", color: 0x3a2f4e, accent: 0x4a3e60 },
    bottom: { kind: "long-skirt", color: 0x2a2436 },
    arms: ["down", "down"],
    delay: 1.3,
  });
  const [, bagHand] = woman.hands;
  add(new TorusGeometry(0.08, 0.015, 6, 14), 0x4a3426, bagHand[0], bagHand[1] - 0.12, bagHand[2], { delay: 1.7, rotation: [0, T - 2.35 + Math.PI / 2, 0] });
  box(0.08, 0.34, 0.3, 0x5a4434, bagHand[0], bagHand[1] - 0.45, bagHand[2], { delay: 1.72, rotation: [0, T - 2.35, 0] });

  const lamp0 = new Color(0xfff0b0);
  const lamp1 = new Color(0xffffff);
  const warm = new Color(YELLOW);
  const hot = new Color(0xfff6c0);
  tick((t) => {
    // The eyes read and blink, the lantern breathes, the receipt prints, the reading ring goes out.
    const k = (Math.sin(t * 2.2) + 1) / 2;
    eyes.forEach((eye) => colorOf(eye).lerpColors(lamp0, lamp1, k));
    const blink = t % 5.5 > 5.3;
    lids.forEach((lid) => (lid.visible = blink));
    colorOf(lantern).lerpColors(warm, hot, (Math.sin(t * 6) * Math.sin(t * 1.7) + 1) / 2);
    strip.children.forEach((mesh) => (mesh.scale.y = 0.55 + 0.45 * ((t * 0.22) % 1)));
    const u = (t * 0.45) % 1;
    pulse.children[0].scale.set(1 + u * 1.6, 1 + u * 1.6, 1);
    pulse.visible = u < 0.8;
    light.visible = Math.floor(t * 6) % 17 !== 4;
  });

  return { width: 4.9, height: 4.6, lookY: 1.6 };
}
