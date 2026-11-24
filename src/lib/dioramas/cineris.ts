import { BoxGeometry, Color, CylinderGeometry, type MeshBasicMaterial, SphereGeometry } from "three";
import { ORANGE, YELLOW, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { facade, flame, floor, rubble } from "@/lib/diorama-props";

/**
 * Cineris (P071): the pale gentleman in a magenta greatcoat stands smiling before a burnt-out
 * house, one hand raised and burning. Everything he touches catches: the door frame beside him
 * glows with his handprints. His own hands burn too, crumbling into ash that falls round his
 * feet while embers drift up; that is why he shakes no one's hand.
 */
export function cineris(kit: Kit): Framing {
  const { add, box, decorate, tick, motes } = kit;
  const COAT = 0xa01848;
  const CHAR = 0x2a2228;
  const ASH = 0x8a8590;
  const F = octagonBase(kit, 0x1c1a22);
  const G = floor(kit, F, 0.06, 0x2c2a32, 0x1e1c24, 0.5);

  // The burnt house: blackened front, empty windows, a few still glowing inside, cracks of fire.
  const house = facade(kit, -0.2, -1.45, G, 0.1, { width: 2.8, height: 2.9, color: 0x3a2e3a, windows: 4, floors: 2, lit: ORANGE, shutters: 0x1a1418 });
  decorate(house, new BoxGeometry(0.5, 0.9, 0.01), CHAR, [
    [-0.95, 1.6, 0.156, 0.2],
    [0.4, 2.3, 0.156, -0.3],
    [1.1, 1.0, 0.156, 0.1],
  ]);
  decorate(house, new BoxGeometry(0.03, 0.5, 0.01), ORANGE, [
    [-0.4, 0.5, 0.158, 0.5],
    [-0.25, 0.85, 0.158, -0.3],
    [0.9, 2.1, 0.158, 0.4],
  ]);
  rubble(kit, -1.2, -0.95, G, 0.3, 5, 0.45, 0x3a3440);

  // The door frame beside him, scorched with his handprints.
  const DX = 1.25;
  const DZ = -0.55;
  const turn: [number, number, number] = [0, -0.55, 0];
  const post = box(0.16, 2.1, 0.16, 0x4a3a34, DX - 0.42, G, DZ - 0.27, { delay: 0.3, rotation: turn });
  box(0.16, 2.1, 0.16, 0x4a3a34, DX + 0.42, G, DZ + 0.27, { delay: 0.32, rotation: turn });
  box(1.05, 0.16, 0.18, 0x4a3a34, DX, G + 2.1, DZ, { delay: 0.34, rotation: turn });
  const door = box(0.7, 2.0, 0.06, CHAR, DX, G, DZ - 0.05, { delay: 0.36, rotation: turn });
  const palms: MeshBasicMaterial[] = [];
  /** A hand: a palm and fingers, flat, glowing. */
  const print = (part: typeof post, x: number, y: number, z: number, lean: number) => {
    palms.push(decorate(part, new BoxGeometry(0.15, 0.16, 0.01), ORANGE, [[x, y, z, lean]]));
    decorate(
      part,
      new BoxGeometry(0.03, 0.12, 0.01),
      ORANGE,
      [-0.054, -0.018, 0.018, 0.054].map((dx) => [x + dx * Math.cos(lean) - 0.13 * Math.sin(lean), y + 0.13 * Math.cos(lean) + dx * Math.sin(lean), z, lean] as [number, number, number, number]),
    );
    decorate(
      part,
      new BoxGeometry(0.03, 0.09, 0.01),
      ORANGE,
      [[x + 0.1 * Math.cos(lean), y + 0.1 * Math.sin(lean) + 0.01, z, lean - 1.0]],
    );
  };
  print(post, 0, 1.4, 0.085, 0.2);
  print(door, 0.1, 1.0, 0.035, -0.3);
  print(door, -0.15, 1.5, 0.035, 0.4);
  decorate(door, new SphereGeometry(0.05, 8, 6).scale(1, 1.6, 1), ORANGE, [[0.25, 0.95, 0.04]]);

  // Cineris, smiling, his right hand up and burning.
  const man = figure(kit, {
    x: -0.25,
    z: 0.45,
    y: G,
    facing: 0.4,
    height: 2.5,
    build: "slim",
    skin: 0xd8c0b8,
    hair: { style: "bald", color: 0x2a2228 },
    face: { mouth: "smirk", brows: "raised" },
    top: { kind: "coat", color: COAT, accent: 0x22202a },
    bottom: { kind: "trousers", color: 0x22202a },
    shoes: 0x14121c,
    gloves: ORANGE,
    arms: [[-0.55, 1.95, 0.5], [0.62, 1.2, 0.4]],
    delay: 0.7,
  });
  const at = man.at;
  const R = man.headRadius;
  const [hx, hy, hz] = man.head;
  // Hair slicked back off a high forehead.
  const hair = add(new SphereGeometry(R * 1.1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0x2a2228, hx, hy + R * 0.12, hz - 0.02, { delay: 1.15, rotation: [-0.45, 0.4, 0] });
  hair.rotation.order = "YXZ";
  // The high collar of the greatcoat, and a tie on his dark waistcoat.
  [-1, 1].forEach((s) => {
    const collar = box(0.26, 0.44, 0.04, COAT, ...at(s * 0.17, 1.8, -0.06), { delay: 1.1, rotation: [-0.2, 0.4 - s * 0.7, -s * 0.3] });
    collar.rotation.order = "YXZ";
  });
  box(0.05, 0.32, 0.02, 0x5a1020, ...at(0, 1.3, 0.27), { delay: 1.15, noInk: true, rotation: [0.12, 0.4, 0] });

  // His burning hands: flames on them, ash falling from them, a little heap of it at his feet.
  const fires = man.hands.map((hand, i) =>
    [-0.07, 0, 0.07].map((dx, j) => {
      const size = (j === 1 ? 0.6 : 0.4) * (i ? 0.85 : 1);
      const tongue = flame(kit, hand[0] + dx, hand[2] + 0.02, hand[1] - 0.04, 1.3 + i * 0.05 + j * 0.02, size);
      tongue.forEach((part) => (part.rotation.z = -dx * 4));
      return tongue;
    }).flat(),
  );
  add(new SphereGeometry(0.28, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.2, 0.35, 1), ASH, ...at(0.55, 0, 0.45), { delay: 0.6 });
  add(new SphereGeometry(0.16, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.2, 0.35, 1), ASH, ...at(-0.55, 0, 0.55), { delay: 0.62 });
  add(new CylinderGeometry(0.5, 0.5, 0.006, 20).scale(1.2, 1, 0.8), 0x18161c, ...at(0, 0, 0.1), { delay: 0.5, flat: true, noInk: true });
  const flakes = Array.from({ length: 8 }, (_, k) => {
    const hand = man.hands[k % 2];
    const from: Point = [hand[0] + ((k * 7) % 5) * 0.03 - 0.06, hand[1] - 0.08, hand[2] + ((k * 3) % 4) * 0.03 - 0.04];
    return { part: box(0.05, 0.012, 0.04, k % 3 ? ASH : 0x5a5560, ...from, { delay: 1.5 + k * 0.02, noInk: true }), from, k };
  });
  man.hands.forEach((hand, i) => motes(8, i ? YELLOW : ORANGE, 0.025, [hand[0] - 0.2, hand[1], hand[2] - 0.2], [hand[0] + 0.2, hand[1] + 1.4, hand[2] + 0.2], 1.4));

  const hot = new Color(ORANGE);
  const hotter = new Color(YELLOW);
  tick((t) => {
    fires.forEach((fire, i) => fire.forEach((tongue, j) => tongue.children[0].scale.set(1, 1 + Math.sin(t * (13 + j * 3) + i) * 0.22, 1)));
    flakes.forEach(({ part, from, k }) => {
      const u = (t * 0.45 + k / 8) % 1;
      part.position.set(from[0] + Math.sin(u * 9 + k) * 0.08, from[1] - (from[1] - G) * u, from[2] + Math.cos(u * 7 + k) * 0.06);
      part.rotation.set(u * 6 + k, k, u * 4);
    });
    palms.forEach((palm, k) => palm.color.lerpColors(hot, hotter, (Math.sin(t * 2.5 + k * 1.7) + 1) / 2));
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}
