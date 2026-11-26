import { BoxGeometry, Color, ConeGeometry, CylinderGeometry, DodecahedronGeometry, Group, SphereGeometry, TorusGeometry } from "three";
import { CYAN, MAGENTA, YELLOW, cable, colorOf, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { orb } from "@/lib/diorama-props";

/**
 * Batiscafo (P341): the old harbour diver wading up out of the gulf, his brass helmet under one
 * arm and, held high in the other, the light he brought up from the rift: it pulses cyan and
 * scatters sparks towards the boy waiting on the quay with an empty lantern. Behind him the
 * lighthouse beam turns. His price is on the quay and on him: the hand-cranked air pump he still
 * dives with, and a starfish and barnacles that settled on him on the slow way up.
 */
export function batiscafo(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const WATER = 0x0f4458;
  const FOAM = 0xcfeef7;
  const STONE = 0x5d6680;
  const BRASS = 0xb08d3c;
  const CANVAS = 0x6a5038;
  const WOOD = 0x5e4a3a;
  const F = octagonBase(kit, 0x0e3a4e);
  const W = F + 0.55;
  cylinder(2.4, 2.4, 0.55, WATER, 0, F, 0, { delay: 0.06, ink: 1.01, rotation: [0, Math.PI / 8, 0] }, 8);

  // The quay with its stone blocks, and the lighthouse on its rock.
  const QY = F + 1.2;
  const quay = box(1.4, 1.2, 1.2, STONE, 0.95, F, -1.0, { delay: 0.1 });
  decorate(quay, new BoxGeometry(1.4, 0.02, 0.01), 0x46506a, [0.4, 0.8].map((y) => [0, y, 0.601] as Point));
  decorate(quay, new BoxGeometry(0.02, 0.4, 0.01), 0x46506a, [-0.3, 0.35].map((x) => [x, 1.0, 0.601] as Point));
  add(new DodecahedronGeometry(0.3), 0x3a4458, -1.95, W - 0.2, -0.25, { delay: 0.12, rotation: [0.3, 0.5, 0] });
  const tower = cylinder(0.15, 0.2, 1.5, 0xe8e4d8, -1.95, W + 0.3, -0.25, { delay: 0.18 }, 12);
  decorate(tower, new CylinderGeometry(0.19, 0.19, 0.16, 12), MAGENTA, [
    [0, 0.35, 0],
    [0, 0.9, 0],
  ]);
  box(0.26, 0.2, 0.26, YELLOW, -1.95, W + 1.8, -0.25, { delay: 0.24, flat: true });
  add(new ConeGeometry(0.2, 0.2, 8), 0x2a2a34, -1.95, W + 2.0, -0.25, { delay: 0.26 });
  const beam = add(new BoxGeometry(1.0, 0.04, 0.16).translate(0.55, 0, 0), YELLOW, -1.95, W + 1.88, -0.25, { delay: 0.3, flat: true, noInk: true });

  // The air pump on the quay: a box, two big wheels with cranks, a gauge.
  const pump = box(0.5, 0.42, 0.34, WOOD, 0.85, QY, -1.05, { delay: 0.4, rotation: [0, 0.3, 0] });
  decorate(pump, new CylinderGeometry(0.07, 0.07, 0.02, 14).rotateX(Math.PI / 2), BRASS, [[0, 0.28, 0.171]]);
  const wheels = [-1, 1].map((side) => {
    const [x, z] = [0.85 + side * 0.3 * Math.cos(0.3), -1.05 - side * 0.3 * Math.sin(0.3)];
    const disc = add(new CylinderGeometry(0.24, 0.24, 0.04, 18).rotateZ(Math.PI / 2), 0x3a3f4e, x, QY + 0.08, z, { delay: 0.45 });
    decorate(disc, new BoxGeometry(0.05, 0.44, 0.04), 0x2a2e3a, [[0, 0.24, 0]]);
    decorate(disc, new BoxGeometry(0.05, 0.04, 0.44), 0x2a2e3a, [[0, 0.24, 0]]);
    decorate(disc, new BoxGeometry(0.16, 0.05, 0.05), BRASS, [[side * 0.08, 0.42, 0]]);
    const hub = new Group();
    disc.parent?.add(hub);
    hub.position.set(x, QY + 0.32, z);
    hub.rotation.y = 0.3;
    disc.position.set(0, -0.24, 0);
    const spin = new Group();
    hub.add(spin);
    spin.add(disc);
    return spin;
  });

  // The boy on the quay's edge, holding out an empty lantern.
  const boy = figure(kit, {
    x: 1.0,
    z: -0.5,
    y: QY - 0.36,
    facing: 0.1,
    height: 1.35,
    build: "child",
    skin: 0xc8906a,
    hair: { style: "curly", color: 0x2a1e1c },
    face: { mouth: "open", brows: "raised" },
    top: { kind: "hoodie", color: 0x23707e },
    bottom: { kind: "shorts", color: 0x2a3550 },
    arms: [[-0.2, 0.75, 0.38], "down"],
    legs: "sit",
    delay: 0.6,
  });
  const lantern = boy.hands[0];
  box(0.02, 0.08, 0.02, 0x2a2a34, lantern[0], lantern[1] - 0.06, lantern[2], { delay: 1.0, noInk: true });
  const lamp = box(0.12, 0.15, 0.12, 0x3a4458, lantern[0], lantern[1] - 0.21, lantern[2], { delay: 1.05 });

  const DX = -0.15;
  const DZ = 0.55;
  // Batiscafo, waist-deep: diving canvas, a brass corselet, a weight belt and leather straps.
  const diver = figure(kit, {
    x: DX,
    z: DZ,
    y: F,
    facing: 0.3,
    height: 2.5,
    build: "broad",
    skin: 0xd0987a,
    hair: { style: "wild", color: 0xb8bcc4 },
    face: { mouth: "smile", brows: "calm", beard: "stubble", beardColor: 0xc8ccd4 },
    top: { kind: "uniform", color: CANVAS, accent: BRASS },
    bottom: { kind: "trousers", color: CANVAS },
    gloves: 0x2a2622,
    belt: 0x3a2a22,
    arms: [[-0.55, 2.5, 0.28], [0.58, 1.18, 0.22]],
    delay: 0.8,
  });
  const at = diver.at;
  const collar = cylinder(0.3, 0.52, 0.2, BRASS, ...at(0, 1.66, 0), { delay: 1.3 });
  decorate(collar, new SphereGeometry(0.025, 6, 4), 0x5a4a2a, [0, 1.2, 2.4, 3.6, 4.8].map((a) => [Math.sin(a) * 0.45, 0.06, Math.cos(a) * 0.45] as Point));
  decorate(collar, new ConeGeometry(0.03, 0.05, 6), 0xcfc9bb, [
    [0.25, 0.14, 0.3],
    [0.32, 0.1, 0.25],
  ]);
  [-1, 1].forEach((side) => box(0.08, 0.6, 0.03, 0x2a1f1a, ...at(side * 0.16, 1.1, 0.32), { delay: 1.32, rotation: [0.1, 0.3, side * 0.25] }));
  [-0.25, 0, 0.25].forEach((dx) => box(0.12, 0.1, 0.06, 0x4a4f5c, ...at(dx, 1.0, 0.33), { delay: 1.34, rotation: [0, 0.3, 0] }));
  // A starfish on his shoulder, along for the ride.
  const star = at(0.36, 1.5, 0.31);
  ball(0.04, MAGENTA, star[0], star[1] - 0.04, star[2], { delay: 1.5 });
  [0, 1, 2, 3, 4].forEach((k) => add(new ConeGeometry(0.035, 0.13, 6), MAGENTA, ...star, { delay: 1.52, rotation: [0, 0.3, (k * Math.PI * 2) / 5] }));

  // The helmet under his left arm.
  const H = at(0.72, 0.98, 0.18);
  const helmet = ball(0.25, BRASS, H[0], H[1], H[2], { delay: 1.4 });
  decorate(helmet, new TorusGeometry(0.08, 0.02, 6, 16), 0x7a5a2a, [
    [0.07, 0.27, 0.23],
    [0.24, 0.27, 0.02],
  ]);
  decorate(helmet, new CylinderGeometry(0.07, 0.07, 0.02, 14).rotateX(Math.PI / 2), 0x1f5a6a, [[0.07, 0.27, 0.225]]);
  decorate(helmet, new CylinderGeometry(0.07, 0.07, 0.02, 14).rotateZ(Math.PI / 2), 0x1f5a6a, [[0.235, 0.27, 0.02]]);
  cylinder(0.18, 0.2, 0.06, 0x7a5a2a, H[0], H[1] - 0.03, H[2], { delay: 1.42 }, 14);
  cable(kit, [[H[0] - 0.1, H[1] + 0.35, H[2] - 0.15], [0.5, W + 0.2, -0.4], [0.85, QY + 0.1, -0.85]], 0.03, 0x2a2622, 1.5);

  // The light from the rift, held high.
  const [hand] = diver.hands;
  const light = orb(kit, [hand[0], hand[1] + 0.3, hand[2]], 0.16, CYAN, 1.6);
  const halo = add(new TorusGeometry(0.26, 0.015, 6, 30), 0x9fefff, hand[0], hand[1] - 0.12, hand[2], { delay: 1.7, flat: true, noInk: true, rotation: [0, 0.3, 0] });
  motes(10, 0x9fefff, 0.03, [hand[0] - 0.3, hand[1], hand[2] - 0.2], [hand[0] + 0.3, hand[1] + 0.9, hand[2] + 0.2], 1.8);
  const sparks = Array.from({ length: 5 }, () => ball(0.035, 0x9fefff, hand[0], hand[1], hand[2], { delay: 1.9, flat: true, noInk: true }));

  // The water round him: splashes and spreading rings.
  [0.3, 1.5, 2.6, 3.6, 4.8, 5.6].forEach((a, k) => {
    const [x, z] = [DX + Math.cos(a) * 0.55, DZ + Math.sin(a) * 0.4];
    add(new ConeGeometry(0.05, 0.28 + (k % 3) * 0.08, 6), FOAM, x, W - 0.02, z, { delay: 1.2 + k * 0.02, flat: true, rotation: [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5] });
  });
  const rings = [0, 1].map((k) => add(new TorusGeometry(0.6, 0.02, 6, 36).rotateX(Math.PI / 2), FOAM, DX, W + 0.002, DZ, { delay: 1.1 + k * 0.1, flat: true, noInk: true }));

  const dark = new Color(0x3a4458);
  const lit = new Color(YELLOW);
  const deep = new Color(CYAN);
  const bright = new Color(0xe8fbff);
  const glowTarget: Point = [lantern[0], lantern[1] - 0.14, lantern[2]];
  tick((t) => {
    const pulse = (Math.sin(t * 2.4) + 1) / 2;
    colorOf(light).lerpColors(deep, bright, pulse);
    halo.rotation.z = t * 0.8;
    beam.rotation.y = 2.0 + t * 0.9;
    wheels.forEach((wheel) => (wheel.rotation.x = t * 1.2));
    rings.forEach((ring, k) => {
      const v = (t * 0.4 + k * 0.5) % 1;
      ring.children[0].scale.set(0.7 + v, 1, 0.7 + v);
      ring.visible = v < 0.85;
    });
    // Sparks fly from the light to the boy's lantern, and it lights up.
    sparks.forEach((spark, k) => {
      const v = (t * 0.35 + k / sparks.length) % 1;
      spark.position.set(
        hand[0] + (glowTarget[0] - hand[0]) * v,
        hand[1] + 0.25 + (glowTarget[1] - hand[1] - 0.25) * v + Math.sin(v * Math.PI) * 0.5,
        hand[2] + (glowTarget[2] - hand[2]) * v,
      );
    });
    colorOf(lamp).lerpColors(dark, lit, Math.min(1, (Math.sin(t * 1.1) + 1) * 0.7));
  });

  return { width: 4.9, height: 4.6, lookY: 1.7 };
}
