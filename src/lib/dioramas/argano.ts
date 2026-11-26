import { BoxGeometry, CylinderGeometry, DodecahedronGeometry, Group, TorusGeometry } from "three";
import { INK, MAGENTA, YELLOW, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure, shade } from "@/lib/diorama-figure";
import { bollard, crate, floor } from "@/lib/diorama-props";

/**
 * Argano (P331): the strongest docker of the Faro team has arrived last, as always, and ends it:
 * on the quay she holds the villains' getaway car upside down over her head, grinning, its
 * wheels still spinning and bits of it raining down, the concrete cracked under her boots.
 * Behind her the containers and the idle winch she was named after; on a crate, the lunch she
 * finished first, the thermos still steaming. No magic, no stealth: just muscle.
 */
export function argano(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick, motes } = kit;
  const STEEL = 0x4a4f5c;
  const CAR = 0x3a4a7a;
  const F = octagonBase(kit, 0x1c1d27);
  const G = floor(kit, F, 0.06, 0x3a3f4e, 0x2a2e3a, 0.55);

  // A yellow safety line along the quay, containers at the back, bollards.
  box(2.6, 0.006, 0.08, YELLOW, -1.05, G, 1.15, { delay: 0.1, flat: true, noInk: true, rotation: [0, -Math.PI / 4, 0] });
  const containers: [number, number, number, number, number][] = [
    [-0.65, 0, -1.3, 0x1f7f9c, 0],
    [-0.55, 0.72, -1.3, 0x7a2f55, 0.06],
  ];
  containers.forEach(([x, y, z, color, turn], i) => {
    const part = box(1.6, 0.72, 0.7, color, x, G + y, z, { delay: 0.15 + i * 0.06, rotation: [0, turn, 0] });
    decorate(part, new BoxGeometry(0.02, 0.62, 0.01), shade(color, 0.7), Array.from({ length: 10 }, (_, k) => [-0.72 + k * 0.16, 0.36, 0.352] as Point));
  });
  bollard(kit, -1.55, 0.55, G, 0.3);
  bollard(kit, 0.6, 1.45, G, 0.32);

  // The winch: two cheeks, the drum wound with cable, the hook lying slack on the quay.
  const [wx, wz] = [1.25, -0.8];
  [-0.34, 0.34].forEach((dx) => box(0.06, 0.6, 0.5, STEEL, wx + dx, G, wz, { delay: 0.3 }));
  add(new CylinderGeometry(0.2, 0.2, 0.62, 16).rotateZ(Math.PI / 2), 0x2a2a34, wx, G + 0.18, wz, { delay: 0.34 });
  [-0.2, -0.1, 0, 0.1, 0.2].forEach((dx, k) =>
    add(new TorusGeometry(0.205, 0.025, 6, 18).rotateY(Math.PI / 2), 0x8a93a3, wx + dx, G + 0.155, wz, { delay: 0.36 + k * 0.01, noInk: true }),
  );
  box(0.05, 0.05, 0.36, STEEL, wx + 0.4, G + 0.38, wz + 0.15, { delay: 0.38 });
  box(0.4, 0.008, 0.02, 0x8a93a3, wx - 0.05, G + 0.002, wz + 0.45, { delay: 0.4, flat: true, noInk: true, rotation: [0, 0.6, 0] });
  add(new TorusGeometry(0.08, 0.025, 6, 14, Math.PI * 1.4), STEEL, wx - 0.25, G, wz + 0.68, { delay: 0.42, rotation: [Math.PI / 2, 0, 0.5] });

  // Her lunch, finished: an open tin and a steaming thermos cup on a crate.
  const [lx, lz] = [1.45, 0.65];
  crate(kit, lx, lz, G, 0.4, 0.45, 0x5e4a3a, -0.3);
  const tin = box(0.26, 0.08, 0.18, 0x8a93a3, lx - 0.05, G + 0.45, lz, { delay: 0.5, rotation: [0, -0.3, 0] });
  decorate(tin, new BoxGeometry(0.22, 0.01, 0.14), 0x14121c, [[0, 0.081, 0]]);
  box(0.26, 0.18, 0.01, 0x8a93a3, lx - 0.08, G + 0.53, lz - 0.1, { delay: 0.52, rotation: [-0.4, -0.3, 0] });
  cylinder(0.05, 0.05, 0.24, 0xe0402a, lx + 0.14, G + 0.45, lz + 0.08, { delay: 0.54 }, 12);
  cylinder(0.045, 0.04, 0.06, 0xe8e2d0, lx + 0.14, G + 0.69, lz + 0.08, { delay: 0.56 }, 12);
  motes(6, 0xe8f4ff, 0.02, [lx + 0.08, G + 0.75, lz + 0.03], [lx + 0.2, G + 1.3, lz + 0.13], 0.8);

  // Argano, feet planted, the car over her head.
  const facing = 0.3;
  const H = 2.5;
  const u = H / 2.4;
  const docker = figure(kit, {
    x: -0.15,
    z: 0.3,
    y: G,
    facing,
    height: H,
    build: "broad",
    skin: 0xe8b898,
    hair: { style: "short", color: 0xf0ecd8 },
    face: { mouth: "grin", brows: "raised" },
    top: { kind: "shirt", color: 0x1f2a4a, sleeves: "short" },
    bottom: { kind: "trousers", color: 0xe8c020 },
    shoes: 0x14121c,
    belt: 0x2a2a30,
    arms: [[-0.38, 2.68, 0.08], [0.38, 2.68, 0.08]],
    legs: "wide",
    delay: 0.8,
  });
  // Cracks in the concrete under her boots.
  [0.4, 1.3, 2.3, 3.6, 4.7, 5.6].forEach((a, i) => {
    const [cx, , cz] = docker.at(Math.cos(a) * 0.55, 0, Math.sin(a) * 0.45);
    box(0.4 + (i % 2) * 0.15, 0.006, 0.02, INK, cx, G + 0.002, cz, { delay: 1.0 + i * 0.02, flat: true, noInk: true, rotation: [0, -a + facing, 0] });
  });

  // The car, upside down: built the right way up, then flipped as one.
  const roofY = docker.hands[0][1] + 0.08 * u;
  const car = new Group();
  const body = box(1.4, 0.32, 0.66, CAR, 0, 0.1, 0, { delay: 1.5 });
  decorate(body, new BoxGeometry(0.02, 0.08, 0.1), YELLOW, [
    [0.71, 0.18, -0.2],
    [0.71, 0.18, 0.2],
  ]);
  decorate(body, new BoxGeometry(0.02, 0.06, 0.12), MAGENTA, [
    [-0.71, 0.2, -0.2],
    [-0.71, 0.2, 0.2],
  ]);
  decorate(body, new BoxGeometry(1.2, 0.012, 0.06), 0x14121c, [[0, -0.007, 0.1]]);
  decorate(body, new BoxGeometry(0.08, 0.012, 0.5), 0x14121c, [
    [-0.45, -0.007, 0],
    [0.45, -0.007, 0],
  ]);
  const cabin = box(0.75, 0.28, 0.6, shade(CAR, 1.2), 0, 0.42, 0, { delay: 1.55 });
  decorate(cabin, new BoxGeometry(0.62, 0.17, 0.61), 0x16303e, [[0, 0.13, 0]]);
  decorate(cabin, new BoxGeometry(0.76, 0.17, 0.4), 0x16303e, [[0, 0.13, 0]]);
  const parts = [body, cabin];
  const wheels = [-0.45, 0.45].flatMap((x) =>
    [-0.33, 0.33].map((z) => {
      const wheel = add(new CylinderGeometry(0.14, 0.14, 0.09, 14).rotateX(Math.PI / 2), 0x23222b, 0, 0, 0, { delay: 1.6 });
      decorate(wheel, new BoxGeometry(0.2, 0.04, 0.095), 0x8a93a3, [[0, 0.14, 0]]);
      const hub = new Group();
      hub.position.set(x, 0.14, z);
      wheel.position.set(0, -0.14, 0);
      hub.add(wheel);
      return hub;
    }),
  );
  body.parent?.add(car);
  parts.forEach((part) => car.add(part));
  wheels.forEach((hub) => car.add(hub));
  const [ox, , oz] = docker.at(0, 0, 0.28);
  car.position.set(ox, roofY + 0.7, oz);
  car.rotation.order = "YXZ";
  car.rotation.set(0.3, facing, Math.PI);

  // Bits of the car raining down.
  const bits = Array.from({ length: 6 }, (_, k) => {
    const x = ox + (k - 2.5) * 0.28;
    const z = oz + ((k * 3) % 5) * 0.12 - 0.2;
    return { part: add(new DodecahedronGeometry(0.035 + (k % 3) * 0.01), k % 2 ? 0x8a93a3 : CAR, x, roofY, z, { delay: 1.7, rotation: [k, k * 2, 0] }), x, z, phase: k / 6 };
  });

  tick((t) => {
    car.rotation.set(0.3 + Math.sin(t * 1.1) * 0.03, facing, Math.PI + Math.sin(t * 1.4) * 0.04);
    wheels.forEach((hub, k) => (hub.rotation.z = t * (6 + k)));
    bits.forEach(({ part, x, z, phase }) => {
      const s = (t * 0.5 + phase) % 1;
      part.position.set(x + Math.sin(phase * 9) * 0.3 * s, roofY + 0.2 - s * s * (roofY + 0.1 - G), z + 0.3 * s);
      part.rotation.x = t * 3 + phase;
      part.visible = s < 0.95;
    });
  });

  return { width: 4.9, height: 4.6, lookY: 1.8 };
}
