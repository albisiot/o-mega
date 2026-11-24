import { BoxGeometry, CylinderGeometry, Group, SphereGeometry, TorusGeometry } from "three";
import { INK, MAGENTA, octagonBase, type Framing, type Kit } from "@/lib/diorama-kit";
import { figure, type Figure } from "@/lib/diorama-figure";
import { facade, floor, potted, railing, steps, wallLantern } from "@/lib/diorama-props";

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
 * Gavel (P041): the Compagnia Lete's collector at the foot of a tenement's steps at night,
 * bruised and unbothered, a chain wrapped round one fist, holding out the bill to a dustbin: the
 * debtor is hiding inside and peeks out under the lid. He can hardly see through his cracked
 * glasses, but the bill is pointed exactly at the bin; a planter he walked into lies tipped over.
 */
export function gavel(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const SUIT = 0x1e3a4a;
  const F = octagonBase(kit, 0x1c1c26);
  const G = floor(kit, F, 0.06, 0x2a2a36, 0x1c1c26, 0.42);

  // The tenement: a house front, three steps up to a door under a lantern, a railing.
  facade(kit, 0, -1.5, G, 0.1, { width: 3.2, height: 2.9, color: 0x2a3048, windows: 4, floors: 3, lit: MAGENTA, shutters: 0x1f3a46 });
  steps(kit, 0.55, -0.55, G, 0.2, { width: 0.9, count: 3, color: 0x4a4f62 });
  const door = box(0.62, 1.05, 0.04, 0x3a2340, 0.55, G + 0.48, -1.34, { delay: 0.3 });
  decorate(door, new BoxGeometry(0.2, 0.28, 0.01), 0x1a1424, [[0, 0.72, 0.025]]);
  decorate(door, new SphereGeometry(0.035, 8, 6), 0xc0a060, [[0.22, 0.5, 0.03]]);
  box(0.74, 0.06, 0.08, 0x4a4f62, 0.55, G + 1.53, -1.33, { delay: 0.32 });
  wallLantern(kit, 0.55, -1.36, G + 1.95, 0.4);
  railing(kit, [1.02, -0.55], [1.02, -1.3], G + 0.48, 0.35, 0.5);
  railing(kit, [1.02, -0.2], [1.02, -0.55], G, 0.35, 0.95);

  // What he walked into on the way: a planter, tipped over, soil spilled.
  const pot = potted(kit, -1.3, 0.75, G, 0.45);
  pot[0].rotation.z = 1.35;
  pot[0].position.y = G + 0.12;
  pot[1].position.set(-1.62, G, 0.78);
  box(0.4, 0.03, 0.25, 0x3a2a22, -1.75, G, 0.8, { delay: 0.5, noInk: true, rotation: [0, 0.4, 0] });

  // The dustbin, with the debtor inside: eyes and fingers under a lifted lid.
  const BX = 1.15;
  const BZ = 0.6;
  const bin = cylinder(0.26, 0.23, 0.62, 0x2f6f60, BX, G, BZ, { delay: 0.5 }, 16);
  decorate(bin, new TorusGeometry(0.25, 0.015, 6, 20).rotateX(Math.PI / 2), 0x1f4f44, [[0, 0.2, 0], [0, 0.45, 0]]);
  cylinder(0.24, 0.24, 0.01, 0x0a0a10, BX, G + 0.62, BZ, { delay: 0.55, flat: true, noInk: true }, 16);
  const eyes = [-1, 1].map((side) => {
    const eye = ball(0.04, 0xf4f0e6, BX + side * 0.06, G + 0.6, BZ + 0.14, { delay: 0.6, flat: true, noInk: true });
    decorate(eye, new SphereGeometry(0.018, 8, 6), INK, [[-side * 0.008, 0.045, 0.03]]);
    return eye;
  });
  const fingers = [-0.12, -0.04, 0.04].map((dx, i) => ball(0.03, 0xd8a888, BX + dx, G + 0.6, BZ + 0.22, { delay: 0.62 + i * 0.02 }));
  const lid = cylinder(0.29, 0.29, 0.05, 0x3a7f70, BX, G + 0.66, BZ - 0.06, { delay: 0.58, rotation: [-0.5, 0, 0] }, 16);
  decorate(lid, new CylinderGeometry(0.06, 0.06, 0.04, 10), 0x1f4f44, [[0, 0.07, 0]]);

  // Gavel: heavy, bruised, cracked glasses; the bill held out at arm's length.
  const D = 0.8;
  const collector = figure(kit, {
    x: -0.4,
    z: 0.1,
    y: G,
    facing: 1.25,
    height: 2.45,
    build: "heavy",
    skin: 0xd8a088,
    hair: { style: "short", color: 0x3a3436 },
    face: { mouth: "frown", brows: "calm", glasses: "round", glassesColor: 0x9aa4b4, marks: 0x6a3a7a },
    top: { kind: "suit", color: SUIT, accent: 0xe8e4da },
    bottom: { kind: "trousers", color: 0x1a2e3a },
    shoes: 0x1a1a20,
    arms: [[-0.2, 1.48, 0.85], [0.5, 0.95, 0.12]],
    delay: D,
  });
  hairCap(kit, collector, 0x3a3436, 1.25, D + 0.38, 0.75);
  const u = 2.45 / 2.4;
  // The suit's accent paints both shirt and tie: a dark tie goes over the white one.
  box(0.07, 0.42, 0.02, INK, ...collector.at(0, 1.3 * u, 0.32 * u), { delay: D + 0.4, rotation: [0, 1.25, 0], noInk: true });
  // Cracks across the lenses, bruises and a plaster on the brow.
  const RH = 0.23 * u;
  const cy = RH * 1.06;
  const fz = RH * 0.9;
  decorate(collector.headPart, new BoxGeometry(0.008, 0.09, 0.006), 0xf4f0e6, [
    [-0.09 * u, cy + 0.03 * u, fz + 0.035, 0.6],
    [-0.07 * u, cy + 0.04 * u, fz + 0.035, -0.5],
    [0.08 * u, cy + 0.02 * u, fz + 0.035, 1.1],
  ]);
  decorate(collector.headPart, new BoxGeometry(0.1, 0.035, 0.02), 0xe8d0a8, [[0.06, cy + 0.14 * u, fz - 0.03, 0.4]]);
  const [billHand, chainHand] = collector.hands;

  // The bill: a blank sheet, pointed straight at the bin.
  const bill = box(0.26, 0.34, 0.012, 0xe8dcc0, billHand[0] + 0.04, billHand[1] - 0.05, billHand[2] + 0.04, { delay: D + 0.5, rotation: [-0.15, 1.25, 0.12] });
  decorate(bill, new BoxGeometry(0.16, 0.012, 0.004), 0x8a8070, [[0, 0.22, 0.008], [0, 0.18, 0.008], [0, 0.14, 0.008]]);
  decorate(bill, new BoxGeometry(0.08, 0.02, 0.004), MAGENTA, [[0.05, 0.06, 0.008]]);

  // The chain: round the fist, then hanging and swaying.
  [0, 1].forEach((k) => add(new TorusGeometry(0.1, 0.022, 6, 16).rotateX(Math.PI / 2), 0x8a93a3, chainHand[0], chainHand[1] - 0.06 - k * 0.07, chainHand[2], { delay: D + 0.5 + k * 0.03, rotation: [0.3, 0, k * 0.4] }));
  const LINKS = 7;
  const links: Group[] = Array.from({ length: LINKS }, (_, k) =>
    add(new TorusGeometry(0.045, 0.014, 6, 12).scale(1, 1.5, 1), 0x8a93a3, chainHand[0], chainHand[1] - 0.2 - k * 0.1, chainHand[2], {
      delay: D + 0.56 + k * 0.02,
      rotation: [0, k % 2 ? Math.PI / 2 : 0, 0],
    }),
  );
  const [cx, cy0, cz] = chainHand;

  const rest = collector.parts.map((part) => part.position.y);
  tick((t) => {
    // The debtor peeks: the lid lifts, the eyes show, then it drops again.
    const peek = Math.sin(t * 0.9);
    const open = peek > -0.3;
    lid.rotation.x = open ? -0.5 : -0.06;
    lid.position.y = G + (open ? 0.66 : 0.62);
    eyes.forEach((eye) => (eye.visible = open && Math.floor(t * 3) % 7 !== 3));
    fingers.forEach((finger) => (finger.visible = open));
    // The chain swings from the fist, each link a little further.
    const swing = Math.sin(t * 1.6) * 0.12;
    links.forEach((link, k) => {
      const r = 0.2 + k * 0.1;
      link.position.set(cx + Math.sin(swing) * r, cy0 - Math.cos(swing) * r, cz);
      link.rotation.z = swing;
    });
    bill.rotation.z = 0.12 + Math.sin(t * 4) * 0.03;
    // He breathes, heavily.
    const breath = Math.sin(t * 1.2) * 0.012;
    collector.parts.forEach((part, i) => (part.position.y = rest[i] + breath));
  });

  return { width: 4.9, height: 4.4, lookY: 1.4 };
}
