import { BoxGeometry, Color, CylinderGeometry, ExtrudeGeometry, Group, Shape, TorusGeometry, Vector3 } from "three";
import { CYAN, MAGENTA, ORANGE, YELLOW, cable, colorOf, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, railing } from "@/lib/diorama-props";

/**
 * Paratia (P312): the dry-dock welder braced in her orange site exoskeleton under a ship's hull,
 * one hand on a hexagonal wall of light that bolts from a burst weld bounce off in sparks; with
 * the other arm she keeps back the apprentice who leans out to film it. The suit is slow: a
 * power cable tethers it to a cable drum.
 */
export function paratia(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const STEEL = 0x4a4f5c;
  const SUIT = 0x232a3a;
  const F = octagonBase(kit, 0x1e2230);
  const G = floor(kit, F, 0.06, 0x343a4a, 0x252a36, 0.6);

  // The ship in the dock, seen from the side: a raked bow, a magenta bottom, a row of portholes.
  const HX = -0.15;
  const HZ = -1.5;
  [-0.85, 0, 0.75].forEach((dx, i) => box(0.3, 0.3, 0.5, 0x5e4a3a, HX + dx, G, HZ, { delay: 0.1 + i * 0.02 }));
  const profile = (top: number) => {
    const shape = new Shape();
    shape.moveTo(-1.25, 0.4);
    shape.quadraticCurveTo(-1.25, 0, -0.9, 0);
    shape.lineTo(0.7, 0);
    shape.quadraticCurveTo(1.25, 0.05, 1.3, 0.85);
    if (top > 1) shape.lineTo(1.4, top);
    shape.lineTo(-1.25, top);
    shape.closePath();
    return new ExtrudeGeometry(shape, { depth: top > 1 ? 0.7 : 0.72, bevelEnabled: false, curveSegments: 10 }).translate(0, 0, top > 1 ? -0.35 : -0.36);
  };
  const side = add(profile(2.05), 0x2a3448, HX, G + 0.3, HZ, { delay: 0.14, ink: 1.02 });
  add(profile(0.85), 0x5a2448, HX, G + 0.3, HZ, { delay: 0.16, noInk: true });
  box(2.55, 0.06, 0.74, MAGENTA, HX + 0.03, G + 1.13, HZ, { delay: 0.2, flat: true, noInk: true });
  decorate(side, new CylinderGeometry(0.06, 0.06, 0.02, 12).rotateX(Math.PI / 2), CYAN, [-0.9, -0.45, 0, 0.45, 0.9].map((x) => [x, 1.5, 0.36] as Point));
  decorate(side, new BoxGeometry(2.5, 0.012, 0.01), 0x1a2030, [[0.05, 1.15, 0.355]]);
  railing(kit, [HX - 1.2, HZ + 0.3], [HX + 1.35, HZ + 0.3], G + 2.35, 0.3, 0.3, 0x8a93a3);

  // Scaffolding against the bow, and a gas bottle.
  [1.35, 1.85].forEach((x) => [-0.75, -1.2].forEach((z) => box(0.05, 2.5, 0.05, 0x8a93a3, x, G, z, { delay: 0.24, noInk: true })));
  [1.1, 2.1].forEach((y, i) => box(0.62, 0.05, 0.56, 0x5e4a3a, 1.6, G + y, -0.97, { delay: 0.28 + i * 0.03 }));
  limb(kit, [1.35, G + 0.1, -0.75], [1.85, G + 1.1, -0.75], 0.02, 0.02, 0x8a93a3, { delay: 0.3, noInk: true });
  cylinder(0.11, 0.11, 0.62, 0x2f6f86, 1.95, G, -0.25, { delay: 0.34 }, 12);
  ball(0.07, STEEL, 1.95, G + 0.6, -0.25, { delay: 0.36 });

  // The cable drum her suit is plugged into.
  const DRUM: Point = [-1.5, G, 1.0];
  const AX = 1.4;
  [-0.17, 0.17].forEach((d) => add(new CylinderGeometry(0.32, 0.32, 0.05, 18).rotateX(Math.PI / 2), 0x5e4a3a, DRUM[0] + d * Math.sin(AX), G, DRUM[2] + d * Math.cos(AX), { delay: 0.4, rotation: [0, AX, 0] }));
  add(new CylinderGeometry(0.25, 0.25, 0.3, 16).rotateX(Math.PI / 2), 0x1e1c24, DRUM[0], G + 0.07, DRUM[2], { delay: 0.42, rotation: [0, AX, 0] });

  // Paratia, braced wide: her left hand on the wall of light, her right arm holding the boy back.
  const P = figure(kit, {
    x: -0.35,
    z: 0.2,
    y: G,
    facing: 0.3,
    height: 2.4,
    skin: 0xe0b49a,
    hair: { style: "short", color: 0xa8acb6 },
    face: { mouth: "frown", brows: "angry" },
    top: { kind: "armor", color: SUIT, accent: ORANGE },
    bottom: { kind: "trousers", color: SUIT },
    shoes: 0x3a3f4e,
    gloves: 0x3a3f4e,
    belt: STEEL,
    arms: [[-0.8, 1.55, -0.2], [1.0, 1.65, 0.3]],
    legs: "wide",
    delay: 0.8,
  });
  const turn: [number, number, number] = [0, 0.3, 0];
  // The exoskeleton: braces along the legs, cuffs on the forearms, a frame and battery on the back.
  [-1, 1].forEach((s, i) => {
    limb(kit, P.at(s * 0.3, 1.0, 0.03), P.at(s * 0.39, 0.7, 0.06), 0.065, 0.06, ORANGE, { delay: 1.3 + i * 0.03 });
    ball(0.075, STEEL, ...below(P.at(s * 0.41, 0.66, 0.07), 0.075), { delay: 1.34 });
    limb(kit, P.at(s * 0.42, 0.56, 0.07), P.at(s * 0.47, 0.2, 0.05), 0.06, 0.055, ORANGE, { delay: 1.36 + i * 0.03 });
    const [elbow, hand] = [P.elbows[i], P.hands[i]];
    limb(kit, lerp(elbow, hand, 0.15), lerp(elbow, hand, 0.7), 0.12, 0.11, ORANGE, { delay: 1.4 });
  });
  const pack = box(0.42, 0.55, 0.18, STEEL, ...P.at(0, 1.05, -0.32), { delay: 1.3, rotation: turn });
  const charge = decorate(pack, new BoxGeometry(0.08, 0.08, 0.02), CYAN, [[0.1, 0.42, -0.095]]);
  [-0.14, 0.14].forEach((dx) => limb(kit, P.at(dx, 1.15, -0.3), P.at(dx * 1.1, 1.9, -0.26), 0.035, 0.035, ORANGE, { delay: 1.32 }));
  cable(kit, [P.at(-0.12, 1.1, -0.42), [-0.85, G + 0.55, 0.05], [-1.15, G + 0.06, 0.55], [DRUM[0] + 0.05, G + 0.33, DRUM[2]]], 0.035, 0x1e1c24, 1.45);

  // The wall of light: a hexagon standing on one point, honeycombed, its outer face to the danger.
  const PHI = 1.2;
  const n = new Vector3(Math.sin(PHI), 0, Math.cos(PHI));
  const [hx, , hz] = P.hands[1];
  const W = new Vector3(hx + n.x * 0.1 + n.z * 0.3, G + 1.25, hz + n.z * 0.1 - n.x * 0.3);
  const R = 0.88;
  const plate = add(new CylinderGeometry(R, R, 0.04, 6).rotateX(Math.PI / 2), 0x1a7fb0, W.x, W.y - R, W.z, { delay: 1.5, flat: true, rotation: [0, PHI, 0] });
  const comb: Point[] = [];
  for (let q = -3; q <= 3; q++)
    for (let r = -3; r <= 3; r++) {
      const [x, y] = [0.29 * (q + r / 2), 0.25 * r];
      if (Math.hypot(x, y) < 0.6) comb.push([x, R + y, 0.025], [x, R + y, -0.025]);
    }
  decorate(plate, new TorusGeometry(0.16, 0.012, 3, 6).rotateZ(Math.PI / 2), 0x9fe8ff, comb);
  add(new TorusGeometry(R, 0.04, 4, 6).rotateZ(Math.PI / 2), MAGENTA, W.x, W.y - R - 0.04, W.z, { delay: 1.55, flat: true, noInk: true, rotation: [0, PHI, 0] });
  box(0.05, W.y - R - G, 0.05, CYAN, W.x, G, W.z, { delay: 1.5, flat: true, noInk: true });
  cylinder(0.2, 0.24, 0.03, CYAN, W.x, G, W.z, { delay: 1.5, flat: true, noInk: true }, 6);

  // Bolts from the burst weld fly in, hit the wall and burst into sparks.
  const hit = W.clone().addScaledVector(n, 0.05).add(new Vector3(0, 0.25, 0));
  const from = new Vector3(2.0, G + 2.3, 1.0);
  const bolt = box(0.08, 0.08, 0.14, STEEL, from.x, from.y, from.z, { delay: 1.7 });
  const flash = box(0.3, 0.3, 0.02, YELLOW, hit.x, hit.y - 0.15, hit.z, { delay: 1.7, flat: true, noInk: true, rotation: [0, PHI, Math.PI / 4] });
  const sparks = Array.from({ length: 12 }, (_, k) => {
    const a = (k / 12) * Math.PI * 2;
    const v = n.clone().multiplyScalar(0.7 + (k % 3) * 0.3).add(new Vector3(Math.cos(a) * 0.5 * n.z, 0.6 + Math.sin(a) * 0.9, -Math.cos(a) * 0.5 * n.x));
    return { part: box(0.05, 0.05, 0.05, k % 2 ? YELLOW : ORANGE, hit.x, hit.y, hit.z, { delay: 1.7, flat: true, noInk: true }), v };
  });

  // The apprentice, filming on his phone, keeps leaning out from behind her.
  const A = figure(kit, {
    x: -1.3,
    z: -0.35,
    y: G,
    facing: 0.5,
    height: 2.1,
    build: "slim",
    skin: 0xc89070,
    hair: { style: "short", color: 0x3a2a22 },
    face: { mouth: "open", brows: "raised" },
    headwear: { kind: "hardhat", color: ORANGE },
    top: { kind: "jacket", color: 0x2a4a5a, accent: 0x9fb8c4 },
    bottom: { kind: "trousers", color: 0x2a3040 },
    arms: ["down", [0.25, 1.6, 0.45]],
    delay: 1.1,
  });
  const phone = A.hands[1];
  const screen = box(0.1, 0.17, 0.03, 0x1e1c24, phone[0], phone[1] - 0.05, phone[2] + 0.04, { delay: 1.6, rotation: [0, 0.5, 0] });
  decorate(screen, new BoxGeometry(0.08, 0.13, 0.01), CYAN, [[0, 0.085, -0.016]]);
  const foot = new Vector3(A.at(0, 0, 0)[0], G, A.at(0, 0, 0)[2]);
  const lean = new Group();
  A.parts[0].parent?.add(lean);
  lean.position.copy(foot);
  [...A.parts, screen].forEach((part) => {
    part.position.sub(foot);
    lean.add(part);
  });
  const axis = new Vector3(Math.cos(0.5), 0, -Math.sin(0.5));

  const dim = new Color(0x1a7fb0);
  const bright = new Color(0x48c8f4);
  tick((t) => {
    colorOf(plate).lerpColors(dim, bright, (Math.sin(t * 3) + 1) / 2);
    charge.color.set(Math.floor(t * 2) % 2 ? 0x0b3d50 : CYAN);
    lean.quaternion.setFromAxisAngle(axis, 0.1 + 0.1 * Math.sin(t * 1.3));
    const since = ((t + 0.5) % 1.5 + 1.5) % 1.5;
    bolt.visible = since < 0.4;
    bolt.position.lerpVectors(from, hit, Math.min(1, since / 0.4));
    const s = since - 0.4;
    flash.visible = s >= 0 && s < 0.25;
    sparks.forEach(({ part, v }) => {
      part.visible = s >= 0 && s < 0.6;
      part.position.set(hit.x + v.x * s, hit.y + v.y * s - 3 * s * s, hit.z + v.z * s);
    });
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}

function lerp(a: Point, b: Point, t: number): Point {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function below(p: Point, radius: number): Point {
  return [p[0], p[1] - radius, p[2]];
}
