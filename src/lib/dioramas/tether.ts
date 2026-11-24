import { BoxGeometry, CatmullRomCurve3, CylinderGeometry, Group, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { CYAN, INK, MAGENTA, YELLOW, aim, cable, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { column, floor, lamp, puddle } from "@/lib/diorama-props";

/**
 * Tether (P064): the masked girl in a black tracksuit stops a delivery van on a wet street of
 * the old town, under a Greek column: her coiled arm has shot across the whole street and grips
 * its bumper, a ripple running along the coils. The rest of her follows at her own pace, one
 * slow step at a time, and a snail is overtaking her.
 */
export function tether(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const SUIT = 0x1c1f2a;
  const VAN = 0x8a96b0;
  const DARK = 0x23222b;
  const F = octagonBase(kit, 0x1c1a26);
  const G = floor(kit, F, 0.06, 0x2a2838, 0x1c1a26, 0.42);
  column(kit, -1.45, -1.2, G, 0.15, 2.9, false, 0x5d6a90);
  const light = lamp(kit, -0.25, -1.65, G, 0.3, 2.2, MAGENTA);
  puddle(kit, 0.2, 0.2, G, 0.4, 0.45, YELLOW);
  puddle(kit, -0.7, 1.35, G, 0.45, 0.3, MAGENTA);

  // The delivery van, stopped dead, nose towards her, headlights on.
  const VX = 1.3;
  const VZ = -0.8;
  const VT = -2.35;
  const vanAt = (lx: number, ly: number, lz: number): Point => [VX + lx * Math.cos(VT) + lz * Math.sin(VT), G + ly, VZ - lx * Math.sin(VT) + lz * Math.cos(VT)];
  const turn: Point = [0, VT, 0];
  const cargo = box(1.0, 1.05, 0.86, VAN, ...vanAt(-0.25, 0.22, 0), { delay: 0.3, rotation: turn });
  decorate(cargo, new BoxGeometry(0.9, 0.04, 0.01), 0x6a7690, [[0, 0.75, 0.435], [0, 0.75, -0.435]]);
  const cab = box(0.55, 0.78, 0.86, VAN, ...vanAt(0.52, 0.22, 0), { delay: 0.34, rotation: turn });
  decorate(cab, new BoxGeometry(0.01, 0.3, 0.74), 0x16303e, [[0.28, 0.58, 0]]);
  decorate(cab, new BoxGeometry(0.36, 0.28, 0.01), 0x16303e, [[-0.02, 0.58, 0.435], [-0.02, 0.58, -0.435]]);
  decorate(cab, new BoxGeometry(0.02, 0.12, 0.16), YELLOW, [[0.28, 0.2, 0.3], [0.28, 0.2, -0.3]]);
  box(0.12, 0.12, 0.9, DARK, ...vanAt(0.82, 0.16, 0), { delay: 0.38, rotation: turn });
  [-0.55, 0.5].forEach((lx) =>
    [-0.44, 0.44].forEach((lz) => add(new CylinderGeometry(0.17, 0.17, 0.1, 14).rotateX(Math.PI / 2), DARK, ...vanAt(lx, 0, lz), { delay: 0.4, rotation: turn })),
  );

  // Tether, mid-step and in no hurry.
  const girl = figure(kit, {
    x: -1.2,
    z: 0.55,
    y: G,
    facing: 0.55,
    height: 2.3,
    build: "slim",
    skin: 0xd9a682,
    hair: { style: "wild", color: 0x1f1b22 },
    face: { mouth: "grin", brows: "angry", mask: "eyes" },
    top: { kind: "hoodie", color: SUIT, accent: CYAN },
    bottom: { kind: "trousers", color: SUIT },
    shoes: 0x2a2a34,
    arms: ["hip", [0.6, 1.55, 0.3]],
    legs: "stride",
    delay: 0.7,
  });

  // The arm: a coiled hose from her left hand across the street to the van's bumper.
  const hand = girl.hands[1];
  const grip = vanAt(0.9, 0.3, 0.32);
  const path = [hand, [hand[0] + 0.7, hand[1] + 0.45, hand[2] - 0.2], [0.35, G + 1.75, -0.2], [grip[0] - 0.35, grip[1] + 0.6, grip[2] + 0.15], grip] as Point[];
  cable(kit, path, 0.075, SUIT, 1.2);
  const curve = new CatmullRomCurve3(path.map((p) => new Vector3(...p)));
  const coils = Array.from({ length: 22 }, (_, k) => {
    const u = (k + 0.5) / 22;
    const p = curve.getPointAt(u);
    const ahead = curve.getPointAt(Math.min(1, u + 0.01));
    const from: Point = [p.x, p.y, p.z];
    return add(new TorusGeometry(0.1, 0.03, 6, 16).rotateX(Math.PI / 2), k % 3 === 1 ? CYAN : 0x2a2e3c, ...from, {
      delay: 1.25 + k * 0.02,
      rotation: aim(from, [ahead.x, ahead.y, ahead.z]).rotation,
    });
  });
  ball(0.12, SUIT, grip[0], grip[1] - 0.12, grip[2], { delay: 1.7 });
  [0, 1, 2].forEach((k) => box(0.05, 0.05, 0.16, SUIT, ...vanAt(0.92, 0.42 - k * 0.07, 0.2 + k * 0.05), { delay: 1.72, rotation: turn }));

  // The snail, overtaking her.
  const snail = new Group();
  const bits = [
    add(new SphereGeometry(0.07, 10, 8).scale(3.2, 0.8, 1), 0xb8c890, 0, 0, 0, { delay: 1.8 }),
    ball(0.13, 0x9a3a5a, -0.04, 0.06, 0, { delay: 1.84 }),
    cylinder(0.012, 0.012, 0.16, 0xb8c890, 0.17, 0.08, -0.03, { delay: 1.88, rotation: [0, 0, -0.4] }, 6),
    cylinder(0.012, 0.012, 0.16, 0xb8c890, 0.17, 0.08, 0.03, { delay: 1.88, rotation: [0, 0, -0.4] }, 6),
  ];
  decorate(bits[1], new TorusGeometry(0.07, 0.015, 6, 16), 0xe8c0d0, [[0, 0.13, 0.12]]);
  decorate(bits[1], new TorusGeometry(0.03, 0.012, 6, 12), 0xe8c0d0, [[0.01, 0.14, 0.125]]);
  decorate(bits[2], new SphereGeometry(0.025, 8, 6), INK, [[0, 0.17, 0]]);
  decorate(bits[3], new SphereGeometry(0.025, 8, 6), INK, [[0, 0.17, 0]]);
  bits[0].parent?.add(snail);
  bits.forEach((bit) => snail.add(bit));
  snail.rotation.y = 0.35;
  const SNAIL: Point = [-0.35, G, 1.05];

  const rest = girl.parts.map((part) => part.position.y);
  tick((t) => {
    // A ripple runs along the coils, from her hand to the van.
    coils.forEach((coil, k) => coil.children[0].scale.setScalar(1 + 0.3 * Math.max(0, Math.cos((k / 22) * 9 - t * 6)) ** 6));
    // She sways forward very slowly; the snail keeps going.
    const sway = Math.sin(t * 0.8) * 0.012;
    girl.parts.forEach((part, i) => (part.position.y = rest[i] + sway));
    const u = (t * 0.03) % 1;
    snail.position.set(SNAIL[0] + u * 0.8, SNAIL[1], SNAIL[2] - u * 0.3);
    light.visible = Math.floor(t * 6) % 19 !== 4;
  });

  return { width: 4.9, height: 4.3, lookY: 1.4 };
}
