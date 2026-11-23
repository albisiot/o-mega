import {
  BoxGeometry,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Shape,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  YELLOW,
  CYAN,
  MAGENTA,
  INK,
  colorOf,
  octagonBase,
  aim,
  limb,
  zigzag,
  jag,
  cable,
  type Point,
  type PartOptions,
  type Kit,
  type Framing,
} from "@/lib/diorama-kit";

/** Whether a spot of the street is far enough inside the octagon for a cobble. */
function onBase(x: number, z: number): boolean {
  return Math.abs(x) <= 2.15 && Math.abs(z) <= 2.15 && Math.abs(x) + Math.abs(z) <= 3.05;
}

/**
 * Postmark (P042): the courier of the Sciolti delivers anything in ten minutes, and nobody asks
 * what. He pulls a wheelie off the top of a flight of steps in the old town, on his souped-up
 * electric bike, its wiring bare and sparking, the courier box on his back humming and glowing
 * through its lid. He grins at us instead of watching the road; the price is behind him: he
 * forgot to unplug, and the charging cable, still stuck in the street lamp, is tearing the
 * socket off in a shower of sparks while the lamp flickers.
 */
export function postmark(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const SLAB = 0x221f2c;
  const COBBLE = 0x48445a;
  const COBBLE_LIGHT = 0x57526b;
  const STEP = 0x67637d;
  const STEP_LIGHT = 0x7d7896;
  const IRON = 0x24272f;
  const FOUNTAIN = 0x2a5a5c;
  const DRAIN = 0x15141b;
  const STEEL = 0x8a93a6;
  const SPOKES = 0xc4cad6;
  const RUBBER = 0x18171e;
  const FRAME = 0x2a6f80;
  const FRAME_DARK = 0x1d4f5c;
  const SEAT = 0x1a1820;
  const CRATE = 0x2c8aa0;
  const CRATE_DARK = 0x216a7c;
  const HOODIE = 0x27434f;
  const HOODIE_DARK = 0x1b3039;
  const JEANS = 0x2b3148;
  const SHOE = 0xd8d4c8;
  const SKIN = 0xd9a682;
  const SKIN_DARK = 0xb3825f;
  const HAIR = 0x1c1a26;
  const HELMET = 0x2f7f95;
  const TEETH = 0xf6f3ea;
  const SPARK = 0xfff4c2;

  const F = octagonBase(kit, SLAB);

  // The street: a raised stretch on the left, two stone steps down, the lower street on the right.
  const RISE = 0.13;
  const T = F + RISE * 3;
  const EDGE = -0.15;
  const TREAD = 0.22;
  const terrace = new Shape();
  terrace.moveTo(EDGE, -2.25);
  terrace.lineTo(-0.95, -2.25);
  terrace.lineTo(-2.25, -0.95);
  terrace.lineTo(-2.25, 0.95);
  terrace.lineTo(-0.95, 2.25);
  terrace.lineTo(EDGE, 2.25);
  terrace.closePath();
  const TX = -1.2;
  add(new ExtrudeGeometry(terrace, { depth: T - F, bevelEnabled: false }).rotateX(-Math.PI / 2).translate(-TX, 0, 0), STEP, TX, F, 0, {
    delay: 0.1,
    ink: 1.015,
  });
  [1, 2].forEach((n, i) => {
    const x = EDGE + TREAD * (n - 0.5);
    box(TREAD, RISE * (3 - n), 4.5, STEP, x, F, 0, { delay: 0.14 + i * 0.04, ink: 1.01 });
    box(0.05, 0.02, 4.5, STEP_LIGHT, x + TREAD / 2 - 0.025, F + RISE * (3 - n), 0, { delay: 0.2 + i * 0.04, noInk: true });
  });
  box(0.05, 0.02, 4.5, STEP_LIGHT, EDGE - 0.025, T, 0, { delay: 0.18, noInk: true });

  // Cobbles on both levels, laid in staggered rows: two tones, each merged into one shape.
  const stones: BufferGeometry[][] = [[], []];
  const lay = (from: number, to: number, y: number) => {
    const size = 0.16;
    for (let row = 0, z = -2.2; z < 2.2; z += size, row++) {
      for (let x = from + size / 2 + (row % 2) * (size / 2); x < to - size / 2; x += size) {
        if (!onBase(x, z)) continue;
        const noise = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
        const r = noise - Math.floor(noise);
        stones[r > 0.55 ? 1 : 0].push(
          new BoxGeometry(0.125 + r * 0.02, 0.035, 0.12 + (1 - r) * 0.02).rotateY((r - 0.5) * 0.3).translate(x, y + 0.0175, z),
        );
      }
    }
  };
  lay(-2.25, EDGE, T);
  lay(EDGE + TREAD * 2, 2.25, F);
  stones.forEach((list, i) => {
    const geometry = mergeGeometries(list);
    list.forEach((stone) => stone.dispose());
    if (geometry) add(geometry, i ? COBBLE_LIGHT : COBBLE, 0, F, 0, { delay: 0.22 + i * 0.04, noInk: true });
  });

  // The old iron street lamp on the upper street, its lantern on a curled arm.
  const LX = -1.85;
  const LZ = -0.35;
  cylinder(0.12, 0.15, 0.16, IRON, LX, T + 0.035, LZ, { delay: 0.3 }, 10);
  cylinder(0.045, 0.06, 2.05, IRON, LX, T + 0.19, LZ, { delay: 0.34 }, 10);
  cylinder(0.08, 0.08, 0.06, IRON, LX, T + 1.3, LZ, { delay: 0.38 }, 10);
  add(new TorusGeometry(0.22, 0.03, 6, 14, Math.PI / 2).rotateZ(Math.PI / 2), IRON, LX + 0.22, T + 2.02, LZ, { delay: 0.42 });
  const LAMP: Point = [LX + 0.24, T + 1.86, LZ];
  box(0.012, 0.08, 0.012, INK, LAMP[0], LAMP[1] + 0.3, LAMP[2], { delay: 0.44, noInk: true });
  add(new ConeGeometry(0.17, 0.12, 4).rotateY(Math.PI / 4), IRON, LAMP[0], LAMP[1] + 0.22, LAMP[2], { delay: 0.46 });
  const lantern = add(new CylinderGeometry(0.12, 0.08, 0.24, 4).rotateY(Math.PI / 4), YELLOW, ...LAMP, { delay: 0.48, flat: true });
  cylinder(0.04, 0.06, 0.05, IRON, LAMP[0], LAMP[1] - 0.04, LAMP[2], { delay: 0.5 }, 8);

  // Its charging socket low on the post, being torn off by the cable he forgot to unplug.
  const socket = box(0.16, 0.22, 0.13, STEEL, LX + 0.1, T + 0.42, LZ + 0.02, { delay: 0.52, rotation: [0.2, 0, -0.4] });
  decorate(socket, new BoxGeometry(0.07, 0.09, 0.01), INK, [[0, 0.11, 0.066]]);
  box(0.13, 0.2, 0.015, STEEL, LX + 0.02, T + 0.34, LZ + 0.13, { delay: 0.54, rotation: [0, -1.2, 0.25] });
  const PLUG: Point = [LX + 0.22, T + 0.5, LZ + 0.06];
  box(0.12, 0.08, 0.08, INK, PLUG[0] - 0.06, PLUG[1] - 0.04, PLUG[2], { delay: 0.56, noInk: true, rotation: [0, 0, -0.25] });
  const socketSparks = [0, 1, 2, 3].map((i) => {
    const angle = 0.5 + i * 1.55;
    const to: Point = [PLUG[0] - 0.04 + Math.cos(angle) * 0.26, PLUG[1] + Math.sin(angle) * 0.24, PLUG[2] + 0.1];
    return zigzag(kit, jag([PLUG[0] - 0.04, PLUG[1], PLUG[2] + 0.04], to, 3, 0.035, i), 0.026, i % 2 ? YELLOW : SPARK, 1.7 + i * 0.02);
  });

  // The drinking fountain on the lower street: an iron post, its spout running into a drain.
  const NX = 1.62;
  const NZ = 0.7;
  cylinder(0.19, 0.21, 0.06, STEP, NX, F + 0.035, NZ, { delay: 0.6 }, 12);
  cylinder(0.12, 0.14, 0.6, FOUNTAIN, NX, F + 0.095, NZ, { delay: 0.64 }, 12);
  add(new SphereGeometry(0.125, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), FOUNTAIN, NX, F + 0.695, NZ, { delay: 0.68 });
  ball(0.04, FOUNTAIN, NX, F + 0.8, NZ, { delay: 0.7 });
  add(new CylinderGeometry(0.03, 0.03, 0.2, 8).rotateZ(Math.PI / 2), STEEL, NX - 0.2, F + 0.5, NZ, { delay: 0.72 });
  const DRAIN_X = NX - 0.42;
  box(0.26, 0.02, 0.26, DRAIN, DRAIN_X, F + 0.035, NZ, { delay: 0.74, noInk: true });
  [-0.07, 0, 0.07].forEach((dz, i) => box(0.2, 0.025, 0.02, IRON, DRAIN_X, F + 0.035, NZ + dz, { delay: 0.76 + i * 0.02, noInk: true }));
  const waterPath = (u: number): Point => [NX - 0.3 - u * 0.12, F + 0.5 - u * u * 0.44, NZ];
  for (let n = 0; n < 6; n++) {
    const from = waterPath(n / 6);
    const { length, rotation } = aim(from, waterPath((n + 1) / 6));
    box(0.03, length, 0.03, CYAN, ...from, { delay: 0.8 + n * 0.02, flat: true, noInk: true, rotation });
  }
  const drops = [0, 1, 2].map((i) => ball(0.025, 0xbff1ff, ...waterPath(0), { delay: 0.9 + i * 0.03, flat: true, noInk: true }));

  // The bike, rearing up on its back wheel at the edge of the top step. Its parts are placed in
  // the bike's own frame, in units scaled by S: x forward, y up, z to the rider's right, from
  // where the back wheel touches the cobbles.
  const S = 1.15;
  const PITCH = 0.3;
  const cos = Math.cos(PITCH);
  const sin = Math.sin(PITCH);
  const BX = EDGE - 0.17;
  const BY = T + 0.035;
  const BZ = 0.12;
  const W = (x: number, y: number, z: number): Point => [BX + S * (x * cos - y * sin), BY + S * (x * sin + y * cos), BZ + S * z];
  /** A part of the bike or its rider centred at a point of the bike, turned `own` round the axles' line. */
  const onBike = (geometry: BufferGeometry, color: number, at: Point, own: number, options: PartOptions): Group => {
    geometry.scale(S, S, S).computeBoundingBox();
    const low = (geometry.boundingBox?.min.y ?? 0) / S;
    return add(geometry, color, ...W(at[0] - low * Math.sin(own), at[1] + low * Math.cos(own), at[2]), {
      ...options,
      rotation: [0, 0, PITCH + own],
    });
  };
  /** Details stuck to a part made with onBike, in the bike's units. */
  const mark = (part: Group, geometry: BufferGeometry, color: number, spots: Point[]) =>
    decorate(part, geometry.scale(S, S, S), color, spots.map(([x, y, z]) => [x * S, y * S, z * S] as Point));
  /** A bar of the bike from one point of it to another. */
  const bar = (from: Point, to: Point, width: number, color: number, delay: number) => {
    const a = W(...from);
    const { length, rotation } = aim(a, W(...to));
    return box(width * S, length, width * S, color, ...a, { delay, rotation });
  };
  const D = 0.85;
  const R = 0.3;
  const HUB = 0.15;
  const AXLE = [0, 1.15];
  const spokes = AXLE.map((x, i) => {
    onBike(new TorusGeometry(R - 0.075, 0.075, 8, 28), RUBBER, [x, R, 0], 0, { delay: D + i * 0.04 });
    onBike(new TorusGeometry(HUB, 0.022, 6, 24), CYAN, [x, R, 0], 0, { delay: D + 0.04 + i * 0.04, flat: true, noInk: true });
    onBike(new CylinderGeometry(0.045, 0.045, 0.22, 10).rotateX(Math.PI / 2), STEEL, [x, R, 0], 0, { delay: D + 0.06 + i * 0.04 });
    return onBike(new CylinderGeometry(HUB, HUB, 0.05, 3).rotateX(Math.PI / 2), SPOKES, [x, R, 0], 0, { delay: D + 0.08 + i * 0.04, noInk: true });
  });
  // Frame, battery, seat and tail.
  bar([0, R, 0.07], [0.42, 0.5, 0.07], 0.06, FRAME_DARK, D + 0.1);
  bar([0, R, -0.07], [0.42, 0.5, -0.07], 0.06, FRAME_DARK, D + 0.1);
  const battery = onBike(new BoxGeometry(0.6, 0.32, 0.26), FRAME, [0.6, 0.56, 0], 0, { delay: D + 0.14 });
  mark(battery, new BoxGeometry(0.46, 0.035, 0.01), CYAN, [
    [0, 0.12, 0.131],
    [0, 0.2, 0.131],
  ]);
  mark(battery, new BoxGeometry(0.08, 0.1, 0.01), YELLOW, [[0.2, 0.17, 0.132]]);
  onBike(new BoxGeometry(0.3, 0.18, 0.24), FRAME_DARK, [0.86, 0.8, 0], 0.5, { delay: D + 0.18 });
  onBike(new BoxGeometry(0.52, 0.09, 0.22), SEAT, [0.3, 0.77, 0], 0, { delay: D + 0.2 });
  onBike(new BoxGeometry(0.42, 0.06, 0.18), FRAME, [-0.04, 0.74, 0], 0.15, { delay: D + 0.22 });
  onBike(new BoxGeometry(0.05, 0.05, 0.12), MAGENTA, [-0.25, 0.71, 0], 0, { delay: D + 0.26, flat: true });
  // Fork, headlight, handlebar and the front mudguard.
  bar([1.15, R, 0.09], [0.96, 1.02, 0.09], 0.045, STEEL, D + 0.2);
  bar([1.15, R, -0.09], [0.96, 1.02, -0.09], 0.045, STEEL, D + 0.2);
  const head = onBike(new BoxGeometry(0.16, 0.2, 0.24), FRAME_DARK, [1.0, 0.98, 0], 0.25, { delay: D + 0.24 });
  mark(head, new BoxGeometry(0.02, 0.1, 0.18), YELLOW, [[0.085, 0.1, 0]]);
  onBike(new CylinderGeometry(0.025, 0.025, 0.66, 8).rotateX(Math.PI / 2), STEEL, [0.92, 1.12, 0], 0, { delay: D + 0.26 });
  [-0.29, 0.29].forEach((z, i) =>
    onBike(new CylinderGeometry(0.035, 0.035, 0.12, 8).rotateX(Math.PI / 2), RUBBER, [0.92, 1.12, z], 0, { delay: D + 0.28 + i * 0.02 }),
  );
  onBike(new TorusGeometry(0.34, 0.03, 4, 14, Math.PI * 0.6).rotateZ(Math.PI * 0.25), FRAME, [1.15, R, 0], 0, { delay: D + 0.3 });
  [-0.17, 0.17].forEach((z, i) => onBike(new BoxGeometry(0.1, 0.03, 0.06), STEEL, [0.5, 0.4, z], 0, { delay: D + 0.3 + i * 0.02 }));
  // The headlight's beam.
  const beam = W(1.1, 1.08, 0);
  [-0.18, 0, 0.18].forEach((spread, i) => {
    const to: Point = [beam[0] + 0.6, beam[1] + 0.08 + spread, beam[2] + spread * 0.5];
    const { length, rotation } = aim(beam, to);
    box(0.022, length, 0.022, YELLOW, ...beam, { delay: D + 0.6 + i * 0.03, flat: true, noInk: true, rotation });
  });
  // Bare wires looping from the battery to the handlebar, and sparks where they are taped up.
  cable(kit, [W(0.45, 0.72, 0.1), W(0.6, 1.0, 0.16), W(0.86, 1.08, 0.12)], 0.018, CYAN, D + 0.32);
  cable(kit, [W(0.55, 0.72, 0.12), W(0.75, 0.95, 0.2), W(0.9, 1.1, 0.16)], 0.018, MAGENTA, D + 0.34);
  cable(kit, [W(0.7, 0.72, 0.11), W(0.78, 0.86, 0.18), W(0.95, 1.0, 0.13)], 0.018, YELLOW, D + 0.36);
  const knot = W(0.75, 0.95, 0.2);
  const wireSparks = [0, 1, 2].map((i) => {
    const angle = i * 2.1 + 0.4;
    const to: Point = [knot[0] + Math.cos(angle) * 0.16, knot[1] + Math.sin(angle) * 0.16, knot[2] + 0.06];
    return zigzag(kit, jag(knot, to, 3, 0.02, i + 4), 0.02, i === 1 ? YELLOW : SPARK, 1.75 + i * 0.02);
  });

  // The charging cable, pulled taut from the bike's tail to the lamp's socket.
  const port = W(-0.26, 0.72, -0.04);
  box(0.06, 0.06, 0.06, INK, port[0], port[1] - 0.03, port[2], { delay: 0.9, noInk: true });
  cable(kit, [port, [(port[0] + PLUG[0]) / 2, (port[1] + PLUG[1]) / 2 - 0.03, (port[2] + PLUG[2]) / 2], PLUG], 0.024, INK, 0.92);

  // Postmark, astride, leaning on the bars, his head turned to grin at us.
  const P = 1.1;
  [-1, 1].forEach((side, i) => {
    const hip = W(0.3, 0.9, side * 0.12);
    const knee = W(0.7, 0.86, side * 0.2);
    const ankle = W(0.53, 0.5, side * 0.2);
    limb(kit, hip, knee, 0.11 * S, 0.095 * S, JEANS, { delay: P + i * 0.03 });
    ball(0.095 * S, JEANS, knee[0], knee[1] - 0.095 * S, knee[2], { delay: P + 0.04 + i * 0.03 });
    limb(kit, knee, ankle, 0.085 * S, 0.075 * S, JEANS, { delay: P + 0.06 + i * 0.03 });
    onBike(new BoxGeometry(0.26, 0.11, 0.12), SHOE, [0.56, 0.45, side * 0.2], 0, { delay: P + 0.08 + i * 0.03 });
  });
  const pelvis = W(0.3, 0.9, 0);
  ball(0.19 * S, JEANS, pelvis[0], pelvis[1] - 0.19 * S, pelvis[2], { delay: P + 0.1 });
  const waist = W(0.32, 0.88, 0);
  const neck = W(0.6, 1.5, 0);
  const torso = aim(waist, neck);
  add(new CylinderGeometry(0.27 * S, 0.22 * S, torso.length, 14).scale(0.72, 1, 1), HOODIE, ...waist, { delay: P + 0.14, rotation: torso.rotation });
  [-1, 1].forEach((side, i) => {
    const shoulder = W(0.58, 1.42, side * 0.26);
    const elbow = W(0.66, 1.17, side * 0.34);
    const hand = W(0.92, 1.12, side * 0.29);
    ball(0.12 * S, HOODIE, shoulder[0], shoulder[1] - 0.12 * S, shoulder[2], { delay: P + 0.2 + i * 0.02 });
    limb(kit, shoulder, elbow, 0.09 * S, 0.08 * S, HOODIE, { delay: P + 0.24 + i * 0.02 });
    ball(0.08 * S, HOODIE_DARK, elbow[0], elbow[1] - 0.08 * S, elbow[2], { delay: P + 0.26 + i * 0.02 });
    limb(kit, elbow, hand, 0.08 * S, 0.07 * S, HOODIE, { delay: P + 0.28 + i * 0.02 });
    ball(0.07 * S, SKIN, hand[0], hand[1] - 0.07 * S, hand[2], { delay: P + 0.32 + i * 0.02 });
  });
  const hood = W(0.47, 1.5, 0);
  ball(0.14 * S, HOODIE_DARK, hood[0], hood[1] - 0.14 * S, hood[2], { delay: P + 0.3 });
  // Yellow straps over his shoulders.
  [-1, 1].forEach((side, i) => {
    const from = W(0.7, 1.4, side * 0.17);
    const to = W(0.53, 0.93, side * 0.2);
    const { length, rotation } = aim(from, to);
    box(0.06 * S, length, 0.05 * S, YELLOW, ...from, { delay: P + 0.4 + i * 0.02, rotation, ink: 1.1 });
  });

  // The courier box on his back, its lid lifted on a magenta glow, humming.
  const LEAN = -Math.atan2(neck[0] - waist[0], neck[1] - waist[1]) - PITCH;
  const back = new Vector3(-Math.cos(LEAN), -Math.sin(LEAN), 0);
  const along = new Vector3(-Math.sin(LEAN), Math.cos(LEAN), 0);
  const CRATE_H = 0.56;
  const CRATE_D = 0.4;
  const crateAt = new Vector3(0.42, 1.12, 0).addScaledVector(back, 0.17 + CRATE_D / 2);
  const spot = (v: Vector3): Point => [v.x, v.y, v.z];
  const crate = onBike(new BoxGeometry(CRATE_D, CRATE_H, 0.52), CRATE, spot(crateAt), LEAN, { delay: P + 0.36 });
  mark(crate, new BoxGeometry(CRATE_D + 0.01, 0.05, 0.53), YELLOW, [
    [0, 0.14, 0],
    [0, 0.34, 0],
  ]);
  mark(crate, new BoxGeometry(0.01, 0.4, 0.05), YELLOW, [[-CRATE_D / 2 - 0.005, 0.28, 0]]);
  const hinge = crateAt.clone().addScaledVector(along, CRATE_H / 2).addScaledVector(back, CRATE_D / 2);
  const OPEN = 0.35;
  const lidDirection = new Vector3(Math.cos(LEAN + OPEN), Math.sin(LEAN + OPEN), 0);
  const lidUp = new Vector3(-Math.sin(LEAN + OPEN), Math.cos(LEAN + OPEN), 0);
  const lidAt = hinge.clone().addScaledVector(lidDirection, CRATE_D / 2 + 0.01).addScaledVector(lidUp, 0.025);
  const lid = onBike(new BoxGeometry(CRATE_D + 0.02, 0.05, 0.54), CRATE_DARK, spot(lidAt), LEAN + OPEN, { delay: P + 0.42 });
  const glowAt = crateAt.clone().addScaledVector(along, CRATE_H / 2 + 0.005);
  const glow = onBike(new BoxGeometry(CRATE_D - 0.03, 0.03, 0.48), MAGENTA, spot(glowAt), LEAN, { delay: P + 0.44, flat: true, noInk: true });
  // Rays of the glow, out of the gap.
  const rays = [-0.16, 0, 0.16].map((z, i) => {
    const from = glowAt.clone().addScaledVector(back, -0.08);
    const to = from.clone().addScaledVector(along, 0.36).addScaledVector(back, 0.14 - i * 0.12);
    const a = W(from.x, from.y, z);
    const { length, rotation } = aim(a, W(to.x, to.y, z * 1.4));
    return box(0.035, length, 0.035, MAGENTA, ...a, { delay: P + 0.5 + i * 0.03, flat: true, noInk: true, rotation });
  });
  // Rings of its hum, spreading round it.
  const hum = [0, 1].map((i) =>
    onBike(new TorusGeometry(0.42, 0.014, 4, 32).rotateX(Math.PI / 2), MAGENTA, spot(crateAt.clone().addScaledVector(along, 0.05 - i * 0.1)), LEAN, {
      delay: P + 0.55 + i * 0.04,
      flat: true,
      noInk: true,
    }),
  );
  const humming = [crate, lid, glow, ...rays];
  const humRest = humming.map((part) => part.position.clone());

  // His head, turned to us: a round helmet scribbled in yellow, glowing eyes, a gap-toothed grin.
  cylinder(0.075 * S, 0.085 * S, 0.16 * S, SKIN, ...W(0.6, 1.48, 0), { delay: P + 0.36 });
  const HEAD = 0.21 * S;
  const TALL = 1.06;
  const centre = W(0.66, 1.72, 0.03);
  const look = 0.25;
  const skull = add(new SphereGeometry(HEAD, 18, 14).scale(1, TALL, 1), SKIN, centre[0], centre[1] - HEAD * TALL, centre[2], {
    delay: P + 0.4,
    rotation: [0, look, 0],
  });
  /** A spot on the face, from its centre in the bike's units: across (to his left), up, a little out, leaning. */
  const face = (x: number, y: number, out: number, lean = 0): [number, number, number, number] => {
    const [sx, sy] = [x * S, y * S];
    return [sx, HEAD * TALL + sy, Math.sqrt(Math.max(0, HEAD * HEAD - sx * sx - (sy / TALL) ** 2)) + out, lean];
  };
  const feature = (w: number, h: number, d: number) => new BoxGeometry(w * S, h * S, d * S);
  decorate(skull, feature(0.065, 0.05, 0.02), CYAN, [face(-0.075, 0.02, 0.004), face(0.075, 0.02, 0.004)]);
  decorate(skull, feature(0.025, 0.03, 0.02), INK, [face(-0.07, 0.015, 0.009), face(0.08, 0.015, 0.009)]);
  decorate(skull, feature(0.075, 0.022, 0.02), INK, [face(-0.08, 0.075, 0.002, 0.25), face(0.08, 0.075, 0.002, -0.25)]);
  decorate(skull, feature(0.05, 0.07, 0.05), SKIN_DARK, [face(0, -0.025, -0.012)]);
  // The grin wraps round the face: a dark mouth, a row of teeth with a gap in it.
  const grin = (radius: number, height: number, wide: number) => new CylinderGeometry(radius, radius, height * S, 12, 1, true, -wide / 2, wide);
  decorate(skull, grin(HEAD + 0.004, 0.085, 1.3), INK, [[0, HEAD * TALL - 0.09 * S, 0]]);
  decorate(skull, grin(HEAD + 0.008, 0.045, 1.05), TEETH, [[0, HEAD * TALL - 0.08 * S, 0]]);
  decorate(skull, feature(0.026, 0.047, 0.02), INK, [face(0.03, -0.08, 0.008)]);
  decorate(skull, feature(0.045, 0.014, 0.02), INK, [face(-0.12, -0.055, -0.01, 0.6), face(0.12, -0.055, -0.01, -0.6)]);
  decorate(skull, new SphereGeometry(0.045 * S, 8, 6), SKIN_DARK, [
    [-HEAD, HEAD * TALL, 0],
    [HEAD, HEAD * TALL, 0],
  ]);
  /** A point of the head, from its centre in the bike's units: to his left, up and forward. */
  const H = (x: number, y: number, z: number): Point => [
    centre[0] + S * (x * Math.cos(look) + z * Math.sin(look)),
    centre[1] + S * y,
    centre[2] + S * (-x * Math.sin(look) + z * Math.cos(look)),
  ];
  // Hair sticking out under the helmet.
  [
    [[-0.17, -0.02, -0.08], [-0.27, -0.12, -0.12]],
    [[0.17, -0.02, -0.08], [0.27, -0.13, -0.1]],
    [[-0.08, -0.04, -0.18], [-0.12, -0.18, -0.28]],
    [[0.08, -0.04, -0.18], [0.12, -0.19, -0.27]],
    [[-0.15, 0.1, 0.11], [-0.2, -0.03, 0.14]],
  ].forEach(([from, to], i) =>
    limb(kit, H(from[0], from[1], from[2]), H(to[0], to[1], to[2]), 0.06 * S, 0, HAIR, { delay: P + 0.44 + i * 0.02, ink: 1.1 }),
  );
  // The helmet sits high, its rim above his brows.
  const DOME = 0.24 * S;
  const FLAT = 0.85;
  const BRIM = Math.PI * 0.52;
  const rim = -DOME * FLAT * Math.cos(BRIM);
  const helmet = add(new SphereGeometry(DOME, 18, 10, 0, Math.PI * 2, 0, BRIM).scale(1, FLAT, 1), HELMET, ...H(0, 0.1 - rim / S, -0.01), {
    delay: P + 0.5,
    rotation: [0, look, 0],
  });
  decorate(
    helmet,
    feature(0.014, 0.12, 0.014),
    YELLOW,
    [
      [0.3, 0.5, 0.7],
      [0.9, 0.35, -0.5],
      [-0.5, 0.55, 0.3],
      [-1.2, 0.3, 1.1],
      [2.4, 0.45, -0.8],
      [1.6, 0.6, 0.4],
    ].map(([angle, height, lean]) => {
      const ring = DOME * Math.sqrt(1 - height * height) + 0.004;
      return [Math.sin(angle) * ring, rim + DOME * FLAT * height, Math.cos(angle) * ring, lean] as [number, number, number, number];
    }),
  );

  // Speed lines streaming out behind him.
  const streaks = [
    [1.15, 0.55, 0.8, MAGENTA],
    [1.4, 0.35, 0.6, CYAN],
    [1.65, 0.5, 0.7, MAGENTA],
    [0.95, 0.3, 0.5, CYAN],
  ].map(([y, z, length, color], i) => {
    const streak = box(length, 0.025, 0.025, color, 0, T + y, BZ + z, { delay: 1.6 + i * 0.03, flat: true, noInk: true });
    return { streak, length };
  });

  const lanternOn = new Color(YELLOW);
  const lanternOff = new Color(0x6b5a1c);
  const wheelCentres = AXLE.map((x) => W(x, R, 0));
  tick((t) => {
    // The wheels spin round their axles.
    spokes.forEach((part, i) => {
      const angle = PITCH - t * 9;
      part.rotation.z = angle;
      part.position.set(wheelCentres[i][0] + HUB * S * Math.sin(angle), wheelCentres[i][1] - HUB * S * Math.cos(angle), wheelCentres[i][2]);
    });
    // The box hums: a quick shiver, and rings spreading from it.
    const shiver = Math.sin(t * 47) * 0.012;
    humming.forEach((part, i) => part.position.set(humRest[i].x + shiver, humRest[i].y + Math.sin(t * 61) * 0.008, humRest[i].z));
    hum.forEach((ring, i) => {
      const u = (t * 0.8 + i * 0.5) % 1;
      ring.children[0].scale.set(0.8 + u * 0.7, 1, 0.8 + u * 0.7);
      ring.visible = u < 0.85;
    });
    // Sparks at the torn socket and the taped wires, and the lamp flickering.
    const beat = Math.floor(t * 12);
    socketSparks.forEach((spark, i) => {
      const noise = Math.sin((beat + i * 13) * 12.9898) * 43758.5453;
      const on = i === 0 ? beat % 5 !== 4 : noise - Math.floor(noise) > 0.4;
      for (const piece of spark) piece.visible = on;
    });
    wireSparks.forEach((spark, i) => {
      const on = (beat + i) % 3 !== 2;
      for (const piece of spark) piece.visible = on;
    });
    const flicker = Math.sin(Math.floor(t * 7) * 78.233) * 43758.5453;
    colorOf(lantern).lerpColors(lanternOn, lanternOff, t > 0 && flicker - Math.floor(flicker) > 0.7 ? 0.8 : 0);
    // The speed lines stream back and fade.
    streaks.forEach(({ streak, length }, i) => {
      const u = (t * 1.2 + i * 0.37) % 1;
      streak.position.x = -1.0 - u * 0.7 + (length - 0.5) * 0.3;
      streak.visible = u < 0.9;
    });
    // Water drops falling from the spout.
    drops.forEach((drop, i) => {
      const [x, y, z] = waterPath((t * 1.4 + i / 3) % 1);
      drop.position.set(x, y - 0.025, z);
    });
  });

  return { width: 4.9, height: 4.5, lookY: 1.5 };
}
