import { BoxGeometry, CylinderGeometry, Group, LatheGeometry, SphereGeometry, TorusGeometry, Vector2, Vector3 } from "three";
import { INK, MAGENTA, YELLOW, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { floor, wallLantern } from "@/lib/diorama-props";

/**
 * Huckster (P096): the jelly alien salesman has just come in under a flat's front door: a sheet
 * of slime still runs out from beneath it into the puddle he rises from, in a purple jacket, tie
 * and fedora, eyes on stalks and a huge grin, holding out a policy with a gold seal. With no
 * strength at all he cannot lift his own briefcase: his other arm stretches like taffy down to
 * it, and he drips on the doormat.
 */
export function huckster(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const SLIME = 0x8ee03c;
  const SLIME_DARK = 0x5aa02a;
  const SHINE = 0xd8ffa0;
  const SUIT = 0x4a2a5a;
  const WALL = 0x3a2a4e;
  const F = octagonBase(kit, 0x1f1d28);
  const G = floor(kit, F, 0.06, 0x2e2638, 0x221c2a, 0.4);

  // The hall of the flat: a wall, the front door with its frame and knob, a lamp, a coat stand.
  const wall = box(3.3, 2.7, 0.18, WALL, 0, G, -1.45, { delay: 0.1, ink: 1.02 });
  decorate(wall, new BoxGeometry(3.3, 0.06, 0.01), 0x2a1e3a, [[0, 0.9, 0.095]]);
  const DX = 0.75;
  const door = box(0.8, 1.86, 0.06, 0x4a2a3a, DX, G + 0.07, -1.33, { delay: 0.2 });
  decorate(door, new BoxGeometry(0.6, 0.7, 0.01), 0x5a3446, [
    [0, 1.3, 0.031],
    [0, 0.45, 0.031],
  ]);
  decorate(door, new CylinderGeometry(0.02, 0.02, 0.01, 10).rotateX(Math.PI / 2), INK, [[0, 1.55, 0.032]]);
  ball(0.045, YELLOW, DX + 0.3, G + 1.0, -1.28, { delay: 0.3 });
  [-0.45, 0.45].forEach((dx) => box(0.1, 2.0, 0.1, 0x2a1a26, DX + dx, G, -1.33, { delay: 0.22 }));
  box(1.0, 0.1, 0.1, 0x2a1a26, DX, G + 2.0, -1.33, { delay: 0.24 });
  const lantern = wallLantern(kit, -1.15, -1.36, G + 2.0, 0.3, 0xffe08a);
  const rack = cylinder(0.03, 0.03, 1.8, 0x3e3028, 1.55, G, -0.55, { delay: 0.3 }, 8);
  decorate(rack, new BoxGeometry(0.4, 0.03, 0.03), 0x3e3028, [[0, 1.6, 0, 0.5]]);
  cylinder(0.2, 0.22, 0.04, 0x3e3028, 1.55, G, -0.55, { delay: 0.3 }, 12);
  add(new CylinderGeometry(0.02, 0.12, 0.6, 8), MAGENTA, 1.47, G + 0.95, -0.52, { delay: 0.4, rotation: [0.1, 0, 0.12] });
  // The doormat, and slippers left by it.
  box(0.9, 0.02, 0.5, 0x6a2a3a, DX, G, -0.95, { delay: 0.3, noInk: true });
  [-0.1, 0.1].forEach((dx, i) => box(0.1, 0.06, 0.24, 0x2f6f86, 1.4 + dx, G, 0.1 + i * 0.04, { delay: 0.35, rotation: [0, -0.3, 0] }));

  // The slime: a sheet still coming out from under the door, and the puddle he rises from.
  const HX = -0.3;
  const HZ = -0.2;
  box(0.7, 0.03, 0.45, SLIME, DX, G, -1.08, { delay: 0.5, flat: true });
  box(1.0, 0.03, 0.4, SLIME, 0.25, G, -0.72, { delay: 0.52, flat: true, rotation: [0, 0.75, 0] });
  const puddle = add(new CylinderGeometry(0.75, 0.8, 0.04, 24).scale(1, 1, 0.8), SLIME, HX, G, HZ, { delay: 0.55 });
  decorate(puddle, new BoxGeometry(0.18, 0.01, 0.05), SHINE, [
    [-0.4, 0.042, 0.2],
    [0.45, 0.042, -0.1],
    [0.1, 0.042, 0.45],
  ]);

  // His body: a jelly column narrowing to the shoulders, turned to us.
  const FACE = 0.3;
  const cos = Math.cos(FACE);
  const sin = Math.sin(FACE);
  const at = (x: number, y: number, z: number): Point => [HX + x * cos + z * sin, G + y, HZ - x * sin + z * cos];
  const turn: Point = [0, FACE, 0];
  const body = add(
    new LatheGeometry(
      [
        [0.5, 0],
        [0.44, 0.08],
        [0.34, 0.3],
        [0.28, 0.7],
        [0.3, 1.1],
        [0.32, 1.38],
        [0.22, 1.5],
        [0, 1.55],
      ].map(([r, h]) => new Vector2(r, h)),
      20,
    ).scale(1, 1, 0.85),
    SLIME,
    HX,
    G + 0.02,
    HZ,
    { delay: 0.7, rotation: turn },
  );
  decorate(body, new BoxGeometry(0.04, 0.3, 0.02), SHINE, [
    [-0.14, 0.9, 0.26, 0.1],
    [-0.18, 0.45, 0.27, 0.15],
  ]);
  // The jacket, open at the front, lined in a darker purple, and the tie.
  const jacket = new CylinderGeometry(0.35, 0.36, 0.7, 18, 1, true, 0.55, Math.PI * 2 - 1.1).scale(1, 1, 0.88);
  add(jacket, SUIT, ...at(0, 0.78, 0), { delay: 0.9, rotation: turn });
  add(jacket.clone().scale(-0.97, 1, 0.97), 0x2e1a3a, ...at(0, 0.78, 0), { delay: 0.9, rotation: turn, noInk: true });
  [-1, 1].forEach((side) => add(new SphereGeometry(0.16, 12, 8), SUIT, ...at(side * 0.32, 1.3, 0), { delay: 0.95 }));
  const tie = box(0.1, 0.48, 0.03, 0x6a2a7a, ...at(0, 0.85, 0.27), { delay: 1.0, rotation: [-0.06, FACE, 0] });
  decorate(tie, new BoxGeometry(0.06, 0.48, 0.01), 0x8a3a9a, [[0, 0.24, 0.016]]);
  box(0.13, 0.09, 0.06, 0x6a2a7a, ...at(0, 1.33, 0.25), { delay: 1.02, rotation: turn });

  // The head: a blob with a grin full of teeth, a fedora, eyes on stalks.
  const head = add(new SphereGeometry(0.32, 18, 14).scale(1.05, 0.85, 0.95), SLIME, ...at(0, 1.42, 0.04), { delay: 1.1, rotation: turn });
  decorate(head, new BoxGeometry(0.3, 0.13, 0.02), 0x2a1018, [[0, 0.2, 0.29]]);
  decorate(head, new BoxGeometry(0.07, 0.022, 0.02), 0x2a1018, [
    [-0.17, 0.25, 0.28, 0.6],
    [0.17, 0.25, 0.28, -0.6],
  ]);
  decorate(head, new BoxGeometry(0.27, 0.045, 0.02), 0xf4f0e6, [[0, 0.235, 0.3]]);
  decorate(head, new BoxGeometry(0.2, 0.035, 0.02), 0xf4f0e6, [[0, 0.163, 0.3]]);
  decorate(head, new BoxGeometry(0.008, 0.045, 0.022), 0x8a9a80, [-0.09, -0.03, 0.03, 0.09].map((x) => [x, 0.235, 0.301] as Point));
  const crown = at(0.03, 1.92, -0.02);
  cylinder(0.3, 0.3, 0.025, SUIT, crown[0], crown[1], crown[2], { delay: 1.2, rotation: [0.1, FACE, -0.12] }, 20);
  const hat = cylinder(0.17, 0.2, 0.2, SUIT, crown[0], crown[1] + 0.02, crown[2], { delay: 1.22, rotation: [0.1, FACE, -0.12] }, 14);
  decorate(hat, new CylinderGeometry(0.2, 0.2, 0.05, 14), MAGENTA, [[0, 0.025, 0]]);
  const stalks = [-1, 1].map((side, i) => {
    const from = at(side * 0.16, 1.82, 0.08);
    const to = at(side * 0.4, 2.35, 0.14);
    const stalk = limb(kit, from, to, 0.05, 0.035, SLIME, { delay: 1.3 + i * 0.04 });
    const eye = ball(0.1, 0xf4f0e6, to[0], to[1] - 0.06, to[2], { delay: 1.36 + i * 0.04, rotation: turn });
    decorate(eye, new CylinderGeometry(0.045, 0.045, 0.02, 12).rotateX(Math.PI / 2), INK, [[side * -0.02, 0.1, 0.095]]);
    const length = new Vector3(...to).sub(new Vector3(...from)).length();
    return { stalk, eye, from, length, rest: stalk.rotation.clone() };
  });

  // His left arm holds out the policy, with its gold seal; his right stretches down to the briefcase.
  const shoulderR = at(0.32, 1.25, 0.02);
  const elbowR = at(0.5, 1.0, 0.3);
  const handR = at(0.45, 1.12, 0.62);
  limb(kit, shoulderR, elbowR, 0.11, 0.09, SLIME, { delay: 1.1 });
  limb(kit, elbowR, handR, 0.09, 0.08, SLIME, { delay: 1.12 });
  ball(0.1, SLIME, handR[0], handR[1] - 0.1, handR[2], { delay: 1.14 });
  const policy = box(0.24, 0.32, 0.01, 0xf4f0e6, handR[0], handR[1] - 0.05, handR[2] + 0.06, { delay: 1.4, rotation: [-0.2, FACE, -0.15] });
  decorate(policy, new BoxGeometry(0.16, 0.012, 0.005), 0x8a93a3, [0.27, 0.23, 0.19, 0.15].map((y) => [0, y, 0.007] as Point));
  decorate(policy, new CylinderGeometry(0.035, 0.035, 0.005, 12).rotateX(Math.PI / 2), YELLOW, [[0.06, 0.07, 0.007]]);
  const case_ = at(-0.85, 0, 0.15);
  const briefcase = box(0.5, 0.36, 0.14, 0x3a2440, case_[0], G, case_[2], { delay: 0.8, rotation: turn });
  decorate(briefcase, new BoxGeometry(0.05, 0.03, 0.01), YELLOW, [
    [-0.15, 0.3, 0.072],
    [0.15, 0.3, 0.072],
  ]);
  const grip = at(-0.85, 0.42, 0.15);
  add(new TorusGeometry(0.07, 0.018, 6, 14, Math.PI), INK, grip[0], G + 0.36, grip[2], { delay: 0.85, rotation: turn });
  const shoulderL = at(-0.32, 1.25, 0.02);
  const bend = at(-0.62, 0.8, 0.1);
  limb(kit, shoulderL, bend, 0.1, 0.07, SLIME, { delay: 1.15 });
  limb(kit, bend, grip, 0.07, 0.045, SLIME, { delay: 1.17 });
  ball(0.075, SLIME, grip[0], grip[1] - 0.075, grip[2], { delay: 1.19 });

  // Drops falling from his chin, the policy hand and the stretched arm.
  const drips: { drop: Group; from: Point; phase: number }[] = [at(0.05, 1.18, 0.25), handR, bend].map((from, i) => ({
    drop: add(new SphereGeometry(0.035, 8, 6).scale(1, 1.4, 1), i ? SLIME_DARK : SLIME, ...from, { delay: 1.5, noInk: true }),
    from: from as Point,
    phase: i * 0.37,
  }));

  const tipAt = new Vector3();
  tick((t) => {
    stalks.forEach(({ stalk, eye, from, length, rest }, i) => {
      stalk.rotation.set(rest.x + Math.sin(t * 1.9 + i * 1.7) * 0.1, rest.y, rest.z + Math.sin(t * 1.3 + i) * 0.1);
      tipAt.set(0, length, 0).applyEuler(stalk.rotation);
      eye.position.set(from[0] + tipAt.x, from[1] + tipAt.y - 0.06, from[2] + tipAt.z);
    });
    for (const { drop, from, phase } of drips) {
      const p = (t * 0.6 + phase) % 1;
      drop.position.set(from[0], from[1] - 0.12 - p * p * (from[1] - G - 0.1), from[2]);
      drop.visible = p < 0.95;
    }
    policy.rotation.z = -0.15 + Math.sin(t * 2.4) * 0.05;
    lantern.visible = Math.floor(t * 6) % 23 !== 11;
  });

  return { width: 4.9, height: 4.3, lookY: 1.4 };
}
