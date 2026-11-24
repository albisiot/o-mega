import { BoxGeometry, CylinderGeometry, LatheGeometry, TorusGeometry, Vector2, Vector3 } from "three";
import { CYAN, INK, MAGENTA, cable, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Glip (P093): the little alien tourist who got the wrong planet waits at the end of the queue
 * in the post office hall, in a flowered shirt with a camera round his neck, holding up his
 * ticket with three worried eyes while the number board blinks over the counter. The price of no
 * strength at all: his suitcase is bigger than he is and will not budge when he tugs it.
 */
export function glip(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const TEAL = 0x3fb0a8;
  const SHIRT = 0xe0502a;
  const CHROME = 0x8a93a3;
  const F = octagonBase(kit, 0x1f1d28);
  const G = floor(kit, F, 0.06, 0x3a3848, 0x2a2836, 0.45);

  // The hall: a back wall with tall arched windows, the counter with its glass and the number board.
  const wall = box(3.3, 2.9, 0.16, 0x2c3550, 0, G, -1.55, { delay: 0.1, ink: 1.02 });
  decorate(wall, new BoxGeometry(0.5, 0.9, 0.01), 0x1d4a5e, [
    [-1.0, 1.95, 0.085],
    [1.0, 1.95, 0.085],
  ]);
  decorate(wall, new CylinderGeometry(0.25, 0.25, 0.01, 16, 1, false, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2), 0x1d4a5e, [
    [-1.0, 2.4, 0.085],
    [1.0, 2.4, 0.085],
  ]);
  decorate(wall, new BoxGeometry(0.03, 1.15, 0.012), 0x2c3550, [
    [-1.0, 2.05, 0.09],
    [1.0, 2.05, 0.09],
  ]);
  const counter = box(2.9, 0.95, 0.5, 0x23404b, 0, G, -1.1, { delay: 0.2 });
  decorate(counter, new BoxGeometry(2.9, 0.06, 0.01), CYAN, [[0, 0.75, 0.255]]);
  const glass = box(2.9, 0.75, 0.04, 0x1a4a5a, 0, G + 0.95, -1.2, { delay: 0.25, ink: 1.02 });
  decorate(glass, new BoxGeometry(0.04, 0.75, 0.05), 0x23222b, [-1.45, -0.5, 0.5, 1.45].map((x) => [x, 0.375, 0] as Point));
  decorate(glass, new TorusGeometry(0.08, 0.012, 6, 16), 0x9fe8ff, [
    [-1.0, 0.4, 0.025],
    [0, 0.4, 0.025],
    [1.0, 0.4, 0.025],
  ]);
  // The board that calls the numbers: a lit panel, no figures.
  cylinder(0.012, 0.012, 0.3, INK, 0.45, G + 2.5, -1.3, { delay: 0.3, noInk: true }, 6);
  const board = box(0.62, 0.3, 0.1, 0x23222b, 0.45, G + 2.2, -1.3, { delay: 0.32 });
  const panel = decorate(board, new BoxGeometry(0.5, 0.18, 0.01), MAGENTA, [[0, 0.15, 0.055]]);
  // A strip light hanging from the ceiling.
  [-0.7, 0.1].forEach((x) => cylinder(0.008, 0.008, 0.25, INK, x, G + 2.65, -0.7, { delay: 0.34, noInk: true }, 6));
  box(1.0, 0.05, 0.1, 0xbff4ff, -0.3, G + 2.6, -0.7, { delay: 0.36, flat: true });

  // The queue lane: chrome posts with velvet ropes.
  const posts: Point[] = [
    [-1.45, G, -0.55],
    [-0.85, G, 0.05],
    [-0.25, G, 0.65],
    [-0.55, G, -0.75],
    [0.05, G, -0.15],
    [0.65, G, 0.45],
  ];
  posts.forEach(([x, y, z], i) => {
    cylinder(0.12, 0.12, 0.03, CHROME, x, y, z, { delay: 0.4 + i * 0.03 }, 14);
    cylinder(0.025, 0.025, 0.9, CHROME, x, y, z, { delay: 0.42 + i * 0.03 }, 8);
    ball(0.04, CHROME, x, y + 0.88, z, { delay: 0.44 + i * 0.03 });
  });
  [
    [0, 1],
    [1, 2],
    [3, 4],
    [4, 5],
  ].forEach(([a, b], i) => {
    const [ax, , az] = posts[a];
    const [bx, , bz] = posts[b];
    cable(kit, [[ax, G + 0.88, az], [(ax + bx) / 2, G + 0.7, (az + bz) / 2], [bx, G + 0.88, bz]], 0.022, 0x8a1e52, 0.6 + i * 0.04);
  });

  // The people ahead of him, facing the counter.
  const toCounter = Math.PI + 0.6;
  figure(kit, {
    x: -0.95,
    z: -0.55,
    y: G,
    facing: toCounter,
    height: 2.15,
    build: "heavy",
    skin: 0xd8a888,
    hair: { style: "bob", color: 0xc8ccd4 },
    top: { kind: "coat", color: 0x5a2a4a },
    bottom: { kind: "trousers", color: 0x2a2838 },
    arms: ["down", "forward"],
    delay: 0.6,
  });
  figure(kit, {
    x: -0.35,
    z: 0.05,
    y: G,
    facing: toCounter,
    height: 2.4,
    build: "normal",
    skin: 0xc48c68,
    hair: { style: "short", color: 0x2a1e1c },
    headwear: { kind: "hood", color: 0x23404b },
    top: { kind: "hoodie", color: 0x23404b },
    bottom: { kind: "trousers", color: 0x1f2a3a },
    arms: ["down", "down"],
    delay: 0.7,
  });

  // Glip: a small body in a flowered shirt, a long thin neck and a huge head.
  const FACE = 0.3;
  const glip = figure(kit, {
    x: 0.35,
    z: 0.85,
    y: G,
    facing: FACE,
    height: 1.4,
    build: "child",
    skin: TEAL,
    hair: { style: "bald", color: TEAL },
    face: { blank: true },
    top: { kind: "shirt", color: SHIRT, accent: 0xf08a50, sleeves: "short" },
    bottom: { kind: "shorts", color: 0xc8b890 },
    shoes: 0x5e4a3a,
    arms: [[-0.4, 1.3, 0.3], [0.62, 1.02, 0.12]],
    delay: 0.9,
  });
  const shirt = glip.parts[7];
  decorate(shirt, new BoxGeometry(0.06, 0.06, 0.01), 0xffc0a0, [
    [-0.1, 0.1, 0.115, 0.7],
    [0.08, 0.25, 0.12, 0.3],
    [0.11, 0.06, 0.11, 1.1],
  ]);
  // His own head is a bigger one, on a long thin neck: the figure's small head is hidden.
  glip.headPart.visible = false;
  const neckY = glip.head[1] - G - 0.12;
  const chinY = neckY + 0.2;
  const neck = glip.at(0, neckY - 0.05, 0);
  cylinder(0.035, 0.045, 0.3, TEAL, neck[0], neck[1], neck[2], { delay: 1.25 }, 10);
  const turn = [0, FACE, 0] as [number, number, number];
  const head = add(
    new LatheGeometry(
      [
        [0.001, -0.005],
        [0.08, 0],
        [0.22, 0.12],
        [0.34, 0.3],
        [0.4, 0.46],
        [0.38, 0.6],
        [0.27, 0.72],
        [0, 0.78],
      ].map(([r, h]) => new Vector2(r * 0.9, h * 0.9)),
      24,
    ),
    TEAL,
    ...glip.at(0, chinY, 0),
    { delay: 1.3, rotation: turn },
  );
  decorate(head, new BoxGeometry(0.1, 0.02, 0.02), 0x1f6a64, [
    [-0.14, 0.4, 0.31, -0.45],
    [0.14, 0.4, 0.31, 0.45],
  ]);
  decorate(head, new CylinderGeometry(0.03, 0.03, 0.02, 10).rotateX(Math.PI / 2).scale(1, 1.3, 1), 0x2a1018, [[0, 0.11, 0.2]]);
  // Three eyes, looking about.
  const eyes = [
    [0, 0.45, 0.29, 0.11],
    [-0.135, 0.27, 0.24, 0.095],
    [0.135, 0.27, 0.24, 0.095],
  ].map(([x, h, z, r], i) => {
    const at = glip.at(x, chinY + h, z);
    const eye = ball(r, 0xf4f0e6, at[0], at[1] - r, at[2], { delay: 1.4 + i * 0.04, rotation: turn });
    decorate(eye, new CylinderGeometry(r * 0.5, r * 0.5, 0.02, 14).rotateX(Math.PI / 2), INK, [[0, r, r * 0.92]]);
    decorate(eye, new BoxGeometry(r * 0.22, r * 0.22, 0.01), 0xffffff, [[r * 0.18, r * 1.2, r * 0.98]]);
    return eye;
  });
  // Antennae with little balls, wobbling.
  const stalks = [-1, 1].map((side, i) => {
    const from = glip.at(side * 0.11, chinY + 0.63, -0.02);
    const to = glip.at(side * 0.28, chinY + 0.98, -0.06);
    const stalk = limb(kit, from, to, 0.02, 0.014, TEAL, { delay: 1.5 + i * 0.03 });
    const length = new Vector3(...to).sub(new Vector3(...from)).length();
    const tip = ball(0.05, TEAL, to[0], to[1] - 0.05, to[2], { delay: 1.55 + i * 0.03 });
    return { stalk, tip, from, length, rest: stalk.rotation.clone() };
  });

  // The camera round his neck, and the ticket held up.
  const chest = glip.at(0, 0.74, 0.16);
  const camera = box(0.2, 0.13, 0.08, 0x2a2a30, chest[0], chest[1], chest[2], { delay: 1.6, rotation: turn });
  decorate(camera, new CylinderGeometry(0.045, 0.045, 0.06, 14).rotateX(Math.PI / 2), 0x16303e, [[0.02, 0.065, 0.05]]);
  decorate(camera, new BoxGeometry(0.05, 0.03, 0.01), 0xc8ccd4, [[-0.06, 0.11, 0.041]]);
  [-1, 1].forEach((side) => limb(kit, glip.at(side * 0.09, 0.86, 0.17), glip.at(side * 0.06, 1.02, 0.04), 0.008, 0.008, INK, { delay: 1.62, noInk: true }));
  const [ticketHand, tugHand] = glip.hands;
  box(0.1, 0.16, 0.012, 0xf0e6c8, ticketHand[0], ticketHand[1] + 0.02, ticketHand[2] + 0.04, { delay: 1.7, rotation: [0, FACE, 0.15] });

  // His suitcase, taller than his body, pulled by its handle and going nowhere.
  const [SX, , SZ] = glip.at(0.62, 0, 0.0);
  const SH = 0.85;
  const suitcase = box(0.6, SH, 0.3, 0x1f7f9c, SX, G + 0.05, SZ, { delay: 0.8, rotation: turn });
  decorate(suitcase, new BoxGeometry(0.16, 0.12, 0.01), MAGENTA, [[-0.12, SH * 0.7, 0.151, 0.2]]);
  decorate(suitcase, new BoxGeometry(0.12, 0.12, 0.01), 0xf0e6c8, [[0.14, SH * 0.55, 0.151, -0.3]]);
  decorate(suitcase, new BoxGeometry(0.1, 0.16, 0.01), SHIRT, [[-0.05, SH * 0.3, 0.151, 0.1]]);
  decorate(suitcase, new BoxGeometry(0.61, 0.03, 0.31), 0x165a70, [[0, SH * 0.5, 0]]);
  decorate(suitcase, new CylinderGeometry(0.05, 0.05, 0.04, 12).rotateZ(Math.PI / 2), INK, [
    [-0.22, -0.01, 0],
    [0.22, -0.01, 0],
  ]);
  const grip = box(0.2, 0.04, 0.04, INK, tugHand[0], tugHand[1] - 0.02, tugHand[2], { delay: 0.86, rotation: turn });
  decorate(grip, new BoxGeometry(0.02, tugHand[1] - G - SH - 0.05, 0.02), CHROME, [
    [-0.07, -(tugHand[1] - G - SH - 0.05) / 2, 0],
    [0.07, -(tugHand[1] - G - SH - 0.05) / 2, 0],
  ]);

  const eyeRest = eyes.map((eye) => eye.rotation.y);
  const tipAt = new Vector3();
  tick((t) => {
    // The board calls a number that is never his.
    panel.color.set(Math.floor(t / 1.6) % 4 === 3 ? 0x5a1030 : MAGENTA);
    const glance = Math.sin(t * 0.9) > 0.5 ? 0.35 : Math.sin(t * 0.9) < -0.6 ? -0.3 : 0;
    eyes.forEach((eye, i) => (eye.rotation.y = eyeRest[i] + glance));
    stalks.forEach(({ stalk, tip, from, length, rest }, i) => {
      stalk.rotation.set(rest.x + Math.sin(t * 2.3 + i) * 0.12, rest.y, rest.z + Math.sin(t * 1.7 + i * 2) * 0.12);
      tipAt.set(0, length, 0).applyEuler(stalk.rotation);
      tip.position.set(from[0] + tipAt.x, from[1] + tipAt.y - 0.05, from[2] + tipAt.z);
    });
    // Now and then he tugs: the case lifts a hair and drops back.
    const tug = Math.max(0, Math.sin(t * 1.3)) ** 6;
    suitcase.rotation.z = tug * 0.05;
    grip.rotation.z = tug * 0.05;
  });

  return { width: 4.9, height: 4.3, lookY: 1.45 };
}
