import { BoxGeometry, CylinderGeometry, Group, SphereGeometry } from "three";
import { MAGENTA, YELLOW, limb, octagonBase, zigzag, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, table } from "@/lib/diorama-props";

/**
 * Aerie (P070): the winged lookout in armoured flight gear has landed at a café table at the
 * foot of a telecom mast, wings half folded and the yellow goggles up on his forehead. He can
 * read a number plate a kilometre away, but not the menu: he holds it at arm's length and
 * squints, while the wings stir behind him and the mast's light blinks overhead.
 */
export function aerie(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick } = kit;
  const SUIT = 0x2f4a5a;
  const WING = 0x2a5a8a;
  const STEEL = 0x3a3f52;
  const CREAM = 0xe8e2d0;
  const F = octagonBase(kit, 0x1b1d28);
  const G = floor(kit, F, 0.06, 0x343448, 0x262636, 0.4);

  // The telecom mast: four legs, bracing, dishes, a blinking light.
  const MX = -1.45;
  const MZ = -1.05;
  const MH = 3.5;
  const leg = (sx: number, sz: number, h: number): Point => {
    const w = 0.38 - (0.28 * h) / MH;
    return [MX + sx * w, G + h, MZ + sz * w];
  };
  [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => limb(kit, leg(sx, sz, 0), leg(sx, sz, MH), 0.03, 0.03, STEEL, { delay: 0.1 })));
  const brace = (a: [number, number], b: [number, number]) => {
    const points: Point[] = [];
    for (let k = 0; k <= 8; k++) {
      const h = (k / 8) * MH * 0.95;
      const [sx, sz] = k % 2 ? a : b;
      points.push(leg(sx, sz, h));
    }
    return zigzag(kit, points, 0.02, STEEL, 0.15);
  };
  brace([-1, 1], [1, 1]);
  brace([1, 1], [1, -1]);
  [
    [2.3, 0.6],
    [2.8, -0.5],
  ].forEach(([h, turn], i) => add(new CylinderGeometry(0.2, 0.2, 0.06, 16).rotateX(Math.PI / 2), 0x9aa3b4, MX + 0.15, G + h, MZ + 0.2, { delay: 0.3 + i * 0.04, rotation: [0, turn, 0] }));
  const beacon = box(0.1, 0.1, 0.1, MAGENTA, MX, G + MH, MZ, { delay: 0.35, flat: true, noInk: true });

  // The café: a round table with a cup and a coin, a stool, a blank chalkboard of dishes.
  const top = table(kit, 0.55, 0.35, G, 0.3, true, 0x3a4050);
  decorate(top, new CylinderGeometry(0.1, 0.1, 0.01, 14), CREAM, [[0.1, 0.045, 0.05]]);
  cylinder(0.05, 0.04, 0.1, CREAM, 0.65, G + 0.79, 0.4, { delay: 0.4 }, 12);
  decorate(top, new CylinderGeometry(0.03, 0.03, 0.01, 12), YELLOW, [[-0.15, 0.045, 0.15]]);
  cylinder(0.24, 0.24, 0.05, 0x5e4a3a, -0.25, G + 0.5, 0.35, { delay: 0.32 }, 14);
  [-1, 1].forEach((s) => limb(kit, [-0.25 + s * 0.17, G, 0.35 + s * 0.05], [-0.25 + s * 0.08, G + 0.5, 0.35], 0.025, 0.025, 0x23222b, { delay: 0.3 }));
  const board = box(0.6, 0.85, 0.05, 0x1c2a2a, 1.55, G, 0.55, { delay: 0.45, rotation: [-0.18, -0.4, 0] });
  board.rotation.order = "YXZ";
  decorate(board, new BoxGeometry(0.12, 0.02, 0.01), 0xd8f0f0, Array.from({ length: 10 }, (_, k) => [(k % 2) * 0.22 - 0.12, 0.7 - Math.floor(k / 2) * 0.12, 0.03] as Point));
  box(0.6, 0.85, 0.05, 0x1c2a2a, 1.7, G, 0.15, { delay: 0.47, rotation: [0.18, -0.4, 0] }).rotation.order = "YXZ";

  // Aerie, seated, squinting at the menu at arm's length.
  const man = figure(kit, {
    x: -0.25,
    z: 0.35,
    y: G,
    facing: 0.3,
    height: 2.45,
    skin: 0xd9a682,
    hair: { style: "short", color: 0x1f1b22 },
    face: { mouth: "frown", brows: "angry" },
    top: { kind: "armor", color: SUIT, accent: 0x3a5a6a },
    bottom: { kind: "trousers", color: SUIT },
    shoes: 0x23222b,
    gloves: 0x23303a,
    arms: [[-1.0, 1.42, 0.55], [0.55, 0.9, 0.42]],
    legs: "sit",
    delay: 0.7,
  });
  const R = man.headRadius;
  const [hx, hy, hz] = man.head;
  add(new SphereGeometry(R * 1.1, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.42), 0x1f1b22, hx, hy + R * 0.34, hz - 0.03, { delay: 1.15, rotation: [-0.12, 0.3, 0] });
  // Goggles pushed up, yellow lenses.
  decorate(man.headPart, new BoxGeometry(0.3, 0.08, 0.05), YELLOW, [[0, R * 1.06 + 0.17, R * 0.72]]);
  decorate(man.headPart, new BoxGeometry(0.34, 0.03, 0.04), 0x23222b, [[0, R * 1.06 + 0.17, R * 0.66]]);
  // The menu, a folded card with lines he can't make out.
  const [hand] = man.hands;
  const menu = box(0.32, 0.42, 0.02, CREAM, hand[0] + 0.02, hand[1] - 0.12, hand[2] + 0.04, { delay: 1.4, rotation: [-0.1, 0.9, 0] });
  decorate(menu, new BoxGeometry(0.2, 0.018, 0.01), 0x6a6f80, Array.from({ length: 6 }, (_, k) => [0, 0.34 - k * 0.05, 0.012] as Point));
  decorate(menu, new BoxGeometry(0.24, 0.04, 0.01), MAGENTA, [[0, 0.38, 0.012]]);

  // The wings: a steel arm rising out from each shoulder blade, magenta-tipped feathers hanging from it.
  const wings = [-1, 1].map((s, i) => {
    const rise = 0.55;
    const along = (d: number): Point => [s * Math.cos(rise) * d, Math.sin(rise) * d, 0];
    const arm = box(0.12, 1.35, 0.07, STEEL, 0, 0, 0, { delay: 1.2 + i * 0.05, rotation: [0, 0, -s * (Math.PI / 2 - rise)] });
    const feathers = [0, 1, 2, 3, 4, 5].map((k) => {
      const length = 0.6 + k * 0.13;
      const feather = box(0.2, length, 0.04, k % 2 ? WING : 0x3a6a9a, ...along(0.22 + k * 0.21), {
        delay: 1.25 + i * 0.05 + k * 0.03,
        rotation: [0, 0, Math.PI + s * (0.1 + k * 0.16)],
      });
      decorate(feather, new BoxGeometry(0.2, 0.16, 0.045), MAGENTA, [[0, length - 0.08, 0]]);
      return feather;
    });
    feathers.push(arm);
    const wing = new Group();
    feathers[0].parent?.add(wing);
    feathers.forEach((feather) => wing.add(feather));
    const base = man.at(s * 0.2, 1.22, -0.3);
    wing.position.set(...base);
    wing.rotation.order = "YXZ";
    return wing;
  });

  tick((t) => {
    wings.forEach((wing, i) => {
      const s = i ? 1 : -1;
      wing.rotation.set(-0.15, 0.3 + s * (0.55 + Math.sin(t * 1.4) * 0.1), s * 0.1);
    });
    beacon.visible = Math.floor(t * 1.5) % 2 === 0;
    // Now and then he leans in, then back out again.
    man.headPart.rotation.z = Math.sin(t * 0.7) > 0.6 ? Math.sin(t * 3) * 0.06 : 0;
  });

  return { width: 4.9, height: 4.6, lookY: 1.65 };
}
