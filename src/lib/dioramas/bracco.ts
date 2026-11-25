import { BoxGeometry, ConeGeometry, CylinderGeometry, ExtrudeGeometry, Group, type Object3D, Shape, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { CYAN, MAGENTA, YELLOW, aim, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { bollard, crate, barrel, lamp } from "@/lib/diorama-props";

/**
 * Bracco (P238): the Lete's hound drone, brass and porcelain, hovering over the night quay under
 * the rift that hangs above the gulf. A wet trail of footprints leads from the water to a stack
 * of crates, where two eyes shine in a gap: someone has just come through. The drone sniffs the
 * air three times, its scent beam sweeping the crates, then turns back to us. It is all show and
 * no strength: a crack mended with gold runs across its porcelain head.
 */
export function bracco(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const WATER = 0x0e3a4e;
  const FOAM = 0xcfeef7;
  const STONE = 0x3e4254;
  const PORCELAIN = 0xeae6df;
  const BRASS = 0xb08d3c;
  const GOLD = 0xd8b040;
  const F = octagonBase(kit, WATER);

  // The quay: the base's octagon cut along z = −1, raised above the water.
  const corners = Array.from({ length: 8 }, (_, k) => [2.3 * Math.cos(Math.PI / 8 + (k * Math.PI) / 4), 2.3 * Math.sin(Math.PI / 8 + (k * Math.PI) / 4)]);
  const kept: [number, number][] = [];
  corners.forEach(([x, z], k) => {
    const [nx, nz] = corners[(k + 1) % 8];
    if (z >= -1) kept.push([x, z]);
    if (z >= -1 !== nz >= -1) kept.push([x + ((nx - x) * (-1 - z)) / (nz - z), -1]);
  });
  const outline = new Shape();
  kept.forEach(([x, z], k) => (k ? outline.lineTo(x, z) : outline.moveTo(x, z)));
  outline.closePath();
  const quay = add(new ExtrudeGeometry(outline, { depth: 0.25, bevelEnabled: false }).rotateX(Math.PI / 2), STONE, 0, F, 0, { delay: 0.06, ink: 1.01 });
  const G = F + 0.25;
  const inner = 2.06;
  const half = (d: number) => Math.min(inner, inner * Math.SQRT2 - Math.abs(d));
  for (let z = -0.5; z < 2.1; z += 0.5) decorate(quay, new BoxGeometry(2 * half(z), 0.004, 0.012), 0x2c2f3c, [[0, 0.252, z]]);
  for (let x = -1.5; x < 1.6; x += 0.5) decorate(quay, new BoxGeometry(0.012, 0.004, half(x) + 1), 0x2c2f3c, [[x, 0.252, (half(x) - 1) / 2]]);
  box(3.9, 0.06, 0.2, 0x50556a, 0, G, -0.9, { delay: 0.1 });

  // The rift over the gulf: a jagged tear, magenta round a cyan and white heart.
  const tear = (scale: number) => {
    const shape = new Shape();
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      const r = k % 2 ? 0.55 : 1;
      const p: [number, number] = [Math.cos(a) * 1.0 * r * scale, Math.sin(a) * 0.17 * r * scale];
      if (k) shape.lineTo(...p);
      else shape.moveTo(...p);
    }
    shape.closePath();
    return new ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: false });
  };
  const rift = [MAGENTA, CYAN, 0xf4f0ff].map((color, k) =>
    add(tear(1 - k * 0.3), color, 0.75, G + 2.3 + k * 0.05, -1.75 + k * 0.03, { delay: 0.2 + k * 0.05, flat: true, noInk: true, rotation: [0, 0, 0.45] }),
  );
  motes(10, MAGENTA, 0.03, [0.2, F + 0.05, -1.9], [1.2, G + 2.3, -1.3], 0.6);
  const ripple = add(new TorusGeometry(0.4, 0.018, 6, 36).rotateX(Math.PI / 2), FOAM, 0.6, F + 0.002, -1.55, { delay: 0.4, flat: true, noInk: true });

  // Crates on the quay; something hides in the front one.
  crate(kit, -1.4, -0.55, G, 0.3, 0.5, 0x5e4a3a, 0.2);
  crate(kit, -1.35, -0.5, G + 0.5, 0.34, 0.42, 0x6b5442, -0.15);
  barrel(kit, -1.8, 0.2, G, 0.36, 0x2f6f86);
  const hideout = crate(kit, -0.95, 0.3, G, 0.4, 0.6, 0x5e4a3a, 0.35);
  decorate(hideout, new BoxGeometry(0.46, 0.09, 0.01), 0x0a0a12, [[0, 0.34, 0.305]]);
  const eyes = decorate(hideout, new BoxGeometry(0.045, 0.03, 0.01), CYAN, [
    [-0.06, 0.34, 0.308],
    [0.06, 0.34, 0.308],
  ]);
  // Wet footprints from the water's edge to the crate.
  const trail = add(new BoxGeometry(0.001, 0.001, 0.001), 0x2a8aa8, 0, G, 0, { delay: 0.45, flat: true, noInk: true });
  const print = new CylinderGeometry(0.05, 0.05, 0.004, 10).scale(1, 1, 1.7);
  decorate(
    trail,
    print,
    0x2a8aa8,
    Array.from({ length: 7 }, (_, k) => {
      const s = k / 6;
      return [0.15 - s * 0.85 + (k % 2 ? 0.07 : -0.07), 0.003, -0.8 + s * 1.0] as Point;
    }),
  );
  bollard(kit, 1.25, -0.75, G, 0.3);
  const light = lamp(kit, 1.75, -0.4, G, 0.32, 2.3);

  // Bracco, built facing +z round its centre, then turned and tilted as one.
  const root = quay.parent as Object3D;
  const before = new Set(root.children);
  const D = new Vector3(0.45, G + 1.75, 0.35);
  const at = (x: number, y: number, z: number): Point => [D.x + x, D.y + y, D.z + z];
  const head = add(new SphereGeometry(0.42, 18, 14).scale(0.78, 0.72, 1.25), PORCELAIN, ...at(0, -0.3024, -0.1), { delay: 0.8 });
  decorate(head, new BoxGeometry(0.014, 0.03, 0.12), GOLD, [
    [0.02, 0.6, -0.02],
    [-0.025, 0.59, 0.1],
    [0.025, 0.57, 0.21],
    [-0.01, 0.54, 0.31],
  ]);
  decorate(head, new BoxGeometry(0.05, 0.03, 0.014), GOLD, [
    [0, 0.6, 0.04],
    [0, 0.58, 0.155],
  ]);
  decorate(head, new TorusGeometry(0.33, 0.02, 6, 24), BRASS, [[0, 0.3024, -0.2]]);
  add(new CylinderGeometry(0.11, 0.25, 0.62, 16).rotateX(Math.PI / 2), PORCELAIN, ...at(0, -0.33, 0.55), { delay: 0.85 });
  [
    [0.35, 0.225],
    [0.72, 0.142],
  ].forEach(([z, r], i) => add(new TorusGeometry(r, 0.025, 6, 20), BRASS, ...at(0, -0.08 - r - 0.025, z), { delay: 0.9 + i * 0.02 }));
  const cap = add(new CylinderGeometry(0.12, 0.12, 0.08, 14).rotateX(Math.PI / 2), BRASS, ...at(0, -0.2, 0.88), { delay: 0.94 });
  decorate(cap, new CylinderGeometry(0.022, 0.022, 0.01, 8).rotateX(Math.PI / 2), 0x14121c, [
    [-0.045, 0.14, 0.041],
    [0.045, 0.14, 0.041],
    [0, 0.07, 0.041],
  ]);
  [-1, 1].forEach((side, i) => {
    add(new ConeGeometry(0.09, 0.34, 4), PORCELAIN, ...at(side * 0.19, 0.12, -0.2), { delay: 1.0 + i * 0.02, rotation: [-0.6, 0, -side * 0.35] });
    add(new ConeGeometry(0.05, 0.42, 6), 0xc8c4d8, ...at(side * 0.3, -0.02, -0.4), { delay: 1.04 + i * 0.02, rotation: [-1.3, 0, -side * 0.6] });
    add(new TorusGeometry(0.075, 0.022, 6, 14), BRASS, ...at(side * 0.22, 0.06 - 0.097, 0.22), { delay: 1.08 + i * 0.02, rotation: [0, side * 0.7, 0] });
    ball(0.06, YELLOW, ...at(side * 0.225, 0.0, 0.225), { delay: 1.1 + i * 0.02, flat: true });
  });
  add(new TorusGeometry(0.22, 0.03, 6, 24).rotateX(Math.PI / 2), CYAN, ...at(0, -0.48, -0.1), { delay: 1.12, flat: true, noInk: true });
  cylinder(0.08, 0.12, 0.1, BRASS, ...at(0, -0.4, -0.1), { delay: 1.1 }, 12);
  // The scent beam, from the nostrils to the ground ahead.
  const nose = at(0, -0.12, 0.93);
  const sniffed = at(0, G - D.y + 0.02, 1.15);
  const reach = aim(nose, sniffed);
  add(new CylinderGeometry(0.12, 0.025, reach.length, 14), 0xffe9a0, ...nose, { delay: 1.3, flat: true, noInk: true, rotation: reach.rotation });

  const drone = new Group();
  drone.position.copy(D);
  drone.scale.setScalar(1.3);
  drone.rotation.order = "YXZ";
  root.children
    .filter((child) => !before.has(child))
    .forEach((part) => {
      part.position.sub(D);
      drone.add(part);
    });
  root.add(drone);

  const ease = (x: number) => x * x * (3 - 2 * x);
  const FACE = -0.45;
  const CRATE = -1.64;
  tick((t) => {
    const p = t % 6;
    const yaw = p < 1 ? FACE : p < 1.6 ? FACE + (CRATE - FACE) * ease((p - 1) / 0.6) : p < 3.6 ? CRATE : p < 4.2 ? CRATE + (FACE - CRATE) * ease((p - 3.6) / 0.6) : FACE;
    const sniff = p >= 1.7 && p < 3.5 ? 0.18 * Math.max(0, Math.sin(((p - 1.7) / 0.6) * Math.PI * 2)) : 0;
    drone.rotation.set(sniff, yaw, 0);
    drone.position.y = D.y + Math.sin(t * 2) * 0.05;
    eyes.visible = t % 3.5 < 3.3;
    rift.forEach((layer, k) => layer.children[0].scale.setScalar(1 + Math.sin(t * 2.2 + k) * 0.04));
    ripple.children[0].scale.setScalar(0.6 + ((t * 0.4) % 1));
    light.visible = Math.floor(t * 6) % 17 !== 9;
  });

  return { width: 4.9, height: 4.4, lookY: 1.55 };
}
