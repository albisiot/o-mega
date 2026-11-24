import { BoxGeometry, CylinderGeometry, Euler, Group, TorusGeometry, Vector3 } from "three";
import { CYAN, INK, MAGENTA, YELLOW, aim, cable, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { facade, floor } from "@/lib/diorama-props";

/**
 * Derelict (P081): the robot made of port scrap waits outside the dock job office with his
 * battered suitcase, an oil drum for a body, a bucket for a head with one lamp of an eye, a crane
 * boom with its hook for a right arm. He has come for an interview and is already coming apart:
 * bolts drop from his elbow one after another, onto the little heap of pieces he has lost.
 */
export function derelict(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const RUST = 0xb0602e;
  const RUST_DARK = 0x6a3a2a;
  const PATINA = 0x2f7f86;
  const IRON = 0x3a3a46;
  const BOLT = 0x9aa0ab;
  const F = octagonBase(kit, 0x1d1b28);
  const G = floor(kit, F, 0.06, 0x343848, 0x24262f, 0.5);

  // The job office: a front with its door and a blank sign, the ticket machine of the queue.
  facade(kit, 0.4, -1.6, G, 0.1, { width: 1.8, height: 2.2, color: 0x3a3048, windows: 3, floors: 2, door: true });
  const board = box(0.7, 0.2, 0.05, 0x1f2a3a, 0.4, G + 0.72, -1.42, { delay: 0.25 });
  decorate(board, new BoxGeometry(0.7, 0.03, 0.01), CYAN, [[0, 0.11, 0.026]]);
  cylinder(0.03, 0.03, 0.95, 0x23222b, 1.4, G, -0.95, { delay: 0.3 }, 8);
  const machine = box(0.24, 0.3, 0.18, MAGENTA, 1.4, G + 0.95, -0.95, { delay: 0.34, rotation: [0, -0.3, 0] });
  decorate(machine, new BoxGeometry(0.1, 0.02, 0.01), INK, [[0, 0.1, 0.091]]);
  decorate(machine, new BoxGeometry(0.07, 0.12, 0.005), 0xf2f0ea, [[0, 0.03, 0.095, 0.1]]);

  // Containers stacked at the side of the yard.
  [
    [-1.55, 0, -0.65, 0x1f7f9c, 0],
    [-1.5, 0.46, -0.7, 0x7a2f55, 0.06],
  ].forEach(([x, y, z, color, turn], i) => {
    const box3 = box(0.48, 0.46, 0.95, color, x, G + y, z, { delay: 0.4 + i * 0.05, rotation: [0, turn, 0] });
    decorate(box3, new BoxGeometry(0.012, 0.4, 0.95), 0x1a1a22, [[0.245, 0.23, 0]]);
    decorate(box3, new BoxGeometry(0.01, 0.4, 0.012), 0x1a1a22, Array.from({ length: 6 }, (_, k) => [-0.246, 0.23, -0.4 + k * 0.16] as Point));
  });

  // The robot, in his own frame: x to his left, z forward.
  const X = -0.2;
  const Z = 0.4;
  const facing = 0.35;
  const c = Math.cos(facing);
  const s = Math.sin(facing);
  const P = (lx: number, ly: number, lz: number): Point => [X + lx * c + lz * s, G + ly, Z - lx * s + lz * c];
  const rot: Point = [0, facing, 0];
  [-1, 1].forEach((side, i) => {
    box(0.26, 0.14, 0.38, IRON, ...P(side * 0.2, 0, 0.05), { delay: 0.8 + i * 0.03, rotation: rot });
    limb(kit, P(side * 0.2, 0.12, 0), P(side * 0.21, 0.52, 0.05), 0.07, 0.07, RUST_DARK, { delay: 0.84 });
    const knee = P(side * 0.21, 0.52, 0.05);
    ball(0.09, IRON, knee[0], knee[1] - 0.09, knee[2], { delay: 0.86 });
    limb(kit, knee, P(side * 0.18, 0.92, 0), 0.075, 0.075, RUST_DARK, { delay: 0.88 });
  });
  const drum = cylinder(0.42, 0.42, 1.0, RUST, ...P(0, 0.86, 0), { delay: 0.95, rotation: rot }, 18);
  decorate(drum, new TorusGeometry(0.425, 0.024, 6, 24).rotateX(Math.PI / 2), RUST_DARK, [[0, 0.25, 0], [0, 0.75, 0], [0, 0.99, 0]]);
  decorate(drum, new BoxGeometry(0.2, 0.14, 0.01), PATINA, [[-0.12, 0.55, 0.42], [0.16, 0.36, 0.42], [0.05, 0.85, 0.41]]);
  decorate(drum, new BoxGeometry(0.1, 0.08, 0.01), RUST_DARK, [[0.2, 0.62, 0.42]]);
  cylinder(0.07, 0.09, 0.14, IRON, ...P(0, 1.86, 0), { delay: 1.0 });

  // The bucket head, tipped forward and to one side, with its one lamp of an eye.
  const tilt = new Euler(0.14, facing, 0.12, "YXZ");
  const headAt = P(0, 1.97, 0);
  const head = add(new CylinderGeometry(0.29, 0.25, 0.5, 16), 0xa8683a, ...headAt, { delay: 1.05 });
  head.rotation.copy(tilt);
  decorate(head, new TorusGeometry(0.29, 0.02, 6, 20).rotateX(Math.PI / 2), RUST_DARK, [[0, 0.5, 0]]);
  decorate(head, new TorusGeometry(0.27, 0.012, 6, 20, Math.PI), IRON, [[0, 0.5, 0]]);
  decorate(head, new BoxGeometry(0.16, 0.12, 0.01), PATINA, [[-0.12, 0.12, 0.26]]);
  const onHead = (x: number, y: number, z: number): Point => {
    const v = new Vector3(x, y, z).applyEuler(tilt);
    return [headAt[0] + v.x, headAt[1] + v.y, headAt[2] + v.z];
  };
  const socket = add(new CylinderGeometry(0.12, 0.12, 0.06, 16).rotateX(Math.PI / 2), 0xc8963a, ...onHead(0.03, 0.17, 0.27), { delay: 1.15 });
  socket.rotation.copy(tilt);
  const lens = add(new CylinderGeometry(0.09, 0.09, 0.02, 16).rotateX(Math.PI / 2), YELLOW, ...onHead(0.03, 0.2, 0.3), { delay: 1.2, flat: true, noInk: true });
  lens.rotation.copy(tilt);

  // Right arm: a crane boom painted magenta, cross-braced, ending in a striped block and a hook.
  const shoulderR = P(-0.48, 1.74, 0);
  const endR = P(-0.62, 0.98, 0.14);
  ball(0.12, IRON, shoulderR[0], shoulderR[1] - 0.12, shoulderR[2], { delay: 1.1 });
  const boomAim = aim(shoulderR, endR);
  const boom = box(0.13, boomAim.length, 0.13, 0x9a2a5a, ...shoulderR, { delay: 1.12, rotation: boomAim.rotation });
  const braces = Array.from({ length: 6 }, (_, k) => [0, 0.06 + k * 0.12, 0.066, k % 2 ? 0.7 : -0.7] as [number, number, number, number]);
  decorate(boom, new BoxGeometry(0.012, 0.16, 0.01), INK, braces);
  decorate(boom, new BoxGeometry(0.01, 0.16, 0.012), INK, braces.map(([, y, , lean]) => [0.066, y, 0, lean] as [number, number, number, number]));
  const block = box(0.2, 0.17, 0.15, YELLOW, endR[0], endR[1] - 0.17, endR[2], { delay: 1.16, rotation: rot });
  decorate(block, new BoxGeometry(0.05, 0.22, 0.01), INK, [[-0.05, 0.085, 0.076, 0.7], [0.06, 0.085, 0.076, 0.7]]);
  box(0.015, 0.14, 0.015, INK, endR[0], endR[1] - 0.31, endR[2], { delay: 1.18, noInk: true });
  add(new TorusGeometry(0.1, 0.03, 6, 14, Math.PI * 1.35), BOLT, endR[0], endR[1] - 0.52, endR[2], { delay: 1.2, rotation: [0, facing, 2.2] });

  // Left arm: pipes and joints down to a clamp of a hand, holding the suitcase.
  const shoulderL = P(0.48, 1.74, 0);
  const elbowL = P(0.6, 1.3, 0.1);
  const handL = P(0.6, 0.92, 0.16);
  ball(0.12, IRON, shoulderL[0], shoulderL[1] - 0.12, shoulderL[2], { delay: 1.1 });
  limb(kit, shoulderL, elbowL, 0.065, 0.06, RUST_DARK, { delay: 1.14 });
  ball(0.08, IRON, elbowL[0], elbowL[1] - 0.08, elbowL[2], { delay: 1.16 });
  limb(kit, elbowL, handL, 0.06, 0.055, RUST_DARK, { delay: 1.18 });
  ball(0.075, IRON, handL[0], handL[1] - 0.075, handL[2], { delay: 1.2 });
  const caseTop = handL[1] - 0.1;
  const suitcase = box(0.52, 0.38, 0.14, 0x2a5a70, handL[0], caseTop - 0.38, handL[2], { delay: 1.25, rotation: rot });
  decorate(suitcase, new BoxGeometry(0.04, 0.38, 0.15), 0x6a4a32, [[-0.15, 0.19, 0], [0.15, 0.19, 0]]);
  decorate(suitcase, new BoxGeometry(0.05, 0.04, 0.01), 0xc8963a, [[0, 0.32, 0.072]]);
  decorate(suitcase, new TorusGeometry(0.06, 0.014, 6, 12, Math.PI), INK, [[0, 0.38, 0]]);

  // The heap of what he has lost on the way, and bolts dropping from his elbow.
  [
    [0.45, 0.78, 0.4],
    [0.65, 0.85, 1.6],
    [0.32, 0.95, 2.4],
    [0.8, 0.68, 0.9],
  ].forEach(([x, z, turn], i) => add(new CylinderGeometry(0.025, 0.025, 0.09, 6), BOLT, x, G + 0.025, z, { delay: 1.4 + i * 0.03, rotation: [Math.PI / 2, turn, 0] }));
  const gear = add(new CylinderGeometry(0.1, 0.1, 0.03, 10), 0x8a8f9a, 0.0, G, 1.05, { delay: 1.45 });
  decorate(gear, new BoxGeometry(0.05, 0.035, 0.05), 0x8a8f9a, [[0.11, 0.015, 0], [-0.11, 0.015, 0], [0, 0.015, 0.11], [0, 0.015, -0.11]]);
  cable(kit, Array.from({ length: 14 }, (_, k) => [0.95 + Math.cos(k * 1.3) * 0.05, G + 0.05 + Math.sin(k * 1.3) * 0.05, 0.85 + k * 0.025] as Point), 0.012, BOLT, 1.5);
  const bolts: Group[] = [0, 1, 2].map((k) => add(new CylinderGeometry(0.025, 0.025, 0.09, 6), BOLT, ...elbowL, { delay: 1.6 + k * 0.05 }));

  tick((t) => {
    bolts.forEach((bolt, k) => {
      const u = (t / 2.4 + k / 3) % 1;
      const y = elbowL[1] - 0.1 - Math.min(1, (u * 1.7) ** 2) * (elbowL[1] - 0.1 - G - 0.02);
      bolt.position.set(elbowL[0] + 0.05 + u * 0.12, y, elbowL[2] + 0.2 + u * 0.25 + k * 0.04);
      bolt.rotation.set(u * 9, 0, u * 6);
      bolt.visible = u < 0.92;
    });
    // His eye flickers; his head droops and lifts.
    lens.visible = Math.floor(t * 6) % 17 !== 9;
    head.rotation.z = tilt.z + Math.sin(t * 0.7) * 0.05;
  });

  return { width: 4.9, height: 4.3, lookY: 1.5 };
}
