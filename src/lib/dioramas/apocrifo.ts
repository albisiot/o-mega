import { BoxGeometry, ConeGeometry, CylinderGeometry, ExtrudeGeometry, Group, Shape } from "three";
import { CYAN, MAGENTA, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure, shade } from "@/lib/diorama-figure";
import { floor, lamp } from "@/lib/diorama-props";

/**
 * Apocrifo (P291): the nameless patron of the Seal, a tall man of wet black ink by a newspaper
 * kiosk at night, wearing a torn scrap of paper with a sketched face for a face. A halo of gold
 * nibs and quills turns behind his head, pages drift round him, ink drips from his long fingers
 * into a spreading pool. He is stamping himself on the world: his face is on every paper in the
 * kiosk and on every sheet on the paving. Now and then he glitches, jumping in magenta and cyan.
 * Too weak to hold anything, he lets the pages slip.
 */
export function apocrifo(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const INKY = 0x16141e;
  const SHEEN = 0x34407a;
  const PAPER = 0xe8d8b0;
  const GOLD = 0xd8a840;
  const F = octagonBase(kit, 0x1a1822);
  const G = floor(kit, F, 0.06, 0x2a2836, 0x1e1c28, 0.5);

  /** A sketched face, in ink, on a sheet facing +z (or lying flat, `flat`): his face. */
  const sketch = (part: Group, x: number, y: number, z: number, size: number, flat = false) => {
    const spot = (dx: number, dy: number): Point => (flat ? [x + dx, y, z - dy] : [x + dx, y + dy, z]);
    const g = (w: number, h: number) => (flat ? new BoxGeometry(w, 0.004, h) : new BoxGeometry(w, h, 0.004));
    decorate(part, g(0.05 * size, 0.014 * size), INKY, [spot(-0.04 * size, 0.04 * size), spot(0.04 * size, 0.04 * size), spot(0, -0.06 * size)]);
    decorate(part, g(0.012 * size, 0.06 * size), INKY, [spot(0, -0.005 * size)]);
  };

  // The kiosk, every paper on its racks printed with his face.
  const kiosk = box(1.1, 1.7, 0.7, 0x23404b, 1.25, G, -1.05, { delay: 0.1, rotation: [0, 0.3, 0] });
  box(1.35, 0.08, 0.95, 0x1a2e36, 1.25, G + 1.7, -1.02, { delay: 0.15, rotation: [0, 0.3, 0] });
  decorate(kiosk, new BoxGeometry(0.9, 0.02, 0.04), 0x14121c, [
    [0, 0.55, 0.36],
    [0, 0.95, 0.36],
    [0, 1.35, 0.36],
  ]);
  decorate(kiosk, new BoxGeometry(0.22, 0.3, 0.01), PAPER, [0.6, 1.0, 1.4].flatMap((y) => [-0.3, 0, 0.3].map((x) => [x, y - 0.18, 0.36] as Point)));
  [0.6, 1.0, 1.4].forEach((y) => [-0.3, 0, 0.3].forEach((x) => sketch(kiosk, x, y - 0.16, 0.367, 1)));
  decorate(kiosk, new BoxGeometry(0.9, 0.02, 0.01), MAGENTA, [[0, 1.62, 0.36]]);
  const light = lamp(kit, -1.55, -0.85, G, 0.3, 2.3, CYAN);

  // Sheets on the paving, each stamped with his face, leading to him.
  [
    [-0.1, 1.35, 0.4],
    [0.55, 1.0, -0.3],
    [-0.75, 0.95, 0.9],
    [0.95, 0.35, 0.2],
    [-1.3, 0.3, -0.5],
  ].forEach(([x, z, turn], i) => {
    const sheet = box(0.26, 0.008, 0.34, PAPER, x, G, z, { delay: 0.4 + i * 0.04, noInk: true, rotation: [0, turn, 0] });
    sketch(sheet, 0, 0.009, 0.02, 1.2, true);
  });
  // The pool of ink spreading under him.
  const pool = add(new CylinderGeometry(0.75, 0.75, 0.012, 24).scale(1, 1, 0.7), 0x0c0a14, -0.25, G, 0.15, { delay: 0.5, flat: true, noInk: true });
  decorate(pool, new BoxGeometry(0.5, 0.004, 0.04), SHEEN, [[0.15, 0.013, 0.2]]);

  // Apocrifo: wet black ink from head to hem, a robe that runs to the ground.
  const facing = 0.3;
  const u = 2.75 / 2.4;
  const man = figure(kit, {
    x: -0.25,
    z: 0.1,
    y: G,
    facing,
    height: 2.75,
    build: "slim",
    skin: INKY,
    hair: { style: "bald", color: INKY },
    face: { blank: true },
    top: { kind: "robe", color: 0x1c1a2a },
    gloves: INKY,
    shoes: INKY,
    arms: [
      [-0.48, 1.05, 0.14],
      [0.48, 1.08, 0.12],
    ],
    delay: 0.8,
  });
  // Sheen streaks down the ink.
  [
    [-0.16, 0.35, 0.95, 0.26, SHEEN],
    [0.1, 0.25, 1.05, 0.28, SHEEN],
    [0.2, 1.2, 0.5, 0.24, MAGENTA],
    [-0.05, 1.3, 0.35, 0.25, CYAN],
  ].forEach(([lx, y, h, z, color], i) =>
    box(0.025, h * u, 0.01, color, ...man.at(lx * u, y * u, z * u), { delay: 1.3 + i * 0.03, flat: true, noInk: true, rotation: [0, facing, 0] }),
  );
  // Long dripping fingers.
  const drips: { part: Group; from: Point }[] = [];
  man.hands.forEach((hand, side) =>
    [-0.06, -0.02, 0.02, 0.06].forEach((dx, k) => {
      const length = 0.26 + (k % 2) * 0.06;
      const top: Point = [hand[0] + dx * Math.cos(facing), hand[1] - length - 0.04, hand[2] - dx * Math.sin(facing)];
      cylinder(0.018, 0.012, length, INKY, ...top, { delay: 1.4 + k * 0.02, rotation: [0, 0, (side ? -1 : 1) * 0.08 * (k - 1.5)] }, 6);
      if (k % 2) drips.push({ part: ball(0.025, INKY, top[0], top[1] - 0.05, top[2], { delay: 1.5, noInk: true }), from: top });
    }),
  );
  // The face: a torn scrap of paper with a sketched face, cracked across.
  const scrap = new Shape();
  [
    [-0.2, -0.3],
    [0.04, -0.33],
    [0.19, -0.22],
    [0.2, 0.15],
    [0.12, 0.34],
    [-0.08, 0.3],
    [-0.21, 0.36],
    [-0.17, 0.02],
  ].forEach(([x, y], k) => (k ? scrap.lineTo(x, y) : scrap.moveTo(x, y)));
  scrap.closePath();
  const [hx, hy, hz] = man.head;
  const R = man.headRadius;
  const maskAt: Point = [hx + R * 0.95 * Math.sin(facing), hy - 0.33, hz + R * 0.95 * Math.cos(facing)];
  const mask = add(new ExtrudeGeometry(scrap, { depth: 0.015, bevelEnabled: false }), PAPER, ...maskAt, { delay: 1.5, rotation: [0, facing, 0] });
  decorate(mask, new BoxGeometry(0.08, 0.018, 0.01), INKY, [
    [-0.075, 0.38, 0.02, 0.1],
    [0.075, 0.38, 0.02, -0.1],
  ]);
  decorate(mask, new BoxGeometry(0.045, 0.03, 0.01), 0x3a3448, [
    [-0.075, 0.34, 0.02],
    [0.075, 0.34, 0.02],
  ]);
  decorate(mask, new BoxGeometry(0.014, 0.1, 0.01), INKY, [[0.005, 0.27, 0.02, -0.1]]);
  decorate(mask, new BoxGeometry(0.1, 0.014, 0.01), INKY, [[0, 0.16, 0.02]]);
  decorate(mask, new BoxGeometry(0.012, 0.42, 0.01), 0x6a5a48, [[0.02, 0.33, 0.021, 0.55]]);
  const ghosts = [MAGENTA, CYAN].map((color) =>
    add(new ExtrudeGeometry(scrap, { depth: 0.01, bevelEnabled: false }), color, ...maskAt, { delay: 1.55, flat: true, noInk: true, rotation: [0, facing, 0] }),
  );

  // The halo of nibs and quills turning behind his head.
  const halo = new Group();
  halo.position.set(hx - 0.12 * Math.sin(facing), hy + 0.12, hz - 0.12 * Math.cos(facing));
  halo.rotation.order = "YXZ";
  halo.rotation.set(0, facing, 0);
  const nibs = Array.from({ length: 12 }, (_, k) => {
    const a = (k / 12) * Math.PI * 2;
    const quill = k % 2 === 1;
    const part = add(new ConeGeometry(quill ? 0.035 : 0.045, quill ? 0.24 : 0.16, 4).scale(1, 1, 0.3), quill ? 0xf2efe6 : GOLD, 0, 0, 0, { delay: 1.7 + k * 0.02, rotation: [0, 0, a - Math.PI / 2] });
    part.position.set(Math.cos(a) * 0.48, Math.sin(a) * 0.48, 0);
    return part;
  });
  nibs[0].parent?.add(halo);
  nibs.forEach((nib) => halo.add(nib));

  // Pages drifting round him, one slipping from his fingers.
  const pages = Array.from({ length: 7 }, (_, k) => {
    const page = box(0.24, 0.3, 0.008, PAPER, 0, 0, 0, { delay: 1.8 + k * 0.04, noInk: true });
    decorate(page, new BoxGeometry(0.16, 0.012, 0.004), shade(PAPER, 0.55), [0.08, 0.13, 0.18, 0.23].map((y) => [0, y, 0.006] as Point));
    return page;
  });
  const drift = (t: number) =>
    pages.forEach((page, k) => {
      const a = k * 0.9 + t * (0.18 + (k % 3) * 0.04);
      const r = 0.95 + (k % 3) * 0.25;
      page.position.set(-0.25 + Math.cos(a) * r, G + 0.6 + ((k * 0.37 + t * 0.06) % 1) * 2.4, 0.1 + Math.sin(a) * r * 0.8);
      page.rotation.set(Math.sin(a * 2) * 0.6, -a, Math.cos(a) * 0.4);
    });
  drift(0);

  const rest = mask.position.clone();
  tick((t) => {
    // The halo turns; pages drift; ink drips; the pool breathes; now and then he glitches.
    halo.rotation.z = t * 0.35;
    drift(t);
    drips.forEach(({ part, from }, k) => {
      const s = (t * 0.7 + k * 0.27) % 1;
      part.position.y = from[1] - 0.05 - s * (from[1] - G - 0.05);
    });
    pool.children[0].scale.set(1 + Math.sin(t * 0.8) * 0.05, 1, 1 + Math.sin(t * 0.8) * 0.05);
    const beat = Math.floor(t * 8);
    const noise = Math.sin(beat * 12.9898) * 43758.5453;
    const hit = t > 2 && noise - Math.floor(noise) > 0.88;
    mask.position.set(rest.x + (hit ? 0.05 : 0), rest.y, rest.z);
    ghosts.forEach((ghost, k) => {
      ghost.visible = hit;
      ghost.position.set(rest.x + (k ? -0.09 : 0.09) * Math.cos(facing), rest.y + (k ? 0.02 : -0.02), rest.z - (k ? -0.09 : 0.09) * Math.sin(facing) - 0.02);
    });
    halo.position.x = hx - 0.12 * Math.sin(facing) + (hit ? -0.06 : 0);
    light.visible = Math.floor(t * 5) % 19 !== 7;
  });

  return { width: 4.9, height: 4.5, lookY: 1.6 };
}
