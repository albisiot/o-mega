import { BoxGeometry, Color, ConeGeometry, CylinderGeometry, ExtrudeGeometry, Group, Shape, SphereGeometry, TorusGeometry } from "three";
import { CYAN, MAGENTA, ORANGE, YELLOW, cable, colorOf, jag, octagonBase, zigzag, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, skyline } from "@/lib/diorama-props";

/**
 * Varco (P333): the preacher of the Figli dell'Ultima on the rooftops at night, one hand held out
 * to us, the other in the rip she has torn in the air: through it glows a warm somewhere else,
 * and a golden amphora drifts out to join the loot piled among the chimneys. The rip crackles
 * magenta. Her price is in the pile: a television she has no idea what to do with, used as a
 * stand for a candle, its plug lying loose.
 */
export function varco(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const BRICK = 0x4a2c3e;
  const GOLD = 0xd8a040;
  const WOOD = 0x5e4a3a;
  const F = octagonBase(kit, 0x1f1a28);
  const G = floor(kit, F, 0.06, 0x2e2838, 0x201a2a, 0.35);

  // The roofs: chimney stacks with pots, and the city behind under a red sky.
  skyline(kit, -1.95, G, 0.1, [0x3a1a2a, 0x2a1a30, 0x4a2030], -1.25, 1.25);
  const chimney = (x: number, z: number, h: number, delay: number) => {
    const stack = box(0.44, h, 0.36, BRICK, x, G, z, { delay });
    decorate(stack, new BoxGeometry(0.44, 0.02, 0.01), 0x2a1a26, [0.25, 0.5, 0.75].map((v) => [0, h * v, 0.181] as Point));
    box(0.52, 0.08, 0.44, 0x5a3a4a, x, G + h, z, { delay: delay + 0.04 });
    [-0.1, 0.1].forEach((dx, k) => cylinder(0.06, 0.07, 0.2 + k * 0.06, 0x8a4a3a, x + dx, G + h + 0.08, z, { delay: delay + 0.06 }, 10));
  };
  chimney(1.15, -1.25, 1.5, 0.15);
  chimney(0.15, -1.6, 1.1, 0.2);
  chimney(-0.35, -1.75, 0.9, 0.25);

  // The rip: a jagged lens hanging in the air, magenta at the rim, a warm elsewhere at its heart.
  const TX = -1.0;
  const TZ = -0.15;
  const turn = 0.33;
  const T = (lx: number, ly: number, lz = 0): Point => [TX + lx * Math.cos(turn) + lz * Math.sin(turn), G + ly, TZ - lx * Math.sin(turn) + lz * Math.cos(turn)];
  const lens = (w: number, h: number, wobble: number, layer: number) => {
    const shape = new Shape();
    const n = 10;
    shape.moveTo(0, 0);
    for (let k = 1; k < n; k++) shape.lineTo(Math.sin((Math.PI * k) / n) * (w / 2 + (k % 2 ? wobble : -wobble)), (k / n) * h);
    shape.lineTo(0, h);
    for (let k = n - 1; k > 0; k--) shape.lineTo(-Math.sin((Math.PI * k) / n) * (w / 2 + (k % 2 ? -wobble : wobble)), (k / n) * h);
    shape.closePath();
    return new ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: false }).translate(0, 0, layer * 0.03);
  };
  const rip = { rotation: [0, turn, 0] as [number, number, number], flat: true };
  add(lens(1.15, 2.3, 0.09, 0), MAGENTA, ...T(0, 0.3), { ...rip, delay: 0.4 });
  add(lens(0.92, 2.0, 0.07, 1), 0x2a0f3a, ...T(0, 0.45), { ...rip, delay: 0.45, noInk: true });
  const glow = add(lens(0.5, 1.4, 0.05, 2), ORANGE, ...T(0, 0.75), { ...rip, delay: 0.5, noInk: true });
  add(lens(0.2, 0.85, 0.03, 3), YELLOW, ...T(0, 1.02), { ...rip, delay: 0.55, noInk: true });
  // Cracks of magenta light running out from the rim.
  const bolts = [
    [T(0.5, 1.6), T(0.95, 2.0)],
    [T(-0.52, 1.3), T(-0.95, 1.0)],
    [T(0.42, 0.75), T(0.85, 0.45)],
    [T(-0.3, 2.3), T(-0.55, 2.75)],
    [T(-0.42, 0.65), T(-0.75, 0.35)],
  ].map(([from, to], k) => zigzag(kit, jag(from, to, 4, 0.06, k + 1), 0.025, k % 2 ? MAGENTA : 0xff7ab0, 0.7 + k * 0.04));

  // The golden amphora drifting out of the rip.
  const amphora: Group[] = [];
  const A = T(0.3, 0.5, 0.42);
  amphora.push(add(new SphereGeometry(0.16, 14, 10).scale(1, 1.3, 1), GOLD, A[0], A[1], A[2], { delay: 1.6 }));
  amphora.push(cylinder(0.06, 0.08, 0.16, GOLD, A[0], A[1] + 0.38, A[2], { delay: 1.62 }, 12));
  amphora.push(cylinder(0.1, 0.07, 0.04, GOLD, A[0], A[1] + 0.54, A[2], { delay: 1.64 }, 12));
  [-1, 1].forEach((side) => amphora.push(add(new TorusGeometry(0.07, 0.018, 6, 12, Math.PI), GOLD, A[0] + side * 0.1, A[1] + 0.3, A[2], { delay: 1.66, rotation: [0, 0, side * -1.3] })));
  decorate(amphora[0], new TorusGeometry(0.16, 0.018, 6, 20).rotateX(Math.PI / 2), 0x7a4a20, [[0, 0.24, 0]]);

  // The loot among the chimneys: a chest of coins, a rolled carpet, and the television.
  const chest = box(0.55, 0.3, 0.34, WOOD, 1.25, G, -0.35, { delay: 0.6, rotation: [0, 0.4, 0] });
  decorate(chest, new BoxGeometry(0.57, 0.04, 0.36), GOLD, [[0, 0.2, 0]]);
  decorate(chest, new CylinderGeometry(0.06, 0.06, 0.02, 10), YELLOW, [
    [-0.15, 0.31, 0.02],
    [0.0, 0.32, -0.06],
    [0.14, 0.31, 0.05],
    [0.05, 0.33, 0.1],
  ]);
  const carpet = add(new CylinderGeometry(0.12, 0.12, 0.9, 14).rotateZ(Math.PI / 2), MAGENTA, -0.35, G, 1.3, { delay: 0.65, rotation: [0, -0.5, 0] });
  decorate(carpet, new CylinderGeometry(0.125, 0.125, 0.06, 14).rotateZ(Math.PI / 2), CYAN, [
    [-0.25, 0.12, 0],
    [0.0, 0.12, 0],
    [0.25, 0.12, 0],
  ]);
  const TVX = 1.3;
  const TVZ = 0.75;
  const tv = box(0.44, 0.36, 0.34, 0x3a3a46, TVX, G, TVZ, { delay: 0.7, rotation: [0, 0.35, 0] });
  decorate(tv, new BoxGeometry(0.32, 0.25, 0.01), 0x6a8a96, [[-0.03, 0.18, 0.172]]);
  decorate(tv, new BoxGeometry(0.05, 0.05, 0.01), 0x8a8a96, [[0.17, 0.25, 0.172], [0.17, 0.14, 0.172]]);
  box(0.3, 0.26, 0.2, 0x2e2e38, TVX - 0.08, G + 0.05, TVZ - 0.24, { delay: 0.72, rotation: [0, 0.35, 0] });
  cylinder(0.05, 0.05, 0.16, 0xf0e8d8, TVX, G + 0.36, TVZ, { delay: 0.8 }, 10);
  const flameTip = add(new ConeGeometry(0.035, 0.1, 8), YELLOW, TVX, G + 0.53, TVZ, { delay: 0.85, flat: true, noInk: true });
  cable(kit, [[TVX - 0.15, G + 0.1, TVZ - 0.32], [TVX - 0.5, G + 0.02, TVZ - 0.2], [TVX - 0.75, G + 0.02, TVZ - 0.45]], 0.018, 0x1a1a22, 0.75);
  box(0.08, 0.05, 0.1, 0x1a1a22, TVX - 0.78, G, TVZ - 0.48, { delay: 0.78, rotation: [0, 0.6, 0] });

  // Varco: long black hair, a purple robe tied with rope, reaching into the rip.
  const preacher = figure(kit, {
    x: 0.35,
    z: 0.3,
    y: G,
    facing: 0.3,
    height: 2.45,
    build: "slim",
    skin: 0xe2ccc0,
    hair: { style: "long", color: 0x15121c },
    face: { mouth: "frown", brows: "angry", eyes: 0x3a4a6a },
    top: { kind: "robe", color: 0x4a2a6a },
    belt: 0xb09a6a,
    scarf: 0x3a1f55,
    arms: [[-0.85, 1.8, -0.45], [0.32, 1.66, 0.62]],
    delay: 0.9,
  });
  const [, palm] = preacher.hands;
  // Her open hand: fingers spread towards us.
  [-0.6, -0.2, 0.2, 0.6].forEach((lean, k) =>
    box(0.025, 0.11, 0.025, 0xe2ccc0, palm[0] + Math.sin(lean) * 0.07, palm[1] + 0.02, palm[2] + 0.04, { delay: 1.5 + k * 0.02, rotation: [0.3, 0.3, -lean] }),
  );
  // The rope belt's knot and its hanging ends.
  const knot = preacher.at(0.08, 1.08, 0.24);
  ball(0.05, 0xb09a6a, knot[0], knot[1] - 0.05, knot[2], { delay: 1.4 });
  [0.06, 0.14].forEach((dx, k) => box(0.03, 0.38, 0.03, 0xb09a6a, ...preacher.at(dx, 0.68, 0.27), { delay: 1.42 + k * 0.02, rotation: [0.15, 0.3, 0.1 - k * 0.15] }));

  const rest = amphora.map((part) => part.position.clone());
  const warm = new Color(ORANGE);
  const hot = new Color(0xffb040);
  tick((t) => {
    // The amphora sways out of the rip and back; the rim crackles; the far side glows.
    const drift = (Math.sin(t * 0.9) + 1) / 2;
    amphora.forEach((part, i) => part.position.set(rest[i].x + drift * 0.18, rest[i].y + Math.sin(t * 1.8) * 0.05, rest[i].z + drift * 0.12));
    bolts.forEach((pieces, k) => pieces.forEach((piece) => (piece.visible = Math.floor(t * 9 + k * 3) % 5 !== 2)));
    colorOf(glow).lerpColors(warm, hot, (Math.sin(t * 2.2) + 1) / 2);
    flameTip.rotation.z = Math.sin(t * 11) * 0.12;
  });

  return { width: 4.9, height: 4.5, lookY: 1.55 };
}
