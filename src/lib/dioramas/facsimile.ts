import { BackSide, BoxGeometry, Color, CylinderGeometry, Material, Mesh, SphereGeometry, TorusGeometry } from "three";
import { CYAN, INK, MAGENTA, YELLOW, aim, colorOf, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, potted, table } from "@/lib/diorama-props";

/**
 * Facsimile (P098): late in the open-plan office of the Compagnia Lete, the grey engineer by
 * his desk has opened his left cheek like a little door, and tightens something round the green
 * glowing eye inside with a screwdriver, mug of coffee in the other hand. At the next desk his
 * colleague types on in headphones and never looks up; through the window the power plant's
 * cooling tower glows.
 */
export function facsimile(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const GREEN = 0x5aff7a;
  const SUIT = 0x5a6070;
  const SKIN = 0xd8b098;
  const DESK = 0x3a4050;
  const F = octagonBase(kit, 0x1f1d28);
  const G = floor(kit, F, 0.06, 0x2a3040, 0x222836, 0.5);

  // The window wall, and the plant outside it: a cooling tower and chimneys against the night.
  const glass = box(3.0, 2.5, 0.06, 0x101e30, 0, G, -1.65, { delay: 0.1, ink: 1.02 });
  decorate(glass, new CylinderGeometry(0.28, 0.42, 0.9, 4, 1).rotateY(Math.PI / 4).scale(1, 1, 0.03), 0x3a5878, [[0.6, 0.85, 0.04]]);
  decorate(glass, new BoxGeometry(0.42, 0.05, 0.01), CYAN, [[0.6, 1.28, 0.05]]);
  decorate(glass, new BoxGeometry(0.08, 0.9, 0.01), 0x3a5878, [
    [-0.2, 0.85, 0.04],
    [0.05, 0.75, 0.04],
  ]);
  decorate(glass, new BoxGeometry(0.06, 0.06, 0.01), MAGENTA, [
    [-0.2, 1.32, 0.045],
    [0.05, 1.22, 0.045],
  ]);
  decorate(glass, new SphereGeometry(0.15, 10, 8).scale(1.4, 1, 0.1), 0x3a4a60, [
    [0.65, 1.55, 0.045],
    [-0.1, 1.5, 0.045],
  ]);
  decorate(glass, new BoxGeometry(3.0, 0.3, 0.01), 0x16222e, [[0, 0.15, 0.04]]);
  [-1.5, -0.5, 0.5, 1.5].forEach((x, i) => box(0.08, 2.5, 0.12, 0x23222b, x, G, -1.62, { delay: 0.14 + i * 0.02 }));
  box(3.1, 0.1, 0.14, 0x23222b, 0, G + 2.5, -1.62, { delay: 0.2 });
  box(1.2, 0.05, 0.1, 0xbff4ff, 0.2, G + 2.7, -0.4, { delay: 0.25, flat: true });

  // His desk: a monitor, a lamp, papers and a plant.
  const desk = table(kit, 0.75, -0.75, G, 0.3, false, DESK);
  decorate(desk, new BoxGeometry(0.3, 0.02, 0.22), 0xe8e2d0, [
    [-0.25, 0.05, 0.15, 0.04],
    [-0.23, 0.07, 0.13],
  ]);
  const monitor = box(0.55, 0.36, 0.04, 0x23222b, 0.85, G + 0.95, -0.95, { delay: 0.4, rotation: [0, 0.2, 0] });
  const screen = decorate(monitor, new BoxGeometry(0.48, 0.29, 0.01), CYAN, [[0, 0.18, 0.025]]);
  box(0.05, 0.16, 0.05, 0x23222b, 0.85, G + 0.8, -0.97, { delay: 0.38 });
  cylinder(0.03, 0.03, 0.4, 0x23222b, 1.15, G + 0.8, -0.65, { delay: 0.42 }, 8);
  const shade = add(new CylinderGeometry(0.06, 0.12, 0.12, 12), 0x23222b, 1.1, G + 1.15, -0.6, { delay: 0.45, rotation: [0, 0, 0.5] });
  decorate(shade, new CylinderGeometry(0.11, 0.11, 0.01, 12), YELLOW, [[0, 0.0, 0]]);
  potted(kit, 0.35, -0.9, G + 0.8, 0.5);

  // The next desk, and the colleague typing at it in headphones, who notices nothing.
  table(kit, -1.15, -0.75, G, 0.3, false, DESK);
  const other = box(0.55, 0.36, 0.04, 0x23222b, -1.15, G + 0.95, -0.95, { delay: 0.4 });
  const otherScreen = decorate(other, new BoxGeometry(0.48, 0.29, 0.01), 0x2a7fc0, [[0, 0.18, 0.025]]);
  box(0.05, 0.16, 0.05, 0x23222b, -1.15, G + 0.8, -0.97, { delay: 0.38 });
  cylinder(0.24, 0.24, 0.06, 0x23222b, -1.15, G + 0.55, -0.05, { delay: 0.5 }, 14);
  cylinder(0.03, 0.03, 0.5, 0x4a4f5c, -1.15, G + 0.05, -0.05, { delay: 0.48 }, 8);
  box(0.42, 0.5, 0.06, 0x23222b, -1.15, G + 0.65, 0.2, { delay: 0.52 });
  cylinder(0.28, 0.28, 0.05, 0x4a4f5c, -1.15, G, -0.05, { delay: 0.46 }, 5);
  const colleague = figure(kit, {
    x: -1.15,
    z: -0.05,
    y: G,
    facing: Math.PI,
    height: 2.3,
    build: "normal",
    skin: 0xc48c68,
    hair: { style: "ponytail", color: 0x3a2418 },
    top: { kind: "shirt", color: 0x5a2a4a },
    bottom: { kind: "trousers", color: 0x2a2838 },
    arms: [[-0.2, 0.9, 0.5], [0.2, 0.9, 0.5]],
    legs: "sit",
    delay: 0.6,
  });
  const [cx, cy, cz] = colleague.head;
  add(new TorusGeometry(0.25, 0.03, 6, 18, Math.PI), INK, cx, cy, cz, { delay: 1.0 });
  [-1, 1].forEach((s) => add(new CylinderGeometry(0.07, 0.07, 0.05, 12).rotateZ(Math.PI / 2), CYAN, cx + s * 0.24, cy - 0.07, cz, { delay: 1.05 }));

  // Facsimile, the perfect engineer, in his grey suit and square glasses.
  const FACE = 0.3;
  const H = 2.35;
  const u = H / 2.4;
  const android = figure(kit, {
    x: 0.2,
    z: 0.35,
    y: G,
    facing: FACE,
    height: H,
    build: "normal",
    skin: SKIN,
    hair: { style: "short", color: 0x8a8a90 },
    face: { mouth: "neutral", brows: "calm", glasses: "square", glassesColor: INK },
    top: { kind: "suit", color: SUIT, accent: 0xd8dce4, tie: 0x23222b },
    bottom: { kind: "trousers", color: SUIT },
    shoes: 0x23222b,
    arms: [[-0.22, 1.42, 0.38], [0.42, 1.92, 0.36]],
    delay: 0.8,
  });
  decorate(android.parts[7], new BoxGeometry(0.08, 0.11, 0.01), CYAN, [[-0.17, 0.4, 0.27]]);
  // The open cheek: the circuits under the skin, the green eye, and the flap of skin swung open.
  const RH = 0.22 * u;
  const [hx, hy, hz] = android.head;
  const patch = (radius: number) => new SphereGeometry(radius, 12, 8, Math.PI / 2 + 0.05, Math.PI / 2 + 0.3, Math.PI * 0.3, Math.PI * 0.42);
  const circuitGeometry = patch(RH * 1.04);
  circuitGeometry.computeBoundingBox();
  const lift = circuitGeometry.boundingBox?.min.y ?? 0;
  const circuit = add(circuitGeometry, 0x14281e, hx, hy + lift, hz, { delay: 1.3, rotation: [0, FACE, 0] });
  decorate(circuit, new BoxGeometry(0.06, 0.008, 0.008), GREEN, [
    [0.12, -lift - 0.06, 0.19, 0.3],
    [0.17, -lift + 0.07, 0.14, -0.4],
    [0.215, -lift, 0.09, 1.2],
  ]);
  const eyeAt = android.at(0.08 * u, 2.14 * u + 0.03 * u, RH * 0.98);
  const eye = ball(0.04, GREEN, eyeAt[0], eyeAt[1] - 0.04, eyeAt[2], { delay: 1.4, flat: true });
  const r = RH * 1.06;
  // Hinged at its back edge, by the ear, so it swings out to the side like a little door.
  const hinge = android.at(0.94 * r, 2.14 * u, -0.34 * r);
  const flapGeometry = patch(r).translate(-0.94 * r, 0, 0.34 * r);
  flapGeometry.computeBoundingBox();
  const flapY = hy + (flapGeometry.boundingBox?.min.y ?? 0);
  // Skin outside, grey metal inside: the lining only shows from within.
  const flaps = [
    add(flapGeometry, SKIN, hinge[0], flapY, hinge[2], { delay: 1.45, noInk: true, rotation: [0, FACE + 1.3, 0] }),
    add(patch(r * 0.985).translate(-0.94 * r, 0, 0.34 * r), 0x8a93a3, hinge[0], flapY + 0.004, hinge[2], { delay: 1.45, noInk: true, rotation: [0, FACE + 1.3, 0] }),
  ];
  ((flaps[1].children[0] as Mesh).material as Material).side = BackSide;
  // The screwdriver, from his hand to the eye; the coffee mug in the other.
  const [mugHand, toolHand] = android.hands;
  const tip: Point = [eyeAt[0] + 0.02, eyeAt[1] - 0.02, eyeAt[2] + 0.02];
  const shaft = aim(toolHand, tip);
  add(new CylinderGeometry(0.035, 0.03, 0.14, 8), MAGENTA, ...toolHand, { delay: 1.5, rotation: shaft.rotation });
  add(new CylinderGeometry(0.008, 0.008, shaft.length, 6), 0xc8ccd4, ...toolHand, { delay: 1.52, rotation: shaft.rotation });
  const mug = cylinder(0.07, 0.065, 0.16, 0xe8e2d0, mugHand[0], mugHand[1] - 0.06, mugHand[2] + 0.04, { delay: 1.55 }, 12);
  decorate(mug, new CylinderGeometry(0.06, 0.06, 0.01, 12), 0x3a2418, [[0, 0.155, 0]]);
  add(new TorusGeometry(0.04, 0.012, 6, 12), 0xe8e2d0, mugHand[0] + 0.08, mugHand[1] + 0.01, mugHand[2] + 0.04, { delay: 1.57, rotation: [0, FACE, 0] });

  const glowFrom = new Color(GREEN);
  const glowTo = new Color(0xd8ffe0);
  tick((t) => {
    // The flap swings a little as he works; the eye flares; screens flicker.
    flaps.forEach((flap) => (flap.rotation.y = FACE + 1.3 + Math.sin(t * 1.3) * 0.12));
    colorOf(eye).lerpColors(glowFrom, glowTo, (Math.sin(t * 4) + 1) / 2);
    screen.color.set(Math.floor(t * 3) % 11 === 5 ? 0x9fe8ff : CYAN);
    otherScreen.color.set(Math.floor(t * 4) % 7 === 2 ? 0x5aa8e0 : 0x2a7fc0);
  });

  return { width: 4.9, height: 4.3, lookY: 1.5 };
}
