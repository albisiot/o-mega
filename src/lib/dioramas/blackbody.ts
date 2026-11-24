import { BoxGeometry, Color, CylinderGeometry, Group, SphereGeometry, TorusGeometry } from "three";
import { CYAN, INK, MAGENTA, YELLOW, colorOf, limb, octagonBase, zigzag, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
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
 * Blackbody (P049): the Compagnia Lete's executive in the control room of the plant, the magenta
 * reactor glowing through the window behind him, straightening a cufflink while the core in his
 * chest pulses cyan and the light runs up his neck in veins. His price, no stealth at all: the
 * Geiger counter on the cabinet beside him is clicking wildly, its needle stuck at the end of
 * the dial, and the office plant on the other side has wilted.
 */
export function blackbody(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick } = kit;
  const PANEL = 0x2a3040;
  const F = octagonBase(kit, 0x1a1a24);
  const G = floor(kit, F, 0.06, 0x2a2c38, 0x1c1e28, 0.5);

  // The reactor hall beyond the window: a dark wall, the glowing column with its rings, a catwalk.
  box(2.9, 2.9, 0.1, 0x1a1430, 0, G, -1.75, { delay: 0.1 });
  const core = cylinder(0.32, 0.32, 2.3, MAGENTA, 0.1, G + 0.5, -1.44, { delay: 0.16, flat: true, noInk: true }, 18);
  decorate(core, new TorusGeometry(0.33, 0.03, 6, 24).rotateX(Math.PI / 2), 0x7a1e5a, [[0, 0.5, 0], [0, 1.1, 0], [0, 1.7, 0]]);
  box(2.8, 0.05, 0.05, 0x3a2a5a, 0, G + 1.55, -1.45, { delay: 0.2, noInk: true });

  // The window frame and the console below it, with screens and buttons.
  const console = box(2.9, 0.8, 0.45, PANEL, 0, G, -1.2, { delay: 0.24 });
  decorate(console, new BoxGeometry(0.4, 0.24, 0.01), CYAN, [[-1.0, 0.45, 0.226], [-0.4, 0.45, 0.226], [0.6, 0.45, 0.226]]);
  decorate(console, new BoxGeometry(0.06, 0.06, 0.01), MAGENTA, [[0.1, 0.5, 0.226], [0.2, 0.5, 0.226], [1.1, 0.4, 0.226]]);
  decorate(console, new BoxGeometry(0.06, 0.06, 0.01), YELLOW, [[0.15, 0.36, 0.226], [1.2, 0.5, 0.226]]);
  box(2.9, 0.25, 0.2, PANEL, 0, G + 2.55, -1.28, { delay: 0.28 });
  [-1.4, -0.47, 0.47, 1.4].forEach((x, i) => box(0.1, 1.75, 0.16, PANEL, x, G + 0.8, -1.28, { delay: 0.3 + i * 0.02 }));
  // Hazard stripes on the floor along the console.
  const stripe = box(2.6, 0.01, 0.14, YELLOW, 0, G, -0.88, { delay: 0.34, flat: true, noInk: true });
  decorate(
    stripe,
    new BoxGeometry(0.08, 0.012, 0.2),
    INK,
    Array.from({ length: 13 }, (_, k) => [-1.2 + k * 0.2, 0.002, 0, 0] as [number, number, number, number]),
  );

  // The Geiger counter on a cabinet, needle at the end of its dial, a probe on its cord.
  box(0.5, 0.85, 0.42, 0x3a4050, 1.45, G, 0.25, { delay: 0.4 });
  const geiger = box(0.38, 0.24, 0.26, YELLOW, 1.42, G + 0.85, 0.25, { delay: 0.45, rotation: [0, -0.35, 0] });
  decorate(geiger, new CylinderGeometry(0.075, 0.075, 0.01, 18).rotateX(Math.PI / 2), 0xf4f0e6, [[-0.07, 0.12, 0.131]]);
  decorate(geiger, new BoxGeometry(0.06, 0.03, 0.01), INK, [[0.1, 0.16, 0.131], [0.1, 0.08, 0.131]]);
  box(0.26, 0.04, 0.04, 0x2a2a34, 1.42, G + 1.13, 0.25, { delay: 0.47, rotation: [0, -0.35, 0] });
  // The dial's centre, in front of its face: the counter is turned by -0.35.
  const dialAt: Point = [1.42 - 0.07 * Math.cos(0.35) - 0.143 * Math.sin(0.35), G + 0.97, 0.25 - 0.07 * Math.sin(0.35) + 0.143 * Math.cos(0.35)];
  const needle = box(0.012, 0.07, 0.006, MAGENTA, ...dialAt, { delay: 0.5, flat: true, noInk: true, rotation: [0, -0.35, -1.2] });
  limb(kit, [1.2, G + 0.9, 0.42], [1.12, G + 0.55, 0.52], 0.03, 0.03, 0x2a2a34, { delay: 0.5 });
  cylinder(0.05, 0.035, 0.22, 0x4a4f5c, 1.12, G + 0.33, 0.52, { delay: 0.52 });
  // The clicks: little jagged marks around it.
  const clicks = [
    [[1.75, G + 1.2, 0.2], [1.85, G + 1.3, 0.22], [1.8, G + 1.38, 0.2]],
    [[1.62, G + 1.3, 0.15], [1.66, G + 1.45, 0.17], [1.6, G + 1.55, 0.15]],
    [[1.85, G + 1.0, 0.3], [1.98, G + 1.05, 0.32], [2.02, G + 1.15, 0.3]],
  ].map((points, k) => zigzag(kit, points as Point[], 0.018, k === 1 ? YELLOW : 0xf4f0e6, 0.6 + k * 0.03));

  // The office plant, wilted: stems bowed over the rim of the pot, leaves hanging.
  cylinder(0.16, 0.12, 0.28, 0xb0603a, -1.4, G, 0.4, { delay: 0.4 }, 10);
  [
    [-1, 0.25],
    [1, -0.2],
    [0.2, 1],
    [-0.4, -1],
  ].forEach(([dx, dz], i) => {
    const bend: Point = [-1.4 + dx * 0.12, G + 0.66 - i * 0.04, 0.4 + dz * 0.12];
    const tip: Point = [-1.4 + dx * 0.36, G + 0.4, 0.4 + dz * 0.36];
    limb(kit, [-1.4, G + 0.26, 0.4], bend, 0.022, 0.02, 0x6a7a3a, { delay: 0.45 + i * 0.03 });
    limb(kit, bend, tip, 0.02, 0.014, 0x6a7a3a, { delay: 0.5 + i * 0.03 });
    add(new SphereGeometry(0.1, 10, 8).scale(0.5, 1, 0.22), i % 2 ? 0x8a7a3a : 0x7a6a34, tip[0], tip[1] - 0.2, tip[2], { delay: 0.55 + i * 0.03, rotation: [0, Math.atan2(dx, dz) + Math.PI / 2, 0] });
  });
  box(0.12, 0.01, 0.06, 0x8a7a3a, -1.0, G, 0.75, { delay: 0.6, noInk: true, rotation: [0, 0.6, 0] });

  // Blackbody: broad, slick, in a dark suit, the core shining through his shirt.
  const D = 0.75;
  const u = 2.55 / 2.4;
  const exec = figure(kit, {
    x: 0.05,
    z: 0.25,
    y: G,
    facing: 0.3,
    height: 2.55,
    build: "broad",
    skin: 0xc8a090,
    hair: { style: "short", color: 0x2a2630 },
    face: { mouth: "smirk", brows: "calm", marks: CYAN },
    top: { kind: "suit", color: 0x2a3448, accent: 0xe8e4da },
    bottom: { kind: "trousers", color: 0x232c3e },
    shoes: 0x14121c,
    arms: [[0.12, 1.22, 0.46], [-0.04, 1.3, 0.5]],
    delay: D,
  });
  hairCap(kit, exec, 0x2a2630, 0.3, D + 0.38, 0.75);
  const front = 0.45 * u * 0.72;
  // The suit's accent paints both shirt and tie: a dark tie, knotted above the core.
  box(0.06, 0.2, 0.02, INK, ...exec.at(0, 1.62 * u, front + 0.02), { delay: D + 0.4, rotation: [0, 0.3, 0], noInk: true });
  // The core: a lit disc with a ring, and veins of light up his neck.
  const heart = add(new CylinderGeometry(0.11, 0.11, 0.03, 20).rotateX(Math.PI / 2), CYAN, ...exec.at(0, 1.38 * u, front + 0.03), { delay: D + 0.5, flat: true, rotation: [0, 0.3, 0] });
  const halo = add(new TorusGeometry(0.17, 0.018, 6, 28), 0x9ff0ff, ...exec.at(0, 1.38 * u - 0.06, front + 0.05), { delay: D + 0.55, flat: true, noInk: true, rotation: [0, 0.3, 0] });
  const veins = [-1, 1].map((side) =>
    zigzag(
      kit,
      [exec.at(side * 0.05, 1.52 * u, front + 0.02), exec.at(side * 0.1, 1.66 * u, front * 0.8), exec.at(side * 0.06, 1.8 * u, 0.12), exec.at(side * 0.09, 1.93 * u, 0.11)],
      0.022,
      CYAN,
      D + 0.6,
    ),
  );
  // White cuffs and a yellow cufflink where his hands meet.
  const [cuffHand] = exec.hands;
  cylinder(0.07, 0.07, 0.08, 0xe8e4da, cuffHand[0] - 0.08, cuffHand[1] - 0.06, cuffHand[2] - 0.05, { delay: D + 0.5, rotation: [0, 0, 1.2] });
  box(0.04, 0.04, 0.03, YELLOW, cuffHand[0] - 0.1, cuffHand[1] + 0.02, cuffHand[2], { delay: D + 0.55, flat: true });

  const coreFrom = new Color(CYAN);
  const coreTo = new Color(0xffffff);
  const reactorFrom = new Color(MAGENTA);
  const reactorTo = new Color(0xff7aa8);
  const haloMesh = halo.children[0];
  tick((t) => {
    const beat = (Math.sin(t * 3) + 1) / 2;
    colorOf(heart).lerpColors(coreFrom, coreTo, beat);
    haloMesh.scale.setScalar(1 + beat * 0.15);
    haloMesh.position.y = 0.188 - 0.188 * (1 + beat * 0.15);
    colorOf(core).lerpColors(reactorFrom, reactorTo, (Math.sin(t * 1.1) + 1) / 2);
    veins.forEach((vein, k) => vein.forEach((piece, i) => (piece.visible = (Math.floor(t * 8) + i + k * 2) % 6 !== 0)));
    // The counter goes mad: the needle shakes at the end of the dial, the clicks flash.
    needle.rotation.z = -1.2 + Math.sin(t * 37) * 0.08;
    clicks.forEach((click, k) => click.forEach((piece) => (piece.visible = (Math.floor(t * 9) + k) % 3 !== 1)));
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}
