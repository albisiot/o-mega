import { BoxGeometry, Color, CylinderGeometry, ExtrudeGeometry, Group, OctahedronGeometry, Shape, SphereGeometry, TorusGeometry, Vector2 } from "three";
import { CYAN, INK, MAGENTA, YELLOW, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { bollard, puddle, wallLantern } from "@/lib/diorama-props";

/**
 * Lagan (P125): the beast of the port heaves itself out of the black water onto the quay at
 * night, one claw on the kerb by a wallet he has just fished out, the other holding up a ring of
 * keys someone dropped: they are his now. His warty hide is crusted with coins, gems and pearls,
 * and a phone stuck on his head keeps ringing; he will never work out how to answer it.
 */
export function lagan(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const HIDE = 0x6a3c2c;
  const HIDE_DARK = 0x4e2a20;
  const BELLY = 0x8a5a3c;
  const STONE = 0x3e4458;
  const IVORY = 0xe8e0d0;
  const GOLD = 0xe0b040;
  const F = octagonBase(kit, 0x0e3a4e);

  // The quay: the front of the octagon, cut along a straight edge, with a stone kerb.
  const EDGE = 0.3;
  const Q = F + 0.22;
  const corners = Array.from({ length: 8 }, (_, k) => {
    const a = Math.PI / 8 + (k * Math.PI) / 4;
    return [2.36 * Math.sin(a), 2.36 * Math.cos(a)];
  });
  const outline: Vector2[] = [];
  corners.forEach((p, k) => {
    const q = corners[(k + 1) % 8];
    if (p[1] >= EDGE) outline.push(new Vector2(p[0], -p[1]));
    if (p[1] >= EDGE !== q[1] >= EDGE) {
      const u = (EDGE - p[1]) / (q[1] - p[1]);
      outline.push(new Vector2(p[0] + (q[0] - p[0]) * u, -EDGE));
    }
  });
  const quay = add(new ExtrudeGeometry(new Shape(outline), { depth: Q - F, bevelEnabled: false }).rotateX(-Math.PI / 2), STONE, 0, F, 0, { delay: 0.1, ink: 1.01 });
  const inner = 2.36 * Math.cos(Math.PI / 8) - 0.05;
  const half = (z: number) => Math.min(inner, inner * Math.SQRT2 - Math.abs(z));
  [0.85, 1.4].forEach((z) => decorate(quay, new BoxGeometry(2 * half(z), 0.004, 0.014), 0x363a4e, [[0, Q - F + 0.002, z]]));
  decorate(quay, new BoxGeometry(0.014, 0.004, 0.55), 0x363a4e, [-1.2, -0.4, 0.4, 1.2, -0.8, 0, 0.8].map((x, i) => [x, Q - F + 0.002, i < 4 ? 0.58 : 1.12] as Point));
  box(2 * half(EDGE) - 0.2, 0.08, 0.22, 0x5d6680, 0, Q, EDGE + 0.12, { delay: 0.16 });

  // The bollard with a lantern on a post, and a life ring.
  bollard(kit, 1.2, 0.72, Q, 0.3);
  cylinder(0.04, 0.05, 1.3, 0x23222b, 1.55, Q, 1.1, { delay: 0.32 }, 8);
  wallLantern(kit, 1.55, 1.1, Q + 1.25, 0.35, YELLOW);
  cylinder(0.04, 0.05, 1.0, 0x23222b, -1.5, Q, 1.05, { delay: 0.34 }, 8);
  const buoy = add(new TorusGeometry(0.2, 0.06, 8, 20), MAGENTA, -1.5, Q + 0.55, 1.11, { delay: 0.38, rotation: [0, 0.4, 0] });
  decorate(buoy, new BoxGeometry(0.08, 0.14, 0.14), 0xf2efe6, [
    [0.2, 0.26, 0],
    [-0.2, 0.26, 0],
    [0, 0.46, 0],
    [0, 0.06, 0],
  ]);

  // What he has just pulled out of the water: a wallet and coins by the kerb, in a puddle.
  puddle(kit, -0.45, 0.75, Q, 0.4, 0.5, CYAN);
  const wallet = box(0.2, 0.05, 0.14, 0x5a2a1e, -0.35, Q, 0.8, { delay: 0.45, rotation: [0, 0.5, 0] });
  decorate(wallet, new BoxGeometry(0.08, 0.01, 0.15), GOLD, [[0.04, 0.05, 0]]);
  [
    [-0.15, 0.95],
    [-0.05, 0.75],
    [0.1, 0.9],
  ].forEach(([x, z], i) => cylinder(0.045, 0.045, 0.015, GOLD, x, Q, z, { delay: 0.48 + i * 0.02 }, 10));

  // Lagan, up to his chest in the water.
  const body = add(new SphereGeometry(0.75, 20, 14).scale(1.25, 1, 0.95), HIDE, 0, F + 0.5 - 0.75, -0.5, { delay: 0.5 });
  ball(0.45, BELLY, 0, F + 0.42, 0.03, { delay: 0.55 });
  // What fell in the harbour, stuck to him: spots on an ellipsoid's front, by a fixed pattern.
  const crust = (part: Group, a: number, b: number, c: number, centre: number, count: number, low: number) => {
    const spots: Point[][] = [[], [], [], []];
    for (let i = 0; i < count; i++) {
      const theta = -1.35 + 2.7 * ((i * 0.618) % 1);
      const phi = low + (1.2 - low) * ((i * 0.381 + 0.2) % 1);
      spots[i % 4].push([a * 1.01 * Math.cos(phi) * Math.sin(theta), centre + b * 1.01 * Math.sin(phi), c * 1.01 * Math.cos(phi) * Math.cos(theta)]);
    }
    decorate(part, new CylinderGeometry(0.045, 0.045, 0.014, 10).rotateX(Math.PI / 2), GOLD, spots[0]);
    decorate(part, new OctahedronGeometry(0.045), MAGENTA, spots[1]);
    decorate(part, new OctahedronGeometry(0.04), CYAN, spots[2]);
    decorate(part, new SphereGeometry(0.03, 8, 6), IVORY, spots[3]);
  };
  crust(body, 0.94, 0.75, 0.71, 0.75, 40, -0.3);

  // His head: a wide warty skull and a hinged jaw full of teeth, frog eyes on top.
  const HZ = 0.05;
  const HY = F + 1.38;
  const skull = add(new SphereGeometry(0.5, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.3, 0.75, 1.05), HIDE, 0, HY, HZ, { delay: 0.7 });
  decorate(skull, new CylinderGeometry(0.47, 0.47, 0.01, 20).scale(1.3, 1, 1.05), 0x3a1a20, [[0, 0.008, 0]]);
  const teeth = (n: number) => Array.from({ length: n }, (_, i) => -1.15 + (2.3 * i) / (n - 1));
  decorate(
    skull,
    new CylinderGeometry(0.035, 0, 0.12, 5),
    IVORY,
    teeth(9).map((a) => [0.6 * Math.sin(a), -0.055, 0.49 * Math.cos(a)] as Point),
  );
  crust(skull, 0.65, 0.375, 0.525, 0, 16, 0.3);
  const jaw = new Group();
  const chin = add(new SphereGeometry(0.48, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(1.25, 0.55, 1.0), HIDE_DARK, 0, -0.264, 0.48, { delay: 0.75 });
  decorate(chin, new CylinderGeometry(0.45, 0.45, 0.01, 20).scale(1.25, 1, 1), 0x5a1a2a, [[0, 0.255, 0]]);
  decorate(
    chin,
    new CylinderGeometry(0, 0.03, 0.1, 5),
    IVORY,
    teeth(8).map((a) => [0.56 * Math.sin(a), 0.3, 0.45 * Math.cos(a)] as Point),
  );
  skull.parent?.add(jaw);
  jaw.add(chin);
  jaw.position.set(0, HY, HZ - 0.48);
  [-1, 1].forEach((side) => {
    const eye = ball(0.16, 0xffb020, side * 0.33, HY + 0.22, HZ + 0.05, { delay: 0.85, flat: true });
    decorate(eye, new BoxGeometry(0.035, 0.16, 0.02), INK, [[0, 0.17, 0.155]]);
    ball(0.17, HIDE, side * 0.33, HY + 0.17, HZ - 0.02, { delay: 0.83 });
  });
  // The phone stuck on his head, ringing.
  const phone = box(0.15, 0.26, 0.035, 0x23222b, -0.08, HY + 0.3, HZ + 0.08, { delay: 0.95, rotation: [-0.3, 0.25, 0.35] });
  const screen = decorate(phone, new BoxGeometry(0.115, 0.2, 0.01), 0x14303f, [[0, 0.13, 0.019]]);

  // The fin on his back, ribbed, a little ragged.
  const fan = new Shape();
  fan.moveTo(0, 0);
  fan.absarc(0, 0, 0.62, 0.15, Math.PI - 0.15, false);
  fan.closePath();
  const fin = add(new ExtrudeGeometry(fan, { depth: 0.04, bevelEnabled: false }), 0x7a4a30, -1.0, F + 0.9, -0.75, { delay: 0.6, rotation: [0, 0.45, 0.6] });
  decorate(fin, new BoxGeometry(0.02, 0.56, 0.01), HIDE_DARK, [0.35, 0.7, 1.05, 1.4, 1.75, 2.1, 2.45, 2.8].map((a) => [Math.cos(a) * 0.3, Math.sin(a) * 0.3, 0.045, a - Math.PI / 2] as [number, number, number, number]));

  // Arms: the right claw grips the kerb, the left holds up the keys.
  const claw = (at: Point, delay: number, turn: number) => {
    const hand = add(new SphereGeometry(0.16, 12, 8).scale(1.2, 0.6, 1.1), HIDE, at[0], at[1], at[2], { delay, rotation: [0, turn, 0] });
    decorate(hand, new CylinderGeometry(0, 0.035, 0.16, 5).rotateX(Math.PI / 2), 0x23222b, [-0.11, -0.035, 0.04, 0.11].map((x) => [x, 0.06, 0.2] as Point));
    return hand;
  };
  limb(kit, [-0.75, F + 0.9, -0.3], [-1.05, F + 0.7, 0.25], 0.2, 0.16, HIDE, { delay: 0.62 });
  ball(0.16, HIDE, -1.05, F + 0.54, 0.25, { delay: 0.64 });
  limb(kit, [-1.05, F + 0.7, 0.25], [-0.82, Q + 0.12, 0.6], 0.15, 0.12, HIDE, { delay: 0.66 });
  claw([-0.82, Q + 0.06, 0.57], 0.68, 0.3);
  limb(kit, [0.78, F + 0.95, -0.25], [1.15, F + 1.05, 0.2], 0.2, 0.16, HIDE, { delay: 0.62 });
  ball(0.16, HIDE, 1.15, F + 0.89, 0.2, { delay: 0.64 });
  const fist: Point = [0.98, F + 1.6, 0.47];
  limb(kit, [1.15, F + 1.05, 0.2], fist, 0.15, 0.12, HIDE, { delay: 0.66 });
  claw([fist[0], fist[1] - 0.08, fist[2]], 0.68, -0.4);
  // The keys on their ring, swinging from a claw.
  const keys = new Group();
  const ring = add(new TorusGeometry(0.08, 0.014, 6, 16), GOLD, 0, -0.16, 0, { delay: 1.2, rotation: [0, 0.4, 0] });
  const hung = [-0.5, 0, 0.5].map((lean, k) => {
    const key = box(0.035, 0.2, 0.012, k === 1 ? 0xc0c4cc : GOLD, Math.sin(lean) * 0.08, -0.38 + Math.cos(lean) * 0.02, 0.02, { delay: 1.25 + k * 0.03, rotation: [0, 0, lean * 0.5] });
    decorate(key, new CylinderGeometry(0.045, 0.045, 0.014, 10).rotateX(Math.PI / 2), k === 1 ? 0xc0c4cc : GOLD, [[0, 0.2, 0]]);
    return key;
  });
  ring.parent?.add(keys);
  keys.add(ring, ...hung);
  keys.position.set(fist[0] + 0.02, fist[1] - 0.06, fist[2] + 0.1);

  // Ripples where he rises, and the water running off him.
  const ripples = [0, 1, 2].map((k) =>
    add(new TorusGeometry(0.9 + k * 0.05, 0.02, 6, 40).rotateX(Math.PI / 2).scale(1.3, 1, 0.9), 0xcfeef7, 0, F + 0.002, -0.5, { delay: 0.9, flat: true, noInk: true }),
  );
  const drops = [
    [-0.7, F + 1.1, -0.05],
    [0.6, F + 1.0, 0.0],
    [1.12, F + 1.3, 0.45],
    [-0.3, F + 1.15, 0.25],
  ].map(([x, y, z], i) => ({ part: ball(0.03, 0x9fe8ff, x, y, z, { delay: 1.0, flat: true, noInk: true }), y, floor: z > EDGE ? Q : F, phase: i / 4 }));

  const ringOn = new Color(CYAN);
  const ringOff = new Color(0x14303f);
  tick((t) => {
    // The jaw works slowly; the keys swing; the phone rings now and then.
    jaw.rotation.x = 0.28 + Math.sin(t * 0.9) * 0.12;
    keys.rotation.z = Math.sin(t * 2.2) * 0.25;
    keys.rotation.x = Math.sin(t * 1.7) * 0.12;
    const ringing = t % 4 < 1.6;
    screen.color.copy(ringing ? ringOn : ringOff);
    phone.position.x = -0.08 + (ringing ? Math.sin(t * 60) * 0.008 : 0);
    ripples.forEach((r, k) => {
      const u = (t * 0.35 + k / 3) % 1;
      r.children[0].scale.set(0.7 + u * 0.6, 1, 0.7 + u * 0.6);
      r.children[0].visible = u < 0.85;
    });
    for (const d of drops) {
      const u = (t * 0.8 + d.phase) % 1;
      d.part.position.y = d.y - u * u * 1.3;
      d.part.visible = d.part.position.y > d.floor;
    }
  });

  return { width: 4.9, height: 4.2, lookY: 1.3 };
}
