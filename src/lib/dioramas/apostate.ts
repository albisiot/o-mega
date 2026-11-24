import { BoxGeometry, ConeGeometry, Group, SphereGeometry, TorusGeometry } from "three";
import { YELLOW, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure, type Figure } from "@/lib/diorama-figure";
import { floor, wallLantern } from "@/lib/diorama-props";

/**
 * A cap of hair over the top of a figure's head (the figure's own caps sit low and leave it bald);
 * `front` tips it back to bare the forehead.
 */
function hairCap(kit: Kit, person: Figure, color: number, facing: number, delay: number, front = 0.4): Group {
  const R = person.headRadius;
  const [x, y, z] = person.head;
  const cap = kit.add(new SphereGeometry(R * 1.12, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 1.1, 1.02), color, x - Math.sin(facing) * 0.03, y - R * 0.05, z - Math.cos(facing) * 0.03, { delay });
  cap.rotation.order = "YXZ";
  cap.rotation.set(-front, facing, 0);
  return cap;
}

/**
 * Apostate (P045): the former wrestling champion of the Custodi walks away from a brick tenement
 * grinning, the front door he has just torn off its hinges tucked under his arm, splinters and
 * dust where it stood. The price, a mind that never thought of handles: the door's knob is
 * perfectly fine and the key is still in the lock.
 */
export function apostate(kit: Kit): Framing {
  const { add, box, decorate, tick, motes } = kit;
  const BRICK = 0x3a3050;
  const WOOD = 0x6a5040;
  const DOOR = 0x2e5a7a;
  const F = octagonBase(kit, 0x1c1a26);
  const G = floor(kit, F, 0.06, 0x2e2c3a, 0x1e1c28, 0.45);

  // The brick wall with the empty doorway: splintered jambs, a hinge left hanging.
  const wall = box(2.9, 2.8, 0.3, BRICK, -0.15, G, -1.45, { delay: 0.1, ink: 1.02 });
  const bricks: Point[] = [];
  for (let r = 0; r < 10; r++) for (let c = 0; c < 6; c++) if ((r * 3 + c * 5) % 3) bricks.push([-1.3 + c * 0.5 + (r % 2) * 0.25, 0.14 + r * 0.27, 0.155]);
  decorate(wall, new BoxGeometry(0.42, 0.2, 0.01), 0x453a5e, bricks);
  const DX = -0.75;
  box(0.9, 1.85, 0.02, 0x0c0a12, DX, G, -1.29, { delay: 0.2, flat: true, noInk: true });
  [-0.5, 0.5].forEach((side) => box(0.1, 1.95, 0.12, WOOD, DX + side, G, -1.28, { delay: 0.24 }));
  box(1.1, 0.12, 0.12, WOOD, DX, G + 1.9, -1.28, { delay: 0.26 });
  // Splinters along the jamb where the hinges were.
  [0.3, 0.7, 1.2, 1.55].forEach((y, i) =>
    add(new ConeGeometry(0.04, 0.2, 4), 0xc8a070, DX - 0.43, G + y, -1.22, { delay: 0.3 + i * 0.02, rotation: [0, 0, i % 2 ? 1.2 : -1.9] }),
  );
  const hinge = box(0.1, 0.16, 0.03, 0x4a4f5c, DX - 0.44, G + 1.3, -1.2, { delay: 0.34 });
  box(0.1, 0.16, 0.03, 0x4a4f5c, DX - 0.44, G + 0.4, -1.2, { delay: 0.34, rotation: [0, 0, 0.5] });
  wallLantern(kit, 0.55, -1.3, G + 2.2, 0.4);
  // A doormat, and the splinters on the ground.
  box(0.8, 0.02, 0.45, 0x6a3a4a, DX, G, -0.95, { delay: 0.4, noInk: true });
  [[-1.2, -0.6, 0.4], [-0.4, -0.45, -0.7], [-0.9, -0.2, 1.4], [-0.1, -0.85, 0.2], [-1.5, -0.25, 2.2]].forEach(([x, z, turn], i) =>
    box(0.22 - (i % 2) * 0.08, 0.04, 0.05, 0xc8a070, x, G, z, { delay: 0.45 + i * 0.02, rotation: [0, turn, 0] }),
  );
  motes(10, 0x8a8094, 0.03, [DX - 0.45, G, -1.2], [DX + 0.45, G + 1.6, -0.6], 1);

  // Apostate: huge, moustached, beaming, the door under his left arm.
  const D = 0.7;
  const champ = figure(kit, {
    x: 0.1,
    z: 0.3,
    y: G,
    facing: 0.3,
    height: 2.6,
    build: "broad",
    skin: 0xd09a78,
    hair: { style: "curly", color: 0x2a1c18 },
    face: { mouth: "grin", brows: "raised", beard: "moustache", beardColor: 0x2a1c18 },
    top: { kind: "jacket", color: 0x24406a, accent: 0xe8e2d0, sleeves: "short" },
    bottom: { kind: "trousers", color: 0x1c2440 },
    shoes: 0x1a1a22,
    arms: ["hip", [0.64, 1.02, 0.14]],
    delay: D,
  });
  hairCap(kit, champ, 0x2a1c18, 0.3, D + 0.38, 0.6);
  const u = 2.6 / 2.4;
  // White stripes down the track trousers, a yellow badge on the shoulder.
  [-1, 1].forEach((side) =>
    limb(kit, champ.at(side * (0.17 * u + 0.17), 1.02 * u, 0), champ.at(side * (0.17 * u + 0.15), 0.16 * u, 0.03), 0.02, 0.02, 0xe8e2d0, { delay: D + 0.3, noInk: true }),
  );
  box(0.1, 0.1, 0.03, YELLOW, ...champ.at(0.52 * u, 1.55 * u, 0.2), { delay: D + 0.45, rotation: [0, 0.3, Math.PI / 4] });

  // The door: under his left arm, its top tipped out to his side.
  const door = box(0.82, 1.9, 0.08, DOOR, ...champ.at(0.8, 0.45, -0.06), { delay: D + 0.55, rotation: [0, 0.3, -0.5] });
  decorate(door, new BoxGeometry(0.28, 0.55, 0.01), 0x234a66, [[-0.16, 1.4, 0.045], [0.16, 1.4, 0.045], [-0.16, 0.6, 0.045], [0.16, 0.6, 0.045]]);
  // The knob and the key in the lock, untouched.
  decorate(door, new SphereGeometry(0.06, 10, 8), 0xd8b050, [[0.3, 0.95, 0.07]]);
  decorate(door, new BoxGeometry(0.03, 0.1, 0.03), 0xd8b050, [[0.3, 0.78, 0.06]]);
  decorate(door, new TorusGeometry(0.04, 0.012, 6, 12), 0xd8b050, [[0.3, 0.69, 0.07]]);
  // Torn hinges and splinters on its other edge.
  decorate(door, new BoxGeometry(0.06, 0.14, 0.05), 0x4a4f5c, [[-0.41, 0.4, 0], [-0.41, 1.5, 0]]);
  decorate(door, new ConeGeometry(0.03, 0.14, 4), 0xc8a070, [[-0.44, 0.8, 0, 1.4], [-0.44, 1.1, 0, 1.8], [-0.44, 1.7, 0, 1.6]]);

  const rest = champ.parts.map((part) => part.position.y);
  const doorY = door.position.y;
  tick((t) => {
    // A proud chuckle now and then; the hinge left on the jamb swings.
    const laugh = Math.sin(t * 0.7) > 0.5 ? Math.abs(Math.sin(t * 14)) * 0.025 : 0;
    champ.parts.forEach((part, i) => (part.position.y = rest[i] + laugh));
    door.position.y = doorY + laugh;
    hinge.rotation.z = Math.sin(t * 2.2) * 0.35;
  });

  return { width: 4.9, height: 4.5, lookY: 1.55 };
}
