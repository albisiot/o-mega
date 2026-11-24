import { BoxGeometry, ConeGeometry, CylinderGeometry, Group, MathUtils, SphereGeometry, TorusGeometry } from "three";
import { CYAN, MAGENTA, YELLOW, aim, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure, type Figure } from "@/lib/diorama-figure";
import { floor, skyline } from "@/lib/diorama-props";

/**
 * A cap of hair over the top of a figure's head (the figure's own caps sit low and leave it bald);
 * `front` tips it back to bare the forehead.
 */
function hairCap(kit: Kit, person: Figure, color: number, facing: number, delay: number, front = 0.4): Group {
  const R = person.headRadius;
  const [x, y, z] = person.head;
  const cap = kit.add(new SphereGeometry(R * 1.12, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 1.1, 1.02), color, x - Math.sin(facing) * 0.03, y - R * 0.05, z - Math.cos(facing) * 0.03, { delay });
  cap.rotation.order = "YXZ";
  cap.rotation.set(-front, facing, 0);
  return cap;
}

/**
 * Larceny (P046): the fastest thief in Nuova Megara stops for a second on a rooftop by the water
 * tower, ponytail still streaming, and dangles a stolen watch for us to read the time; her other
 * forearm is stacked with more watches, and streaks of magenta and cyan trail where she has just
 * been. The price, a body that breaks easily: plasters on her face and hand.
 */
export function larceny(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const HAIR = 0x1a1428;
  const SILVER = 0xc8ccd4;
  const IRON = 0x3a3f4e;
  const F = octagonBase(kit, 0x1c1a26);
  const G = floor(kit, F, 0.06, 0x2a2c36, 0x1e2028, 0.6);

  // The city behind the roof's low wall.
  skyline(kit, -1.95, G, 0.1, [0x2a2f4a, 0x3a2a4a, 0x22344a], -1.25, 0.6);
  box(2.6, 0.35, 0.18, 0x3a3a4a, -0.2, G, -1.55, { delay: 0.3 });

  // The water tower: legs, a staved tank with iron hoops, a cone roof, a ladder.
  const TX = 1.15;
  const TZ = -0.95;
  [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => box(0.07, 1.05, 0.07, IRON, TX + sx * 0.32, G, TZ + sz * 0.32, { delay: 0.35 })));
  [-1, 1].forEach((s) => box(0.9, 0.04, 0.04, IRON, TX, G + 0.5, TZ + s * 0.32, { delay: 0.38, noInk: true, rotation: [0, 0, s * 0.5] }));
  box(0.9, 0.06, 0.9, IRON, TX, G + 1.0, TZ, { delay: 0.4 });
  const tank = cylinder(0.48, 0.48, 0.85, 0x4a3a4e, TX, G + 1.06, TZ, { delay: 0.45 }, 16);
  decorate(
    tank,
    new BoxGeometry(0.012, 0.85, 0.01),
    0x2e2434,
    [-1.2, -0.7, -0.25, 0.2, 0.65, 1.1].map((a) => [Math.sin(a) * 0.485, 0.425, Math.cos(a) * 0.485] as Point),
  );
  decorate(tank, new TorusGeometry(0.49, 0.02, 6, 24).rotateX(Math.PI / 2), IRON, [[0, 0.2, 0], [0, 0.62, 0]]);
  add(new ConeGeometry(0.56, 0.42, 16), 0x3a2a40, TX, G + 1.91, TZ, { delay: 0.5 });
  ball(0.05, MAGENTA, TX, G + 2.3, TZ, { delay: 0.55, flat: true, noInk: true });
  [-0.12, 0.12].forEach((dx) => box(0.025, 1.0, 0.025, IRON, TX - 0.45 + dx, G, TZ + 0.38, { delay: 0.5, noInk: true }));
  [0.2, 0.45, 0.7, 0.95].forEach((y) => box(0.26, 0.02, 0.02, IRON, TX - 0.45, G + y, TZ + 0.38, { delay: 0.52, noInk: true }));

  // A vent with an antenna on the other side.
  box(0.35, 0.55, 0.35, 0x4a4656, -1.35, G, -0.75, { delay: 0.4 });
  box(0.42, 0.06, 0.42, 0x3a3646, -1.35, G + 0.55, -0.75, { delay: 0.42 });
  box(0.025, 0.9, 0.025, IRON, -1.35, G + 0.61, -0.75, { delay: 0.45, noInk: true });
  [0.35, 0.6, 0.82].forEach((y, i) => box(0.5 - i * 0.12, 0.02, 0.02, IRON, -1.35, G + 0.61 + y, -0.75, { delay: 0.47, noInk: true }));

  // Larceny, stopped for a second.
  const D = 0.7;
  const u = 2.35 / 2.4;
  const thief = figure(kit, {
    x: -0.3,
    z: 0.35,
    y: G,
    facing: 0.45,
    height: 2.35,
    build: "slim",
    skin: 0xe8b8a0,
    hair: { style: "ponytail", color: HAIR },
    face: { mouth: "smirk", brows: "raised", eyes: 0x1a2a3a },
    top: { kind: "jacket", color: 0x1f3f4a, accent: 0x3f7a86 },
    bottom: { kind: "trousers", color: 0x1a2630 },
    shoes: 0x2a2a34,
    gloves: 0x16161e,
    arms: ["hip", [0.3, 2.02, 0.32]],
    legs: "stride",
    delay: D,
  });
  hairCap(kit, thief, HAIR, 0.45, D + 0.38);
  // Her ponytail streaming out behind her.
  const RH = 0.22 * u;
  const crown = 2.14 * u;
  const strands = [
    limb(kit, thief.at(0, crown + RH * 0.4, -RH * 0.8), thief.at(-0.85, crown - 0.15, -0.65), 0.1, 0.03, HAIR, { delay: D + 0.5 }),
    limb(kit, thief.at(0.04, crown + RH * 0.1, -RH * 0.9), thief.at(-0.7, crown - 0.45, -0.6), 0.07, 0.025, HAIR, { delay: D + 0.52 }),
  ];
  const strandRest = strands.map((strand) => strand.rotation.x);
  // Plasters: the price of a body that breaks.
  decorate(thief.headPart, new BoxGeometry(0.09, 0.03, 0.02), 0xe8d4b0, [[0.11 * u, RH * 1.06 - 0.05 * u, RH * 0.72, 0.5], [0.11 * u, RH * 1.06 - 0.05 * u, RH * 0.72, -0.5]]);
  const [hipHand, watchHand] = thief.hands;
  box(0.1, 0.035, 0.03, 0xe8d4b0, hipHand[0], hipHand[1] + 0.02, hipHand[2] + 0.06, { delay: D + 0.6, rotation: [0, 0.45, 0.4] });

  // The forearm stacked with stolen watches.
  const elbow = thief.at(-(0.34 + 0.32) * u, 1.34 * u, -0.04);
  const { rotation } = aim(elbow, hipHand);
  [0.25, 0.42, 0.58, 0.74].forEach((k, i) => {
    const at: Point = [MathUtils.lerp(elbow[0], hipHand[0], k), MathUtils.lerp(elbow[1], hipHand[1], k), MathUtils.lerp(elbow[2], hipHand[2], k)];
    add(new TorusGeometry(0.095, 0.024, 6, 16).rotateX(Math.PI / 2), i % 2 ? SILVER : YELLOW, ...at, { delay: D + 0.6 + i * 0.03, rotation });
  });

  // The watch dangling from her fingers, swinging; it catches the light.
  const pivot: Point = [watchHand[0], watchHand[1] - 0.06, watchHand[2] + 0.04];
  const strap = box(0.035, 0.2, 0.012, SILVER, 0, 0, 0, { delay: D + 0.65, noInk: true });
  const face = add(new CylinderGeometry(0.09, 0.09, 0.03, 20).rotateX(Math.PI / 2), SILVER, 0, 0, 0, { delay: D + 0.68 });
  decorate(face, new CylinderGeometry(0.072, 0.072, 0.01, 20).rotateX(Math.PI / 2), 0x16203a, [[0, 0.09, 0.012]]);
  decorate(face, new BoxGeometry(0.01, 0.06, 0.004), 0xf4f0e6, [[0, 0.115, 0.02, 0], [0.016, 0.085, 0.02, -2]]);
  const hanging: [Group, number][] = [
    [strap, 0.2],
    [face, 0.38],
  ];
  const glint = box(0.012, 0.16, 0.012, YELLOW, 0, 0, 0, { delay: D + 0.75, flat: true, noInk: true });
  decorate(glint, new BoxGeometry(0.12, 0.012, 0.012), YELLOW, [[0, 0.08, 0]]);

  // Streaks where she was a moment ago.
  const streaks = [
    [0.7, 1.9, 0.15, 1.1],
    [0.9, 1.5, 0.3, 0.8],
    [0.55, 1.1, 0.1, 1.2],
    [0.75, 0.7, 0.35, 0.7],
    [0.6, 2.25, 0.0, 0.6],
  ].map(([dx, y, dz, length], i) =>
    box(length, 0.035, 0.03, i % 2 ? CYAN : MAGENTA, -0.3 - dx - length / 2, G + y, 0.35 - dz, { delay: D + 0.8 + i * 0.04, flat: true, noInk: true, rotation: [0, 0.45, 0] }),
  );
  const streakRest = streaks.map((streak) => streak.position.x);

  tick((t) => {
    const swing = Math.sin(t * 2.6) * 0.35;
    hanging.forEach(([part, d]) => {
      part.position.set(pivot[0] + Math.sin(swing) * d, pivot[1] - Math.cos(swing) * d, pivot[2]);
      part.rotation.z = swing;
    });
    glint.position.set(pivot[0] + Math.sin(swing) * 0.29 + 0.08, pivot[1] - Math.cos(swing) * 0.27 - 0.02, pivot[2] + 0.04);
    glint.visible = Math.sin(t * 2.6) > -0.2;
    streaks.forEach((streak, i) => (streak.position.x = streakRest[i] - ((t * 0.6 + i * 0.3) % 0.4)));
    strands.forEach((strand, i) => (strand.rotation.x = strandRest[i] + Math.sin(t * 5 + i) * 0.06));
  });

  return { width: 4.9, height: 4.4, lookY: 1.45 };
}
