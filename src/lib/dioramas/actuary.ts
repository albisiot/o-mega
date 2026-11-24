import { BoxGeometry, CylinderGeometry, Group, SphereGeometry, TorusGeometry } from "three";
import { CYAN, INK, MAGENTA, YELLOW, cable, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure, type Figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

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
 * Actuary (P047): the Banco's analyst in front of the great round vault, holding up a hand over
 * which charts float and orbit (bars, a pie, a line, a globe). Sealed envelopes fly out of an
 * open filing drawer into the charts: for the Banco there are no secrets, only items in a
 * balance sheet. Her price, no energy of her own: the projector in her palm runs on a long yellow
 * extension cord plugged into the wall.
 */
export function actuary(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick } = kit;
  const STEEL = 0x5a6a80;
  const F = octagonBase(kit, 0x1a1c28);
  const G = floor(kit, F, 0.06, 0x2c3040, 0x1e2230, 0.5);

  // The vault wall and its round door: frame, bolts, hinges, and the wheel.
  box(3.2, 2.9, 0.25, 0x262a3a, 0, G, -1.5, { delay: 0.1, ink: 1.02 });
  const VX = 0.45;
  const VY = G + 1.3;
  add(new TorusGeometry(0.98, 0.12, 8, 36), STEEL, VX, VY - 1.1, -1.36, { delay: 0.2 });
  const disc = add(new CylinderGeometry(0.9, 0.9, 0.16, 36).rotateX(Math.PI / 2), 0x4a5870, VX, VY - 0.9, -1.32, { delay: 0.24 });
  decorate(
    disc,
    new CylinderGeometry(0.04, 0.04, 0.03, 10).rotateX(Math.PI / 2),
    0x8a9ab0,
    Array.from({ length: 14 }, (_, k) => {
      const a = (k / 14) * Math.PI * 2;
      return [Math.sin(a) * 0.78, 0.9 + Math.cos(a) * 0.78, 0.085] as Point;
    }),
  );
  decorate(disc, new TorusGeometry(0.55, 0.025, 6, 30), 0x3a4658, [[0, 0.9, 0.085]]);
  [-0.45, 0.45].forEach((dy, i) => box(0.22, 0.24, 0.22, 0x3a4658, VX + 0.98, VY + dy - 0.12, -1.3, { delay: 0.28 + i * 0.03 }));
  const WHEEL = 0.335;
  const wheel = add(new TorusGeometry(0.3, 0.035, 6, 24), 0x9aa8bc, VX, VY - WHEEL, -1.2, { delay: 0.32 });
  decorate(wheel, new BoxGeometry(0.6, 0.04, 0.04), 0x9aa8bc, [[0, WHEEL, 0, 0], [0, WHEEL, 0, Math.PI / 3], [0, WHEEL, 0, -Math.PI / 3]]);
  decorate(wheel, new CylinderGeometry(0.07, 0.07, 0.06, 12).rotateX(Math.PI / 2), 0x6a7890, [[0, WHEEL, 0.02]]);

  // The wall socket, and the filing cabinet with its top drawer pulled out.
  const socket = box(0.16, 0.16, 0.04, 0xe8e4da, -1.2, G + 0.3, -1.36, { delay: 0.3 });
  decorate(socket, new BoxGeometry(0.02, 0.05, 0.01), INK, [[-0.03, 0.08, 0.021], [0.03, 0.08, 0.021]]);
  const cabinet = box(0.55, 1.05, 0.5, 0x3a4256, 1.45, G, 0.1, { delay: 0.35 });
  decorate(cabinet, new BoxGeometry(0.42, 0.26, 0.01), 0x4a5470, [[0, 0.2, 0.255], [0, 0.52, 0.255]]);
  decorate(cabinet, new BoxGeometry(0.12, 0.03, 0.03), 0x8a93a3, [[0, 0.24, 0.27], [0, 0.56, 0.27]]);
  const drawer = box(0.46, 0.24, 0.36, 0x4a5470, 1.45, G + 0.76, 0.45, { delay: 0.4 });
  decorate(drawer, new BoxGeometry(0.03, 0.2, 0.28), 0xe8dcc0, [[-0.12, 0.2, 0], [-0.04, 0.21, 0], [0.04, 0.2, 0], [0.12, 0.19, 0]]);

  // Actuary: black bob, glasses, pinstripe suit, a hand raised to her charts.
  const D = 0.7;
  const HAIR = 0x12101a;
  const analyst = figure(kit, {
    x: -0.55,
    z: 0.3,
    y: G,
    facing: 0.45,
    height: 2.35,
    build: "slim",
    skin: 0xe6c4b0,
    hair: { style: "bald", color: HAIR },
    face: { mouth: "smirk", brows: "calm", glasses: "square", glassesColor: 0x9aa4b4 },
    top: { kind: "suit", color: 0x2a3048, accent: 0x14121c },
    bottom: { kind: "trousers", color: 0x2a3048 },
    shoes: 0x14121c,
    arms: ["down", [0.68, 1.5, 0.3]],
    delay: D,
  });
  hairCap(kit, analyst, HAIR, 0.45, D + 0.38);
  // Her bob, open at the front (the figure's own bob is open at the side and hides the face).
  const R = analyst.headRadius;
  add(new CylinderGeometry(R * 1.04, R * 1.16, R * 1.3, 18, 1, true, 0.95, Math.PI * 2 - 1.9), HAIR, analyst.head[0], analyst.head[1] - R * 0.95, analyst.head[2], { delay: D + 0.37, rotation: [0, 0.45, 0] });
  const [, palm] = analyst.hands;
  // The projector in her palm, and the cord that feeds it.
  cylinder(0.08, 0.08, 0.03, 0x1a1a22, palm[0], palm[1] + 0.06, palm[2], { delay: D + 0.5 });
  cylinder(0.065, 0.065, 0.01, CYAN, palm[0], palm[1] + 0.09, palm[2], { delay: D + 0.52, flat: true, noInk: true });
  cable(
    kit,
    [
      [palm[0] - 0.02, palm[1] - 0.06, palm[2] - 0.04],
      [palm[0] + 0.12, G + 0.9, palm[2] - 0.2],
      [-0.25, G + 0.03, -0.35],
      [-0.9, G + 0.03, -0.95],
      [-1.2, G + 0.38, -1.32],
    ],
    0.02,
    YELLOW,
    D + 0.6,
  );

  // The charts: four screens orbiting over her hand, always turned to us.
  const C: Point = [palm[0] + 0.12, palm[1] + 0.5, palm[2]];
  const SCREEN = 0x3a1e6a;
  const screen = (delay: number) => {
    const part = box(0.32, 0.22, 0.012, SCREEN, 0, 0, 0, { delay, flat: true, noInk: true, rotation: [0, 0.35, 0] });
    decorate(part, new BoxGeometry(0.35, 0.25, 0.006), MAGENTA, [[0, 0.11, -0.006]]);
    return part;
  };
  const bars = screen(D + 0.7);
  decorate(bars, new BoxGeometry(0.05, 0.06, 0.01), CYAN, [[-0.08, 0.06, 0.01]]);
  decorate(bars, new BoxGeometry(0.05, 0.1, 0.01), CYAN, [[0, 0.08, 0.01]]);
  decorate(bars, new BoxGeometry(0.05, 0.15, 0.01), MAGENTA, [[0.08, 0.105, 0.01]]);
  const pie = screen(D + 0.74);
  decorate(pie, new CylinderGeometry(0.08, 0.08, 0.01, 20, 1, false, 0, 4.2).rotateX(Math.PI / 2), CYAN, [[0, 0.11, 0.01]]);
  decorate(pie, new CylinderGeometry(0.08, 0.08, 0.01, 20, 1, false, 4.3, 1.9).rotateX(Math.PI / 2), MAGENTA, [[0.01, 0.115, 0.01]]);
  const line = screen(D + 0.78);
  decorate(line, new BoxGeometry(0.1, 0.014, 0.01), CYAN, [[-0.08, 0.07, 0.01, 0.6], [0, 0.1, 0.01, -0.4], [0.08, 0.13, 0.01, 0.8]]);
  const globe = screen(D + 0.82);
  decorate(globe, new TorusGeometry(0.075, 0.008, 6, 20), CYAN, [[0, 0.11, 0.01]]);
  decorate(globe, new TorusGeometry(0.075, 0.008, 6, 20).scale(0.4, 1, 1), CYAN, [[0, 0.11, 0.012]]);
  decorate(globe, new BoxGeometry(0.15, 0.008, 0.01), CYAN, [[0, 0.11, 0.012]]);
  const screens = [bars, pie, line, globe];
  const orbit = add(new TorusGeometry(0.36, 0.012, 6, 40).rotateX(Math.PI / 2), MAGENTA, C[0], C[1], C[2], { delay: D + 0.66, flat: true, noInk: true, rotation: [0.25, 0, 0.1] });

  // Secrets on their way to becoming figures: sealed envelopes out of the drawer.
  const envelopes = [0, 1, 2].map((k) => {
    const part = box(0.17, 0.11, 0.012, 0xe8dcc0, 0, 0, 0, { delay: D + 0.9 + k * 0.05 });
    decorate(part, new BoxGeometry(0.1, 0.008, 0.004), 0xa89c80, [[-0.04, 0.08, 0.008, -0.5], [0.04, 0.08, 0.008, 0.5]]);
    decorate(part, new CylinderGeometry(0.022, 0.022, 0.01, 12).rotateX(Math.PI / 2), MAGENTA, [[0, 0.055, 0.01]]);
    return part;
  });
  const from: Point = [1.45, G + 1.05, 0.45];

  tick((t) => {
    screens.forEach((part, k) => {
      const a = t * 0.5 + (k * Math.PI) / 2;
      part.position.set(C[0] + Math.cos(a) * 0.34, C[1] + 0.02 * k + Math.sin(a * 2) * 0.04, C[2] + Math.sin(a) * 0.22);
    });
    orbit.rotation.y = t * 0.6;
    envelopes.forEach((part, k) => {
      const p = (t * 0.14 + k / 3) % 1;
      part.position.set(from[0] + (C[0] - from[0]) * p, from[1] + (C[1] - from[1]) * p + Math.sin(p * Math.PI) * 0.6, from[2] + (C[2] - from[2]) * p);
      part.rotation.set(0, t * 2 + k, Math.sin(t * 3 + k) * 0.3);
      part.visible = p < 0.9;
    });
    // The wheel turns about its hub (a part turns about its foot, so the foot circles the hub).
    const spin = t * 0.4;
    wheel.rotation.z = spin;
    wheel.position.set(VX + WHEEL * Math.sin(spin), VY - WHEEL * Math.cos(spin), -1.2);
  });

  return { width: 4.9, height: 4.4, lookY: 1.45 };
}
