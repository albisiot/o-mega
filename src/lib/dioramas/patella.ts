import { BoxGeometry, Color, CylinderGeometry, ExtrudeGeometry, Group, Shape, SphereGeometry, TorusGeometry } from "three";
import { CYAN, MAGENTA, ORANGE, YELLOW, aim, cable, colorOf, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { ring } from "@/lib/diorama-props";

/**
 * Patella (P234): the eight-legged hull robot clinging to the side of a ship at anchor in the
 * harbour. Its rusty round body hangs on suction feet among the rivets, the big porthole eye
 * glowing, a welding arm sealing a seam in a spray of sparks while a leak below still spurts into
 * the water. It never speaks: one leg taps the plates, three knocks and a pause, all is well.
 */
export function patella(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const WATER = 0x0e3a4e;
  const FOAM = 0xcfeef7;
  const HULL = 0x2c3a5a;
  const SEAM = 0x1c2640;
  const RUST = 0x6e3a3a;
  const BODY = 0x8e3448;
  const LEG = 0x6a6480;
  const JOINT = 0xb03a6a;
  const BRASS = 0xb08d3c;
  const F = octagonBase(kit, WATER);

  // The hull of a ship at anchor: its side bulges towards us and rises out of the water.
  const H = 3.0;
  const front = (y: number) => -1.0 + 0.2 * Math.sin((Math.PI * y) / 3.2);
  const profile = new Shape();
  profile.moveTo(-1.7, 0);
  for (let k = 0; k <= 12; k++) profile.lineTo(front((k / 12) * H), (k / 12) * H);
  profile.lineTo(-1.7, H);
  profile.closePath();
  const hull = add(
    new ExtrudeGeometry(profile, { depth: 2.9, bevelEnabled: false, curveSegments: 4 }).rotateY(-Math.PI / 2).translate(1.4, 0, 0),
    HULL,
    0,
    F,
    0,
    { delay: 0.1, ink: 1.01 },
  );
  const onHull = (x: number, y: number, lift = 0.008): Point => [x, y, front(y) + lift];
  decorate(hull, new BoxGeometry(2.9, 0.3, 0.02), 0x3a1f30, [onHull(-0.05, 0.12, 0.004)]);
  decorate(hull, new BoxGeometry(2.9, 0.07, 0.02), MAGENTA, [onHull(-0.05, 0.32, 0.01)]);
  const seams = [0.85, 1.5, 2.15, 2.75];
  decorate(
    hull,
    new BoxGeometry(2.9, 0.022, 0.02),
    SEAM,
    seams.map((y) => onHull(-0.05, y)),
  );
  decorate(
    hull,
    new BoxGeometry(0.022, 0.66, 0.03),
    SEAM,
    [-0.85, 0.05, 0.95].flatMap((x) => [0.2, ...seams.slice(0, 3)].map((y) => onHull(x, y + 0.325))),
  );
  decorate(
    hull,
    new SphereGeometry(0.022, 6, 4),
    0x56648a,
    seams.flatMap((y) => Array.from({ length: 15 }, (_, k) => onHull(-1.4 + k * 0.19, y + 0.07, 0.012))),
  );
  decorate(
    hull,
    new BoxGeometry(0.05, 0.36, 0.01),
    RUST,
    [
      [-1.2, 0.62],
      [-0.3, 1.27],
      [0.85, 0.62],
      [1.15, 1.92],
      [-1.0, 2.52],
    ].map(([x, y]) => onHull(x, y, 0.012)),
  );
  box(2.9, 0.12, 0.16, 0x3a4868, -0.05, F + H, front(H) + 0.02, { delay: 0.2 });

  // The leak below, still spurting into the harbour.
  const leak = onHull(-0.95, 0.72, 0.014);
  decorate(hull, new CylinderGeometry(0.06, 0.06, 0.01, 12).rotateX(Math.PI / 2).scale(1.3, 1, 1), 0x0a0a12, [leak]);
  const jet = [0, 1, 2, 3, 4, 5].map((k) => ball(0.045 - k * 0.004, k % 2 ? FOAM : 0x9fe8ff, leak[0], F + leak[1], leak[2], { delay: 0.6, flat: true, noInk: true }));
  motes(8, FOAM, 0.025, [-1.15, F + 0.05, -0.75], [-0.75, F + 0.5, -0.35], 1.2);

  /** A ring spreading on the water, again and again. */
  const ripple = (x: number, z: number, radius: number, period: number, phase: number, delay: number) => {
    const wave = add(new TorusGeometry(radius, 0.018, 6, 36).rotateX(Math.PI / 2), FOAM, x, F + 0.002, z, { delay, flat: true, noInk: true });
    tick((t) => {
      const u = ((t + phase) / period) % 1;
      wave.children[0].scale.set(0.4 + u, 1, 0.4 + u);
      wave.children[0].visible = u < 0.85;
    });
  };
  ripple(-0.95, -0.45, 0.22, 1.4, 0, 0.7);
  ripple(-0.95, -0.45, 0.22, 1.4, 0.7, 0.7);
  ripple(0.6, -0.8, 0.35, 3, 1.2, 0.5);

  // A buoy rocking at the front.
  const buoy = [
    cylinder(0.16, 0.2, 0.3, MAGENTA, -1.35, F - 0.05, 0.95, { delay: 0.5 }, 12),
    cylinder(0.165, 0.165, 0.06, 0xe8e2d0, -1.35, F + 0.12, 0.95, { delay: 0.52, noInk: true }, 12),
    cylinder(0.03, 0.08, 0.3, 0x23222b, -1.35, F + 0.25, 0.95, { delay: 0.54 }, 8),
    ball(0.05, YELLOW, -1.35, F + 0.53, 0.95, { delay: 0.56, flat: true }),
  ];
  // Flotsam drifting by: two planks and a drum.
  buoy.push(
    box(0.6, 0.05, 0.14, 0x5e4a3a, 1.1, F - 0.01, 0.85, { delay: 0.58, rotation: [0, 0.5, 0] }),
    box(0.45, 0.05, 0.12, 0x4e3c30, 1.4, F - 0.01, 0.5, { delay: 0.6, rotation: [0, -0.4, 0] }),
    add(new CylinderGeometry(0.16, 0.16, 0.45, 12).rotateZ(Math.PI / 2), 0x2f6f86, 0.5, F - 0.08, 1.3, { delay: 0.62, rotation: [0, 0.7, 0] }),
  );
  const buoyRest = buoy.map((part) => part.position.y);

  // Patella: a round rusty body on the plates, its porthole eye turned to us.
  const C: Point = [0.25, F + 1.75, -0.4];
  const body = ball(0.4, BODY, C[0], C[1] - 0.4, C[2], { delay: 0.8 });
  decorate(body, new TorusGeometry(0.402, 0.014, 6, 30).rotateX(Math.PI / 2), 0x4a1a28, [[0, 0.4, 0]]);
  decorate(body, new TorusGeometry(0.402, 0.014, 6, 30).rotateY(Math.PI / 2), 0x4a1a28, [[0, 0.4, 0]]);
  decorate(
    body,
    new SphereGeometry(0.02, 6, 4),
    BRASS,
    [-0.9, -0.5, 0.5, 0.9, 1.3].map((a) => [Math.sin(a) * 0.36, 0.4 + 0.17, Math.cos(a) * 0.36] as Point),
  );
  decorate(body, new BoxGeometry(0.12, 0.08, 0.02), RUST, [
    [-0.22, 0.65, 0.24, 0.4],
    [0.28, 0.2, 0.22, -0.3],
  ]);
  cylinder(0.12, 0.14, 0.08, BRASS, C[0], C[1] + 0.37, C[2], { delay: 0.86 }, 12);
  box(0.02, 0.32, 0.02, 0x23222b, C[0] + 0.08, C[1] + 0.42, C[2], { delay: 0.9, noInk: true });
  ball(0.035, MAGENTA, C[0] + 0.08, C[1] + 0.72, C[2], { delay: 0.92, flat: true, noInk: true });
  const turn = 0.3;
  const eye: Point = [C[0] + Math.sin(turn) * 0.42, C[1] + 0.03, C[2] + Math.cos(turn) * 0.42];
  add(new TorusGeometry(0.2, 0.045, 8, 24), BRASS, eye[0], eye[1] - 0.245, eye[2], { delay: 0.95, rotation: [0, turn, 0] });
  const glass = add(new CylinderGeometry(0.19, 0.19, 0.03, 24).rotateX(Math.PI / 2), YELLOW, eye[0], eye[1] - 0.19, eye[2], { delay: 1.0, flat: true, rotation: [0, turn, 0] });
  decorate(glass, new TorusGeometry(0.11, 0.012, 6, 20), ORANGE, [[0, 0.19, 0.02]]);
  decorate(glass, new BoxGeometry(0.05, 0.03, 0.01), 0xffffff, [[-0.08, 0.28, 0.02, 0.5]]);
  cable(kit, [[C[0] - 0.12, C[1] - 0.3, C[2] + 0.1], [C[0] - 0.02, C[1] - 0.62, C[2] + 0.16], [C[0] + 0.14, C[1] - 0.32, C[2] + 0.1]], 0.02, 0x23222b, 1.05);
  cable(kit, [[C[0] + 0.02, C[1] - 0.34, C[2] + 0.12], [C[0] + 0.12, C[1] - 0.52, C[2] + 0.2], [C[0] + 0.24, C[1] - 0.28, C[2] + 0.08]], 0.016, BRASS, 1.08);

  // Eight legs, out and back to suction feet on the plates; the first one taps.
  const tapper = new Group();
  let tapFoot: Point = [0, 0, 0];
  for (let k = 0; k < 8; k++) {
    const a = Math.PI / 8 + (k * Math.PI) / 4;
    const hip: Point = [C[0] + Math.cos(a) * 0.3, C[1] + Math.sin(a) * 0.28, C[2] + 0.12];
    const knee: Point = [C[0] + Math.cos(a) * 0.68, C[1] + Math.sin(a) * 0.62, C[2] + 0.32];
    const footY = C[1] - F + Math.sin(a) * 0.98;
    const foot = onHull(C[0] + Math.cos(a) * 1.08, footY, 0.03);
    foot[1] += F;
    const delay = 1.1 + k * 0.04;
    limb(kit, hip, knee, 0.055, 0.05, LEG, { delay });
    ball(0.075, JOINT, knee[0], knee[1] - 0.075, knee[2], { delay: delay + 0.02 });
    const lower = [
      limb(kit, knee, foot, 0.045, 0.035, LEG, { delay: delay + 0.04 }),
      add(new CylinderGeometry(0.09, 0.12, 0.05, 14).rotateX(Math.PI / 2), 0x3a3448, foot[0], foot[1] - 0.12, foot[2] - 0.01, { delay: delay + 0.06 }),
    ];
    if (k === 0) {
      tapFoot = foot;
      tapper.position.set(...knee);
      lower[0].parent?.add(tapper);
      lower.forEach((part) => {
        part.position.sub(tapper.position);
        tapper.add(part);
      });
    }
  }
  const knock = ring(kit, [tapFoot[0], tapFoot[1] - 0.17, tapFoot[2] + 0.04], 0.15, CYAN, 1.5, true);

  // The welding arm on the seam above the leak, and its sparks.
  const weld = onHull(-0.55, 1.05, 0.02);
  weld[1] += F;
  const shoulder: Point = [C[0] - 0.22, C[1] - 0.26, C[2] + 0.18];
  const elbow: Point = [C[0] - 0.5, C[1] - 0.62, C[2] + 0.2];
  limb(kit, shoulder, elbow, 0.045, 0.04, BRASS, { delay: 1.2 });
  ball(0.06, JOINT, elbow[0], elbow[1] - 0.06, elbow[2], { delay: 1.22 });
  limb(kit, elbow, weld, 0.04, 0.012, BRASS, { delay: 1.24 });
  const sparks: Group[][] = [[], []];
  for (let k = 0; k < 12; k++) {
    const angle = k * 2.3;
    const length = 0.12 + ((k * 7) % 5) * 0.04;
    const end: Point = [weld[0] + Math.cos(angle) * length, weld[1] + Math.sin(angle) * length * 0.8 - 0.04, weld[2] + 0.08 + ((k * 3) % 4) * 0.03];
    const { length: reach, rotation } = aim(weld, end);
    sparks[k % 2].push(box(0.014, reach, 0.014, k % 3 ? ORANGE : YELLOW, ...weld, { delay: 1.4, flat: true, noInk: true, rotation }));
  }

  const glowFrom = new Color(YELLOW);
  const glowTo = new Color(0xffb020);
  tick((t) => {
    const flick = Math.floor(t * 13) % 2 === 0;
    sparks[0].forEach((spark) => (spark.visible = flick));
    sparks[1].forEach((spark) => (spark.visible = !flick));
    colorOf(glass).lerpColors(glowFrom, glowTo, (1 - Math.cos(t * 1.6)) / 2);
    // Three knocks and a pause.
    const p = t % 2.6;
    const lift = p < 1.05 ? Math.sin((p / 0.35) * Math.PI) ** 2 : 0;
    tapper.rotation.y = -0.4 * lift;
    const hit = p < 1.05 ? (p % 0.35) / 0.35 : 1;
    knock.children[0].scale.setScalar(0.5 + hit * 1.2);
    knock.visible = p < 1.2;
    jet.forEach((drop, k) => {
      const s = (t * 1.2 + k / 6) % 1;
      drop.position.set(leak[0] + s * 0.08, F + leak[1] - 0.045 + 0.2 * s - 0.9 * s * s, leak[2] + 0.75 * s);
    });
    buoy.forEach((part, i) => (part.position.y = buoyRest[i] + Math.sin(t * 2 + (i > 3 ? i : 0)) * 0.03));
  });

  return { width: 4.9, height: 4.4, lookY: 1.6 };
}
