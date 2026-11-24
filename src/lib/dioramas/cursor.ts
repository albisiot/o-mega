import { BoxGeometry, ConeGeometry, CylinderGeometry, TorusGeometry } from "three";
import { CYAN, MAGENTA, YELLOW, aim, archedWall, cable, colorOf, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, rubble } from "@/lib/diorama-props";

/**
 * Cursor (P110): the courier sprints down the old Roman road along a glowing ancient line, braid
 * flying, already ahead of the tram rattling behind her on its rails, an arch of the old
 * stadium at her back. In her bag the delivery phone buzzes and buzzes: she doesn't know how to
 * answer it, and she never knows when she'll get there, only how fast.
 */
export function cursor(kit: Kit): Framing {
  const { add, box, decorate, tick } = kit;
  const RUST = 0xc0502a;
  const ROPE = 0xd8683a;
  const LEATHER = 0x5a3a24;
  const F = octagonBase(kit, 0x1a1d22);
  const G = floor(kit, F, 0.06, 0x2e3138, 0x1e2026, 0.4);

  const facing = -0.25;
  const fwd: [number, number] = [Math.sin(facing), Math.cos(facing)];
  const side: [number, number] = [Math.cos(facing), -Math.sin(facing)];
  const X0 = -0.2;
  const Z0 = 0.45;
  const on = (s: number, f: number): [number, number] => [X0 + side[0] * s + fwd[0] * f, Z0 + side[1] * s + fwd[1] * f];

  // An arch of the old stadium behind her.
  const arch = add(archedWall(1.5, 1.9, 0.32, { x: 0, half: 0.36, spring: 0.85 }), 0x5d6680, -1.1, G, -1.2, { delay: 0.1, rotation: [0, 0.45, 0] });
  decorate(arch, new BoxGeometry(1.5, 0.02, 0.01), 0x46506a, [[0, 1.45, 0.161]]);
  decorate(arch, new BoxGeometry(0.37, 0.02, 0.01), 0x46506a, [-0.565, 0.565].flatMap((x) => [0.4, 0.8].map((y) => [x, y, 0.161] as Point)));
  decorate(arch, new BoxGeometry(0.02, 0.38, 0.01), 0x46506a, [
    [-0.55, 0.2, 0.161],
    [0.6, 0.6, 0.161],
    [-0.62, 1.05, 0.161],
    [0.5, 1.65, 0.161],
  ]);
  add(new ConeGeometry(0.25, 0.3, 5), 0x5d6680, -1.55, G + 1.9, -1.0, { delay: 0.16, rotation: [0.2, 0, 0.4] });
  add(new ConeGeometry(0.2, 0.22, 5), 0x5d6680, -0.75, G + 1.9, -1.45, { delay: 0.17, rotation: [-0.1, 0, -0.3] });
  rubble(kit, -0.7, -0.45, G, 0.2, 4, 0.35);

  // The ancient line in the paving, glowing, running under her feet.
  const line = Array.from({ length: 11 }, (_, k) => {
    const [x, z] = on(0, -2.0 + k * 0.36);
    return box(0.1, 0.006, 0.26, CYAN, x, G, z, { delay: 0.2 + k * 0.02, flat: true, noInk: true, rotation: [0, facing, 0] });
  });

  // The tram, a length behind her, on its rails, under its wire.
  const TS = 1.15;
  const TF = -1.35;
  [-0.22, 0.22].forEach((s, i) => {
    const [x, z] = on(TS + s, TF + 0.35);
    box(0.05, 0.03, 2.4, 0x8a90a0, x, G, z, { delay: 0.25 + i * 0.02, noInk: true, rotation: [0, facing, 0] });
  });
  const [tx, tz] = on(TS, TF);
  const tram = [box(0.72, 0.82, 1.7, 0x7a2f55, tx, G + 0.12, tz, { delay: 0.3, rotation: [0, facing, 0] })];
  decorate(tram[0], new BoxGeometry(0.73, 0.06, 1.71), 0xe8e2d0, [[0, 0.3, 0]]);
  decorate(tram[0], new BoxGeometry(0.01, 0.2, 0.26), 0x16303e, [-0.55, -0.22, 0.11, 0.44].map((z) => [0.365, 0.54, z] as Point));
  decorate(tram[0], new BoxGeometry(0.01, 0.12, 0.2), YELLOW, [-0.38, 0.27].map((z) => [0.366, 0.56, z] as Point));
  decorate(tram[0], new BoxGeometry(0.56, 0.3, 0.01), 0x16303e, [[0, 0.56, 0.851]]);
  decorate(tram[0], new BoxGeometry(0.09, 0.07, 0.01), YELLOW, [
    [-0.24, 0.16, 0.852],
    [0.24, 0.16, 0.852],
  ]);
  tram.push(box(0.56, 0.06, 1.4, 0x5a2240, tx, G + 0.94, tz, { delay: 0.34, rotation: [0, facing, 0] }));
  const [px, pz] = on(TS, TF - 0.1);
  const mast: Point = [px, G + 1.0, pz];
  const shoe: Point = [px + fwd[0] * 0.3, G + 1.5, pz + fwd[1] * 0.3];
  tram.push(box(0.03, aim(mast, shoe).length, 0.03, 0x23222b, ...mast, { delay: 0.38, noInk: true, rotation: aim(mast, shoe).rotation }));
  [-0.36, 0.36].forEach((s) =>
    [-0.55, 0.55].forEach((f) => {
      const [x, z] = on(TS + s, TF + f);
      tram.push(add(new CylinderGeometry(0.12, 0.12, 0.08, 12).rotateZ(Math.PI / 2), 0x23222b, x, G, z, { delay: 0.4, rotation: [0, facing, 0] }));
    }),
  );
  const [wa, wb] = [on(TS, TF - 1.0), on(TS, TF + 1.9)];
  const wireFrom: Point = [wa[0], G + 1.52, wa[1]];
  const wireTo: Point = [wb[0], G + 1.52, wb[1]];
  box(0.012, aim(wireFrom, wireTo).length, 0.012, 0x23222b, ...wireFrom, { delay: 0.42, noInk: true, rotation: aim(wireFrom, wireTo).rotation });
  const tramY = tram.map((part) => part.position.y);

  // Cursor: rust-red from neck to ankles, braids, a rope sash, the courier's bag.
  const runner = figure(kit, {
    x: X0,
    z: Z0,
    y: G,
    facing,
    height: 2.35,
    build: "slim",
    skin: 0xd8a07a,
    hair: { style: "braids", color: 0x2a1a14 },
    face: { mouth: "neutral", brows: "angry", marks: 0xb07050 },
    top: { kind: "shirt", color: RUST },
    bottom: { kind: "trousers", color: 0xa8442a },
    shoes: 0x4a3428,
    belt: 0x4a3020,
    arms: [[-0.4, 1.15, -0.38], [0.34, 1.5, 0.44]],
    legs: "stride",
    delay: 0.7,
  });
  const u = 2.35 / 2.4;
  const extra = [
    cable(kit, [runner.at(0, 2.2 * u, -0.2), runner.at(0.05, 1.95 * u, -0.5), runner.at(-0.05, 1.8 * u, -0.8)], 0.045, 0x2a1a14, 1.3),
    add(new TorusGeometry(0.29 * u, 0.04, 6, 18).rotateX(Math.PI / 2).scale(1, 1, 0.78), ROPE, ...runner.at(0, 1.0 * u, 0), { delay: 1.3, rotation: [0, facing, 0] }),
    cable(kit, [runner.at(-0.26 * u, 1.0 * u, 0.05), runner.at(-0.34, 0.8, -0.2), runner.at(-0.3, 0.62, -0.5)], 0.03, ROPE, 1.35),
    cable(kit, [runner.at(-0.2 * u, 1.0 * u, -0.1), runner.at(-0.22, 0.72, -0.35), runner.at(-0.12, 0.6, -0.62)], 0.03, ROPE, 1.36),
  ];
  // The bag strap from her right shoulder to her left hip, the bag behind; the phone buzzing in it.
  const strapFrom = runner.at(-0.25 * u, 1.68 * u, 0.2);
  const strapTo = runner.at(0.24 * u, 1.08 * u, 0.2);
  extra.push(box(0.045, aim(strapFrom, strapTo).length, 0.03, 0x3a2418, ...strapFrom, { delay: 1.4, rotation: aim(strapFrom, strapTo).rotation }));
  const bag = box(0.34, 0.26, 0.12, LEATHER, ...runner.at(0.34 * u, 0.9 * u, -0.12), { delay: 1.42, rotation: [0, facing + 1.2, 0] });
  extra.push(bag);
  const phoneAt = runner.at(0.38 * u, 1.15 * u, -0.05);
  const phone = box(0.08, 0.14, 0.03, CYAN, ...phoneAt, { delay: 1.5, flat: true, rotation: [0, facing + 0.4, 0.15] });
  const buzz = [-1, 1].map((s) => box(0.012, 0.1, 0.012, YELLOW, phoneAt[0] + s * 0.09, phoneAt[1] + 0.06, phoneAt[2], { delay: 1.52, flat: true, noInk: true, rotation: [0, 0, s * 0.3] }));
  // Cyan bands round her boots.
  const plans: [Point, Point][] = [
    [[-0.17 * u, 0.62 * u, 0.22 * u], [-0.17 * u, 0.12 * u, 0.3 * u]],
    [[0.17 * u, 0.59 * u, -0.12 * u], [0.17 * u, 0.22 * u, -0.42 * u]],
  ];
  plans.forEach(([knee, ankle]) => {
    const at = runner.at(...knee.map((v, n) => v + (ankle[n] - v) * 0.68) as Point);
    extra.push(add(new TorusGeometry(0.1, 0.03, 6, 16).rotateX(Math.PI / 2), 0x5a9aa8, at[0], at[1] - 0.03, at[2], { delay: 1.45, rotation: aim(runner.at(...knee), runner.at(...ankle)).rotation }));
  });
  // Speed lines behind her.
  [0.9, 1.35, 1.8].forEach((h, k) => {
    const [x, z] = on(-0.25 + k * 0.25, -0.75 - k * 0.15);
    extra.push(box(0.025, 0.025, 0.5 + k * 0.1, k === 1 ? CYAN : MAGENTA, x, G + h, z, { delay: 1.6 + k * 0.04, flat: true, noInk: true, rotation: [0, facing, 0] }));
  });

  const body = [...runner.parts, ...extra];
  const rest = body.map((part) => part.position.y);
  const phoneRest = phone.position.clone();
  tick((t) => {
    const bounce = Math.abs(Math.sin(t * 6)) * 0.035;
    body.forEach((part, i) => (part.position.y = rest[i] + bounce));
    const ringing = Math.floor(t * 1.5) % 2 === 0;
    phone.position.set(phoneRest.x + (ringing ? Math.sin(t * 60) * 0.012 : 0), phoneRest.y + bounce, phoneRest.z);
    buzz.forEach((mark) => (mark.visible = ringing));
    const lit = Math.floor(t * 8) % line.length;
    line.forEach((piece, k) => colorOf(piece).set(k === lit || k === (lit + 10) % 11 ? 0xe8fbff : CYAN));
    tram.forEach((part, i) => (part.position.y = tramY[i] + Math.abs(Math.sin(t * 9)) * 0.012));
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}
