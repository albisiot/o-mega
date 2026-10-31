import {
  AmbientLight,
  BackSide,
  BoxGeometry,
  BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  DataTexture,
  DirectionalLight,
  Group,
  InstancedMesh,
  Material,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  NearestFilter,
  Object3D,
  OctahedronGeometry,
  PerspectiveCamera,
  PlaneGeometry,
  RedFormat,
  Scene,
  SphereGeometry,
  TorusGeometry,
  WebGLRenderer,
} from "three";
import type { ThreatEnvironment, ThreatScene } from "@/lib/threat-scene";

const POP_SECONDS = 0.45;
const REST_YAW = -0.35;
const FRAME_MS = 1000 / 30;
const FRAME_MARGIN_MS = 4;
const SLOW_FRAME_MS = 66;
const SLOW_FRAMES_LIMIT = 20;

const YELLOW = 0xffd60a;
const ORANGE = 0xff8a00;
const CYAN = 0x16c8ff;
const CREAM = 0xfff8e7;
const GREEN = 0x1d9e75;
const STEEL = 0x4a4f5c;
const DARK = 0x2c2c34;
const TOWER_COLORS = [0x3a4a7a, 0x7a3a6a, 0x2f6f7a, 0x57406f, 0x4a4f5c, 0x6f3a3a, 0x3a6a55];
const TOWER_SLOTS = [
  [-1.9, -0.6],
  [1.9, -0.7],
  [-0.9, -1.1],
  [0.9, -1.2],
  [0, -1.35],
  [-2.35, -1.25],
  [2.35, -1.25],
];

type PartOptions = {
  delay: number;
  rotation?: [number, number, number];
  flat?: boolean;
  noInk?: boolean;
  ink?: number;
  /** A thicker twin for shapes a plain scale can't outline, such as rings. */
  outline?: BufferGeometry;
};
type Part = { group: Group; delay: number };

/** The same threat always gets the same skyline, for both players. */
function seededRandom(text: string): () => number {
  let state = 2166136261;
  for (const char of text) state = Math.imul(state ^ char.charCodeAt(0), 16777619);
  return () => {
    state = Math.imul(state ^ (state >>> 15), 2246822519);
    state = Math.imul(state ^ (state >>> 13), 3266489917);
    return ((state ^= state >>> 16) >>> 0) / 4294967296;
  };
}

function easeOutBack(x: number): number {
  const c = 1.9;
  return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2;
}

/**
 * Draws a threat's comic book diorama on the canvas, rising like a pop-up book.
 * Returns the cleanup function. Throws if WebGL is not available.
 */
export function mountThreatDiorama(
  canvas: HTMLCanvasElement,
  threat: { name: string; level: number; scene: ThreatScene },
  onContextLost: () => void,
): () => void {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new Scene();
  const camera = new PerspectiveCamera(32, 1, 0.1, 100);
  scene.add(new AmbientLight(0xffffff, 1.7));
  const sun = new DirectionalLight(0xffffff, 2.8);
  sun.position.set(4, 8, 5);
  scene.add(sun);

  const toonSteps = new DataTexture(new Uint8Array([90, 170, 255]), 3, 1, RedFormat);
  toonSteps.minFilter = toonSteps.magFilter = NearestFilter;
  toonSteps.needsUpdate = true;

  const geometries: BufferGeometry[] = [];
  const materials: Material[] = [];
  const ink = new MeshBasicMaterial({ color: 0x000000, side: BackSide });
  materials.push(ink);
  const root = new Group();
  scene.add(root);
  const parts: Part[] = [];
  const blinking: Object3D[] = [];
  const spinning: Object3D[] = [];

  function add(geometry: BufferGeometry, color: number, x: number, y: number, z: number, options: PartOptions): Group {
    geometry.computeBoundingBox();
    const lift = -(geometry.boundingBox?.min.y ?? 0);
    geometry.translate(0, lift, 0);
    geometries.push(geometry);
    const group = new Group();
    group.position.set(x, y, z);
    if (options.rotation) group.rotation.set(...options.rotation);
    const material = options.flat
      ? new MeshBasicMaterial({ color })
      : new MeshToonMaterial({ color, gradientMap: toonSteps });
    materials.push(material);
    group.add(new Mesh(geometry, material));
    if (options.outline) {
      options.outline.translate(0, lift, 0);
      geometries.push(options.outline);
      group.add(new Mesh(options.outline, ink));
    } else if (!options.noInk) {
      const outline = new Mesh(geometry, ink);
      const size = options.ink ?? 1.06;
      outline.scale.set(size, 1 + (size - 1) * 0.6, size);
      outline.position.y = -0.02;
      group.add(outline);
    }
    group.scale.setScalar(0.001);
    root.add(group);
    parts.push({ group, delay: options.delay });
    return group;
  }

  const box = (w: number, h: number, d: number, color: number, x: number, y: number, z: number, options: PartOptions) =>
    add(new BoxGeometry(w, h, d), color, x, y, z, options);
  const cylinder = (top: number, bottom: number, h: number, color: number, x: number, y: number, z: number, options: PartOptions) =>
    add(new CylinderGeometry(top, bottom, h, 14), color, x, y, z, options);
  const ball = (radius: number, color: number, x: number, y: number, z: number, options: PartOptions) =>
    add(new SphereGeometry(radius, 18, 14), color, x, y, z, options);
  const cone = (radius: number, h: number, color: number, x: number, y: number, z: number, options: PartOptions) =>
    add(new ConeGeometry(radius, h, 12), color, x, y, z, options);
  const ring = (radius: number, tube: number, color: number, x: number, y: number, z: number, options: PartOptions) =>
    add(new TorusGeometry(radius, tube, 10, 40), color, x, y, z, {
      ...options,
      outline: new TorusGeometry(radius, tube + 0.035, 10, 40),
    });

  /** Something lit: it blinks for the whole scene. */
  function light(part: Group): Group {
    blinking.push(part);
    return part;
  }

  function ground(color: number) {
    box(6, 0.25, 4.3, color, 0, -0.25, 0, { delay: 0, ink: 1.02 });
  }

  function tower(w: number, h: number, color: number, x: number, z: number, random: () => number, options: PartOptions) {
    const group = box(w, h, 0.9, color, x, 0, z, options);
    const rows = Math.floor(h / 0.42);
    const columns = Math.max(1, Math.floor(w / 0.34));
    const lit: [number, number][] = [];
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        if (random() > 0.25) lit.push([(column - (columns - 1) / 2) * 0.32, 0.3 + row * 0.42]);
      }
    }
    const pane = new PlaneGeometry(0.16, 0.2);
    const paneMaterial = new MeshBasicMaterial({ color: random() < 0.5 ? YELLOW : ORANGE });
    geometries.push(pane);
    materials.push(paneMaterial);
    const windows = new InstancedMesh(pane, paneMaterial, lit.length);
    lit.forEach(([wx, wy], i) => windows.setMatrixAt(i, new Matrix4().makeTranslation(wx, wy, 0.46)));
    group.add(windows);
  }

  function robot(x: number, z: number, size: number, delay: number) {
    box(0.26 * size, 0.55 * size, 0.3 * size, 0x4a4f5c, x - 0.22 * size, 0, z, { delay });
    box(0.26 * size, 0.55 * size, 0.3 * size, 0x4a4f5c, x + 0.22 * size, 0, z, { delay });
    box(0.8 * size, 0.8 * size, 0.55 * size, 0xc9ced8, x, 0.55 * size, z, { delay: delay + 0.08 });
    box(0.2 * size, 0.7 * size, 0.22 * size, ORANGE, x - 0.54 * size, 0.65 * size, z, { delay: delay + 0.14 });
    box(0.2 * size, 0.7 * size, 0.22 * size, ORANGE, x + 0.54 * size, 0.65 * size, z, {
      delay: delay + 0.14,
      rotation: [0, 0, 0.9],
    });
    box(0.5 * size, 0.42 * size, 0.45 * size, 0xc9ced8, x, 1.36 * size, z, { delay: delay + 0.2 });
    blinking.push(
      box(0.32 * size, 0.09 * size, 0.05 * size, CYAN, x, 1.54 * size, z + 0.23 * size, {
        delay: delay + 0.26,
        flat: true,
        noInk: true,
      }),
    );
  }

  function golem(x: number, z: number, size: number, delay: number) {
    const stone = 0x8a8a92;
    box(0.36 * size, 0.5 * size, 0.42 * size, 0x6a6a72, x - 0.3 * size, 0, z, { delay });
    box(0.36 * size, 0.5 * size, 0.42 * size, 0x6a6a72, x + 0.3 * size, 0, z, { delay });
    box(1.1 * size, 0.9 * size, 0.7 * size, stone, x, 0.5 * size, z, { delay: delay + 0.08 });
    box(0.34 * size, 0.95 * size, 0.4 * size, 0x6a6a72, x - 0.75 * size, 0.42 * size, z, { delay: delay + 0.14 });
    box(0.34 * size, 0.95 * size, 0.4 * size, 0x6a6a72, x + 0.75 * size, 0.42 * size, z, { delay: delay + 0.14 });
    box(0.5 * size, 0.38 * size, 0.46 * size, stone, x, 1.4 * size, z, { delay: delay + 0.2 });
    blinking.push(
      box(0.34 * size, 0.07 * size, 0.05 * size, ORANGE, x, 1.56 * size, z + 0.24 * size, {
        delay: delay + 0.26,
        flat: true,
        noInk: true,
      }),
    );
  }

  function car(x: number, z: number, delay: number) {
    box(1.5, 0.32, 0.72, ORANGE, x, 0.1, z, { delay, rotation: [0, 0.35, 0] });
    box(0.75, 0.28, 0.6, 0x2c2c34, x - 0.05, 0.42, z, { delay: delay + 0.08, rotation: [0, 0.35, 0] });
    blinking.push(box(0.3, 0.09, 0.2, CYAN, x - 0.05, 0.7, z, { delay: delay + 0.16, flat: true }));
  }

  function figure(x: number, z: number, size: number, delay: number, robe: number, eyes: number) {
    cylinder(0.2 * size, 0.42 * size, 1.05 * size, robe, x, 0, z, { delay });
    ball(0.25 * size, robe, x, 0.95 * size, z, { delay: delay + 0.08 });
    light(
      box(0.3 * size, 0.07 * size, 0.05 * size, eyes, x, 1.2 * size, z + 0.24 * size, {
        delay: delay + 0.16,
        flat: true,
        noInk: true,
      }),
    );
  }

  /** A hooded figure, with two more at its sides for the hardest threats. */
  function figures(robe: number, eyes: number, delay: number) {
    figure(1.25, 1, 1.05, delay, robe, eyes);
    if (threat.level < 5) return;
    figure(0.3, 1.25, 0.85, delay + 0.15, robe, eyes);
    figure(2.1, 0.8, 0.85, delay + 0.25, robe, eyes);
  }

  function witch(delay: number) {
    figure(1.2, 0.9, 1.05, delay, 0x3a6a55, ORANGE);
    cylinder(0.42, 0.42, 0.04, DARK, 1.2, 1.46, 0.9, { delay: delay + 0.2 });
    cone(0.26, 0.6, DARK, 1.2, 1.5, 0.9, { delay: delay + 0.26 });
    ball(0.38, DARK, 0.25, 0, 1.1, { delay: delay + 0.1 });
    light(ball(0.24, GREEN, 0.25, 0.42, 1.1, { delay: delay + 0.3, flat: true, noInk: true }));
  }

  function monster(delay: number) {
    const slime = 0x5aa83c;
    ball(0.95, slime, 0, -0.45, 0.3, { delay });
    [
      [-1.05, 0.55],
      [1.05, -0.55],
      [-0.6, 0.25],
      [0.65, -0.3],
    ].forEach(([x, tilt], i) =>
      cylinder(0.07, 0.17, 1.2 - i * 0.15, slime, x, -0.1, 0.75, { delay: delay + 0.12 + i * 0.07, rotation: [0, 0, tilt] }),
    );
    light(box(0.8, 0.13, 0.05, YELLOW, 0, 0.78, 1.18, { delay: delay + 0.4, flat: true, noInk: true }));
  }

  function drone(delay: number) {
    const height = 1.25;
    box(0.9, 0.3, 0.7, STEEL, 0, height, 0.2, { delay });
    light(box(0.32, 0.1, 0.05, ORANGE, 0, height + 0.08, 0.56, { delay: delay + 0.3, flat: true, noInk: true }));
    box(2.1, 0.07, 0.1, DARK, 0, height + 0.27, 0.2, { delay: delay + 0.08, rotation: [0, 0.7, 0] });
    box(2.1, 0.07, 0.1, DARK, 0, height + 0.27, 0.2, { delay: delay + 0.08, rotation: [0, -0.7, 0] });
    [
      [-0.8, -0.5],
      [0.8, -0.5],
      [-0.8, 0.9],
      [0.8, 0.9],
    ].forEach(([x, z], i) =>
      spinning.push(box(0.75, 0.03, 0.1, CYAN, x, height + 0.36, z, { delay: delay + 0.15 + i * 0.05, flat: true })),
    );
    box(0.08, 0.28, 0.08, DARK, 0, height - 0.24, 0.3, { delay: delay + 0.2 });
  }

  function fortress(delay: number) {
    const height = 0.95;
    cylinder(1.5, 0.55, 0.75, STEEL, 0, height, 0, { delay });
    light(cylinder(0.3, 0.14, 0.2, CYAN, 0, height - 0.17, 0, { delay: delay + 0.1, flat: true, noInk: true }));
    box(2.1, 0.22, 1.5, 0x6a6f7c, 0, height + 0.75, 0, { delay: delay + 0.1 });
    [-0.8, 0, 0.8].forEach((x, i) =>
      box(0.46, 0.5 + (i === 1 ? 0.45 : 0), 0.5, i === 1 ? ORANGE : DARK, x, height + 0.97, -0.25, {
        delay: delay + 0.18 + i * 0.07,
      }),
    );
    box(0.9, 0.07, 0.12, YELLOW, -0.95, height + 1.05, 0.55, { delay: delay + 0.42 });
    box(0.9, 0.07, 0.12, YELLOW, 0.95, height + 1.05, 0.55, { delay: delay + 0.42 });
  }

  function globe(delay: number) {
    cylinder(0.18, 0.3, 0.1, DARK, 0, 0.55, 0.15, { delay });
    ball(0.62, CYAN, 0, 0.65, 0.15, { delay: delay + 0.08 });
    ball(0.26, GREEN, -0.25, 1.05, 0.48, { delay: delay + 0.2, noInk: true });
    ball(0.2, GREEN, 0.3, 0.83, 0.58, { delay: delay + 0.26, noInk: true });
    spinning.push(ring(0.85, 0.035, YELLOW, 0, 0.42, 0.15, { delay: delay + 0.32, rotation: [0.25, 0, 0] }));
  }

  function eclipse(delay: number) {
    ball(1.05, ORANGE, 0, 1.35, -1.55, { delay, flat: true, noInk: true });
    ball(0.92, 0x12121a, 0, 1.48, -1.05, { delay: delay + 0.25, flat: true, noInk: true });
  }

  function flames(delay: number) {
    [
      [-1.35, 0.3, 1],
      [0.5, 0.55, 1.2],
      [1.7, 0.3, 0.85],
      [-0.4, 0.95, 0.8],
      [1.2, 1.1, 0.7],
    ].forEach(([x, z, size], i) => {
      cone(0.38 * size, 1.15 * size, ORANGE, x, 0, z, { delay: delay + i * 0.08 });
      light(cone(0.2 * size, 0.65 * size, YELLOW, x, 0, z + 0.2 * size, { delay: delay + 0.08 + i * 0.08, flat: true, noInk: true }));
    });
  }

  function virus(delay: number) {
    ball(0.62, GREEN, 0, 0.6, 0.6, { delay });
    [0, 1.05, 2.1, 3.15, 4.2, 5.25].forEach((angle, i) =>
      cylinder(0.06, 0.06, 0.45, YELLOW, Math.cos(angle) * 0.55, 1.22 + Math.sin(angle) * 0.55, 0.6, {
        delay: delay + 0.12 + i * 0.05,
        rotation: [0, 0, angle - Math.PI / 2],
      }),
    );
  }

  function core(delay: number) {
    cylinder(0.75, 0.9, 0.3, STEEL, 0, 0, 0.45, { delay });
    light(cylinder(0.42, 0.42, 1.25, ORANGE, 0, 0.3, 0.45, { delay: delay + 0.12, flat: true }));
    [-0.62, 0.62].forEach((x) => box(0.12, 1.35, 0.12, DARK, x, 0.3, 0.45, { delay: delay + 0.2 }));
    cylinder(0.75, 0.6, 0.28, STEEL, 0, 1.55, 0.45, { delay: delay + 0.3 });
  }

  function mirrors(delay: number) {
    [
      [-0.05, 1, 0.5],
      [1, 0.55, -0.15],
      [2.05, 1.05, -0.55],
    ].forEach(([x, z, turn], i) => {
      box(0.95, 1.6, 0.08, DARK, x, 0, z, { delay: delay + i * 0.12, rotation: [0, turn, 0] });
      box(0.78, 1.42, 0.1, CYAN, x, 0.09, z, { delay: delay + 0.08 + i * 0.12, rotation: [0, turn, 0], flat: true, noInk: true });
    });
  }

  function addActor(size: number, delay: number) {
    const actor = threat.scene.actor;
    if (actor === "mirrors") mirrors(delay);
    if (actor === "robot") robot(0, 0.3, size, delay);
    if (actor === "golem") golem(0, 0.3, size, delay);
    if (actor === "car") car(0.2, 0.9, delay);
    if (actor === "ghost") figures(CREAM, CYAN, delay);
    if (actor === "shadow") figures(DARK, YELLOW, delay);
    if (actor === "witch") witch(delay);
    if (actor === "monster") monster(delay);
    if (actor === "drone") drone(delay);
    if (actor === "fortress") fortress(delay);
    if (actor === "globe") globe(delay);
    if (actor === "eclipse") eclipse(delay);
    if (actor === "flames") flames(delay);
    if (actor === "virus") virus(delay);
    if (actor === "core") core(delay);
  }

  function buildCity() {
    const random = seededRandom(threat.name);
    const { level } = threat;
    const leaning = level >= 5;
    ground(0x23232b);
    TOWER_SLOTS.slice(0, Math.min(TOWER_SLOTS.length, level + 2)).forEach(([x, z], i) => {
      const height = 1.1 + level * 0.28 + random() * 1.1;
      const tilt = leaning ? (random() - 0.5) * 0.36 : 0;
      tower(0.8 + random() * 0.25, height, TOWER_COLORS[i], x, z, random, {
        delay: 0.12 + i * 0.09,
        rotation: [0, 0, tilt],
      });
    });
    if (leaning) {
      for (let i = 0; i < 4; i++) {
        box(0.4, 0.28, 0.34, 0x6a6a72, -1.3 + i * 0.85 + random() * 0.3, 0, 1 + random() * 0.6, {
          delay: 0.8 + i * 0.05,
          rotation: [0, random() * 3, 0.3],
        });
      }
    }
    addActor(0.95 + level * 0.07, 0.75);
  }

  function buildPort() {
    ground(0x0f6e96);
    box(2.6, 0.25, 1.7, 0x4a4f5c, -1.5, 0, -0.1, { delay: 0.1 });
    // No magenta here or in the actors: it would vanish against the threat panel.
    const colors = [CREAM, YELLOW, CYAN, ORANGE, 0x1d9e75];
    const stacked = 3 + Math.min(threat.level, 4);
    [
      [-2.3, 0.25, 0.3],
      [-1.6, 0.25, 0.3],
      [-0.9, 0.25, 0.3],
      [-2, 0.67, 0.3],
      [-1.3, 0.67, 0.3],
      [-2, 0.25, -0.35],
      [-1.3, 0.25, -0.35],
    ]
      .slice(0, stacked)
      .forEach(([x, y, z], i) => box(0.62, 0.42, 0.42, colors[i % colors.length], x, y, z, { delay: 0.3 + i * 0.08 }));
    box(0.14, 2.3, 0.14, YELLOW, -0.3, 0.25, -0.5, { delay: 0.8 });
    box(2, 0.14, 0.14, YELLOW, 0.25, 2.45, -0.5, { delay: 0.92 });
    box(0.03, 0.8, 0.03, 0x000000, 0.9, 1.65, -0.5, { delay: 1, noInk: true });
    box(0.5, 0.3, 0.34, ORANGE, 0.9, 1.38, -0.5, { delay: 1.05 });
    box(1.9, 0.5, 0.8, 0x2c2c34, 1.5, 0, 0.8, { delay: 0.55 });
    box(0.7, 0.5, 0.5, CREAM, 1.2, 0.5, 0.8, { delay: 0.65 });
    add(new CylinderGeometry(0.12, 0.12, 0.45, 12), YELLOW, 1.8, 0.5, 0.8, { delay: 0.7 });
    blinking.push(box(0.1, 0.1, 0.1, YELLOW, -0.3, 2.62, -0.5, { delay: 1.1, flat: true, noInk: true }));
  }

  function buildControl() {
    const random = seededRandom(threat.name);
    ground(0x23232b);
    box(5.4, 2.05, 0.3, 0x3a4a7a, 0, 0, -1.5, { delay: 0.08 });
    [-1.7, 0, 1.7].forEach((x, i) => {
      box(1.45, 0.95, 0.1, DARK, x, 0.85, -1.3, { delay: 0.2 + i * 0.08 });
      box(1.25, 0.76, 0.03, i === 1 ? GREEN : CYAN, x, 0.945, -1.24, { delay: 0.28 + i * 0.08, flat: true, noInk: true });
    });
    light(box(0.9, 0.08, 0.03, CREAM, 0, 1.25, -1.21, { delay: 0.5, flat: true, noInk: true }));
    const racks = Math.min(4, 1 + Math.ceil(threat.level / 2));
    for (let i = 0; i < racks; i++) {
      const x = i % 2 ? 2.3 : -2.3;
      const z = -0.55 + Math.floor(i / 2) * 0.85;
      box(0.65, 1.5, 0.65, STEEL, x, 0, z, { delay: 0.45 + i * 0.07 });
      light(box(0.42, 0.07, 0.03, random() < 0.5 ? YELLOW : ORANGE, x, 1.2, z + 0.33, { delay: 0.6 + i * 0.07, flat: true, noInk: true }));
    }
    box(2.3, 0.55, 0.85, 0x57406f, 0, 0, -0.15, { delay: 0.55 });
    addActor(0.95 + threat.level * 0.07, 0.8);
  }

  function buildLab() {
    ground(0x31505c);
    box(5.4, 1.9, 0.25, CREAM, 0, 0, -1.55, { delay: 0.08 });
    [-2.1, -1.35, 1.35, 2.1].forEach((x, i) => {
      cylinder(0.33, 0.33, 1.25, CYAN, x, 0.14, -0.85, { delay: 0.2 + i * 0.08 });
      cylinder(0.38, 0.38, 0.14, DARK, x, 0, -0.85, { delay: 0.14 + i * 0.08 });
      cylinder(0.38, 0.38, 0.14, DARK, x, 1.39, -0.85, { delay: 0.3 + i * 0.08 });
    });
    box(1.5, 0.5, 0.6, STEEL, -1.75, 0, 0.75, { delay: 0.55 });
    cone(0.18, 0.42, YELLOW, -2.1, 0.5, 0.75, { delay: 0.65 });
    cone(0.16, 0.36, GREEN, -1.45, 0.5, 0.75, { delay: 0.7 });
    addActor(1, 0.8);
  }

  function buildRitual() {
    ground(0x2a1f44);
    cylinder(1.3, 1.3, 0.03, 0x6d3fb0, 0, 0, 0.2, { delay: 0.12, flat: true, noInk: true });
    const stones = Math.min(8, threat.level + 3);
    for (let i = 0; i < stones; i++) {
      // The arc is open towards the camera, so the altar stays in view.
      const angle = Math.PI * (0.95 + (1.1 * i) / (stones - 1));
      const x = Math.cos(angle) * 2.15;
      const z = 0.2 + Math.sin(angle) * 1.55;
      box(0.46, 1.05 + (i % 2) * 0.45, 0.32, 0x77778a, x, 0, z, { delay: 0.2 + i * 0.07, rotation: [0, -angle, i % 3 ? 0.05 : -0.07] });
    }
    box(1, 0.42, 0.6, 0x4a3a66, 0, 0, 0.3, { delay: 0.65 });
    [-0.36, 0.36].forEach((x, i) => {
      cylinder(0.05, 0.05, 0.22, CREAM, x, 0.42, 0.3, { delay: 0.75 + i * 0.05 });
      light(cone(0.05, 0.14, YELLOW, x, 0.64, 0.3, { delay: 0.8 + i * 0.05, flat: true, noInk: true }));
    });
    if (threat.scene.actor) addActor(0.95 + threat.level * 0.07, 0.85);
    else light(add(new OctahedronGeometry(0.22), CYAN, 0, 0.5, 0.3, { delay: 0.9 }));
  }

  function buildMind() {
    ground(0x1f1f33);
    cylinder(0.65, 0.85, 0.28, STEEL, 0, 0, 0, { delay: 0.1 });
    ball(0.88, CREAM, 0, 0.5, 0, { delay: 0.22 });
    ball(0.42, CYAN, 0, 0.96, 0.58, { delay: 0.38, noInk: true });
    light(ball(0.2, 0x12121a, 0, 1.18, 0.86, { delay: 0.45, flat: true, noInk: true }));
    spinning.push(ring(1.25, 0.045, YELLOW, 0, 0.13, 0, { delay: 0.55, rotation: [0.35, 0, 0] }));
    spinning.push(ring(1.5, 0.035, ORANGE, 0, -0.12, 0, { delay: 0.65, rotation: [-0.25, 0, 0] }));
    const orbs = threat.level + 1;
    for (let i = 0; i < orbs; i++) {
      const angle = (i / orbs) * Math.PI * 2;
      ball(0.15, CYAN, Math.cos(angle) * 2.15, 0.25 + (i % 3) * 0.5, Math.sin(angle) * 1.3, { delay: 0.75 + i * 0.05 });
    }
  }

  function buildMuseum() {
    ground(STEEL);
    box(4.8, 0.14, 2.4, 0xc9c2ae, 0, 0, -0.75, { delay: 0.08 });
    [-2, -0.67, 0.67, 2].forEach((x, i) => cylinder(0.2, 0.25, 1.85, CREAM, x, 0.14, -1.25, { delay: 0.18 + i * 0.07 }));
    box(4.9, 0.22, 0.75, CREAM, 0, 1.99, -1.25, { delay: 0.5 });
    box(3.4, 0.28, 0.6, YELLOW, 0, 2.21, -1.25, { delay: 0.6 });
    box(0.55, 0.8, 0.55, 0x7a3a6a, -1.25, 0.14, 0.15, { delay: 0.65 });
    light(add(new OctahedronGeometry(0.26), CYAN, -1.25, 0.94, 0.15, { delay: 0.8 }));
    addActor(1, 0.85);
  }

  function buildSky() {
    const random = seededRandom(threat.name);
    [
      [-1.9, 0.55],
      [-0.8, 0.85],
      [0.5, 0.95],
      [1.75, 0.6],
    ].forEach(([x, radius], i) =>
      ball(radius, CREAM, x, -0.65 + random() * 0.2, (i % 2) * 0.8 - 0.45, { delay: i * 0.08 }),
    );
    const bolts = threat.scene.actor ? 1 : 3;
    for (let i = 0; i < bolts; i++) {
      const x = bolts === 1 ? -2.15 : -1.7 + i * 1.7;
      const top = 1.5 + (i % 2) * 0.45;
      light(box(0.1, 0.72, 0.08, YELLOW, x, top, 0.2, { delay: 0.45 + i * 0.1, flat: true, rotation: [0, 0, 0.45] }));
      light(box(0.1, 0.72, 0.08, YELLOW, x - 0.3, top - 0.55, 0.2, { delay: 0.5 + i * 0.1, flat: true, rotation: [0, 0, -0.35] }));
    }
    addActor(1, 0.45);
  }

  function buildRail() {
    const armoured = threat.level >= 3;
    ground(0x3b3f4c);
    for (let i = 0; i < 9; i++) box(0.2, 0.05, 1.05, 0x5c4630, -2.6 + i * 0.65, 0, 0.75, { delay: 0.08 + i * 0.03, noInk: true });
    [0.4, 1.1].forEach((z, i) => box(5.6, 0.07, 0.07, 0xc9ced8, 0, 0.05, z, { delay: 0.35 + i * 0.04, noInk: true }));
    box(0.5, 2, 0.8, 0x5c4f46, -2.5, 0, -0.75, { delay: 0.15 });
    box(0.5, 2, 0.8, 0x5c4f46, 2.5, 0, -0.75, { delay: 0.2 });
    box(5.5, 0.5, 0.8, 0x5c4f46, 0, 2, -0.75, { delay: 0.28 });
    const body = armoured ? 0x6a6f7c : CYAN;
    [-1.55, 0.2, 1.95].forEach((x, i) => {
      box(1.68, 0.92, 0.9, body, x, 0.1, 0.75, { delay: 0.5 + i * 0.12 });
      box(1.68, 0.13, 0.91, armoured ? YELLOW : CREAM, x, 0.42, 0.75, { delay: 0.56 + i * 0.12, noInk: true });
    });
    light(box(0.15, 0.15, 0.05, YELLOW, 2.75, 0.5, 1.1, { delay: 0.9, flat: true, noInk: true }));
    if (!armoured) {
      box(0.4, 0.8, 0.3, DARK, -2.2, 0, 1.65, { delay: 0.95 });
      light(box(0.3, 0.2, 0.03, GREEN, -2.2, 0.52, 1.81, { delay: 1, flat: true, noInk: true }));
    }
  }

  function buildSewer() {
    ground(0x3a3f36);
    box(5.6, 2, 0.3, 0x5c4f46, 0, 0, -1.55, { delay: 0.08 });
    [-1.8, 1.8].forEach((x, i) => {
      add(new CylinderGeometry(0.42, 0.42, 0.75, 16), 0x6a6f7c, x, 0.6, -1.45, { delay: 0.2 + i * 0.1, rotation: [Math.PI / 2, 0, 0] });
    });
    box(5.6, 0.04, 2.5, 0x6dbb3c, 0, 0, 0.45, { delay: 0.3, flat: true, noInk: true });
    addActor(1, 0.6);
  }

  function buildSwamp() {
    const trunk = 0x4a3524;
    ground(0x225c44);
    box(4.6, 0.04, 2.6, 0x3a8f60, -0.2, 0, 0.35, { delay: 0.14, flat: true, noInk: true });
    [
      [-2.1, -0.9, 1.9],
      [-0.7, -1.3, 2.3],
      [1.9, -1.05, 1.75],
    ].forEach(([x, z, height], i) => {
      cylinder(0.08, 0.2, height, trunk, x, 0, z, { delay: 0.22 + i * 0.1 });
      box(0.75, 0.08, 0.08, trunk, x + 0.28, height * 0.62, z, { delay: 0.34 + i * 0.1, rotation: [0, 0, 0.55] });
      box(0.6, 0.08, 0.08, trunk, x - 0.22, height * 0.45, z, { delay: 0.38 + i * 0.1, rotation: [0, 0, -0.55] });
    });
    addActor(1, 0.6);
  }

  function buildPrison() {
    ground(STEEL);
    box(5.6, 1.5, 0.45, 0x8a8a92, 0, 0, -1.3, { delay: 0.08 });
    box(1.8, 1.15, 0.2, 0x23232b, -0.9, 0.1, -1.03, { delay: 0.2, noInk: true });
    for (let i = 0; i < 7; i++) box(0.07, 1.15, 0.07, CREAM, -1.68 + i * 0.26, 0.1, -0.9, { delay: 0.25 + i * 0.03, noInk: true });
    box(0.85, 2.1, 0.85, 0x6a6a72, 2.15, 0, -1, { delay: 0.35 });
    box(1.15, 0.2, 1.15, DARK, 2.15, 2.1, -1, { delay: 0.5 });
    light(cone(0.2, 0.3, YELLOW, 2.15, 2.3, -1, { delay: 0.6, flat: true }));
    for (let i = 0; i < 4; i++) figure(-1.5 + i * 1, 0.7 + (i % 2) * 0.45, 0.72, 0.68 + i * 0.1, ORANGE, CREAM);
  }

  function buildBattlefield() {
    const random = seededRandom(threat.name);
    ground(0x3b3330);
    [
      [-1.6, -0.9, 0.85],
      [1.45, -1.1, 1.25],
    ].forEach(([x, z, height], i) =>
      box(0.95, height, 0.7, 0x6a6a72, x, 0, z, { delay: 0.15 + i * 0.1, rotation: [0, random(), i ? -0.1 : 0.12] }),
    );
    box(0.08, 2.4, 0.08, DARK, 0, 0, -1, { delay: 0.35 });
    box(0.85, 0.5, 0.06, ORANGE, 0.46, 1.85, -1, { delay: 0.45 });
    const perSide = threat.level >= 6 ? 3 : 2;
    for (let i = 0; i < perSide; i++) {
      figure(-2.2 + i * 0.68, 0.45 + (i % 2) * 0.55, 0.72, 0.55 + i * 0.1, DARK, ORANGE);
      figure(2.2 - i * 0.68, 0.45 + (i % 2) * 0.55, 0.72, 0.6 + i * 0.1, CYAN, CREAM);
    }
    for (let i = 0; i < 4; i++) {
      box(0.32, 0.22, 0.28, 0x6a6a72, -1 + i * 0.68, 0, 1.45 - (i % 2) * 0.3, { delay: 0.85 + i * 0.05, rotation: [0, random() * 3, 0.25] });
    }
  }

  function buildRift() {
    const random = seededRandom(threat.name);
    ground(0x1a1530);
    box(2.8, 0.22, 1.1, STEEL, 0, 0, -0.4, { delay: 0.12 });
    const portal = new SphereGeometry(1, 24, 18);
    portal.scale(1, 1.2, 0.05);
    light(add(portal, 0x6d3fb0, 0, 0.42, -0.4, { delay: 0.3, flat: true, noInk: true }));
    add(new TorusGeometry(1.08, 0.13, 12, 40), CYAN, 0, 0.32, -0.4, {
      delay: 0.42,
      outline: new TorusGeometry(1.08, 0.17, 12, 40),
    });
    const shards = threat.level + 2;
    for (let i = 0; i < shards; i++) {
      const left = i % 2 ? 1 : -1;
      spinning.push(
        add(new OctahedronGeometry(0.15 + random() * 0.12), i % 3 ? YELLOW : ORANGE, left * (1.6 + random() * 0.9), 0.35 + random() * 1.7, -0.7 + random() * 1.4, {
          delay: 0.6 + i * 0.06,
        }),
      );
    }
    addActor(1, 0.95);
  }

  const BUILDERS: Record<ThreatEnvironment, () => void> = {
    city: buildCity,
    port: buildPort,
    control: buildControl,
    lab: buildLab,
    ritual: buildRitual,
    mind: buildMind,
    museum: buildMuseum,
    sky: buildSky,
    rail: buildRail,
    sewer: buildSewer,
    swamp: buildSwamp,
    prison: buildPrison,
    battlefield: buildBattlefield,
    rift: buildRift,
  };
  BUILDERS[threat.scene.environment]();

  const distance = threat.level >= 5 ? 10 : 9.2;
  camera.position.set(0, distance * 0.34, distance);
  camera.lookAt(0, threat.level >= 5 ? 1.2 : 0.75, 0);

  const resize = () => {
    const { clientWidth, clientHeight } = canvas;
    if (!clientWidth || !clientHeight) return;
    renderer.setSize(clientWidth, clientHeight, false);
    camera.aspect = clientWidth / clientHeight;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  let yaw = REST_YAW;
  let targetYaw = REST_YAW;
  let dragX: number | null = null;
  const onDown = (event: PointerEvent) => {
    dragX = event.clientX;
    canvas.setPointerCapture(event.pointerId);
  };
  const onMove = (event: PointerEvent) => {
    if (dragX === null) return;
    targetYaw += (event.clientX - dragX) * 0.012;
    dragX = event.clientX;
  };
  const onUp = () => {
    dragX = null;
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);

  const shakes = threat.level >= 5;
  let frame = 0;
  let start = 0;
  let previous = 0;
  let slowFrames = 0;
  const popMs = (Math.max(...parts.map((part) => part.delay)) + POP_SECONDS) * 1000;

  function draw(now: number, settled: boolean) {
    const elapsed = (now - start) / 1000;
    for (const { group, delay } of parts) {
      const x = settled ? 1 : Math.min(1, Math.max(0, (elapsed - delay) / POP_SECONDS));
      const eased = x >= 1 ? 1 : easeOutBack(x);
      const wide = 1 - (1 - eased) * 0.5;
      group.scale.set(Math.max(0.001, wide), Math.max(0.001, eased), Math.max(0.001, wide));
    }
    if (!settled) {
      for (const part of blinking) part.visible = Math.sin(now * 0.012) > -0.6;
      for (const part of spinning) part.rotation.y = now * 0.0014;
      root.position.x = shakes && elapsed > 1.2 ? Math.sin(now * 0.05) * 0.012 : 0;
      if (dragX === null) targetYaw += (REST_YAW + Math.sin(now * 0.0006) * 0.22 - targetYaw) * 0.02;
    }
    yaw += (targetYaw - yaw) * 0.12;
    root.rotation.y = yaw;
    renderer.render(scene, camera);
  }

  function loop(now: number) {
    frame = requestAnimationFrame(loop);
    const delta = now - previous;
    // Full display rate while something moves on purpose, half rate at rest.
    // The margin stops a 60 Hz display from skipping frames irregularly.
    const atRest = now - start > popMs && dragX === null;
    if (atRest && delta < FRAME_MS - FRAME_MARGIN_MS) return;
    previous = now;
    // Too slow for this phone: stop on the finished scene, keep the battery.
    // Long gaps are a hidden tab, not a slow device.
    slowFrames = delta > SLOW_FRAME_MS && delta < 500 ? slowFrames + 1 : 0;
    if (slowFrames >= SLOW_FRAMES_LIMIT) {
      cancelAnimationFrame(frame);
      draw(now, true);
      return;
    }
    draw(now, false);
  }

  const onLost = (event: Event) => {
    event.preventDefault();
    onContextLost();
  };
  canvas.addEventListener("webglcontextlost", onLost);

  start = previous = performance.now();
  // Without the animation loop, a static scene is redrawn only when it changes size.
  const still = reduced ? new ResizeObserver(() => draw(start, true)) : null;
  if (still) still.observe(canvas);
  else frame = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    still?.disconnect();
    canvas.removeEventListener("pointerdown", onDown);
    canvas.removeEventListener("pointermove", onMove);
    canvas.removeEventListener("pointerup", onUp);
    canvas.removeEventListener("pointercancel", onUp);
    canvas.removeEventListener("webglcontextlost", onLost);
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    toonSteps.dispose();
    renderer.dispose();
    // iOS allows few live WebGL contexts: a match opens one for each round.
    renderer.forceContextLoss();
  };
}
