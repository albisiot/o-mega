import { BoxGeometry, CylinderGeometry, Group, TorusGeometry } from "three";
import { CYAN, INK, MAGENTA, archMouth, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Ultravires (P148): the public defender of the Custodi, robed and hooded in black behind a blank
 * mesh mask, stands in the courtroom under the tall window, brass cuff on her wrist and her case
 * in hand. From the witness box a film strip of the witness's memory rises over the court; she
 * holds her loupe up to the one frame that glitches: not a lie, a memory badly rewritten.
 */
export function ultravires(kit: Kit): Framing {
  const { add, box, decorate, tick, motes } = kit;
  const WOOD = 0x4a3428;
  const ROBE = 0x1c1c26;
  const MASK = 0xcfc8b8;
  const BRASS = 0xd8a838;
  const F = octagonBase(kit, 0x1d1b28);
  const G = floor(kit, F, 0.06, 0x3a3a4a, 0x2a2a36, 0);

  // A chequered marble floor, the wall with its tall window and the light it throws.
  const squares: Point[] = [];
  for (let i = -5; i <= 5; i++)
    for (let j = -5; j <= 5; j++) {
      const x = i * 0.42;
      const z = j * 0.42;
      if ((i + j) % 2 === 0 && Math.abs(x) < 2.0 && Math.abs(z) < 2.0 && Math.abs(x) + Math.abs(z) < 2.85) squares.push([x, 0.002, z]);
    }
  const tiles = add(new BoxGeometry(0.001, 0.001, 0.001), 0x262632, 0, G, 0, { delay: 0.06, flat: true, noInk: true });
  decorate(tiles, new BoxGeometry(0.42, 0.004, 0.42), 0x262632, squares);
  const wall = box(3.0, 3.5, 0.2, 0x2e2a40, 0, G, -1.55, { delay: 0.1, ink: 1.02 });
  decorate(wall, new BoxGeometry(0.12, 3.5, 0.02), 0x3a3450, [
    [-1.0, 1.75, 0.11],
    [0.0, 1.75, 0.11],
  ]);
  const pane = add(archMouth(0.42, 1.4), 0xffe08a, 0.75, G + 0.95, -1.45, { delay: 0.2, flat: true });
  decorate(pane, new BoxGeometry(0.03, 1.8, 0.02), 0x2e2a40, [[0, 0.95, 0.03]]);
  decorate(pane, new BoxGeometry(0.84, 0.03, 0.02), 0x2e2a40, [
    [0, 0.5, 0.03],
    [0, 1.0, 0.03],
  ]);
  box(0.95, 0.002, 2.2, 0x4a4638, 0.6, G + 0.006, -0.3, { delay: 0.25, flat: true, noInk: true, rotation: [0, 0.25, 0] });
  motes(10, 0xffe08a, 0.02, [0.3, G + 0.2, -1.3], [1.0, G + 2.4, 0.3], 0.8);

  // Pews on the right.
  [0.75, -0.15].forEach((z, i) => {
    box(0.42, 0.42, 1.0, WOOD, 1.6, G, z, { delay: 0.3 + i * 0.05 });
    box(0.08, 0.85, 1.0, WOOD, 1.83, G, z, { delay: 0.32 + i * 0.05 });
  });

  // The witness box, and the witness in it.
  const witnessBox = box(0.9, 1.0, 0.7, WOOD, -1.1, G, -0.75, { delay: 0.35, rotation: [0, 0.6, 0] });
  decorate(witnessBox, new BoxGeometry(0.92, 0.06, 0.72), 0x5e4a3a, [[0, 1.0, 0]]);
  const witness = figure(kit, {
    x: -1.1,
    z: -0.85,
    y: G,
    facing: 0.6,
    height: 2.2,
    skin: 0xc89070,
    hair: { style: "short", color: 0x8a8a90 },
    face: { mouth: "open", brows: "worried" },
    top: { kind: "jacket", color: 0x3a4a6a, accent: 0xd8d2c4 },
    arms: [[-0.25, 1.05, 0.35], [0.25, 1.05, 0.35]],
    delay: 0.6,
  });

  // The memory: a film strip rising from the witness's head and arching over the court.
  const [wx, wy, wz] = witness.head;
  const frames: Group[] = [];
  let glitch: Group[] = [];
  const BAD = 3;
  for (let k = 0; k < 5; k++) {
    const u = (k + 0.5) / 5;
    const x = wx + (0.5 - wx) * u;
    const z = wz + (0.15 - wz) * u;
    const y = wy + 0.3 + Math.sin(u * Math.PI) * 0.4 + u * 0.2;
    const frame = box(0.32, 0.25, 0.02, 0x1a1a22, x, y, z, { delay: 1.0 + k * 0.06, rotation: [0, 0.35, k === BAD ? 0 : (0.5 - u) * 0.6] });
    decorate(frame, new BoxGeometry(0.035, 0.02, 0.01), 0xe8e2d0, [-0.11, -0.04, 0.04, 0.11].flatMap((fx) => [[fx, 0.225, 0.011], [fx, 0.025, 0.011]] as Point[]));
    const scene = k === BAD ? MAGENTA : CYAN;
    decorate(frame, new BoxGeometry(0.25, 0.14, 0.01), k === BAD ? 0x5a1a3a : 0x1f4f5e, [[0, 0.125, 0.012]]);
    decorate(frame, new BoxGeometry(0.04, 0.08, 0.01), scene, [[(k - 2) * 0.025, 0.11, 0.016]]);
    decorate(frame, new CylinderGeometry(0.02, 0.02, 0.01, 10).rotateX(Math.PI / 2), scene, [[(k - 2) * 0.025, 0.17, 0.016]]);
    frames.push(frame);
    if (k === BAD) {
      // The rewritten frame: its picture slips sideways in bands, now and then.
      glitch = [0, 1, 2].map((b) => box(0.25, 0.04, 0.01, b === 1 ? CYAN : MAGENTA, x + 0.03 * (b - 1), y + 0.07 + b * 0.045, z + 0.02, { delay: 1.2, flat: true, noInk: true, rotation: [0, 0.35, 0] }));
    }
  }
  const frameRest = frames.map((frame) => frame.position.y);
  const glitchRest = glitch.map((band) => band.position.clone());

  // Ultravires: black robe and hood, a blank mesh mask, the loupe raised to the bad frame.
  const facing = 0.05;
  const lawyer = figure(kit, {
    x: 0.45,
    z: 0.45,
    y: G,
    facing,
    height: 2.45,
    build: "slim",
    skin: MASK,
    face: { blank: true },
    headwear: { kind: "hood", color: ROBE },
    top: { kind: "robe", color: ROBE },
    belt: 0x34344a,
    gloves: 0x2a2a34,
    arms: [[-0.42, 2.25, 0.3], "down"],
    delay: 0.8,
  });
  const R = lawyer.headRadius;
  const cy = R * 1.06;
  const fz = R * 0.92;
  decorate(lawyer.headPart, new BoxGeometry(0.006, R * 1.2, 0.01), 0x8a8478, [-0.1, -0.05, 0, 0.05, 0.1].map((x) => [x, cy, fz - Math.abs(x) * 0.6] as Point));
  decorate(lawyer.headPart, new BoxGeometry(R * 1.1, 0.006, 0.01), 0x8a8478, [-0.1, -0.05, 0, 0.05, 0.1].map((y) => [0, cy + y, fz - Math.abs(y) * 0.5] as Point));
  const [loupeHand, caseHand] = lawyer.hands;
  add(new TorusGeometry(0.1, 0.022, 6, 20), BRASS, loupeHand[0] - 0.05, loupeHand[1] + 0.05, loupeHand[2], { delay: 1.5, rotation: [0, 0.35, 0] });
  add(new CylinderGeometry(0.09, 0.09, 0.01, 18).rotateX(Math.PI / 2), 0x9fe8ff, loupeHand[0] - 0.05, loupeHand[1] + 0.06, loupeHand[2], { delay: 1.52, flat: true, noInk: true, rotation: [0, 0.35, 0] });
  box(0.035, 0.16, 0.035, INK, loupeHand[0], loupeHand[1] - 0.06, loupeHand[2], { delay: 1.5 });
  add(new TorusGeometry(0.075, 0.025, 6, 16).rotateX(Math.PI / 2), BRASS, caseHand[0], caseHand[1] + 0.04, caseHand[2], { delay: 1.5 });
  const briefcase = box(0.46, 0.34, 0.14, 0x4a2e22, caseHand[0] + 0.02, caseHand[1] - 0.42, caseHand[2], { delay: 1.55, rotation: [0, facing + 0.2, 0] });
  decorate(briefcase, new BoxGeometry(0.06, 0.04, 0.01), BRASS, [
    [-0.12, 0.28, 0.072],
    [0.12, 0.28, 0.072],
  ]);
  box(0.04, 0.14, 0.04, INK, caseHand[0] + 0.02, caseHand[1] - 0.1, caseHand[2], { delay: 1.56, noInk: true });

  tick((t) => {
    frames.forEach((frame, k) => (frame.position.y = frameRest[k] + Math.sin(t * 1.4 - k * 0.8) * 0.04));
    const slip = Math.floor(t * 5) % 5 === 2 ? 1 : 0;
    const bob = Math.sin(t * 1.4 - BAD * 0.8) * 0.04;
    glitch.forEach((band, b) => {
      band.position.copy(glitchRest[b]);
      band.position.y += bob;
      band.position.x += slip * (b - 1) * 0.07;
      band.visible = slip === 1 || b !== 1;
    });
    witness.headPart.rotation.z = Math.sin(t * 0.9) * 0.06;
  });

  return { width: 4.9, height: 4.6, lookY: 1.8 };
}
