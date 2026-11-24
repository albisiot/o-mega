import { BoxGeometry, CylinderGeometry, ConeGeometry, Group, TorusGeometry } from "three";
import { INK, MAGENTA, YELLOW, cable, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, orb, ring } from "@/lib/diorama-props";

/**
 * Errata (P076): on the harbour mole under the lighthouse, the woman who bends chance laughs with
 * a spinning gyroscope in her palm, her brass crown piped to the clanking engine behind her, and
 * dice, gears and pocket watches whirl round her on a golden band. She has foreseen everything
 * except what is right under her nose: the open manhole in front of her next step.
 */
export function errata(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick, motes } = kit;
  const BRASS = 0xc8963a;
  const BRASS_DARK = 0x8a6424;
  const CREAM = 0xf0e8d8;
  const F = octagonBase(kit, 0x1d1b28);
  const G = floor(kit, F, 0.06, 0x3a3c4c, 0x26283a, 0.55);

  // The lighthouse at the end of the mole, its beam sweeping round.
  const LX = -1.35;
  const LZ = -1.2;
  const tower = cylinder(0.3, 0.42, 2.3, 0x23404b, LX, G, LZ, { delay: 0.1 }, 16);
  decorate(tower, new TorusGeometry(0.39, 0.035, 6, 24).rotateX(Math.PI / 2), MAGENTA, [[0, 0.5, 0], [0, 1.3, 0]]);
  decorate(tower, new BoxGeometry(0.08, 0.14, 0.01), YELLOW, [[0, 0.85, 0.39], [0, 1.65, 0.34]]);
  cylinder(0.44, 0.44, 0.06, 0x1d2a33, LX, G + 2.3, LZ, { delay: 0.2 }, 16);
  cylinder(0.2, 0.2, 0.3, 0xfff2a0, LX, G + 2.36, LZ, { delay: 0.24, flat: true }, 12);
  add(new ConeGeometry(0.27, 0.26, 12), 0x1d2a33, LX, G + 2.66, LZ, { delay: 0.28 });
  const beam = add(new BoxGeometry(0.9, 0.07, 0.07).translate(0.45, 0, 0), 0xfff2a0, LX, G + 2.48, LZ, { delay: 0.32, flat: true, noInk: true });

  // The chance engine behind her: brass, dials, a smoking stack.
  const engine = box(0.7, 0.55, 0.5, BRASS_DARK, 0.95, G, -0.95, { delay: 0.3 });
  decorate(engine, new CylinderGeometry(0.12, 0.12, 0.01, 16).rotateX(Math.PI / 2), CREAM, [[-0.14, 0.3, 0.255]]);
  decorate(engine, new CylinderGeometry(0.06, 0.06, 0.01, 12).rotateX(Math.PI / 2), CREAM, [[0.2, 0.42, 0.255]]);
  decorate(engine, new BoxGeometry(0.014, 0.1, 0.01), INK, [[-0.14, 0.33, 0.265, 0.6]]);
  decorate(engine, new BoxGeometry(0.06, 0.2, 0.01), MAGENTA, [[0.2, 0.15, 0.255]]);
  cylinder(0.06, 0.07, 0.35, BRASS, 1.18, G + 0.55, -1.05, { delay: 0.38 });
  motes(5, 0x7a6a8a, 0.04, [1.12, G + 0.95, -1.1], [1.24, G + 1.6, -1.0], 1.0);

  // The open manhole in her path, its cover pushed aside, a warning cone knocked over.
  cylinder(0.3, 0.3, 0.006, 0x07070c, 0.35, G, 1.15, { delay: 0.4, flat: true, noInk: true }, 20);
  add(new TorusGeometry(0.3, 0.028, 6, 24).rotateX(Math.PI / 2), 0x5d6680, 0.35, G, 1.15, { delay: 0.42 });
  const cover = cylinder(0.3, 0.3, 0.04, 0x4a4f5c, 1.05, G, 0.95, { delay: 0.45, rotation: [0, 0, 0.12] }, 20);
  decorate(cover, new BoxGeometry(0.44, 0.004, 0.03), 0x30343e, [-0.12, 0, 0.12].map((z) => [0, 0.042, z] as Point));
  const cone = add(new ConeGeometry(0.12, 0.38, 12), MAGENTA, -0.45, G + 0.12, 1.3, { delay: 0.48, rotation: [0.3, 0, Math.PI / 2] });
  decorate(cone, new TorusGeometry(0.078, 0.022, 6, 14).rotateX(Math.PI / 2), 0xf4f0e6, [[0, 0.17, 0]]);
  motes(6, 0xcfd8e8, 0.025, [0.25, G, 1.05], [0.45, G + 0.7, 1.25], 1.2);

  // Errata: magenta robe, auburn curls, a brass crown, laughing, her right arm flung up.
  const facing = 0.4;
  const lady = figure(kit, {
    x: 0.05, z: 0.1, y: G, facing, height: 2.4, build: "slim",
    skin: 0xecc0a8,
    hair: { style: "curly", color: 0x7a2a24 },
    face: { mouth: "grin", brows: "raised" },
    headwear: { kind: "crown", color: BRASS },
    top: { kind: "robe", color: 0xb0245a, accent: 0xd04070 },
    shoes: 0x2a2026,
    arms: ["wave", [0.36, 1.5, 0.52]],
    delay: 0.8,
  });

  // A mass of auburn curls under the crown.
  const RH = lady.headRadius;
  [[-1.0, -0.1, -0.2], [1.0, -0.1, -0.2], [-0.8, -0.6, -0.4], [0.8, -0.6, -0.4], [0, 0.3, -0.8], [-0.6, 0.35, -0.6], [0.6, 0.35, -0.6]].forEach(([lx, ly, lz], i) => {
    const p = lady.at(lx * RH, 2.14 + ly * RH, lz * RH);
    kit.ball(RH * 0.45, 0x7a2a24, p[0], p[1] - RH * 0.45, p[2], { delay: 1.2 + i * 0.02 });
  });

  // The pipes from her crown down to the engine.
  [
    [-0.12, -0.08, 0.9, 2.95, -0.55],
    [0.12, -0.08, 1.3, 2.7, -0.75],
    [0, -0.18, 0.6, 2.85, -1.05],
    [-0.16, 0.02, -0.4, 3.0, -0.6],
  ].forEach(([lx, lz, mx, my, mz], i) => {
    const from = lady.at(lx, 2.48, lz);
    cable(kit, [from, [mx, G + my, mz], [0.85 + i * 0.08, G + 0.58, -0.95 + (i % 2) * 0.12]], 0.03, i % 2 ? 0x6a1a3a : 0x3a2a40, 1.4 + i * 0.05);
  });

  // The gyroscope on her palm: a little sun inside three spinning gimbals.
  const [hx, hy, hz] = lady.hands[1];
  const centre: Point = [hx, hy + 0.27, hz];
  cylinder(0.04, 0.07, 0.08, BRASS, hx, hy + 0.06, hz, { delay: 1.5 });
  orb(kit, centre, 0.07, YELLOW, 1.55);
  const gimbals = [0.15, 0.19, 0.23].map((r, k) =>
    add(k ? new TorusGeometry(r, 0.014, 6, 28) : new TorusGeometry(r, 0.014, 6, 28).rotateX(Math.PI / 2), k === 1 ? YELLOW : BRASS, hx, hy + 0.27 - (k ? r + 0.014 : 0.014), hz, { delay: 1.58 + k * 0.04, flat: k === 1 }),
  );

  // The golden band of chance round her, and what rides on it.
  const O = lady.at(0, 1.25, 0);
  const R = 1.0;
  const tilt = 0.3;
  const band = ring(kit, [O[0], O[1] - 0.02, O[2]], R, YELLOW, 1.7);
  band.rotation.z = tilt;
  const items: Group[] = [];
  for (let k = 0; k < 8; k++) {
    const kind = k % 4;
    if (kind === 0 || kind === 2) {
      const die = box(0.13, 0.13, 0.13, CREAM, ...O, { delay: 1.75 + k * 0.03 });
      decorate(die, new BoxGeometry(0.026, 0.026, 0.01), INK, [[-0.035, 0.1, 0.066], [0.035, 0.03, 0.066], [0, 0.065, 0.066]]);
      decorate(die, new BoxGeometry(0.026, 0.01, 0.026), INK, [[-0.035, 0.131, -0.035], [0.035, 0.131, 0.035]]);
      decorate(die, new BoxGeometry(0.01, 0.026, 0.026), INK, [[0.066, 0.065, 0]]);
      items.push(die);
    } else if (kind === 1) {
      const gear = add(new CylinderGeometry(0.1, 0.1, 0.03, 10).rotateX(Math.PI / 2), BRASS, ...O, { delay: 1.75 + k * 0.03 });
      decorate(gear, new BoxGeometry(0.05, 0.05, 0.035), BRASS_DARK, [[0, 0.1, 0]]);
      items.push(gear);
    } else {
      const watch = add(new CylinderGeometry(0.09, 0.09, 0.03, 16).rotateX(Math.PI / 2), BRASS, ...O, { delay: 1.75 + k * 0.03 });
      decorate(watch, new CylinderGeometry(0.075, 0.075, 0.01, 16).rotateX(Math.PI / 2), CREAM, [[0, 0.09, 0.012]]);
      decorate(watch, new BoxGeometry(0.008, 0.055, 0.01), INK, [[0, 0.11, 0.02, 0], [0.015, 0.09, 0.02, 1.2]]);
      items.push(watch);
    }
  }

  tick((t) => {
    beam.rotation.y = t * 1.1 + 0.6;
    gimbals.forEach((gimbal, k) => (gimbal.rotation.y = t * (k === 1 ? 3.1 : -2.3) + k));
    items.forEach((item, k) => {
      const a = (k / items.length) * Math.PI * 2 + t * 0.55;
      item.position.set(O[0] + R * Math.cos(a) * Math.cos(tilt), O[1] + R * Math.cos(a) * Math.sin(tilt) - 0.06, O[2] + R * Math.sin(a));
      item.rotation.set(t * 1.3 + k, t * 0.9 + k * 2, 0);
    });
    lady.headPart.rotation.z = Math.sin(t * 8) * 0.03;
  });

  return { width: 4.9, height: 4.4, lookY: 1.55 };
}
