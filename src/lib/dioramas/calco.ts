import { BoxGeometry, CylinderGeometry, SphereGeometry, TorusGeometry } from "three";
import { INK, MAGENTA, ORANGE, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, wallLantern } from "@/lib/diorama-props";

/**
 * Calco (P322): the Compagnia Lete infiltrator lunges down a police-station corridor, half of
 * her already the officer she copied (blue uniform, cap, his frowning half-face) and half still
 * herself: a black suit, wild grey hair and a blank face she no longer remembers. Magenta threads
 * spin round her; her open locker holds the faces of tomorrow, and the keypad by the barred
 * cell door blinks red: she has no idea how to work it.
 */
export function calco(kit: Kit): Framing {
  const { add, box, decorate, tick } = kit;
  const F = octagonBase(kit, 0x1c1e28);
  const G = floor(kit, F, 0.06, 0x2a3040, 0x1d2230, 0.4);

  // The corridor wall: a dado, a barred cell door glowing orange, a keypad beside it.
  const wall = box(3.2, 2.7, 0.2, 0x2c3650, 0, G, -1.45, { delay: 0.1, ink: 1.02 });
  decorate(wall, new BoxGeometry(3.2, 0.9, 0.01), 0x23404b, [[0, 0.45, 0.105]]);
  decorate(wall, new BoxGeometry(3.2, 0.05, 0.014), 0x16303e, [[0, 0.9, 0.106]]);
  decorate(wall, new BoxGeometry(0.92, 1.8, 0.012), INK, [[0.8, 0.9, 0.107]]);
  const cell = decorate(wall, new BoxGeometry(0.78, 1.66, 0.014), ORANGE, [[0.8, 0.86, 0.109]]);
  decorate(
    wall,
    new BoxGeometry(0.035, 1.66, 0.03),
    0x3a3f4e,
    [-0.33, -0.22, -0.11, 0, 0.11, 0.22, 0.33].map((dx) => [0.8 + dx, 0.86, 0.13] as Point),
  );
  decorate(wall, new BoxGeometry(0.78, 0.04, 0.03), 0x3a3f4e, [
    [0.8, 0.45, 0.13],
    [0.8, 1.4, 0.13],
  ]);
  decorate(wall, new BoxGeometry(0.16, 0.24, 0.02), 0x46506a, [[1.42, 1.2, 0.11]]);
  decorate(wall, new BoxGeometry(0.1, 0.1, 0.01), 0x14121c, [[1.42, 1.17, 0.122]]);
  const keypad = decorate(wall, new BoxGeometry(0.05, 0.035, 0.01), 0xff2040, [[1.42, 1.28, 0.122]]);
  const lantern = wallLantern(kit, -0.75, -1.35, G + 2.45, 0.3, 0xffa630);

  // Her locker, door open: the faces she will wear next hang inside.
  const [lx, lz, lt] = [-1.55, -0.55, 0.95];
  const locker = box(0.62, 1.9, 0.48, 0x3a4a5e, lx, G, lz, { delay: 0.25, rotation: [0, lt, 0] });
  decorate(locker, new BoxGeometry(0.54, 1.8, 0.01), 0x12141c, [[0, 0.95, 0.241]]);
  const faces: [number, number, number][] = [
    [-0.13, 1.42, 0xe8c4a8],
    [0.13, 1.42, 0xb07a5a],
    [0, 1.0, 0xf0d0b8],
  ];
  faces.forEach(([x, y, skin], i) => {
    decorate(locker, new SphereGeometry(0.1, 12, 10).scale(0.8, 1, 0.4), skin, [[x, y, 0.26]]);
    decorate(locker, new SphereGeometry(0.105, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.4).scale(0.85, 1, 0.45), [0x8a5a2a, 0x1f1b22, 0xd8b060][i], [[x, y + 0.02, 0.262]]);
  });
  decorate(locker, new BoxGeometry(0.035, 0.012, 0.01), INK, faces.flatMap(([x, y]) => [[x - 0.035, y, 0.3], [x + 0.035, y, 0.3]] as Point[]));
  decorate(locker, new BoxGeometry(0.04, 0.012, 0.01), 0xb02040, faces.map(([x, y]) => [x, y - 0.05, 0.297] as Point));
  decorate(locker, new BoxGeometry(0.4, 0.02, 0.02), 0x8a93a3, [[0, 1.6, 0.25]]);
  // The door, hinged on the locker's right edge and swung wide, out of the way.
  const open = lt + Math.PI + 1.9;
  const hinge: Point = [lx + Math.cos(lt) * 0.31 + Math.sin(lt) * 0.24, G, lz - Math.sin(lt) * 0.31 + Math.cos(lt) * 0.24];
  const door = box(0.6, 1.86, 0.03, 0x46586e, hinge[0] + Math.cos(open) * 0.3, G + 0.02, hinge[2] - Math.sin(open) * 0.3, { delay: 0.3, rotation: [0, open, 0] });
  decorate(door, new BoxGeometry(0.3, 0.02, 0.01), 0x2c3650, [
    [0, 1.6, 0.017],
    [0, 1.55, 0.017],
    [0, 1.5, 0.017],
  ]);

  // Calco: the officer's half on her right, her own on her left.
  const facing = 0.3;
  const spy = figure(kit, {
    x: 0.2,
    z: 0.3,
    y: G,
    facing,
    height: 2.4,
    skin: 0xe8ccb8,
    hair: { style: "wild", color: 0xc8ccd4 },
    face: { blank: true },
    headwear: { kind: "cap", color: 0x1f2c4a, accent: 0x14121c },
    top: { kind: "uniform", color: 0x2a3c66, accent: 0xc8ccd4 },
    bottom: { kind: "trousers", color: 0x1a1c26 },
    shoes: 0x14121c,
    belt: 0x14121c,
    arms: [[-0.3, 1.45, 0.72], [0.82, 1.3, 0.22]],
    legs: "stride",
    delay: 0.8,
  });
  const RH = spy.headRadius;
  // The black suit over her left half: a shell on the torso, sleeves over the left arm.
  add(new CylinderGeometry(0.35 * 1.05, 0.3 * 1.05, 0.68, 14, 1, true, 0.05, Math.PI - 0.1).scale(1, 1, 0.74), 0x1a1a22, ...spy.at(0, 1.05, 0), {
    delay: 1.15,
    rotation: [0, facing, 0],
  });
  const shoulder = spy.at(0.4, 1.72, 0);
  limb(kit, shoulder, spy.elbows[1], 0.125, 0.115, 0x1a1a22, { delay: 1.2 });
  limb(kit, spy.elbows[1], spy.hands[1], 0.11, 0.1, 0x1a1a22, { delay: 1.22 });
  // His half of the face over her right half, split from hers by a magenta seam.
  const R = RH * 1.025;
  const c = R * 1.06;
  const half = add(new SphereGeometry(R, 18, 14, -Math.PI / 2, Math.PI).scale(0.95, 1.06, 0.95), 0xc8946c, spy.head[0], spy.head[1] - c, spy.head[2], {
    delay: 1.3,
    ink: 1.03,
    rotation: [0, facing, 0],
  });
  decorate(half, new BoxGeometry(0.05, 0.03, 0.02), INK, [[-0.08, c + 0.03, 0.2]]);
  decorate(half, new BoxGeometry(0.09, 0.025, 0.02), 0x3a2a22, [[-0.08, c + 0.085, 0.195, 0.35]]);
  decorate(half, new BoxGeometry(0.03, 0.08, 0.05), 0xa87454, [[-0.018, c - 0.02, 0.205]]);
  decorate(half, new BoxGeometry(0.06, 0.014, 0.01), INK, [[-0.04, c - 0.1, 0.2, 0.15]]);
  decorate(half, new BoxGeometry(0.014, 0.07, 0.03), MAGENTA, [
    [0.002, c + 0.15, 0.17, 0.3],
    [0.004, c + 0.07, 0.2, -0.3],
    [0.001, c - 0.02, 0.21, 0.3],
    [0.003, c - 0.11, 0.18, -0.25],
  ]);

  // Magenta threads spinning round her, each at its own tilt.
  const [sx, , sz] = spy.at(0, 0, 0.05);
  const threads = [
    [0.75, 1.0, 0.35, 2.6],
    [0.85, 1.6, -0.3, 2.2],
    [0.7, 2.2, 0.25, 1.8],
    [0.95, 0.5, -0.2, 2.4],
  ].map(([r, h, tilt, arc], k) => {
    const thread = add(new TorusGeometry(r, 0.014, 5, 40, arc).rotateX(Math.PI / 2), MAGENTA, sx, G + h, sz, { delay: 1.6 + k * 0.06, flat: true, noInk: true });
    thread.rotation.order = "YXZ";
    thread.rotation.set(tilt, k * 1.6, 0);
    return { thread, tilt, speed: k % 2 ? -0.9 : 0.7 };
  });

  tick((t) => {
    threads.forEach(({ thread, tilt, speed }, k) => thread.rotation.set(tilt + Math.sin(t * 0.8 + k) * 0.08, k * 1.6 + t * speed, 0));
    keypad.color.setHex(Math.floor(t * 2.5) % 2 ? 0x5a1020 : 0xff2040);
    cell.color.setHex(Math.floor(t * 6) % 17 === 9 ? 0xb05a10 : ORANGE);
    lantern.visible = Math.floor(t * 5) % 23 !== 15;
  });

  return { width: 4.9, height: 4.4, lookY: 1.45 };
}
