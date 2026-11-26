import { BoxGeometry, CylinderGeometry, Group, TorusGeometry } from "three";
import { YELLOW, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";

/**
 * Lattice (P336): the rubber smuggler ankle-deep in a sewer under the old town, grinning in her
 * yellow overalls. Her black-gloved arm has stretched across the sewer and down a standpipe no wider
 * than a wrist, to fish out what she hid there, and it sways like a hose; in her other hand a
 * parcel. More parcels wait in the big drain behind her, and so do two eyes she never notices.
 */
export function lattice(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const WATER = 0x0e3a4e;
  const FOAM = 0xcfeef7;
  const RUST = 0x7a4a3a;
  const RUBBER = 0x15141a;
  const SUIT = 0xe0a020;
  const KRAFT = 0xb08a5a;
  const F = octagonBase(kit, WATER);

  // The tunnel wall: dark bricks, two rusty pipes along it, a thin pipe and a big drain.
  const wall = box(3.2, 2.6, 0.3, 0x232a3a, -0.1, F, -1.2, { delay: 0.1, ink: 1.02 });
  const bricks: Point[] = [];
  for (let r = 0; r < 13; r++) for (let c = 0; c < 9; c++) if ((r * 3 + c * 5) % 4) bricks.push([-1.5 + c * 0.36 + (r % 2) * 0.18, 0.12 + r * 0.2, 0.152]);
  decorate(wall, new BoxGeometry(0.32, 0.16, 0.01), 0x2e3a52, bricks.filter(([x]) => x < 1.45));
  const pipe = (y: number, z: number, r: number, delay: number) => {
    const part = add(new CylinderGeometry(r, r, 3.1, 14).rotateZ(Math.PI / 2), RUST, -0.1, y, z, { delay });
    decorate(part, new TorusGeometry(r + 0.02, 0.03, 6, 16).rotateY(Math.PI / 2), 0x5a3428, [-0.9, 0.3, 1.2].map((x) => [x, r, 0] as Point));
  };
  pipe(F + 2.0, -0.95, 0.16, 0.2);
  pipe(F + 1.55, -0.95, 0.1, 0.24);
  // The thin standpipe out of the water that her arm has gone down.
  const mouth: Point = [-1.55, F + 0.62, 0.55];
  cylinder(0.12, 0.12, 0.6, RUST, mouth[0], F, mouth[2], { delay: 0.3 }, 12);
  const rim = cylinder(0.16, 0.16, 0.06, 0x5a3428, mouth[0], F + 0.56, mouth[2], { delay: 0.32 }, 12);
  decorate(rim, new CylinderGeometry(0.1, 0.1, 0.01, 12), 0x08080e, [[0, 0.061, 0]]);
  // The big drain: parcels stuffed inside, and a watcher's eyes in the dark.
  const DX = 0.95;
  const drain = add(new CylinderGeometry(0.36, 0.36, 0.5, 18).rotateX(Math.PI / 2), RUST, DX, F + 0.05, -0.85, { delay: 0.35 });
  decorate(drain, new CylinderGeometry(0.3, 0.3, 0.01, 18).rotateX(Math.PI / 2), 0x08080e, [[0, 0.36, 0.252]]);
  decorate(drain, new TorusGeometry(0.36, 0.035, 6, 20), 0x5a3428, [[0, 0.36, 0.25]]);
  [
    [-0.1, 0.02, 0.2],
    [0.13, 0.0, 0.15],
  ].forEach(([dx, dy, dz], k) => {
    const parcel = box(0.22, 0.16, 0.2, KRAFT, DX + dx, F + 0.12 + dy, -0.85 + dz, { delay: 0.5 + k * 0.04, rotation: [0, 0.3 - k * 0.5, 0.1] });
    decorate(parcel, new BoxGeometry(0.23, 0.02, 0.21), 0x5a3a24, [[0, 0.08, 0]]);
  });
  const eyes = box(0.05, 0.035, 0.01, YELLOW, DX - 0.08, F + 0.56, -0.585, { delay: 1.8, flat: true, noInk: true });
  decorate(eyes, new BoxGeometry(0.05, 0.035, 0.01), YELLOW, [[0.14, 0, 0]]);

  // Ripples round her boots.
  const rings = [0, 1].map((k) => add(new TorusGeometry(0.3, 0.018, 6, 30).rotateX(Math.PI / 2), FOAM, 0.4, F + 0.002, 0.38, { delay: 0.6 + k * 0.1, flat: true, noInk: true }));

  // Lattice: yellow overalls, black rubber gloves and boots, curls in two puffs.
  const smuggler = figure(kit, {
    x: 0.4,
    z: 0.38,
    y: F,
    facing: 0.35,
    height: 2.35,
    build: "slim",
    skin: 0x7a4a32,
    hair: { style: "curly", color: 0x17121a },
    face: { mouth: "grin", brows: "raised" },
    top: { kind: "jacket", color: SUIT, accent: 0x8a5a10 },
    bottom: { kind: "trousers", color: SUIT },
    shoes: RUBBER,
    gloves: RUBBER,
    belt: 0x8a5a10,
    arms: [[-0.72, 1.48, 0.08], [0.36, 1.25, 0.5]],
    legs: "wide",
    delay: 0.8,
  });
  const u = 2.35 / 2.4;
  const at = smuggler.at;
  [-1, 1].forEach((side) => ball(0.12, 0x17121a, ...at(side * 0.2, 2.3, -0.04), { delay: 1.5 }));
  // Rubber boots to the knee, rubber gloves to the elbow.
  [-1, 1].forEach((side) => limb(kit, at(side * 0.27 * u, 0.6 * u, 0.03), at(side * 0.34 * u, 0.1, 0), 0.1, 0.095, RUBBER, { delay: 1.3 }));
  [0, 1].forEach((i) => limb(kit, smuggler.elbows[i], smuggler.hands[i], 0.098, 0.09, RUBBER, { delay: 1.35 }));
  const [right, left] = smuggler.hands;
  const parcel = box(0.24, 0.18, 0.2, KRAFT, left[0] + 0.04, left[1] - 0.12, left[2] + 0.1, { delay: 1.5, rotation: [0, 0.35, 0.15] });
  decorate(parcel, new BoxGeometry(0.25, 0.02, 0.21), 0x5a3a24, [[0, 0.09, 0]]);
  decorate(parcel, new BoxGeometry(0.02, 0.19, 0.21), 0x5a3a24, [[0, 0.09, 0]]);

  // The stretched arm: rubber beads from her hand over and down the standpipe, swaying.
  const N = 22;
  const R = 0.08;
  const beads: Group[] = Array.from({ length: N }, (_, k) => ball(R, RUBBER, right[0], right[1] - R, right[2], { delay: 1.4 + k * 0.02 }));
  const path = (s: number, t: number): Point => {
    const sway = Math.sin(Math.PI * s) * Math.sin(t * 2.1 + s * 5) * 0.16;
    return [
      right[0] + (mouth[0] - right[0]) * s + sway * 0.6,
      right[1] + (mouth[1] - right[1]) * s + Math.sin(Math.PI * Math.min(1, s * 1.15)) * 0.35 + sway * 0.4,
      right[2] + (mouth[2] - right[2]) * s - sway * 0.5,
    ];
  };

  tick((t) => {
    beads.forEach((bead, k) => {
      const [x, y, z] = path((k + 1) / N, t);
      bead.position.set(x, y - R, z);
    });
    rings.forEach((ring, k) => {
      const v = (t * 0.45 + k * 0.5) % 1;
      ring.children[0].scale.set(0.6 + v, 1, 0.6 + v);
      ring.visible = v < 0.85;
    });
    // The eyes in the drain blink now and then.
    eyes.visible = Math.floor(t * 2.5) % 7 !== 3;
  });

  return { width: 4.9, height: 4.3, lookY: 1.45 };
}
