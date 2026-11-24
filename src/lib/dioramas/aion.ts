import { BoxGeometry, ConeGeometry, CylinderGeometry, ExtrudeGeometry, Group, Shape, SphereGeometry, TorusGeometry } from "three";
import { CYAN, MAGENTA, YELLOW, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, skyline } from "@/lib/diorama-props";

/**
 * Aion (P104): what is left of time after the end sits alone on the tiers of the ancient
 * theatre, chin on his hand, bored stiff: he has already seen how it ends. Inside the hood a
 * starry void and two white eyes; round his head the pieces of a broken clock (rims, gears,
 * hands) circle lazily, and the hourglass beside him has run out, too heavy for him to turn
 * over. Now and then he glitches, cyan and magenta slices jumping round him.
 */
export function aion(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick, motes } = kit;
  const VOID = 0x0e1430;
  const HOOD = 0x22305e;
  const ROBE = 0x1c2650;
  const BRASS = 0xd8b04a;
  const GLASS = 0xb8e4f0;
  const F = octagonBase(kit, 0x161a30);
  const G = floor(kit, F, 0.06, 0x2a2e48, 0x1c1f34, 0.55);

  // The city far off behind the theatre, under the stars.
  box(2.3, 0.72, 0.12, 0x1e2238, 0, G, -1.97, { delay: 0.08, noInk: true });
  skyline(kit, -1.95, G + 0.7, 0.1, [0x2a2f4a, 0x22283f, 0x2e2a48], -1.1, 1.1);
  motes(14, 0xe8f0ff, 0.025, [-2, G + 2.2, -1.8], [2, G + 4.2, -0.6], 1.2);

  // The tiers of the theatre: three curved steps of stone round the stage.
  const CZ = 1.25;
  const SPAN = 0.85;
  const tier = (inner: number, outer: number, height: number) => {
    const shape = new Shape();
    shape.moveTo(-outer * Math.sin(SPAN), outer * Math.cos(SPAN));
    shape.absarc(0, 0, outer, Math.PI / 2 + SPAN, Math.PI / 2 - SPAN, true);
    shape.lineTo(inner * Math.sin(SPAN), inner * Math.cos(SPAN));
    shape.absarc(0, 0, inner, Math.PI / 2 - SPAN, Math.PI / 2 + SPAN, false);
    shape.closePath();
    return new ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments: 20 }).rotateX(-Math.PI / 2);
  };
  [
    [1.35, 1.85, 0.52],
    [1.85, 2.35, 0.95],
    [2.35, 2.85, 1.38],
  ].forEach(([inner, outer, height], k) => add(tier(inner, outer, height), k % 2 ? 0x3e4462 : 0x4a5070, 0, G, CZ, { delay: 0.2 + k * 0.08, ink: 1.01 }));

  // The hourglass beside him, run out, every grain at the bottom.
  const HX = 0.85;
  const HZ = -0.3;
  const HY = G + 0.52;
  cylinder(0.15, 0.15, 0.05, BRASS, HX, HY, HZ, { delay: 1.0 }, 12);
  add(new ConeGeometry(0.13, 0.22, 12), YELLOW, HX, HY + 0.05, HZ, { delay: 1.03 });
  add(new ConeGeometry(0.13, 0.22, 12).rotateX(Math.PI), GLASS, HX, HY + 0.27, HZ, { delay: 1.05 });
  cylinder(0.15, 0.15, 0.05, BRASS, HX, HY + 0.49, HZ, { delay: 1.07 }, 12);
  [0, 1, 2].forEach((k) => {
    const a = (k / 3) * Math.PI * 2 + 0.4;
    cylinder(0.014, 0.014, 0.44, BRASS, HX + Math.sin(a) * 0.13, HY + 0.05, HZ + Math.cos(a) * 0.13, { delay: 1.08, noInk: true }, 6);
  });

  // Aion: a hooded cloak with nothing inside but stars; only the hands are pale.
  const aeon = figure(kit, {
    x: 0,
    z: -0.32,
    y: G,
    facing: 0.75,
    height: 2.3,
    build: "slim",
    skin: VOID,
    face: { blank: true },
    headwear: { kind: "hood", color: HOOD },
    top: { kind: "robe", color: ROBE },
    cape: 0x18214a,
    gloves: 0xd6cfc0,
    arms: ["chin", [0.62, 1.38, 0.42]],
    legs: "sit",
    delay: 0.6,
  });
  const RH = aeon.headRadius;
  const cy = RH * 1.06;
  decorate(aeon.headPart, new SphereGeometry(0.04, 10, 6).scale(1.6, 0.5, 0.4), 0xf4f8ff, [
    [-0.075, cy + 0.03, RH * 0.88, -0.25],
    [0.075, cy + 0.03, RH * 0.88, 0.25],
  ]);
  decorate(aeon.headPart, new BoxGeometry(0.014, 0.014, 0.01), 0xcfe8ff, [
    [-0.12, cy - 0.06, RH * 0.82],
    [0.04, cy - 0.1, RH * 0.9],
    [0.13, cy + 0.12, RH * 0.75],
    [-0.02, cy + 0.15, RH * 0.85],
    [0.1, cy - 0.05, RH * 0.86],
    [-0.08, cy - 0.15, RH * 0.8],
  ]);

  // The broken clock going round his head: pieces of rim, gears and hands, tilted, slow.
  const orbit = new Group();
  orbit.position.set(...aeon.at(0, 1.62, 0));
  orbit.rotation.set(0.32, 0, -0.18);
  const pieces = [0, 1.6, 3.3, 4.7].map((a, k) =>
    add(new TorusGeometry(0.72, 0.035, 5, 10, 0.75).rotateX(Math.PI / 2).rotateY(a), BRASS, 0, 0, 0, { delay: 1.3 + k * 0.05 }),
  );
  [0.85, 2.5, 4.0].forEach((a, k) => {
    const gear = add(new CylinderGeometry(0.1 + (k % 2) * 0.03, 0.1 + (k % 2) * 0.03, 0.035, 14).rotateX(Math.PI / 2).rotateY(a), BRASS, Math.sin(a) * 0.76, -0.12, Math.cos(a) * 0.76, {
      delay: 1.45 + k * 0.05,
    });
    decorate(gear, new SphereGeometry(0.03, 8, 6), 0x6a4c1c, [[0, 0.1 + (k % 2) * 0.03, 0]]);
    pieces.push(gear);
  });
  [1.25, 5.4].forEach((a, k) => {
    const hand = box(0.025, 0.34, 0.015, BRASS, Math.sin(a) * 0.74, -0.05, Math.cos(a) * 0.74, { delay: 1.6 + k * 0.05, rotation: [0, a, k ? 0.9 : -0.7] });
    decorate(hand, new ConeGeometry(0.05, 0.1, 4), BRASS, [[0, 0.36, 0]]);
    pieces.push(hand);
  });
  pieces.forEach((part) => {
    const at = part.position.clone();
    part.parent?.add(orbit);
    orbit.add(part);
    part.position.copy(at);
  });

  // The glitch: slices of cyan and magenta jumping round him.
  const slices = [0, 1, 2, 3, 4, 5].map((k) =>
    box(0.3 + (k % 3) * 0.15, 0.04, 0.02, k % 2 ? CYAN : MAGENTA, 0, 0, 0, { delay: 1.8 + k * 0.03, flat: true, noInk: true, rotation: [0, 0.35, 0] }),
  );
  const placeSlices = (seed: number) =>
    slices.forEach((slice, k) => {
      const r = (n: number) => {
        const v = Math.sin((seed + 1) * 12.9898 + k * 78.233 + n * 37.719) * 43758.5453;
        return v - Math.floor(v);
      };
      const at: Point = aeon.at(-0.55 + r(1) * 1.1, 0.6 + r(2) * 1.4, 0.25 + r(3) * 0.2);
      slice.position.set(...at);
      slice.visible = r(4) > 0.25;
    });
  placeSlices(0);
  const rest = aeon.parts.map((part) => part.position.x);

  tick((t) => {
    orbit.rotation.y = t * 0.35;
    const step = Math.floor(t * 8);
    if (t > 0) placeSlices(step);
    const glitch = t > 0 && t % 2.6 > 2.45;
    aeon.parts.forEach((part, i) => (part.position.x = rest[i] + (glitch ? (step % 2 ? 0.05 : -0.05) : 0)));
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}
