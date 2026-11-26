import { BoxGeometry, ConeGeometry, CylinderGeometry, Group, TorusGeometry, Vector3 } from "three";
import { INK, MAGENTA, CYAN, YELLOW, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { column, facade, floor, rubble, wallLantern } from "@/lib/diorama-props";

/**
 * Trasloco (P294): the removal man of the Lanterne was told to stop the runaway van, so he did:
 * on a night street of the old town, under the tall column, he holds it back with one shoulder,
 * its front dented round him and its windscreen starred, his boots ploughing the cobbles while
 * the engine still revs. He takes every instruction literally: the box with the arrows for
 * "this way up" stands upside down.
 */
export function trasloco(kit: Kit): Framing {
  const { add, box, ball, decorate, tick, motes } = kit;
  const F = octagonBase(kit, 0x1f1b26);
  const G = floor(kit, F, 0.06, 0x35303c, 0x221e2a, 0.28);
  const VAN = 0xcfd3dc;
  const WINDOW = 0x1f4f66;
  const CARD = 0xb08a5a;

  // The old town: a palazzo, the tall column, a lantern on the wall.
  facade(kit, -0.45, -1.45, G, 0.1, { width: 2.2, height: 2.8, color: 0x3a2f48, windows: 3, floors: 3, balcony: true });
  column(kit, -1.75, -0.45, G, 0.15, 3.3, false, 0x8a94b4);
  ball(0.15, 0x8a94b4, -1.75, G + 3.36, -0.45, { delay: 0.3 });
  wallLantern(kit, 0.45, -1.3, G + 2.0, 0.3);

  // The van, built straight and then turned so its nose points to the front left.
  const VX = 1.2;
  const VZ = -0.45;
  const TURN = 0.75;
  const parts: Group[] = [];
  [-0.55, 0.55].forEach((dx, i) =>
    [-0.5, 0.5].forEach((dz) => parts.push(add(new CylinderGeometry(0.24, 0.24, 0.14, 16).rotateX(Math.PI / 2), 0x1e1d26, VX + dx, G, VZ + dz, { delay: 0.35 + i * 0.03 }))),
  );
  const body = box(1.95, 1.75, 1.0, VAN, VX, G + 0.22, VZ, { delay: 0.4 });
  parts.push(body);
  const front = -0.982;
  decorate(body, new BoxGeometry(0.012, 0.58, 0.84), WINDOW, [[front, 1.2, 0]]);
  decorate(body, new BoxGeometry(0.5, 0.45, 0.012), WINDOW, [[-0.62, 1.25, 0.506]]);
  decorate(body, new BoxGeometry(1.95, 0.1, 0.012), MAGENTA, [[0, 0.6, 0.506]]);
  decorate(body, new BoxGeometry(1.95, 0.04, 0.012), CYAN, [[0, 0.48, 0.506]]);
  decorate(body, new BoxGeometry(0.012, 1.2, 0.012), INK, [[-0.3, 0.75, 0.507]]);
  decorate(body, new BoxGeometry(0.012, 1.5, 0.012), INK, [[0.982, 0.85, 0]]);
  decorate(body, new BoxGeometry(0.012, 0.2, 0.5), 0x2a2a34, [[front, 0.35, 0]]);
  decorate(body, new BoxGeometry(0.012, 0.13, 0.2), YELLOW, [[front, 0.38, 0.33]]);
  const broken = decorate(body, new BoxGeometry(0.014, 0.13, 0.2), YELLOW, [[front - 0.002, 0.38, -0.33]]);
  // The dent: creases in the panel round his shoulder, cracks starring the windscreen.
  const dent: Point = [front - 0.004, 1.4, 0];
  for (let k = 0; k < 8; k++) {
    const angle = k * 0.8 + 0.3;
    const length = k % 2 ? 0.26 : 0.4;
    const color = Math.cos(angle) > 0 ? 0xdff6ff : INK;
    decorate(body, new BoxGeometry(0.014, length, 0.016).rotateX(angle), color, [
      [dent[0], dent[1] + (Math.cos(angle) * length) / 2, dent[2] + (Math.sin(angle) * length) / 2],
    ]);
  }
  parts.push(box(0.14, 0.14, 1.06, 0x2a2a34, VX - 0.99, G + 0.22, VZ, { delay: 0.45, rotation: [0, 0.08, 0] }));
  parts.push(box(0.06, 0.16, 0.1, 0x2a2a34, VX - 0.92, G + 1.55, VZ + 0.56, { delay: 0.5 }));
  parts.push(add(new CylinderGeometry(0.045, 0.045, 0.18, 8).rotateZ(Math.PI / 2), 0x5a5a66, VX + 0.99, G + 0.12, VZ + 0.3, { delay: 0.5 }));
  const van = new Group();
  van.position.set(VX, G, VZ);
  body.parent?.add(van);
  parts.forEach((part) => {
    part.position.sub(van.position);
    van.add(part);
  });
  van.rotation.y = TURN;

  // Trasloco, braced side-on to the van's nose, the quilted moving blanket over his shoulders.
  const H = 2.4;
  const u = H / 2.4;
  const ahead: Point = [-Math.cos(TURN), 0, Math.sin(TURN)];
  const MX = VX - 0.975 * Math.cos(TURN) + ahead[0] * 0.85;
  const MZ = VZ + 0.975 * Math.sin(TURN) + ahead[2] * 0.85;
  const mover = figure(kit, {
    x: MX,
    z: MZ,
    y: G,
    facing: TURN,
    height: H,
    build: "broad",
    skin: 0xc48a68,
    hair: { style: "short", color: 0x1e1a1c },
    face: { mouth: "frown", brows: "angry", beard: "full", beardColor: 0x241c1e },
    top: { kind: "shirt", color: 0x8a4a2a },
    bottom: { kind: "trousers", color: 0x7a4226 },
    shoes: 0x2a221e,
    belt: 0x3a2418,
    gloves: 0x4a3226,
    arms: [[0.6, 1.35, 0.25], [0.65, 1.0, -0.15]],
    legs: "wide",
    delay: 0.8,
  });
  const QUILT = 0x2f5a86;
  const blanket = add(new CylinderGeometry(0.24 * u, 0.6 * u, 0.3 * u, 16).scale(1, 1, 0.78), QUILT, ...mover.at(0, 1.47 * u, 0), {
    delay: 1.3,
    rotation: [0, TURN, 0],
  });
  [
    [0.08, 0.51],
    [0.2, 0.37],
  ].forEach(([h, r]) => decorate(blanket, new TorusGeometry(r * u, 0.012, 4, 24).rotateX(Math.PI / 2).scale(1, 1, 0.78), 0x1d3e62, [[0, h * u, 0]]));
  const lean = new Group();
  lean.position.set(MX, G, MZ);
  const leaning = [...mover.parts, blanket];
  leaning[0].parent?.add(lean);
  leaning.forEach((part) => {
    part.position.sub(lean.position);
    lean.add(part);
  });
  const forward = new Vector3(Math.sin(TURN), 0, Math.cos(TURN));
  lean.quaternion.setFromAxisAngle(forward, -0.16);

  // His boots have ploughed the cobbles towards the van; stones heaped at his heels.
  [mover.at(-0.34 * u, 0, 0.03), mover.at(0.34 * u, 0, 0.03)].forEach(([x, , z], i) =>
    box(0.55, 0.012, 0.11, INK, x - ahead[0] * 0.3, G, z - ahead[2] * 0.3, { delay: 1.0 + i * 0.03, flat: true, noInk: true, rotation: [0, TURN, 0] }),
  );
  rubble(kit, MX + ahead[0] * 0.45, MZ + ahead[2] * 0.45, G, 1.05, 5, 0.25);

  // The boxes he unloaded, the top one turned exactly the wrong way up.
  box(0.5, 0.45, 0.45, CARD, -1.4, G, 0.55, { delay: 0.6, rotation: [0, 0.15, 0] });
  box(0.45, 0.4, 0.42, 0xa07a4c, -1.38, G + 0.45, 0.53, { delay: 0.65, rotation: [0, -0.1, 0] });
  const top = box(0.4, 0.34, 0.38, CARD, -1.4, G + 0.85, 0.55, { delay: 0.7, rotation: [0, 0.3, 0] });
  decorate(top, new BoxGeometry(0.03, 0.14, 0.008), INK, [
    [-0.1, 0.21, 0.194],
    [0.1, 0.21, 0.194],
  ]);
  decorate(top, new ConeGeometry(0.06, 0.09, 3).rotateZ(Math.PI), INK, [
    [-0.1, 0.1, 0.194],
    [0.1, 0.1, 0.194],
  ]);

  // The engine still revs: the van judders, exhaust puffs, a cracked headlight blinks.
  motes(6, 0x8a8899, 0.05, [1.85, G + 0.15, -1.2], [2.0, G + 1.1, -1.05], 1.2);
  motes(6, 0x6a6070, 0.025, [MX - 0.4, G, MZ - 0.3], [MX + 0.4, G + 0.4, MZ + 0.3], 1.3);
  tick((t) => {
    const rev = Math.sin(t * 0.9) > 0.2 ? Math.sin(t * 45) * 0.012 : 0;
    van.position.x = VX - ahead[0] * rev;
    van.position.z = VZ - ahead[2] * rev;
    lean.quaternion.setFromAxisAngle(forward, -0.16 - rev * 0.6);
    broken.color.set(Math.floor(t * 6) % 9 === 4 ? 0x3a3020 : YELLOW);
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}
