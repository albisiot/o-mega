import { BoxGeometry, ConeGeometry, CylinderGeometry, SphereGeometry } from "three";
import { CYAN, INK, MAGENTA, YELLOW, octagonBase, zigzag, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Publican (P017): the barman of neutral ground polishes a glass behind his counter, bottles
 * glowing on the shelves behind him. On the counter a hero's mask and a villain's horned helmet
 * sit by the same drink and the same pile of coins. The price of a slow head: the beer tap he
 * left open, foam spilling over the glass and down the counter.
 */
export function publican(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const WOOD = 0x4a2e22;
  const WOOD_LIGHT = 0x6b4430;
  const BRASS = 0xc89a3a;
  const FOAM = 0xf2ede0;
  const F = octagonBase(kit, 0x221c24);
  const G = floor(kit, F, 0.06, 0x35282a, 0x251b1c, 0.4);

  // The back wall with three shelves of glowing bottles.
  box(3.2, 2.9, 0.12, 0x2a2236, 0, G, -1.5, { delay: 0.1, ink: 1.02 });
  const glass = [0x1f8f8a, 0xa02a6a, 0x2a6ab0];
  [1.0, 1.6, 2.2].forEach((h, row) => {
    const shelf = box(2.9, 0.05, 0.32, WOOD_LIGHT, 0, G + h, -1.3, { delay: 0.2 + row * 0.05 });
    glass.forEach((color, k) => {
      const spots: Point[] = [];
      for (let i = k; i < 14; i += 3) if ((i * 7 + row * 5) % 11 !== 3) spots.push([-1.3 + i * 0.2, 0.18, 0]);
      decorate(shelf, new CylinderGeometry(0.06, 0.06, 0.26, 8), color, spots);
      decorate(shelf, new CylinderGeometry(0.02, 0.03, 0.12, 6), color, spots.map(([x, , z]) => [x, 0.37, z] as Point));
    });
  });

  // The counter: panelled wood, a brass foot rail, a top a little wider.
  const front = box(2.7, 1.0, 0.5, WOOD, 0.05, G, 0.45, { delay: 0.3 });
  decorate(front, new BoxGeometry(0.03, 0.8, 0.01), 0x2e1c14, [-0.9, -0.3, 0.3, 0.9].map((x) => [x, 0.5, 0.255] as Point));
  box(2.9, 0.07, 0.68, WOOD_LIGHT, 0.05, G + 1.0, 0.45, { delay: 0.34 });
  add(new CylinderGeometry(0.03, 0.03, 2.6, 8).rotateZ(Math.PI / 2), BRASS, 0.05, G + 0.12, 0.8, { delay: 0.38, noInk: true });
  const top = G + 1.07;

  // Publican behind it: curly hair, a big moustache, sleeves rolled up, a leather apron.
  const barman = figure(kit, {
    x: 0.2,
    z: -0.35,
    y: G,
    facing: 0.35,
    height: 2.45,
    build: "broad",
    skin: 0xc08a6a,
    hair: { style: "curly", color: 0x221a1c },
    face: { mouth: "neutral", brows: "calm", beard: "moustache", beardColor: 0x161214 },
    top: { kind: "apron", color: 0x1f4a52, accent: 0x5a3a2a, sleeves: "short" },
    bottom: { kind: "trousers", color: 0x1c2430 },
    belt: 0x5a3a2a,
    arms: [
      [-0.12, 1.62, 0.52],
      [0.18, 1.78, 0.5],
    ],
    delay: 0.8,
  });
  // A cap of hair over his curls: the figure's own lets the scalp show through.
  const cap = add(new SphereGeometry(barman.headRadius * 1.04, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.97, 1.06, 1), 0x221a1c, ...barman.head, { delay: 1.3 });
  cap.rotation.order = "YXZ";
  cap.rotation.set(-0.5, 0.35, 0);
  const [rag, held] = barman.hands;
  // The glass he polishes, with a little spark on its rim, and the towel over his other hand.
  const bowl = add(new CylinderGeometry(0.09, 0.05, 0.15, 12), 0xbfefff, held[0], held[1] + 0.02, held[2] + 0.04, { delay: 1.4, flat: true });
  cylinder(0.012, 0.012, 0.1, 0xbfefff, held[0], held[1] - 0.08, held[2] + 0.04, { delay: 1.42, noInk: true }, 6);
  const towel = box(0.16, 0.34, 0.04, 0xd8d2c4, rag[0], rag[1] - 0.3, rag[2] + 0.06, { delay: 1.45, rotation: [0.2, 0.35, 0.15] });
  const spark = zigzag(
    kit,
    [
      [held[0] + 0.06, held[1] + 0.18, held[2] + 0.06],
      [held[0] + 0.14, held[1] + 0.24, held[2] + 0.04],
      [held[0] + 0.12, held[1] + 0.3, held[2] + 0.08],
      [held[0] + 0.22, held[1] + 0.36, held[2] + 0.06],
    ],
    0.014,
    MAGENTA,
    1.6,
  );

  // Neutral ground: a hero's mask and a villain's horned helmet, each by the same drink and coins.
  const coins = (x: number, z: number, delay: number) =>
    [0, 1, 2].forEach((k) => cylinder(0.055, 0.055, 0.02, YELLOW, x + (k % 2) * 0.01, top + k * 0.022, z, { delay: delay + k * 0.03, noInk: k > 0 }, 12));
  const mask = box(0.34, 0.12, 0.025, CYAN, -0.25, top + 0.01, 0.62, { delay: 1.0, rotation: [-0.35, 0.35, 0] });
  decorate(mask, new BoxGeometry(0.08, 0.045, 0.01), INK, [
    [-0.075, 0.065, 0.014],
    [0.075, 0.065, 0.014],
  ]);
  cylinder(0.055, 0.05, 0.2, CYAN, -0.52, top, 0.58, { delay: 1.05 });
  coins(-0.05, 0.66, 1.1);
  const helmet = add(new SphereGeometry(0.15, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0x4a1a3a, 0.95, top, 0.58, { delay: 1.0 });
  decorate(helmet, new ConeGeometry(0.035, 0.16, 6), 0xd8d2c4, [
    [-0.13, 0.15, 0, 0.7],
    [0.13, 0.15, 0, -0.7],
  ]);
  cylinder(0.055, 0.05, 0.2, MAGENTA, 0.68, top, 0.62, { delay: 1.05 });
  coins(1.22, 0.66, 1.1);

  // The tap he left open: the glass overflows, foam runs down the counter into a puddle.
  const TX = -0.95;
  cylinder(0.06, 0.07, 0.06, BRASS, TX, top, 0.32, { delay: 0.6 });
  cylinder(0.035, 0.035, 0.44, BRASS, TX, top + 0.06, 0.32, { delay: 0.62 });
  box(0.04, 0.04, 0.2, BRASS, TX, top + 0.42, 0.42, { delay: 0.64 });
  cylinder(0.02, 0.03, 0.22, INK, TX, top + 0.5, 0.32, { delay: 0.66, rotation: [0.6, 0, 0] }, 6);
  cylinder(0.07, 0.06, 0.2, 0xe0a030, TX, top, 0.52, { delay: 0.7 });
  add(new SphereGeometry(0.085, 12, 8).scale(1, 0.6, 1), FOAM, TX, top + 0.18, 0.52, { delay: 0.74 });
  box(0.1, 0.012, 0.22, FOAM, TX, top, 0.68, { delay: 0.76, noInk: true });
  box(0.08, 0.7, 0.012, FOAM, TX, G + 0.36, 0.78, { delay: 0.78, noInk: true });
  add(new CylinderGeometry(0.22, 0.22, 0.008, 16).scale(1, 1, 0.6), FOAM, TX, G, 0.95, { delay: 0.8, flat: true, noInk: true });
  const drip = ball(0.022, FOAM, TX, top + 0.36, 0.52, { delay: 0.9, flat: true, noInk: true });

  // Two stools waiting in front.
  [-0.45, 0.85].forEach((x, i) => {
    cylinder(0.18, 0.2, 0.03, 0x23222b, x, G, 1.3, { delay: 0.4 + i * 0.05 }, 12);
    cylinder(0.035, 0.035, 0.7, 0x8a93a3, x, G + 0.03, 1.3, { delay: 0.42 + i * 0.05 }, 8);
    cylinder(0.22, 0.2, 0.08, i ? MAGENTA : 0x23707e, x, G + 0.73, 1.3, { delay: 0.45 + i * 0.05 }, 14);
  });

  const towelAt = towel.position.clone();
  tick((t) => {
    // He rubs the glass round and round; the spark crackles; the tap keeps dripping.
    towel.position.set(towelAt.x + Math.sin(t * 5) * 0.03, towelAt.y + Math.cos(t * 5) * 0.025, towelAt.z);
    bowl.rotation.z = Math.sin(t * 5) * 0.08;
    const on = Math.floor(t * 6) % 5 !== 3;
    spark.forEach((bar) => (bar.visible = on));
    const u = (t * 1.4) % 1;
    drip.position.y = top + 0.36 - u * 0.16;
  });

  return { width: 4.9, height: 4.3, lookY: 1.45 };
}
