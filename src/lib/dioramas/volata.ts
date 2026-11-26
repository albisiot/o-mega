import { BoxGeometry, CylinderGeometry, Group, TorusGeometry, Vector3 } from "three";
import { CYAN, INK, MAGENTA, ORANGE, YELLOW, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { column, facade, floor, lamp, puddle } from "@/lib/diorama-props";

/**
 * Volata (P292): the delivery rider of the Lanterne sprints down an old-town street at night,
 * faster than his own scooter, which wobbles on riderless behind him. The customer waves a tip
 * from the lit doorway he has already overshot, receipts fly off his orange backpack, and dead
 * ahead, on his way, stands a bollard he has not seen.
 */
export function volata(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const F = octagonBase(kit, 0x1f1d28);
  const G = floor(kit, F, 0.06, 0x2c3040, 0x1c1f2a, 0.35);
  const PAPER = 0xeeeae0;
  const SILVER = 0xdfe8ee;

  // The street: a house front with the customer's lit door, old columns, a lamp, a puddle.
  const wall = facade(kit, -0.6, -1.45, G, 0.1, { width: 2, height: 2.5, color: 0x33304e, windows: 3, floors: 2, door: true });
  decorate(wall, new BoxGeometry(0.42, 0.8, 0.012), 0xffc45a, [[0, 0.4, 0.158]]);
  box(0.7, 0.06, 0.26, 0x4a4f60, -0.6, G, -1.17, { delay: 0.2 });
  column(kit, -1.85, -0.45, G, 0.2, 2.5);
  column(kit, -1.95, 0.35, G, 0.25, 1.5, true);
  lamp(kit, 1.45, -0.95, G, 0.3, 2.3);
  puddle(kit, 1.15, 1.2, G, 0.4, 0.3, CYAN);

  // The bollard dead ahead.
  const post = cylinder(0.09, 0.11, 0.62, 0x2a2a36, 1.65, G, 1.4, { delay: 0.45 }, 12);
  decorate(post, new CylinderGeometry(0.1, 0.1, 0.08, 12), MAGENTA, [[0, 0.48, 0]]);
  ball(0.1, 0x2a2a36, 1.65, G + 0.56, 1.4, { delay: 0.48 });

  // His scooter, left behind: it rolls on alone, wobbling, its headlight still on.
  const SX = -1.0;
  const SZ = 0.95;
  const BODY = 0x1f7f9c;
  const scooter: Group[] = [];
  const s = (part: Group) => {
    scooter.push(part);
    return part;
  };
  const wheels = [-0.4, 0.42].map((dx) => {
    const wheel = s(add(new CylinderGeometry(0.15, 0.15, 0.09, 16).rotateX(Math.PI / 2), 0x23222b, SX + dx, G, SZ, { delay: 0.5 }));
    decorate(wheel, new BoxGeometry(0.22, 0.04, 0.1), 0x8a93a3, [[0, 0.15, 0]]);
    // Centred on its axle, so it spins in place.
    wheel.position.y += 0.15;
    wheel.children.forEach((child) => (child.position.y -= 0.15));
    return wheel;
  });
  s(box(0.8, 0.07, 0.26, BODY, SX, G + 0.13, SZ, { delay: 0.52 }));
  s(box(0.42, 0.3, 0.3, BODY, SX - 0.26, G + 0.17, SZ, { delay: 0.54 }));
  s(box(0.46, 0.07, 0.26, INK, SX - 0.26, G + 0.47, SZ, { delay: 0.56 }));
  s(limb(kit, [SX + 0.42, G + 0.15, SZ], [SX + 0.32, G + 0.92, SZ], 0.05, 0.04, BODY, { delay: 0.58 }));
  s(box(0.05, 0.05, 0.56, INK, SX + 0.32, G + 0.9, SZ, { delay: 0.6 }));
  s(box(0.08, 0.1, 0.14, YELLOW, SX + 0.4, G + 0.7, SZ, { delay: 0.62, flat: true }));
  s(box(0.32, 0.28, 0.32, MAGENTA, SX - 0.36, G + 0.54, SZ, { delay: 0.64 }));
  const ride = new Group();
  ride.position.set(SX, G, SZ);
  scooter[0].parent?.add(ride);
  scooter.forEach((part) => {
    part.position.sub(ride.position);
    ride.add(part);
  });

  // The customer in his dressing gown, waving the tip from the door.
  const customer = figure(kit, {
    x: -0.6,
    z: -1.0,
    y: G,
    facing: 0.55,
    height: 2.05,
    skin: 0xe0b48f,
    hair: { style: "bald", color: 0x6a5a50 },
    face: { mouth: "open", brows: "raised", beard: "moustache", beardColor: 0x5a4a40 },
    top: { kind: "robe", color: 0x8a3a6a, accent: 0xe8e2d0 },
    shoes: 0x5a6a9a,
    arms: ["wave", [0.35, 1.3, 0.4]],
    delay: 0.6,
  });
  const tip = customer.hands[1];
  box(0.2, 0.1, 0.02, 0x7ad6a0, tip[0], tip[1] - 0.02, tip[2] + 0.06, { delay: 1.3, rotation: [0, 0.55, 0.3] });

  // Volata at full tilt, the backpack bigger than his back.
  const facing = 0.75;
  const RX = 0.95;
  const RZ = 0.45;
  const H = 2.35;
  const u = H / 2.4;
  const rider = figure(kit, {
    x: RX,
    z: RZ,
    y: G,
    facing,
    height: H,
    build: "slim",
    skin: 0xc68a64,
    hair: { style: "curly", color: 0x17121a },
    face: { mouth: "grin", brows: "raised" },
    top: { kind: "jacket", color: 0xf07a18, accent: 0x1f5f6e },
    bottom: { kind: "trousers", color: 0x1f5f6e },
    shoes: 0xe8e4da,
    arms: ["back", [0.22, 1.72, 0.5]],
    legs: "stride",
    delay: 0.9,
  });
  // The jacket's reflective bands and the backpack straps (the torso is the figure's eighth part).
  const torso = rider.parts[7];
  [0.25, 0.5].forEach((h) =>
    decorate(torso, new TorusGeometry((0.25 + 0.05 * (h / 0.7)) * u * 1.04, 0.022, 4, 24).rotateX(Math.PI / 2).scale(1, 1, 0.74), SILVER, [[0, h * u, 0]]),
  );
  decorate(torso, new BoxGeometry(0.05, 0.6 * u, 0.02), 0x1c2a33, [
    [-0.14 * u, 0.36 * u, 0.21],
    [0.14 * u, 0.36 * u, 0.21],
  ]);
  const pack = box(0.56, 0.62, 0.4, ORANGE, ...rider.at(0, 1.12, -0.42), { delay: 1.5, rotation: [0, facing, 0] });
  decorate(pack, new BoxGeometry(0.57, 0.05, 0.41), SILVER, [[0, 0.44, 0]]);
  decorate(pack, new BoxGeometry(0.5, 0.02, 0.41), 0x8a3a0a, [[0, 0.56, 0]]);
  const pads = [
    rider.at(-0.17 * u, 0.62 * u - 0.09, 0.22 * u + 0.08),
    rider.at(0.17 * u, 0.59 * u - 0.09, -0.12 * u + 0.08),
  ].map((p, i) => ball(0.09, 0x1c1c24, ...p, { delay: 1.45 + i * 0.03 }));

  // Speed lines behind him, and receipts flying off the backpack.
  const back: Point = [-Math.sin(facing), 0, -Math.cos(facing)];
  const side: Point = [Math.cos(facing), 0, -Math.sin(facing)];
  [
    [1.0, 0.25, 0.7, MAGENTA],
    [1.5, -0.3, 0.9, CYAN],
    [2.0, 0.15, 0.6, MAGENTA],
    [0.5, -0.12, 0.8, CYAN],
  ].forEach(([y, off, length, color], i) => {
    const d = 0.75 + length / 2;
    box(length, 0.025, 0.025, color, RX + back[0] * d + side[0] * off, G + y, RZ + back[2] * d + side[2] * off, {
      delay: 1.6 + i * 0.04,
      flat: true,
      noInk: true,
      rotation: [0, facing - Math.PI / 2, 0],
    });
  });
  // The top of the backpack, once he leans into the run.
  const top = rider.at(0, 1.86, -0.13);
  const receipts = [0, 1, 2, 3].map((k) => box(0.13, 0.17, 0.006, PAPER, ...top, { delay: 1.65 + k * 0.05 }));

  // He leans into the run.
  const body = [...rider.parts, pack, ...pads];
  const lean = new Group();
  lean.position.set(RX, G, RZ);
  body[0].parent?.add(lean);
  body.forEach((part) => {
    part.position.sub(lean.position);
    lean.add(part);
  });
  lean.quaternion.setFromAxisAngle(new Vector3(Math.cos(facing), 0, -Math.sin(facing)), 0.2);
  const rest = body.map((part) => part.position.y);
  tick((t) => {
    const bounce = Math.abs(Math.sin(t * 7)) * 0.05;
    body.forEach((part, i) => (part.position.y = rest[i] + bounce));
    wheels.forEach((wheel) => (wheel.rotation.z = -t * 9));
    ride.rotation.x = 0.1 + Math.sin(t * 2.3) * 0.08;
    ride.position.x = SX + Math.sin(t * 0.9) * 0.06;
    receipts.forEach((sheet, k) => {
      const v = (t * 0.45 + k / 4) % 1;
      const sway = (k % 2 ? 1 : -1) * v * 0.45;
      sheet.position.set(top[0] + back[0] * v * 1.5 + side[0] * sway, top[1] + Math.sin(v * Math.PI) * 0.35 + k * 0.06, top[2] + back[2] * v * 1.5 + side[2] * sway);
      sheet.rotation.set(v * 6 + k, v * 4, v * 3);
    });
  });

  return { width: 4.9, height: 4.3, lookY: 1.4 };
}
