import { BoxGeometry, ConeGeometry, CylinderGeometry, SphereGeometry, TorusGeometry, Vector3, type Group } from "three";
import { INK, MAGENTA, cable, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure, shade } from "@/lib/diorama-figure";
import { floor, rubble } from "@/lib/diorama-props";

/**
 * Concordato (P282): the granite-skinned chief of the Ferrigni in a quarry above the city, a
 * crane swinging a cut block behind him. He holds out an open stone hand, calm as a mountain,
 * bronze weights hanging from the chain on his coat and a pigeon at ease on his shoulder. On a
 * block lies the contract with its red seal; the man who signed it without reading tiptoes off
 * and cannot get far: the promise has become a bronze weight chained to his ankle.
 */
export function concordato(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const GRANITE = 0x9a9ca6;
  const STONE = 0x5d6680;
  const STONE_LIGHT = 0x7a8298;
  const BRONZE = 0xb0763a;
  const IRON = 0x3a3f4e;
  const CRANE = 0x8a2850;
  const PARCHMENT = 0xe8dcc0;
  const WAX = 0xc81e3a;
  /** Tilts a part in its own frame, then turns it about the vertical. */
  const yxz = (part: Group, tilt: number, turn: number) => {
    part.rotation.order = "YXZ";
    part.rotation.set(tilt, turn, 0);
    return part;
  };
  const F = octagonBase(kit, 0x1c1a24);
  const G = floor(kit, F, 0.06, 0x3a3a4a, 0x2a2a36, 0.55);

  // The quarry: a stepped face of cut stone, a crane lifting a block.
  [
    [-1.05, -1.4, 0.8, 0.55, 0.5],
    [0.2, -1.55, 1.1, 1.3, 0.5],
    [1.0, -1.45, 1.0, 1.7, 0.6],
    [1.65, -0.95, 0.7, 1.0, 0.6],
    [0.6, -1.05, 0.55, 0.45, 0.45],
  ].forEach(([x, z, w, h, d], i) => {
    const block = box(w, h, d, i % 2 ? STONE_LIGHT : STONE, x, G, z, { delay: 0.14 + i * 0.04 });
    decorate(block, new BoxGeometry(w * 0.96, 0.015, 0.01), shade(STONE, 0.6), [[0, h * 0.55, d / 2 + 0.003]]);
  });
  const mast = box(0.14, 3.3, 0.14, CRANE, 1.6, G, -1.6, { delay: 0.3 });
  decorate(
    mast,
    new BoxGeometry(0.012, 0.2, 0.012),
    INK,
    Array.from({ length: 10 }, (_, k) => [0, 0.3 + k * 0.3, 0.075, k % 2 ? 0.7 : -0.7] as [number, number, number, number]),
  );
  box(1.85, 0.1, 0.12, CRANE, 0.85, G + 3.3, -1.6, { delay: 0.36 });
  box(0.3, 0.24, 0.2, IRON, 1.6, G + 3.1, -1.6, { delay: 0.4 });
  box(0.012, 0.8, 0.012, INK, 0.25, G + 2.5, -1.6, { delay: 0.44, noInk: true });
  const hung = box(0.5, 0.32, 0.36, STONE_LIGHT, 0.25, G + 2.18, -1.6, { delay: 0.48 });
  decorate(hung, new BoxGeometry(0.52, 0.03, 0.03), 0xc9a46a, [[0, 0.16, 0.18]]);
  rubble(kit, -1.2, 1.3, G, 0.5, 5, 0.35);

  // The contract on a block, sealed in red, tied to the weight by a glowing thread.
  const desk = box(0.75, 0.6, 0.55, STONE_LIGHT, 0.4, G, -0.4, { delay: 0.5, rotation: [0, 0.2, 0] });
  decorate(desk, new BoxGeometry(0.72, 0.015, 0.01), shade(STONE, 0.6), [[0, 0.3, 0.278]]);
  const sheet = box(0.5, 0.01, 0.36, PARCHMENT, 0.4, G + 0.6, -0.36, { delay: 0.6, rotation: [0, 0.45, 0] });
  decorate(sheet, new BoxGeometry(0.34, 0.004, 0.012), shade(PARCHMENT, 0.6), [-0.12, -0.07, -0.02, 0.03].map((z) => [-0.04, 0.011, z] as Point));
  decorate(sheet, new BoxGeometry(0.1, 0.004, 0.01).rotateY(0.6), INK, [
    [-0.12, 0.012, 0.11],
    [0.02, 0.012, 0.12],
  ]);
  decorate(sheet, new CylinderGeometry(0.045, 0.045, 0.012, 14), WAX, [[0.16, 0.01, 0.1]]);
  cylinder(0.05, 0.06, 0.08, INK, 0.7, G + 0.6, -0.55, { delay: 0.64 }, 10);
  add(new ConeGeometry(0.03, 0.3, 6), 0xf2efe6, 0.7, G + 0.65, -0.55, { delay: 0.68, rotation: [0.3, 0, -0.35] });

  // Concordato: granite skin, black beard, the long quilted coat with bronze toggles.
  const facing = 0.7;
  const u = 2.65 / 2.4;
  const chief = figure(kit, {
    x: -0.7,
    z: 0.3,
    y: G,
    facing,
    height: 2.65,
    build: "broad",
    skin: GRANITE,
    hair: { style: "bald", color: 0x34343c },
    face: { mouth: "smirk", brows: "calm", beard: "stubble", beardColor: 0x1c1c22, marks: 0x6a6c78 },
    top: { kind: "coat", color: 0x262a3a, accent: 0x353c56 },
    bottom: { kind: "trousers", color: 0x20232c },
    shoes: 0x18181e,
    arms: [[-0.3 * 1.104, 1.48 * 1.104, 0.78 * 1.104], "down"],
    delay: 0.8,
  });
  [
    [1.27, 0.29],
    [1.46, 0.31],
    [1.65, 0.33],
  ].forEach(([y, z], i) => box(0.17, 0.05, 0.04, BRONZE, ...chief.at(0, y * u, z * u), { delay: 1.3 + i * 0.03, rotation: [0, facing, 0] }));
  // His open hand, palm up: the pact on offer.
  const [palm] = chief.hands;
  const reach = new Vector3(...palm).sub(new Vector3(...chief.elbows[0])).setY(0).normalize();
  const side = new Vector3(-reach.z, 0, reach.x);
  [-0.06, -0.02, 0.02, 0.06].forEach((dx, i) => {
    const from = new Vector3(...palm).addScaledVector(reach, 0.07).addScaledVector(side, dx);
    const to = from.clone().addScaledVector(reach, 0.12 - Math.abs(dx) * 0.4).setY(from.y + 0.03);
    limb(kit, [from.x, from.y - 0.02, from.z], [to.x, to.y, to.z], 0.032, 0.027, GRANITE, { delay: 1.38 + i * 0.01 });
  });
  const thumb = new Vector3(...palm).addScaledVector(side, -0.09);
  limb(kit, [thumb.x, thumb.y, thumb.z], [thumb.x + reach.x * 0.06, thumb.y + 0.08, thumb.z + reach.z * 0.06], 0.028, 0.022, GRANITE, { delay: 1.42 });
  // The chain down his coat, bronze weights hanging from it.
  const weights: Group[] = [];
  for (let k = 0; k < 10; k++) {
    const at = chief.at(0.3 * u, 1.66 * u - k * 0.07 * u, 0.3 * u);
    add(new TorusGeometry(0.032, 0.011, 5, 10), shade(BRONZE, 0.8), ...at, { delay: 1.4 + k * 0.01, rotation: [0, facing + (k % 2 ? Math.PI / 2 : 0), 0] });
    if (k % 3 === 2) {
      const bell = cylinder(0.05, 0.08, 0.13, BRONZE, at[0], at[1] - 0.15, at[2] + 0.02, { delay: 1.5 + k * 0.02 }, 10);
      decorate(bell, new TorusGeometry(0.075, 0.01, 5, 14).rotateX(Math.PI / 2), shade(BRONZE, 0.6), [[0, 0.02, 0]]);
      weights.push(bell);
    }
  }
  // The pigeon at ease on his shoulder.
  const perch = chief.at(-0.5 * u, 1.92 * u, -0.02);
  add(new SphereGeometry(0.08, 12, 10).scale(0.9, 0.95, 1.5), 0x8a8ea4, ...perch, { delay: 1.9, rotation: [0, facing, 0] });
  yxz(box(0.08, 0.025, 0.14, 0x5e6274, ...chief.at(-0.5 * u, 1.92 * u + 0.08, -0.16), { delay: 1.92 }), -0.3, facing);
  const dove = ball(0.055, 0x6a7088, ...chief.at(-0.5 * u, 1.92 * u + 0.1, 0.1), { delay: 1.95 });
  decorate(dove, new ConeGeometry(0.016, 0.05, 5).rotateX(Math.PI / 2), 0xf2c060, [[0, 0.05, 0.07]]);
  decorate(dove, new BoxGeometry(0.014, 0.014, 0.01), INK, [
    [-0.035, 0.07, 0.04],
    [0.035, 0.07, 0.04],
  ]);
  dove.rotation.y = facing;

  // The signer, tiptoeing off with the promise chained to his ankle.
  const signer = figure(kit, {
    x: 1.35,
    z: 0.95,
    y: G,
    facing: 1.25,
    height: 2.1,
    build: "slim",
    skin: 0xe0b08f,
    hair: { style: "short", color: 0x2a1e1c },
    face: { mouth: "open", brows: "worried", beard: "moustache" },
    headwear: { kind: "hat", color: 0x2a2433, accent: MAGENTA },
    top: { kind: "suit", color: 0x4a3a5a, accent: 0xe8e2d0, tie: MAGENTA },
    bottom: { kind: "trousers", color: 0x3a2e48 },
    shoes: 0x2a1e1a,
    arms: ["back", "forward"],
    legs: "stride",
    delay: 1.2,
  });
  const v = 2.1 / 2.4;
  const ankle = signer.at(0.17 * v, 0.22 * v, -0.42 * v);
  add(new TorusGeometry(0.06, 0.018, 6, 14).rotateX(Math.PI / 2), IRON, ankle[0], ankle[1] - 0.04, ankle[2], { delay: 1.8 });
  const W: Point = [0.62, G, 0.55];
  cylinder(0.12, 0.2, 0.34, BRONZE, ...W, { delay: 1.7 }, 14);
  add(new TorusGeometry(0.06, 0.02, 6, 14), shade(BRONZE, 0.7), W[0], G + 0.33, W[2], { delay: 1.75, rotation: [0, 1.2, 0] });
  cable(kit, [[W[0], G + 0.4, W[2]], [(W[0] + ankle[0]) / 2, G + 0.12, (W[2] + ankle[2]) / 2], ankle], 0.016, IRON, 1.85);
  const thread = cable(kit, [[0.56, G + 0.62, -0.25], [0.7, G + 0.7, 0.15], [W[0], G + 0.42, W[2]]], 0.012, MAGENTA, 1.9);

  const rest = signer.parts.map((part) => part.position.clone());
  tick((t) => {
    // He strains against the weight; the bronze bells sway; the pigeon pecks; the block turns.
    const pull = Math.max(0, Math.sin(t * 2.6)) * 0.05;
    signer.parts.forEach((part, i) => part.position.set(rest[i].x + pull * 0.95, rest[i].y, rest[i].z + pull * 0.32));
    weights.forEach((bell, i) => (bell.rotation.z = Math.sin(t * 1.4 + i) * 0.08));
    dove.position.y = perch[1] + 0.1 + (Math.sin(t * 3.1) > 0.75 ? -0.035 : 0);
    hung.rotation.y = Math.sin(t * 0.5) * 0.3;
    thread.visible = Math.floor(t * 6) % 11 !== 5;
  });

  return { width: 4.9, height: 4.5, lookY: 1.6 };
}
