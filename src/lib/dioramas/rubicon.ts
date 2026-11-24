import { BoxGeometry, ConeGeometry, CylinderGeometry, Group, SphereGeometry, TorusGeometry } from "three";
import { CYAN, INK, MAGENTA, cable, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, lamp, rubble } from "@/lib/diorama-props";

/**
 * Rubicon (P026): the biker gang's boss under the ring-road overpass at night, astride his
 * chopper with the engine running, blue flames from the exhausts, grinning and holding up in his
 * fist the brake cables he cut and sold. The price of no brakes and a fragile body: a pillar
 * cracked where he hit it, rubble and a skid mark, a plaster on his cheek and a bandaged knee.
 */
export function rubicon(kit: Kit): Framing {
  const { add, box, ball, decorate, tick } = kit;
  const CONCRETE = 0x4a5064;
  const CHROME = 0x8a93a3;
  const DARK = 0x1c1c24;
  const TANK = 0x8a1f52;
  const PALE = 0xe8e2d0;
  const F = octagonBase(kit, 0x1d1f28);
  const G = floor(kit, F, 0.06, 0x2a2c36, 0x22242c, 0);

  // The road: lane dashes and the skid mark that ends at the cracked pillar.
  [-1.2, -0.6, 0, 0.6, 1.2].forEach((x, i) => box(0.35, 0.006, 0.06, PALE, x, G, 1.45, { delay: 0.1 + i * 0.02, flat: true, noInk: true }));
  [0, 1, 2, 3].forEach((k) => box(0.36, 0.006, 0.1, 0x14141a, -0.45 - k * 0.28, G, 0.2 - k * 0.32, { delay: 0.15, flat: true, noInk: true, rotation: [0, 0.85, 0] }));

  // The overpass: two pillars and the deck over them, its lamps lit.
  const left = box(0.42, 2.9, 0.42, CONCRETE, -1.3, G, -1.0, { delay: 0.1, ink: 1.02 });
  decorate(left, new BoxGeometry(0.012, 0.22, 0.01), INK, [
    [0.02, 1.25, 0.211, 0.4],
    [-0.08, 1.4, 0.211, -0.5],
    [0.1, 1.13, 0.211, -0.8],
    [-0.06, 1.07, 0.211, 0.9],
    [0.12, 1.43, 0.211, 0.2],
    [-0.1, 1.22, 0.211, 1.3],
  ]);
  decorate(left, new BoxGeometry(0.18, 0.16, 0.01), 0x6a7088, [[0.0, 1.25, 0.212, 0.3]]);
  rubble(kit, -1.15, -0.6, G, 0.2, 5, 0.25, 0x5a6074);
  box(0.42, 2.9, 0.42, CONCRETE, 1.25, G, -1.15, { delay: 0.12, ink: 1.02 });
  const deck = box(3.4, 0.35, 0.7, 0x3a4054, 0, G + 2.9, -1.15, { delay: 0.2, ink: 1.02 });
  decorate(deck, new BoxGeometry(3.4, 0.04, 0.01), MAGENTA, [[0, 0.1, 0.351]]);
  box(3.4, 0.12, 0.05, 0x2a2e3e, 0, G + 3.25, -0.83, { delay: 0.25 });
  const lights = [lamp(kit, -1.1, -1.3, G + 3.25, 0.3, 0.7, MAGENTA), lamp(kit, 0.7, -1.3, G + 3.25, 0.32, 0.7, MAGENTA)];

  // The chopper, built in its own frame: forward along its length, x to its left.
  const PHI = 1.2;
  const BX = -0.05;
  const BZ = 0.3;
  const c = Math.cos(PHI);
  const s = Math.sin(PHI);
  const at = (lx: number, ly: number, lz: number): Point => [BX + lx * c + lz * s, G + ly, BZ - lx * s + lz * c];
  const turn: Point = [0, PHI, 0];
  const bike: Group[] = [];
  [-0.85, 0.95].forEach((lz, i) => {
    const [x, , z] = at(0, 0, lz);
    bike.push(add(new TorusGeometry(0.32, 0.08, 8, 22).rotateY(Math.PI / 2), DARK, x, G, z, { delay: 0.5 + i * 0.04, rotation: turn }));
    bike.push(add(new CylinderGeometry(0.1, 0.1, 0.12, 12).rotateZ(Math.PI / 2), CHROME, x, G + 0.3, z, { delay: 0.56 + i * 0.04, rotation: turn }));
  });
  const engine = at(0, 0.24, 0.1);
  bike.push(box(0.3, 0.32, 0.5, 0x3a3f4c, engine[0], engine[1], engine[2], { delay: 0.6, rotation: turn }));
  bike.push(limb(kit, at(0, 0.4, -0.85), at(0, 0.62, 0.0), 0.04, 0.04, DARK, { delay: 0.62 }));
  bike.push(limb(kit, at(0, 0.45, 0.15), at(0, 0.95, 0.6), 0.045, 0.045, DARK, { delay: 0.62 }));
  const tank = at(0, 0.66, 0.32);
  bike.push(add(new SphereGeometry(0.2, 14, 10).scale(0.6, 0.6, 1.35), TANK, tank[0], tank[1], tank[2], { delay: 0.66, rotation: turn }));
  const seat = at(0, 0.54, -0.28);
  bike.push(box(0.26, 0.08, 0.62, DARK, seat[0], seat[1], seat[2], { delay: 0.68, rotation: turn }));
  [-1, 1].forEach((side) => bike.push(limb(kit, at(side * 0.09, 0.4, 0.95), at(side * 0.09, 1.05, 0.62), 0.03, 0.03, CHROME, { delay: 0.7 })));
  bike.push(limb(kit, at(-0.4, 1.12, 0.55), at(0.4, 1.12, 0.55), 0.025, 0.025, CHROME, { delay: 0.72, noInk: true }));
  const light = at(0, 0.84, 0.74);
  const head = add(new CylinderGeometry(0.11, 0.09, 0.1, 14).rotateX(Math.PI / 2), DARK, light[0], light[1], light[2], { delay: 0.74, rotation: turn });
  decorate(head, new CylinderGeometry(0.085, 0.085, 0.01, 14).rotateX(Math.PI / 2), CYAN, [[0, 0.11, 0.055]]);
  bike.push(head);
  // Exhausts on the near side, blue flames at their ends.
  const flames: Group[] = [];
  [0, 0.12].forEach((dy, i) => {
    bike.push(limb(kit, at(-0.2, 0.22 + dy, 0.15), at(-0.24, 0.3 + dy, -1.05), 0.04, 0.045, CHROME, { delay: 0.76 + i * 0.03 }));
    const end = at(-0.24, 0.3 + dy - 0.07, -1.23);
    flames.push(add(new ConeGeometry(0.07, 0.36, 8).rotateX(-Math.PI / 2), CYAN, end[0], end[1], end[2], { delay: 1.6 + i * 0.05, flat: true, noInk: true, rotation: turn }));
  });

  // Rubicon astride it: blond spikes, black leather, one hand on the bars, the cables held up.
  const where = at(0, 0, -0.22);
  const rider = figure(kit, {
    x: where[0],
    z: where[2],
    y: G,
    facing: PHI,
    height: 2.4,
    skin: 0xe0aa98,
    hair: { style: "spiky", color: 0xf0e0a0 },
    face: { mouth: "grin", brows: "angry" },
    top: { kind: "jacket", color: 0x1c1c26, accent: 0x34344a },
    bottom: { kind: "trousers", color: 0x23283a },
    gloves: 0x16161c,
    shoes: DARK,
    arms: [
      [-0.45, 2.35, 0.12],
      [0.38, 1.12, 0.75],
    ],
    legs: "sit",
    delay: 0.9,
  });
  // He turns his head to grin at us; a plaster on his cheek, a bandage round his knee.
  rider.headPart.rotation.y = PHI - 0.55;
  const RH = rider.headRadius;
  decorate(rider.headPart, new BoxGeometry(0.1, 0.035, 0.012), PALE, [
    [-0.1, RH * 1.06 - 0.06, RH * 0.76, 0.5],
    [-0.1, RH * 1.06 - 0.06, RH * 0.76, -0.5],
  ]);
  const cap = add(new SphereGeometry(RH * 1.04, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.97, 1.06, 1), 0xf0e0a0, ...rider.head, { delay: 1.3 });
  cap.rotation.order = "YXZ";
  cap.rotation.set(-0.5, PHI - 0.55, 0);
  rider.parts.push(cap);
  const knee = rider.at(-0.17, 0.53, 0.48);
  ball(0.135, PALE, knee[0], knee[1], knee[2], { delay: 1.5 });
  // The cut brake cables dangling from his fist.
  const [fist] = rider.hands;
  [
    [-0.06, 0.04, 0.0],
    [0.05, -0.02, 0.06],
    [0.0, 0.08, -0.05],
  ].forEach(([dx, dz, lean], k) => {
    const end: Point = [fist[0] + dx + lean, fist[1] - 0.55 - k * 0.08, fist[2] + dz];
    cable(kit, [[fist[0], fist[1] - 0.05, fist[2]], [fist[0] + dx * 0.5, fist[1] - 0.3, fist[2] + dz + 0.04], end], 0.012, CHROME, 1.6 + k * 0.04);
    ball(0.025, CYAN, end[0], end[1] - 0.025, end[2], { delay: 1.7 + k * 0.04, flat: true, noInk: true });
  });

  const shaking = [...bike, ...rider.parts];
  const rest = shaking.map((part) => part.position.y);
  tick((t) => {
    // The engine idles: everything shivers; the flames lick; the overpass lamps buzz.
    const shiver = Math.sin(t * 47) * 0.006;
    shaking.forEach((part, i) => (part.position.y = rest[i] + shiver));
    flames.forEach((f, i) => f.children[0].scale.set(1, 1, 1 + Math.sin(t * 13 + i * 2) * 0.3));
    lights[1].visible = Math.floor(t * 8) % 17 !== 5;
  });

  return { width: 4.9, height: 4.5, lookY: 1.7 };
}
