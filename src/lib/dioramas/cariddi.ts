import { BoxGeometry, Color, ConeGeometry, CylinderGeometry, DodecahedronGeometry, DoubleSide, Group, LatheGeometry, Material, Mesh, SphereGeometry, TorusGeometry, Vector2, Vector3 } from "three";
import { CYAN, INK, MAGENTA, ORANGE, YELLOW, aim, colorOf, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";

/**
 * Cariddi (P092): the whirlpool with teeth that the Ora Zero made of the sea rises out of the
 * harbour, its maw tilted up at us and rings of fangs turning slowly round an orange glow deep in
 * the throat. A container ship slides in stern up, containers and stamped complaints spin down
 * the gullet, a gantry crane and a temple on its rock look on, and an aura of specks rises. It is
 * so slow and so dim that a gull dozes on one of its fangs.
 */
export function cariddi(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const SEA = 0x0d2b40;
  const FOAM = 0xcfeef7;
  const FANG = 0xe8e2d0;
  const STEEL = 0x2c3a52;
  const F = octagonBase(kit, SEA);

  // The maw: a group tilted up at the camera. Its mouth is the local XY plane; the throat runs down -z.
  const R = 1.15;
  const maw = new Group();
  const lip = add(new TorusGeometry(R, 0.17, 10, 44), 0x1f7f9c, 0, -(R + 0.17), 0, { delay: 0.2 });
  lip.parent?.add(maw);
  maw.position.set(-0.2, F + 0.92, -0.4);
  maw.rotation.order = "YXZ";
  maw.rotation.set(-0.78, 0.35, 0);
  maw.updateMatrix();
  const inMaw = (part: Group, into: Group = maw) => (into.add(part), part);
  inMaw(lip);
  decorate(lip, new BoxGeometry(0.16, 0.035, 0.02), FOAM, Array.from({ length: 14 }, (_, k) => {
    const a = (k / 14) * Math.PI * 2 + 0.2;
    return [Math.cos(a) * R, R + 0.17 + Math.sin(a) * R, 0.17, a + Math.PI / 2] as [number, number, number, number];
  }));
  /** A point of the maw's frame, in the frame of everything else. */
  const fromMaw = (x: number, y: number, z: number): Point => {
    const v = new Vector3(x, y, z).applyMatrix4(maw.matrix);
    return [v.x, v.y, v.z];
  };

  // The gullet: a funnel seen from inside, with spiral bands of magenta and cyan water.
  const profile = [
    [1.2, 0],
    [0.98, 0.24],
    [0.74, 0.52],
    [0.52, 0.8],
    [0.36, 1.08],
  ].map(([r, h]) => new Vector2(r, h));
  const twosided = (part: Group) => (((part.children[0] as Mesh).material as Material).side = DoubleSide);
  const funnel = inMaw(add(new LatheGeometry(profile, 36).rotateX(-Math.PI / 2), 0x123049, 0, -1.2, 0, { delay: 0.16, noInk: true }));
  twosided(funnel);
  const spin = new Group();
  maw.add(spin);
  for (let k = 0; k < 6; k++) {
    const band = new LatheGeometry(profile.map((p) => p.clone().multiplyScalar(0.97)), 6, (k / 6) * Math.PI * 2, 0.32);
    const position = band.getAttribute("position");
    for (let i = 0; i < position.count; i++) {
      // Twist each band with depth, so the stripes wind into the throat.
      const twist = position.getY(i) * 1.5;
      const x = position.getX(i);
      const z = position.getZ(i);
      position.setXYZ(i, x * Math.cos(twist) - z * Math.sin(twist), position.getY(i), x * Math.sin(twist) + z * Math.cos(twist));
    }
    band.computeVertexNormals();
    band.rotateX(-Math.PI / 2);
    band.computeBoundingBox();
    const part = inMaw(add(band, k % 2 ? 0x1f7f9c : 0x8a1e52, 0, band.boundingBox?.min.y ?? 0, 0, { delay: 0.22 + k * 0.02, noInk: true }), spin);
    twosided(part);
  }

  /** A ring of fangs round the throat, pointing in; returns them. */
  const fangs = (radius: number, depth: number, count: number, size: number, into: Group, delay: number) =>
    Array.from({ length: count }, (_, k) => {
      const a = (k / count) * Math.PI * 2 + Math.PI / 2;
      return inMaw(add(new ConeGeometry(size * 0.3, size, 6), FANG, Math.cos(a) * radius, Math.sin(a) * radius, depth, { delay: delay + k * 0.015, rotation: [0, 0, a + Math.PI / 2] }), into);
    });
  fangs(R - 0.06, 0.06, 16, 0.38, maw, 0.4);
  // Inner rings of water and fangs, turning.
  [
    [0.9, 0.08, -0.24, 0x8a1e52, 12, 0.28],
    [0.68, 0.07, -0.52, 0x1f7f9c, 10, 0.22],
    [0.47, 0.06, -0.8, 0x6a1a4a, 8, 0.16],
  ].forEach(([radius, tube, depth, color, count, size], i) => {
    inMaw(add(new TorusGeometry(radius, tube, 8, 36), color, 0, -(radius + tube), depth, { delay: 0.3 + i * 0.05 }), spin);
    fangs(radius - 0.02, depth, count, size, spin, 0.55 + i * 0.1);
  });
  // The glow at the bottom of the throat.
  inMaw(add(new CylinderGeometry(0.38, 0.38, 0.02, 24).rotateX(Math.PI / 2), 0x123049, 0, -0.38, -1.1, { delay: 0.28, noInk: true }));
  const core = inMaw(add(new CylinderGeometry(0.35, 0.35, 0.02, 24).rotateX(Math.PI / 2), ORANGE, 0, -0.35, -1.06, { delay: 0.3, flat: true, noInk: true }));
  inMaw(add(new CylinderGeometry(0.17, 0.17, 0.02, 20).rotateX(Math.PI / 2), YELLOW, 0, -0.17, -1.04, { delay: 0.34, flat: true, noInk: true }));
  // Its aura: a halo of light behind the lip.
  const halo = inMaw(add(new TorusGeometry(R + 0.32, 0.03, 6, 48), MAGENTA, 0, -(R + 0.35), -0.15, { delay: 1.2, flat: true, noInk: true }));
  motes(18, 0xff7ab0, 0.03, [-1.7, F + 0.2, -1.4], [1.3, F + 3.2, 0.5], 1.3);

  // What it swallows spins round the gullet: containers and complaints with a stamp on them.
  [
    [0.5, 0.32, -0.45, CYAN],
    [-0.42, 0.4, -0.65, MAGENTA],
    [-0.22, -0.42, -0.4, 0xcfc6b0],
  ].forEach(([x, y, z, color], i) => inMaw(box(0.26, 0.12, 0.12, color, x, y, z, { delay: 0.8 + i * 0.05, rotation: [i, i * 2 + 0.5, 0.6] }), spin));
  [0.4, 1.6, 2.7, 3.9, 5.1].forEach((a, i) => {
    const sheet = inMaw(box(0.15, 0.2, 0.006, 0xf4f0e6, Math.cos(a) * 0.62, Math.sin(a) * 0.62, -0.2 - i * 0.07, { delay: 0.9 + i * 0.04, rotation: [0.6, 0.4 * i, a] }), spin);
    decorate(sheet, new BoxGeometry(0.1, 0.01, 0.002), 0x8a93a3, [
      [0, 0.15, 0.004],
      [0, 0.12, 0.004],
      [0, 0.09, 0.004],
    ]);
    decorate(sheet, new CylinderGeometry(0.03, 0.03, 0.002, 10).rotateX(Math.PI / 2), MAGENTA, [[0.03, 0.04, 0.004]]);
  });

  // The ship, sliding into the maw stern up.
  const ship = new Group();
  maw.add(ship);
  ship.position.set(0.15, -0.78, 0.05);
  ship.rotation.set(0.15, -0.35, 0.45);
  const hull = inMaw(box(1.0, 0.2, 0.3, 0x3a1830, 0, 0, 0, { delay: 0.7 }), ship);
  decorate(hull, new BoxGeometry(1.0, 0.04, 0.005), MAGENTA, [[0, 0.15, 0.152]]);
  inMaw(add(new ConeGeometry(0.15, 0.24, 4).rotateZ(Math.PI / 2).rotateX(Math.PI / 4).scale(1, 0.95, 1.4), 0x3a1830, -0.6, 0, 0, { delay: 0.72 }), ship);
  for (let k = 0; k < 4; k++)
    for (let level = 0; level < 2; level++)
      inMaw(box(0.17, 0.11, 0.26, [MAGENTA, CYAN, 0xcfc6b0, 0x1f7f9c][(k + level) % 4], -0.38 + k * 0.18, 0.2 + level * 0.11, 0, { delay: 0.78 + k * 0.03 + level * 0.05, ink: 1.03 }), ship);
  const bridge = inMaw(box(0.16, 0.3, 0.28, 0xe0dacb, 0.4, 0.2, 0, { delay: 0.9 }), ship);
  decorate(bridge, new BoxGeometry(0.005, 0.05, 0.22), CYAN, [[-0.082, 0.24, 0]]);

  // Containers adrift on the water, drawn in.
  const adrift = [
    box(0.5, 0.24, 0.24, MAGENTA, 1.15, F - 0.06, 1.0, { delay: 0.95, rotation: [0.15, 0.7, 0.1] }),
    box(0.5, 0.24, 0.24, 0x1f7f9c, -1.55, F - 0.07, 0.55, { delay: 1.0, rotation: [-0.1, -0.4, 0.2] }),
  ];
  // The sea heaves up into it in a ring, foam swirling round and over the crest.
  const heave = [
    [1.85, 0],
    [1.55, 0.14],
    [1.3, 0.22],
    [1.18, 0.2],
  ].map(([r, h]) => new Vector2(r, h));
  add(new LatheGeometry(heave, 40), 0x175a7a, -0.2, F, -0.35, { delay: 0.12, ink: 1.01 });
  const swirls = [
    [1.28, 0.22, 2.4],
    [1.6, 0.11, 1.9],
    [1.95, 0, 1.6],
  ].map(([radius, y, arc], i) =>
    add(new TorusGeometry(radius, 0.025, 4, 40, arc).rotateX(Math.PI / 2), FOAM, -0.2, F + y, -0.35, { delay: 0.5 + i * 0.05, flat: true, noInk: true, rotation: [0, i * 2.1, 0] }),
  );

  // The quay on the right, with a luffing crane reaching over the water and a stack of containers.
  box(0.8, 0.3, 1.3, 0x3a3f4e, 1.75, F - 0.05, -0.35, { delay: 0.3, ink: 1.02 });
  const Q = F + 0.25;
  cylinder(0.22, 0.28, 0.25, STEEL, 1.85, Q, -0.7, { delay: 0.38 }, 10);
  box(0.12, 1.7, 0.12, STEEL, 1.85, Q + 0.25, -0.7, { delay: 0.42 });
  const cab = box(0.34, 0.28, 0.3, STEEL, 1.85, Q + 1.95, -0.7, { delay: 0.46 });
  decorate(cab, new BoxGeometry(0.2, 0.1, 0.01), CYAN, [[0, 0.18, 0.152]]);
  const tip: Point = [0.75, Q + 2.75, -0.25];
  const jib = aim([1.75, Q + 2.1, -0.66], tip);
  box(0.08, jib.length, 0.08, STEEL, 1.75, Q + 2.1, -0.66, { delay: 0.5, rotation: jib.rotation });
  box(0.012, 0.9, 0.012, INK, tip[0], tip[1] - 0.9, tip[2], { delay: 0.56, noInk: true });
  box(0.12, 0.1, 0.12, 0x23222b, tip[0], tip[1] - 1.0, tip[2], { delay: 0.58 });
  const beacon = box(0.08, 0.08, 0.08, MAGENTA, 1.85, Q + 2.23, -0.7, { delay: 0.6, flat: true, noInk: true });
  box(0.42, 0.22, 0.22, 0xcfc6b0, 1.75, Q, -0.05, { delay: 0.5 });
  box(0.42, 0.22, 0.22, 0x7a2f55, 1.73, Q + 0.22, -0.05, { delay: 0.54, rotation: [0, 0.1, 0] });

  // A temple on a rock at the left, as in the old harbour.
  const TX = -1.75;
  const TZ = -0.25;
  add(new DodecahedronGeometry(0.5).scale(0.9, 0.7, 0.9), 0x2a2838, TX, F - 0.1, TZ, { delay: 0.3 });
  const T = F + 0.52;
  box(0.62, 0.06, 0.42, 0x8a93a3, TX, T, TZ, { delay: 0.36, rotation: [0, 0.35, 0] });
  [-0.24, -0.08, 0.08, 0.24].forEach((dx, i) => cylinder(0.03, 0.03, 0.34, 0x8a93a3, TX + dx * 0.94 + 0.04, T + 0.06, TZ + 0.13 - dx * 0.34, { delay: 0.4 + i * 0.02 }, 8));
  add(new CylinderGeometry(0.34, 0.34, 0.42, 3).rotateX(-Math.PI / 2).scale(1.05, 0.45, 1), 0x8a93a3, TX, T + 0.4, TZ, { delay: 0.48, rotation: [0, 0.35, 0] });

  // The gull asleep on the top fang, and now and then looking round.
  const perch = fromMaw(0, R + 0.17, 0.02);
  const gull = add(new SphereGeometry(0.09, 12, 10).scale(1.5, 0.85, 0.85), 0xf2f0ea, perch[0], perch[1] - 0.02, perch[2], { delay: 1.6, rotation: [0, 0.35, 0] });
  box(0.22, 0.03, 0.18, 0x9aa0ab, perch[0] + 0.03, perch[1] + 0.08, perch[2], { delay: 1.65, rotation: [0, 0.35, -0.1] });
  const gullHead = ball(0.055, 0xf2f0ea, perch[0] - 0.12, perch[1] + 0.07, perch[2] + 0.04, { delay: 1.7, rotation: [0, 0.35, 0] });
  decorate(gullHead, new ConeGeometry(0.018, 0.07, 6).rotateZ(Math.PI / 2), YELLOW, [[-0.07, 0.05, 0]]);
  decorate(gullHead, new BoxGeometry(0.03, 0.006, 0.01), INK, [[-0.02, 0.07, 0.05]]);
  void gull;

  const coreFrom = new Color(ORANGE);
  const coreTo = new Color(YELLOW);
  const drift = adrift.map((part) => part.position.clone());
  tick((t) => {
    // It turns slowly, as it does everything.
    spin.rotation.z = -t * 0.3;
    swirls.forEach((swirl, i) => (swirl.rotation.y = i * 2.1 + t * (0.25 + i * 0.05)));
    ship.rotation.z = 0.45 + Math.sin(t * 1.1) * 0.04;
    ship.position.y = -0.78 - Math.sin(t * 0.55) * 0.03;
    adrift.forEach((part, i) => (part.position.y = drift[i].y + Math.sin(t * 1.6 + i * 2) * 0.03));
    colorOf(core).lerpColors(coreFrom, coreTo, (Math.sin(t * 2) + 1) / 3);
    halo.children[0].scale.setScalar(1 + Math.sin(t * 1.4) * 0.03);
    beacon.visible = Math.floor(t * 1.5) % 2 === 0;
    const look = Math.sin(t * 0.6);
    gullHead.rotation.y = 0.35 + (look > 0.7 ? 0.9 : 0);
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}
