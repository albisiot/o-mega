import { BoxGeometry, ConeGeometry, SphereGeometry, TorusGeometry, type Group, type MeshBasicMaterial } from "three";
import { CYAN, INK, YELLOW, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { floor, wallLantern } from "@/lib/diorama-props";

/**
 * Warren (P212): the pack with one mind rings a front door at night on an old-town street with
 * tram rails: the grey wolf at its head stands with a paw up on the brass bell plate, two long
 * rings and one short, while dogs, rats and crows wait round it and every red eye blinks at
 * once. The price of having no hands for technology: a phone in the gutter, chewed to bits.
 */
export function warren(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const RED = 0xff2a3a;
  const WALL = 0x3a3450;
  const WOOD = 0x4a3628;
  const BRASS = 0xc9a040;
  const RAIL = 0x8f98a8;
  const F = octagonBase(kit, 0x1d1b26);
  const G = floor(kit, F, 0.06, 0x2e2c3a, 0x1e1c28, 0.36);

  // The house front: an old wooden door, the bell plate beside it, lit windows upstairs.
  const wall = box(3.4, 2.7, 0.3, WALL, -0.05, G, -1.55, { delay: 0.1, ink: 1.02 });
  decorate(wall, new BoxGeometry(0.34, 0.5, 0.01), YELLOW, [
    [-1.2, 2.0, 0.155],
    [1.1, 2.0, 0.155],
  ]);
  decorate(wall, new BoxGeometry(0.34, 0.5, 0.01), 0x141a26, [[-0.05, 2.0, 0.155]]);
  decorate(wall, new BoxGeometry(0.09, 0.52, 0.012), 0x2f6f60, [
    [-1.42, 2.0, 0.157],
    [-0.98, 2.0, 0.157],
    [0.88, 2.0, 0.157],
    [1.32, 2.0, 0.157],
  ]);
  box(0.95, 1.65, 0.1, 0x5d6680, -0.35, G, -1.38, { delay: 0.16 });
  const door = box(0.75, 1.52, 0.06, WOOD, -0.35, G, -1.31, { delay: 0.2 });
  decorate(door, new BoxGeometry(0.28, 0.6, 0.01), 0x3a2a20, [
    [-0.18, 1.05, 0.032],
    [0.18, 1.05, 0.032],
    [-0.18, 0.38, 0.032],
    [0.18, 0.38, 0.032],
  ]);
  decorate(door, new TorusGeometry(0.05, 0.012, 6, 14), BRASS, [[0.26, 0.8, 0.04]]);
  const plate = box(0.16, 0.3, 0.04, BRASS, 0.98, G + 0.92, -1.38, { delay: 0.24 });
  decorate(plate, new BoxGeometry(0.06, 0.05, 0.02), 0xf4e0a0, [
    [0, 0.23, 0.02],
    [0, 0.15, 0.02],
    [0, 0.07, 0.02],
  ]);
  wallLantern(kit, -1.15, -1.4, G + 1.75, 0.3);

  // Tram rails along the street, and the signal at the corner, both lights red.
  [0.75, 1.15].forEach((z, i) => box(i ? 4.1 : 4.5, 0.03, 0.05, RAIL, 0, G, z, { delay: 0.28 + i * 0.03, noInk: true }));
  cylinder(0.04, 0.05, 2.3, 0x23222b, 1.75, G, -0.55, { delay: 0.32 }, 8);
  const head = box(0.22, 0.48, 0.16, 0x1a1a22, 1.75, G + 2.0, -0.55, { delay: 0.36, rotation: [0, -0.35, 0] });
  decorate(head, new SphereGeometry(0.065, 10, 8), RED, [
    [0, 0.34, 0.07],
    [0, 0.14, 0.07],
  ]);

  // The chewed phone in the gutter.
  const phone = box(0.2, 0.025, 0.36, INK, -0.55, G, 1.55, { delay: 0.4, rotation: [0, 0.6, 0] });
  decorate(phone, new BoxGeometry(0.16, 0.004, 0.3), CYAN, [[0, 0.027, 0]]);
  decorate(phone, new BoxGeometry(0.004, 0.006, 0.2), INK, [
    [0.02, 0.03, 0.02, 0],
    [-0.03, 0.03, -0.04, 0],
  ]);
  decorate(phone, new ConeGeometry(0.03, 0.06, 3), 0x2e2c3a, [
    [0.1, 0.015, 0.1, Math.PI / 2],
    [0.1, 0.015, 0.0, Math.PI / 2],
    [0.1, 0.015, -0.1, Math.PI / 2],
  ]);

  // The pack: one body plan for wolf, dogs and rats; `leg` is how high the body stands.
  const eyes: MeshBasicMaterial[] = [];
  type Kind = { s: number; fur: number; light: number; ears: "point" | "flop" | "round"; leg: number; patches?: number };
  const beast = (x: number, z: number, facing: number, look: number, kind: Kind, delay: number, raise?: Point) => {
    const { s, fur, light, leg } = kind;
    const rat = kind.ears === "round";
    const c = Math.cos(facing);
    const n = Math.sin(facing);
    const at = (lx: number, ly: number, lz: number): Point => [x + (lx * c + lz * n) * s, G + ly * s, z + (-lx * n + lz * c) * s];
    const turn: Point = [0, facing, 0];
    const low = leg * 0.8;
    const body = add(new SphereGeometry((rat ? 0.3 : 0.34) * s, 14, 10).scale(0.9, 0.85, 1.7), fur, ...at(0, low, -0.04), { delay, rotation: turn });
    if (kind.patches !== undefined)
      decorate(body, new BoxGeometry(0.02, 0.16 * s, 0.24 * s), kind.patches, [
        [-0.3 * s, 0.32 * s, -0.12 * s],
        [0.3 * s, 0.3 * s, 0.1 * s],
      ]);
    add(new SphereGeometry(0.22 * s, 12, 8).scale(1, 0.95, 1.1), light, ...at(0, low + 0.06, 0.34), { delay: delay + 0.02, rotation: turn });
    let paw: Group[] = [];
    [
      [-0.15, 0.36],
      [0.15, 0.36],
      [-0.15, -0.38],
      [0.15, -0.38],
    ].forEach(([lx, lz], i) => {
      if (raise && i === 1) {
        paw = [limb(kit, at(lx, low + 0.2, lz), raise, 0.08 * s, 0.065 * s, light, { delay: delay + 0.04 })];
        paw.push(ball(0.08 * s, light, raise[0], raise[1] - 0.08 * s, raise[2], { delay: delay + 0.06 }));
        return;
      }
      limb(kit, at(lx, low + 0.2, lz), at(lx, 0.03, lz + 0.03), 0.085 * s, 0.065 * s, i < 2 ? light : fur, { delay: delay + 0.04 + i * 0.01 });
      add(new SphereGeometry(0.075 * s, 8, 6).scale(1, 0.6, 1.4), light, ...at(lx, 0, lz + 0.07), { delay: delay + 0.06, rotation: turn });
    });
    limb(kit, at(0, low + 0.36, -0.5), at(0.05, rat ? 0.02 : low - 0.05, rat ? -1.5 : -0.95), (rat ? 0.035 : 0.08) * s, (rat ? 0.015 : 0.05) * s, rat ? 0xc08090 : fur, { delay: delay + 0.08 });
    // The neck and head, turned by `look`, with its snout, ears and red eyes.
    const yaw = facing + look;
    const hc = at(0, low + (rat ? 0.36 : 0.62), 0.62);
    const off = (dx: number, dy: number, dz: number): Point => [hc[0] + (dx * Math.cos(yaw) + dz * Math.sin(yaw)) * s, hc[1] + dy * s, hc[2] + (-dx * Math.sin(yaw) + dz * Math.cos(yaw)) * s];
    if (!rat) limb(kit, at(0, low + 0.32, 0.34), hc, 0.15 * s, 0.13 * s, fur, { delay: delay + 0.08 });
    const skull = add(new SphereGeometry(0.2 * s, 14, 10), fur, hc[0], hc[1] - 0.2 * s, hc[2], { delay: delay + 0.1, rotation: [0, yaw, 0] });
    const snout = rat
      ? add(new ConeGeometry(0.1 * s, 0.3 * s, 8).rotateX(Math.PI / 2), light, ...off(0, -0.1, 0.24), { delay: delay + 0.12, rotation: [0, yaw, 0] })
      : box(0.14 * s, 0.13 * s, 0.26 * s, light, ...off(0, -0.13, 0.2), { delay: delay + 0.12, rotation: [0.15, yaw, 0] });
    decorate(snout, new BoxGeometry(0.07 * s, 0.05 * s, 0.03), INK, [[0, (rat ? 0.1 : 0.11) * s, (rat ? 0.15 : 0.13) * s]]);
    eyes.push(
      decorate(skull, new BoxGeometry(0.065 * s, 0.04 * s, 0.02), RED, [
        [-0.075 * s, 0.24 * s, 0.17 * s, 0.25],
        [0.075 * s, 0.24 * s, 0.17 * s, -0.25],
      ]),
    );
    [-1, 1].forEach((side) => {
      if (kind.ears === "point") add(new ConeGeometry(0.065 * s, 0.19 * s, 5), fur, ...off(side * 0.1, 0.13, -0.02), { delay: delay + 0.14, rotation: [0, yaw, -side * 0.25] });
      else if (kind.ears === "flop") box(0.05 * s, 0.22 * s, 0.12 * s, 0x2a2a30, ...off(side * 0.2, -0.14, 0), { delay: delay + 0.14, rotation: [0, yaw, side * 0.2] });
      else add(new SphereGeometry(0.08 * s, 10, 6).scale(1, 1, 0.35), 0xc08090, ...off(side * 0.14, 0.1, -0.04), { delay: delay + 0.14, rotation: [0, yaw, 0] });
    });
    return paw;
  };

  // The grey wolf at the door, its left forepaw on the bell; dogs and rats round it.
  const bell: Point = [0.98, G + 1.12, -1.33];
  const raised = beast(-0.15, -0.92, Math.PI / 2, -1.15, { s: 1.15, fur: 0x5e626e, light: 0xa8adb8, ears: "point", leg: 0.5 }, 0.8, bell);
  beast(-1.2, 0.2, 0.6, -0.15, { s: 0.85, fur: 0xdcd8d0, light: 0xe8e4dc, ears: "flop", leg: 0.45, patches: 0x2a2a30 }, 1.0);
  beast(1.2, 0.35, -0.55, 0.35, { s: 0.8, fur: 0x3a3640, light: 0x5a5460, ears: "flop", leg: 0.45 }, 1.1);
  (
    [
      [-0.2, 1.05, 0.5],
      [0.45, 1.4, -0.2],
      [1.3, 1.2, -0.7],
      [-1.4, 1.15, 0.9],
      [-0.8, 1.75, 2.4],
    ] as Point[]
  ).forEach(([x, z, f], i) => beast(x, z, f, 0, { s: 0.4, fur: 0x4a4450, light: 0x6a6270, ears: "round", leg: 0.2 }, 1.2 + i * 0.04));

  // Crows: on the signal, on the lintel, and one circling with its wings out.
  const crow = (x: number, y: number, z: number, yaw: number, delay: number, spread: boolean) => {
    add(new SphereGeometry(0.12, 12, 8).scale(0.85, 0.85, 1.6), 0x1f1d26, x, y, z, { delay, rotation: [-0.2, yaw, 0] });
    const hc: Point = [x + Math.sin(yaw) * 0.16, y + 0.24, z + Math.cos(yaw) * 0.16];
    const skull = ball(0.08, 0x1f1d26, hc[0], hc[1] - 0.08, hc[2], { delay: delay + 0.02, rotation: [0, yaw, 0] });
    eyes.push(decorate(skull, new BoxGeometry(0.03, 0.02, 0.015), RED, [[-0.04, 0.1, 0.06], [0.04, 0.1, 0.06]]));
    decorate(skull, new ConeGeometry(0.03, 0.12, 6).rotateX(Math.PI / 2), 0x8a8e98, [[0, 0.07, 0.1]]);
    return [-1, 1].map((side) =>
      add(new BoxGeometry(spread ? 0.42 : 0.1, 0.025, 0.2).translate(side * (spread ? 0.21 : 0.05), 0, 0), 0x2a2834, x + side * 0.08, y + 0.12, z, { delay: delay + 0.04, rotation: [0, yaw, spread ? side * 0.2 : side * -0.9] }),
    );
  };
  crow(1.75, G + 2.48, -0.55, 0.3, 1.5, false);
  crow(-0.35, G + 1.75, -1.3, 0.2, 1.55, false);
  const flying = crow(-0.95, G + 2.95, -0.35, -1.2, 1.6, true);

  // Sound rings off the bell while the paw presses it.
  const rings = [0, 1].map((k) => add(new TorusGeometry(0.12, 0.014, 6, 24), YELLOW, bell[0] + 0.12, bell[1] - 0.12, bell[2] + 0.06, { delay: 1.7 + k * 0.05, flat: true, noInk: true }));
  const restPaw = raised.map((part) => part.position.z);
  tick((t) => {
    // Two long, one short: territory.
    const u = t % 4;
    const pressed = u < 0.9 || (u > 1.1 && u < 2.0) || (u > 2.2 && u < 2.45);
    raised.forEach((part, i) => (part.position.z = restPaw[i] - (pressed ? 0.03 : -0.05)));
    rings.forEach((ring, k) => {
      const v = (t * 1.6 + k * 0.5) % 1;
      const mesh = ring.children[0];
      mesh.scale.setScalar(1 + v * 1.6);
      mesh.visible = pressed;
    });
    // One mind: every eye shuts at the same moment.
    const open = t % 3.7 < 3.52;
    eyes.forEach((material) => (material.visible = open));
    flying.forEach((wing, side) => (wing.rotation.z = (side ? 1 : -1) * (0.2 + Math.sin(t * 7) * 0.45)));
  });

  return { width: 4.9, height: 4.4, lookY: 1.4 };
}
