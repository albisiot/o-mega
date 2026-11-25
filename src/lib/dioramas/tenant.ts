import { BoxGeometry, Color, ConeGeometry, ExtrudeGeometry, Shape, SphereGeometry, TorusGeometry, type Group } from "three";
import { YELLOW, cable, colorOf, jag, octagonBase, zigzag, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { bollard, ring, skyline } from "@/lib/diorama-props";

/**
 * Tenant (P210): the guide who has come back twice from the far side of the tear, on the night
 * quay. Behind him, standing on the black water, the way through: a doorway of acid-green light
 * with no threshold, lightning crackling round it. He waits in his tarred coat and stiff pointed
 * hood, one arm clamped across his chest round a bundle of cloth that glows and beats like a
 * second heart (the guest that keeps him whole); the pilgrims' skiff is tied to the bollard,
 * its lantern lit, because the guest cannot bear the dark.
 */
export function tenant(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick, motes } = kit;
  const WATER = 0x0e2a30;
  const FOAM = 0x9fe8d0;
  const ACID = 0x9cff3a;
  const STONE = 0x4a4f5c;
  const TAR = 0x3a2e24;
  const F = octagonBase(kit, WATER);
  const G = F + 0.25;

  /** A ring spreading on the water, again and again. */
  const ripple = (x: number, z: number, radius: number, period: number, phase: number, delay: number, color = FOAM) => {
    const wave = add(new TorusGeometry(radius, 0.014, 6, 36).rotateX(Math.PI / 2), color, x, F + 0.002, z, { delay, flat: true, noInk: true });
    tick((t) => {
      const u = ((t + phase) / period) % 1;
      wave.children[0].scale.set(0.5 + u, 1, 0.5 + u);
      wave.visible = u < 0.85;
    });
  };

  // The quay: a stone platform over the right of the base, the water to the left.
  const outline: [number, number][] = [
    [-0.35, -2.2],
    [0.92, -2.2],
    [2.2, -0.92],
    [2.2, 0.92],
    [0.92, 2.2],
    [0.35, 2.2],
  ];
  const shape = new Shape();
  outline.forEach(([x, z], k) => (k ? shape.lineTo(x, -z) : shape.moveTo(x, -z)));
  shape.closePath();
  const quay = add(new ExtrudeGeometry(shape, { depth: 0.25, bevelEnabled: false }).rotateX(-Math.PI / 2), STONE, 0, F, 0, { delay: 0.1, ink: 1.01 });
  decorate(
    quay,
    new BoxGeometry(0.012, 0.004, 4.0),
    0x3a3e4a,
    [0.5, 1.0, 1.5].map((x) => [x, 0.252, 0] as Point),
  );
  skyline(kit, -1.85, G, 0.2, [0x2a2f4a, 0x3a2a4a, 0x22344a], 0, 1.15);
  [
    [-0.2, 1.7],
    [-1.6, 0.2],
  ].forEach(([x, z], k) => box(0.6, 0.004, 0.03, 0x2a5a60, x, F, z, { delay: 0.2 + k * 0.03, flat: true, noInk: true, rotation: [0, 0.4 + k, 0] }));

  // The bollard with its coil of rope, and the skiff tied to it, lantern lit.
  bollard(kit, 0.55, 1.35, G, 0.3);
  add(new TorusGeometry(0.13, 0.035, 6, 16).rotateX(Math.PI / 2), 0xc9a46a, 0.55, G + 0.09, 1.35, { delay: 0.34 });
  const hullShape = new Shape();
  [
    [-0.6, -0.26],
    [0.3, -0.26],
    [0.7, 0],
    [0.3, 0.26],
    [-0.6, 0.26],
  ].forEach(([x, y], k) => (k ? hullShape.lineTo(x, y) : hullShape.moveTo(x, y)));
  hullShape.closePath();
  const SX = -1.15;
  const SZ = 1.0;
  const SR = -0.5;
  const skiff: Group[] = [
    add(new ExtrudeGeometry(hullShape, { depth: 0.24, bevelEnabled: false }).rotateX(-Math.PI / 2), 0x2a2238, SX, F - 0.06, SZ, { delay: 0.4, rotation: [0, SR, 0] }),
    add(new ExtrudeGeometry(hullShape, { depth: 0.02, bevelEnabled: false }).rotateX(-Math.PI / 2).scale(0.85, 1, 0.8), 0x4a3a2e, SX, F + 0.16, SZ, { delay: 0.44, noInk: true, rotation: [0, SR, 0] }),
    box(0.06, 0.05, 0.48, 0x5e4a3a, SX + 0.1 * Math.cos(SR), F + 0.17, SZ - 0.1 * Math.sin(SR), { delay: 0.46, rotation: [0, SR, 0] }),
  ];
  const sternPole: Point = [SX - 0.45 * Math.cos(SR), F + 0.17, SZ + 0.45 * Math.sin(SR)];
  skiff.push(cylinder(0.02, 0.02, 0.55, 0x23222b, ...sternPole, { delay: 0.5, noInk: true }, 6));
  const lamp = box(0.12, 0.16, 0.12, YELLOW, sternPole[0], sternPole[1] + 0.4, sternPole[2] + 0.06, { delay: 0.52, flat: true });
  skiff.push(lamp);
  const bow: Point = [SX + 0.62 * Math.cos(SR), F + 0.2, SZ - 0.62 * Math.sin(SR)];
  cable(kit, [bow, [(bow[0] + 0.55) / 2, F + 0.12, (bow[2] + 1.35) / 2], [0.55, G + 0.12, 1.35]], 0.018, 0xc9a46a, 0.55);
  ripple(SX, SZ, 0.55, 4, 0, 0.6);

  // The way through: a doorway of acid light standing on the water, no threshold to it.
  const DX = -0.95;
  const DZ = -0.95;
  const DR = 0.5;
  const c = Math.cos(DR);
  const s = Math.sin(DR);
  const dp = (lx: number, ly: number, lz = 0): Point => [DX + lx * c + lz * s, F + ly, DZ - lx * s + lz * c];
  const voidPanel = box(0.92, 1.95, 0.02, 0x07140e, ...dp(0, 0.3, -0.04), { delay: 0.6, flat: true, noInk: true, rotation: [0, DR, 0] });
  decorate(voidPanel, new BoxGeometry(0.04, 0.04, 0.01), ACID, [
    [-0.2, 0.6, 0.012],
    [0.25, 1.1, 0.012],
    [-0.05, 1.5, 0.012],
  ]);
  const frame = [
    box(0.08, 2.0, 0.08, ACID, ...dp(-0.5, 0.3), { delay: 0.7, flat: true, rotation: [0, DR, 0] }),
    box(0.08, 2.0, 0.08, ACID, ...dp(0.5, 0.3), { delay: 0.72, flat: true, rotation: [0, DR, 0] }),
    box(1.08, 0.08, 0.08, ACID, ...dp(0, 2.3), { delay: 0.74, flat: true, rotation: [0, DR, 0] }),
  ];
  const bolts = [0, 1].map((k) => [
    zigzag(kit, jag(dp(-0.54, 2.3 - k * 0.6), dp(-0.95, 2.9 - k * 0.3, 0.2), 4, 0.08, k + 1), 0.022, ACID, 0.9),
    zigzag(kit, jag(dp(0.54, 1.9 - k * 0.5), dp(1.0, 2.6 - k * 0.8, 0.1), 4, 0.08, k + 4), 0.022, ACID, 0.9),
    zigzag(kit, jag(dp(0.1, 2.34), dp(0.3 - k * 0.6, 3.2, -0.1), 4, 0.07, k + 7), 0.02, 0xe8ffd0, 0.9),
  ]);
  motes(10, ACID, 0.03, [DX - 0.4, F + 0.3, DZ - 0.2], [DX + 0.4, F + 2.4, DZ + 0.2], 1.0);
  ripple(DX, DZ, 0.45, 2.8, 0, 0.8, ACID);
  ripple(DX, DZ, 0.45, 2.8, 1.4, 0.8, ACID);

  // Tenant, waiting on the quay with the guest clutched to his chest.
  const X = 0.95;
  const Z = 0.35;
  const T = 0.3;
  const guide = figure(kit, {
    x: X,
    z: Z,
    y: G,
    facing: T,
    height: 2.55,
    build: "heavy",
    skin: 0xc09078,
    face: { mouth: "frown", brows: "angry", marks: 0x8a5a48 },
    headwear: { kind: "hood", color: TAR },
    top: { kind: "coat", color: TAR, accent: 0x2a2420 },
    bottom: { kind: "trousers", color: 0x22201c },
    shoes: 0x1a1612,
    arms: ["crossed", "down"],
    delay: 1.0,
  });
  const at = guide.at;
  add(new ConeGeometry(0.15, 0.4, 10), TAR, ...at(0, 2.47, -0.08), { delay: 1.5, rotation: [-0.15, T, 0] });
  // The bundle: a knot of pale cloth under his arm that beats with a green light.
  const bundleAt = at(0.02, 1.3, 0.34);
  const bundle = add(new SphereGeometry(0.2, 14, 10).scale(1.15, 1.25, 0.8), 0xa8b8a0, ...bundleAt, { delay: 1.55, rotation: [0, T, 0.3] });
  decorate(bundle, new BoxGeometry(0.3, 0.02, 0.02), 0x7a8a74, [
    [0, 0.2, 0.15, 0.5],
    [0.02, 0.32, 0.14, -0.4],
  ]);
  const beat = ring(kit, [bundleAt[0], bundleAt[1] + 0.06, bundleAt[2] + 0.12], 0.16, ACID, 1.7, true);
  beat.rotation.y = T;

  const cloth = new Color(0xa8b8a0);
  const glow = new Color(0xd8ff9a);
  const rest = skiff.map((part) => part.position.y);
  tick((t) => {
    // Lightning round the doorway; the bundle's beat, twice and a pause; the skiff on the swell.
    const flash = Math.floor(t * 7) % 3;
    bolts.forEach((set, k) => set.forEach((bolt) => bolt.forEach((piece) => (piece.visible = flash === k || (flash === 2 && k === 0)))));
    frame.forEach((bar) => (bar.visible = Math.floor(t * 13) % 29 !== 5));
    const u = t % 1.4;
    const pulse = u < 0.15 ? u / 0.15 : u < 0.3 ? 1 - (u - 0.15) / 0.15 : u < 0.45 ? (u - 0.3) / 0.15 : u < 0.6 ? 1 - (u - 0.45) / 0.15 : 0;
    colorOf(bundle).lerpColors(cloth, glow, pulse);
    beat.children[0].scale.set(1 + (u / 1.4) * 1.4, 1 + (u / 1.4) * 1.4, 1);
    beat.visible = u < 1.0;
    skiff.forEach((part, i) => (part.position.y = rest[i] + Math.sin(t * 1.4) * 0.02));
    lamp.visible = Math.floor(t * 5) % 17 !== 3;
  });

  return { width: 4.9, height: 4.5, lookY: 1.6 };
}
