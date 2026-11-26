import { BoxGeometry, CatmullRomCurve3, CylinderGeometry, TubeGeometry, Vector3 } from "three";
import { CYAN, MAGENTA, YELLOW, cable, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { facade, floor, lamp, puddle, table } from "@/lib/diorama-props";

/**
 * Trucco (P324): the street conjurer runs his card game at a folding table under the houses at
 * night, grinning, a fan of cards held out to us. A burly docker points at the card he wants,
 * but a ribbon of real golden magic has already lifted it into the air and the three cards left
 * on the cloth will not stop changing places. The hat at his feet fills with coins; the docker
 * is twice his size, and Trucco could not win a fight with anyone.
 */
export function trucco(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick } = kit;
  const F = octagonBase(kit, 0x1d1b28);
  const G = floor(kit, F, 0.06, 0x2e2a3a, 0x1e1a28, 0.3);

  // The street: a house front, a lamp, a puddle catching the light.
  facade(kit, -0.1, -1.45, G, 0.1, { width: 2.9, height: 2.8, color: 0x3a2a4a, windows: 3, floors: 2, door: true, shutters: 0x23404b });
  const light = lamp(kit, 1.55, -0.85, G, 0.3, 2.3);
  puddle(kit, 1.2, 0.2, G, 0.4, 0.3, CYAN);

  // The folding table with its cloth, and three cards that never stay put.
  const [tx, tz] = [0.35, 0.5];
  const top = table(kit, tx, tz, G, 0.3, false, 0x23404b, 0.7);
  decorate(top, new BoxGeometry(0.97, 0.012, 0.72), 0x6a1a40, [[0, 0.05, 0]]);
  decorate(top, new BoxGeometry(0.97, 0.16, 0.01), 0x6a1a40, [[0, -0.03, 0.36]]);
  const TY = G + 0.75 + 0.065;
  const cards = [0, 1, 2].map((k) => {
    const card = box(0.13, 0.012, 0.19, 0x1f5a8a, tx, TY, tz, { delay: 0.5 + k * 0.04 });
    decorate(card, new BoxGeometry(0.09, 0.004, 0.15), CYAN, [[0, 0.013, 0]]);
    return card;
  });

  // The hat for the takings.
  const hx = 1.0;
  const hz = 1.0;
  cylinder(0.15, 0.15, 0.3, 0x1a1a22, hx, G, hz, { delay: 0.45 }, 16);
  const brim = cylinder(0.27, 0.27, 0.025, 0x1a1a22, hx, G + 0.3, hz, { delay: 0.5 }, 20);
  decorate(brim, new CylinderGeometry(0.14, 0.14, 0.01, 16), 0x0c0a12, [[0, 0.02, 0]]);
  decorate(brim, new CylinderGeometry(0.045, 0.045, 0.012, 12), YELLOW, [
    [-0.05, 0.03, 0.02],
    [0.05, 0.032, -0.03],
    [0.02, 0.034, 0.06],
  ]);

  // Trucco, behind the table, the fan of cards held out.
  const facing = 0.3;
  const magician = figure(kit, {
    x: 0.2,
    z: -0.4,
    y: G,
    facing,
    height: 2.4,
    build: "slim",
    skin: 0xe0b090,
    hair: { style: "curly", color: 0x1f1b22 },
    face: { mouth: "smirk", brows: "raised" },
    top: { kind: "coat", color: 0x1f4a4a, accent: 0x2a2a36 },
    bottom: { kind: "trousers", color: 0x1e2a30 },
    shoes: 0x14121c,
    scarf: 0x8a93a3,
    arms: [[-0.5, 1.75, 0.5], [0.3, 1.5, 0.62]],
    delay: 0.8,
  });
  const [lift, hold] = magician.hands;
  [-0.55, -0.27, 0, 0.27, 0.55].forEach((lean, k) => {
    const card = box(0.12, 0.17, 0.006, 0xf4f0e6, hold[0], hold[1] - 0.04, hold[2] + 0.04 + k * 0.004, { delay: 1.4 + k * 0.03, rotation: [-0.2, facing, -lean] });
    decorate(card, new BoxGeometry(0.035, 0.035, 0.004), k % 2 ? CYAN : MAGENTA, [[0, 0.13, 0.004, Math.PI / 4]]);
  });

  // The card the docker wanted, floating up out of reach on a ribbon from Trucco's fingers.
  const floatAt: Point = [tx + 0.25, G + 1.3, tz + 0.3];
  const floating = box(0.15, 0.21, 0.008, 0xf4f0e6, ...floatAt, { delay: 1.6 });
  decorate(floating, new BoxGeometry(0.045, 0.045, 0.004), MAGENTA, [
    [0, 0.105, 0.006, Math.PI / 4],
    [0, 0.105, -0.006, Math.PI / 4],
  ]);
  decorate(floating, new BoxGeometry(0.15, 0.21, 0.004), 0x1f5a8a, [[0, 0.105, -0.007]]);
  cable(kit, [lift, [lift[0] + 0.25, lift[1] + 0.25, lift[2] + 0.2], [floatAt[0] - 0.1, floatAt[1] + 0.35, floatAt[2] - 0.05], [floatAt[0], floatAt[1] + 0.22, floatAt[2]]], 0.016, YELLOW, 1.7);

  // Ribbons of golden light winding round him.
  const [mx, , mz] = magician.at(0, 0, 0);
  const ribbons = [0, Math.PI].map((phase, k) => {
    const points: Vector3[] = [];
    for (let i = 0; i <= 24; i++) {
      const a = phase + i * 0.38;
      const r = 0.62 + Math.sin(i * 0.5) * 0.06;
      points.push(new Vector3(Math.cos(a) * r, 0.95 + i * 0.055, Math.sin(a) * r));
    }
    return add(new TubeGeometry(new CatmullRomCurve3(points), 80, 0.022, 5), k ? 0xffe680 : YELLOW, mx, G + 0.93, mz, { delay: 1.8 + k * 0.1, flat: true, noInk: true });
  });

  // The mark: a docker twice his size, pointing at the card that is no longer there.
  const [dx, dz] = [-0.85, 1.0];
  const phi = Math.atan2(tx - dx, tz - dz);
  const target: Point = [tx - 0.15, G + 1.1, tz + 0.05];
  const ex = target[0] - dx;
  const ez = target[2] - dz;
  figure(kit, {
    x: dx,
    z: dz,
    y: G,
    facing: phi,
    height: 2.45,
    build: "heavy",
    skin: 0xc48c68,
    hair: { style: "short", color: 0x3a2a22 },
    face: { mouth: "frown", brows: "angry", beard: "full", beardColor: 0x3a2a22 },
    headwear: { kind: "beanie", color: 0x2f6f60, accent: 0x23504a },
    top: { kind: "jacket", color: 0x4a3a40, accent: 0x6a5a50 },
    bottom: { kind: "trousers", color: 0x2b2f3a },
    shoes: 0x2a2622,
    arms: [[ex * Math.cos(phi) - ez * Math.sin(phi), target[1] - G, ex * Math.sin(phi) + ez * Math.cos(phi)], "hip"],
    delay: 1.0,
  });

  const rest = cards.map((card) => card.position.clone());
  tick((t) => {
    // The cards trade places round and round; the lifted one turns in the air.
    cards.forEach((card, k) => {
      const a = t * 1.6 + (k * Math.PI * 2) / 3;
      card.position.set(rest[k].x + Math.cos(a) * 0.24, TY + Math.max(0, Math.sin(a * 3)) * 0.02, rest[k].z + Math.sin(a) * 0.12);
      card.rotation.y = Math.sin(a) * 0.3;
    });
    floating.rotation.y = t * 1.2;
    floating.position.y = floatAt[1] + Math.sin(t * 2) * 0.04;
    ribbons.forEach((ribbon, k) => (ribbon.rotation.y = (k ? -1 : 1) * t * 0.7));
    light.visible = Math.floor(t * 6) % 31 !== 20;
  });

  return { width: 4.9, height: 4.4, lookY: 1.45 };
}
