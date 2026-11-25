import { BackSide, BoxGeometry, type Group, type Material, type Mesh, SphereGeometry, TorusGeometry } from "three";
import { ORANGE, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure, type FigureSpec } from "@/lib/diorama-figure";

/**
 * Caligine (P260): the last great master of the Silent Blade on an old wooden pier at night,
 * blindfolded, white hair loose, leaning on her staff and holding out a palm where an orange mist
 * turns. Fog rolls over the black water and in it stand the see-through shapes of the people she
 * hides; her aura breathes round her. On the pier a night watchman with a lantern stares the wrong
 * way, scratching his head, his memory turning in a loop over it: he saw no one.
 */
export function caligine(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const WOOD = 0x4a3c34;
  const F = octagonBase(kit, 0x0e2a3e);
  /** See-through: a part's colour fades, its ink goes. */
  const ghostly = (part: Group, opacity: number) => {
    const material = (part.children[0] as Mesh).material as Material;
    material.transparent = true;
    material.opacity = opacity;
    material.depthWrite = false;
    part.children.slice(1).forEach((child) => (child.visible = false));
  };

  // The pier: planks over the water, posts along it, rotten pilings beyond.
  const deck = box(1.5, 0.15, 3.8, WOOD, 0, F + 0.1, 0, { delay: 0.06, ink: 1.02 });
  decorate(deck, new BoxGeometry(1.5, 0.006, 0.014), 0x2e241e, Array.from({ length: 18 }, (_, k) => [0, 0.151, -1.8 + k * 0.21] as Point));
  const P = F + 0.25;
  [-1.6, -0.5, 0.6, 1.6].forEach((z, k) => [-0.8, 0.8].forEach((x, i) => cylinder(0.07, 0.08, 0.6, 0x3e3028, x, F, z, { delay: 0.1 + k * 0.03 + i * 0.01 }, 8)));
  [
    [-1.5, -1.2, 0.8, 0.15],
    [-1.85, -0.35, 0.55, -0.2],
    [1.55, -1.05, 0.9, 0.1],
    [1.25, -1.65, 0.6, -0.15],
    [1.9, 0.35, 0.5, 0.25],
  ].forEach(([x, z, h, lean], k) => cylinder(0.07, 0.09, h, 0x3a2e28, x, F - 0.05, z, { delay: 0.2 + k * 0.03, rotation: [lean, 0, lean * 0.5] }, 8));

  // The people she hides: shapes in the fog, standing on the water.
  const ghosts = (
    [
      [-1.35, -1.0, 0.6, 2.2, "normal", 0x6ad8ff],
      [1.3, -0.95, -0.5, 2.1, "slim", 0xff7ad0],
      [-1.55, 0.6, 0.9, 1.5, "child", 0x6ad8ff],
    ] as [number, number, number, number, FigureSpec["build"], number][]
  ).map(([x, z, facing, height, build, color], k) =>
    figure(kit, { x, z, y: F, facing, height, build, skin: color, face: { blank: true }, headwear: { kind: "hood", color }, top: { kind: "robe", color }, shoes: color, delay: 1.6 + k * 0.1 }),
  );
  ghosts.forEach((ghost) => ghost.parts.forEach((part) => ghostly(part, 0.35)));

  // Caligine: blindfold, long white hair, a rust robe with a pale shawl, her staff.
  const f = 0.3;
  const master = figure(kit, {
    x: 0.05,
    z: -0.45,
    y: P,
    facing: f,
    height: 2.35,
    build: "slim",
    skin: 0xd8b098,
    hair: { style: "long", color: 0xe8e8ec },
    face: { mouth: "neutral", brows: "none", eyes: 0xe8dcc8, mask: "eyes", maskColor: 0xe8dcc8, marks: 0xb08070 },
    top: { kind: "robe", color: 0x7a2a34 },
    shoes: 0x2a2228,
    scarf: 0xd8ccb4,
    arms: [
      [-0.42, 1.2, 0.2],
      [0.36, 1.25, 0.52],
    ],
    delay: 0.8,
  });
  const at = master.at;
  const shawl = add(new BoxGeometry(0.001, 0.001, 0.001), 0xd8ccb4, ...at(0, 0, 0), { delay: 1.1, noInk: true, rotation: [0, f, 0] });
  decorate(shawl, new BoxGeometry(0.12, 0.9, 0.02), 0xd8ccb4, [
    [-0.11, 1.35, 0.2, -0.12],
    [0.11, 1.35, 0.2, 0.12],
  ]);
  const [staffHand, palm] = master.hands;
  cylinder(0.03, 0.03, staffHand[1] - P + 0.3, 0x5e4a3a, staffHand[0], P, staffHand[2], { delay: 1.2 }, 8);

  // The orange mist turning in her palm.
  const wisps = [0, 1, 2].map((k) => ball(0.05 - k * 0.01, ORANGE, palm[0], palm[1] + 0.1, palm[2], { delay: 1.4 + k * 0.04, flat: true, noInk: true }));
  const swirl = add(new TorusGeometry(0.14, 0.012, 6, 24, Math.PI * 1.4).rotateX(Math.PI / 2), 0xffb060, palm[0], palm[1] + 0.12, palm[2], { delay: 1.45, flat: true, noInk: true });

  // Her aura, breathing; specks of it rising.
  const aura = add(new SphereGeometry(1, 20, 14).scale(0.95, 1.5, 0.8), 0xd0a0ff, master.head[0], P + 0.15, master.head[2] - 0.1, { delay: 0.5, flat: true, noInk: true });
  ghostly(aura, 0.24);
  ((aura.children[0] as Mesh).material as Material).side = BackSide;
  motes(16, 0xe8d0ff, 0.025, [-0.9, P + 0.2, -1.1], [1.0, P + 3.2, 0.3], 1.0);

  // Banks of fog rolling over the water.
  const fog = [
    [-1.4, 0.15, -0.7, 0.5, 0xb0c8e0],
    [1.3, 0.2, -0.4, 0.55, 0xd0a8d8],
    [-1.0, 0.1, 1.25, 0.45, 0xa0d8e8],
    [1.25, 0.1, 1.05, 0.5, 0xd0a8d8],
    [0.1, 0.2, -1.65, 0.5, 0xb0c8e0],
    [-1.75, 0.15, 0.45, 0.4, 0xa0d8e8],
  ].map(([x, y, z, r, color], k) => {
    const bank = add(new SphereGeometry(r, 14, 10).scale(1.5, 0.45, 1), color, x, F + y - r * 0.45, z, { delay: 1.2 + k * 0.05, flat: true, noInk: true });
    ghostly(bank, 0.4);
    return bank;
  });

  // The night watchman, staring the wrong way, his memory going round in a loop.
  const watchman = figure(kit, {
    x: -0.4,
    z: 1.15,
    y: P,
    facing: -0.35,
    height: 2.2,
    skin: 0xd8a888,
    hair: { style: "short", color: 0x3a2a20 },
    face: { mouth: "open", brows: "raised", beard: "moustache" },
    headwear: { kind: "cap", color: 0x23304a },
    top: { kind: "uniform", color: 0x2a3a5a, accent: 0x16c8ff },
    bottom: { kind: "trousers", color: 0x1e2636 },
    arms: [
      [-0.18, 2.12, -0.17],
      [0.55, 1.25, 0.25],
    ],
    delay: 1.0,
  });
  const [, lanternHand] = watchman.hands;
  box(0.02, 0.08, 0.02, 0x23222b, lanternHand[0], lanternHand[1] - 0.12, lanternHand[2], { delay: 1.4, noInk: true });
  const lantern = box(0.14, 0.2, 0.14, 0x23222b, lanternHand[0], lanternHand[1] - 0.32, lanternHand[2], { delay: 1.42 });
  decorate(lantern, new BoxGeometry(0.15, 0.13, 0.11), 0xffb060, [[0, 0.1, 0]]);
  const loops = [0, 1].map((k) => add(new TorusGeometry(0.16 + k * 0.07, 0.016, 6, 24, Math.PI * 1.3).rotateX(Math.PI / 2), k ? 0x6ad8ff : 0xd0a0ff, watchman.head[0], watchman.top + 0.25 + k * 0.08, watchman.head[2], { delay: 1.8 + k * 0.05, flat: true, noInk: true }));

  const ghostRest = ghosts.map((ghost) => ghost.parts.map((part) => part.position.y));
  const fogRest = fog.map((bank) => bank.position.x);
  tick((t) => {
    (aura.children[0] as Mesh).scale.setScalar(1 + Math.sin(t * 1.4) * 0.04);
    ghosts.forEach((ghost, g) => ghost.parts.forEach((part, k) => (part.position.y = ghostRest[g][k] + Math.sin(t * 1.1 + g * 2) * 0.05)));
    fog.forEach((bank, k) => (bank.position.x = fogRest[k] + Math.sin(t * 0.35 + k) * 0.18));
    swirl.rotation.y = t * 2.5;
    wisps.forEach((wisp, k) => {
      const a = t * 2.5 + (k * Math.PI * 2) / 3;
      wisp.position.set(palm[0] + Math.cos(a) * 0.12, palm[1] + 0.06 + Math.sin(t * 3 + k) * 0.04, palm[2] + Math.sin(a) * 0.12);
    });
    loops.forEach((loop, k) => (loop.rotation.y = (k ? -1.8 : 2.4) * t));
  });

  return { width: 4.9, height: 4.6, lookY: 1.75 };
}
