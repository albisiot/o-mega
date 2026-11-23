import {
  BoxGeometry,
  ExtrudeGeometry,
  Group,
  Shape,
  SphereGeometry,
  Vector3,
} from "three";
import {
  YELLOW,
  CYAN,
  MAGENTA,
  INK,
  octagonBase,
  limb,
  cable,
  type Point,
  type Kit,
  type Framing,
} from "@/lib/diorama-kit";

/**
 * Milewright (P030): the relay runner of the Lanterne knows every roof of the city, and every
 * broken tile. He is caught mid-leap over an alley between two roofs of Nuova Megara, washing
 * hung across it, swallows circling him with their magenta trails, and the tiles he pushed off
 * from falling into the alley.
 */
export function milewright(kit: Kit): Framing {
  const { add, box, ball, decorate, tick } = kit;
  const STREET = 0x1c1a24;
  const WALL_L = 0x3a3550;
  const WALL_R = 0x2f3f5c;
  const TILE_L = 0x9a3a55;
  const TILE_R = 0x8a3a5f;
  const TILE_LINE = 0x4a1a2c;
  const CHIMNEY = 0x4a4560;
  const SHUTTER = 0x2f6f60;
  const CREAM = 0xe8e2d0;
  const SKIN = 0xd9a682;
  const JACKET = 0x3a9fb8;
  const JACKET_DARK = 0x2a7a90;
  const TROUSERS = 0x1f2a3a;
  const SHOE = 0xe0dccf;
  const BAG = 0x23404b;
  const SWALLOW = 0x1c2240;

  const F = octagonBase(kit, STREET);

  /** A pitched roof along x, its slopes facing the front and the back, with rows of tiles. */
  const roof = (x: number, y: number, z: number, length: number, depth: number, height: number, color: number, delay: number) => {
    const shape = new Shape();
    shape.moveTo(-depth / 2, 0);
    shape.lineTo(depth / 2, 0);
    shape.lineTo(0, height);
    shape.closePath();
    const geometry = new ExtrudeGeometry(shape, { depth: length, bevelEnabled: false })
      .rotateY(Math.PI / 2)
      .translate(-length / 2, 0, 0);
    const part = add(geometry, color, x, y, z, { delay, ink: 1.03 });
    const rows: Point[] = [];
    for (let k = 1; k < 7; k++) {
      const s = k / 7;
      for (const side of [-1, 1]) rows.push([0, height * s + 0.01, side * (depth / 2) * (1 - s) + side * 0.012]);
    }
    decorate(part, new BoxGeometry(length, 0.014, 0.014), TILE_LINE, rows);
    box(length + 0.04, 0.07, 0.1, TILE_LINE, x, y + height - 0.04, z, { delay: delay + 0.04 });
    return part;
  };
  /** A wall with lit windows and green shutters on its front. */
  const building = (x: number, w: number, h: number, wall: number, windows: [number, number][], delay: number) => {
    const part = box(w, h, 2, wall, x, F, -0.15, { delay });
    decorate(part, new BoxGeometry(0.16, 0.22, 0.01), YELLOW, windows.map(([wx, wy]) => [wx, wy, 1.005] as Point));
    decorate(
      part,
      new BoxGeometry(0.07, 0.24, 0.012),
      SHUTTER,
      windows.flatMap(([wx, wy]) => [
        [wx - 0.13, wy, 1.006],
        [wx + 0.13, wy, 1.006],
      ] as Point[]),
    );
    return part;
  };

  // Two houses with an alley between them; the left one is taller.
  building(-1.18, 1.55, 1.2, WALL_L, [[-0.4, 0.75], [0.25, 0.75], [-0.4, 0.3]], 0.1);
  building(1.18, 1.55, 1, WALL_R, [[-0.3, 0.6], [0.35, 0.6], [0.35, 0.2]], 0.14);
  roof(-1.18, F + 1.2, -0.15, 1.7, 2.15, 0.55, TILE_L, 0.3);
  roof(1.18, F + 1, -0.15, 1.7, 2.15, 0.5, TILE_R, 0.34);
  // Chimneys, one with a TV aerial; a wall lantern over the alley.
  box(0.22, 0.5, 0.22, CHIMNEY, -1.55, F + 1.35, -0.55, { delay: 0.45 });
  box(0.3, 0.06, 0.3, TILE_LINE, -1.55, F + 1.85, -0.55, { delay: 0.48 });
  box(0.2, 0.45, 0.2, CHIMNEY, 1.5, F + 1.15, -0.6, { delay: 0.5 });
  box(0.28, 0.06, 0.28, TILE_LINE, 1.5, F + 1.6, -0.6, { delay: 0.52 });
  box(0.02, 0.5, 0.02, INK, 1.5, F + 1.66, -0.6, { delay: 0.55, noInk: true });
  [0.3, 0.2].forEach((w, i) => box(w, 0.015, 0.015, INK, 1.5, F + 1.9 + i * 0.12, -0.6, { delay: 0.58, noInk: true }));
  box(0.08, 0.04, 0.12, INK, -0.44, F + 0.95, 0.55, { delay: 0.6, noInk: true });
  box(0.1, 0.14, 0.1, YELLOW, -0.38, F + 0.83, 0.55, { delay: 0.62, flat: true });

  // Washing on a line across the alley, swaying.
  const lineY = F + 0.82;
  cable(kit, [[-0.4, lineY, 0.65], [0, lineY - 0.08, 0.65], [0.4, lineY - 0.02, 0.65]], 0.008, INK, 0.64);
  const clothes = [
    [-0.22, CYAN, 0.16, 0.2],
    [0.02, CREAM, 0.2, 0.16],
    [0.24, MAGENTA, 0.14, 0.22],
  ].map(([x, color, w, h], i) => {
    const sag = lineY - 0.08 * (1 - (x / 0.4) ** 2);
    // Hung from its top edge, so it sways from the line.
    const cloth = add(new BoxGeometry(w, h, 0.012), color, x, sag, 0.65, { delay: 0.68 + i * 0.04, flat: true });
    for (const child of cloth.children) child.position.y -= h;
    return cloth;
  });

  // The tiles he kicked off the edge, falling into the alley, and the gap they left.
  box(0.18, 0.02, 0.12, INK, -0.62, F + 1.45, 0.42, { delay: 0.7, flat: true, noInk: true, rotation: [0.47, 0, 0] });
  const tiles = [0, 1, 2].map((i) => box(0.12, 0.03, 0.08, TILE_L, -0.4, F + 1.2, 0.5, { delay: 0.75 + i * 0.05, noInk: true }));

  // Milewright in the middle of his leap, facing the lower roof, his head turned to us.
  const runner: Group[] = [];
  const r = (part: Group) => {
    runner.push(part);
    return part;
  };
  const D = 0.95;
  const LEAP = 0.25;
  r(ball(0.2, TROUSERS, 0, 1.85, 0.3, { delay: D }));
  r(limb(kit, [0, 2, 0.3], [0.16, 2.55, 0.3], 0.25, 0.29, JACKET, { delay: D + 0.06 }));
  // The legs: the front one tucked up, the back one stretched out behind.
  r(limb(kit, [0.05, 2.02, 0.42], [0.42, 2.12, 0.46], 0.13, 0.12, TROUSERS, { delay: D + 0.1 }));
  r(limb(kit, [0.42, 2.12, 0.46], [0.36, 1.68, 0.5], 0.11, 0.1, TROUSERS, { delay: D + 0.14 }));
  r(box(0.26, 0.11, 0.13, SHOE, 0.42, 1.56, 0.5, { delay: D + 0.18, rotation: [0, 0, -0.2] }));
  r(limb(kit, [-0.04, 2.02, 0.2], [-0.38, 1.82, 0.16], 0.13, 0.12, TROUSERS, { delay: D + 0.1 }));
  r(limb(kit, [-0.38, 1.82, 0.16], [-0.72, 1.86, 0.12], 0.11, 0.1, TROUSERS, { delay: D + 0.14 }));
  r(box(0.13, 0.26, 0.13, SHOE, -0.8, 1.74, 0.12, { delay: D + 0.18, rotation: [0, 0, 0.35] }));
  // The arms spread for balance, the messenger bag on his hip.
  const arm = (shoulder: Point, elbow: Point, hand: Point, wait: number) => {
    r(ball(0.13, JACKET, shoulder[0], shoulder[1] - 0.13, shoulder[2], { delay: D + wait }));
    r(limb(kit, shoulder, elbow, 0.1, 0.09, JACKET, { delay: D + wait + 0.04 }));
    r(limb(kit, elbow, hand, 0.09, 0.08, JACKET, { delay: D + wait + 0.08 }));
    r(ball(0.085, JACKET_DARK, hand[0], hand[1] - 0.085, hand[2], { delay: D + wait + 0.1 }));
    r(ball(0.07, SKIN, hand[0] + (hand[0] - elbow[0]) * 0.25, hand[1] - 0.07 + (hand[1] - elbow[1]) * 0.25, hand[2], { delay: D + wait + 0.12 }));
  };
  arm([0.12, 2.5, 0.55], [0.42, 2.45, 0.72], [0.7, 2.28, 0.8], 0.2);
  arm([0.1, 2.5, 0.06], [-0.2, 2.42, -0.08], [-0.48, 2.56, -0.15], 0.22);
  r(box(0.28, 0.22, 0.1, BAG, -0.12, 1.92, 0.52, { delay: D + 0.3 }));
  r(limb(kit, [0.15, 2.48, 0.5], [-0.05, 2.12, 0.55], 0.02, 0.02, BAG, { delay: D + 0.32, noInk: true }));
  // His head, turned towards us inside the hood.
  const face = new Vector3(0.75, 0, 0.66).normalize();
  const centre: Point = [0.24, 2.8, 0.33];
  r(add(new SphereGeometry(0.2, 16, 12), JACKET, centre[0] - face.x * 0.07, centre[1] - 0.17, centre[2] - face.z * 0.07, { delay: D + 0.36 }));
  const head = r(ball(0.16, SKIN, centre[0], centre[1] - 0.16, centre[2], { delay: D + 0.4 }));
  const at = (forward: number, side: number, up: number): Point => [
    face.x * forward - face.z * side,
    0.16 + up,
    face.z * forward + face.x * side,
  ];
  decorate(head, new BoxGeometry(0.03, 0.03, 0.03), INK, [at(0.15, 0.055, 0.03), at(0.15, -0.055, 0.03)]);
  decorate(head, new BoxGeometry(0.035, 0.012, 0.035), INK, [at(0.145, 0, -0.07)]);

  // His trail, and the swallows circling him.
  [
    [-1.05, 2.2, 0.32, 0.8],
    [-0.95, 2.55, 0.16, 0.6],
    [-1.15, 1.95, 0.5, 0.7],
  ].forEach(([x, y, z, length], i) =>
    box(length, 0.022, 0.022, MAGENTA, x, y + LEAP, z, { delay: D + 0.5 + i * 0.04, flat: true, noInk: true }),
  );
  const swallows = [0, 1, 2].map((i) => {
    const bird = add(new SphereGeometry(0.06, 10, 8).scale(1.9, 0.8, 0.8), SWALLOW, 0, 0, 0, { delay: 1.5 + i * 0.08 });
    decorate(bird, new BoxGeometry(0.07, 0.008, 0.24).rotateY(-0.55), SWALLOW, [[-0.03, 0.06, 0.11]]);
    decorate(bird, new BoxGeometry(0.07, 0.008, 0.24).rotateY(0.55), SWALLOW, [[-0.03, 0.06, -0.11]]);
    decorate(bird, new BoxGeometry(0.13, 0.006, 0.02).rotateY(0.3), SWALLOW, [[-0.15, 0.05, 0.02]]);
    decorate(bird, new BoxGeometry(0.13, 0.006, 0.02).rotateY(-0.3), SWALLOW, [[-0.15, 0.05, -0.02]]);
    decorate(bird, new BoxGeometry(0.04, 0.03, 0.05), MAGENTA, [[0.09, 0.04, 0]]);
    decorate(bird, new BoxGeometry(0.5, 0.008, 0.008), MAGENTA, [[-0.45, 0.05, 0]]);
    return bird;
  });

  // The whole leap a little higher, so that the alley shows under him.
  for (const part of runner) part.position.y += LEAP;
  const restY = runner.map((part) => part.position.y);
  tick((t) => {
    // He hangs in the air at the top of his leap.
    const float = Math.sin(t * 1.6) * 0.03;
    runner.forEach((part, i) => (part.position.y = restY[i] + float));
    swallows.forEach((bird, i) => {
      const angle = t * (0.9 + i * 0.15) + (i * Math.PI * 2) / 3;
      const radius = 0.95 + i * 0.15;
      bird.position.set(0.1 + radius * Math.cos(angle), 2.35 + LEAP + i * 0.18 + Math.sin(angle * 2) * 0.08, 0.2 + radius * Math.sin(angle) * 0.8);
      bird.rotation.set(0, -(angle + Math.PI / 2), 0.25);
    });
    clothes.forEach((cloth, i) => (cloth.rotation.x = Math.sin(t * 1.4 + i) * 0.18));
    tiles.forEach((tile, i) => {
      const u = (t * 0.45 + i / tiles.length) % 1;
      tile.position.set(-0.4 + u * 0.12, F + 1.2 - u * u * 1.15, 0.5 + i * 0.05);
      tile.rotation.set(u * 4 + i, 0, u * 3);
      tile.visible = u < 0.95;
    });
  });

  return { width: 4.9, height: 4.3, lookY: 1.7 };
}
