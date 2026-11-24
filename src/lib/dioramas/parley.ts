import { BoxGeometry, ConeGeometry, Group, SphereGeometry, TorusGeometry } from "three";
import { CYAN, MAGENTA, octagonBase, type Framing, type Kit } from "@/lib/diorama-kit";
import { figure, type Figure } from "@/lib/diorama-figure";
import { floor, puddle, skyline } from "@/lib/diorama-props";

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
 * Parley (P050): the telepathic negotiator of the Custodi on a wet street at night, in front of a
 * police barricade with its lights flashing, rings of magenta round her head. She holds out an
 * open hand and a cup of tea, and the thug who was holding the street hostage kneels beside his
 * dropped crowbar, hands clasped, thanking her. Her megaphone lies at her feet, unused: she never
 * raises her voice, and she would not know what to do with a weapon either.
 */
export function parley(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick, motes } = kit;
  const WHITE = 0xe8e4da;
  const F = octagonBase(kit, 0x181a26);
  const G = floor(kit, F, 0.06, 0x23252f, 0x1a1c24, 0);

  // The street: the city behind, lane marks, puddles catching the police lights.
  skyline(kit, -1.9, G, 0.1, [0x2a2f4a, 0x3a2a4a, 0x22344a], -1.25, 0.55);
  [-1.1, -0.2, 0.7].forEach((x, i) => box(0.5, 0.008, 0.08, 0x8a8a90, x, G, 1.05, { delay: 0.2 + i * 0.02, flat: true, noInk: true }));
  puddle(kit, -1.25, 0.95, G, 0.25, 0.42, CYAN);
  puddle(kit, 1.15, -0.45, G, 0.28, 0.36, MAGENTA);
  puddle(kit, 0.1, -0.75, G, 0.3, 0.3, CYAN);

  // The barricade: two striped planks on trestles, the flashing lights on top.
  const BZ = -1.2;
  [0, 1].forEach((k) => {
    const plank = box(2.1, 0.2, 0.05, WHITE, 0.3, G + 0.45 + k * 0.42, BZ, { delay: 0.3 + k * 0.04 });
    decorate(plank, new BoxGeometry(0.1, 0.26, 0.01), 0x1a1c24, Array.from({ length: 8 }, (_, i) => [-0.9 + i * 0.26, 0.1, 0.03, 0.7] as [number, number, number, number]));
  });
  [-0.65, 1.25].forEach((x) =>
    [-1, 1].forEach((s) => box(0.06, 1.12, 0.06, 0x3a3c48, x, G, BZ + s * 0.05, { delay: 0.28, rotation: [s * 0.3, 0, 0] })),
  );
  box(0.3, 0.08, 0.14, 0x2a2a34, 1.05, G + 1.07, BZ, { delay: 0.4 });
  const blue = box(0.12, 0.1, 0.12, CYAN, 0.97, G + 1.15, BZ, { delay: 0.42, flat: true });
  const red = box(0.12, 0.1, 0.12, MAGENTA, 1.13, G + 1.15, BZ, { delay: 0.44, flat: true });

  // Parley: silver hair up, long dark coat, one hand open, the other offering tea.
  const D = 0.7;
  const HAIR = 0xc0c4d0;
  const parley = figure(kit, {
    x: -0.5,
    z: 0.1,
    y: G,
    facing: 0.55,
    height: 2.35,
    skin: 0xe2bca4,
    hair: { style: "bun", color: HAIR },
    face: { mouth: "smile", brows: "calm" },
    top: { kind: "coat", color: 0x22304a, accent: 0x1a1c2a },
    bottom: { kind: "trousers", color: 0x1a1c2a },
    shoes: 0x2a2a34,
    arms: [[-0.62, 1.25, 0.42], [0.36, 1.3, 0.52]],
    delay: D,
  });
  hairCap(kit, parley, HAIR, 0.55, D + 0.38);
  const [, teaHand] = parley.hands;
  const cup = cylinder(0.065, 0.05, 0.14, WHITE, teaHand[0], teaHand[1] - 0.02, teaHand[2] + 0.02, { delay: D + 0.5 }, 12);
  decorate(cup, new BoxGeometry(0.13, 0.05, 0.13), MAGENTA, [[0, 0.06, 0]]);
  motes(5, 0xd8e4ec, 0.025, [teaHand[0] - 0.04, teaHand[1] + 0.14, teaHand[2]], [teaHand[0] + 0.04, teaHand[1] + 0.5, teaHand[2] + 0.04], 1.4);

  // Rings of calm round her head, turned to us.
  const [hx, hy, hz] = parley.head;
  const halos = [0.42, 0.56].map((r, k) =>
    add(new TorusGeometry(r, 0.018, 6, 40), MAGENTA, hx - 0.08, hy - r - 0.018, hz - 0.12, { delay: D + 0.6 + k * 0.05, flat: true, noInk: true, rotation: [0, 0.35, 0] }),
  );

  // The megaphone she never uses, on the wet tarmac.
  add(new ConeGeometry(0.13, 0.34, 14).rotateZ(Math.PI / 2), 0xd8d4c8, -1.2, G, 0.55, { delay: 0.6, rotation: [0, 0.7, 0] });
  box(0.05, 0.12, 0.05, 0x2a2a34, -1.1, G, 0.48, { delay: 0.62 });

  // The thug, on his knees beside his crowbar, hands clasped: thank you.
  const thug = figure(kit, {
    x: 1.05,
    z: 0.72,
    y: G,
    facing: -0.25,
    height: 2.15,
    build: "broad",
    skin: 0xc89a7a,
    hair: { style: "bald", color: 0x2a2020 },
    face: { mouth: "open", brows: "worried" },
    top: { kind: "hoodie", color: 0x5a1e3a, accent: 0x6a2a4a },
    bottom: { kind: "trousers", color: 0x22262e },
    shoes: 0x1a1a22,
    arms: [[-0.05, 1.34, 0.36], [0.05, 1.36, 0.36]],
    legs: "kneel",
    delay: 1.0,
  });
  // His beanie, pulled down to the brows (the figure's own beanie would cover his eyes).
  hairCap(kit, thug, 0x3a2a4a, -0.25, 1.38, 0.65);
  const bar = box(0.05, 0.85, 0.05, 0x8a93a3, 1.5, G + 0.025, 1.3, { delay: 1.4, rotation: [0, 0.3, Math.PI / 2] });
  decorate(bar, new BoxGeometry(0.05, 0.16, 0.05), 0x8a93a3, [[0.06, 0.84, 0, -1.1]]);

  const thugRest = thug.parts.map((part) => part.position.y);
  const haloMeshes = halos.map((halo) => halo.children[0]);
  const radii = [0.438, 0.578];
  tick((t) => {
    // The lights take turns; both lit at rest.
    const phase = Math.floor(t * 3) % 2;
    blue.visible = t === 0 || phase === 0;
    red.visible = t === 0 || phase === 1;
    // Her rings breathe, growing from their centres.
    haloMeshes.forEach((mesh, k) => {
      const s = 1 + Math.sin(t * 1.5 + k) * 0.06;
      mesh.scale.set(s, s, 1);
      mesh.position.y = radii[k] - s * radii[k];
    });
    // He bows his thanks, again and again.
    const bow = Math.max(0, Math.sin(t * 2.2)) * 0.04;
    thug.parts.forEach((part, i) => (part.position.y = thugRest[i] - bow));
  });

  return { width: 4.9, height: 4.4, lookY: 1.45 };
}
