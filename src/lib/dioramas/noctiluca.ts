import { BoxGeometry, Color, ExtrudeGeometry, Shape } from "three";
import { CYAN, MAGENTA, YELLOW, colorOf, octagonBase, type Framing, type Kit } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, orb, skyline } from "@/lib/diorama-props";

/**
 * Noctiluca (P069): the heroine in white and cyan stands on the ledge of a high roof, arms
 * spread, and blazes like a lighthouse over the night skyline, her rays turning slowly and moths
 * circling her. Then the moon in the corner turns into the noon sun, and her rays shrink to the
 * glow of a light bulb, until night comes back.
 */
export function noctiluca(kit: Kit): Framing {
  const { add, box, ball, decorate, tick } = kit;
  const WHITE = 0xe8eef4;
  const F = octagonBase(kit, 0x1a1a26);
  const G = floor(kit, F, 0.06, 0x2c2c3a, 0x20202c, 0.5);

  // The city below, a spire with its light, the roof's ledge, a vent.
  skyline(kit, -1.8, G, 0.1, [0x2a2f4a, 0x3a2a4a, 0x22344a], -1.3, 1.3);
  box(0.12, 2.6, 0.12, 0x3a2a4a, 1.0, G, -1.75, { delay: 0.3 });
  const spire = box(0.08, 0.08, 0.08, MAGENTA, 1.0, G + 2.62, -1.75, { delay: 0.34, flat: true, noInk: true });
  const LZ = -0.35;
  const ledge = box(3.4, 0.42, 0.7, 0x4a4f62, 0, G, LZ, { delay: 0.4, ink: 1.02 });
  decorate(ledge, new BoxGeometry(3.4, 0.04, 0.72), 0x5d6680, [[0, 0.4, 0]]);
  box(0.3, 0.5, 0.3, 0x3a3f4e, -1.35, G, 0.9, { delay: 0.45 });
  box(0.4, 0.06, 0.4, 0x23222b, -1.35, G + 0.5, 0.9, { delay: 0.48 });

  // The moon, which by day is the sun.
  const sky = ball(0.28, 0xe8e2d0, -1.55, G + 3.35, -1.45, { delay: 0.5, flat: true });

  // Noctiluca on the ledge, arms out.
  const Y = G + 0.42;
  const hero = figure(kit, {
    x: 0,
    z: LZ + 0.05,
    y: Y,
    facing: 0.3,
    height: 2.45,
    skin: 0xf0d0b8,
    hair: { style: "wild", color: 0xe8c070 },
    face: { mouth: "neutral", brows: "calm", eyes: 0x2a8ab0 },
    top: { kind: "shirt", color: WHITE, accent: CYAN },
    bottom: { kind: "trousers", color: WHITE },
    shoes: CYAN,
    belt: CYAN,
    scarf: CYAN,
    gloves: WHITE,
    arms: ["out", "out"],
    legs: "wide",
    delay: 0.7,
  });
  // Her cape, hanging behind her (drawn here: the kit's cape shows only ink from the front).
  const cloth = new Shape();
  cloth.moveTo(-0.42, 1.7);
  cloth.lineTo(0.42, 1.7);
  cloth.lineTo(0.75, 0.2);
  cloth.lineTo(-0.75, 0.2);
  cloth.closePath();
  const cape = add(new ExtrudeGeometry(cloth, { depth: 0.04, bevelEnabled: false }), 0x2fa8c8, ...hero.at(0, 0.0, -0.3), { delay: 0.75, rotation: [-0.12, 0.3, 0] });
  cape.rotation.order = "YXZ";
  // Cyan panels down the legs.
  [-1, 1].forEach((s) => box(0.06, 0.8, 0.02, CYAN, ...hero.at(s * 0.3, 0.15, 0.1), { delay: 1.2, flat: true, noInk: true, rotation: [0, 0.3, s * 0.05] }));
  // Her glow: lit hands, and rays round her that turn.
  const glows = hero.hands.map((hand, i) => orb(kit, [hand[0], hand[1] + 0.13, hand[2]], 0.13, YELLOW, 1.3 + i * 0.03));
  const chest = hero.at(0, 1.5, -0.35);
  const hub = ball(0.05, YELLOW, chest[0], chest[1] - 0.05, chest[2], { delay: 1.3, flat: true, noInk: true });
  hub.rotation.order = "YXZ";
  hub.rotation.y = 0.3;
  const rays: { lean: number; r: number }[] = [];
  const spots = (n: number, r: number, offset: number): [number, number, number, number][] =>
    Array.from({ length: n }, (_, k) => {
      const lean = offset + (k / n) * Math.PI * 2;
      rays.push({ lean, r });
      return [-Math.sin(lean) * r, 0.05 + Math.cos(lean) * r, 0, lean];
    });
  decorate(hub, new BoxGeometry(0.07, 1.3, 0.02), YELLOW, spots(10, 1.25, 0));
  decorate(hub, new BoxGeometry(0.035, 0.9, 0.02), 0xfff1a8, spots(10, 1.05, Math.PI / 10));
  decorate(hub, new BoxGeometry(0.025, 0.7, 0.02), MAGENTA, spots(4, 1.6, Math.PI / 4));

  // Moths drawn to the light.
  const moths = [0, 1, 2].map((k) => {
    const moth = box(0.03, 0.03, 0.1, 0x8a8478, 0, 0, 0, { delay: 1.6 + k * 0.05 });
    decorate(moth, new BoxGeometry(0.2, 0.01, 0.07), 0xd8d0bc, [[0, 0.03, 0]]);
    return moth;
  });

  const head = hero.head;
  const moon = new Color(0xe8e2d0);
  const sun = new Color(YELLOW);
  tick((t) => {
    // Night for most of the cycle, then noon: the rays shrink to a bulb's glow.
    const p = (t / 16) % 1;
    const day = p < 0.6 ? 0 : p < 0.66 ? (p - 0.6) / 0.06 : p < 0.92 ? 1 : 1 - (p - 0.92) / 0.08;
    const k = 1 - day * 0.85;
    hub.rotation.z = t * 0.15;
    hub.children.slice(1).forEach((ray, i) => {
      const { lean, r } = rays[i];
      ray.position.set(-Math.sin(lean) * r * k, 0.05 + Math.cos(lean) * r * k, 0);
      ray.scale.set(1, k, 1);
    });
    glows.forEach((glow) => glow.children[0].scale.setScalar(0.4 + 0.6 * k));
    colorOf(sky).lerpColors(moon, sun, day);
    sky.children[0].scale.setScalar(1 + day * 0.3);
    moths.forEach((moth, i) => {
      const a = t * (1.6 + i * 0.4) + i * 2.1;
      const r = (0.55 + i * 0.12) * (0.5 + 0.5 * k);
      moth.position.set(head[0] + Math.cos(a) * r, head[1] + 0.25 + Math.sin(t * 3 + i) * 0.12, head[2] + Math.sin(a) * r);
      moth.rotation.y = -a;
      moth.children[2].rotation.z = Math.sin(t * 30 + i) * 0.5;
    });
    spire.visible = Math.floor(t * 1.2) % 2 === 0;
  });

  return { width: 4.9, height: 4.6, lookY: 1.75 };
}
