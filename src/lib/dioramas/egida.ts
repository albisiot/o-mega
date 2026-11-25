import { BoxGeometry, CylinderGeometry, Group, type Material, type Mesh, TorusGeometry } from "three";
import { YELLOW, jag, limb, octagonBase, zigzag, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { bollard, lamp } from "@/lib/diorama-props";

/**
 * Egida (P252): the knight of the border worlds on the harbour breakwater, concrete tetrapods
 * piled behind her, raising her honeycomb shield of light at a storm cloud. Its bolts strike the
 * shield one after another and she counts them: at every strike one more cell lights up. She
 * does not even frown; at her feet lies the price, a cracked phone she never learned to use.
 */
export function egida(kit: Kit): Framing {
  const { add, box, ball, decorate, tick, motes } = kit;
  const WATER = 0x0e3a4e;
  const DECK = 0x454c60;
  const CONCRETE = 0x7a8296;
  const CLOUD = 0x3a3552;
  const BOLT = 0xff6ad5;
  const CAPE = 0x3e4c4a;
  const F = octagonBase(kit, WATER);

  // The breakwater: a concrete walk across the base with water on both sides.
  const deck = box(4.2, 0.3, 1.7, DECK, 0, F, 0.1, { delay: 0.06, ink: 1.02 });
  decorate(deck, new BoxGeometry(0.014, 0.004, 1.7), 0x2c3040, [-1.4, -0.7, 0, 0.7, 1.4].map((x) => [x, 0.302, 0] as Point));
  const G = F + 0.3;
  bollard(kit, 1.55, 0.72, G, 0.3);
  bollard(kit, -1.25, 0.78, G, 0.32);
  const light = lamp(kit, -1.8, -0.45, G, 0.34, 2.0);
  const ripples = [
    [-0.7, 1.5],
    [0.9, 1.45],
  ].map(([x, z], k) => add(new TorusGeometry(0.3, 0.016, 6, 36).rotateX(Math.PI / 2), 0xcfeef7, x, F + 0.002, z, { delay: 0.4 + k * 0.1, flat: true, noInk: true }));

  // Tetrapods piled against its sea side: four legs from a knot, one always up.
  const tetrapod = (x: number, y: number, z: number, turn: number, tilt: number, delay: number) => {
    ball(0.15, CONCRETE, x, y - 0.15, z, { delay });
    const legs: Point[] = [[0, 1, 0], ...[0, 1, 2].map((k) => [0.943 * Math.cos(turn + (k * 2 * Math.PI) / 3), -0.333, 0.943 * Math.sin(turn + (k * 2 * Math.PI) / 3)] as Point)];
    legs.forEach(([dx, dy, dz], k) => {
      const ty = dy * Math.cos(tilt) - dz * Math.sin(tilt);
      const tz = dy * Math.sin(tilt) + dz * Math.cos(tilt);
      limb(kit, [x, y, z], [x + dx * 0.44, y + ty * 0.44, z + tz * 0.44], 0.13, 0.08, k % 2 ? CONCRETE : 0x6a7286, { delay: delay + 0.02 + k * 0.02 });
    });
  };
  tetrapod(-1.55, F + 0.12, -1.0, 0.3, 0, 0.14);
  tetrapod(-0.7, F + 0.12, -1.3, 1.1, 0.2, 0.18);
  tetrapod(0.2, F + 0.12, -1.42, 0.6, -0.1, 0.22);
  tetrapod(1.05, F + 0.12, -1.25, 1.6, 0.15, 0.26);
  tetrapod(-1.15, F + 0.55, -1.3, 2.0, 0.5, 0.3);
  tetrapod(0.65, F + 0.52, -1.5, 0.2, -0.4, 0.34);

  // The storm cloud over the water, front right.
  const C: Point = [1.55, G + 3.0, 0.95];
  const cloud = [
    [0, 0, 0, 0.36],
    [-0.38, -0.08, 0.05, 0.27],
    [0.36, -0.06, -0.06, 0.28],
    [0.06, 0.22, -0.05, 0.28],
    [-0.12, -0.14, 0.24, 0.24],
  ].map(([dx, dy, dz, r], k) => ball(r, k % 2 ? 0x2e2a44 : CLOUD, C[0] + dx, C[1] + dy - r, C[2] + dz, { delay: 0.5 + k * 0.04 }));

  // Egida: grey cloak, steel plate, short silver hair, the shield raised on her left arm.
  const knight = figure(kit, {
    x: -0.4,
    z: 0.1,
    y: G,
    facing: 0.55,
    height: 2.45,
    skin: 0xe0b49a,
    hair: { style: "short", color: 0x9aa0ae },
    face: { mouth: "neutral", brows: "calm", eyes: 0x4a6a8a, marks: 0xc09078 },
    top: { kind: "armor", color: 0x4e586e, accent: 0x7a86a0 },
    bottom: { kind: "trousers", color: 0x3e465a },
    shoes: 0x3a4050,
    gloves: 0x5a6478,
    belt: 0x5a3a28,
    cape: CAPE,
    arms: ["down", [0.22, 1.62, 0.55]],
    legs: "wide",
    delay: 0.8,
  });
  ball(0.17, CAPE, ...knight.at(0, 1.62, -0.24), { delay: 1.1 });
  ball(0.05, YELLOW, ...knight.at(-0.22, 1.64, 0.27), { delay: 1.2 });

  // The shield, built round its centre in a group turned towards the cloud.
  const PSI = 1.0;
  const S = knight.at(0.27, 1.72, 0.7);
  const disc = add(new CylinderGeometry(0.42, 0.42, 0.03, 28).rotateX(Math.PI / 2).scale(1, 1.31, 1), YELLOW, 0, -0.55, 0, { delay: 1.3, flat: true, noInk: true });
  const glass = (disc.children[0] as Mesh).material as Material;
  glass.transparent = true;
  glass.opacity = 0.3;
  glass.depthWrite = false;
  const rim = add(new TorusGeometry(0.42, 0.022, 6, 36).scale(1, 1.31, 1), YELLOW, 0, -0.579, 0, { delay: 1.32, flat: true, noInk: true });
  const cells: Point[] = [];
  [-0.36, -0.18, 0, 0.18, 0.36].forEach((hy, row) =>
    (row % 2 ? [-0.312, -0.104, 0.104, 0.312] : [-0.208, 0, 0.208]).forEach((hx) => cells.push([hx, hy, 0])),
  );
  decorate(disc, new TorusGeometry(0.115, 0.018, 3, 6).rotateZ(Math.PI / 2), 0xfff3b8, cells.map(([hx, hy]) => [hx, 0.55 + hy, 0] as Point));
  const fills = cells.map(([hx, hy], k) => add(new CylinderGeometry(0.095, 0.095, 0.04, 6).rotateX(Math.PI / 2), YELLOW, hx, hy - 0.095, 0, { delay: 1.35 + k * 0.01, flat: true, noInk: true }));
  const shield = new Group();
  shield.position.set(...S);
  shield.rotation.y = PSI;
  (disc.parent as Group).add(shield);
  [disc, rim, ...fills].forEach((part) => shield.add(part));
  // The order the cells light up in, one per strike.
  const rank = [8, 3, 12, 0, 15, 6, 10, 1, 13, 4, 16, 7, 2, 11, 5, 14, 9];

  // Three bolts from the cloud to the shield's face, and sparks where they hit.
  const onFace = (hx: number, hy: number): Point => [S[0] + hx * Math.cos(PSI) + 0.05 * Math.sin(PSI), S[1] + hy, S[2] - hx * Math.sin(PSI) + 0.05 * Math.cos(PSI)];
  const bolts = [
    [-0.15, 0.2, -0.2],
    [0.12, -0.12, 0],
    [0.02, 0.32, 0.22],
  ].map(([hx, hy, from], b) => zigzag(kit, jag([C[0] + from, C[1] - 0.3, C[2] + from * 0.5], onFace(hx, hy), 8, 0.1, b + 1), 0.035, BOLT, 1.6 + b * 0.05));
  const hit = onFace(0, 0.1);
  motes(10, 0xffc0ec, 0.028, [hit[0] - 0.2, hit[1] - 0.3, hit[2] - 0.1], [hit[0] + 0.45, hit[1] + 0.6, hit[2] + 0.4], 1.7);

  // The price at her feet: a phone she never learned to use, screen cracked.
  const phone = box(0.13, 0.025, 0.24, 0x1a1a24, ...knight.at(0.62, 0, 0.62), { delay: 1.5, rotation: [0, 1.2, 0] });
  decorate(phone, new BoxGeometry(0.11, 0.004, 0.2), 0x2a8fb0, [[0, 0.026, 0]]);
  decorate(phone, new BoxGeometry(0.008, 0.006, 0.16).rotateY(0.6), 0xe8f4f8, [[0.01, 0.028, 0.01]]);
  decorate(phone, new BoxGeometry(0.008, 0.006, 0.09).rotateY(-0.8), 0xe8f4f8, [[-0.02, 0.028, -0.04]]);

  const cloudRest = cloud.map((part) => part.position.y);
  tick((t) => {
    // A strike every 0.35 s, the bolts taking turns, two in the air at once; each strike lights one more cell.
    const strike = Math.floor(t / 0.35);
    bolts.forEach((bolt, b) => bolt.forEach((segment) => (segment.visible = (strike + 3 - b) % 3 < 2 && t % 0.35 < 0.27)));
    ripples.forEach((ring, k) => {
      const u = (t * 0.35 + k * 0.5) % 1;
      ring.children[0].scale.set(0.4 + u, 1, 0.4 + u);
      ring.visible = u < 0.85;
    });
    const lit = (7 + strike) % (cells.length + 1);
    fills.forEach((fill, k) => (fill.visible = rank[k] < lit));
    cloud.forEach((part, k) => (part.position.y = cloudRest[k] + Math.sin(t * 1.2 + k) * 0.03));
    light.visible = Math.floor(t * 6) % 17 !== 9;
  });

  return { width: 4.9, height: 4.6, lookY: 1.75 };
}
