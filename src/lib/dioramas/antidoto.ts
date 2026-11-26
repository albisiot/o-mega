import { BoxGeometry, Color, CylinderGeometry } from "three";
import { CYAN, MAGENTA, ORANGE, colorOf, jag, limb, octagonBase, zigzag, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { facade, floor, lamp, puddle, ring } from "@/lib/diorama-props";

/**
 * Antidoto (P330): the Custodi agent on a rainy neon street grips a Segnato's glowing fist by
 * the wrist, and the magenta power drains out of it. Round him a grey circle on the asphalt
 * marks the ground where no Segno works, and a pulse spreads from it now and then: the neon
 * sign on the wall beside him is dead and the puddle in it reflects nothing, while the sign
 * beyond his reach still shines. He has no power of his own either.
 */
export function antidoto(kit: Kit): Framing {
  const { add, box, decorate, tick } = kit;
  const DEAD = 0x4a4c58;
  const F = octagonBase(kit, 0x1b1c26);
  const G = floor(kit, F, 0.06, 0x262a36, 0x1c1f2a, 0.5);

  // The street: a house front with two neon signs, a lamp, puddles.
  const wall = facade(kit, -0.2, -1.45, G, 0.1, { width: 2.9, height: 2.9, color: 0x2a2f4a, windows: 3, floors: 2, lit: 0x9fe8ff });
  const dead = [
    decorate(wall, new BoxGeometry(0.72, 0.045, 0.03), DEAD, [
      [-0.95, 2.55, 0.17],
      [-0.95, 2.05, 0.17],
    ]),
    decorate(wall, new BoxGeometry(0.045, 0.5, 0.03), DEAD, [
      [-1.3, 2.3, 0.17],
      [-0.6, 2.3, 0.17],
    ]),
  ];
  const live = decorate(
    wall,
    new BoxGeometry(0.2, 0.045, 0.03),
    CYAN,
    [0, 1, 2, 3, 4].map((k) => [0.55 + k * 0.17, 2.3 + (k % 2 ? 0.08 : -0.08), 0.17, k % 2 ? -0.75 : 0.75] as [number, number, number, number]),
  );
  decorate(wall, new BoxGeometry(0.75, 0.045, 0.03), MAGENTA, [[0.9, 2.05, 0.17]]);
  lamp(kit, 1.7, -0.6, G, 0.3, 2.5, ORANGE);
  puddle(kit, -1.0, 0.8, G, 0.4, 0.38, DEAD);
  puddle(kit, 1.35, 0.85, G, 0.45, 0.32, MAGENTA);

  // Where Antidoto's left hand will close: worked out in his frame before anyone is built.
  const [ax, az, phi] = [-0.4, 0.25, 0.45];
  const H = 2.5;
  const u = H / 2.4;
  const grip: Point = [ax + 0.9 * Math.cos(phi) + 0.3 * Math.sin(phi), G + 1.5, az - 0.9 * Math.sin(phi) + 0.3 * Math.cos(phi)];
  /** A world point in the frame of someone standing at (x, z) and turned by `turn`. */
  const local = (x: number, z: number, turn: number, p: Point): Point => {
    const dx = p[0] - x;
    const dz = p[2] - z;
    return [dx * Math.cos(turn) - dz * Math.sin(turn), p[1] - G, dx * Math.sin(turn) + dz * Math.cos(turn)];
  };

  // The Segnato, his punch caught, the glow going out of his arm.
  const [tx, tz] = [1.15, -0.15];
  const turn = Math.atan2(grip[0] - tx, grip[2] - tz);
  const punch: Point = [grip[0] + Math.sin(turn) * 0.15, grip[1], grip[2] + Math.cos(turn) * 0.15];
  const thug = figure(kit, {
    x: tx,
    z: tz,
    y: G,
    facing: turn,
    height: 2.3,
    skin: 0xc49a7a,
    hair: { style: "mohawk", color: 0xd82e6c },
    face: { mouth: "open", brows: "worried" },
    top: { kind: "hoodie", color: 0x3a2a4a, accent: 0x4a3a5a },
    bottom: { kind: "trousers", color: 0x23283a },
    shoes: 0xe0dccf,
    arms: ["back", local(tx, tz, turn, punch)],
    legs: "stride",
    delay: 0.6,
  });
  const [elbow, fist] = [thug.elbows[1], thug.hands[1]];
  const glow = limb(kit, elbow, fist, 0.11, 0.1, MAGENTA, { delay: 1.3, flat: true });
  const knuckles = add(new CylinderGeometry(0.1, 0.1, 0.2, 12), MAGENTA, fist[0], fist[1] - 0.1, fist[2], { delay: 1.32, flat: true });
  const sparks = [0, 1, 2].map((k) => {
    const from: Point = [fist[0], fist[1] + 0.05, fist[2]];
    const to: Point = [fist[0] + (k - 1) * 0.3, fist[1] + 0.3 + k * 0.08, fist[2] + 0.25 - k * 0.1];
    return zigzag(kit, jag(from, to, 4, 0.06, k), 0.02, MAGENTA, 1.4 + k * 0.05);
  });
  const wrist: Point = [elbow[0] + (fist[0] - elbow[0]) * 0.72, elbow[1] + (fist[1] - elbow[1]) * 0.72, elbow[2] + (fist[2] - elbow[2]) * 0.72];

  // Antidoto, in his tactical vest, looking at us as he holds the wrist.
  const agent = figure(kit, {
    x: ax,
    z: az,
    y: G,
    facing: phi,
    height: H,
    build: "broad",
    skin: 0x5a3a2a,
    hair: { style: "short", color: 0x3a3a40 },
    face: { mouth: "frown", brows: "angry" },
    top: { kind: "armor", color: 0x23283a, accent: 0x2c3448 },
    bottom: { kind: "trousers", color: 0x1e2230 },
    shoes: 0x14121c,
    belt: 0x2a2a30,
    arms: ["down", local(ax, az, phi, [wrist[0], wrist[1] - 0.03, wrist[2]])],
    legs: "wide",
    delay: 0.8,
  });
  // Pouches on the vest.
  [-0.17, 0, 0.17].forEach((x, k) => box(0.13, 0.12, 0.06, 0x1a1e2a, ...agent.at(x, 1.22 * u, 0.32 * u + 0.02), { delay: 1.3 + k * 0.02, rotation: [0, phi, 0] }));

  // The dead ground round him, and the pulse that spreads from it.
  const centre: Point = [ax, G + 0.004, az];
  ring(kit, centre, 1.15, DEAD, 0.5);
  ring(kit, centre, 1.08, 0x6a6c78, 0.52);
  const pulse = ring(kit, centre, 0.4, 0xb8c0cc, 1.6);

  // Rain.
  const drops = Array.from({ length: 14 }, (_, k) => {
    const x = -1.6 + ((k * 7) % 14) * 0.24;
    const z = -0.9 + ((k * 5) % 11) * 0.22;
    return { part: box(0.01, 0.22, 0.01, k % 3 ? 0x9fe8ff : 0x5d6680, x, G + 1, z, { delay: 0.5, flat: true, noInk: true }), phase: k / 14 };
  });

  const glowOn = new Color(MAGENTA);
  const glowOff = new Color(DEAD);
  tick((t) => {
    // His touch drains the Segno: the arm fades, sparks die, then it flares again.
    const cycle = (t * 0.35) % 1;
    const fade = cycle < 0.2 ? 0 : Math.min(1, (cycle - 0.2) * 2.2);
    colorOf(glow).lerpColors(glowOn, glowOff, fade);
    colorOf(knuckles).lerpColors(glowOn, glowOff, fade);
    sparks.forEach((spark, k) => spark.forEach((piece) => (piece.visible = fade < 0.5 && Math.floor(t * 9 + k) % 3 !== 0)));
    const s = (t * 0.4) % 1;
    pulse.children[0].scale.set(1 + s * 2.4, 1, 1 + s * 2.4);
    pulse.visible = s < 0.85;
    dead.forEach((tube) => tube.color.setHex(Math.floor(t * 7) % 37 === 12 ? 0xb05a8a : DEAD));
    live.color.setHex(Math.floor(t * 3) % 11 === 5 ? 0x0e5a7a : CYAN);
    drops.forEach(({ part, phase }) => (part.position.y = G + 3.2 - ((t * 1.6 + phase) % 1) * 3.1));
  });

  return { width: 4.9, height: 4.5, lookY: 1.55 };
}
