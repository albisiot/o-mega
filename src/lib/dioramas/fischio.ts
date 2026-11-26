import { BoxGeometry, CylinderGeometry, TorusGeometry, type Group } from "three";
import { CYAN, INK, MAGENTA, YELLOW, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { ring } from "@/lib/diorama-props";

/**
 * Fischio (P323): the Banco's referee stands between two challengers in the ring, arms spread,
 * the whistle in her teeth. She has blown it and everything stopped: a punch held in each of
 * her palms, a mouthguard and drops of sweat hanging in the air. Only the whistle's rings move,
 * and the fighters straining against the stillness; she is calm, and in a striped shirt under
 * the lights nobody has ever failed to notice her.
 */
export function fischio(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const DARK = 0x23222b;
  const F = octagonBase(kit, 0x1b1a24);

  // The ring: apron, canvas, four posts with corner pads, ropes on three sides.
  const RT = F + 0.3;
  const deck = box(3.1, 0.3, 3.1, 0x1d2238, 0, F, 0, { delay: 0.05, ink: 1.02 });
  decorate(deck, new BoxGeometry(2.96, 0.01, 2.96), 0x34477a, [[0, 0.305, 0]]);
  decorate(deck, new BoxGeometry(3.1, 0.06, 0.01), MAGENTA, [[0, 0.17, 1.552]]);
  decorate(deck, new BoxGeometry(0.01, 0.06, 3.1), MAGENTA, [
    [1.552, 0.17, 0],
    [-1.552, 0.17, 0],
  ]);
  const P = 1.42;
  [-1, 1].forEach((sx) =>
    [-1, 1].forEach((sz) => {
      cylinder(0.045, 0.05, 1.12, 0x8a93a3, sx * P, RT, sz * P, { delay: 0.12 }, 8);
      box(0.14, 0.62, 0.14, sx < 0 ? MAGENTA : CYAN, sx * P, RT + 0.42, sz * P, { delay: 0.16 });
    }),
  );
  [0.42, 0.72, 1.02].forEach((h, k) => {
    const color = [CYAN, 0xe8e2d0, MAGENTA][k];
    box(2 * P, 0.035, 0.035, color, 0, RT + h, -P, { delay: 0.2 + k * 0.03, noInk: true });
    box(0.035, 0.035, 2 * P, color, -P, RT + h, 0, { delay: 0.2 + k * 0.03, noInk: true });
    box(0.035, 0.035, 2 * P, color, P, RT + h, 0, { delay: 0.2 + k * 0.03, noInk: true });
  });

  // The lighting truss over the back of the ring.
  [-1.4, 1.4].forEach((x) => cylinder(0.04, 0.05, 3.05, DARK, x, F, -1.75, { delay: 0.25 }, 8));
  box(2.95, 0.1, 0.1, DARK, 0, F + 3.0, -1.75, { delay: 0.3 });
  const lights = [-1.05, -0.35, 0.35, 1.05].map((x, k) => {
    const can = cylinder(0.09, 0.07, 0.18, DARK, x, F + 2.86, -1.72, { delay: 0.34 + k * 0.03, rotation: [-0.8, 0, 0] }, 10);
    return decorate(can, new CylinderGeometry(0.075, 0.075, 0.02, 12), YELLOW, [[0, 0, 0]]);
  });

  // Fischio, arms spread, a palm against each punch.
  const facing = 0.3;
  const H = 2.35;
  const u = H / 2.4;
  const ref = figure(kit, {
    x: 0,
    z: -0.15,
    y: RT,
    facing,
    height: H,
    skin: 0xe0b8a0,
    hair: { style: "short", color: 0xc8ccd4 },
    face: { mouth: "none", brows: "angry" },
    top: { kind: "shirt", color: 0xe8e4da },
    bottom: { kind: "trousers", color: 0x1a1a22 },
    shoes: 0x14121c,
    arms: [[-0.86, 1.8, 0.26], [0.86, 1.8, 0.26]],
    legs: "wide",
    delay: 0.8,
  });
  // Black stripes all round the shirt, following the torso.
  const torso = { top: 0.35 * u * 1.03, bottom: 0.3 * u * 1.03, height: 0.7 * u * 0.96, y: 1.04 * u + 0.01 };
  for (let k = 0; k < 16; k++) {
    const theta = (k / 16) * Math.PI * 2;
    add(new CylinderGeometry(torso.top, torso.bottom, torso.height, 2, 1, true, theta - 0.1, 0.2).scale(1, 1, 0.72), 0x1a1a22, ...ref.at(0, torso.y, 0), {
      delay: 1.0,
      noInk: true,
      rotation: [0, facing, 0],
    });
  }
  // The whistle in her teeth, its cord round her neck.
  const mouth = ref.at(0, 2.14 * u - 0.1 * u, ref.headRadius * 0.92);
  box(0.07, 0.05, 0.12, 0xd8dce4, mouth[0], mouth[1] - 0.025, mouth[2], { delay: 1.4, rotation: [0, facing, 0] });
  add(new TorusGeometry(0.15, 0.012, 5, 20).rotateX(Math.PI / 2 - 0.5), INK, ...ref.at(0, 1.62 * u, 0.06), { delay: 1.42, noInk: true, rotation: [0, facing, 0] });

  // The two challengers, a punch each held still in her palms.
  type Fighter = { parts: Group[]; rest: number[] };
  const fighters: Fighter[] = [];
  const challenger = (side: number, colors: { kit: number; glove: number; skin: number; hair: number }, bald: boolean) => {
    const at = ref.at(side * 1.36, 0, 0.18);
    const palm = ref.hands[side < 0 ? 0 : 1];
    const phi = Math.atan2(palm[0] - at[0], palm[2] - at[2]);
    const fist: Point = [palm[0] + Math.sin(phi) * -0.13, palm[1] - 0.02, palm[2] + Math.cos(phi) * -0.13];
    const dx = fist[0] - at[0];
    const dz = fist[2] - at[2];
    const reach: Point = [dx * Math.cos(phi) - dz * Math.sin(phi), fist[1] - RT, dx * Math.sin(phi) + dz * Math.cos(phi)];
    const boxer = figure(kit, {
      x: at[0],
      z: at[2],
      y: RT,
      facing: phi,
      height: 2.2,
      build: "broad",
      skin: colors.skin,
      hair: bald ? { style: "bald", color: colors.hair } : { style: "short", color: colors.hair },
      face: { mouth: "grin", brows: "angry", beard: bald ? "stubble" : undefined },
      top: { kind: "tank", color: colors.kit },
      bottom: { kind: "shorts", color: colors.kit },
      shoes: 0x1a1a22,
      arms: [reach, [0.2, 1.62, 0.32]],
      legs: "stride",
      delay: 1.0,
    });
    const gloves = boxer.hands.map((hand) => ball(0.13, colors.glove, hand[0], hand[1] - 0.13, hand[2], { delay: 1.5 }));
    fighters.push({ parts: [...boxer.parts, ...gloves], rest: [...boxer.parts, ...gloves].map((part) => part.position.x) });
    return boxer;
  };
  challenger(-1, { kit: 0xa01e48, glove: MAGENTA, skin: 0x8a5a40, hair: 0x1f1b22 }, false);
  const right = challenger(1, { kit: 0x1f6f8c, glove: CYAN, skin: 0xe0b090, hair: 0x8a6a4a }, true);

  // What the whistle stopped in mid-air: a mouthguard and drops of sweat.
  const guard = right.at(0.05, 2.2, 0.55);
  add(new TorusGeometry(0.06, 0.022, 6, 14, Math.PI), 0xf4f0e6, guard[0], guard[1], guard[2], { delay: 1.7, rotation: [0.6, 0.4, 0.3] });
  [
    [0.25, 2.3, 0.2],
    [-0.2, 2.45, 0.1],
    [0.1, 2.55, 0.35],
  ].forEach(([x, y, z], i) => {
    const drop = right.at(x, y, z);
    ball(0.025, 0x9fe8ff, drop[0], drop[1], drop[2], { delay: 1.75 + i * 0.03, flat: true });
  });

  // The whistle's blast, spreading round her in rings over the whole ring.
  const [cx, , cz] = ref.at(0, 0, 0);
  const blast = [0, 1, 2].map((k) => ({ part: ring(kit, [cx, mouth[1] - 0.2, cz], 0.5, k === 1 ? CYAN : 0xe8f4ff, 1.8 + k * 0.05), phase: k / 3 }));

  tick((t) => {
    blast.forEach(({ part, phase }) => {
      const s = (t * 0.45 + phase) % 1;
      part.children[0].scale.set(1 + s * 2.6, 1, 1 + s * 2.6);
      part.position.y = mouth[1] - 0.2 - s * 0.5;
      part.visible = s < 0.85;
    });
    // The challengers strain against the stillness now and then.
    const strain = Math.sin(t * 0.9) > 0.75 ? Math.sin(t * 40) * 0.012 : 0;
    fighters.forEach(({ parts, rest }, k) => parts.forEach((part, i) => (part.position.x = rest[i] + (k ? -strain : strain))));
    lights.forEach((light, k) => light.color.setHex(Math.floor(t * 4 + k * 3) % 19 === 7 ? 0xfff4c0 : YELLOW));
  });

  return { width: 4.9, height: 4.6, lookY: 1.7 };
}
