import { BoxGeometry, Color, CylinderGeometry, TorusGeometry, type Group } from "three";
import { CYAN, YELLOW, colorOf, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, sign, table, wallLantern } from "@/lib/diorama-props";

/**
 * Penates (P206): the old couple of Isolato 7, arm in arm in their Sunday coats on the cobbled
 * lane at dusk, he in his hat with a newspaper twenty-six years old under his arm, she with her
 * stiff black handbag, both smiling up at the windows. Every window of the block is lit, one
 * going off and on as if someone moved from room to room, geraniums on the balcony; nobody lives
 * there. Out in the lane the table is laid for three, three chairs waiting.
 */
export function penates(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick } = kit;
  const WALL = 0x3a2f4e;
  const CURTAIN = 0xece6d6;
  const PLATE = 0xf0ece0;
  const F = octagonBase(kit, 0x1f1d28);
  const G = floor(kit, F, 0.06, 0x4a3a40, 0x2e2430, 0.3);

  // The block: a house front of lit windows with white curtains, a balcony of pots, a door.
  const WX = -0.15;
  const WZ = -1.4;
  const wall = box(3.2, 2.9, 0.3, WALL, WX, G, WZ, { delay: 0.1, ink: 1.02 });
  const front = WZ + 0.16;
  const panes: Group[] = [];
  [0.78, 1.58, 2.38].forEach((wy, f) =>
    [-1.2, -0.4, 0.4, 1.2].forEach((wx, k) => {
      if (f === 0 && k === 1) return;
      const pane = box(0.28, 0.38, 0.02, YELLOW, WX + wx, G + wy - 0.19, front, { delay: 0.2 + (f * 4 + k) * 0.02, flat: true, noInk: true });
      decorate(pane, new BoxGeometry(0.08, 0.38, 0.012), CURTAIN, [
        [-0.1, 0.19, 0.012],
        [0.1, 0.19, 0.012],
      ]);
      decorate(pane, new BoxGeometry(0.28, 0.06, 0.012), CURTAIN, [[0, 0.36, 0.012]]);
      panes.push(pane);
    }),
  );
  decorate(
    wall,
    new BoxGeometry(0.36, 0.05, 0.06),
    0x5a4a6e,
    [0.57, 1.37, 2.17].flatMap((y, f) => [-1.2, -0.4, 0.4, 1.2].filter((_, k) => !(f === 0 && k === 1)).map((x) => [x, y, 0.16] as Point)),
  );
  decorate(wall, new BoxGeometry(0.4, 0.66, 0.02), 0x241c30, [[-0.4, 0.33, 0.155]]);
  const light = wallLantern(kit, WX - 0.85, WZ + 0.15, G + 1.2, 0.3, YELLOW);
  box(1.0, 0.05, 0.28, 0x5a4a6e, WX + 0.8, G + 1.3, WZ + 0.28, { delay: 0.4 });
  box(1.0, 0.24, 0.02, 0x23222b, WX + 0.8, G + 1.35, WZ + 0.42, { delay: 0.42, noInk: true });
  [0.5, 0.8, 1.1].forEach((dx, k) => {
    cylinder(0.07, 0.05, 0.1, 0xb0603a, WX + dx, G + 1.35, WZ + 0.28, { delay: 0.45 + k * 0.02 }, 10);
    const bloom = cylinder(0.08, 0.06, 0.08, 0x2f8f4f, WX + dx, G + 1.45, WZ + 0.28, { delay: 0.47 + k * 0.02 }, 10);
    decorate(bloom, new BoxGeometry(0.04, 0.04, 0.04), k === 1 ? YELLOW : 0xc83a6a, [
      [-0.03, 0.09, 0.03],
      [0.03, 0.1, -0.02],
    ]);
  });
  sign(kit, -1.62, 0.9, G, 0.5, CYAN, 1.8);

  // The table laid for three, out in the lane, and three empty chairs.
  const TX = 1.45;
  const TZ = 0.72;
  const top = table(kit, TX, TZ, G, 0.55, true, 0x4a3f5e, 0.7);
  decorate(
    top,
    new CylinderGeometry(0.09, 0.09, 0.012, 16),
    PLATE,
    [0, 1, 2].map((k) => [Math.sin((k * Math.PI * 2) / 3 + 0.4) * 0.24, 0.045, Math.cos((k * Math.PI * 2) / 3 + 0.4) * 0.24] as Point),
  );
  decorate(
    top,
    new CylinderGeometry(0.025, 0.02, 0.07, 8),
    0xbfeeff,
    [0, 1, 2].map((k) => [Math.sin((k * Math.PI * 2) / 3 + 0.9) * 0.2, 0.075, Math.cos((k * Math.PI * 2) / 3 + 0.9) * 0.2] as Point),
  );
  [0, 1, 2].forEach((k) => {
    const a = (k * Math.PI * 2) / 3 + 0.4;
    const cx = TX + Math.sin(a) * 0.55;
    const cz = TZ + Math.cos(a) * 0.55;
    box(0.3, 0.04, 0.3, 0x5e4a3a, cx, G + 0.42, cz, { delay: 0.6 + k * 0.03, rotation: [0, a, 0] });
    [-1, 1].forEach((side) => box(0.035, 0.42, 0.035, 0x3e3028, cx + side * 0.11 * Math.cos(a), G, cz - side * 0.11 * Math.sin(a), { delay: 0.6, noInk: true }));
    box(0.3, 0.36, 0.04, 0x5e4a3a, cx + Math.sin(a) * 0.14, G + 0.46, cz + Math.cos(a) * 0.14, { delay: 0.62 + k * 0.03, rotation: [0, a, 0] });
  });

  // The couple, arm in arm, half a metre apart.
  const along = [Math.cos(0.35), -Math.sin(0.35)];
  const MX = -0.66;
  const MZ = 0.62;
  const husband = figure(kit, {
    x: MX,
    z: MZ,
    y: G,
    facing: 0.3,
    height: 2.45,
    build: "normal",
    skin: 0xd8a88e,
    hair: { style: "short", color: 0xb8b8bc },
    face: { mouth: "smile", brows: "raised", marks: 0xb08070 },
    headwear: { kind: "hat", color: 0x2a2a32, accent: 0x18181e },
    top: { kind: "coat", color: 0x6a4a36, accent: 0x2e3446 },
    bottom: { kind: "trousers", color: 0x2e3446 },
    shoes: 0x1a1612,
    arms: [
      [-0.1, 1.42, 0.32],
      [0.3, 1.08, 0.22],
    ],
    delay: 0.8,
  });
  const wife = figure(kit, {
    x: MX + along[0] * 0.86,
    z: MZ + along[1] * 0.86,
    y: G,
    facing: 0.3,
    height: 2.28,
    build: "slim",
    skin: 0xe0b8a0,
    hair: { style: "curly", color: 0xc8c8cc },
    face: { mouth: "smile", brows: "raised", marks: 0xc09080 },
    top: { kind: "coat", color: 0x7a5a3e, accent: 0x8a6a4e },
    bottom: { kind: "long-skirt", color: 0x7a5a3e },
    shoes: 0x1a1612,
    scarf: CURTAIN,
    arms: [
      [-0.4, 1.26, 0.16],
      [0.36, 0.95, 0.12],
    ],
    delay: 0.95,
  });
  // His newspaper, folded under his arm; her stiff handbag.
  const [paperHand] = husband.hands;
  const paper = box(0.34, 0.22, 0.05, 0xd8d4c8, paperHand[0], paperHand[1] - 0.12, paperHand[2] + 0.02, { delay: 1.5, rotation: [0, 0.3, 0.5] });
  decorate(paper, new BoxGeometry(0.26, 0.015, 0.052), 0x8a8a96, [
    [0, 0.15, 0],
    [0, 0.08, 0],
  ]);
  const [, bagHand] = wife.hands;
  add(new TorusGeometry(0.08, 0.016, 6, 14, Math.PI), 0x1a1a22, bagHand[0], bagHand[1] - 0.1, bagHand[2], { delay: 1.6, rotation: [0, 0.3, 0] });
  const bag = box(0.3, 0.22, 0.12, 0x1a1a22, bagHand[0], bagHand[1] - 0.33, bagHand[2], { delay: 1.62, rotation: [0, 0.3, 0] });
  decorate(bag, new BoxGeometry(0.06, 0.03, 0.02), 0xb08d3c, [[0, 0.2, 0.065]]);

  const walkers = [...husband.parts, ...wife.parts, paper];
  const rest = walkers.map((part) => part.position.y);
  const on = new Color(YELLOW);
  const warm = new Color(0xffb84a);
  tick((t) => {
    // In step, slowly; the lights of the empty flats go off and on, room by room.
    const step = Math.abs(Math.sin(t * 2.2)) * 0.022;
    walkers.forEach((part, i) => (part.position.y = rest[i] + step));
    const room = Math.floor(t / 0.9) % panes.length;
    const phase = (t / 0.9) % 1;
    panes.forEach((pane, i) => {
      pane.visible = !(i === (room * 5) % panes.length && phase > 0.25 && phase < 0.7);
      colorOf(pane).lerpColors(on, warm, (Math.sin(t * 0.8 + i * 1.7) + 1) / 4);
    });
    light.visible = Math.floor(t * 6) % 23 !== 9;
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}
