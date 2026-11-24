import { BoxGeometry, ConeGeometry, CylinderGeometry, Group, SphereGeometry, TorusGeometry } from "three";
import { INK, limb, type Kit, type PartOptions, type Point } from "@/lib/diorama-kit";

// A standing person for a character's diorama, described rather than modelled: build, skin,
// hair, face, clothes, headwear and pose. The builder places it and gets back where its hands
// and head are, to put props in its hands or round its head. Everything is in the comic toon
// style of the kit. A figure faces +z (the camera at rest) unless `facing` turns it.

/**
 * Where an arm goes. A named pose, or a point for the hand in the figure's own frame: x to its
 * left (its right hand is at negative x), y up from its feet, z forward.
 */
export type ArmPose =
  | "down"
  | "hip"
  | "up"
  | "forward"
  | "out"
  | "crossed"
  | "cast"
  | "fist"
  | "wave"
  | "back"
  | "chin"
  | Point;
export type LegPose = "stand" | "wide" | "stride" | "kneel" | "sit";
export type HairStyle = "short" | "long" | "bald" | "bun" | "curly" | "spiky" | "ponytail" | "mohawk" | "bob" | "wild" | "braids";
export type Mouth = "smile" | "frown" | "grin" | "neutral" | "open" | "smirk" | "none";
export type Brows = "calm" | "angry" | "worried" | "raised" | "none";
export type Beard = "full" | "stubble" | "goatee" | "moustache" | "long";
export type Glasses = "round" | "square" | "goggles" | "shades" | "monocle";
export type Mask = "eyes" | "lower" | "visor" | "full" | "skull";
export type Headwear =
  | "cap"
  | "helmet"
  | "hood"
  | "hat"
  | "beret"
  | "hardhat"
  | "crown"
  | "bandana"
  | "headband"
  | "tophat"
  | "witch"
  | "beanie"
  | "turban"
  | "horns"
  | "halo";
export type Top = "shirt" | "jacket" | "coat" | "robe" | "armor" | "tank" | "suit" | "dress" | "hoodie" | "vest" | "apron" | "uniform";
export type Bottom = "trousers" | "skirt" | "shorts" | "long-skirt";

export type FigureSpec = {
  /** Where the feet stand, and the height of the ground there. */
  x: number;
  z: number;
  y: number;
  /** A turn about the vertical, in radians: 0 faces the camera at rest, positive turns to its left. */
  facing?: number;
  /** From the soles to the top of the head, before hair and hats. Most people 2.2–2.6. */
  height?: number;
  build?: "slim" | "normal" | "broad" | "heavy" | "child";
  skin: number;
  hair?: { style: HairStyle; color: number };
  face?: {
    mouth?: Mouth;
    brows?: Brows;
    /** Eye colour; with `glow` the eyes are lit (flat). */
    eyes?: number;
    glow?: boolean;
    beard?: Beard;
    beardColor?: number;
    glasses?: Glasses;
    glassesColor?: number;
    mask?: Mask;
    maskColor?: number;
    /** Freckles, scars, cracks, tattoo lines: small flat marks on the cheeks. */
    marks?: number;
    /** A blank face: no features at all. */
    blank?: boolean;
  };
  headwear?: { kind: Headwear; color: number; accent?: number };
  /** `accent`: the shirt or lining showing at the front; `tie`: a suit's tie. */
  top: { kind: Top; color: number; accent?: number; tie?: number; sleeves?: "long" | "short" | "none" };
  /** Ignored for robes and long dresses, which cover the legs. */
  bottom?: { kind: Bottom; color: number };
  shoes?: number;
  /** Bare feet: no shoes. */
  barefoot?: boolean;
  belt?: number;
  cape?: number;
  gloves?: number;
  scarf?: number;
  /** [right arm, left arm]. */
  arms?: [ArmPose, ArmPose];
  legs?: LegPose;
  /** Seconds before the first part pops in; the rest follow. */
  delay?: number;
};

export type Figure = {
  /** Centres of the right and left hands, in world space. */
  hands: [Point, Point];
  /** Centre of the head, in world space, and its radius. */
  head: Point;
  headRadius: number;
  /** The highest point of the head (without hair or hats). */
  top: number;
  /** The figure's frame: a point given in its own coordinates, in world space. */
  at: (x: number, y: number, z: number) => Point;
  /** Every part, e.g. to make the whole figure bob or shake. */
  parts: Group[];
  /** The head part (the face is decorated on it), e.g. to turn it. */
  headPart: Group;
};

const BUILDS = {
  //       shoulder, chest r, waist r, limb r, head r
  slim: [0.34, 0.3, 0.25, 0.085, 0.22],
  normal: [0.4, 0.35, 0.3, 0.1, 0.22],
  broad: [0.5, 0.45, 0.36, 0.13, 0.23],
  heavy: [0.47, 0.42, 0.46, 0.12, 0.23],
  child: [0.3, 0.27, 0.25, 0.075, 0.25],
} as const;

/** A colour darkened (k < 1) or lightened towards white (k > 1). */
export function shade(color: number, k: number): number {
  const channel = (shift: number) => {
    const c = (color >> shift) & 0xff;
    const value = k <= 1 ? c * k : c + (255 - c) * (k - 1);
    return Math.max(0, Math.min(255, Math.round(value))) << shift;
  };
  return channel(16) | channel(8) | channel(0);
}

/** Builds a person on the diorama. See FigureSpec. */
export function figure(kit: Kit, spec: FigureSpec): Figure {
  const { add, box, cylinder, ball, decorate } = kit;
  const H = spec.height ?? 2.4;
  const u = H / 2.4;
  const [SW, RC, RW, RL, RH] = BUILDS[spec.build ?? "normal"].map((v) => v * u);
  const theta = spec.facing ?? 0;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const D = spec.delay ?? 1;
  const parts: Group[] = [];
  const at = (lx: number, ly: number, lz: number): Point => [spec.x + lx * cos + lz * sin, spec.y + ly, spec.z - lx * sin + lz * cos];
  /** A part that keeps the figure's facing: `tilt` is a turn in its own frame (x then z). */
  const turned = (part: Group, tilt: [number, number] = [0, 0]): Group => {
    part.rotation.order = "YXZ";
    part.rotation.set(tilt[0], theta, tilt[1]);
    parts.push(part);
    return part;
  };
  const keep = (part: Group): Group => {
    parts.push(part);
    return part;
  };
  const o = (wait: number, extra: Partial<PartOptions> = {}): PartOptions => ({ delay: D + wait, ...extra });

  const top = spec.top;
  const covered = top.kind === "robe" || top.kind === "dress" || spec.bottom?.kind === "long-skirt";
  const lower = spec.bottom?.color ?? shade(top.color, 0.6);
  const shoes = spec.shoes ?? 0x2a2622;
  const sleeves = top.sleeves ?? (top.kind === "tank" || top.kind === "vest" || top.kind === "apron" ? "none" : "long");
  const accent = top.accent ?? shade(top.color, 1.35);

  // Proportions, in the figure's frame.
  const ankle = 0.12 * u;
  const knee = 0.62 * u;
  const hip = 1.08 * u;
  const shoulderY = 1.72 * u;
  const neck = 1.84 * u;
  const headY = (spec.build === "child" ? 2.08 : 2.14) * u;
  const footX = 0.17 * u;
  const squash = 0.72;

  // Legs.
  const legs = spec.legs ?? "stand";
  type LegPlan = { hip: Point; knee: Point; ankle: Point; toe: number };
  const legPlan = (side: number): LegPlan => {
    const sx = side * footX;
    if (legs === "wide") return { hip: [sx, hip, 0], knee: [side * 0.27 * u, knee, 0.03], ankle: [side * 0.34 * u, ankle, 0], toe: 0 };
    if (legs === "stride")
      return side < 0
        ? { hip: [sx, hip, 0], knee: [sx, knee, 0.22 * u], ankle: [sx, ankle, 0.3 * u], toe: 0 }
        : { hip: [sx, hip, 0], knee: [sx, knee * 0.95, -0.12 * u], ankle: [sx, ankle + 0.1 * u, -0.42 * u], toe: -0.5 };
    if (legs === "kneel")
      return side < 0
        ? { hip: [sx, hip * 0.72, 0], knee: [sx, ankle + 0.02, 0.05], ankle: [sx, ankle, -0.42 * u], toe: -1.3 }
        : { hip: [sx, hip * 0.72, 0], knee: [sx, knee * 0.8, 0.42 * u], ankle: [sx, ankle, 0.45 * u], toe: 0 };
    if (legs === "sit") return { hip: [sx, hip * 0.62, 0], knee: [sx, hip * 0.62, 0.5 * u], ankle: [sx, ankle, 0.55 * u], toe: 0 };
    return { hip: [sx, hip, 0], knee: [sx, knee, 0.02], ankle: [sx, ankle, 0.03], toe: 0 };
  };
  const drop = legs === "kneel" ? hip * 0.28 : legs === "sit" ? hip * 0.38 : 0;
  [-1, 1].forEach((side, i) => {
    const plan = legPlan(side);
    const bare = spec.bottom?.kind === "shorts" || spec.bottom?.kind === "skirt";
    if (!covered || legs === "sit" || legs === "kneel") {
      keep(limb(kit, at(...plan.hip), at(...plan.knee), RL * 1.25, RL * 1.12, covered ? spec.top.color : bare && spec.bottom?.kind === "skirt" ? spec.skin : lower, o(0.02 + i * 0.02)));
      keep(limb(kit, at(...plan.knee), at(...plan.ankle), RL * 1.08, RL * 0.95, bare ? spec.skin : covered ? spec.top.color : lower, o(0.04 + i * 0.02)));
    }
    const [ax, ay, az] = plan.ankle;
    turned(box(0.2 * u, 0.12 * u, 0.34 * u, spec.barefoot ? spec.skin : shoes, ...at(ax, ay - ankle, az + 0.06 * u), o(i * 0.02)), [plan.toe, 0]);
  });

  // Hips and torso; long garments hang from the waist to the ankles.
  const waist = hip - drop;
  const torsoTop = shoulderY - drop;
  if (covered) {
    const length = legs === "sit" || legs === "kneel" ? waist - ankle * 2 : waist - ankle;
    keep(add(new CylinderGeometry(RW * 1.05, RW * 1.6, length, 18).scale(1, 1, squash + 0.08), top.color, ...at(0, waist - length, 0), o(0.06)));
  } else {
    keep(add(new CylinderGeometry(RW * 1.02, RW * 1.02, 0.28 * u, 16).scale(1, 1, squash), lower, ...at(0, waist - 0.2 * u, 0), o(0.06)));
    if (spec.bottom?.kind === "skirt")
      keep(add(new CylinderGeometry(RW * 1.05, RW * 1.5, 0.45 * u, 16).scale(1, 1, squash + 0.06), spec.bottom.color, ...at(0, waist - 0.45 * u, 0), o(0.07)));
  }
  if (top.kind === "coat")
    keep(add(new CylinderGeometry(RW * 1.08, RW * 1.4, 0.62 * u, 16).scale(1, 1, squash + 0.06), top.color, ...at(0, waist - 0.6 * u, 0), o(0.08)));
  const torsoHeight = torsoTop - waist + 0.06 * u;
  const torso = turned(add(new CylinderGeometry(RC, RW, torsoHeight, 18).scale(1, 1, squash), top.color, ...at(0, waist - 0.04 * u, 0), o(0.1)));
  const front = RC * squash;
  const mid = torsoHeight / 2;
  // What makes each top itself.
  if (top.kind === "coat" || top.kind === "jacket" || top.kind === "suit" || top.kind === "hoodie")
    decorate(torso, new BoxGeometry(0.16 * u, torsoHeight * 0.85, 0.02), accent, [[0, mid + 0.04, front * 0.92 + 0.01]]);
  if (top.kind === "suit") decorate(torso, new BoxGeometry(0.05 * u, torsoHeight * 0.6, 0.02), spec.top.tie ?? 0xb02040, [[0, mid + 0.08, front * 0.92 + 0.02]]);
  if (top.kind === "armor") {
    decorate(torso, new BoxGeometry(RC * 1.3, torsoHeight * 0.55, 0.05), accent, [[0, mid + 0.12, front * 0.9]]);
    [-1, 1].forEach((side) =>
      turned(add(new SphereGeometry(0.2 * u * (SW / 0.4), 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), accent, ...at(side * SW, torsoTop - 0.08 * u, 0), o(0.16)), [0, side * -0.35]),
    );
  }
  if (top.kind === "apron") decorate(torso, new BoxGeometry(RC * 1.2, torsoHeight * 1.1, 0.03), top.accent ?? 0xe8e2d0, [[0, mid - 0.1, front * 0.95]]);
  if (top.kind === "uniform")
    decorate(torso, new BoxGeometry(0.05 * u, 0.05 * u, 0.02), top.accent ?? 0xffd60a, [
      [-0.12 * u, mid + 0.25 * u, front * 0.95],
      [0.12 * u, mid + 0.25 * u, front * 0.95],
      [0, mid, front * 0.98],
    ]);
  if (top.kind === "vest") decorate(torso, new BoxGeometry(0.2 * u, torsoHeight * 0.9, 0.02), top.accent ?? 0xe8e2d0, [[0, mid, front * 0.95]]);
  if (spec.belt !== undefined) keep(add(new CylinderGeometry(RW * 1.06, RW * 1.06, 0.07 * u, 16).scale(1, 1, squash + 0.04), spec.belt, ...at(0, waist, 0), o(0.12)));
  if (top.kind === "hoodie")
    turned(add(new SphereGeometry(0.2 * u, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), top.color, ...at(0, torsoTop - 0.05 * u, -0.22 * u), o(0.14)), [-0.6, 0]);
  if (spec.cape !== undefined) {
    const cape = new CylinderGeometry(SW * 1.05, SW * 1.55, torsoTop - ankle * 2, 16, 1, true, Math.PI / 2 + 0.2, Math.PI - 0.4).scale(1, 1, 0.55);
    // An open shell shows its ink from inside: a mirrored, slightly smaller copy lines it in colour.
    const lining = cape.clone().scale(-0.97, 1, 0.97);
    keep(add(cape, spec.cape, ...at(0, ankle * 2, -0.04 * u), o(0.05, { rotation: [0, theta, 0] })));
    keep(add(lining, shade(spec.cape, 0.85), ...at(0, ankle * 2, -0.04 * u), o(0.05, { rotation: [0, theta, 0], noInk: true })));
  }

  // Arms.
  const handR = 0.085 * u * (SW / 0.4 > 1.1 ? 1.2 : 1);
  type ArmPlan = { elbow: Point; hand: Point };
  const armPlan = (pose: ArmPose, side: number): ArmPlan => {
    const s = side;
    const y0 = torsoTop;
    if (typeof pose !== "string") {
      const shoulder: Point = [s * SW, y0, 0];
      const elbow: Point = [(shoulder[0] + pose[0]) / 2 + s * 0.14 * u, (shoulder[1] + pose[1]) / 2 - 0.1 * u, (shoulder[2] + pose[2]) / 2 - 0.04 * u];
      return { elbow, hand: pose };
    }
    switch (pose) {
      case "hip":
        return { elbow: [s * (SW + 0.32 * u), y0 - 0.38 * u, -0.04], hand: [s * (RW + 0.1 * u), waist + 0.06 * u, 0.06 * u] };
      case "up":
        return { elbow: [s * (SW + 0.12 * u), y0 + 0.4 * u, 0.04], hand: [s * (SW + 0.04 * u), y0 + 0.85 * u, 0.06] };
      case "forward":
        return { elbow: [s * (SW + 0.02 * u), y0 - 0.12 * u, 0.3 * u], hand: [s * (SW - 0.06 * u), y0 - 0.1 * u, 0.66 * u] };
      case "out":
        return { elbow: [s * (SW + 0.36 * u), y0 - 0.08 * u, 0.02], hand: [s * (SW + 0.72 * u), y0 - 0.02 * u, 0.06] };
      case "crossed":
        return { elbow: [s * (SW + 0.06 * u), y0 - 0.4 * u, front * 0.6], hand: [-s * RC * 0.55, y0 - 0.26 * u, front + 0.1 * u] };
      case "cast":
        return { elbow: [s * (SW + 0.14 * u), y0 - 0.34 * u, 0.24 * u], hand: [s * (SW - 0.02 * u), y0 - 0.2 * u, 0.58 * u] };
      case "fist":
        return { elbow: [s * (SW + 0.22 * u), y0 + 0.16 * u, 0.12 * u], hand: [s * (SW + 0.06 * u), y0 + 0.62 * u, 0.18 * u] };
      case "wave":
        return { elbow: [s * (SW + 0.32 * u), y0 + 0.1 * u, 0.04], hand: [s * (SW + 0.4 * u), y0 + 0.56 * u, 0.1 * u] };
      case "back":
        return { elbow: [s * (SW + 0.06 * u), y0 - 0.38 * u, -0.2 * u], hand: [s * SW, y0 - 0.72 * u, -0.36 * u] };
      case "chin":
        return { elbow: [s * (SW - 0.05 * u), y0 - 0.3 * u, front + 0.2 * u], hand: [s * 0.06 * u, headY - drop - 0.22 * u, 0.24 * u] };
      default:
        return { elbow: [s * (SW + 0.06 * u), y0 - 0.42 * u, 0.02], hand: [s * (SW + 0.04 * u), y0 - 0.82 * u, 0.08 * u] };
    }
  };
  const arms = spec.arms ?? ["down", "down"];
  const hands = [-1, 1].map((side, i) => {
    const plan = armPlan(arms[i], side);
    const shoulder = at(side * SW, torsoTop, 0);
    keep(ball(RL * 1.45, sleeves === "none" ? spec.skin : top.color, shoulder[0], shoulder[1] - RL * 1.45, shoulder[2], o(0.16 + i * 0.02)));
    const upperColor = sleeves === "none" ? spec.skin : top.color;
    const foreColor = sleeves === "long" ? top.color : spec.skin;
    keep(limb(kit, shoulder, at(...plan.elbow), RL * 1.15, RL * 1.05, upperColor, o(0.18 + i * 0.02)));
    keep(limb(kit, at(...plan.elbow), at(...plan.hand), RL * 1.02, RL * 0.9, foreColor, o(0.2 + i * 0.02)));
    if (sleeves === "long" && top.kind !== "armor")
      keep(ball(RL * 1.02, shade(top.color, 0.8), ...offsetDown(at(...lerp3(plan.elbow, plan.hand, 0.85)), RL * 1.02), o(0.22, { noInk: true })));
    const hand = at(...plan.hand);
    keep(ball(handR, spec.gloves ?? spec.skin, hand[0], hand[1] - handR, hand[2], o(0.24 + i * 0.02)));
    return hand;
  }) as [Point, Point];

  // Neck and head.
  const headCentre = at(0, headY - drop, 0.01);
  keep(cylinder(RH * 0.45, RH * 0.5, neck - torsoTop + 0.12 * u, spec.skin, ...at(0, torsoTop - 0.06 * u, 0), o(0.26)));
  const face = spec.face ?? {};
  const headColor = face.mask === "full" || face.mask === "skull" ? (face.maskColor ?? 0xe8e2d0) : spec.skin;
  const head = turned(add(new SphereGeometry(RH, 18, 14).scale(0.95, 1.06, 0.95), headColor, headCentre[0], headCentre[1] - RH * 1.06, headCentre[2], o(0.3)));
  const cy = RH * 1.06;
  const fz = RH * 0.9;
  if (!face.blank) {
    const eyeColor = face.eyes ?? INK;
    if (face.mask !== "visor") decorate(head, new BoxGeometry(0.05 * u, face.glow ? 0.035 * u : 0.03 * u, 0.02), eyeColor, [
      [-0.08 * u, cy + 0.03 * u, fz],
      [0.08 * u, cy + 0.03 * u, fz],
    ]);
    const browLean = face.brows === "angry" ? 0.35 : face.brows === "worried" ? -0.35 : 0;
    const browY = face.brows === "raised" ? 0.1 : 0.075;
    if (face.brows !== "none" && face.mask !== "full")
      decorate(head, new BoxGeometry(0.08 * u, 0.022 * u, 0.02), spec.hair?.color ?? shade(spec.skin, 0.45), [
        [-0.08 * u, cy + browY * u, fz - 0.01, -browLean],
        [0.08 * u, cy + browY * u, fz - 0.01, browLean],
      ]);
    if (face.mask !== "full" && face.mask !== "skull") decorate(head, new BoxGeometry(0.05 * u, 0.08 * u, 0.05), shade(spec.skin, 0.82), [[0, cy - 0.02 * u, fz + 0.01]]);
    const mouth = face.mouth ?? "neutral";
    const mouthY = cy - 0.1 * u;
    if (mouth !== "none" && face.mask !== "lower") {
      if (mouth === "open" || mouth === "grin")
        decorate(head, new BoxGeometry(mouth === "grin" ? 0.12 * u : 0.06 * u, mouth === "grin" ? 0.035 * u : 0.05 * u, 0.02), mouth === "grin" ? 0xf4f0e6 : 0x3a1a20, [[0, mouthY, fz - 0.02]]);
      else decorate(head, new BoxGeometry(0.08 * u, 0.014 * u, 0.01), INK, [[mouth === "smirk" ? 0.02 * u : 0, mouthY, fz - 0.015]]);
      if (mouth === "smile" || mouth === "frown" || mouth === "smirk") {
        const lift = mouth === "frown" ? -1 : 1;
        decorate(head, new BoxGeometry(0.03 * u, 0.014 * u, 0.01), INK, [
          ...(mouth === "smirk" ? [] : [[-0.05 * u, mouthY + lift * 0.01 * u, fz - 0.02, -0.5 * lift] as [number, number, number, number]]),
          [0.05 * u + (mouth === "smirk" ? 0.02 * u : 0), mouthY + lift * 0.01 * u, fz - 0.02, 0.5 * lift],
        ]);
      }
    }
    if (face.marks !== undefined)
      decorate(head, new BoxGeometry(0.012 * u, 0.07 * u, 0.01), face.marks, [
        [-0.13 * u, cy - 0.03 * u, fz - 0.06, 0.4],
        [0.14 * u, cy - 0.05 * u, fz - 0.07, -0.3],
      ]);
    const glassColor = face.glassesColor ?? INK;
    if (face.glasses === "round" || face.glasses === "monocle")
      decorate(head, new TorusGeometry(0.045 * u, 0.008 * u, 6, 16), glassColor, face.glasses === "monocle" ? [[0.08 * u, cy + 0.03 * u, fz + 0.02]] : [
        [-0.08 * u, cy + 0.03 * u, fz + 0.02],
        [0.08 * u, cy + 0.03 * u, fz + 0.02],
      ]);
    // Square frames are two square rings and a bridge; shades two dark lenses; goggles one band.
    if (face.glasses === "square")
      decorate(head, new TorusGeometry(0.06 * u, 0.008 * u, 4, 4).rotateZ(Math.PI / 4), glassColor, [
        [-0.08 * u, cy + 0.03 * u, fz + 0.02],
        [0.08 * u, cy + 0.03 * u, fz + 0.02],
      ]);
    if (face.glasses === "shades")
      decorate(head, new BoxGeometry(0.1 * u, 0.05 * u, 0.03), face.glassesColor ?? INK, [
        [-0.08 * u, cy + 0.03 * u, fz + 0.02],
        [0.08 * u, cy + 0.03 * u, fz + 0.02],
      ]);
    if (face.glasses === "square" || face.glasses === "shades") decorate(head, new BoxGeometry(0.06 * u, 0.012 * u, 0.02), face.glassesColor ?? INK, [[0, cy + 0.04 * u, fz + 0.03]]);
    if (face.glasses === "goggles") decorate(head, new BoxGeometry(0.28 * u, 0.07 * u, 0.03), face.glassesColor ?? 0x16c8ff, [[0, cy + 0.03 * u, fz + 0.02]]);
    if (face.mask === "eyes") decorate(head, new BoxGeometry(0.3 * u, 0.07 * u, 0.03), face.maskColor ?? INK, [[0, cy + 0.035 * u, fz - 0.005]]);
    if (face.mask === "visor") decorate(head, new BoxGeometry(0.32 * u, 0.08 * u, 0.04), face.maskColor ?? 0x16c8ff, [[0, cy + 0.03 * u, fz + 0.01]]);
    if (face.mask === "lower") decorate(head, new BoxGeometry(0.28 * u, 0.13 * u, 0.04), face.maskColor ?? INK, [[0, cy - 0.09 * u, fz - 0.02]]);
    if (face.mask === "skull")
      decorate(head, new BoxGeometry(0.07 * u, 0.06 * u, 0.02), INK, [
        [-0.08 * u, cy + 0.03 * u, fz + 0.005],
        [0.08 * u, cy + 0.03 * u, fz + 0.005],
      ]);
  }
  // Beards are parts, so they have volume and ink.
  const beardColor = face.beardColor ?? spec.hair?.color ?? 0x3a2a22;
  if (face.beard === "full" || face.beard === "long") {
    // Centred below the mouth and a little back, so it frames the jaw without reaching the eyes.
    const long = face.beard === "long" ? 1.6 : 1;
    const centre = headY - drop - RH * (face.beard === "long" ? 1.15 : 0.75);
    turned(add(new SphereGeometry(RH * 0.95, 14, 10).scale(1.02, long, 0.8), beardColor, ...at(0, centre - RH * 0.95 * long, RH * 0.3), o(0.34)));
  }
  if (face.beard === "goatee") turned(add(new ConeGeometry(0.06 * u, 0.14 * u, 6).rotateX(Math.PI), beardColor, ...at(0, headY - drop - RH * 1.2, RH * 0.72), o(0.34)));
  if (face.beard === "moustache") decorate(head, new BoxGeometry(0.16 * u, 0.04 * u, 0.04), beardColor, [[0, cy - 0.065 * u, fz]]);
  if (face.beard === "stubble")
    turned(add(new SphereGeometry(RH * 1.01, 16, 8, 0, Math.PI * 2, Math.PI * 0.58, Math.PI * 0.42).scale(0.95, 1.06, 0.95), shade(beardColor, 1.3), ...at(0, headY - drop - RH * 1.07, 0.012), o(0.33, { noInk: true })));

  // Hair.
  const hairColor = spec.hair?.color ?? 0x2a1e1c;
  const style = spec.hair?.style ?? "short";
  const hide = spec.headwear?.kind === "helmet" || spec.headwear?.kind === "hood";
  const crown = headY - drop;
  // A cap of hair centred on the head, a little larger, so the crown never shows through: `add`
  // stands a geometry on its lowest point, here the cap's rim, which is above the centre.
  const cap = (scale: number, length = 0.45) =>
    turned(
      add(new SphereGeometry(RH * scale, 16, 8, 0, Math.PI * 2, 0, Math.PI * length).scale(0.97, 1.08, 1), hairColor, ...at(0, crown + RH * scale * 1.08 * Math.cos(Math.PI * length) + 0.01 * u, -0.02 * u), o(0.36)),
      [-0.15, 0],
    );
  if (!hide && style !== "bald") {
    if (style === "short" || style === "bun" || style === "ponytail" || style === "braids" || style === "long" || style === "bob") cap(1.06);
    if (style === "bun") keep(ball(0.1 * u, hairColor, ...offsetDown(at(0, crown + RH * 1.0, -RH * 0.45), 0.1 * u), o(0.38)));
    if (style === "ponytail") keep(limb(kit, at(0, crown + RH * 0.5, -RH * 0.95), at(0, crown - RH * 1.5, -RH * 1.15), 0.06 * u, 0.04 * u, hairColor, o(0.38)));
    if (style === "braids")
      [-1, 1].forEach((side) => keep(limb(kit, at(side * RH * 0.85, crown, -RH * 0.3), at(side * RH * 0.95, crown - RH * 2.2, 0.02), 0.045 * u, 0.035 * u, hairColor, o(0.38))));
    if (style === "long" || style === "bob") {
      const length = style === "long" ? RH * 2.6 : RH * 1.15;
      // Open at the front (theta 0 is +z), so the face shows.
      const veil = new CylinderGeometry(RH * 1.02, RH * (style === "long" ? 1.25 : 1.08), length, 16, 1, true, 0.95, Math.PI * 2 - 1.9);
      keep(add(veil, hairColor, ...at(0, crown + RH * 0.4 - length, -0.01), o(0.37, { rotation: [0, theta, 0] })));
    }
    if (style === "curly" || style === "wild") {
      // Curls: balls round the top and back. Wild hair: bigger, uneven tufts, a few sticking out.
      const n = 8;
      for (let k = 0; k < n; k++) {
        const angle = Math.PI * (0.12 + (0.76 * k) / (n - 1));
        const r = style === "wild" ? RH * 1.02 : RH * 0.95;
        const size = (style === "wild" ? 0.08 + ((k * 5) % 3) * 0.025 : 0.085) * u;
        const p = at(Math.cos(angle) * r, crown + Math.sin(angle) * r * 0.8, -RH * (k % 2 ? 0.35 : 0.15));
        keep(ball(size, hairColor, p[0], p[1] - size, p[2], o(0.38 + k * 0.01)));
      }
      if (style === "wild")
        [0.35, 1.3, 2.0, 2.75].forEach((angle, k) => {
          const p = at(Math.cos(angle) * RH * 1.05, crown + Math.sin(angle) * RH * 0.9, -RH * 0.3);
          turned(add(new ConeGeometry(0.045 * u, 0.16 * u, 5), hairColor, ...p, o(0.4 + k * 0.01)), [-0.2, Math.PI / 2 - angle]);
        });
      cap(1.04, 0.4);
    }
    if (style === "spiky")
      [-0.12, 0, 0.12, -0.06, 0.06].forEach((dx, k) =>
        turned(add(new ConeGeometry(0.06 * u, 0.2 * u, 5), hairColor, ...at(dx * u, crown + RH * 0.65, (k > 2 ? -0.08 : 0.02) * u), o(0.38 + k * 0.01)), [-0.2, -dx * 3]),
      );
    if (style === "spiky") cap(1.03, 0.35);
    if (style === "mohawk") turned(box(0.06 * u, 0.16 * u, RH * 2, hairColor, ...at(0, crown + RH * 0.7, -0.03 * u), o(0.38)));
  }

  // Headwear.
  const hw = spec.headwear;
  if (hw) {
    const c = hw.color;
    const a = hw.accent ?? shade(c, 0.7);
    // Hats sit high enough that their brims never hide the eyes from the camera, which looks down a little.
    const crownY = crown + RH * 0.55;
    switch (hw.kind) {
      case "cap":
        turned(add(new SphereGeometry(RH * 1.08, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), c, ...at(0, crownY - 0.02, 0), o(0.4)));
        turned(box(RH * 1.4, 0.03 * u, RH * 0.9, a, ...at(0, crownY - 0.02, RH * 0.9), o(0.42)), [-0.15, 0]);
        break;
      case "helmet":
      case "hardhat":
        // A helmet comes down round the head but is open in front, so the face shows.
        if (hw.kind === "helmet")
          turned(add(new SphereGeometry(RH * 1.16, 18, 10, Math.PI / 2 + 0.75, Math.PI * 2 - 1.5, 0, Math.PI * 0.62), c, ...at(0, crown - RH * 0.4, 0), o(0.4)));
        else turned(add(new SphereGeometry(RH * 1.12, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), c, ...at(0, crown + RH * 0.42, 0), o(0.4)));
        if (hw.kind === "hardhat") turned(cylinder(RH * 1.25, RH * 1.25, 0.03 * u, a, ...at(0, crown + RH * 0.4, 0.02), o(0.42), 20));
        else decorate(head, new BoxGeometry(RH * 1.6, 0.04 * u, 0.03), a, [[0, cy + RH * 0.55, fz * 0.9]]);
        break;
      case "hood": {
        turned(add(new SphereGeometry(RH * 1.28, 18, 12, Math.PI / 2 + 0.8, Math.PI * 2 - 1.6), c, ...at(0, crown - RH * 1.3, -0.04 * u), o(0.4)));
        turned(add(new ConeGeometry(RH * 0.5, RH * 0.8, 10), c, ...at(0, crown + RH * 0.6, -RH * 0.4), o(0.42)), [-0.7, 0]);
        break;
      }
      case "hat":
        turned(cylinder(RH * 1.6, RH * 1.6, 0.03 * u, c, ...at(0, crownY, 0), o(0.4), 22));
        turned(cylinder(RH * 0.85, RH * 0.95, RH * 0.75, c, ...at(0, crownY, 0), o(0.42)));
        turned(cylinder(RH * 0.96, RH * 0.96, 0.05 * u, a, ...at(0, crownY + 0.02, 0), o(0.44, { noInk: true })));
        break;
      case "tophat":
        turned(cylinder(RH * 1.4, RH * 1.4, 0.03 * u, c, ...at(0, crownY, 0), o(0.4), 22));
        turned(cylinder(RH * 0.8, RH * 0.8, RH * 1.35, c, ...at(0, crownY, 0), o(0.42)));
        turned(cylinder(RH * 0.82, RH * 0.82, 0.06 * u, a, ...at(0, crownY + 0.03, 0), o(0.44, { noInk: true })));
        break;
      case "witch":
        turned(cylinder(RH * 1.6, RH * 1.6, 0.03 * u, c, ...at(0, crownY, 0), o(0.4), 22));
        turned(add(new ConeGeometry(RH * 0.85, RH * 2.2, 14), c, ...at(0, crownY, 0), o(0.42)), [-0.25, 0.15]);
        break;
      case "beret":
        turned(add(new SphereGeometry(RH * 1.12, 16, 8).scale(1, 0.35, 1), c, ...at(0.04 * u, crown + RH * 0.55, -0.02), o(0.4)), [0, -0.2]);
        break;
      case "beanie":
        // Its turned-up band sits above the brows, so the eyes stay visible.
        turned(add(new SphereGeometry(RH * 1.08, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), c, ...at(0, crown + RH * 0.42, 0), o(0.4)));
        turned(cylinder(RH * 1.1, RH * 1.1, 0.08 * u, a, ...at(0, crown + RH * 0.4, 0), o(0.42)));
        break;
      case "crown":
        turned(cylinder(RH * 0.85, RH * 0.85, 0.12 * u, c, ...at(0, crown + RH * 0.6, 0), o(0.4), 12));
        [0, 1, 2, 3, 4, 5].forEach((k) => {
          const angle = (k / 6) * Math.PI * 2;
          keep(add(new ConeGeometry(0.04 * u, 0.12 * u, 4), c, ...at(Math.sin(angle) * RH * 0.8, crown + RH * 0.6 + 0.12 * u, Math.cos(angle) * RH * 0.8), o(0.42)));
        });
        break;
      case "bandana":
      case "headband":
        turned(add(new TorusGeometry(RH * 0.98, 0.04 * u, 6, 20).rotateX(Math.PI / 2), c, ...at(0, crown + RH * (hw.kind === "bandana" ? 0.45 : 0.3), 0), o(0.4)));
        if (hw.kind === "bandana") turned(add(new SphereGeometry(RH * 1.04, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.32), c, ...at(0, crown + RH * 1.04 * Math.cos(Math.PI * 0.32) + 0.01 * u, 0), o(0.41)));
        break;
      case "turban":
        turned(add(new SphereGeometry(RH * 1.2, 16, 10).scale(1, 0.75, 1), c, ...at(0, crown + RH * 0.1, -0.02), o(0.4)));
        keep(ball(0.05 * u, a, ...offsetDown(at(0, crown + RH * 0.75, RH * 1.05), 0.05 * u), o(0.42)));
        break;
      case "horns":
        [-1, 1].forEach((side) => turned(add(new ConeGeometry(0.06 * u, 0.3 * u, 8), c, ...at(side * RH * 0.6, crown + RH * 0.6, 0), o(0.42)), [0, -side * 0.5]));
        break;
      case "halo":
        turned(add(new TorusGeometry(RH * 0.8, 0.025 * u, 6, 24).rotateX(Math.PI / 2), c, ...at(0, crown + RH * 1.4, -0.05), o(0.44, { flat: true, noInk: true })));
        break;
    }
  }
  if (spec.scarf !== undefined) keep(add(new TorusGeometry(RH * 0.7, 0.06 * u, 8, 18).rotateX(Math.PI / 2), spec.scarf, ...at(0, torsoTop + 0.02 * u, 0.02), o(0.28)));

  return {
    hands,
    head: headCentre,
    headRadius: RH,
    top: headCentre[1] + RH * 1.06,
    at,
    parts,
    headPart: head,
  };
}

function lerp3(a: Point, b: Point, t: number): Point {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function offsetDown(p: Point, radius: number): Point {
  return [p[0], p[1] - radius, p[2]];
}
