import { BoxGeometry, CylinderGeometry, Group, TorusGeometry } from "three";
import { CYAN, INK, ORANGE, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { crate, facade, floor } from "@/lib/diorama-props";

/**
 * Isonomy (P147): the activist of the Lanterne shouts through her megaphone from a crate, in
 * front of the Comune's gate that measures the Segno. A man without the Segno stands in it while
 * the scan line runs down him and the needle stays at zero, as it did for her; she points at him,
 * the rings of her voice spreading, and behind her the crowd waves its orange flags.
 */
export function isonomy(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const STEEL = 0x4a5468;
  const F = octagonBase(kit, 0x1d1b28);
  const G = floor(kit, F, 0.06, 0x34303e, 0x221f2a, 0.45);

  // The office of the Comune, and its measuring gate turned to the street.
  facade(kit, 0.75, -1.5, G, 0.1, { width: 1.7, height: 2.7, color: 0x2f3a52, windows: 3, floors: 3, door: true, lit: 0x9fd8ff });
  const GX = 0.9;
  const GZ = -0.55;
  const turn = 0.35;
  const P = (lx: number, ly: number, lz: number): Point => [GX + lx * Math.cos(turn) + lz * Math.sin(turn), G + ly, GZ - lx * Math.sin(turn) + lz * Math.cos(turn)];
  const rot: Point = [0, turn, 0];
  [-1, 1].forEach((side) => {
    const post = box(0.16, 2.5, 0.24, STEEL, ...P(side * 0.58, 0, 0), { delay: 0.3, rotation: rot });
    decorate(post, new BoxGeometry(0.01, 2.2, 0.08), CYAN, [[-side * 0.081, 1.25, 0]]);
  });
  box(1.32, 0.2, 0.24, STEEL, ...P(0, 2.5, 0), { delay: 0.35, rotation: rot });
  const meter = box(0.56, 0.36, 0.18, 0x2a2e3c, ...P(0, 2.7, 0), { delay: 0.4, rotation: rot });
  decorate(meter, new CylinderGeometry(0.13, 0.13, 0.01, 20).rotateX(Math.PI / 2), 0xe8e2d0, [[-0.1, 0.18, 0.091]]);
  decorate(meter, new BoxGeometry(0.06, 0.06, 0.01), 0x3a3a44, [[0.17, 0.24, 0.091]]);
  decorate(meter, new BoxGeometry(0.06, 0.06, 0.01), 0x1a3a44, [[0.17, 0.12, 0.091]]);
  const needle = add(new BoxGeometry(0.014, 0.11, 0.01).translate(0, 0.055, 0), INK, ...P(-0.1, 2.88, 0.1), { delay: 0.45, flat: true, noInk: true });
  needle.rotation.order = "YXZ";
  const scan = box(1.0, 0.015, 0.3, CYAN, ...P(0, 2.3, 0), { delay: 0.5, flat: true, noInk: true, rotation: rot });
  const scanTop = scan.position.y;

  // The man without the Segno, standing in the gate.
  figure(kit, {
    x: GX,
    z: GZ,
    y: G,
    facing: 0.3,
    height: 2.2,
    skin: 0xc48a68,
    hair: { style: "short", color: 0x3a2a22 },
    face: { mouth: "neutral", brows: "worried", beard: "moustache" },
    top: { kind: "jacket", color: 0x23707e, accent: 0xd8d2c4 },
    bottom: { kind: "trousers", color: 0x2a2f3a },
    arms: ["down", "down"],
    delay: 0.7,
  });

  // The crowd behind, with orange flags and a blank banner.
  const flags: Group[] = [];
  [
    [-1.65, -1.15, 0x3a3448, true],
    [-1.15, -1.45, 0x2e3a48, false],
    [-0.6, -1.6, 0x44344a, true],
    [-1.8, -0.5, 0x2e3448, true],
    [-0.15, -1.1, 0x3a3040, false],
  ].forEach(([x, z, color, flag], i) => {
    const px = x as number;
    const pz = z as number;
    const d = 0.3 + i * 0.05;
    cylinder(0.17, 0.2, 0.9, color as number, px, G, pz, { delay: d });
    ball(0.14, 0xb08060, px, G + 0.92, pz, { delay: d + 0.04 });
    ball(0.145, 0x2a1e1c, px, G + 1.0, pz - 0.03, { delay: d + 0.06 });
    if (!flag) return;
    cylinder(0.02, 0.02, 2.3, 0x23222b, px + 0.2, G + 0.5, pz, { delay: d + 0.08 }, 6);
    flags.push(add(new BoxGeometry(0.62, 0.42, 0.02).translate(0.31, 0, 0), ORANGE, px + 0.22, G + 2.36, pz, { delay: d + 0.1, rotation: [0, 0.3, 0] }));
  });
  cylinder(0.02, 0.02, 1.5, 0x23222b, -1.4, G + 0.5, -0.55, { delay: 0.5 }, 6);
  cylinder(0.02, 0.02, 1.5, 0x23222b, -0.6, G + 0.5, -1.05, { delay: 0.5 }, 6);
  box(0.95, 0.4, 0.02, 0xe8e2d0, -1.0, G + 1.55, -0.8, { delay: 0.55, rotation: [0, 0.55, 0] });

  // Isonomy on her crate, shouting through the megaphone at the gate, her other hand open to us.
  crate(kit, -0.4, 0.55, G, 0.6, 0.45, 0x5e4a3a, 0.3);
  const facing = 0.35;
  const activist = figure(kit, {
    x: -0.4,
    z: 0.55,
    y: G + 0.45,
    facing,
    height: 2.35,
    build: "slim",
    skin: 0xd8a080,
    hair: { style: "wild", color: 0x2a1a14 },
    face: { mouth: "open", brows: "angry", marks: 0xb07050 },
    top: { kind: "coat", color: 0x55555f, accent: 0x34343c },
    bottom: { kind: "trousers", color: 0x2a2a30 },
    shoes: 0x23222b,
    arms: [[-0.55, 1.5, 0.42], [0.22, 1.95, 0.24]],
    delay: 0.9,
  });
  const aimAt = facing + 0.9;
  const fwd: Point = [Math.sin(aimAt), 0, Math.cos(aimAt)];
  const [mx, my, mz] = activist.hands[1];
  const horn = add(new CylinderGeometry(0.05, 0.18, 0.42, 16).rotateX(-Math.PI / 2), 0xe8e2d0, mx + fwd[0] * 0.2, my - 0.18, mz + fwd[2] * 0.2, { delay: 1.4, rotation: [0, aimAt, 0] });
  decorate(horn, new TorusGeometry(0.11, 0.035, 6, 18), ORANGE, [[0, 0.18, -0.05]]);
  decorate(horn, new CylinderGeometry(0.15, 0.15, 0.01, 16).rotateX(Math.PI / 2), 0x3a3a44, [[0, 0.18, 0.205]]);
  // The orange strap, and her hoop earrings.
  box(0.05, 0.85, 0.02, ORANGE, ...activist.at(0.02, 1.15, 0.26), { delay: 1.3, rotation: [0, facing, 0.55] });
  const R = activist.headRadius;
  [-1, 1].forEach((side) =>
    add(new TorusGeometry(0.035, 0.008, 6, 12), ORANGE, ...activist.at(side * R * 0.98, 2.14 * (2.35 / 2.4) - R * 0.75, 0.02), { delay: 1.45, flat: true, noInk: true, rotation: [0, facing + Math.PI / 2, 0] }),
  );

  // Rings of her voice, spreading from the megaphone.
  const mouth: Point = [mx + fwd[0] * 0.42, my, mz + fwd[2] * 0.42];
  const rings = [0, 1, 2].map((k) => add(new TorusGeometry(0.2, 0.022, 6, 28), ORANGE, ...mouth, { delay: 1.6 + k * 0.05, flat: true, noInk: true, rotation: [0, aimAt, 0] }));

  tick((t) => {
    rings.forEach((ring, k) => {
      const u = (t * 0.6 + k / 3) % 1;
      ring.children[0].scale.setScalar(0.8 + u * 1.4);
      ring.position.set(mouth[0] + fwd[0] * u * 1.1, mouth[1] - 0.222 * (0.8 + u * 1.4), mouth[2] + fwd[2] * u * 1.1);
      ring.visible = u < 0.9;
    });
    scan.position.y = scanTop - ((t * 0.7) % 1) * 2.2;
    needle.rotation.set(0, turn, 1.1 + Math.abs(Math.sin(t * 9)) * 0.06);
    flags.forEach((flag, i) => (flag.rotation.y = 0.3 + Math.sin(t * 2.4 + i) * 0.35));
  });

  return { width: 4.9, height: 4.4, lookY: 1.6 };
}
