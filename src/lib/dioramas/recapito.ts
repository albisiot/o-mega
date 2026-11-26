import { BoxGeometry, CatmullRomCurve3, CylinderGeometry, ExtrudeGeometry, Group, Shape, TorusGeometry, Vector3 } from "three";
import { CYAN, INK, MAGENTA, YELLOW, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Recapito (P316): the postman pops out of thin air on an old-town doorstep with a bang, a
 * yellow burst behind him and smoke at his feet, holding out the clipboard to sign to a
 * startled lady in her dressing gown. The swirl he left is still spinning across the street,
 * and the registered letters are only now flying over: he always arrives before the post.
 */
export function recapito(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const WALL = 0x3a2f4e;
  const F = octagonBase(kit, 0x1e1c28);
  const G = floor(kit, F, 0.06, 0x34364a, 0x262836, 0.35);

  // The palazzo front: windows with shutters, the open doorway with its step, a letter box.
  const wall = box(2.4, 2.9, 0.3, WALL, -0.35, G, -1.5, { delay: 0.1, ink: 1.02 });
  const front = 0.155;
  decorate(wall, new BoxGeometry(0.3, 0.42, 0.01), YELLOW, [[0.55, 2.2, front]]);
  decorate(wall, new BoxGeometry(0.3, 0.42, 0.01), 0x141a26, [[-0.55, 2.2, front]]);
  decorate(wall, new BoxGeometry(0.12, 0.44, 0.012), 0x2f6f60, [-0.75, -0.35, 0.35, 0.75].map((x) => [x, 2.2, front + 0.001] as Point));
  decorate(wall, new BoxGeometry(1.0, 2.0, 0.012), 0x6a5a7a, [[-0.55, 1.0, front]]);
  decorate(wall, new BoxGeometry(0.8, 1.85, 0.014), 0x14121c, [[-0.55, 0.925, front + 0.001]]);
  box(1.1, 0.1, 0.5, 0x5d6680, -0.9, G, -1.1, { delay: 0.2 });
  const postbox = box(0.3, 0.42, 0.16, MAGENTA, 0.35, G + 0.95, -1.27, { delay: 0.25 });
  decorate(postbox, new BoxGeometry(0.18, 0.03, 0.01), INK, [[0, 0.3, 0.081]]);

  // The lady at her door, cup in hand, eyebrows up.
  const L = figure(kit, {
    x: -1.0,
    z: -1.05,
    y: G + 0.1,
    facing: 0.75,
    height: 2.25,
    skin: 0xe8c0a8,
    hair: { style: "bun", color: 0xb8b8c4 },
    face: { mouth: "open", brows: "raised", glasses: "round", glassesColor: 0x8a93a3 },
    top: { kind: "robe", color: 0x7a3a6a, accent: 0x9a5a8a },
    shoes: 0xff9ac0,
    arms: ["down", [0.28, 1.4, 0.32]],
    delay: 0.6,
  });
  const cup = L.hands[1];
  cylinder(0.06, 0.05, 0.12, 0xe8e4dc, cup[0], cup[1] - 0.02, cup[2] + 0.06, { delay: 1.2 }, 10);

  // Recapito, arrived: the clipboard held out to her, the satchel at his hip.
  const P = figure(kit, {
    x: 0.05,
    z: 0.1,
    y: G,
    facing: 0.15,
    height: 2.4,
    skin: 0xe0b49a,
    hair: { style: "short", color: 0xa8acb6 },
    face: { mouth: "neutral", brows: "calm" },
    top: { kind: "uniform", color: 0x1f2a4a, accent: 0x8a93a3 },
    bottom: { kind: "trousers", color: 0x1f2a4a },
    shoes: 0x1a1a22,
    arms: [[-0.85, 1.6, 0.25], "hip"],
    legs: "wide",
    delay: 0.9,
  });
  add(new CylinderGeometry(0.33, 0.33, 0.08, 18).scale(1, 1, 0.75), YELLOW, ...P.at(0, 1.52, 0), { delay: 1.3, rotation: [0, 0.15, 0] });
  const [hand] = P.hands;
  const board = box(0.26, 0.34, 0.03, 0x5e4a3a, hand[0] - 0.08, hand[1] - 0.12, hand[2] + 0.05, { delay: 1.4, rotation: [0, 0.6, 0.1] });
  decorate(board, new BoxGeometry(0.2, 0.24, 0.01), 0xf4f0e6, [[0, 0.15, 0.02]]);
  decorate(board, new BoxGeometry(0.14, 0.012, 0.01), 0x8a93a3, [0.1, 0.15, 0.2].map((y) => [0, y, 0.026] as Point));
  const bag = box(0.36, 0.32, 0.14, 0x5e3a2a, ...P.at(0.42, 0.85, 0.06), { delay: 1.35, rotation: [0, 0.15, 0] });
  decorate(bag, new BoxGeometry(0.14, 0.12, 0.01), 0xf4f0e6, [[-0.06, 0.34, 0.02, 0.2]]);
  limb(kit, P.at(-0.3, 1.74, 0.16), P.at(0.0, 1.35, 0.27), 0.025, 0.025, 0x4a2c20, { delay: 1.36 });
  limb(kit, P.at(0.0, 1.35, 0.27), P.at(0.4, 1.12, 0.12), 0.025, 0.025, 0x4a2c20, { delay: 1.37 });

  // The bang: a yellow burst behind him and smoke round his feet.
  const star = new Shape();
  for (let k = 0; k < 16; k++) {
    const r = k % 2 ? 0.28 : 0.62;
    const a = (k / 16) * Math.PI * 2;
    if (k) star.lineTo(r * Math.sin(a), r * Math.cos(a));
    else star.moveTo(0, r);
  }
  star.closePath();
  const burst = add(new ExtrudeGeometry(star, { depth: 0.02, bevelEnabled: false }), YELLOW, 0.55, G + 1.25, -0.45, { delay: 0.85, flat: true, rotation: [0, 0.35, 0.2] });
  const puffs = [0, 1, 2, 3, 4].map((k) => {
    const a = k * 1.3 + 0.4;
    return ball(0.13 + (k % 2) * 0.05, 0x8a8ea0, ...P.at(Math.cos(a) * 0.45, 0, Math.sin(a) * 0.35), { delay: 1.0 + k * 0.03 });
  });

  // Where he left from: the swirl still spinning, and the letters only now flying over.
  const S: Point = [1.45, G + 1.2, 0.4];
  const swirl = [0, 1, 2].map((k) => {
    const r = 0.6 - k * 0.13;
    const ring = add(new TorusGeometry(r, 0.025, 6, 30, Math.PI * 1.6), k % 2 ? CYAN : MAGENTA, 0, -r, 0, { delay: 0.5 + k * 0.05, flat: true, noInk: true });
    const spin = new Group();
    ring.parent?.add(spin);
    spin.position.set(...S);
    spin.add(ring);
    return spin;
  });
  cylinder(0.5, 0.5, 0.01, 0x5a2148, S[0], G, S[2], { delay: 0.5, flat: true, noInk: true }, 20);
  const path = new CatmullRomCurve3([new Vector3(S[0], S[1], S[2]), new Vector3(0.9, G + 2.3, -0.3), new Vector3(-0.2, G + 2.4, -0.8), new Vector3(-0.85, G + 1.5, -1.0)]);
  const letters = [0, 1, 2].map((k) => {
    const letter = box(0.28, 0.18, 0.02, 0xf4f0e6, S[0], S[1], S[2], { delay: 1.2 + k * 0.05 });
    decorate(letter, new BoxGeometry(0.17, 0.012, 0.01), 0x8a93a3, [
      [-0.06, 0.12, 0.011, -0.55],
      [0.06, 0.12, 0.011, 0.55],
    ]);
    return letter;
  });

  tick((t) => {
    swirl.forEach((spin, k) => spin.rotation.set(0, 0.35, k + t * (k % 2 ? -3 : 2.4)));
    const flash = (t % 1.6) / 1.6;
    burst.children.forEach((mesh) => mesh.scale.setScalar(0.85 + 0.25 * Math.max(0, Math.cos(flash * Math.PI * 2))));
    puffs.forEach((p, k) => (p.position.y = G + Math.abs(Math.sin(t * 1.5 + k)) * 0.08));
    letters.forEach((letter, k) => {
      const u = (t * 0.22 + 0.35 + k * 0.12) % 1;
      letter.position.copy(path.getPointAt(u));
      letter.rotation.set(0.3, t * 2 + k, Math.sin(t * 3 + k) * 0.4);
    });
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}
