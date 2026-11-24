import { BoxGeometry, CatmullRomCurve3, CylinderGeometry, SphereGeometry, TorusGeometry, TubeGeometry, Vector3 } from "three";
import { CYAN, MAGENTA, YELLOW, cable, limb, octagonBase, zigzag, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { crate, floor, skyline } from "@/lib/diorama-props";

/**
 * Longwave (P020): the radio amateur of the Lanterne on a flat roof at night, headphones on,
 * smiling into her microphone, a hand on the dial of her old set. Rings of signal spread from the
 * lattice mast behind her and from the aerial on her backpack, while the phone mast on the next
 * roof has gone dark, its cable cut: when the network fails, the quarter talks through her.
 */
export function longwave(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const STEEL = 0x6a7488;
  const DARK = 0x22262e;
  const F = octagonBase(kit, 0x1e2230);
  const G = floor(kit, F, 0.06, 0x2e3140, 0x23262f, 0.6);

  /** A ring of signal spreading round a point, again and again, facing the camera at rest. */
  const echo = (at: Point, radius: number, phase: number, delay: number) => {
    const part = add(new TorusGeometry(radius, 0.016, 6, 32), YELLOW, at[0], at[1] - radius, at[2], { delay, flat: true, noInk: true, rotation: [0, 0.35, 0] });
    const mesh = part.children[0];
    tick((t) => {
      const u = (t * 0.5 + phase) % 1;
      const s = 0.5 + u;
      mesh.scale.setScalar(s);
      part.position.y = at[1] - radius * s;
      mesh.visible = u < 0.9;
    });
  };

  // The roof: a low parapet, the city beyond it.
  skyline(kit, -1.75, G, 0.1, [0x2a2f4a, 0x22344a, 0x2e2a48], -1.45, 0.8);
  box(3.3, 0.35, 0.18, 0x3a3f50, 0, G, -1.45, { delay: 0.2 });
  box(0.18, 0.35, 2.4, 0x3a3f50, -1.6, G, -0.2, { delay: 0.22 });

  // Her lattice mast, a light on top and signal spreading from it.
  const MX = 1.2;
  const MZ = -0.95;
  const H = 3.0;
  const half = (h: number) => 0.28 - 0.22 * (h / H);
  [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => limb(kit, [MX + sx * 0.28, G, MZ + sz * 0.28], [MX + sx * 0.06, G + H, MZ + sz * 0.06], 0.03, 0.02, STEEL, { delay: 0.3, noInk: true })));
  const rungs = Array.from({ length: 9 }, (_, k) => (k * H) / 8);
  zigzag(kit, rungs.map((h, k) => [MX + (k % 2 ? 1 : -1) * half(h), G + h, MZ + half(h)] as Point), 0.018, STEEL, 0.4);
  zigzag(kit, rungs.map((h, k) => [MX + half(h), G + h, MZ + (k % 2 ? 1 : -1) * half(h)] as Point), 0.018, STEEL, 0.45);
  cylinder(0.012, 0.012, 0.45, STEEL, MX, G + H, MZ, { delay: 0.6, noInk: true }, 6);
  const beacon = box(0.08, 0.08, 0.08, MAGENTA, MX, G + H + 0.42, MZ, { delay: 0.65, flat: true, noInk: true });
  [0, 0.33, 0.66].forEach((phase) => echo([MX, G + H + 0.3, MZ], 0.32, phase, 1.6));

  // The phone mast on the next roof: dark, its cable hanging cut.
  const PX = -1.35;
  const PZ = -0.55;
  cylinder(0.05, 0.06, 2.0, 0x4a5060, PX, G, PZ, { delay: 0.3 }, 8);
  [0, 2.1, 4.2].forEach((a, i) => box(0.12, 0.42, 0.05, 0xb8b4a8, PX + Math.sin(a) * 0.12, G + 1.45, PZ + Math.cos(a) * 0.12, { delay: 0.35 + i * 0.03, rotation: [0, a, 0] }));
  box(0.07, 0.07, 0.07, 0x3a3a44, PX, G + 2.0, PZ, { delay: 0.45 });
  cable(kit, [[PX + 0.05, G + 1.4, PZ + 0.05], [PX + 0.22, G + 0.9, PZ + 0.2], [PX + 0.28, G + 0.6, PZ + 0.28]], 0.02, DARK, 0.5);
  [0.5, -0.6, 0.1].forEach((lean, k) => box(0.012, 0.08, 0.012, 0x8a93a3, PX + 0.28, G + 0.53, PZ + 0.28, { delay: 0.55 + k * 0.02, noInk: true, rotation: [lean, 0, -lean] }));

  // Longwave: curly hair, headphones, a teal parka, the microphone at her mouth.
  const ham = figure(kit, {
    x: -0.25,
    z: 0.45,
    y: G,
    facing: 0.35,
    height: 2.35,
    skin: 0xe0b090,
    hair: { style: "curly", color: 0x4a2a1a },
    face: { mouth: "smile", brows: "raised" },
    top: { kind: "hoodie", color: 0x2c5a6c, accent: 0x3a6e80 },
    bottom: { kind: "trousers", color: 0x1f2a36 },
    shoes: 0x2a2622,
    arms: [
      [-0.17, 1.9, 0.32],
      [0.6, 1.26, 0.42],
    ],
    delay: 0.8,
  });
  const turn: Point = [0, 0.35, 0];
  const RH = ham.headRadius;
  const headY = ham.head[1] - G;
  // A cap of hair over her curls (the figure's own lets the scalp show), then the headphones.
  const cap = add(new SphereGeometry(RH * 1.04, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.97, 1.06, 1), 0x4a2a1a, ...ham.head, { delay: 1.3 });
  cap.rotation.order = "YXZ";
  cap.rotation.set(-0.5, 0.35, 0);
  [
    [-1, 0.1, -0.1],
    [1, 0.1, -0.1],
    [-0.85, -0.45, -0.25],
    [0.85, -0.45, -0.25],
    [0, 0.3, -0.75],
  ].forEach(([sx, dy, dz], i) => {
    const curl = ham.at(sx * RH * 1.05, headY + dy * RH, dz * RH);
    ball(0.1, 0x4a2a1a, curl[0], curl[1] - 0.1, curl[2], { delay: 1.32 + i * 0.02 });
  });
  add(new TorusGeometry(RH * 1.38, 0.035, 6, 20, Math.PI), DARK, ham.head[0], ham.head[1] - 0.04, ham.head[2], { delay: 1.4, rotation: turn });
  [-1, 1].forEach((side) => {
    const at = ham.at(side * (RH + 0.08), headY, 0.01);
    const cup = add(new CylinderGeometry(0.1, 0.1, 0.09, 14).rotateZ(Math.PI / 2), DARK, at[0], at[1] - 0.1, at[2], { delay: 1.45, rotation: turn });
    decorate(cup, new CylinderGeometry(0.06, 0.06, 0.01, 14).rotateZ(Math.PI / 2), CYAN, [[side * 0.046, 0.1, 0]]);
  });
  const pack = ham.at(0, 1.05, -0.36);
  box(0.42, 0.55, 0.2, 0x23404b, pack[0], pack[1], pack[2], { delay: 1.0, rotation: turn });
  const aerial = ham.at(-0.15, 1.55, -0.4);
  cylinder(0.01, 0.015, 1.1, STEEL, aerial[0], aerial[1], aerial[2], { delay: 1.1, noInk: true }, 6);
  ball(0.03, YELLOW, aerial[0], aerial[1] + 1.1, aerial[2], { delay: 1.15, flat: true, noInk: true });
  echo([aerial[0], aerial[1] + 1.13, aerial[2]], 0.14, 0.2, 1.7);
  echo([aerial[0], aerial[1] + 1.13, aerial[2]], 0.14, 0.7, 1.7);

  // Her set on two crates, the tuning window lit; the microphone and its coiled cord.
  const crateAt = ham.at(0.6, 0, 0.32);
  crate(kit, crateAt[0], crateAt[2], G, 0.5, 0.5, 0x5e4a3a, 0.35);
  crate(kit, crateAt[0], crateAt[2], G + 0.5, 0.55, 0.42, 0x6b5442, 0.2);
  const set = box(0.5, 0.3, 0.32, 0x2a3040, crateAt[0], G + 0.92, crateAt[2], { delay: 0.6, rotation: turn });
  decorate(set, new BoxGeometry(0.24, 0.07, 0.01), CYAN, [[-0.09, 0.2, 0.161]]);
  decorate(set, new CylinderGeometry(0.04, 0.04, 0.03, 12).rotateX(Math.PI / 2), 0x8a93a3, [
    [0.16, 0.2, 0.17],
    [0.16, 0.09, 0.17],
  ]);
  const leds = decorate(set, new BoxGeometry(0.03, 0.03, 0.01), MAGENTA, [
    [-0.18, 0.08, 0.161],
    [-0.1, 0.08, 0.161],
    [-0.02, 0.08, 0.161],
  ]);
  const [mic] = ham.hands;
  box(0.06, 0.13, 0.05, DARK, mic[0], mic[1] - 0.02, mic[2] + 0.03, { delay: 1.4, rotation: [0.3, 0.35, 0] });
  const a = new Vector3(mic[0], mic[1] - 0.05, mic[2] + 0.03);
  const plug = ham.at(0.36, 1.02, 0.44);
  const b = new Vector3(...plug);
  const along = b.clone().sub(a).normalize();
  const side = new Vector3().crossVectors(along, new Vector3(0, 1, 0)).normalize();
  const lift = new Vector3().crossVectors(along, side).normalize();
  const coil = Array.from({ length: 81 }, (_, i) => {
    const s = i / 80;
    const angle = s * Math.PI * 2 * 14;
    return a
      .clone()
      .lerp(b, s)
      .add(new Vector3(0, -0.3 * Math.sin(Math.PI * s), 0))
      .addScaledVector(side, Math.cos(angle) * 0.025)
      .addScaledVector(lift, Math.sin(angle) * 0.025);
  });
  const cord = new TubeGeometry(new CatmullRomCurve3(coil), 320, 0.008, 4).translate(-a.x, -a.y, -a.z);
  cord.computeBoundingBox();
  add(cord, DARK, a.x, a.y + (cord.boundingBox?.min.y ?? 0), a.z, { delay: 1.5, noInk: true });

  tick((t) => {
    beacon.visible = Math.floor(t * 2) % 4 !== 3;
    leds.color.setHex(Math.floor(t * 5) % 3 ? MAGENTA : YELLOW);
  });

  return { width: 4.9, height: 4.6, lookY: 1.8 };
}
