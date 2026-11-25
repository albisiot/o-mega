import { BoxGeometry, Color, CylinderGeometry, SphereGeometry, TorusGeometry } from "three";
import { INK, YELLOW, limb, octagonBase, zigzag, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { column, floor } from "@/lib/diorama-props";

/**
 * Refector (P163): the restorer of the Lanterne on a wooden trestle in an old chapel, gold paint
 * bowl in one hand, brush raised to an ancient spell set in the mosaic of the wall: segment by
 * segment the ring she retouches lights up gold and the spell wakes, sparks rising. She has no
 * speed at all: a cobweb has grown on her trestle and a spider dangles from it.
 */
export function refector(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const WOOD = 0x5e4a3a;
  const GOLD = 0xb08d3c;
  const STONE = 0x8a7a68;
  const F = octagonBase(kit, 0x1f1c26);
  const G = floor(kit, F, 0.06, 0x3a3440, 0x2a2430, 0.45);

  // The chapel wall, all mosaic, with a lost patch of bare plaster; an arch frames the spell.
  const WX = -0.1;
  const wall = box(3.3, 3.3, 0.3, 0x1c3236, WX, G, -1.35, { delay: 0.1, ink: 1.02 });
  const tones = [0x1f6f86, 0x8a1e44, GOLD, 0x2a5a5a];
  const tiles: Point[][] = tones.map(() => []);
  for (let i = 0; i < 15; i++)
    for (let j = 0; j < 14; j++) {
      const x = -1.55 + i * 0.22;
      const y = 0.25 + j * 0.22;
      const k = (i * 3 + j * 5) % 7;
      const lost = x > 0.5 && x < 1.3 && y < 1.1;
      const spell = Math.hypot(x + 0.55, y - 1.95) < 0.72;
      if (k < tones.length && !lost && !spell) tiles[k].push([x, y, 0.151]);
    }
  tones.forEach((tone, k) => decorate(wall, new BoxGeometry(0.15, 0.15, 0.01), tone, tiles[k]));
  decorate(wall, new BoxGeometry(0.85, 0.85, 0.01), 0x8a8070, [[0.9, 0.6, 0.152]]);
  [-1, 1].forEach((side) => box(0.2, 1.9, 0.12, STONE, WX + side * 1.2, G, -1.14, { delay: 0.2 }));
  add(new TorusGeometry(1.2, 0.08, 6, 28, Math.PI), STONE, WX, G + 1.82, -1.14, { delay: 0.24 });
  column(kit, -1.85, -0.55, G, 0.3, 2.2, true, 0x9a8a78);

  // The spell: a ring of eight arcs round a diamond, the restored ones lit.
  const centre: Point = [-0.55, 1.95, 0.16];
  const arc = (Math.PI * 2) / 8;
  const segments = Array.from({ length: 8 }, (_, k) =>
    decorate(wall, new TorusGeometry(0.55, 0.045, 6, 8, arc - 0.12).rotateZ(Math.PI / 2 + k * arc + 0.06), 0x4a4030, [centre]),
  );
  decorate(wall, new TorusGeometry(0.32, 0.02, 6, 24), GOLD, [centre]);
  decorate(wall, new BoxGeometry(0.18, 0.18, 0.02), YELLOW, [[centre[0], centre[1], 0.165, Math.PI / 4]]);
  decorate(
    wall,
    new BoxGeometry(0.02, 0.22, 0.01),
    GOLD,
    [0, 1, 2, 3].map((k) => [centre[0] + Math.sin(k * 1.571 + 0.785) * 0.43, centre[1] + Math.cos(k * 1.571 + 0.785) * 0.43, 0.16, -(k * 1.571 + 0.785)] as [number, number, number, number]),
  );
  motes(8, YELLOW, 0.025, [WX - 1.1, G + 1.4, -1.1], [WX + 0.0, G + 3.0, -0.9], 1.3);

  // The trestle, her pots of gold, and the cobweb her slowness let grow.
  const TX = 0.45;
  const TZ = -0.55;
  const top = G + 0.37;
  box(1.25, 0.07, 0.6, WOOD, TX, G + 0.3, TZ, { delay: 0.3 });
  [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => box(0.06, 0.3, 0.06, 0x3e3028, TX + sx * 0.55, G, TZ + sz * 0.24, { delay: 0.28, noInk: true })));
  cylinder(0.1, 0.09, 0.2, 0x7a6a50, TX + 0.45, top, TZ - 0.1, { delay: 0.5 }, 12);
  cylinder(0.085, 0.085, 0.02, YELLOW, TX + 0.45, top + 0.2, TZ - 0.1, { delay: 0.52, flat: true, noInk: true }, 12);
  cylinder(0.12, 0.1, 0.26, 0x5a6a7a, 1.35, G, 0.35, { delay: 0.5 }, 12);
  cylinder(0.105, 0.105, 0.02, YELLOW, 1.35, G + 0.26, 0.35, { delay: 0.52, flat: true, noInk: true }, 12);
  const corner: Point = [TX - 0.55, G + 0.3, TZ + 0.27];
  [0.35, 0.8, 1.25].forEach((a, k) => zigzag(kit, [corner, [corner[0] + Math.sin(a) * 0.3, corner[1] - Math.cos(a) * 0.28, corner[2]]], 0.008, 0xd8d8e0, 0.7 + k * 0.02));
  [0.15, 0.26].forEach((r, k) =>
    zigzag(kit, [0.35, 0.8, 1.25].map((a) => [corner[0] + Math.sin(a) * r, corner[1] - Math.cos(a) * r * 0.93, corner[2]] as Point), 0.006, 0xd8d8e0, 0.8 + k * 0.03),
  );
  box(0.006, 0.18, 0.006, 0xd8d8e0, TX + 0.1, G + 0.12, TZ + 0.3, { delay: 0.9, flat: true, noInk: true });
  const spider = add(new SphereGeometry(0.035, 8, 6).scale(1, 0.8, 1), INK, TX + 0.1, G + 0.08, TZ + 0.3, { delay: 0.95, noInk: true });
  decorate(spider, new BoxGeometry(0.14, 0.008, 0.008), INK, [
    [0, 0.03, 0, 0.3],
    [0, 0.03, 0, -0.3],
  ]);

  // Refector, brush up to the ring, the bowl of gold in her other hand.
  const theta = 0.25;
  const restorer = figure(kit, {
    x: TX,
    z: TZ,
    y: top,
    facing: theta,
    height: 2.35,
    skin: 0xd0a080,
    hair: { style: "curly", color: 0x5a4a42 },
    face: { mouth: "neutral", brows: "calm", marks: 0xb08060 },
    top: { kind: "apron", color: 0x2f4a38, accent: 0xc8bfa0, sleeves: "long" },
    bottom: { kind: "trousers", color: 0x2a2a30 },
    shoes: 0x3a2c22,
    arms: [[-0.41, 2.18, -0.42], [0.3, 1.32, 0.36]],
    delay: 0.9,
  });
  const { at } = restorer;
  const apron = box(0.56, 0.82, 0.03, 0xc8bfa0, ...at(0, 0.28, 0.24), { delay: 1.3, rotation: [0, theta, 0] });
  decorate(apron, new BoxGeometry(0.1, 0.07, 0.01), GOLD, [
    [-0.12, 0.5, 0.016],
    [0.15, 0.3, 0.016],
  ]);
  const [brushHand, bowlHand] = restorer.hands;
  const tip: Point = [-0.22, G + 2.4, -1.15];
  limb(kit, brushHand, tip, 0.02, 0.014, WOOD, { delay: 1.45 });
  const bristles = ball(0.03, YELLOW, tip[0], tip[1] - 0.03, tip[2], { delay: 1.5, flat: true });
  add(new SphereGeometry(0.13, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), GOLD, bowlHand[0], bowlHand[1] - 0.06, bowlHand[2] + 0.06, { delay: 1.45 });
  add(new CylinderGeometry(0.11, 0.11, 0.015, 14), YELLOW, bowlHand[0], bowlHand[1] + 0.04, bowlHand[2] + 0.06, { delay: 1.5, flat: true, noInk: true });

  const dark = new Color(0x4a4030);
  const lit = new Color(YELLOW);
  const fresh = new Color(0xfff4c0);
  const tipRest = bristles.position.clone();
  const spiderY = spider.position.y;
  tick((t) => {
    // The ring fills arc by arc as she works, flares when whole, and she starts over.
    const done = 4 + (Math.floor(t * 0.7) % 6);
    segments.forEach((material, k) => material.color.copy(k < Math.min(done, 8) ? (done >= 8 || k === done - 1 ? fresh : lit) : dark));
    bristles.position.set(tipRest.x + Math.sin(t * 7) * 0.02, tipRest.y + Math.cos(t * 7) * 0.015, tipRest.z);
    spider.position.y = spiderY + Math.sin(t * 1.3) * 0.03;
  });

  return { width: 4.9, height: 4.5, lookY: 1.6 };
}
