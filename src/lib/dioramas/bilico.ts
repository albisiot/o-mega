import { BoxGeometry, ConeGeometry, Group, TorusGeometry, Vector3 } from "three";
import { CYAN, INK, MAGENTA, ORANGE, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { bollard } from "@/lib/diorama-props";

/**
 * Bilico (P321): the Figli's tightrope walker at sunset in the port, standing on one foot on the
 * curve of a crane hook that swings over the water, one hand lightly on the cable, the other arm
 * out, perfectly at ease. Technology is not her thing: her phone lies on the quay below with a
 * cracked screen, blinking.
 */
export function bilico(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick } = kit;
  const STEEL = 0x3a4050;
  const F = octagonBase(kit, 0x0e2a3e);

  // The sun going down behind distant cranes, its light on the water.
  cylinder(0.48, 0.48, 0.03, ORANGE, 0.35, F + 0.08, -1.95, { delay: 0.1, flat: true, noInk: true, rotation: [Math.PI / 2, 0, 0] }, 28);
  [
    [0.35, -1.55, 0.6],
    [0.3, -1.15, 0.45],
    [0.4, -0.8, 0.3],
  ].forEach(([x, z, w], i) => box(w, 0.004, 0.05, ORANGE, x, F, z, { delay: 0.14 + i * 0.03, flat: true, noInk: true }));
  [-0.75, 1.15].forEach((x, i) => {
    box(0.05, 1.3 - i * 0.3, 0.03, 0x241a34, x, F, -1.9, { delay: 0.12, noInk: true });
    box(0.8, 0.05, 0.03, 0x241a34, x + (i ? -0.3 : 0.2), F + 1.25 - i * 0.3, -1.9, { delay: 0.14, noInk: true });
  });

  // A pontoon with two stacked containers.
  box(1.0, 0.25, 0.8, 0x3a4050, -1.35, F, -0.85, { delay: 0.2 });
  [
    [0, MAGENTA],
    [0.4, 0x23707e],
  ].forEach(([y, color], i) => {
    const c = box(0.9, 0.4, 0.42, color, -1.35, F + 0.25 + y, -0.85, { delay: 0.25 + i * 0.05, rotation: [0, 0.1 * i, 0] });
    decorate(c, new BoxGeometry(0.012, 0.34, 0.01), 0x1a1a24, Array.from({ length: 6 }, (_, k) => [-0.35 + k * 0.14, 0.2, 0.215] as Point));
  });

  // The quay with the crane, bollards and her phone.
  const Q = F + 0.35;
  box(1.25, 0.35, 2.2, 0x4a5060, 1.375, F, -0.15, { delay: 0.2, ink: 1.02 });
  box(0.06, 0.02, 2.2, CYAN, 0.78, Q, -0.15, { delay: 0.25, flat: true, noInk: true });
  bollard(kit, 0.95, 0.55, Q, 0.3);
  bollard(kit, 0.95, -0.9, Q, 0.32);
  const phone = box(0.18, 0.03, 0.3, 0x1e1c24, 1.25, Q, 0.7, { delay: 0.5, rotation: [0, 0.5, 0] });
  const screen = decorate(phone, new BoxGeometry(0.14, 0.01, 0.25), CYAN, [[0, 0.031, 0]]);
  decorate(phone, new BoxGeometry(0.15, 0.012, 0.012), INK, [
    [0, 0.038, 0.02, 0],
    [0.02, 0.038, -0.05, 0],
  ]);
  decorate(phone, new BoxGeometry(0.012, 0.012, 0.16), INK, [[0.03, 0.038, 0]]);

  // Where she stands: the bottom of the hook. The cable rises at the hook's shank.
  const facing = 0.35;
  const [c, s] = [Math.cos(facing), Math.sin(facing)];
  const plane = (x: number, y: number, origin: Point): Point => [origin[0] + x * c, origin[1] + y, origin[2] - x * s];
  const foot: Point = [-0.15, F + 0.75, 0.05];
  const J: Point = [foot[0], foot[1] + 0.22, foot[2]];
  const shank = plane(-0.3, 0, J);
  const P = new Vector3(shank[0], F + 3.55, shank[2]);

  // The crane on the quay: mast, cab, jib out over the water, counterweight, trolley.
  const CZ = P.z;
  const mast = box(0.24, P.y - Q + 0.05, 0.24, STEEL, 1.5, Q, CZ, { delay: 0.3 });
  decorate(mast, new BoxGeometry(0.012, 0.3, 0.012), MAGENTA, Array.from({ length: 10 }, (_, k) => [0, 0.2 + k * 0.3, 0.125, k % 2 ? 0.7 : -0.7] as [number, number, number, number]));
  const cab = box(0.42, 0.34, 0.36, STEEL, 1.5, P.y - 0.4, CZ + 0.15, { delay: 0.4 });
  decorate(cab, new BoxGeometry(0.3, 0.14, 0.01), CYAN, [[0, 0.2, 0.181]]);
  box(2.65, 0.14, 0.14, STEEL, P.x + 0.93, P.y, CZ, { delay: 0.45 });
  box(0.3, 0.3, 0.26, 0x2a2e3a, 2.0, P.y - 0.16, CZ, { delay: 0.5 });
  box(0.26, 0.12, 0.22, 0x2a2e3a, P.x, P.y - 0.12, CZ, { delay: 0.52 });
  const warn = box(0.08, 0.08, 0.08, MAGENTA, 1.5, P.y + 0.14, CZ, { delay: 0.55, flat: true, noInk: true });

  // The hook block, the cables and the hook, all swinging together from the trolley.
  const swinging: Group[] = [];
  const blockTop = J[1] + 1.05;
  swinging.push(
    ...[-0.06, 0.06].map((dx) => box(0.018, P.y - 0.12 - blockTop, 0.018, INK, ...plane(dx, 0, [shank[0], blockTop, shank[2]]), { delay: 0.6, noInk: true })),
  );
  const block = box(0.34, 0.55, 0.22, ORANGE, shank[0], J[1] + 0.5, shank[2], { delay: 0.65, rotation: [0, facing, 0] });
  decorate(block, new BoxGeometry(0.06, 0.32, 0.01), INK, [-0.07, 0.07].map((x) => [x, 0.27, 0.111, 0.5] as [number, number, number, number]));
  swinging.push(block, cylinder(0.05, 0.05, 0.5, STEEL, shank[0], J[1], shank[2], { delay: 0.68 }, 10));
  swinging.push(add(new TorusGeometry(0.3, 0.075, 8, 22, Math.PI + 0.75).rotateZ(Math.PI), STEEL, ...plane(0, -0.3 - 0.075, J), { delay: 0.7, rotation: [0, facing, 0] }));
  const tip = plane(0.3 * Math.cos(0.75), 0.3 * Math.sin(0.75), J);
  swinging.push(add(new ConeGeometry(0.075, 0.14, 8), STEEL, ...tip, { delay: 0.72, rotation: [0, facing, 0.2] }));

  // Bilico on the hook: right foot on the curve, left leg lifted, hand on the cable, arm out.
  const B = figure(kit, {
    x: foot[0] + 0.035,
    z: foot[2] - 0.38,
    y: foot[1],
    facing,
    height: 2.3,
    build: "slim",
    skin: 0xe8c0a8,
    hair: { style: "bun", color: 0x1a1820 },
    face: { mouth: "smirk", brows: "calm" },
    top: { kind: "shirt", color: 0x1e3a48 },
    bottom: { kind: "trousers", color: 0x1e3a48 },
    shoes: 0x1a1a22,
    arms: [[-0.46, 2.25, 0.34], "out"],
    legs: "stride",
    delay: 0.9,
  });
  [
    [0.0, 1.45, 0.6],
    [0.05, 1.2, -0.6],
  ].forEach(([dx, y, lean]) => B.parts.push(box(0.07, 0.5, 0.02, 0xe8e4dc, ...B.at(dx, y, 0.22), { delay: 1.4, noInk: true, rotation: [0, facing, lean] })));
  swinging.push(...B.parts);

  const pendulum = new Group();
  mast.parent?.add(pendulum);
  pendulum.position.copy(P);
  swinging.forEach((part) => {
    part.position.sub(P);
    pendulum.add(part);
  });
  const axis = new Vector3(s, 0, c);

  // Rings spreading on the water under her.
  const ripples = [0, 1].map((k) => add(new TorusGeometry(0.35, 0.015, 6, 30).rotateX(Math.PI / 2), 0x9fe8ff, J[0], F + 0.002, J[2], { delay: 1.0 + k * 0.1, flat: true, noInk: true }));

  tick((t) => {
    pendulum.quaternion.setFromAxisAngle(axis, 0.07 * Math.sin(t * 1.3));
    ripples.forEach((r, k) => {
      const u = (t * 0.35 + k * 0.5) % 1;
      r.children.forEach((mesh) => mesh.scale.set(0.5 + u * 1.6, 1, 0.5 + u * 1.6));
      r.visible = u < 0.85;
    });
    screen.color.set(Math.floor(t * 3) % 4 === 3 ? 0x0b3d50 : CYAN);
    warn.visible = Math.floor(t * 1.5) % 2 === 0;
  });

  return { width: 4.9, height: 4.5, lookY: 1.75 };
}
