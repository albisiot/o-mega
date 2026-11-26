import { BoxGeometry, CylinderGeometry, Group, TorusGeometry } from "three";
import { CYAN, MAGENTA, YELLOW, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { facade, floor } from "@/lib/diorama-props";

/**
 * Mora (P344): the Lete's collector at a debtor's shop under the glass towers of the Compagnia.
 * Black bob, red lips, a long wine-coloured coat; her right hand holds out a chain of gold coins
 * that wheels round her, and the coins from the kneeling shopkeeper's cash tin fly up to join
 * it. In her left hand the ledger where every weakness is written down: on paper, because the
 * price is no head for machines, and the card terminal lies smashed on the pavement.
 */
export function mora(kit: Kit): Framing {
  const { add, box, decorate, tick } = kit;
  const GOLD = 0xf2b632;
  const GOLD_DARK = 0xb07a1e;
  const F = octagonBase(kit, 0x1c1a26);
  const G = floor(kit, F, 0.06, 0x2c2a38, 0x1c1a24, 0.45);

  // The Lete towers behind, their windows lit in rows.
  [
    [0.9, -1.35, 0.9, 3.8, 0.7],
    [1.75, -0.55, 0.7, 3.0, 0.6],
  ].forEach(([x, z, w, h, d], i) => {
    const tower = box(w, h, d, i ? 0x22344a : 0x1e2a4a, x, G, z, { delay: 0.1 + i * 0.05, ink: 1.02 });
    const lit: Point[] = [];
    const pink: Point[] = [];
    for (let r = 0; r < Math.floor(h / 0.3) - 1; r++)
      for (let c = 0; c < 3; c++) ((r * 3 + c * 5 + i) % 7 === 0 ? pink : (r + c + i) % 3 ? lit : []).push([(c - 1) * w * 0.3, 0.3 + r * 0.3, d / 2 + 0.005]);
    decorate(tower, new BoxGeometry(w * 0.18, 0.14, 0.01), CYAN, lit);
    decorate(tower, new BoxGeometry(w * 0.18, 0.14, 0.01), MAGENTA, pink);
    decorate(tower, new BoxGeometry(0.04, h, 0.01), MAGENTA, [[-w / 2 + 0.03, h / 2, d / 2 + 0.006]]);
  });

  // The debtor's shop: shutter half down over the window, a striped awning, light under it.
  facade(kit, -0.75, -1.4, G, 0.14, { width: 1.6, height: 2.5, color: 0x4a3a4e, windows: 2, floors: 2 });
  const shutter = box(1.25, 0.6, 0.04, 0x6a6e7a, -0.75, G + 0.45, -1.22, { delay: 0.3 });
  decorate(
    shutter,
    new BoxGeometry(1.25, 0.012, 0.01),
    0x3a3e4a,
    Array.from({ length: 5 }, (_, k) => [0, 0.08 + k * 0.11, 0.022] as Point),
  );
  box(1.2, 0.08, 0.02, YELLOW, -0.75, G + 0.37, -1.23, { delay: 0.32, flat: true, noInk: true });
  Array.from({ length: 6 }, (_, k) =>
    box(0.27, 0.04, 0.5, k % 2 ? MAGENTA : 0x23707e, -1.42 + k * 0.27, G + 1.15, -1.0, { delay: 0.34 + k * 0.01, rotation: [0.3, 0, 0], noInk: true }),
  );

  // The shopkeeper on his knees, holding up his cash tin.
  const debtor = figure(kit, {
    x: -1.0,
    z: 0.5,
    y: G,
    facing: 1.1,
    height: 2.3,
    build: "heavy",
    skin: 0xd8a888,
    hair: { style: "short", color: 0x8a8a90 },
    face: { mouth: "open", brows: "worried", beard: "moustache" },
    top: { kind: "apron", color: 0x5a6a7a, accent: 0xe8e2d0 },
    bottom: { kind: "trousers", color: 0x3a3f4e },
    arms: [
      [-0.14, 1.05, 0.52],
      [0.14, 1.05, 0.52],
    ],
    legs: "kneel",
    delay: 0.6,
  });
  const tinAt = debtor.at(0, 1.05, 0.56);
  const tin = box(0.34, 0.12, 0.24, 0x7a1e2a, tinAt[0], tinAt[1] - 0.02, tinAt[2], { delay: 1.2, rotation: [0, 1.1, 0] });
  decorate(tin, new CylinderGeometry(0.05, 0.05, 0.02, 10), GOLD, [
    [-0.08, 0.12, 0],
    [0.04, 0.125, 0.04],
    [0.1, 0.12, -0.05],
  ]);
  const lid = box(0.34, 0.02, 0.24, 0x7a1e2a, ...debtor.at(0, 1.03, 0.42), { delay: 1.25 });
  lid.rotation.order = "YXZ";
  lid.rotation.set(-1.2, 1.1, 0);

  // The smashed card terminal on the pavement.
  const terminal = box(0.17, 0.05, 0.27, 0x2a2e3a, -0.15, G, 1.25, { delay: 0.7, rotation: [0, 0.6, 0.12] });
  decorate(terminal, new BoxGeometry(0.12, 0.006, 0.09), 0x1e8aaa, [[0, 0.053, -0.06]]);
  decorate(terminal, new BoxGeometry(0.1, 0.008, 0.01), YELLOW, [[0, 0.056, -0.06]]);
  [0.12, -0.1].forEach((dx, k) => box(0.05, 0.03, 0.05, 0x2a2e3a, -0.15 + dx, G, 1.05 - k * 0.15, { delay: 0.72, rotation: [0.4, k, 0] }));

  // Mora, the chain held out, the ledger in her other hand.
  const facing = -0.15;
  const collector = figure(kit, {
    x: 0.35,
    z: 0.35,
    y: G,
    facing,
    height: 2.5,
    build: "slim",
    skin: 0xe8c8b8,
    hair: { style: "bob", color: 0x14121a },
    face: { mouth: "none", brows: "calm" },
    top: { kind: "coat", color: 0x6e1f4e, accent: 0x3a1028 },
    bottom: { kind: "trousers", color: 0x4a1434 },
    shoes: 0x141218,
    arms: [
      [-0.6, 1.68, 0.5],
      [0.3, 1.32, 0.38],
    ],
    delay: 0.8,
  });
  const u = 2.5 / 2.4;
  const RH = 0.22 * u;
  decorate(collector.headPart, new BoxGeometry(0.075 * u, 0.026 * u, 0.02), 0xd0203a, [[0, RH * 1.06 - 0.1 * u, RH * 0.9 - 0.005]]);
  const [chainHand, ledgerHand] = collector.hands;
  const ledger = box(0.4, 0.03, 0.28, 0x3a1424, ledgerHand[0], ledgerHand[1] - 0.06, ledgerHand[2] + 0.04, { delay: 1.4, rotation: [0.5, facing, 0] });
  decorate(ledger, new BoxGeometry(0.17, 0.012, 0.25), 0xe8e2d0, [
    [-0.095, 0.035, 0],
    [0.095, 0.035, 0],
  ]);
  decorate(ledger, new BoxGeometry(0.12, 0.004, 0.008), 0x3a3040, [
    [-0.1, 0.043, -0.06],
    [-0.1, 0.043, 0],
    [0.09, 0.043, -0.04],
  ]);

  // The chain of coins wheeling round her, tilted; links between the coins.
  const centre: Point = [0.35, G + 1.35, 0.35];
  const R = 1.0;
  const coin = () => new CylinderGeometry(0.12, 0.12, 0.035, 16).rotateX(Math.PI / 2);
  const tilt = new Group();
  const spin = new Group();
  tilt.position.set(...centre);
  tilt.rotation.set(0.3, 0, 0.2);
  tilt.add(spin);
  const pieces = Array.from({ length: 20 }, (_, k) => {
    const a = (k * Math.PI) / 10;
    const piece =
      k % 2
        ? add(new TorusGeometry(0.05, 0.016, 6, 12), GOLD_DARK, 0, 0, 0, { delay: 1.5 + k * 0.02 })
        : add(coin(), GOLD, 0, 0, 0, { delay: 1.5 + k * 0.02 });
    if (!(k % 2)) decorate(piece, new TorusGeometry(0.08, 0.012, 6, 16), GOLD_DARK, [[0, 0.12, 0.02]]);
    piece.position.set(Math.cos(a) * R, k % 2 ? -0.066 : -0.12, Math.sin(a) * R);
    piece.rotation.y = Math.PI / 2 - a + (k % 2 ? Math.PI / 2 : 0);
    return piece;
  });
  const line = add(new TorusGeometry(R, 0.014, 4, 60).rotateX(Math.PI / 2), GOLD_DARK, 0, 0, 0, { delay: 1.48, noInk: true });
  line.position.y = -0.014;
  pieces.push(line);
  pieces[0].parent?.add(tilt);
  pieces.forEach((piece) => spin.add(piece));
  // A short chain from her hand up to the wheel.
  [0.25, 0.5, 0.75].forEach((s, k) =>
    add(new TorusGeometry(0.045, 0.015, 6, 12), GOLD_DARK, chainHand[0] - 0.1 * s, chainHand[1] - 0.05 - 0.2 * s, chainHand[2] + 0.15 * s, { delay: 1.45 + k * 0.02, rotation: [0, k * 1.5, 0] }),
  );

  // Coins flying from the tin up into the wheel.
  const target: Point = [0.0, G + 1.75, -0.2];
  const flying = [0, 1, 2].map((k) => ({ part: add(coin(), GOLD, ...tinAt, { delay: 1.7 + k * 0.05 }), phase: k / 3 }));

  tick((t) => {
    spin.rotation.y = t * 0.8;
    flying.forEach(({ part, phase }) => {
      const s = (t * 0.45 + phase) % 1;
      part.position.set(tinAt[0] + (target[0] - tinAt[0]) * s, tinAt[1] + (target[1] - tinAt[1]) * s + Math.sin(s * Math.PI) * 0.5, tinAt[2] + (target[2] - tinAt[2]) * s);
      part.rotation.set(t * 4 + phase * 5, t * 3, 0);
      part.visible = s > 0.05 && s < 0.95;
    });
    debtor.headPart.rotation.z = Math.sin(t * 25) * 0.015;
  });

  return { width: 4.9, height: 4.5, lookY: 1.6 };
}
