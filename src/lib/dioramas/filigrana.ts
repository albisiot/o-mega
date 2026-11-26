import { BackSide, BoxGeometry, CatmullRomCurve3, ConeGeometry, CylinderGeometry, Group, SphereGeometry, TorusGeometry, TubeGeometry, Vector3, type Material, type Mesh } from "three";
import { CYAN, INK, MAGENTA, YELLOW, aim, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, table } from "@/lib/diorama-props";

/** Makes a part see-through in a pale cyan, its ink hidden: the watermark. */
function watermark(part: Group, opacity: number): Material {
  const [mesh, ...rest] = part.children as Mesh[];
  const material = mesh.material as Material & { color: { setHex: (hex: number) => void } };
  material.color.setHex(0xbfe8ff);
  material.transparent = true;
  material.opacity = opacity;
  material.depthWrite = false;
  rest.forEach((child) => (child.visible = (child.material as Material).side !== BackSide));
  return material;
}

/**
 * Filigrana (P311): in the print hall of the Banco's mint, between the press rolling out sheets
 * of banknotes and the round vault door, a robber with a sack sneaks along and never sees her
 * coming: the mint worker in her silver suit is already in a high kick, her legs gone clear as a
 * watermark, magenta and cyan threads winding round her. The price of no tech and no magic: the
 * note-counter on the bench, which she jammed solid, is still smoking.
 */
export function filigrana(kit: Kit): Framing {
  const { add, box, ball, decorate, tick } = kit;
  const STEEL = 0x3a4252;
  const GOLD = 0xd8b040;
  const SILVER = 0xc8ccd8;
  const F = octagonBase(kit, 0x1c1b24);
  const G = floor(kit, F, 0.06, 0x2a2a32, 0x1e1e26, 0.5);

  // The back wall and the round vault door, its wheel turning slowly.
  box(2.9, 3.0, 0.2, 0x26283a, 0, G, -1.75, { delay: 0.1, ink: 1.02 });
  const VX = 0.85;
  const vault = add(new CylinderGeometry(0.8, 0.8, 0.22, 28).rotateX(Math.PI / 2), 0x5a6478, VX, G + 0.15, -1.52, { delay: 0.2 });
  decorate(
    vault,
    new SphereGeometry(0.035, 8, 6),
    0x8a93a3,
    Array.from({ length: 12 }, (_, k) => [Math.cos((k / 12) * Math.PI * 2) * 0.68, 0.8 + Math.sin((k / 12) * Math.PI * 2) * 0.68, 0.11] as Point),
  );
  decorate(vault, new TorusGeometry(0.6, 0.02, 4, 32), 0x46506a, [[0, 0.8, 0.112]]);
  const wheel = new Group();
  wheel.position.set(VX, G + 0.95, -1.36);
  const hub = add(new TorusGeometry(0.26, 0.035, 6, 20), 0x8a93a3, 0, 0, 0, { delay: 0.3 });
  hub.parent?.add(wheel);
  wheel.add(hub);
  hub.position.set(0, -0.295, 0);
  decorate(hub, new BoxGeometry(0.52, 0.035, 0.035), 0x8a93a3, [
    [0, 0.295, 0, 0],
    [0, 0.295, 0, Math.PI / 3],
    [0, 0.295, 0, -Math.PI / 3],
  ]);

  // The press: two side frames, three rollers turning, the sheet of notes running out to the front.
  const PX = -0.65;
  [-0.6, 0.6].forEach((dx) => box(0.12, 1.5, 0.9, STEEL, PX + dx, G, -1.1, { delay: 0.2 }));
  const rollers = (
    [
      [0.75, -1.25, 0.2],
      [1.15, -1.0, 0.17],
      [0.75, -0.85, 0.15],
    ] as [number, number, number][]
  ).map(([y, z, r], i) => {
    const holder = new Group();
    holder.position.set(PX, G + y + r, z);
    const roll = add(new CylinderGeometry(r, r, 1.1, 18).rotateZ(Math.PI / 2), i === 1 ? GOLD : 0x6a7282, 0, 0, 0, { delay: 0.3 + i * 0.04 });
    roll.parent?.add(holder);
    holder.add(roll);
    roll.position.set(0, -r, 0);
    decorate(roll, new BoxGeometry(1.08, 0.02, 0.02), INK, [
      [0, r, r],
      [0, r, -r],
    ]);
    return holder;
  });
  // The delivery table and the sheet on it, printed notes sliding out along it.
  [-0.42, 0.42].forEach((dx) => [-0.55, 0.15].forEach((z) => box(0.05, 0.7, 0.05, STEEL, PX + dx, G, z, { delay: 0.35, noInk: true })));
  box(0.96, 0.05, 0.95, STEEL, PX, G + 0.7, -0.2, { delay: 0.38 });
  box(0.84, 0.012, 1.0, GOLD, PX, G + 0.75, -0.25, { delay: 0.42, noInk: true });
  const notes = Array.from({ length: 6 }, (_, k) => {
    const note = box(0.34, 0.006, 0.18, 0xa88420, PX + (k % 2 ? 0.2 : -0.2), G + 0.763, 0, { delay: 0.46, flat: true, noInk: true });
    decorate(note, new CylinderGeometry(0.05, 0.05, 0.004, 12), 0x7a5a10, [[0, 0.006, 0]]);
    return note;
  });
  // The hanging lamp.
  box(0.012, 0.6, 0.012, INK, -0.7, G + 3.0, -0.6, { delay: 0.4, noInk: true });
  add(new ConeGeometry(0.26, 0.2, 14), 0x2a2a34, -0.7, G + 2.82, -0.6, { delay: 0.44 });
  ball(0.08, YELLOW, -0.7, G + 2.66, -0.6, { delay: 0.48, flat: true });

  // The bench of note bricks, and the jammed note-counter smoking on it.
  const bench = table(kit, 1.4, 0.55, G, 0.4, false, 0x3a3040);
  [0, 1, 2].forEach((k) =>
    [0, 1].forEach((j) => {
      const brick = box(0.3, 0.08, 0.16, GOLD, 1.15 + j * 0.05, G + 0.8 + k * 0.08, 0.35 + j * 0.2, { delay: 0.5 + k * 0.02 });
      decorate(brick, new BoxGeometry(0.04, 0.081, 0.161), MAGENTA, [[0, 0.04, 0]]);
    }),
  );
  const counter = box(0.32, 0.22, 0.26, 0x4a5262, 1.62, G + 0.8, 0.6, { delay: 0.55, rotation: [0, -0.3, 0] });
  decorate(counter, new BoxGeometry(0.12, 0.05, 0.01), 0x14121c, [[0, 0.15, 0.131]]);
  [0.3, -0.5, 0.9].forEach((turn, k) => box(0.16, 0.012, 0.1, 0xb8902a, 1.6 + k * 0.04, G + 1.02 + k * 0.015, 0.75 + k * 0.03, { delay: 0.6, rotation: [0.6 + k * 0.3, turn, 0.4] }));
  const smoke = [0, 1, 2].map((k) => ball(0.07 + k * 0.03, 0x4a4650, 1.6, G + 1.1 + k * 0.15, 0.6, { delay: 0.7 + k * 0.05, noInk: true }));
  void bench;

  // The robber sneaking off with his sack, looking the other way.
  const robber = figure(kit, {
    x: -0.85,
    z: 0.85,
    y: G,
    facing: -0.7,
    height: 2.3,
    skin: 0xd8b098,
    face: { mouth: "neutral", brows: "angry", mask: "full", maskColor: 0x22202a, eyes: 0xf4f0e6 },
    top: { kind: "shirt", color: 0x2a2a34 },
    bottom: { kind: "trousers", color: 0x22242e },
    arms: [[-0.25, 1.25, -0.25], "down"],
    legs: "stride",
    delay: 0.8,
  });
  const sack = robber.hands[0];
  add(new SphereGeometry(0.3, 14, 10).scale(1, 1.1, 0.9), 0xb8a888, sack[0], sack[1] - 0.6, sack[2], { delay: 1.4 });

  // Filigrana in her high kick: silver suit, black bob, legs clear as a watermark.
  const facing = 0.35;
  const u = 2.35 / 2.4;
  const mint = figure(kit, {
    x: 0.45,
    z: 0.25,
    y: G,
    facing,
    height: 2.35,
    build: "slim",
    skin: 0xead0c0,
    hair: { style: "bob", color: 0x16141c },
    face: { mouth: "neutral", brows: "angry", eyes: 0x2a3a4a },
    top: { kind: "jacket", color: SILVER, accent: 0xe8ecf4 },
    bottom: { kind: "trousers", color: SILVER },
    shoes: 0x8a8e98,
    gloves: SILVER,
    arms: [
      [-0.2, 1.62, 0.42],
      [0.62, 1.35, -0.28],
    ],
    delay: 0.9,
  });
  // Her fringe; a pattern like a banknote's on her suit.
  decorate(mint.headPart, new BoxGeometry(0.3 * u, 0.07 * u, 0.06), 0x16141c, [[0, 0.33 * u, 0.15]]);
  decorate(mint.parts[7], new TorusGeometry(0.05, 0.008, 4, 12), 0x9aa0b4, [
    [-0.12, 0.2, 0.24],
    [0.1, 0.35, 0.25],
    [-0.08, 0.5, 0.24],
    [0.14, 0.12, 0.23],
  ]);
  // The right leg she stands on is swapped for the kicking one.
  [0, 1, 2].forEach((i) => (mint.parts[i].visible = false));
  const hip = mint.at(-0.17 * u, 1.08 * u, 0);
  const knee = mint.at(-0.62, 1.5, 0.22);
  const ankle = mint.at(-1.05, 1.82, 0.36);
  const kick = [limb(kit, hip, knee, 0.125, 0.11, SILVER, { delay: 1.2, noInk: true }), limb(kit, knee, ankle, 0.105, 0.09, SILVER, { delay: 1.24, noInk: true })];
  kick.push(ball(0.11, SILVER, knee[0], knee[1] - 0.11, knee[2], { delay: 1.22, noInk: true }));
  const toe: Point = [ankle[0] + (ankle[0] - knee[0]) * 0.6, ankle[1] + 0.2, ankle[2] + (ankle[2] - knee[2]) * 0.6];
  const boot = aim(ankle, toe);
  const sole = box(0.17, boot.length, 0.24, 0x8a8e98, ...ankle, { delay: 1.3, rotation: boot.rotation });
  decorate(sole, new BoxGeometry(0.03, boot.length, 0.25), 0x2a2a34, [[-0.09, boot.length / 2, 0]]);
  // Clear from the waist down, the kicking leg less so.
  const clear = [3, 4, 5, 6].map((i) => watermark(mint.parts[i], 0.28));
  kick.forEach((part) => clear.push(watermark(part, 0.7)));
  // The threads round her.
  const threads = [MAGENTA, CYAN].map((color, k) => {
    const points = Array.from({ length: 24 }, (_, i) => {
      const a = (i / 23) * Math.PI * 3.2 + k * Math.PI;
      const r = 0.55 + 0.15 * Math.sin(i * 0.7 + k);
      return new Vector3(Math.cos(a) * r, 0.15 + (i / 23) * 2.2, Math.sin(a) * r);
    });
    return add(new TubeGeometry(new CatmullRomCurve3(points), 80, 0.012, 4), color, mint.at(0, 0, 0)[0], G + 0.14, mint.at(0, 0, 0)[2], { delay: 1.6 + k * 0.1, flat: true, noInk: true });
  });

  tick((t) => {
    rollers.forEach((holder, i) => (holder.rotation.x = (i === 1 ? -1 : 1) * t * 2.2));
    notes.forEach((note, k) => (note.position.z = -0.7 + ((t * 0.25 + Math.floor(k / 2) / 3) % 1) * 0.9));
    wheel.rotation.z = Math.sin(t * 0.4) * 0.6;
    threads.forEach((thread, k) => (thread.rotation.y = (k ? -1 : 1) * t * 0.7));
    // She fades a little and comes back, like a watermark held to the light.
    const fade = 0.5 + 0.5 * Math.sin(t * 1.3);
    clear.forEach((material, i) => (material.opacity = (i < 4 ? 0.28 : 0.7) - fade * 0.12));
    smoke.forEach((puff, k) => {
      const p = (t * 0.4 + k / 3) % 1;
      puff.position.y = G + 1.1 + p * 0.5;
      puff.children[0].scale.setScalar(0.6 + p * 0.8);
    });
  });

  return { width: 4.9, height: 4.6, lookY: 1.7 };
}
