import { BoxGeometry, CylinderGeometry, ExtrudeGeometry, Group, Shape, TorusGeometry } from "three";
import { CYAN, INK, MAGENTA, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, skyline } from "@/lib/diorama-props";

/**
 * Diretta (P325): the streamer leaps across a rooftop over the lit towers, mouth wide open for
 * her viewers, the phone up on its stick and three camera drones circling her with magenta eyes;
 * hearts float up from the phone, the ring light glows. She makes so much light and noise that
 * behind her back the hooded Segnato she was chasing climbs over the parapet and gets away.
 */
export function diretta(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const DARK = 0x23222b;
  const F = octagonBase(kit, 0x1b1a24);
  const G = floor(kit, F, 0.06, 0x2a2834, 0x1e1c28, 0.6);

  // The towers beyond, the parapet, an air-conditioning unit with its fan.
  skyline(kit, -1.75, G, 0.1, [0x2a2f4a, 0x3a2a4a, 0x22344a], -1.45, 1.45);
  const parapet = box(3.0, 0.45, 0.18, 0x3a3f4e, -0.15, G, -1.3, { delay: 0.2 });
  decorate(parapet, new BoxGeometry(3.04, 0.05, 0.22), 0x4a5060, [[0, 0.45, 0]]);
  const unit = box(0.7, 0.5, 0.5, 0x5d6680, 1.4, G, -0.6, { delay: 0.3, rotation: [0, -0.2, 0] });
  decorate(unit, new BoxGeometry(0.5, 0.012, 0.01), 0x46506a, [0.12, 0.2, 0.28, 0.36].map((y) => [0, y, 0.251] as Point));
  cylinder(0.2, 0.2, 0.02, 0x14121c, 1.4, G + 0.5, -0.6, { delay: 0.34, flat: true, noInk: true }, 16);
  const fan = add(new BoxGeometry(0.36, 0.02, 0.06), 0x8a93a3, 1.4, G + 0.52, -0.6, { delay: 0.36, noInk: true });
  decorate(fan, new BoxGeometry(0.06, 0.02, 0.36), 0x8a93a3, [[0, 0.01, 0]]);

  // The ring light on its tripod.
  const [rx, rz] = [-1.35, 0.7];
  [0, 2.1, 4.2].forEach((a) => limb(kit, [rx + Math.cos(a) * 0.28, G, rz + Math.sin(a) * 0.28], [rx, G + 0.9, rz], 0.018, 0.014, DARK, { delay: 0.4 }));
  cylinder(0.018, 0.018, 0.65, DARK, rx, G + 0.9, rz, { delay: 0.42 }, 6);
  add(new TorusGeometry(0.22, 0.035, 8, 28), 0xf4f0ff, rx, G + 1.45, rz, { delay: 0.46, flat: true, rotation: [0, 0.9, 0] });

  // The Segnato she was after, slipping over the parapet behind her, his mark glowing.
  const fugitive = figure(kit, {
    x: -1.3,
    z: -1.3,
    y: G + 0.45,
    facing: Math.PI + 0.35,
    height: 2.0,
    build: "slim",
    skin: 0xc49a7a,
    hair: { style: "short", color: 0x1f1b22 },
    headwear: { kind: "hood", color: 0x2a2a3a },
    top: { kind: "hoodie", color: 0x2a2a3a },
    bottom: { kind: "trousers", color: 0x1e1e28 },
    arms: ["out", "back"],
    delay: 0.6,
  });
  const mark = add(new TorusGeometry(0.09, 0.022, 6, 18), MAGENTA, ...fugitive.at(0, 1.4 * (2 / 2.4), -0.25), { delay: 1.0, flat: true, noInk: true, rotation: [0, Math.PI + 0.35, 0] });

  // Diretta, mid-leap, the phone up on its stick.
  const facing = 0.3;
  const H = 2.3;
  const u = H / 2.4;
  const lift = 0.3;
  const streamer = figure(kit, {
    x: 0.35,
    z: 0.3,
    y: G + lift,
    facing,
    height: H,
    build: "slim",
    skin: 0xf0c8a8,
    hair: { style: "bob", color: 0xd82e6c },
    face: { mouth: "open", brows: "raised", eyes: 0x0e5a7a, marks: 0xd08a70 },
    top: { kind: "jacket", color: 0xdcd6f2, accent: 0x9fe8ff },
    bottom: { kind: "trousers", color: 0x1e1e28 },
    shoes: 0x2a2a34,
    belt: 0x1a1a22,
    gloves: 0x1a1a22,
    arms: [[-0.85, 1.9, 0.1], [0.5, 1.95, 0.42]],
    legs: "stride",
    delay: 0.8,
  });
  const body = [...streamer.parts];
  // Space buns, one cyan, one magenta; the backpack straps.
  [-1, 1].forEach((side) => {
    const bun = streamer.at(side * 0.15 * u, 2.14 * u + 0.12, -0.03);
    body.push(ball(0.1, side < 0 ? CYAN : MAGENTA, bun[0], bun[1], bun[2], { delay: 1.25 }));
    body.push(
      add(new CylinderGeometry(0.35 * u * 1.04, 0.3 * u * 1.04, 0.7 * u * 0.94, 2, 1, true, side * 0.42 - 0.09, 0.18).scale(1, 1, 0.72), 0x1a1a22, ...streamer.at(0, 1.04 * u + 0.02, 0), {
        delay: 1.2,
        noInk: true,
        rotation: [0, facing, 0],
      }),
    );
  });
  // The stick and the phone, its camera on her, recording.
  const [, grip] = streamer.hands;
  const phoneAt = streamer.at(0.72, 2.6, 0.78);
  body.push(limb(kit, grip, phoneAt, 0.018, 0.016, DARK, { delay: 1.4 }));
  const phone = box(0.2, 0.34, 0.025, MAGENTA, phoneAt[0], phoneAt[1] - 0.1, phoneAt[2], { delay: 1.45, rotation: [0.2, facing - 0.5, 0] });
  decorate(phone, new BoxGeometry(0.17, 0.3, 0.01), 0x9fe8ff, [[0, 0.17, -0.014]]);
  decorate(phone, new CylinderGeometry(0.025, 0.025, 0.01, 12).rotateX(Math.PI / 2), INK, [
    [-0.05, 0.27, 0.014],
    [-0.05, 0.2, 0.014],
  ]);
  const rec = decorate(phone, new CylinderGeometry(0.018, 0.018, 0.01, 10).rotateX(Math.PI / 2), 0xff2040, [[0.05, 0.27, 0.014]]);
  body.push(phone);
  // Her shadow on the roof: she is in the air.
  const [sx, , sz] = streamer.at(0, 0, 0);
  add(new CylinderGeometry(0.5, 0.5, 0.005, 20).scale(1, 1, 0.6), 0x14121c, sx, G + 0.002, sz, { delay: 0.8, flat: true, noInk: true });

  // Three camera drones circling her.
  const drones = [1.4, 3.5, 5.6].map((start, k) => {
    const parts = [ball(0.12, 0x3a3f4e, 0, 0, 0, { delay: 1.6 + k * 0.08 })];
    decorate(parts[0], new CylinderGeometry(0.05, 0.05, 0.02, 14).rotateX(Math.PI / 2), MAGENTA, [[0, 0.12, 0.112]]);
    [Math.PI / 4, -Math.PI / 4].forEach((a) => parts.push(box(0.5, 0.025, 0.025, DARK, 0, 0.17, 0, { delay: 1.62 + k * 0.08, noInk: true, rotation: [0, a, 0] })));
    const blades = [0, 1, 2, 3].map((r) => {
      const a = Math.PI / 4 + (r * Math.PI) / 2;
      return box(0.2, 0.008, 0.035, CYAN, Math.sin(a) * 0.25, 0.2, Math.cos(a) * 0.25, { delay: 1.66 + k * 0.08, flat: true, noInk: true });
    });
    const group = new Group();
    parts[0].parent?.add(group);
    [...parts, ...blades].forEach((part) => group.add(part));
    return { group, blades, start, height: G + 2.75 + k * 0.18 };
  });

  // Hearts from her viewers, floating up from the phone.
  const heart = () => {
    const s = new Shape();
    s.moveTo(0, 0.3);
    s.bezierCurveTo(0, 0.45, -0.5, 0.5, -0.5, 0.15);
    s.bezierCurveTo(-0.5, -0.15, -0.1, -0.3, 0, -0.5);
    s.bezierCurveTo(0.1, -0.3, 0.5, -0.15, 0.5, 0.15);
    s.bezierCurveTo(0.5, 0.5, 0, 0.45, 0, 0.3);
    return new ExtrudeGeometry(s, { depth: 0.25, bevelEnabled: false, curveSegments: 6 }).scale(0.17, 0.17, 0.17);
  };
  const hearts = [0, 1, 2, 3, 4].map((k) => ({
    part: add(heart(), k % 2 ? MAGENTA : 0xff7aa8, phoneAt[0], phoneAt[1], phoneAt[2], { delay: 1.8 + k * 0.05, flat: true, ink: 1.12, rotation: [0, 0.35, 0] }),
    phase: k / 5,
    drift: (k % 3) - 1,
  }));

  const rest = body.map((part) => part.position.y);
  tick((t) => {
    const bob = Math.sin(t * 2.2) * 0.05;
    body.forEach((part, i) => (part.position.y = rest[i] + bob));
    drones.forEach(({ group, blades, start, height }, k) => {
      const a = start + t * 0.45;
      group.position.set(sx + Math.sin(a) * 1.25, height + Math.sin(t * 2 + k) * 0.06, sz + Math.cos(a) * 1.25);
      group.rotation.y = a + Math.PI;
      blades.forEach((blade, r) => (blade.rotation.y = t * 25 + r));
    });
    hearts.forEach(({ part, phase, drift }) => {
      const s = (t * 0.35 + phase) % 1;
      part.position.set(phoneAt[0] + drift * 0.25 * s + 0.1, phoneAt[1] + s * 0.9, phoneAt[2] + 0.15 * s);
      part.visible = s < 0.9;
    });
    fan.rotation.y = t * 9;
    rec.color.setHex(Math.floor(t * 2) % 2 ? 0x5a1020 : 0xff2040);
    mark.visible = Math.floor(t * 3) % 7 !== 5;
  });

  return { width: 4.9, height: 4.6, lookY: 1.75 };
}
