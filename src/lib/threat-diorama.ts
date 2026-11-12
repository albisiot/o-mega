import {
  AmbientLight,
  BackSide,
  BoxGeometry,
  BufferGeometry,
  Color,
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
  Vector3,
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
const SAND = 0xe2b25e;
const STONE = 0xa89a7c;
const BRONZE = 0xc8752e;
const SNOW = 0xeef7fb;
const ICE = 0xa6dcef;
const VERMILION = 0xe4572e;
const BLOSSOM = 0xffcad6;
const LEAF = 0x2f8f4f;
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
const LAVA = 0xff5a1f;
const NIGHT = 0x12142a;
const VIOLET = 0x9b5cff;
const BLOOD = 0x8a1a1a;
const PAPER = 0xfaf3df;
const ROCK = 0x6e625a;
const PATINA = 0x4f8f7a;
const TILE = 0xc96a3e;

/** A stroke of a letter, in a unit square: from (x1, y1) to (x2, y2). */
type Stroke = [number, number, number, number];
/** The Alfabeto: the 24 Greek letters, drawn with straight strokes like a stone carver's. */
const GLYPHS: Stroke[][] = [
  [[0, 0, 0.5, 1], [0.5, 1, 1, 0], [0.25, 0.45, 0.75, 0.45]], // alpha
  [[0, 0, 0, 1], [0, 1, 0.75, 1], [0.75, 1, 0.75, 0.5], [0, 0.5, 1, 0.5], [1, 0.5, 1, 0], [0, 0, 1, 0]], // beta
  [[0, 0, 0, 1], [0, 1, 1, 1]], // gamma
  [[0, 0, 0.5, 1], [0.5, 1, 1, 0], [0, 0, 1, 0]], // delta
  [[0, 0, 0, 1], [0, 1, 1, 1], [0, 0.5, 0.75, 0.5], [0, 0, 1, 0]], // epsilon
  [[0, 1, 1, 1], [1, 1, 0, 0], [0, 0, 1, 0]], // zeta
  [[0, 0, 0, 1], [1, 0, 1, 1], [0, 0.5, 1, 0.5]], // eta
  [[0, 0, 0, 1], [1, 0, 1, 1], [0, 1, 1, 1], [0, 0, 1, 0], [0.3, 0.5, 0.7, 0.5]], // theta
  [[0.5, 0, 0.5, 1]], // iota
  [[0, 0, 0, 1], [0, 0.5, 1, 1], [0, 0.5, 1, 0]], // kappa
  [[0, 0, 0.5, 1], [0.5, 1, 1, 0]], // lambda
  [[0, 0, 0, 1], [0, 1, 0.5, 0.4], [0.5, 0.4, 1, 1], [1, 1, 1, 0]], // mu
  [[0, 0, 0, 1], [0, 1, 1, 0], [1, 0, 1, 1]], // nu
  [[0, 1, 1, 1], [0.2, 0.5, 0.8, 0.5], [0, 0, 1, 0]], // xi
  [[0, 0, 0, 1], [1, 0, 1, 1], [0, 1, 1, 1], [0, 0, 1, 0]], // omicron
  [[0, 0, 0, 1], [1, 0, 1, 1], [0, 1, 1, 1]], // pi
  [[0, 0, 0, 1], [0, 1, 1, 1], [1, 1, 1, 0.5], [0, 0.5, 1, 0.5]], // rho
  [[0, 1, 1, 1], [0, 1, 0.55, 0.5], [0.55, 0.5, 0, 0], [0, 0, 1, 0]], // sigma
  [[0, 1, 1, 1], [0.5, 0, 0.5, 1]], // tau
  [[0, 1, 0.5, 0.5], [1, 1, 0.5, 0.5], [0.5, 0, 0.5, 0.5]], // upsilon
  [[0.5, 0, 0.5, 1], [0.1, 0.25, 0.1, 0.75], [0.9, 0.25, 0.9, 0.75], [0.1, 0.75, 0.9, 0.75], [0.1, 0.25, 0.9, 0.25]], // phi
  [[0, 0, 1, 1], [0, 1, 1, 0]], // chi
  [[0.5, 0, 0.5, 1], [0, 1, 0, 0.45], [1, 1, 1, 0.45], [0, 0.45, 1, 0.45]], // psi
  [[0, 0, 0.35, 0], [0.65, 0, 1, 0], [0.3, 0, 0.1, 0.55], [0.7, 0, 0.9, 0.55], [0.1, 0.55, 0.3, 1], [0.9, 0.55, 0.7, 1], [0.3, 1, 0.7, 1]], // omega
];
/** The letter no one has ever read: it belongs to no alphabet. */
const UNKNOWN_GLYPH: Stroke[] = [[0.5, 0, 0.5, 1], [0, 1, 1, 1], [0, 0.15, 0.5, 0.6], [1, 0.15, 0.5, 0.6], [0.15, 0.8, 0.15, 0.55], [0.85, 0.8, 0.85, 0.55]];

/** A repeatable 0..1 value for step n: the same jolts on every phone. */
function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** The photographic negative of a colour. */
function negative(color: number): number {
  return 0xffffff - color;
}

/** A colour darkened (k < 1) or lightened towards white (k > 1). */
function shade(color: number, k: number): number {
  const channel = (shift: number) => {
    const c = (color >> shift) & 0xff;
    const value = k <= 1 ? c * k : c + (255 - c) * (k - 1);
    return Math.max(0, Math.min(255, Math.round(value))) << shift;
  };
  return channel(16) | channel(8) | channel(0);
}

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
/** Sand, snow, bubbles or petals: one instanced mesh that drifts and wraps around the scene. */
type Drift = {
  mesh: InstancedMesh;
  /** x, y, z of each particle at the start. */
  start: Float32Array;
  speed: Float32Array;
  vx: number;
  vy: number;
  bottom: number;
  top: number;
  delay: number;
};
type Bob = { group: Group; base: number; height: number; speed: number };

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
 * A Grande Minaccia's fronts: a row of beacons along the front edge. `colors` is read on
 * every frame: a colour lights a beacon, null leaves it dark.
 */
export type BossBeacons = { count: number; colors: () => readonly (number | null)[] };

/**
 * Draws a threat's comic book diorama on the canvas, rising like a pop-up book.
 * With `beacons` it is a boss's, with one beacon per front. Returns the cleanup
 * function. Throws if WebGL is not available.
 */
export function mountThreatDiorama(
  canvas: HTMLCanvasElement,
  threat: { name: string; level: number; scene: ThreatScene; beacons?: BossBeacons },
  onContextLost: () => void,
): () => void {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Levels go up to 12, but sizes and counts stop growing at 6: past that the
  // scene would only get heavier on a phone. Scenes that want to show more read
  // threat.level themselves, with their own cap.
  const level = Math.min(threat.level, 6);
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
  const drifting: Drift[] = [];
  const bobbing: Bob[] = [];
  /** Per-frame motion of the scenes that need more than blinking, spinning or bobbing; seconds since the start. */
  const tickers: ((elapsed: number) => void)[] = [];
  /** A scene that needs another framing sets it here. */
  const view: { distance?: number; height?: number; lookY?: number } = {};
  const matrix = new Matrix4();

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

  /** A building with lit windows; returns the windows, so a scene can switch them. */
  function tower(
    w: number,
    h: number,
    color: number,
    x: number,
    z: number,
    random: () => number,
    options: PartOptions,
    paneColor?: number,
    y = 0,
  ): InstancedMesh {
    const group = box(w, h, 0.9, color, x, y, z, options);
    const rows = Math.floor(h / 0.42);
    const columns = Math.max(1, Math.floor(w / 0.34));
    const lit: [number, number][] = [];
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        if (random() > 0.25) lit.push([(column - (columns - 1) / 2) * 0.32, 0.3 + row * 0.42]);
      }
    }
    const pane = new PlaneGeometry(0.16, 0.2);
    const pick = random() < 0.5 ? YELLOW : ORANGE;
    const paneMaterial = new MeshBasicMaterial({ color: paneColor ?? pick });
    geometries.push(pane);
    materials.push(paneMaterial);
    const windows = new InstancedMesh(pane, paneMaterial, lit.length);
    lit.forEach(([wx, wy], i) => windows.setMatrixAt(i, new Matrix4().makeTranslation(wx, wy, 0.46)));
    group.add(windows);
    return windows;
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
    if (level < 5) return;
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
    if (actor === "trap") trap(delay);
    if (actor === "mummy") mummy(delay);
    if (actor === "sphinx") sphinx(delay);
    if (actor === "ballgame") ballgame(delay);
    if (actor === "calendar") calendar(delay);
    if (actor === "serpent") serpent(delay);
    if (actor === "song") song(delay);
    if (actor === "guardian") guardian(delay);
    if (actor === "temple") temple(delay);
    if (actor === "hut") hut(delay);
    if (actor === "base") base(delay);
    if (actor === "beast") beast(delay);
    if (actor === "swordsman") swordsman(delay);
    if (actor === "fox") fox(delay);
    if (actor === "kaiju") kaiju(delay);
    if (actor === "brokenmirrors") brokenMirrors(delay);
    if (actor === "swarm") swarm(delay);
    if (actor === "blackout") blackout(delay);
    if (actor === "boxing") boxing(delay);
    if (actor === "tide") tide(delay);
    if (actor === "colossus") colossus(delay);
    if (actor === "giant") giant(delay);
    if (actor === "minotaur") minotaur(delay);
    if (actor === "letter") letter(delay);
    if (actor === "alphabet") alphabet(delay);
    if (actor === "echoes") echoes(delay);
    if (actor === "ship") ship(delay);
    if (actor === "flock") flock(delay);
    if (actor === "zero") zero(delay);
    if (actor === "thirteen") thirteen(delay);
  }

  function buildCity() {
    const random = seededRandom(threat.name);
    const leaning = level >= 5;
    // In a blackout the city is a dark block whose windows come back in jolts.
    const dark = threat.scene.actor === "blackout";
    ground(0x23232b);
    if (dark) box(6.4, 4.2, 0.08, NIGHT, 0, 0, -2.1, { delay: 0.04, flat: true });
    TOWER_SLOTS.slice(0, Math.min(TOWER_SLOTS.length, level + 2)).forEach(([x, z], i) => {
      const height = 1.1 + level * 0.28 + random() * 1.1;
      const tilt = leaning ? (random() - 0.5) * 0.36 : 0;
      const windows = tower(
        0.8 + random() * 0.25,
        height,
        dark ? shade(TOWER_COLORS[i], 0.45) : TOWER_COLORS[i],
        x,
        z,
        random,
        { delay: 0.12 + i * 0.09, rotation: [0, 0, tilt] },
        dark ? YELLOW : undefined,
      );
      if (dark) jolt(windows, i);
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
    const stacked = 3 + Math.min(level, 4);
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
    // The ship leaves the water to the threat, when there is one.
    if (!threat.scene.actor) {
      box(1.9, 0.5, 0.8, 0x2c2c34, 1.5, 0, 0.8, { delay: 0.55 });
      box(0.7, 0.5, 0.5, CREAM, 1.2, 0.5, 0.8, { delay: 0.65 });
      add(new CylinderGeometry(0.12, 0.12, 0.45, 12), YELLOW, 1.8, 0.5, 0.8, { delay: 0.7 });
    }
    blinking.push(box(0.1, 0.1, 0.1, YELLOW, -0.3, 2.62, -0.5, { delay: 1.1, flat: true, noInk: true }));
    addActor(1, 0.6);
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
    const racks = Math.min(4, 1 + Math.ceil(level / 2));
    for (let i = 0; i < racks; i++) {
      const x = i % 2 ? 2.3 : -2.3;
      const z = -0.55 + Math.floor(i / 2) * 0.85;
      box(0.65, 1.5, 0.65, STEEL, x, 0, z, { delay: 0.45 + i * 0.07 });
      light(box(0.42, 0.07, 0.03, random() < 0.5 ? YELLOW : ORANGE, x, 1.2, z + 0.33, { delay: 0.6 + i * 0.07, flat: true, noInk: true }));
    }
    box(2.3, 0.55, 0.85, 0x57406f, 0, 0, -0.15, { delay: 0.55 });
    addActor(0.95 + level * 0.07, 0.8);
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
    const stones = Math.min(8, level + 3);
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
    if (threat.scene.actor) addActor(0.95 + level * 0.07, 0.85);
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
    const orbs = level + 1;
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
    const armoured = level >= 3;
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
    const perSide = level >= 6 ? 3 : 2;
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
    const shards = level + 2;
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

  // ---------------------------------------------------------------------------
  // The places beyond Nuova Megara
  // ---------------------------------------------------------------------------

  /** Particles that drift across the scene: they wrap around, so the flow never stops. */
  function drift(
    count: number,
    color: number,
    size: number,
    motion: { vx: number; vy: number; bottom: number; top: number; delay: number },
  ) {
    const geometry = new OctahedronGeometry(size);
    const material = new MeshBasicMaterial({ color });
    geometries.push(geometry);
    materials.push(material);
    const mesh = new InstancedMesh(geometry, material, count);
    const random = seededRandom(`${threat.name}:${color}`);
    const start = new Float32Array(count * 3);
    const speed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      start[i * 3] = -2.9 + random() * 5.8;
      start[i * 3 + 1] = motion.bottom + random() * (motion.top - motion.bottom);
      start[i * 3 + 2] = -1.7 + random() * 3.6;
      speed[i] = 0.6 + random() * 0.8;
      mesh.setMatrixAt(i, matrix.makeTranslation(start[i * 3], start[i * 3 + 1], start[i * 3 + 2]));
    }
    mesh.visible = false;
    root.add(mesh);
    drifting.push({ mesh, start, speed, ...motion });
  }

  function placeDrift(item: Drift, elapsed: number) {
    const t = Math.max(0, elapsed - item.delay);
    const height = item.top - item.bottom;
    for (let i = 0; i < item.speed.length; i++) {
      const s = item.speed[i];
      const x = item.start[i * 3] + item.vx * s * t + Math.sin(t * 1.3 + i) * 0.08;
      const y = item.start[i * 3 + 1] + item.vy * s * t;
      const wrappedX = ((((x + 2.9) % 5.8) + 5.8) % 5.8) - 2.9;
      const wrappedY = item.bottom + ((((y - item.bottom) % height) + height) % height);
      item.mesh.setMatrixAt(i, matrix.makeTranslation(wrappedX, wrappedY, item.start[i * 3 + 2]));
    }
    item.mesh.instanceMatrix.needsUpdate = true;
  }

  /** Something that hops or floats in place. */
  function bob(part: Group, height: number, speed = 0.004): Group {
    bobbing.push({ group: part, base: part.position.y, height, speed });
    return part;
  }

  /** A square pyramid: a four-sided cone turned to face the camera with an edge. */
  function pyramid(radius: number, height: number, color: number, x: number, z: number, delay: number): Group {
    return add(new ConeGeometry(radius, height, 4), color, x, 0, z, { delay, rotation: [0, Math.PI / 4, 0] });
  }

  /** Small details stuck to a part, so they pop and turn with it. */
  function decorate(part: Group, geometry: BufferGeometry, color: number, spots: [number, number, number][]) {
    const material = new MeshBasicMaterial({ color });
    geometries.push(geometry);
    materials.push(material);
    for (const [x, y, z] of spots) {
      const mesh = new Mesh(geometry, material);
      mesh.position.set(x, y, z);
      part.add(mesh);
    }
  }

  function palm(x: number, z: number, height: number, delay: number) {
    const lean = x > 0 ? -0.12 : 0.12;
    cylinder(0.07, 0.11, height, 0x8a6236, x, 0, z, { delay, rotation: [0, 0, lean] });
    const top = x - Math.sin(lean) * height;
    [0, 1.25, 2.5, 3.75, 5].forEach((angle, i) =>
      box(0.7, 0.05, 0.2, LEAF, top + Math.cos(angle) * 0.28, height - 0.05, z + Math.sin(angle) * 0.28, {
        delay: delay + 0.1 + i * 0.03,
        rotation: [0, -angle, -0.35],
      }),
    );
  }

  function bushyTree(x: number, z: number, height: number, canopy: number, delay: number) {
    cylinder(0.08, 0.14, height, 0x5c3f24, x, 0, z, { delay });
    ball(0.42, canopy, x, height - 0.15, z, { delay: delay + 0.08 });
    ball(0.3, canopy, x + 0.3, height - 0.3, z + 0.12, { delay: delay + 0.12 });
    ball(0.28, canopy, x - 0.28, height - 0.25, z - 0.08, { delay: delay + 0.16 });
  }

  // Giza ----------------------------------------------------------------------

  function buildDesert() {
    ground(0xc9963f);
    ball(1.05, ORANGE, 1.6, 1.15, -2, { delay: 0.05, flat: true, noInk: true });
    const dune = (x: number, z: number, radius: number, delay: number) => {
      const geometry = new SphereGeometry(radius, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2);
      geometry.scale(1.6, 0.6, 1);
      add(geometry, SAND, x, 0, z, { delay });
    };
    dune(-2.1, 1.2, 0.7, 0.1);
    dune(2.3, 1.35, 0.55, 0.14);
    pyramid(1.55, 2.15, SAND, -1.15, -1.1, 0.16);
    pyramid(1.05, 1.45, 0xd7a650, 1.25, -1.25, 0.24);
    pyramid(0.55, 0.75, 0xd7a650, 2.35, -0.55, 0.3);
    // Gold capstone and the dark doorway of the great pyramid.
    add(new ConeGeometry(0.22, 0.3, 4), YELLOW, -1.15, 1.88, -1.1, { delay: 0.5, rotation: [0, Math.PI / 4, 0] });
    box(0.36, 0.42, 0.1, 0x3a2a18, -1.15, 0.05, -0.05, { delay: 0.55, noInk: true });
    box(0.16, 1.5, 0.16, 0xd7a650, -2.45, 0, 0.35, { delay: 0.4 });
    add(new ConeGeometry(0.13, 0.22, 4), YELLOW, -2.45, 1.5, 0.35, { delay: 0.48, rotation: [0, Math.PI / 4, 0] });
    palm(2.55, 0.85, 1.25, 0.45);
    drift(26 + level * 4, 0xf3d08a, 0.03, { vx: 0.55, vy: -0.04, bottom: 0.05, top: 1.6, delay: 0.9 });
    addActor(1, 0.75);
  }

  function trap(delay: number) {
    box(1.7, 0.05, 0.9, 0x8a6a3a, 0.3, 0, 0.75, { delay, noInk: true });
    for (let i = 0; i < 5; i++) {
      cone(0.09, 0.42 + (i % 2) * 0.12, STEEL, -0.35 + i * 0.32, 0.04, 0.55 + (i % 2) * 0.3, { delay: delay + 0.1 + i * 0.06 });
    }
    // The scarab on the pressure plate.
    const shell = new SphereGeometry(0.2, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    shell.scale(1, 0.7, 1.25);
    light(add(shell, YELLOW, 0.9, 0.05, 1.05, { delay: delay + 0.45 }));
    box(0.04, 0.03, 0.5, DARK, 0.9, 0.18, 1.05, { delay: delay + 0.5, noInk: true });
  }

  function mummy(delay: number) {
    const wrap = 0xeadfc4;
    const band = 0xb9a985;
    // The open sarcophagus behind it.
    box(0.8, 1.7, 0.3, 0x3a2a18, 1.15, 0, -0.1, { delay, rotation: [-0.12, 0, 0] });
    box(0.7, 1.6, 0.12, YELLOW, 1.95, 0, 0.05, { delay: delay + 0.1, rotation: [0, -0.6, 0.18] });
    const x = 0.55;
    const z = 0.75;
    box(0.2, 0.62, 0.24, wrap, x - 0.15, 0, z, { delay: delay + 0.2 });
    box(0.2, 0.62, 0.24, wrap, x + 0.15, 0, z, { delay: delay + 0.2 });
    const torso = box(0.62, 0.75, 0.38, wrap, x, 0.6, z, { delay: delay + 0.28 });
    decorate(torso, new BoxGeometry(0.66, 0.05, 0.42), band, [
      [0, 0.15, 0],
      [0, 0.38, 0],
      [0, 0.6, 0],
    ]);
    box(0.17, 0.17, 0.72, wrap, x - 0.4, 1.12, z + 0.32, { delay: delay + 0.36 });
    box(0.17, 0.17, 0.72, wrap, x + 0.4, 1.12, z + 0.32, { delay: delay + 0.36 });
    box(0.05, 0.55, 0.03, band, x + 0.42, 0.62, z + 0.68, { delay: delay + 0.42, noInk: true, rotation: [0, 0, 0.2] });
    ball(0.26, wrap, x, 1.38, z, { delay: delay + 0.44 });
    light(box(0.3, 0.06, 0.05, CYAN, x, 1.6, z + 0.25, { delay: delay + 0.5, flat: true, noInk: true }));
  }

  function sphinx(delay: number) {
    const lion = 0xc98f3e;
    // Sizes and places are scaled from the sphinx's centre, so it stands out from the pyramids.
    const k = 1.35;
    const at = (x: number, y: number, z: number): [number, number, number] => [0.3 + x * k, y * k, 0.25 + z * k];
    const part = (w: number, h: number, d: number, color: number, x: number, y: number, z: number, wait: number) =>
      box(w * k, h * k, d * k, color, ...at(x, y, z), { delay: delay + wait });
    part(1.4, 0.22, 2.2, 0x9a6f34, 0, 0, -0.1, 0);
    part(0.9, 0.62, 1.5, lion, 0, 0.22, -0.4, 0.1);
    part(0.26, 0.2, 0.7, lion, -0.3, 0.22, 0.65, 0.18);
    part(0.26, 0.2, 0.7, lion, 0.3, 0.22, 0.65, 0.18);
    part(0.8, 0.7, 0.55, lion, 0, 0.22, 0.25, 0.24);
    // The striped headdress, then the face in front of it.
    const nemes = part(0.8, 0.62, 0.4, YELLOW, 0, 0.82, 0.12, 0.32);
    decorate(nemes, new BoxGeometry(0.82 * k, 0.06 * k, 0.42 * k), CYAN, [
      [0, 0.16 * k, 0],
      [0, 0.32 * k, 0],
      [0, 0.48 * k, 0],
    ]);
    part(0.15, 0.5, 0.12, YELLOW, -0.3, 0.48, 0.42, 0.36);
    part(0.15, 0.5, 0.12, YELLOW, 0.3, 0.48, 0.42, 0.36);
    part(0.44, 0.5, 0.36, lion, 0, 0.88, 0.32, 0.42);
    light(box(0.3 * k, 0.07, 0.04, CYAN, ...at(0, 1.16, 0.51), { delay: delay + 0.5, flat: true, noInk: true }));
    // Its riddle: glyphs turning in the air.
    for (let i = 0; i < 3; i++) {
      spinning.push(
        add(new OctahedronGeometry(0.13), CYAN, -0.75 + i * 0.55, 1.85 + (i % 2) * 0.3, 0.9, { delay: delay + 0.6 + i * 0.08 }),
      );
    }
  }

  // Yucatán -------------------------------------------------------------------

  function buildJungle() {
    ground(0x2c6b3a);
    const tiers = 5;
    for (let i = 0; i < tiers; i++) {
      box(3.2 - i * 0.55, 0.38, 2 - i * 0.3, i % 2 ? STONE : 0x92856a, 0, i * 0.38, -1.25, { delay: 0.1 + i * 0.07 });
    }
    // The stair up the front face, and the temple on top.
    box(0.62, 2, 0.08, 0xc2b594, 0, 0, -0.27, { delay: 0.48, rotation: [-0.31, 0, 0] });
    const shrine = box(0.95, 0.6, 0.66, 0xc2b594, 0, tiers * 0.38, -1.25, { delay: 0.55 });
    decorate(shrine, new BoxGeometry(0.3, 0.36, 0.02), 0x2a2018, [[0, 0.18, 0.34]]);
    box(0.7, 0.32, 0.12, STONE, 0, tiers * 0.38 + 0.6, -1.4, { delay: 0.62 });
    [-1.3, 1.3].forEach((x, i) => {
      cylinder(0.05, 0.05, 0.42, DARK, x, 0, -0.15, { delay: 0.65 + i * 0.05 });
      light(cone(0.09, 0.22, ORANGE, x, 0.42, -0.15, { delay: 0.7 + i * 0.05, flat: true, noInk: true }));
    });
    bushyTree(-2.45, -0.6, 1.5, LEAF, 0.3);
    bushyTree(2.5, -0.85, 1.7, 0x3fa85c, 0.36);
    palm(-2.6, 1.15, 1.1, 0.42);
    drift(18, YELLOW, 0.035, { vx: 0.06, vy: 0.12, bottom: 0.2, top: 2.2, delay: 1 });
    addActor(1, 0.8);
  }

  function ballgame(delay: number) {
    [-1.45, 1.45].forEach((x, i) => {
      box(0.45, 0.85, 1.9, STONE, x, 0, 0.75, { delay: delay + i * 0.06, rotation: [0, 0, x < 0 ? 0.32 : -0.32] });
      ring(0.24, 0.06, CREAM, x * 0.86, 0.92, 0.75, { delay: delay + 0.2 + i * 0.06, rotation: [0, Math.PI / 2, 0] });
    });
    box(2.2, 0.03, 0.6, 0xc2b594, 0, 0, 0.75, { delay: delay + 0.1, noInk: true });
    bob(ball(0.18, DARK, 0.2, 0.1, 0.9, { delay: delay + 0.3 }), 0.75, 0.005);
  }

  function calendar(delay: number) {
    // Turned to face the camera: spinning around its own axis, it turns like a wheel.
    const disc = cylinder(0.92, 0.92, 0.16, 0xc2b594, 0, 0.95, 0.75, { delay, rotation: [Math.PI / 2, 0, 0] });
    decorate(
      disc,
      new BoxGeometry(0.16, 0.04, 0.16),
      YELLOW,
      Array.from({ length: 10 }, (_, i) => {
        const angle = (i / 10) * Math.PI * 2;
        return [Math.cos(angle) * 0.7, 0.17, Math.sin(angle) * 0.7] as [number, number, number];
      }),
    );
    decorate(disc, new CylinderGeometry(0.28, 0.28, 0.05, 16), CYAN, [[0, 0.18, 0]]);
    spinning.push(disc);
    box(0.25, 0.95, 0.25, STONE, 0, 0, 0.6, { delay: Math.max(0, delay - 0.05) });
  }

  function serpent(delay: number) {
    // Down the stair, then across the plaza towards the camera.
    const path: [number, number, number][] = [];
    for (let i = 0; i < 7; i++) path.push([0, 1.85 - i * 0.29, -0.82 + i * 0.1]);
    for (let i = 1; i <= 5; i++) path.push([Math.sin(i * 0.9) * 0.55, 0.08, -0.2 + i * 0.3]);
    path.forEach(([x, y, z], i) =>
      light(ball(0.15 + i * 0.006, i % 2 ? YELLOW : CYAN, x, y, z, { delay: delay + i * 0.05, flat: true })),
    );
    const [hx, , hz] = path[path.length - 1];
    ball(0.3, YELLOW, hx, 0.05, hz + 0.25, { delay: delay + 0.7 });
    [-1, -0.5, 0, 0.5, 1].forEach((tilt, i) =>
      cone(0.06, 0.4, i % 2 ? ORANGE : GREEN, hx + tilt * 0.22, 0.4, hz + 0.1, {
        delay: delay + 0.75 + i * 0.03,
        rotation: [-0.3, 0, -tilt * 0.6],
      }),
    );
    light(box(0.3, 0.06, 0.04, CYAN, hx, 0.42, hz + 0.53, { delay: delay + 0.85, flat: true, noInk: true }));
  }

  // Atlantide -----------------------------------------------------------------

  function column(x: number, z: number, height: number, delay: number) {
    const shaft = cylinder(0.17, 0.2, height, CREAM, x, 0, z, { delay });
    decorate(shaft, new BoxGeometry(0.46, 0.12, 0.46), 0xd8cfb8, [[0, height, 0]]);
  }

  function buildSunken() {
    ground(0x0c4660);
    // The deep water behind, with shafts of light from the surface.
    box(6, 2.9, 0.08, 0x0a3550, 0, 0, -2.1, { delay: 0.04, flat: true });
    [-1.9, -0.3, 1.2].forEach((x, i) =>
      box(0.35, 2.8, 0.02, 0x1d6f8f, x, 0.05, -2.04, { delay: 0.1 + i * 0.05, flat: true, noInk: true, rotation: [0, 0, 0.25] }),
    );
    box(4.4, 0.04, 2.3, 0xc8b47a, 0.2, 0, 0.3, { delay: 0.08, flat: true, noInk: true });
    column(-2.2, -1.2, 1.9, 0.18);
    column(-1.4, -1.35, 1.25, 0.24);
    column(2.25, -1.15, 1.6, 0.3);
    column(1.5, -1.4, 0.7, 0.34);
    // A fallen column on the sand.
    add(new CylinderGeometry(0.17, 0.2, 1.4, 14), CREAM, -1.85, 0, 0.9, { delay: 0.4, rotation: [0, 0.6, Math.PI / 2] });
    const weeds: [number, number, number, number][] = [
      [-2.6, 0.4, 1.3, GREEN],
      [2.6, 0.6, 1.5, LEAF],
      [-0.6, -1.5, 1.1, GREEN],
    ];
    weeds.forEach(([x, z, height, color], i) =>
      cylinder(0.04, 0.07, height, color, x, 0, z, { delay: 0.45 + i * 0.05, rotation: [0.1, 0, (i % 2 ? 1 : -1) * 0.15] }),
    );
    const corals: [number, number, number][] = [
      [2.35, 1.4, ORANGE],
      [-2.4, 1.55, YELLOW],
      [0.9, 1.6, ORANGE],
    ];
    corals.forEach(([x, z, color], i) => cone(0.16, 0.45, color, x, 0, z, { delay: 0.5 + i * 0.05 }));
    light(add(new OctahedronGeometry(0.2), BRONZE, -1.4, 1.35, -1.35, { delay: 0.6 }));
    drift(22, 0xbfeefd, 0.045, { vx: 0.02, vy: 0.32, bottom: 0, top: 2.6, delay: 0.8 });
    addActor(1, 0.75);
  }

  function song(delay: number) {
    ball(0.5, STEEL, 0.2, -0.2, 0.45, { delay });
    add(new ConeGeometry(0.3, 0.7, 9), 0xffdcc0, -0.05, 0.62, 0.75, { delay: delay + 0.12, rotation: [0.4, 0, 0.9] });
    for (let i = 0; i < 3; i++) {
      light(
        ring(0.32 + i * 0.22, 0.03, CYAN, 0.1, 1.15 + i * 0.32, 0.45, {
          delay: delay + 0.3 + i * 0.1,
          rotation: [Math.PI / 2, 0, 0],
        }),
      );
    }
  }

  function guardian(delay: number) {
    const x = 0.35;
    const z = 0.55;
    box(0.36, 0.55, 0.42, 0x9a5a22, x - 0.3, 0, z, { delay });
    box(0.36, 0.55, 0.42, 0x9a5a22, x + 0.3, 0, z, { delay });
    const chest = box(1.05, 0.95, 0.66, BRONZE, x, 0.55, z, { delay: delay + 0.08 });
    decorate(chest, new OctahedronGeometry(0.13), CYAN, [[0, 0.5, 0.34]]);
    box(0.3, 0.95, 0.36, 0x9a5a22, x - 0.7, 0.5, z, { delay: delay + 0.14 });
    box(0.3, 0.95, 0.36, 0x9a5a22, x + 0.7, 0.5, z, { delay: delay + 0.14 });
    box(0.5, 0.42, 0.46, BRONZE, x, 1.5, z, { delay: delay + 0.2 });
    cone(0.18, 0.32, YELLOW, x, 1.92, z, { delay: delay + 0.26 });
    light(box(0.34, 0.07, 0.05, CYAN, x, 1.68, z + 0.24, { delay: delay + 0.3, flat: true, noInk: true }));
    cylinder(0.04, 0.04, 2.3, DARK, x + 0.95, 0, z + 0.1, { delay: delay + 0.34 });
    cone(0.1, 0.32, YELLOW, x + 0.95, 2.3, z + 0.1, { delay: delay + 0.4 });
  }

  function temple(delay: number) {
    box(2.6, 0.18, 1.5, 0xd8cfb8, 0, 0, 0.2, { delay });
    box(2.3, 0.18, 1.25, 0xe8dfc8, 0, 0.18, 0.2, { delay: delay + 0.06 });
    [-0.95, -0.32, 0.32, 0.95].forEach((x, i) => column(x, 0.65, 1.2, delay + 0.12 + i * 0.05));
    [-0.95, 0.95].forEach((x, i) => column(x, -0.25, 1.2, delay + 0.3 + i * 0.05));
    box(2.4, 0.2, 1.35, CREAM, 0, 1.55, 0.2, { delay: delay + 0.45 });
    // The pediment: a triangular prism along the front.
    const pediment = new CylinderGeometry(1, 1, 1.3, 3);
    pediment.rotateX(Math.PI / 2);
    pediment.rotateZ(Math.PI);
    pediment.scale(1.4, 0.45, 1);
    add(pediment, 0xe8dfc8, 0, 1.75, 0.2, { delay: delay + 0.52 });
    cylinder(0.04, 0.09, 0.7, BRONZE, 0, 2.15, 0.2, { delay: delay + 0.6 });
    light(add(new OctahedronGeometry(0.17), YELLOW, 0, 2.82, 0.2, { delay: delay + 0.66 }));
  }

  // Artico --------------------------------------------------------------------

  function buildIce() {
    ground(0xcfe7f2);
    box(5.6, 0.05, 3.8, SNOW, 0, 0, 0.1, { delay: 0.06, noInk: true });
    // The polar night behind, and the aurora: ribbons of light above the horizon.
    box(6, 2.9, 0.08, 0x162a4a, 0, 0, -2.1, { delay: 0.04, flat: true });
    const ribbons: [number, number, number, number][] = [
      [-1.3, 2.35, GREEN, 0.18],
      [0.4, 2.55, CYAN, -0.12],
      [1.9, 2.3, GREEN, 0.22],
    ];
    ribbons.forEach(([x, y, color, tilt], i) =>
      light(box(1.7, 0.16, 0.04, color, x, y, -1.95, { delay: 0.1 + i * 0.07, flat: true, noInk: true, rotation: [0, 0, tilt] })),
    );
    const berg = (x: number, z: number, height: number, delay: number) => {
      const geometry = new OctahedronGeometry(0.6);
      geometry.scale(1, height, 0.8);
      add(geometry, ICE, x, -0.2, z, { delay });
    };
    berg(-2.2, -1.1, 1.8, 0.2);
    berg(-1.35, -1.45, 1.2, 0.26);
    berg(2.3, -1.25, 1.5, 0.3);
    box(1.1, 0.12, 0.8, ICE, 1.9, 0, 1.1, { delay: 0.36, rotation: [0, 0.4, 0] });
    box(0.8, 0.1, 0.6, ICE, -2.1, 0, 1.3, { delay: 0.4, rotation: [0, -0.3, 0] });
    drift(30 + level * 5, 0xffffff, 0.04, { vx: 0.22, vy: -0.42, bottom: 0, top: 2.8, delay: 0.7 });
    addActor(1, 0.7);
  }

  function hut(delay: number) {
    box(1.3, 0.75, 0.9, ORANGE, -0.2, 0, 0.35, { delay, rotation: [0, 0.3, 0] });
    box(1.45, 0.12, 1.05, DARK, -0.2, 0.75, 0.35, { delay: delay + 0.08, rotation: [0, 0.3, 0.08] });
    light(box(0.28, 0.22, 0.03, YELLOW, 0.1, 0.32, 0.86, { delay: delay + 0.16, flat: true, noInk: true, rotation: [0, 0.3, 0] }));
    ball(0.45, SNOW, -0.85, -0.15, 0.85, { delay: delay + 0.2 });
    cylinder(0.025, 0.025, 1.5, STEEL, 1.2, 0, 0.6, { delay: delay + 0.25 });
    box(0.42, 0.26, 0.02, YELLOW, 1.42, 1.18, 0.6, { delay: delay + 0.3 });
    // The storm itself: a second, faster flurry.
    drift(40, 0xffffff, 0.03, { vx: 1.6, vy: -0.25, bottom: 0, top: 2.2, delay: delay + 0.2 });
  }

  function base(delay: number) {
    const dome = new SphereGeometry(0.85, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const shell = add(dome, 0x8f9bb0, 0, 0, 0.1, { delay });
    decorate(
      shell,
      new BoxGeometry(0.16, 0.12, 0.05),
      YELLOW,
      Array.from({ length: 5 }, (_, i) => {
        const angle = -0.9 + i * 0.45;
        return [Math.sin(angle) * 0.74, 0.35, Math.cos(angle) * 0.74] as [number, number, number];
      }),
    );
    box(0.42, 0.42, 0.42, STEEL, -0.95, 0, 0.35, { delay: delay + 0.1 });
    cylinder(0.03, 0.04, 1.5, DARK, 0.15, 0.8, 0.1, { delay: delay + 0.18 });
    light(box(0.08, 0.08, 0.08, ORANGE, 0.15, 2.3, 0.1, { delay: delay + 0.3, flat: true, noInk: true }));
    cylinder(0.03, 0.03, 0.55, DARK, 1.05, 0, 0.45, { delay: delay + 0.22 });
    add(new ConeGeometry(0.3, 0.16, 16, 1, true), CREAM, 1.05, 0.55, 0.45, {
      delay: delay + 0.24,
      rotation: [Math.PI - 0.5, 0, 0.3],
      noInk: true,
    });
    // The hatch in the ice, lit from below.
    light(box(0.55, 0.03, 0.4, CYAN, 0.6, 0.04, 1.25, { delay: delay + 0.36, flat: true, noInk: true }));
  }

  function beast(delay: number) {
    const fur = 0x7a5236;
    const x = 0.2;
    const z = 0.1;
    // It faces the camera: four legs, the shaggy body, then head, trunk and tusks in front.
    [-0.45, 0.45].forEach((dx, i) =>
      [-0.35, 0.35].forEach((dz, j) => cylinder(0.17, 0.19, 0.7, 0x5c3c26, x + dx, 0, z + dz, { delay: delay + (i + j) * 0.03 })),
    );
    const body = new SphereGeometry(0.8, 18, 14);
    body.scale(1.05, 0.9, 1.15);
    add(body, fur, x, 0.45, z, { delay: delay + 0.12 });
    ball(0.42, 0x6a452e, x, 1.45, z - 0.2, { delay: delay + 0.18 });
    ball(0.5, fur, x, 0.95, z + 0.85, { delay: delay + 0.22 });
    cylinder(0.08, 0.15, 0.85, 0x6a452e, x, 0.12, z + 1.25, { delay: delay + 0.3 });
    [-1, 1].forEach((side, i) =>
      cylinder(0.03, 0.08, 0.85, CREAM, x + side * 0.3, 0.55, z + 1.2, {
        delay: delay + 0.36 + i * 0.04,
        rotation: [0.9, 0, -side * 0.35],
      }),
    );
    light(box(0.5, 0.07, 0.04, CYAN, x, 1.18, z + 1.3, { delay: delay + 0.44, flat: true, noInk: true }));
    // Shards of the ice it broke out of.
    const shards: [number, number, number][] = [
      [-1.6, 0.7, 0.6],
      [1.75, 0.9, -0.4],
      [-1.2, 1.5, 0.3],
      [1.4, 1.6, 0.4],
    ];
    shards.forEach(([sx, sz, turn], i) =>
      add(new OctahedronGeometry(0.28), ICE, sx, 0, sz, { delay: delay + 0.5 + i * 0.05, rotation: [turn, turn, 0.3] }),
    );
  }

  // Giappone ------------------------------------------------------------------

  function pagoda(x: number, z: number, size: number, delay: number) {
    for (let i = 0; i < 3; i++) {
      const y = i * 0.62 * size;
      box((1.1 - i * 0.22) * size, 0.42 * size, (0.9 - i * 0.18) * size, 0x8a3a2a, x, y, z, { delay: delay + i * 0.1 });
      box((1.65 - i * 0.3) * size, 0.1 * size, (1.35 - i * 0.25) * size, DARK, x, y + 0.42 * size, z, {
        delay: delay + 0.05 + i * 0.1,
      });
    }
    cylinder(0.03 * size, 0.05 * size, 0.6 * size, YELLOW, x, 1.86 * size, z, { delay: delay + 0.35 });
  }

  function torii(x: number, z: number, delay: number) {
    [-0.6, 0.6].forEach((dx, i) => cylinder(0.08, 0.1, 1.7, VERMILION, x + dx, 0, z, { delay: delay + i * 0.05 }));
    box(1.6, 0.1, 0.18, VERMILION, x, 1.3, z, { delay: delay + 0.12 });
    box(1.95, 0.14, 0.24, DARK, x, 1.7, z, { delay: delay + 0.18 });
  }

  function lantern(x: number, z: number, delay: number) {
    box(0.12, 0.45, 0.12, 0x9a9aa2, x, 0, z, { delay });
    light(box(0.24, 0.22, 0.24, YELLOW, x, 0.45, z, { delay: delay + 0.06 }));
    cone(0.24, 0.2, 0x9a9aa2, x, 0.67, z, { delay: delay + 0.1 });
  }

  function buildJapan() {
    if (threat.scene.actor === "kaiju") return buildBay();
    ground(0x56684a);
    box(1.4, 0.03, 4, 0xc9c2ae, 0.35, 0, 0, { delay: 0.06, noInk: true });
    pagoda(-1.85, -1.15, 1, 0.12);
    torii(1.5, -1.2, 0.3);
    bushyTree(2.55, 0.2, 1.4, BLOSSOM, 0.36);
    bushyTree(-2.55, 0.9, 1.15, BLOSSOM, 0.42);
    lantern(-0.75, 1.3, 0.5);
    lantern(1.45, 1.35, 0.55);
    drift(24, BLOSSOM, 0.04, { vx: 0.3, vy: -0.22, bottom: 0, top: 2.4, delay: 0.8 });
    addActor(1, 0.7);
  }

  function buildBay() {
    ground(0x0f6e96);
    box(6, 0.25, 1.2, 0x3b3f4c, 0, 0, -1.55, { delay: 0.06 });
    const random = seededRandom(threat.name);
    [-2.3, -1.4, 1.5, 2.4].forEach((x, i) =>
      tower(0.7, 1.2 + random() * 1.1, TOWER_COLORS[i], x, -1.6, random, { delay: 0.12 + i * 0.07 }),
    );
    pagoda(-0.55, -1.6, 0.6, 0.35);
    // The railway along the shore, and the train it has bitten.
    box(5.6, 0.12, 0.2, STEEL, 0, 0.25, -0.85, { delay: 0.4 });
    box(0.9, 0.36, 0.42, CYAN, -1.9, 0.37, -0.85, { delay: 0.45 });
    addActor(1, 0.6);
  }

  function swordsman(delay: number) {
    // The arched bridge: two railings and the planks between them.
    [0.45, 1.05].forEach((z, i) =>
      add(new TorusGeometry(1.25, 0.06, 8, 26, Math.PI), VERMILION, 0, -0.05, z, {
        delay: delay + i * 0.05,
        outline: new TorusGeometry(1.25, 0.095, 8, 26, Math.PI),
      }),
    );
    for (let i = 0; i < 7; i++) {
      const angle = Math.PI * (0.12 + (0.76 * i) / 6);
      box(0.4, 0.06, 0.62, 0x6b4a2a, Math.cos(angle) * 1.12, Math.sin(angle) * 1.12 - 0.08, 0.75, {
        delay: delay + 0.1 + i * 0.03,
        rotation: [0, 0, angle - Math.PI / 2],
      });
    }
    // The swordsman on the top plank: robe, head, straw hat and the drawn blade.
    const top = 1.06;
    cylinder(0.17, 0.32, 0.8, DARK, 0, top, 0.75, { delay: delay + 0.4 });
    ball(0.19, 0xe8c9a0, 0, top + 0.72, 0.75, { delay: delay + 0.48 });
    cylinder(0.42, 0.42, 0.03, 0xd9b46a, 0, top + 0.98, 0.75, { delay: delay + 0.55 });
    cone(0.22, 0.2, 0xd9b46a, 0, top + 1, 0.75, { delay: delay + 0.58 });
    light(box(0.04, 0.95, 0.04, CREAM, 0.38, top + 0.3, 0.95, { delay: delay + 0.62, flat: true, rotation: [0, 0, -0.9] }));
  }

  function fox(delay: number) {
    const x = 0.25;
    const z = 0.55;
    bob(add(new SphereGeometry(0.45, 16, 12), ORANGE, x, 0.3, z, { delay }), 0.1, 0.003);
    // Nine tails, fanned out behind it, with white tips.
    for (let i = 0; i < 9; i++) {
      const tilt = -0.95 + (i / 8) * 1.9;
      const tail = cone(0.16, 1.15, 0xf07a1a, x + Math.sin(tilt) * 0.2, 0.5, z - 0.4, {
        delay: delay + 0.1 + i * 0.03,
        rotation: [-0.45, 0, -tilt],
      });
      decorate(tail, new ConeGeometry(0.08, 0.3, 8), CREAM, [[0, 1, 0]]);
    }
    ball(0.3, ORANGE, x, 0.95, z + 0.25, { delay: delay + 0.42 });
    cone(0.13, 0.32, CREAM, x, 0.95, z + 0.55, { delay: delay + 0.46, rotation: [Math.PI / 2, 0, 0] });
    [-0.16, 0.16].forEach((dx, i) => cone(0.09, 0.28, ORANGE, x + dx, 1.15, z + 0.2, { delay: delay + 0.5 + i * 0.03 }));
    light(box(0.28, 0.05, 0.04, CYAN, x, 1.03, z + 0.52, { delay: delay + 0.56, flat: true, noInk: true }));
    // Foxfire.
    const fires: [number, number][] = [
      [-1.2, 1.2],
      [1.5, 1.5],
      [-0.6, 1.9],
    ];
    fires.forEach(([fx, fy], i) =>
      bob(light(cone(0.1, 0.3, CYAN, fx, fy, 0.6, { delay: delay + 0.6 + i * 0.06, flat: true, noInk: true })), 0.2, 0.002 + i * 0.001),
    );
  }

  function kaiju(delay: number) {
    const hide = 0x2f6b4f;
    const x = 0.5;
    const z = 0.1;
    const body = new SphereGeometry(0.75, 18, 14);
    body.scale(1, 1.35, 0.85);
    add(body, hide, x, -0.1, z, { delay });
    cylinder(0.12, 0.34, 1.5, hide, x + 0.75, 0, z - 0.2, { delay: delay + 0.08, rotation: [0, 0.4, 1.25] });
    box(0.22, 0.6, 0.24, hide, x - 0.65, 0.95, z + 0.35, { delay: delay + 0.14, rotation: [0.6, 0, -0.5] });
    box(0.22, 0.6, 0.24, hide, x + 0.65, 0.95, z + 0.35, { delay: delay + 0.14, rotation: [0.6, 0, 0.5] });
    box(0.62, 0.48, 0.7, hide, x, 1.85, z + 0.25, { delay: delay + 0.22 });
    box(0.56, 0.16, 0.6, 0x24523d, x, 1.7, z + 0.4, { delay: delay + 0.28, rotation: [0.3, 0, 0] });
    light(box(0.42, 0.07, 0.04, YELLOW, x, 2.15, z + 0.61, { delay: delay + 0.34, flat: true, noInk: true }));
    // Dorsal plates glowing like a reactor.
    for (let i = 0; i < 4; i++) {
      light(
        cone(0.12, 0.38 - i * 0.04, CYAN, x - 0.05, 2.1 - i * 0.42, z - 0.45 + i * 0.05, {
          delay: delay + 0.4 + i * 0.05,
          rotation: [-0.5, 0, 0],
        }),
      );
    }
    // The bitten train car, in its jaws.
    box(0.75, 0.3, 0.34, CYAN, x - 0.55, 1.7, z + 0.62, { delay: delay + 0.55, rotation: [0, 0.3, 0.35] });
  }

  // ---------------------------------------------------------------------------
  // The very rare threats of Nuova Megara
  // ---------------------------------------------------------------------------

  const unitBox = new BoxGeometry(1, 1, 1);
  geometries.push(unitBox);
  const flatMaterials = new Map<number, MeshBasicMaterial>();
  function flatMaterial(color: number): MeshBasicMaterial {
    let material = flatMaterials.get(color);
    if (!material) {
      material = new MeshBasicMaterial({ color });
      materials.push(material);
      flatMaterials.set(color, material);
    }
    return material;
  }

  /** A flat straight stroke stuck to a part, from (x1, y1) to (x2, y2) in the part's own space. */
  function stroke(parent: Object3D, x1: number, y1: number, x2: number, y2: number, thick: number, color: number, z = 0): Mesh {
    const mesh = new Mesh(unitBox, flatMaterial(color));
    mesh.position.set((x1 + x2) / 2, (y1 + y2) / 2, z);
    mesh.rotation.z = Math.atan2(y2 - y1, x2 - x1);
    mesh.scale.set(Math.hypot(x2 - x1, y2 - y1) + thick, thick, thick * 0.5);
    parent.add(mesh);
    return mesh;
  }

  /** A letter carved on a part, centred on (x, y) of its front face at z. */
  function glyph(parent: Object3D, strokes: Stroke[], size: number, color: number, x: number, y: number, z: number): Group {
    const holder = new Group();
    holder.position.set(x, y, z);
    for (const [x1, y1, x2, y2] of strokes) {
      stroke(holder, (x1 - 0.5) * size, (y1 - 0.5) * size, (x2 - 0.5) * size, (y2 - 0.5) * size, size * 0.15, color);
    }
    parent.add(holder);
    return holder;
  }

  /** A stone of the Alfabeto, standing, its letter on the front. */
  function letterStone(strokes: Stroke[], x: number, y: number, z: number, size: number, delay: number, glow = CYAN): Group {
    const stone = box(0.6 * size, 0.76 * size, 0.16 * size, STONE, x, y, z, { delay });
    glyph(stone, strokes, 0.42 * size, glow, 0, 0.38 * size, 0.085 * size);
    return stone;
  }

  /** Moves a part's meshes into an inner group, which can then scale or turn without fighting the pop-in. */
  function inner(part: Group): Group {
    const holder = new Group();
    holder.add(...part.children);
    part.add(holder);
    return holder;
  }

  /** Like `inner`, with the inner group's pivot at height y of the part, for turning around a centre. */
  function centre(part: Group, y: number): Group {
    const holder = inner(part);
    holder.position.y = y;
    for (const child of holder.children) child.position.y -= y;
    return holder;
  }

  /** A ring spreading on the ground or the water, again and again. */
  function ripple(x: number, y: number, z: number, radius: number, color: number, period: number, delay: number) {
    const geometry = new TorusGeometry(radius, 0.035, 6, 36);
    geometry.rotateX(Math.PI / 2);
    const holder = inner(add(geometry, color, x, y, z, { delay, flat: true, noInk: true }));
    tickers.push((t) => {
      const u = (Math.max(0, t - delay) / period) % 1;
      holder.scale.setScalar(0.35 + u);
      holder.visible = u < 0.85;
    });
  }

  /** A part hanging from its top, swinging like a bell. It is built at rest, `length` below its pivot. */
  function swing(part: Group, length: number, amplitude: number, speed: number, phase: number) {
    const px = part.position.x;
    const py = part.position.y + length;
    tickers.push((t) => {
      const angle = Math.sin(t * speed + phase) * amplitude;
      part.rotation.z = angle;
      part.position.x = px + length * Math.sin(angle);
      part.position.y = py - length * Math.cos(angle);
    });
  }

  /** Makes every part added since `first` heave together, as one body. */
  function heave(first: number, height: number, speed: number) {
    parts.slice(first).forEach(({ group }) => bob(group, height, speed));
  }

  /** Smoke, steam or fumes rising from a point and spreading as they go. */
  function plume(
    count: number,
    color: number,
    size: number,
    [x, y, z]: [number, number, number],
    spread: number,
    rise: number,
    period: number,
    delay: number,
  ) {
    const geometry = new OctahedronGeometry(size);
    geometries.push(geometry);
    const mesh = new InstancedMesh(geometry, flatMaterial(color), count);
    const random = seededRandom(`${threat.name}:plume:${x}:${z}:${color}`);
    const angles = Array.from({ length: count }, () => random() * Math.PI * 2);
    const phases = Array.from({ length: count }, () => random());
    const place = (t: number) => {
      for (let i = 0; i < count; i++) {
        const u = (t / period + phases[i]) % 1;
        const r = spread * u;
        const s = u < 0.8 ? 0.5 + u : (1 - u) * 6.5;
        matrix.makeScale(s, s, s).setPosition(x + Math.cos(angles[i]) * r, y + u * rise, z + Math.sin(angles[i]) * r * 0.6);
        mesh.setMatrixAt(i, matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    };
    place(0);
    root.add(mesh);
    tickers.push((t) => {
      mesh.visible = t > delay;
      if (mesh.visible) place(t - delay);
    });
  }

  /** Bits thrown up in arcs from a point, landing `drop` lower: lapilli, coins, sparks. */
  function fountain(
    count: number,
    color: number,
    geometry: BufferGeometry,
    [x, y, z]: [number, number, number],
    reach: number,
    height: number,
    drop: number,
    period: number,
    delay: number,
  ) {
    geometries.push(geometry);
    const mesh = new InstancedMesh(geometry, flatMaterial(color), count);
    const random = seededRandom(`${threat.name}:fountain:${x}:${z}:${color}`);
    const angles = Array.from({ length: count }, () => random() * Math.PI * 2);
    const phases = Array.from({ length: count }, () => random());
    const reaches = Array.from({ length: count }, () => 0.35 + random() * 0.65);
    const heights = Array.from({ length: count }, () => 0.6 + random() * 0.4);
    const place = (t: number) => {
      for (let i = 0; i < count; i++) {
        const u = (t / period + phases[i]) % 1;
        const d = reach * reaches[i] * u;
        matrix.makeRotationX(u * 9 + i);
        matrix.setPosition(
          x + Math.cos(angles[i]) * d,
          y + 4 * height * heights[i] * u * (1 - u) - drop * u * u,
          z + Math.sin(angles[i]) * d * 0.7,
        );
        mesh.setMatrixAt(i, matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    };
    place(0);
    root.add(mesh);
    tickers.push((t) => {
      mesh.visible = t > delay;
      if (mesh.visible) place(t - delay);
    });
  }

  /** Windows that die and come back in jolts: dark, then in fits, a flare, and dark again. */
  function jolt(windows: InstancedMesh, seed: number) {
    const total = windows.count;
    windows.count = Math.round(total * 0.4);
    tickers.push((t) => {
      const step = Math.floor(t * 2.5 + seed * 0.37);
      const cycle = step % 12;
      const share = cycle < 3 ? 0 : cycle === 11 ? 1 : hash(step * 7 + seed * 13);
      windows.count = Math.round(total * share);
    });
  }

  /** A small Greek temple: steps, six columns, the architrave and its pediment. Upside down with `flip`. */
  function greekTemple(x: number, y: number, z: number, s: number, delay: number, color = CREAM, flip = false) {
    const at = (height: number) => (flip ? y - height : y + height);
    const options = (wait: number): PartOptions => ({ delay: delay + wait, rotation: flip ? [0, 0, Math.PI] : undefined });
    box(2 * s, 0.16 * s, 1.2 * s, shade(color, 0.85), x, at(0), z, options(0));
    [-0.75, -0.25, 0.25, 0.75].forEach((dx, i) =>
      cylinder(0.11 * s, 0.13 * s, s, color, x + dx * s, at(0.16 * s), z + 0.4 * s, options(0.06 + i * 0.04)),
    );
    [-0.75, 0.75].forEach((dx, i) => cylinder(0.11 * s, 0.13 * s, s, color, x + dx * s, at(0.16 * s), z - 0.4 * s, options(0.2 + i * 0.04)));
    box(1.9 * s, 0.16 * s, 1.1 * s, color, x, at(1.16 * s), z, options(0.3));
    const pediment = new CylinderGeometry(1, 1, 1.1 * s, 3);
    pediment.rotateX(Math.PI / 2);
    pediment.rotateZ(Math.PI);
    pediment.scale(1.1 * s, 0.32 * s, 1);
    add(pediment, color, x, at(1.32 * s), z, options(0.36));
  }

  /** A tower crane; a negative `arm` points its jib left. */
  function crane(x: number, z: number, height: number, arm: number, delay: number, color = YELLOW) {
    box(0.14, height, 0.14, color, x, 0, z, { delay });
    box(Math.abs(arm) + 0.5, 0.14, 0.14, color, x + arm / 2, height, z, { delay: delay + 0.1 });
    box(0.03, 0.6, 0.03, 0x000000, x + arm * 0.85, height - 0.6, z, { delay: delay + 0.18, noInk: true });
    box(0.28, 0.2, 0.24, ORANGE, x + arm * 0.85, height - 0.8, z, { delay: delay + 0.22 });
    light(box(0.09, 0.09, 0.09, YELLOW, x, height + 0.14, z, { delay: delay + 0.26, flat: true, noInk: true }));
  }

  /** A house with a tiled roof. */
  function house(x: number, z: number, w: number, h: number, wall: number, delay: number) {
    const body = box(w, h, w * 0.85, wall, x, 0, z, { delay });
    decorate(body, new BoxGeometry(0.11, 0.13, 0.02), DARK, [
      [-w * 0.22, h * 0.6, w * 0.43],
      [w * 0.22, h * 0.6, w * 0.43],
    ]);
    add(new ConeGeometry(w * 0.78, 0.36, 4), TILE, x, h, z, { delay: delay + 0.08, rotation: [0, Math.PI / 4, 0] });
  }

  /** A street lamp; returns its lit head. */
  function streetLamp(x: number, z: number, height: number, delay: number): Group {
    cylinder(0.035, 0.05, height, DARK, x, 0, z, { delay });
    box(0.3, 0.04, 0.04, DARK, x + 0.12, height - 0.04, z, { delay: delay + 0.05 });
    return box(0.16, 0.1, 0.16, YELLOW, x + 0.24, height - 0.14, z, { delay: delay + 0.1, flat: true });
  }

  function boat(x: number, z: number, color: number, delay: number) {
    const first = parts.length;
    box(0.7, 0.18, 0.3, color, x, 0, z, { delay });
    box(0.25, 0.16, 0.2, CREAM, x - 0.1, 0.18, z, { delay: delay + 0.06 });
    heave(first, 0.06, 0.0025);
  }

  /** A slab of a lava flow: from (x, y, z), `length` up a slope tilted back by `tilt`. */
  function lavaTongue(x: number, y: number, z: number, width: number, length: number, tilt: number, delay: number) {
    box(width, length, 0.05, LAVA, x, y, z, { delay, flat: true, noInk: true, rotation: [-tilt, 0, 0] });
    light(box(width * 0.4, length * 0.9, 0.05, YELLOW, x, y + 0.02, z + 0.02, { delay: delay + 0.1, flat: true, noInk: true, rotation: [-tilt, 0, 0] }));
  }

  // Il Vulcano si sveglia -----------------------------------------------------

  function buildVolcano() {
    ground(0x0f6e96);
    box(6, 0.16, 2.75, 0x5c4f46, 0, 0, -0.78, { delay: 0.04 });
    // The volcano over the bay, its crater boiling.
    cylinder(0.55, 2, 2.3, 0x4a3c3a, 0.4, 0.16, -1.75, { delay: 0.1 });
    light(cylinder(0.47, 0.47, 0.06, LAVA, 0.4, 2.43, -1.75, { delay: 0.3, flat: true, noInk: true }));
    // The flow: down the front of the cone, across the quay, into the sea.
    lavaTongue(0.4, 0.19, 0.3, 0.42, 2.7, 0.56, 0.4);
    box(0.7, 0.04, 0.45, LAVA, 0.4, 0.16, 0.5, { delay: 0.5, flat: true, noInk: true });
    [
      [0.25, 0.95, 0.8],
      [0.6, 1.3, 0.6],
      [0.15, 1.55, 0.45],
    ].forEach(([x, z, w], i) => {
      box(w, 0.04, 0.42, LAVA, x, 0, z, { delay: 0.6 + i * 0.06, flat: true, noInk: true });
      light(box(w * 0.4, 0.05, 0.2, YELLOW, x, 0, z, { delay: 0.65 + i * 0.06, flat: true, noInk: true }));
    });
    plume(12, CREAM, 0.09, [0.4, 0.05, 1.3], 0.6, 1.3, 2.6, 1);
    // The town on the quay, the port's crane and a few boats.
    house(-2.45, -0.9, 0.62, 0.8, CREAM, 0.3);
    house(-1.85, -0.35, 0.55, 0.6, 0xe8c9a0, 0.36);
    house(-2.45, 0.15, 0.6, 0.62, 0xd9a07a, 0.42);
    house(1.95, 0, 0.58, 0.66, 0xe8c9a0, 0.4);
    house(2.55, -0.6, 0.6, 0.85, CREAM, 0.46);
    house(2.5, 0.35, 0.5, 0.55, 0xd9a07a, 0.5);
    crane(-1.1, 0.42, 1.9, 1, 0.55);
    box(0.6, 0.38, 0.38, CYAN, -1.55, 0.16, 0.35, { delay: 0.6 });
    box(0.6, 0.38, 0.38, ORANGE, -1.55, 0.54, 0.35, { delay: 0.66 });
    boat(-1.9, 1.45, CREAM, 0.7);
    boat(2.1, 1.5, ORANGE, 0.75);
    // Smoke, and lapilli thrown out of the crater onto the roofs.
    plume(14, 0x55505a, 0.17, [0.4, 2.5, -1.75], 0.9, 1.6, 3.6, 0.6);
    fountain(8 + Math.min(threat.level, 12), 0x3a2a28, new OctahedronGeometry(0.07), [0.4, 2.45, -1.75], 3.4, 0.9, 2.2, 2.2, 0.9);
    [
      [-2.45, 1.2, -0.9],
      [1.95, 1.05, 0],
      [2.55, 1.25, -0.6],
    ].forEach(([x, y, z], i) => bob(light(ball(0.07, LAVA, x, y, z, { delay: 1 + i * 0.08, flat: true })), 0.3, 0.006 + i * 0.001));
  }

  // Notte senza Rintocco, Il tredicesimo rintocco -----------------------------

  function buildBelltower() {
    const thirteen = threat.scene.actor === "thirteen";
    view.distance = 10.4;
    view.lookY = 1.45;
    ground(0x2c2c3c);
    box(6.4, 4.4, 0.08, thirteen ? 0x1e1236 : NIGHT, 0, 0, -2.15, { delay: 0.04, flat: true });
    ball(0.36, CREAM, -2.1, 3.1, -2.05, { delay: 0.08, flat: true, noInk: true });
    box(4.6, 0.04, 2.8, 0x4a4a5c, 0, 0, 0.2, { delay: 0.08, noInk: true });
    // The campanile: brick shaft, belfry, spire.
    const shaft = box(1.05, 2.3, 1.05, 0x9a4a32, 0, 0, -1, { delay: 0.14 });
    decorate(shaft, new BoxGeometry(1.09, 0.06, 1.09), 0x7a3a28, [
      [0, 0.7, 0],
      [0, 2.05, 0],
    ]);
    box(1.2, 0.12, 1.2, CREAM, 0, 2.3, -1, { delay: 0.3 });
    const belfry = box(1, 0.75, 1, 0xb85a3c, 0, 2.42, -1, { delay: 0.36 });
    decorate(belfry, new BoxGeometry(0.26, 0.5, 0.02), 0x15151f, [
      [-0.22, 0.36, 0.5],
      [0.22, 0.36, 0.5],
    ]);
    box(1.2, 0.12, 1.2, CREAM, 0, 3.17, -1, { delay: 0.42 });
    add(new ConeGeometry(0.72, 0.85, 4), 0x6a3a2a, 0, 3.29, -1, { delay: 0.48, rotation: [0, Math.PI / 4, 0] });
    // The clock: twelve hours, or thirteen.
    const dial = new CylinderGeometry(0.4, 0.4, 0.06, 28);
    dial.rotateX(Math.PI / 2);
    const clock = add(dial, CREAM, 0, 1.15, -0.45, { delay: 0.5 });
    const hours = thirteen ? 13 : 12;
    for (let h = 0; h < hours; h++) {
      const angle = Math.PI / 2 - (h / hours) * Math.PI * 2;
      const [c, s] = [Math.cos(angle), Math.sin(angle)];
      stroke(clock, c * 0.27, 0.4 + s * 0.27, c * 0.34, 0.4 + s * 0.34, 0.035, h === 0 && thirteen ? ORANGE : DARK, 0.035);
    }
    if (thirteen) {
      // Hands that will not stop, and the thirteenth hour blinking at the top.
      const hands = new Group();
      hands.position.set(0, 0.4, 0.04);
      clock.add(hands);
      stroke(hands, 0, 0, 0, 0.2, 0.04, DARK);
      stroke(hands, 0, 0, 0, 0.3, 0.025, VERMILION);
      tickers.push((t) => (hands.rotation.z = -t * 2.4));
      light(box(0.08, 0.1, 0.03, ORANGE, 0, 1.83, -0.41, { delay: 0.6, flat: true, noInk: true }));
    } else {
      // Midnight, forever: the hour hand stuck, the minute hand snapped off and fallen.
      stroke(clock, 0, 0.4, 0, 0.62, 0.04, DARK, 0.04);
      stroke(clock, 0, 0.4, 0, 0.53, 0.025, DARK, 0.04);
      stroke(clock, -0.25, 0.65, 0.05, 0.28, 0.012, 0x8a8a92, 0.04);
      stroke(clock, 0.12, 0.55, 0.3, 0.3, 0.012, 0x8a8a92, 0.04);
      box(0.03, 0.2, 0.02, DARK, 0.1, 1.1, -0.4, { delay: 0.6, rotation: [0, 0, -2.5] });
      box(0.3, 0.025, 0.04, DARK, 0.35, 0.04, -0.1, { delay: 0.65, rotation: [0, 0.6, 0] });
      // The silent bell, in the belfry.
      cylinder(0.06, 0.17, 0.26, BRONZE, 0, 2.55, -0.45, { delay: 0.55 });
      drift(44, 0x8f96ad, 0.1, { vx: 0.12, vy: 0, bottom: 0.06, top: 0.38, delay: 0.8 });
    }
    light(streetLamp(-2, 0.9, 1.1, 0.6));
    light(streetLamp(1.75, 0.9, 1.1, 0.65));
    addActor(1, 0.7);
  }

  function thirteen(delay: number) {
    // Thirteen bells: five on each beam out of the tower, three in the belfry, all ringing.
    [-1, 1].forEach((side, i) => box(1.85, 0.08, 0.08, DARK, side * 1.45, 2.25, -0.6, { delay: delay + i * 0.05 }));
    const bells: [number, number, number, number][] = [];
    for (let i = 0; i < 5; i++) {
      bells.push([-(0.75 + i * 0.37), 2.25, -0.6, 0.85 + (i % 2) * 0.2]);
      bells.push([0.75 + i * 0.37, 2.25, -0.6, 0.85 + ((i + 1) % 2) * 0.2]);
    }
    [-0.25, 0, 0.25].forEach((x) => bells.push([x, 3.1, -0.42, 0.8]));
    bells.forEach(([x, pivot, z, s], i) => {
      const length = 0.22 * s + 0.12;
      const bell = add(new CylinderGeometry(0.05 * s, 0.13 * s, 0.22 * s, 12), i % 2 ? YELLOW : BRONZE, x, pivot - length, z, {
        delay: delay + 0.1 + i * 0.04,
      });
      stroke(bell, 0, 0.22 * s, 0, length, 0.02, DARK);
      swing(bell, length, 0.5, 4 + (i % 3), i * 0.7);
    });
    // The tolls, rippling out of the belfry.
    for (let k = 0; k < 3; k++) {
      const part = add(new TorusGeometry(0.4, 0.03, 6, 32), VIOLET, 0, 2.38, -0.4, { delay: delay + 0.6, flat: true, noInk: true });
      const holder = centre(part, 0.43);
      tickers.push((t) => {
        const u = ((t - delay) / 1.8 + k / 3) % 1;
        holder.scale.setScalar(0.4 + u * 3.2);
        holder.visible = t > delay + 0.6 && u < 0.9;
      });
    }
    drift(18, VIOLET, 0.05, { vx: 0.1, vy: 0.3, bottom: 1, top: 3.6, delay: delay + 0.8 });
  }

  // Mercato nero dei Segni ----------------------------------------------------

  function buildMarket() {
    ground(0x3a3230);
    box(5.8, 0.04, 3.4, 0x5a4a40, 0, 0, 0.3, { delay: 0.06, noInk: true });
    // The arcade at the back: wall, columns, arches and the roof.
    box(6, 2.1, 0.25, 0xc9a77a, 0, 0, -1.95, { delay: 0.08 });
    for (let i = 0; i <= 6; i++) cylinder(0.11, 0.13, 1.45, CREAM, -2.7 + i * 0.9, 0, -1.35, { delay: 0.14 + i * 0.04 });
    for (let i = 0; i < 6; i++) {
      const x = -2.25 + i * 0.9;
      add(new TorusGeometry(0.45, 0.06, 6, 16, Math.PI), CREAM, x, 1.39, -1.35, {
        delay: 0.3 + i * 0.04,
        outline: new TorusGeometry(0.45, 0.095, 6, 16, Math.PI),
      });
      light(ball(0.07, YELLOW, x, 1.15, -1.35, { delay: 0.5 + i * 0.04, flat: true }));
    }
    box(6, 0.3, 0.85, 0xb85a3c, 0, 1.92, -1.6, { delay: 0.45 });
    // Three stalls, the slabs on sale glowing under the awnings.
    const slabs = 2 + (threat.level >= 4 ? 1 : 0);
    const glows = [CYAN, YELLOW, VIOLET];
    let letterIndex = 3;
    [
      [-1.75, -0.2, VERMILION],
      [0.15, -0.35, GREEN],
      [1.95, -0.15, 0x3a4a7a],
    ].forEach(([x, z, cloth], k) => {
      const delay = 0.5 + k * 0.12;
      box(1.1, 0.5, 0.55, 0x6b4a2a, x, 0, z, { delay });
      [-0.5, 0.5].forEach((dx) => cylinder(0.03, 0.03, 1.15, DARK, x + dx, 0, z + 0.22, { delay: delay + 0.05 }));
      const awning = box(1.25, 0.06, 0.75, cloth, x, 1.12, z, { delay: delay + 0.12, rotation: [0.25, 0, 0] });
      decorate(awning, new BoxGeometry(0.14, 0.07, 0.76), CREAM, [
        [-0.4, 0, 0],
        [0, 0, 0],
        [0.4, 0, 0],
      ]);
      for (let i = 0; i < slabs; i++) {
        const dx = (i - (slabs - 1) / 2) * 0.34;
        const slab = light(
          box(0.27, 0.36, 0.05, glows[(i + k) % 3], x + dx, 0.5, z + 0.05, { delay: delay + 0.2 + i * 0.05, flat: true, rotation: [-0.25, 0, 0] }),
        );
        glyph(slab, GLYPHS[(letterIndex++ * 7) % GLYPHS.length], 0.2, DARK, 0, 0.18, 0.03);
      }
    });
    // Buyers in hoods, and the seller behind the middle stall.
    figure(-0.75, 0.95, 0.75, 0.9, DARK, YELLOW);
    figure(1.05, 1.15, 0.7, 1, 0x3a2f5f, CYAN);
    figure(0.15, -0.9, 0.62, 0.95, 0x57406f, ORANGE);
    box(0.5, 0.35, 0.4, 0x8a6236, -2.5, 0, 0.9, { delay: 1.05, rotation: [0, 0.3, 0] });
    light(box(0.26, 0.05, 0.3, VIOLET, -2.5, 0.35, 0.9, { delay: 1.1, flat: true, noInk: true, rotation: [0, 0.3, 0] }));
  }

  // Il Colosso di bronzo, Il gigante della baia -------------------------------

  function buildSea() {
    ground(0x0f6e96);
    // The far shore: Nuova Megara's skyline, a temple and a crane.
    box(6, 0.3, 0.9, 0x5c4f46, 0, 0, -1.7, { delay: 0.06 });
    const random = seededRandom(threat.name);
    [-2.5, -1.75, 1.6, 2.45].forEach((x, i) =>
      tower(0.62, 1.1 + random() * 0.9, TOWER_COLORS[i], x, -1.8, random, { delay: 0.12 + i * 0.06 }),
    );
    greekTemple(-0.75, 0.3, -1.75, 0.42, 0.3);
    crane(0.75, -1.75, 2, -0.8, 0.35);
    boat(-2.2, 1.35, CREAM, 0.5);
    boat(2.3, 1.2, ORANGE, 0.55);
    addActor(1, 0.6);
  }

  function colossus(delay: number) {
    const x = 0.25;
    const z = 0.35;
    const dark = 0x9a5a22;
    const first = parts.length;
    // Waist-deep in the bay: hips, torso, a bearded head under a crested helmet.
    cylinder(0.55, 0.5, 0.5, dark, x, 0, z, { delay });
    const torso = cylinder(0.72, 0.55, 1.05, BRONZE, x, 0.5, z, { delay: delay + 0.08 });
    decorate(torso, new SphereGeometry(0.11, 8, 6), PATINA, [
      [-0.32, 0.6, 0.5],
      [0.22, 0.3, 0.5],
      [0.45, 0.85, 0.4],
    ]);
    cylinder(0.15, 0.18, 0.22, BRONZE, x, 1.55, z, { delay: delay + 0.14 });
    ball(0.3, BRONZE, x, 1.7, z, { delay: delay + 0.18 });
    cone(0.22, 0.32, dark, x, 1.98, z + 0.2, { delay: delay + 0.24, rotation: [Math.PI + 0.25, 0, 0] });
    add(new SphereGeometry(0.33, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0xd89a4a, x, 2.02, z, { delay: delay + 0.26 });
    box(0.09, 0.28, 0.72, VERMILION, x, 2.3, z, { delay: delay + 0.32 });
    light(box(0.3, 0.06, 0.04, CYAN, x, 2.02, z + 0.29, { delay: delay + 0.36, flat: true, noInk: true }));
    // The right arm raised with a spear; the left holding its round shield.
    box(0.24, 0.95, 0.26, BRONZE, x + 0.72, 1.32, z, { delay: delay + 0.2, rotation: [0, 0, -0.35] });
    ball(0.15, BRONZE, x + 1.05, 2.12, z, { delay: delay + 0.26 });
    cylinder(0.035, 0.035, 2.6, 0x7a4a1e, x + 1.06, 0.9, z + 0.12, { delay: delay + 0.3 });
    cone(0.09, 0.32, YELLOW, x + 1.06, 3.5, z + 0.12, { delay: delay + 0.36 });
    box(0.24, 0.9, 0.26, BRONZE, x - 1, 0.6, z + 0.1, { delay: delay + 0.2, rotation: [0, 0, -0.43] });
    const disc = new CylinderGeometry(0.5, 0.5, 0.08, 22);
    disc.rotateX(Math.PI / 2);
    const shield = add(disc, BRONZE, x - 1.05, 0.25, z + 0.38, { delay: delay + 0.3, rotation: [0, 0.35, 0] });
    decorate(shield, new CylinderGeometry(0.14, 0.14, 0.12, 14).rotateX(Math.PI / 2), YELLOW, [[0, 0.5, 0.02]]);
    // Water pouring off its shoulders.
    [-0.45, 0.5].forEach((dx, i) =>
      box(0.12, 1.2, 0.03, ICE, x + dx, 0.15, z + 0.56, { delay: delay + 0.42 + i * 0.05, flat: true, noInk: true }),
    );
    heave(first, 0.1, 0.0012);
    ripple(x, 0.01, z, 0.8, CREAM, 2.6, delay + 0.6);
    ripple(x, 0.01, z, 0.8, CREAM, 2.6, delay + 1.9);
  }

  function giant(delay: number) {
    view.distance = 11.2;
    view.lookY = 1.45;
    const x = 0.15;
    const z = 0.15;
    const first = parts.length;
    // Shoulders and chest out of the water, rough as a cliff, with moss and seaweed.
    const chest = new SphereGeometry(1.1, 9, 7);
    chest.scale(1.25, 0.95, 0.8);
    const body = add(chest, ROCK, x, -0.35, z, { delay });
    decorate(body, new SphereGeometry(0.16, 6, 5), LEAF, [
      [-0.8, 1.45, 0.55],
      [0.6, 1.6, 0.5],
      [0.1, 1.1, 0.8],
    ]);
    const head = new SphereGeometry(0.55, 7, 5);
    head.scale(1, 1.05, 0.9);
    add(head, 0x7d7268, x, 1.35, z + 0.1, { delay: delay + 0.12 });
    box(0.95, 0.18, 0.32, ROCK, x, 1.9, z + 0.4, { delay: delay + 0.2, rotation: [0.25, 0, 0] });
    [-0.2, 0.2].forEach((dx, i) =>
      light(box(0.15, 0.1, 0.05, ORANGE, x + dx, 1.8, z + 0.58, { delay: delay + 0.26 + i * 0.03, flat: true, noInk: true })),
    );
    [-0.75, -0.35, 0.45, 0.85].forEach((dx, i) =>
      box(0.07, 0.75, 0.03, GREEN, x + dx, 0.6, z + 0.72, { delay: delay + 0.3 + i * 0.04, flat: true, noInk: true }),
    );
    // One arm lifts a ferry out of the bay; the other grips the water.
    cylinder(0.24, 0.36, 2.1, ROCK, x - 1.55, -0.1, z + 0.35, { delay: delay + 0.2, rotation: [0, 0, 0.12] });
    ball(0.36, 0x7d7268, x - 1.85, 1.75, z + 0.35, { delay: delay + 0.3 });
    box(0.9, 0.24, 0.4, CREAM, x - 1.85, 2.3, z + 0.35, { delay: delay + 0.38, rotation: [0, 0, 0.12] });
    const cabin = box(0.45, 0.22, 0.32, VERMILION, x - 1.9, 2.53, z + 0.35, { delay: delay + 0.44, rotation: [0, 0, 0.12] });
    decorate(cabin, new BoxGeometry(0.08, 0.08, 0.02), CYAN, [
      [-0.12, 0.12, 0.17],
      [0.05, 0.12, 0.17],
    ]);
    ball(0.42, ROCK, x + 1.55, -0.2, z + 0.75, { delay: delay + 0.25 });
    [-0.2, 0, 0.2].forEach((dx, i) =>
      box(0.12, 0.35, 0.14, 0x7d7268, x + 1.55 + dx, 0.1, z + 1.08, { delay: delay + 0.32 + i * 0.03, rotation: [0.5, 0, 0] }),
    );
    heave(first, 0.1, 0.001);
    plume(10, CREAM, 0.08, [x - 1.55, 0.05, z + 0.35], 0.45, 0.9, 1.6, delay + 0.6);
    ripple(x, 0.01, z, 1.3, CREAM, 2.8, delay + 0.6);
    ripple(x, 0.01, z, 1.3, CREAM, 2.8, delay + 2);
  }

  // Il Labirinto sotto Megara -------------------------------------------------

  function buildLabyrinth() {
    // Seen from above, like a map.
    view.distance = 6.6;
    view.height = 8.4;
    view.lookY = 0;
    ground(0x5c4f46);
    const cols = 6;
    const rows = 4;
    const cell = 0.9;
    const x0 = (-cols * cell) / 2;
    const z0 = (-rows * cell) / 2;
    box(cols * cell, 0.03, rows * cell, 0xc2b594, 0, 0, 0, { delay: 0.06, noInk: true });
    // A maze carved by a seeded random walk: the same labyrinth for both players.
    const random = seededRandom(threat.name);
    const grid = <T,>(value: T) => Array.from({ length: rows }, () => Array.from({ length: cols }, () => value));
    const east = grid(true);
    const south = grid(true);
    const seen = grid(false);
    const stack: [number, number][] = [[0, 0]];
    seen[0][0] = true;
    while (stack.length) {
      const [r, c] = stack[stack.length - 1];
      const next = (
        [
          [r - 1, c],
          [r + 1, c],
          [r, c - 1],
          [r, c + 1],
        ] as [number, number][]
      ).filter(([nr, nc]) => nr >= 0 && nr < rows && nc >= 0 && nc < cols && !seen[nr][nc]);
      if (!next.length) {
        stack.pop();
        continue;
      }
      const [nr, nc] = next[Math.floor(random() * next.length)];
      if (nr > r) south[r][c] = false;
      else if (nr < r) south[nr][c] = false;
      else if (nc > c) east[r][c] = false;
      else east[r][nc] = false;
      seen[nr][nc] = true;
      stack.push([nr, nc]);
    }
    // The minotaur's room in the middle: four cells opened into one.
    east[1][2] = east[2][2] = south[1][2] = south[1][3] = false;
    const wall = 0x8f8170;
    const height = 0.5;
    let n = 0;
    const wallDelay = () => 0.1 + n++ * 0.022;
    box(cols * cell + 0.1, height, 0.1, wall, 0, 0, z0, { delay: wallDelay() });
    box(0.1, height, rows * cell, wall, x0, 0, 0, { delay: wallDelay() });
    box(0.1, height, rows * cell, wall, -x0, 0, 0, { delay: wallDelay() });
    // The way in, at the front left.
    box((cols - 1) * cell + 0.1, height, 0.1, wall, x0 + ((cols + 1) * cell) / 2, 0, -z0, { delay: wallDelay() });
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (east[r][c] && c < cols - 1) box(0.1, height, cell + 0.1, wall, x0 + (c + 1) * cell, 0, z0 + (r + 0.5) * cell, { delay: wallDelay() });
        if (south[r][c] && r < rows - 1) box(cell + 0.1, height, 0.1, wall, x0 + (c + 0.5) * cell, 0, z0 + (r + 1) * cell, { delay: wallDelay() });
      }
    }
    // Ariadne's thread, from the way in to the room.
    const key = (r: number, c: number) => r * cols + c;
    const from = new Map<number, number>([[key(rows - 1, 0), -1]]);
    const queue: [number, number][] = [[rows - 1, 0]];
    while (queue.length) {
      const [r, c] = queue.shift() as [number, number];
      const moves: [number, number, boolean][] = [
        [r - 1, c, r > 0 && !south[r - 1][c]],
        [r + 1, c, r < rows - 1 && !south[r][c]],
        [r, c - 1, c > 0 && !east[r][c - 1]],
        [r, c + 1, c < cols - 1 && !east[r][c]],
      ];
      for (const [nr, nc, open] of moves) {
        if (!open || from.has(key(nr, nc))) continue;
        from.set(key(nr, nc), key(r, c));
        queue.push([nr, nc]);
      }
    }
    const path: [number, number][] = [];
    for (let at = key(2, 2); at >= 0; at = from.get(at) ?? -1) path.unshift([x0 + ((at % cols) + 0.5) * cell, z0 + (Math.floor(at / cols) + 0.5) * cell]);
    path.unshift([path[0][0], -z0 + 0.4]);
    for (let i = 1; i < path.length; i++) {
      const [ax, az] = path[i - 1];
      const [bx, bz] = path[i];
      box(Math.abs(bx - ax) + 0.05, 0.02, Math.abs(bz - az) + 0.05, VERMILION, (ax + bx) / 2, 0.03, (az + bz) / 2, {
        delay: 0.75 + i * 0.05,
        flat: true,
        noInk: true,
      });
    }
    // Torches at the corners.
    [
      [x0, z0],
      [-x0, z0],
      [x0, -z0],
      [-x0, -z0],
    ].forEach(([x, z], i) => {
      cylinder(0.05, 0.05, 0.7, DARK, x, 0, z, { delay: 0.5 + i * 0.05 });
      light(cone(0.1, 0.24, ORANGE, x, 0.7, z, { delay: 0.55 + i * 0.05, flat: true, noInk: true }));
    });
    addActor(1, 0.9);
  }

  function minotaur(delay: number) {
    const x = 0;
    const z = 0.05;
    [-0.15, 0.15].forEach((dx) => box(0.18, 0.45, 0.2, STEEL, x + dx, 0, z, { delay }));
    const body = box(0.62, 0.55, 0.42, BRONZE, x, 0.45, z, { delay: delay + 0.08 });
    decorate(body, new CylinderGeometry(0.12, 0.12, 0.04, 8).rotateX(Math.PI / 2), YELLOW, [[0, 0.3, 0.22]]);
    light(box(0.1, 0.1, 0.03, ORANGE, x, 0.7, z + 0.24, { delay: delay + 0.2, flat: true, noInk: true }));
    [-1, 1].forEach((side) => box(0.16, 0.5, 0.18, STEEL, x + side * 0.42, 0.5, z, { delay: delay + 0.14, rotation: [0, 0, side * 0.35] }));
    // The bull's head, horns and burning eyes.
    box(0.38, 0.34, 0.42, 0x9a5a22, x, 1, z + 0.05, { delay: delay + 0.2 });
    box(0.28, 0.16, 0.14, 0x7a4a1e, x, 1.02, z + 0.3, { delay: delay + 0.24 });
    [-1, 1].forEach((side) => cone(0.06, 0.42, CREAM, x + side * 0.2, 1.24, z, { delay: delay + 0.28, rotation: [0, 0, -side * 1.05] }));
    [-0.1, 0.1].forEach((dx) => light(box(0.08, 0.05, 0.04, VERMILION, x + dx, 1.22, z + 0.27, { delay: delay + 0.32, flat: true, noInk: true })));
    // The double axe.
    cylinder(0.025, 0.025, 1, DARK, x + 0.62, 0.15, z + 0.1, { delay: delay + 0.3 });
    box(0.34, 0.24, 0.04, STEEL, x + 0.62, 0.95, z + 0.1, { delay: delay + 0.36 });
    plume(8, CREAM, 0.05, [x, 1.08, z + 0.4], 0.25, 0.5, 1.2, delay + 0.6);
  }

  // Il mondo capovolto --------------------------------------------------------

  function buildUpside() {
    view.distance = 11;
    view.lookY = 1.55;
    ground(0x23232b);
    box(5.6, 0.03, 0.8, 0x4a4f5c, 0, 0, 0.9, { delay: 0.06, noInk: true });
    light(streetLamp(-2.2, 0.35, 1, 0.2));
    light(streetLamp(1.9, 0.4, 1, 0.25));
    figure(-0.7, 1.25, 0.6, 0.3, 0x3a6a55, CREAM);
    // Above, the city hangs upside down from the sky.
    const sky = 3.25;
    box(5.4, 0.3, 3, 0x23232b, 0, sky, -0.5, { delay: 0.1 });
    box(5.4, 0.03, 0.7, 0x4a4f5c, 0, sky - 0.03, 0.6, { delay: 0.14, noInk: true });
    const random = seededRandom(threat.name);
    TOWER_SLOTS.slice(0, 6).forEach(([x, z], i) =>
      tower(0.75 + random() * 0.2, 0.9 + random() * 0.8, TOWER_COLORS[i], x, z, random, { delay: 0.2 + i * 0.08, rotation: [0, 0, Math.PI] }, undefined, sky),
    );
    [-0.6, 0.7].forEach((x, i) => {
      cylinder(0.035, 0.05, 0.9, DARK, x, sky, 0.75, { delay: 0.7 + i * 0.05, rotation: [0, 0, Math.PI] });
      light(box(0.16, 0.1, 0.16, YELLOW, x, sky - 0.95, 0.75, { delay: 0.75 + i * 0.05, flat: true }));
    });
    // Things falling up: a car, and the city's loose bits.
    const first = parts.length;
    car(1.1, 1.1, 0.8);
    heave(first, 1, 0.0009);
    drift(18, 0x8a8a92, 0.05, { vx: 0.05, vy: 0.5, bottom: 0.3, top: 3.1, delay: 0.9 });
  }

  // La lettera mancante, L'Alfabeto completo ----------------------------------

  function buildDig() {
    ground(0x6b4a32);
    box(5.8, 0.03, 3.9, 0x8a6240, 0, 0, 0.1, { delay: 0.05, noInk: true });
    // Behind: the building site's crane and cabin, and the columns the dig turned up.
    crane(-2.35, -1.6, 2.4, 1.3, 0.12);
    const cabin = box(1, 0.6, 0.6, ORANGE, 2.2, 0, -1.6, { delay: 0.18 });
    decorate(cabin, new BoxGeometry(0.3, 0.2, 0.02), YELLOW, [[0, 0.35, 0.31]]);
    [
      [-1, -1.7, 1.3],
      [-0.4, -1.75, 0.8],
      [1.2, -1.7, 1.05],
    ].forEach(([x, z, h], i) => column(x, z, h, 0.22 + i * 0.06));
    // Red-and-white tape around the dig.
    [-2.6, 2.6].forEach((x, i) => cylinder(0.04, 0.04, 0.6, CREAM, x, 0, 1.75, { delay: 0.3 + i * 0.05 }));
    box(5.2, 0.05, 0.02, VERMILION, 0, 0.5, 1.75, { delay: 0.4, noInk: true });
    addActor(1, 0.6);
  }

  function letter(delay: number) {
    // The pit, and the stone standing in it, cracked.
    box(2, 0.03, 1.3, 0x3a2a1e, 0.2, 0, 0.35, { delay, flat: true, noInk: true });
    const stone = box(1, 1.35, 0.26, STONE, 0.2, 0, 0.3, { delay: delay + 0.1, rotation: [0, 0, 0.05] });
    stroke(stone, -0.45, 1.2, -0.2, 0.95, 0.025, DARK, 0.135);
    stroke(stone, -0.2, 0.95, -0.3, 0.7, 0.025, DARK, 0.135);
    stroke(stone, 0.45, 0.3, 0.3, 0.12, 0.025, DARK, 0.135);
    // The letter no one has ever read, throbbing with a glow behind it.
    const aura = glyph(stone, UNKNOWN_GLYPH, 0.7, ORANGE, 0, 0.7, 0.13);
    const mark = glyph(stone, UNKNOWN_GLYPH, 0.62, YELLOW, 0, 0.7, 0.15);
    tickers.push((t) => {
      mark.scale.setScalar(1 + Math.sin(t * 3) * 0.08);
      aura.scale.setScalar(1.05 + Math.sin(t * 3 + 0.6) * 0.14);
      aura.visible = Math.sin(t * 3) > -0.4;
    });
    // Rays leaking from it.
    for (let i = 0; i < 6; i++) {
      const angle = Math.PI * (0.12 + i * 0.152);
      blinking.push(stroke(stone, Math.cos(angle) * 0.6, 0.7 + Math.sin(angle) * 0.6, Math.cos(angle) * 0.85, 0.7 + Math.sin(angle) * 0.85, 0.04, YELLOW, 0));
    }
    // Two known letters lying in the dirt, a bucket and a spade.
    letterStone(GLYPHS[0], -1.45, 0, 1, 0.6, delay + 0.3);
    letterStone(GLYPHS[23], 1.7, 0, 1.05, 0.6, delay + 0.35);
    cylinder(0.14, 0.11, 0.25, ORANGE, -1.9, 0, 0.3, { delay: delay + 0.4 });
    box(0.04, 0.8, 0.04, 0x8a6236, 1.4, 0, 0.1, { delay: delay + 0.45, rotation: [0, 0, -0.3] });
    box(0.18, 0.22, 0.03, STEEL, 1.4, 0, 0.1, { delay: delay + 0.5, rotation: [0, 0, -0.3] });
  }

  function alphabet(delay: number) {
    // The 24 stones in a circle: one by one they light, then a ring of light closes them.
    const count = GLYPHS.length;
    const plates: Mesh[] = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.PI / 2 + (i / count) * Math.PI * 2;
      const x = Math.cos(angle) * 2.35;
      const z = 0.2 + Math.sin(angle) * 1.45;
      const stone = box(0.38, 0.52, 0.1, STONE, x, 0, z, { delay: delay + i * 0.03, rotation: [0, -Math.cos(angle) * 0.4, 0] });
      const plate = new Mesh(unitBox, flatMaterial(YELLOW));
      plate.scale.set(0.3, 0.42, 0.01);
      plate.position.set(0, 0.26, 0.055);
      stone.add(plate);
      plates.push(plate);
      glyph(stone, GLYPHS[i], 0.22, DARK, 0, 0.26, 0.065);
    }
    const geometry = new TorusGeometry(1, 0.05, 6, 64);
    geometry.rotateX(Math.PI / 2);
    geometry.scale(2.35, 1, 1.45);
    const band = add(geometry, YELLOW, 0, 0.04, 0.2, { delay: delay + 0.9, flat: true, noInk: true });
    const beam = add(new CylinderGeometry(0.14, 0.14, 4.5, 14), CREAM, 0, 0, 0.2, { delay: delay + 1, flat: true, noInk: true });
    const halo = add(new CylinderGeometry(0.28, 0.28, 4.5, 14), YELLOW, 0, 0, 0.2, { delay: delay + 1, flat: true, noInk: true });
    tickers.push((t) => {
      const u = Math.max(0, t - delay - 1.2) % 9;
      const lit = Math.floor(u / 0.25);
      plates.forEach((plate, i) => (plate.visible = i < lit));
      const full = lit >= count;
      band.visible = full;
      beam.visible = full;
      halo.visible = full && hash(Math.floor(t * 10)) > 0.3;
    });
  }

  // Assedio dei mille Echi ----------------------------------------------------

  function buildTownhall() {
    ground(0x3a3a46);
    box(5.8, 0.04, 3.6, 0x6a6a7a, 0, 0, 0.3, { delay: 0.05, noInk: true });
    // The municipio: a palazzo with a portico, a tower with the clock, the flag.
    const palazzo = box(4.2, 1.5, 0.9, 0xd8c09a, 0, 0, -1.55, { delay: 0.1 });
    decorate(
      palazzo,
      new BoxGeometry(0.22, 0.32, 0.02),
      0x3a4a7a,
      [-1.6, -1, -0.4, 0.4, 1, 1.6].map((x) => [x, 1.1, 0.46] as [number, number, number]),
    );
    [-1.6, -0.8, 0, 0.8, 1.6].forEach((x, i) => cylinder(0.08, 0.1, 0.85, CREAM, x, 0, -0.98, { delay: 0.2 + i * 0.04 }));
    box(3.6, 0.14, 0.3, CREAM, 0, 0.85, -0.98, { delay: 0.4 });
    box(2.6, 0.1, 0.4, 0xc9c2ae, 0, 0, -0.65, { delay: 0.42 });
    const keep = box(0.8, 1.25, 0.75, 0xc9a77a, 0, 1.5, -1.6, { delay: 0.45 });
    [-0.3, -0.1, 0.1, 0.3].forEach((x, i) => box(0.12, 0.15, 0.75, 0xc9a77a, x, 2.75, -1.6, { delay: 0.55 + i * 0.03 }));
    const dial = new CylinderGeometry(0.22, 0.22, 0.04, 20);
    dial.rotateX(Math.PI / 2);
    const clock = add(dial, CREAM, 0, 2.15, -1.2, { delay: 0.6 });
    stroke(clock, 0, 0.22, 0, 0.38, 0.03, DARK, 0.03);
    stroke(clock, 0, 0.22, 0.12, 0.22, 0.03, DARK, 0.03);
    decorate(keep, new BoxGeometry(0.12, 0.2, 0.02), DARK, [[0, 0.25, 0.38]]);
    cylinder(0.02, 0.02, 0.75, DARK, 0.25, 2.9, -1.6, { delay: 0.65 });
    [GREEN, CREAM, VERMILION].forEach((color, i) =>
      box(0.16, 0.3, 0.02, color, 0.35 + i * 0.16, 3.3, -1.6, { delay: 0.7 + i * 0.04, noInk: true }),
    );
    // Barriers before the steps.
    [-1.1, 0, 1.1].forEach((x, i) => {
      const barrier = box(0.85, 0.32, 0.06, CREAM, x, 0, -0.3, { delay: 0.6 + i * 0.05 });
      decorate(barrier, new BoxGeometry(0.14, 0.33, 0.07), VERMILION, [
        [-0.25, 0.16, 0],
        [0.1, 0.16, 0],
        [0.32, 0.16, 0],
      ]);
    });
    addActor(1, 0.8);
  }

  function echoes(delay: number) {
    // A crowd of glowing silhouettes, rising from the piazza and marching on the steps.
    const count = 8 + Math.min(threat.level, 12) * 2;
    const bodyGeometry = new CylinderGeometry(0.09, 0.15, 0.42, 8);
    bodyGeometry.translate(0, 0.21, 0);
    const headGeometry = new SphereGeometry(0.1, 10, 8);
    headGeometry.translate(0, 0.52, 0);
    geometries.push(bodyGeometry, headGeometry);
    const bodies = new InstancedMesh(bodyGeometry, flatMaterial(0xffffff), count);
    const heads = new InstancedMesh(headGeometry, flatMaterial(0xffffff), count);
    const random = seededRandom(`${threat.name}:echoes`);
    const lanes = Array.from({ length: count }, () => -2.6 + random() * 5.2);
    const phases = Array.from({ length: count }, () => random());
    const tint = new Color();
    for (let i = 0; i < count; i++) {
      tint.setHex(i % 3 ? CYAN : 0xd2c2ff);
      bodies.setColorAt(i, tint);
      heads.setColorAt(i, tint);
    }
    const place = (t: number) => {
      for (let i = 0; i < count; i++) {
        const u = (t * 0.07 + phases[i]) % 1;
        const s = (u < 0.1 ? u / 0.1 : u > 0.9 ? (1 - u) / 0.1 : 1) * 1.1;
        matrix.makeScale(s, s, s).setPosition(lanes[i] * (1 - u * 0.4), Math.abs(Math.sin(t * 7 + i)) * 0.05, 2 - u * 2.15);
        bodies.setMatrixAt(i, matrix);
        heads.setMatrixAt(i, matrix);
      }
      bodies.instanceMatrix.needsUpdate = true;
      heads.instanceMatrix.needsUpdate = true;
    };
    place(0);
    root.add(bodies, heads);
    tickers.push((t) => {
      bodies.visible = heads.visible = t > delay;
      if (bodies.visible) place(t - delay);
    });
  }

  // L'ingorgo eterno ----------------------------------------------------------

  function buildRingroad() {
    ground(0x3f5a3a);
    const a = 2.35;
    const b = 1.45;
    const deckY = 0.42;
    const cz = 0.15;
    // The centre: a few towers inside the ring.
    const random = seededRandom(threat.name);
    [
      [-0.6, -0.4],
      [0.55, -0.55],
      [0.05, 0.35],
    ].forEach(([x, z], i) => tower(0.6, 0.9 + random() * 0.9, TOWER_COLORS[i + 1], x, z, random, { delay: 0.1 + i * 0.06 }));
    // The tangenziale on its pillars.
    const ringGeometry = (tube: number) => {
      const geometry = new TorusGeometry(1, tube, 4, 64);
      geometry.rotateX(Math.PI / 2);
      geometry.scale(a, 0.35, b);
      return geometry;
    };
    const deck = add(ringGeometry(0.13), 0x3a3a44, 0, deckY, cz, { delay: 0.2, outline: ringGeometry(0.15) });
    decorate(
      deck,
      new BoxGeometry(0.1, 0.02, 0.1),
      YELLOW,
      Array.from({ length: 24 }, (_, i) => {
        const angle = (i / 24) * Math.PI * 2;
        return [Math.cos(angle) * a, 0.09, Math.sin(angle) * b] as [number, number, number];
      }),
    );
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + 0.2;
      cylinder(0.07, 0.09, deckY, STEEL, Math.cos(angle) * a, 0, cz + Math.sin(angle) * b, { delay: 0.12 + i * 0.03 });
    }
    // Cars bumper to bumper all the way round.
    const colors = [ORANGE, CYAN, YELLOW, CREAM, GREEN, VERMILION, 0x7a3a6a];
    const cars = Math.min(8 + threat.level * 2, 18);
    const carAt = (angle: number, lift: number, tilt: number, i: number) => {
      const x = Math.cos(angle) * a;
      const z = cz + Math.sin(angle) * b;
      const yaw = Math.atan2(-b * Math.cos(angle), -a * Math.sin(angle));
      box(0.38, 0.13, 0.2, colors[i % colors.length], x, deckY + 0.1 + lift, z, { delay: 0.45 + i * 0.04, rotation: [0, yaw, tilt] });
      box(0.18, 0.1, 0.17, DARK, x, deckY + 0.23 + lift, z, { delay: 0.5 + i * 0.04, rotation: [0, yaw, tilt] });
    };
    for (let i = 0; i < cars; i++) {
      const angle = Math.PI / 2 + 0.3 + (i / cars) * Math.PI * 1.75;
      carAt(angle, 0, 0, i);
    }
    // The pile-up at the front, where it all stopped.
    carAt(Math.PI / 2 + 0.12, 0, 0, 1);
    carAt(Math.PI / 2 + 0.05, 0.2, 0.35, 3);
    carAt(Math.PI / 2 + 0.15, 0.4, -0.25, 5);
    light(box(0.08, 0.08, 0.04, VERMILION, 0, deckY + 0.75, cz + b + 0.15, { delay: 1.2, flat: true, noInk: true }));
    plume(10, 0x8a8a92, 0.1, [0, deckY + 0.4, cz + b], 1.2, 1.3, 4, 1);
    // A traffic light stuck on red, and the cones of roadworks.
    cylinder(0.03, 0.03, 1.2, DARK, -2.6, 0, 1.6, { delay: 0.9 });
    box(0.14, 0.38, 0.12, DARK, -2.6, 1.2, 1.6, { delay: 0.95 });
    light(box(0.08, 0.08, 0.03, VERMILION, -2.6, 1.47, 1.66, { delay: 1, flat: true, noInk: true }));
    [-1.5, -1.2, 1.3].forEach((x, i) => cone(0.07, 0.2, ORANGE, x, 0, 1.85, { delay: 1 + i * 0.04 }));
  }

  // L'Oracolo sepolto ---------------------------------------------------------

  function buildOracle() {
    const rock = 0x3a2f3f;
    ground(0x2a2230);
    // A cave cut open like a diorama: the rock wall, an overhang with stalactites.
    box(6.2, 3.2, 0.3, rock, 0, 0, -2, { delay: 0.04 });
    box(6.2, 0.3, 0.8, rock, 0, 2.9, -1.6, { delay: 0.08 });
    [-2.3, -1.4, -0.5, 0.6, 1.5, 2.4].forEach((x, i) =>
      cone(0.13, 0.5 + (i % 2) * 0.25, 0x4a3f4f, x, 2.9, -1.3, { delay: 0.12 + i * 0.03, rotation: [Math.PI, 0, 0] }),
    );
    [
      [-2.75, -0.8, 0.8],
      [2.8, -0.4, 0.7],
      [-2.7, 1.2, 0.45],
      [2.65, 1.4, 0.4],
    ].forEach(([x, z, r], i) => ball(r, 0x4a3f4f, x, -0.25, z, { delay: 0.1 + i * 0.04 }));
    // The buried temple, and the metro that cuts right through the necropolis.
    greekTemple(-0.2, 0, -1.25, 0.75, 0.2, 0x9a8fb0);
    box(1.2, 1.05, 0.1, 0x120d16, 2, 0, -1.83, { delay: 0.3, flat: true, noInk: true });
    const train = box(0.9, 0.75, 0.5, CYAN, 2, 0.05, -1.55, { delay: 0.45 });
    decorate(train, new BoxGeometry(0.6, 0.22, 0.02), DARK, [[0, 0.5, 0.26]]);
    [-0.28, 0.28].forEach((dx) => light(box(0.1, 0.08, 0.03, YELLOW, 2 + dx, 0.2, -1.29, { delay: 0.55, flat: true, noInk: true })));
    // The chasm, the tripod over it and the Pythia beside it.
    cylinder(0.68, 0.68, 0.02, 0x120d16, 0, 0, 0.6, { delay: 0.35, flat: true, noInk: true });
    light(cylinder(0.55, 0.55, 0.03, VIOLET, 0, 0, 0.6, { delay: 0.4, flat: true, noInk: true }));
    [0, 1, 2].forEach((k) => {
      const angle = (k / 3) * Math.PI * 2 + 0.5;
      cylinder(0.025, 0.025, 0.85, BRONZE, Math.cos(angle) * 0.3, 0, 0.6 + Math.sin(angle) * 0.3, { delay: 0.45 + k * 0.04 });
    });
    add(new SphereGeometry(0.34, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), BRONZE, 0, 0.6, 0.6, { delay: 0.6 });
    figure(-1.05, 0.75, 0.85, 0.65, CREAM, VIOLET);
    [
      [-2, 0.95],
      [-1.7, 1.35],
      [1.55, 1.1],
    ].forEach(([x, z], i) => {
      cylinder(0.12, 0.08, 0.3, TILE, x, 0, z, { delay: 0.7 + i * 0.05 });
      cylinder(0.05, 0.08, 0.1, TILE, x, 0.3, z, { delay: 0.74 + i * 0.05 });
    });
    [-1.6, 1.15].forEach((x, i) => {
      cylinder(0.04, 0.04, 0.5, DARK, x, 1.3, -1.82, { delay: 0.5 + i * 0.05 });
      light(cone(0.08, 0.2, ORANGE, x, 1.8, -1.82, { delay: 0.55 + i * 0.05, flat: true, noInk: true }));
    });
    // The fumes.
    plume(16 + Math.min(threat.level, 12), VIOLET, 0.09, [0, 0.9, 0.6], 0.8, 2.1, 3.4, 0.7);
    plume(10, 0xd2c2ff, 0.06, [0, 0.9, 0.6], 0.5, 1.8, 2.6, 0.9);
  }

  // La centrale dell'Ora Zero, L'Ora Zero di nuovo -----------------------------

  function buildPlant() {
    const zero = threat.scene.actor === "zero";
    ground(0x3b3f4c);
    // Left, the dig and the oracle's temple; right, the power plant and its dome.
    box(2.6, 0.03, 2.4, 0x8a6240, -1.5, 0, -0.3, { delay: 0.05, noInk: true });
    greekTemple(-1.55, 0, -0.95, 0.7, 0.12);
    cylinder(1.05, 1.1, 0.4, STEEL, 1.45, 0, -0.9, { delay: 0.15 });
    const shell = add(new SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), 0xc9ced8, 1.45, 0.4, -0.9, { delay: 0.22 });
    decorate(shell, new BoxGeometry(0.16, 0.16, 0.04), YELLOW, [
      [-0.45, 0.6, 0.72],
      [0, 0.75, 0.68],
      [0.45, 0.6, 0.72],
    ]);
    cylinder(0.38, 0.5, 1.7, 0xa9adb8, 2.6, 0, -1.65, { delay: 0.3 });
    plume(10, CREAM, 0.13, [2.6, 1.75, -1.65], 0.4, 1.4, 4, 0.8);
    add(new CylinderGeometry(0.08, 0.08, 1.3, 10), STEEL, 0.6, 0.25, 0.15, { delay: 0.4, rotation: [0, 0, Math.PI / 2] });
    // The warning sign.
    cylinder(0.025, 0.025, 0.5, DARK, 0.9, 0, 1.45, { delay: 0.5 });
    const sign = new CylinderGeometry(0.22, 0.22, 0.03, 3);
    sign.rotateX(Math.PI / 2);
    sign.rotateZ(Math.PI);
    add(sign, YELLOW, 0.9, 0.5, 1.45, { delay: 0.55 });
    if (!zero) {
      // The beam, straight up from where the two sites meet, with rings of light climbing it.
      cylinder(0.15, 0.15, 5, CREAM, 0, 0, -0.2, { delay: 0.55, flat: true, noInk: true });
      light(cylinder(0.3, 0.3, 5, CYAN, 0, 0, -0.2, { delay: 0.6, flat: true, noInk: true }));
      for (let k = 0; k < 3; k++) {
        const geometry = new TorusGeometry(0.48, 0.04, 6, 28);
        geometry.rotateX(Math.PI / 2);
        const ringPart = add(geometry, CYAN, 0, 0, -0.2, { delay: 0.8, flat: true, noInk: true });
        tickers.push((t) => (ringPart.position.y = ((t * 0.3 + k / 3) % 1) * 4.2));
      }
      fountain(12, YELLOW, new OctahedronGeometry(0.04), [0, 0.1, -0.2], 1.3, 0.7, 0.1, 1.4, 0.9);
    }
    addActor(1, 0.7);
  }

  function zero(delay: number) {
    // Two cranes, one per site, their jibs touching over the seam.
    crane(-1.05, -1.35, 2.3, 1, delay);
    crane(1.05, -1.5, 2.45, -1, delay + 0.08, ORANGE);
    // The bolt, from the sky down to the seam.
    const bolt: [number, number][] = [
      [0.35, 4],
      [-0.25, 3.1],
      [0.25, 2.25],
      [-0.2, 1.35],
      [0.15, 0.55],
      [0, 0],
    ];
    for (let k = 0; k < bolt.length - 1; k++) {
      const [x1, y1] = bolt[k + 1];
      const [x2, y2] = bolt[k];
      const angle = Math.atan2(-(x2 - x1), y2 - y1);
      const length = Math.hypot(x2 - x1, y2 - y1) + 0.06;
      light(box(0.16, length, 0.08, YELLOW, x1, y1, 0.3, { delay: delay + 0.3 + k * 0.03, flat: true, rotation: [0, 0, angle] }));
      box(0.06, length, 0.09, CREAM, x1, y1, 0.32, { delay: delay + 0.32 + k * 0.03, flat: true, noInk: true, rotation: [0, 0, angle] });
    }
    // The ground cracks where the two sites touch.
    [
      [0, 0.3, 0, 1.2],
      [0, 1.2, 0.3, 1.9],
      [0, 0.3, -0.2, -0.6],
    ].forEach(([x1, z1, x2, z2], i) =>
      light(
        box(0.07, 0.02, Math.hypot(x2 - x1, z2 - z1), VIOLET, (x1 + x2) / 2, 0.03, (z1 + z2) / 2, {
          delay: delay + 0.4 + i * 0.05,
          flat: true,
          noInk: true,
          rotation: [0, Math.atan2(x2 - x1, z2 - z1), 0],
        }),
      ),
    );
    ripple(0, 0.02, 0.3, 0.6, YELLOW, 1.3, delay + 0.5);
    ripple(0, 0.02, 0.3, 0.6, YELLOW, 1.3, delay + 1.15);
    fountain(16, YELLOW, new OctahedronGeometry(0.05), [0, 0.05, 0.3], 1.5, 0.8, 0.1, 1.2, delay + 0.4);
    // The clock on the fence, stuck at 00:00.
    [-0.5, 0.5].forEach((dx) => cylinder(0.025, 0.025, 0.5, DARK, -1.8 + dx, 0, 1.55, { delay: delay + 0.5 }));
    const panel = box(1.2, 0.42, 0.08, DARK, -1.8, 0.5, 1.55, { delay: delay + 0.55 });
    [-0.42, -0.2, 0.2, 0.42].forEach((x) => blinking.push(glyph(panel, GLYPHS[14], 0.2, VERMILION, x, 0.21, 0.05)));
    stroke(panel, 0, 0.27, 0, 0.29, 0.04, VERMILION, 0.05);
    stroke(panel, 0, 0.13, 0, 0.15, 0.04, VERMILION, 0.05);
  }

  // Il Banco salta ------------------------------------------------------------

  function buildVault() {
    ground(0x4a4f5c);
    box(5.8, 0.03, 3.8, 0x6a6f7c, 0, 0, 0.1, { delay: 0.05, noInk: true });
    // The back wall, safe-deposit boxes all over it.
    const wall = box(6, 2.6, 0.3, 0x8a8f9c, 0, 0, -1.9, { delay: 0.08 });
    const drawers: [number, number, number][] = [];
    for (let row = 0; row < 6; row++) {
      for (const x of [-2.6, -2.2, -1.8, -1.4, 1.4, 1.8, 2.2, 2.6]) drawers.push([x, 0.35 + row * 0.36, 0.16]);
    }
    decorate(wall, new BoxGeometry(0.34, 0.28, 0.03), 0x6a6f7c, drawers);
    // The round door torn open; the dark hole behind it.
    const hole = new CylinderGeometry(0.95, 0.95, 0.04, 28);
    hole.rotateX(Math.PI / 2);
    add(hole, 0x0d0d14, 0, 0.25, -1.73, { delay: 0.2, flat: true, noInk: true });
    ring(0.95, 0.08, 0xc9ced8, 0, 0.17, -1.71, { delay: 0.25 });
    const slab = new CylinderGeometry(0.95, 0.95, 0.28, 28);
    slab.rotateX(Math.PI / 2);
    const door = add(slab, 0xb4bac6, -1.55, 0.2, -1.15, { delay: 0.3, rotation: [0, 1.25, 0] });
    decorate(
      door,
      new CylinderGeometry(0.05, 0.05, 0.06, 8).rotateX(Math.PI / 2),
      YELLOW,
      Array.from({ length: 8 }, (_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        return [Math.cos(angle) * 0.75, 0.95 + Math.sin(angle) * 0.75, 0.15] as [number, number, number];
      }),
    );
    const wheel = new Group();
    wheel.position.set(0, 0.95, 0.17);
    door.add(wheel);
    [0, 1, 2].forEach((k) => {
      const angle = (k / 3) * Math.PI;
      stroke(wheel, -Math.cos(angle) * 0.32, -Math.sin(angle) * 0.32, Math.cos(angle) * 0.32, Math.sin(angle) * 0.32, 0.05, DARK);
    });
    tickers.push((t) => (wheel.rotation.z = t * 1.5));
    // Gold everywhere: bars, piles of coins, and coins bursting out of the hole.
    [
      [0, 0],
      [0.38, 0],
      [0.76, 0],
      [0.19, 1],
      [0.57, 1],
      [0.38, 2],
    ].forEach(([dx, row], i) => box(0.36, 0.14, 0.2, YELLOW, 1.3 + dx, row * 0.14, 0.3, { delay: 0.5 + i * 0.04 }));
    const pile = (x: number, z: number, radius: number, delay: number) => {
      const geometry = new SphereGeometry(radius, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
      geometry.scale(1, 0.55, 1);
      add(geometry, YELLOW, x, 0, z, { delay });
    };
    pile(-0.35, 0.55, 0.6, 0.55);
    pile(0.6, 1.25, 0.4, 0.6);
    pile(-1.7, 1.1, 0.35, 0.65);
    const coin = new CylinderGeometry(0.075, 0.075, 0.025, 10);
    fountain(12 + Math.min(threat.level, 12) * 2, YELLOW, coin, [0, 1.1, -1.6], 2.8, 1.2, 1.1, 1.6, 0.9);
    drift(16, GREEN, 0.05, { vx: 0.2, vy: -0.3, bottom: 0.1, top: 2.6, delay: 1 });
    // The alarm.
    [-1.9, 1.9].forEach((x, i) => light(box(0.3, 0.18, 0.12, VERMILION, x, 2.2, -1.72, { delay: 0.7 + i * 0.05, flat: true })));
    ball(0.3, 0xc9a77a, 2.3, 0, 1.2, { delay: 0.75 });
    cone(0.1, 0.2, 0xc9a77a, 2.3, 0.55, 1.2, { delay: 0.8 });
  }

  // L'ombra di mezzogiorno ----------------------------------------------------

  function buildNoon() {
    ground(0xd9b77a);
    box(5.8, 0.03, 3.8, 0xe8cf98, 0, 0, 0.1, { delay: 0.05, noInk: true });
    // The sun, straight overhead, its rays turning.
    const sun = ball(0.5, YELLOW, 0, 2.7, -0.6, { delay: 0.1, flat: true });
    const rays = new Group();
    rays.position.set(0, 0.5, 0);
    sun.add(rays);
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      stroke(rays, Math.cos(angle) * 0.62, Math.sin(angle) * 0.62, Math.cos(angle) * 0.9, Math.sin(angle) * 0.9, 0.07, ORANGE);
    }
    tickers.push((t) => (rays.rotation.z = t * 0.4));
    // The piazza: palazzi behind, an obelisk, a statue, a fountain, a lamp, a tourist.
    [
      [-2, 1.4, 1.3, 0xe2a26a],
      [-0.6, 1.2, 1, 0xd8c09a],
      [1.9, 1.5, 1.1, 0xc9a77a],
    ].forEach(([x, w, h, color], i) => {
      const block = box(w, h, 0.8, color, x, 0, -1.6, { delay: 0.12 + i * 0.05 });
      decorate(block, new BoxGeometry(0.16, 0.24, 0.02), 0x5c4f46, [
        [-w * 0.25, h * 0.6, 0.41],
        [w * 0.25, h * 0.6, 0.41],
      ]);
    });
    box(0.26, 1.5, 0.26, STONE, -1.45, 0, -0.45, { delay: 0.3 });
    add(new ConeGeometry(0.2, 0.3, 4), YELLOW, -1.45, 1.5, -0.45, { delay: 0.36, rotation: [0, Math.PI / 4, 0] });
    box(0.45, 0.45, 0.45, CREAM, 0.75, 0, -0.35, { delay: 0.35 });
    cylinder(0.1, 0.16, 0.5, BRONZE, 0.75, 0.45, -0.35, { delay: 0.4 });
    ball(0.12, BRONZE, 0.75, 0.93, -0.35, { delay: 0.44 });
    cylinder(0.45, 0.5, 0.2, CREAM, -0.5, 0, 0.75, { delay: 0.45 });
    cylinder(0.38, 0.38, 0.03, CYAN, -0.5, 0.18, 0.75, { delay: 0.5, flat: true, noInk: true });
    cylinder(0.025, 0.06, 0.4, CYAN, -0.5, 0.2, 0.75, { delay: 0.55, flat: true });
    cylinder(0.035, 0.05, 1.1, DARK, 2, 0, 0.35, { delay: 0.5 });
    figure(1.35, 0.95, 0.55, 0.55, ORANGE, CREAM);
    // Each casts a shadow far too long for midday, and the shadows breathe.
    const shadows: [number, number, number, number][] = [
      [-1.45, -0.45, 0.3, 2.9],
      [0.75, -0.35, 0.45, 2.3],
      [-0.5, 0.75, 0.9, 1.6],
      [2, 0.35, 0.12, 1.75],
      [1.35, 0.95, 0.22, 1.25],
    ];
    shadows.forEach(([x, z, width, length], i) => {
      const geometry = new BoxGeometry(width, 0.02, length);
      geometry.translate(0, 0, length / 2);
      const holder = inner(add(geometry, 0x1a1a24, x, 0.035, z, { delay: 0.6 + i * 0.06, flat: true, noInk: true, rotation: [0, 0.6, 0] }));
      tickers.push((t) => (holder.scale.z = 1 + Math.sin(t * 0.7 + i) * 0.15));
    });
    // At the end of the obelisk's shadow, a shadow stands up on its own.
    figure(0.15, 1.8, 0.7, 1, DARK, YELLOW);
    drift(12, 0xfff3c4, 0.03, { vx: 0.05, vy: 0.3, bottom: 0.1, top: 2.2, delay: 1 });
  }

  // Il Diluvio ----------------------------------------------------------------

  function buildFlood() {
    view.distance = 9.6;
    view.lookY = 0.8;
    ground(0x0c4660);
    box(6.4, 4.2, 0.08, 0x2a3346, 0, 0, -2.15, { delay: 0.04, flat: true });
    light(box(0.08, 0.7, 0.05, YELLOW, 2, 2.4, -2.05, { delay: 0.2, flat: true, noInk: true, rotation: [0, 0, 0.4] }));
    light(box(0.08, 0.6, 0.05, YELLOW, 1.8, 1.9, -2.05, { delay: 0.25, flat: true, noInk: true, rotation: [0, 0, -0.3] }));
    // What is left above the water: temple tops, roofs, a tower, a crane, the bell tower's spire.
    [-1.7, -1.2, -0.7, -0.2].forEach((x, i) => box(0.3, 0.12, 0.3, CREAM, x, 0, -0.25, { delay: 0.1 + i * 0.04 }));
    box(1.9, 0.18, 1.1, CREAM, -0.95, 0.12, -0.6, { delay: 0.25 });
    const pediment = new CylinderGeometry(1, 1, 1.1, 3);
    pediment.rotateX(Math.PI / 2);
    pediment.rotateZ(Math.PI);
    pediment.scale(1.1, 0.35, 1);
    add(pediment, CREAM, -0.95, 0.3, -0.6, { delay: 0.3 });
    greekTemple(1.75, -0.75, -1.4, 0.6, 0.3);
    [
      [-2.4, 0.6],
      [0.95, 0.85],
      [2.4, 0.3],
    ].forEach(([x, z], i) => add(new ConeGeometry(0.42, 0.36, 4), TILE, x, 0, z, { delay: 0.35 + i * 0.05, rotation: [0, Math.PI / 4, 0] }));
    box(0.7, 0.55, 0.7, TOWER_COLORS[0], 0.55, 0, -1.3, { delay: 0.4 });
    cylinder(0.02, 0.02, 0.5, DARK, 0.55, 0.55, -1.3, { delay: 0.45 });
    light(box(0.07, 0.07, 0.07, VERMILION, 0.55, 1.05, -1.3, { delay: 0.5, flat: true, noInk: true }));
    box(0.55, 0.45, 0.55, 0xb85a3c, -2.35, 0, -1.4, { delay: 0.4 });
    add(new ConeGeometry(0.4, 0.6, 4), 0x6a3a2a, -2.35, 0.45, -1.4, { delay: 0.46, rotation: [0, Math.PI / 4, 0] });
    box(0.14, 0.9, 0.14, YELLOW, 2.55, 0, -0.35, { delay: 0.45 });
    box(1.5, 0.12, 0.12, YELLOW, 2.05, 0.9, -0.35, { delay: 0.5 });
    // Floating: a boat with someone in it, a car, crates.
    let first = parts.length;
    box(0.8, 0.18, 0.36, ORANGE, -0.1, 0, 1.25, { delay: 0.6 });
    cylinder(0.08, 0.14, 0.3, CYAN, -0.1, 0.18, 1.25, { delay: 0.65 });
    ball(0.1, 0xe8c9a0, -0.1, 0.45, 1.25, { delay: 0.7 });
    heave(first, 0.07, 0.002);
    first = parts.length;
    car(-2, 1.4, 0.7);
    heave(first, 0.06, 0.0017);
    [
      [1.4, 1.5],
      [2.3, 1.1],
    ].forEach(([x, z], i) => bob(box(0.25, 0.22, 0.25, 0x8a6236, x, 0, z, { delay: 0.75 + i * 0.05, rotation: [0, 0.5 + i, 0] }), 0.06, 0.0022));
    ripple(-0.95, 0.01, -0.5, 1.2, CREAM, 3, 0.9);
    ripple(0.55, 0.01, -1.2, 0.6, CREAM, 2.4, 1.1);
    ripple(-0.1, 0.01, 1.25, 0.6, CREAM, 2.2, 1.3);
    drift(Math.min(30 + threat.level * 3, 60), 0xbfeefd, 0.025, { vx: -0.25, vy: -2.6, bottom: 0, top: 3.4, delay: 0.5 });
  }

  // La notte lunga un anno ----------------------------------------------------

  function buildNight() {
    ground(0x1c1c28);
    const sky = box(6.4, 4.2, 0.08, 0x0b0b16, 0, 0, -2.15, { delay: 0.04, flat: true });
    const random = seededRandom(threat.name);
    decorate(
      sky,
      new OctahedronGeometry(0.035),
      CREAM,
      Array.from({ length: 18 }, () => [-3 + random() * 6, 1.8 + random() * 2.2, 0.06] as [number, number, number]),
    );
    // The black moon, only its rim lit.
    ball(0.6, 0x050508, 1.5, 2, -2, { delay: 0.1, flat: true, noInk: true });
    light(ring(0.62, 0.05, VIOLET, 1.5, 1.93, -1.98, { delay: 0.15, flat: true, noInk: true }));
    // The street going away from the camera, dark palazzi on both sides.
    box(1.6, 0.03, 4, 0x2c2c38, 0, 0, 0.1, { delay: 0.06, noInk: true });
    [-1.2, 1.2].forEach((x, i) => box(0.6, 0.08, 4, 0x3a3a48, x, 0, 0.1, { delay: 0.08 + i * 0.03 }));
    [
      [-2.35, -1.4],
      [2.35, -1.3],
      [-2.4, -0.2],
      [2.4, -0.1],
      [-2.35, 1],
      [2.35, 1.1],
    ].forEach(([x, z], i) =>
      tower(0.75, 1.2 + random() * 1.2, shade(TOWER_COLORS[i], 0.5), x, z, random, { delay: 0.12 + i * 0.05 }, 0x6a5f30),
    );
    // The lamps go out one by one, from the far end towards us, then all come back.
    const pairs = Math.min(4, 1 + Math.ceil(threat.level / 2));
    const lamps: Object3D[][] = [];
    for (let k = 0; k < pairs; k++) {
      const z = -1.5 + k * (3.1 / Math.max(1, pairs - 1));
      [-0.95, 0.95].forEach((x, side) => {
        cylinder(0.03, 0.045, 1.05, DARK, x, 0, z, { delay: 0.3 + k * 0.06 });
        box(0.18, 0.1, 0.18, STEEL, x, 1.05, z, { delay: 0.35 + k * 0.06 });
        const head = box(0.2, 0.12, 0.2, YELLOW, x, 1.04, z, { delay: 0.4 + k * 0.06, flat: true, noInk: true });
        const pool = cylinder(0.38, 0.38, 0.01, 0x5a5030, x * 0.85, 0.05, z, { delay: 0.4 + k * 0.06, flat: true, noInk: true });
        lamps[k * 2 + side] = [head, pool];
      });
    }
    const cycle = 1.5 + lamps.length * 0.7 + 2.5;
    tickers.push((t) => {
      const u = Math.max(0, t - 1.2) % cycle;
      lamps.forEach((lamp, i) => {
        const out = 1.5 + i * 0.7;
        const flicker = u > out - 0.35 && u < out && hash(Math.floor(t * 20) + i) > 0.5;
        const on = u < out - 0.35 || flicker || u > cycle - 0.05;
        for (const part of lamp) part.visible = on;
      });
    });
    // Eyes in the dark at the end of the street; the calendar's pages blowing past.
    figure(0, -1.45, 0.8, 1, DARK, YELLOW);
    drift(12, PAPER, 0.05, { vx: 0.25, vy: -0.15, bottom: 0.3, top: 2.8, delay: 1 });
  }

  // La Fine del Mondo ---------------------------------------------------------

  function buildApocalypse() {
    view.distance = 11.4;
    view.lookY = 1.1;
    // The red sky, banded, split by a purple crack.
    const sky = box(11, 5.8, 0.08, BLOOD, 0, -0.8, -2.6, { delay: 0.02, flat: true });
    box(11, 1, 0.06, 0xb8321f, 0, -0.6, -2.54, { delay: 0.05, flat: true, noInk: true });
    box(11, 0.6, 0.06, 0xe0621f, 0, -0.8, -2.52, { delay: 0.07, flat: true, noInk: true });
    const crack: [number, number][] = [
      [-3.4, 3.9],
      [-2.3, 3.3],
      [-1.4, 3.75],
      [-0.4, 3],
      [0.6, 3.55],
      [1.6, 2.85],
      [2.6, 3.35],
      [3.5, 2.95],
    ];
    const glow = new Group();
    sky.add(glow);
    for (let i = 1; i < crack.length; i++) {
      const [x1, y1] = crack[i - 1];
      const [x2, y2] = crack[i];
      stroke(sky, x1, y1 + 0.8, x2, y2 + 0.8, 0.26, VIOLET, 0.05);
      stroke(glow, x1, y1 + 0.8, x2, y2 + 0.8, 0.09, 0xf0dcff, 0.07);
    }
    stroke(sky, -0.4, 3.8, -0.1, 3.3, 0.1, VIOLET, 0.05);
    stroke(sky, 1.6, 3.65, 1.9, 3.1, 0.1, VIOLET, 0.05);
    blinking.push(glow);
    // The volcano erupting behind the city.
    cylinder(0.4, 1.6, 3.4, 0x5c4a46, -2.9, -1.2, -2.1, { delay: 0.1 });
    light(cylinder(0.34, 0.34, 0.05, LAVA, -2.9, 2.18, -2.1, { delay: 0.2, flat: true, noInk: true }));
    lavaTongue(-2.9, -1.2, -0.47, 0.26, 3.6, 0.34, 0.25);
    fountain(14, LAVA, new OctahedronGeometry(0.07), [-2.9, 2.25, -2.1], 1.8, 1.1, 2.4, 2, 0.8);
    plume(12, 0x2a1a1a, 0.18, [-2.9, 2.3, -2.1], 0.8, 1.6, 3.5, 0.6);
    // Nuova Megara on its disc, cracked with lava, crumbling at the rim.
    cylinder(2.55, 2.55, 0.25, 0x4a4040, 0, -0.25, 0, { delay: 0.12 });
    cylinder(2.45, 2.45, 0.02, 0x6a5a52, 0, 0, 0, { delay: 0.16, noInk: true });
    cone(2.4, 1.6, ROCK, 0, -0.25, 0, { delay: 0.14, rotation: [Math.PI, 0, 0] });
    [0.4, 1.5, 2.6, 4.1].forEach((angle, i) =>
      blinking.push(
        box(0.06, 0.02, 1.5, LAVA, Math.cos(angle) * 1.4, 0.03, Math.sin(angle) * 1.4, {
          delay: 0.3 + i * 0.05,
          flat: true,
          noInk: true,
          rotation: [0, -angle + Math.PI / 2, 0],
        }),
      ),
    );
    // The towers sink into the disc in jolts, then struggle back up.
    const random = seededRandom(threat.name);
    const slots: [number, number][] = [
      [-1.55, 0.55],
      [-0.2, -1.3],
      [1.1, -1],
      [-0.9, 0.3],
      [0.25, -0.1],
      [1.9, 0],
    ];
    slots.forEach(([x, z], k) => {
      const windows = tower(0.7 + random() * 0.2, 1.3 + random() * 1.1, TOWER_COLORS[k], x, z, random, { delay: 0.25 + k * 0.07 });
      const group = windows.parent as Group;
      const lean = (random() - 0.5) * 0.3;
      tickers.push((t) => {
        const u = (t + k * 1.3) % 9;
        const depth = u < 6 ? Math.min(3, Math.floor(u / 1.5)) * 0.22 + (hash(Math.floor(u / 1.5) + k) - 0.5) * 0.04 : 0.66 * (1 - (u - 6) / 3);
        group.position.y = -depth;
        group.rotation.z = lean * depth;
      });
    });
    greekTemple(1.15, 0, 1.05, 0.55, 0.6);
    figure(0.1, 1.55, 0.5, 1, CYAN, CREAM);
    // Chunks of the rim breaking off into the void.
    for (let k = 0; k < 6; k++) {
      const angle = 0.3 + k * 0.55;
      const x = Math.cos(angle) * 2.45;
      const z = Math.sin(angle) * 2.45;
      const chunk = box(0.32, 0.22, 0.3, ROCK, x, -0.2, z, { delay: 0.8 });
      tickers.push((t) => {
        const u = ((t + k * 0.9) % 3.2) / 3.2;
        chunk.position.y = -0.2 - 3.4 * u * u;
        chunk.rotation.x = u * 3;
        chunk.visible = u < 0.95;
      });
    }
    // The letters of the Alfabeto, orbiting the end of the world.
    const stones = Array.from({ length: 8 }, (_, k) => letterStone(GLYPHS[(k * 3) % GLYPHS.length], 0, 0, 0, 0.75, 0.9 + k * 0.06));
    const orbit = (t: number) =>
      stones.forEach((stone, k) => {
        const angle = t * 0.35 + (k / stones.length) * Math.PI * 2;
        stone.position.set(Math.cos(angle) * 3.1, 1.6 + Math.sin(angle * 2 + k) * 0.35, Math.sin(angle) * 1.9);
      });
    orbit(0);
    tickers.push(orbit);
    drift(26, ORANGE, 0.03, { vx: 0.1, vy: 0.45, bottom: -0.5, top: 3.6, delay: 0.9 });
    drift(18, 0x3a3030, 0.035, { vx: -0.15, vy: -0.35, bottom: -0.5, top: 3.6, delay: 1.1 });
  }

  // Il sismografo impazzito ---------------------------------------------------

  function buildSeismo() {
    view.distance = 10;
    view.lookY = 1.1;
    ground(0x23232b);
    // The city, low, trembling under the seismograph's paper.
    const random = seededRandom(threat.name);
    const blocks: [number, number, number][] = [
      [-2.4, -0.3, 1.2],
      [-1.55, 0.7, 0.8],
      [-2.3, 1.2, 0.6],
      [1.55, -0.35, 1.1],
      [2.4, 0.6, 0.9],
      [1.7, 1.3, 0.55],
      [0, -0.1, 0.85],
      [0, 0.9, 0.55],
    ];
    blocks.forEach(([x, z, h], k) => {
      const windows = tower(0.75, h, TOWER_COLORS[k % TOWER_COLORS.length], x, z, random, { delay: 0.1 + k * 0.05 });
      const group = windows.parent as Group;
      tickers.push((t) => {
        const strong = hash(Math.floor(t * 3) + k) > 0.55 ? 1 : 0.25;
        group.rotation.z = Math.sin(t * 31 + k) * 0.03 * strong;
      });
    });
    // The seismograph: a drum on two posts at the back, its pen on a long arm.
    box(3.4, 0.25, 0.6, DARK, 0, 0, -1.6, { delay: 0.3 });
    [-1.5, 1.5].forEach((x, i) => box(0.22, 2.1, 0.3, STEEL, x, 0.25, -1.6, { delay: 0.35 + i * 0.05 }));
    const roll = new CylinderGeometry(0.5, 0.5, 2.8, 24);
    roll.rotateZ(Math.PI / 2);
    const drum = centre(add(roll, PAPER, 0, 1.55, -1.6, { delay: 0.45 }), 0.5);
    for (let k = 0; k < 3; k++) {
      const face = new Group();
      face.rotation.x = (k / 3) * Math.PI * 2;
      drum.add(face);
      for (let i = 0; i < 9; i++) {
        const x = -1.25 + i * 0.28;
        stroke(face, x, (hash(i + k * 9) - 0.5) * 0.3, x + 0.28, (hash(i + 1 + k * 9) - 0.5) * 0.3, 0.03, VERMILION, 0.5);
      }
    }
    tickers.push((t) => (drum.rotation.x = -t * 1.2));
    box(0.14, 2.75, 0.14, STEEL, 1.95, 0, -1, { delay: 0.5 });
    const armGeometry = new BoxGeometry(1.9, 0.08, 0.08);
    armGeometry.translate(-0.95, 0, 0);
    const arm = add(armGeometry, VERMILION, 1.95, 2.6, -1.02, { delay: 0.6 });
    stroke(arm, -1.9, 0, -1.9, -0.25, 0.06, DARK);
    tickers.push((t) => {
      const jolt = (hash(Math.floor(t * 4)) - 0.5) * 0.25;
      arm.rotation.z = 0.28 + Math.sin(t * 9) * 0.12 + Math.sin(t * 23) * 0.06 + jolt;
    });
    // The paper, unrolled from the drum over the roofs to the front edge.
    const path: [number, number][] = [
      [1.7, -1.25],
      [0.88, -0.55],
      [0.88, 0.35],
      [0.58, 0.45],
      [0.58, 1.35],
      [0.02, 1.75],
      [0.02, 2.1],
    ];
    for (let i = 1; i < path.length; i++) {
      const [y1, z1] = path[i - 1];
      const [y2, z2] = path[i];
      const length = Math.hypot(y2 - y1, z2 - z1);
      const sheet = box(1.3, length, 0.02, PAPER, 0, y1, z1, {
        delay: 0.7 + i * 0.08,
        noInk: true,
        rotation: [Math.atan2(z2 - z1, y2 - y1), 0, 0],
      });
      const wild = 0.12 + i * 0.07;
      for (let j = 0; j < 4; j++) {
        stroke(sheet, (hash(i * 5 + j) - 0.5) * wild * 2, (j / 4) * length, (hash(i * 5 + j + 1) - 0.5) * wild * 2, ((j + 1) / 4) * length, 0.03, VERMILION, 0.015);
      }
    }
    add(new CylinderGeometry(0.08, 0.08, 1.3, 12), PAPER, 0.65, 0.02, 2.1, { delay: 1.3, rotation: [0, 0, Math.PI / 2] });
  }

  // Megara Due ----------------------------------------------------------------

  function buildTwin() {
    // Seen from the level of the crust: Megara on top, Megara Due beneath in negative.
    view.distance = 11.6;
    view.height = 1.9;
    view.lookY = 0.3;
    box(6, 0.16, 4.3, 0x4a4f5c, 0, -0.16, 0, { delay: 0, ink: 1.02 });
    light(box(6.03, 0.04, 4.33, CYAN, 0, -0.1, 0, { delay: 0.1, flat: true, noInk: true }));
    const above = seededRandom(threat.name);
    const below = seededRandom(threat.name);
    TOWER_SLOTS.slice(0, 6).forEach(([x, z], i) => {
      const w = 0.75 + above() * 0.2;
      const h = 1 + above() * 1.1;
      tower(w, h, TOWER_COLORS[i], x, z, above, { delay: 0.12 + i * 0.08 }, YELLOW);
      const w2 = 0.75 + below() * 0.2;
      const h2 = 1 + below() * 1.1;
      const windows = tower(w2, h2, negative(TOWER_COLORS[i]), x, z, below, { delay: 0.5 + i * 0.08, rotation: [0, 0, Math.PI] }, negative(YELLOW), -0.16);
      const group = windows.parent as Group;
      tickers.push((t) => (group.rotation.z = Math.PI + Math.sin(t * 1.2 + i) * 0.03));
    });
    greekTemple(1.2, 0, 0.95, 0.55, 0.6);
    greekTemple(1.2, -0.16, 0.95, 0.55, 0.9, negative(CREAM), true);
    drift(14, CYAN, 0.03, { vx: 0.15, vy: 0, bottom: -0.12, top: -0.02, delay: 1 });
  }

  // Actors of the very rare threats -------------------------------------------

  function brokenMirrors(delay: number) {
    // Three mirrors on pivots, turning on their own; each shows a silhouette that is not yours.
    const head = new SphereGeometry(0.12, 10, 8);
    geometries.push(head);
    const spots: [number, number, number][] = [
      [-0.1, 0.95, 0.4],
      [1, 0.4, -0.2],
      [2.1, 1, -0.5],
    ];
    spots.forEach(([x, z, yaw], i) => {
      cylinder(0.2, 0.26, 0.1, DARK, x, 0, z, { delay: delay + i * 0.1 });
      const frame = box(0.95, 1.6, 0.1, 0xc8a24a, x, 0.1, z, { delay: delay + 0.06 + i * 0.1, rotation: [0, yaw, 0] });
      for (const side of [1, -1]) {
        const glass = new Mesh(unitBox, flatMaterial(CYAN));
        glass.scale.set(0.8, 1.42, 0.02);
        glass.position.set(0, 0.8, side * 0.055);
        frame.add(glass);
        const f = side * 0.068;
        const face = new Mesh(head, flatMaterial(DARK));
        face.scale.z = 0.3;
        face.position.set(0, i === 2 ? 0.4 : 1.1, f);
        frame.add(face);
        stroke(frame, 0, i === 2 ? 0.55 : 0.55, 0, i === 2 ? 1.05 : 0.95, 0.26, DARK, f);
        if (i === 0) {
          stroke(frame, -0.08, 1.18, -0.2, 1.38, 0.05, DARK, f);
          stroke(frame, 0.08, 1.18, 0.2, 1.38, 0.05, DARK, f);
        }
        if (i === 1) {
          stroke(frame, -0.12, 0.9, -0.3, 1.3, 0.07, DARK, f);
          stroke(frame, 0.12, 0.9, 0.3, 1.3, 0.07, DARK, f);
        }
        stroke(frame, -0.06, i === 2 ? 0.38 : 1.12, 0.06, i === 2 ? 0.38 : 1.12, 0.03, YELLOW, f * 1.15);
        stroke(frame, -0.32, 1.4, 0.05, 0.85, 0.02, CREAM, f * 1.1);
        stroke(frame, 0.05, 0.85, 0.3, 0.3, 0.02, CREAM, f * 1.1);
      }
      tickers.push((t) => (frame.rotation.y = yaw + t * (0.5 + i * 0.3) * (i % 2 ? -1 : 1)));
    });
    for (let k = 0; k < 6; k++) {
      add(new OctahedronGeometry(0.08), CYAN, -0.6 + k * 0.55, 0, 1.45 + (k % 2) * 0.3, { delay: delay + 0.4 + k * 0.04, rotation: [k, k * 2, 0.4] });
    }
  }

  function swarm(delay: number) {
    // A cloud of drones weaving between the towers.
    const count = 10 + Math.min(threat.level, 12);
    const bodyGeometry = new BoxGeometry(0.32, 0.1, 0.32);
    const rotorGeometry = new BoxGeometry(0.6, 0.02, 0.06);
    const eyeGeometry = new BoxGeometry(0.15, 0.045, 0.02);
    eyeGeometry.translate(0, 0, 0.165);
    geometries.push(bodyGeometry, rotorGeometry, eyeGeometry);
    const scaleVector = new Vector3();
    const bodies = new InstancedMesh(bodyGeometry, flatMaterial(DARK), count);
    const rotors = new InstancedMesh(rotorGeometry, flatMaterial(CYAN), count * 2);
    const eyes = new InstancedMesh(eyeGeometry, flatMaterial(VERMILION), count);
    const random = seededRandom(`${threat.name}:swarm`);
    const homes = Array.from({ length: count }, () => [-2.5 + random() * 5, 1 + random() * 2.5, -0.3 + random() * 2, 0.4 + random() * 0.6, random() * 6]);
    const place = (t: number, grow: boolean) => {
      homes.forEach(([cx, cy, cz, f, p], i) => {
        const s = grow ? Math.min(1, Math.max(0.001, (t - i * 0.04) / 0.4)) : 1;
        const x = cx + Math.sin(t * f + p) * 0.45;
        const y = cy + Math.sin(t * f * 1.7 + p) * 0.18;
        const z = cz + Math.cos(t * f + p) * 0.3;
        matrix.makeScale(s, s, s).setPosition(x, y, z);
        bodies.setMatrixAt(i, matrix);
        eyes.setMatrixAt(i, matrix);
        for (let k = 0; k < 2; k++) {
          matrix.makeRotationY(t * 20 + i + (k * Math.PI) / 2);
          matrix.scale(scaleVector.set(s, s, s));
          matrix.setPosition(x, y + 0.06, z);
          rotors.setMatrixAt(i * 2 + k, matrix);
        }
      });
      bodies.instanceMatrix.needsUpdate = rotors.instanceMatrix.needsUpdate = eyes.instanceMatrix.needsUpdate = true;
    };
    place(0, false);
    root.add(bodies, rotors, eyes);
    tickers.push((t) => {
      bodies.visible = rotors.visible = eyes.visible = t > delay;
      if (bodies.visible) place(t - delay, true);
    });
    drift(30, DARK, 0.03, { vx: 0.35, vy: 0.02, bottom: 2.4, top: 3.9, delay });
  }

  function blackout(delay: number) {
    // The pylon that blew, its cut cable sparking.
    const x = 2.3;
    const z = 1.35;
    box(0.1, 1.5, 0.1, STEEL, x, 0, z, { delay });
    box(0.7, 0.07, 0.07, STEEL, x, 1.3, z, { delay: delay + 0.06 });
    box(0.03, 1.1, 0.03, DARK, x - 0.3, 0.3, z + 0.05, { delay: delay + 0.1, noInk: true, rotation: [0, 0, 0.9] });
    fountain(10, YELLOW, new OctahedronGeometry(0.035), [x - 0.75, 0.35, z + 0.05], 0.6, 0.45, 0.35, 0.9, delay + 0.3);
    // Someone with a torch: the only steady light in the street.
    figure(-0.95, 1.35, 0.75, delay + 0.2, 0x3a6a55, CREAM);
    cone(0.28, 0.95, 0xfff3a0, -1.75, 0.4, 1.4, { delay: delay + 0.35, flat: true, noInk: true, rotation: [0, 0, -1.4] });
  }

  function boxing(delay: number) {
    const x = 1.35;
    const z = 0.55;
    // A barge between containers, and the ring on it.
    box(2.5, 0.3, 2, DARK, x, 0, z, { delay });
    box(0.9, 0.42, 0.42, CREAM, x - 0.8, 0.3, z - 0.75, { delay: delay + 0.05 });
    box(0.9, 0.42, 0.42, ORANGE, x + 0.8, 0.3, z - 0.75, { delay: delay + 0.08 });
    box(0.9, 0.42, 0.42, GREEN, x + 0.8, 0.72, z - 0.75, { delay: delay + 0.11 });
    box(1.5, 0.18, 1.2, 0x3a4a7a, x, 0.3, z + 0.3, { delay: delay + 0.12 });
    box(1.4, 0.02, 1.1, CREAM, x, 0.48, z + 0.3, { delay: delay + 0.16, noInk: true });
    const corners: [number, number, number][] = [
      [-0.68, -0.22, VERMILION],
      [0.68, -0.22, CYAN],
      [-0.68, 0.82, CREAM],
      [0.68, 0.82, CREAM],
    ];
    corners.forEach(([dx, dz, color], i) => cylinder(0.04, 0.04, 0.55, color, x + dx, 0.48, z + dz, { delay: delay + 0.2 + i * 0.03 }));
    [0.18, 0.34, 0.5].forEach((h, i) => {
      const rope = i % 2 ? CREAM : VERMILION;
      box(1.36, 0.025, 0.025, rope, x, 0.48 + h, z - 0.22, { delay: delay + 0.3, noInk: true });
      box(1.36, 0.025, 0.025, rope, x, 0.48 + h, z + 0.82, { delay: delay + 0.3, noInk: true });
      box(0.025, 0.025, 1.04, rope, x - 0.68, 0.48 + h, z + 0.3, { delay: delay + 0.3, noInk: true });
      box(0.025, 0.025, 1.04, rope, x + 0.68, 0.48 + h, z + 0.3, { delay: delay + 0.3, noInk: true });
    });
    // The champion of the containers, belt on and glove up, and the challenger.
    const boxer = (bx: number, skin: number, trunks: number, raised: boolean, wait: number) => {
      const first = parts.length;
      const y = 0.5;
      const bz = z + 0.3;
      [-0.07, 0.07].forEach((dx) => box(0.09, 0.26, 0.1, skin, bx + dx, y, bz, { delay: delay + wait }));
      box(0.3, 0.15, 0.2, trunks, bx, y + 0.26, bz, { delay: delay + wait + 0.04 });
      box(0.32, 0.32, 0.2, skin, bx, y + 0.41, bz, { delay: delay + wait + 0.08 });
      ball(0.12, skin, bx, y + 0.73, bz, { delay: delay + wait + 0.12 });
      ball(0.09, VERMILION, bx - 0.22, y + (raised ? 0.95 : 0.55), bz + 0.08, { delay: delay + wait + 0.16 });
      ball(0.09, VERMILION, bx + 0.22, y + 0.55, bz + 0.1, { delay: delay + wait + 0.16 });
      if (raised) box(0.34, 0.07, 0.22, YELLOW, bx, y + 0.3, bz, { delay: delay + wait + 0.2 });
      heave(first, 0.06, 0.008);
    };
    boxer(x - 0.35, 0xe8b98a, ORANGE, true, 0.4);
    boxer(x + 0.35, 0x9a6a4a, CYAN, false, 0.5);
    [-0.6, 0.6].forEach((dx, i) => light(box(0.07, 0.07, 0.07, YELLOW, x + dx, 0.75 + i * 0.42, z - 0.53, { delay: delay + 0.7, flat: true, noInk: true })));
  }

  function tide(delay: number) {
    const ink = 0x1c1c2c;
    // The water turns black and oily.
    box(3, 0.04, 2.4, 0x14141f, 1.45, 0, 0.95, { delay, flat: true, noInk: true });
    [
      [0.8, 1.6],
      [2.2, 0.6],
      [1.6, 1.9],
    ].forEach(([x, z], i) => box(0.4, 0.05, 0.16, VIOLET, x, 0, z, { delay: delay + 0.1 + i * 0.04, flat: true, noInk: true }));
    // The wave: a black curl rearing over the port, with eyes.
    const swell = new SphereGeometry(0.95, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    swell.scale(1.05, 1.15, 0.75);
    add(swell, ink, 1.8, 0, 0.5, { delay: delay + 0.12 });
    add(new TorusGeometry(0.85, 0.42, 10, 24, Math.PI * 0.8), ink, 1.65, 0, 0.5, {
      delay: delay + 0.15,
      outline: new TorusGeometry(0.85, 0.46, 10, 24, Math.PI * 0.8),
    });
    [0.8, 0.98, 1.16].forEach((x, i) =>
      cone(0.07, 0.3, VIOLET, x, 0.95 - i * 0.04, 0.55 + i * 0.12, { delay: delay + 0.35 + i * 0.04, rotation: [Math.PI, 0, 0] }),
    );
    [-0.22, 0.22].forEach((dx) => light(box(0.16, 0.1, 0.05, YELLOW, 1.85 + dx, 1.3, 0.95, { delay: delay + 0.4, flat: true, noInk: true })));
    // Tentacles out of the black water, swaying; one reaches for the crane.
    const tentacles: [number, number, number, number][] = [
      [0.3, 1.5, 1.3, 0.3],
      [2.6, 1.4, 1.6, -0.25],
      [0.95, 1.95, 0.9, 0.15],
      [0.15, -0.55, 2, 0.3],
    ];
    const curl = new TorusGeometry(0.14, 0.045, 6, 12, Math.PI * 1.3);
    geometries.push(curl);
    tentacles.forEach(([x, z, length, lean], k) => {
      const arm = cylinder(0.04, 0.14, length, 0x2a1f3f, x, 0, z, { delay: delay + 0.3 + k * 0.08, rotation: [0, 0, lean] });
      const tip = new Mesh(curl, flatMaterial(0x2a1f3f));
      tip.position.set(lean > 0 ? -0.12 : 0.12, length, 0);
      arm.add(tip);
      decorate(
        arm,
        new SphereGeometry(0.035, 6, 4),
        CREAM,
        [0.25, 0.45, 0.65].map((h) => [0.06 * (1 - h), length * h, 0.08] as [number, number, number]),
      );
      tickers.push((t) => (arm.rotation.z = lean + Math.sin(t * 1.4 + k) * 0.12));
    });
    plume(8, VIOLET, 0.05, [1.6, 0.05, 1.3], 0.9, 0.6, 2.2, delay + 0.6);
  }

  function ship(delay: number) {
    const x = 0.2;
    const y = 0.75;
    const z = 0.3;
    const first = parts.length;
    // The hull, a V-shaped keel with a deck and two castles.
    const keel = new CylinderGeometry(1, 1, 2.6, 3);
    keel.rotateX(Math.PI / 2);
    keel.rotateY(Math.PI / 2);
    keel.scale(1, 0.6, 0.45);
    add(keel, 0x6b4a2a, x, y, z, { delay });
    box(2.5, 0.08, 0.78, 0x8a6236, x, y + 0.88, z, { delay: delay + 0.08 });
    box(0.6, 0.35, 0.78, 0x6b4a2a, x - 1, y + 0.96, z, { delay: delay + 0.12 });
    box(0.4, 0.22, 0.62, 0x6b4a2a, x + 1.05, y + 0.96, z, { delay: delay + 0.14 });
    cylinder(0.025, 0.04, 0.8, 0x5c3f24, x + 1.25, y + 1, z, { delay: delay + 0.16, rotation: [0, 0, -1.1] });
    // Two masts and their torn sails.
    [
      [-0.35, 1.6],
      [0.45, 1.4],
    ].forEach(([dx, height], m) => {
      const mx = x + dx;
      const wait = delay + 0.2 + m * 0.1;
      cylinder(0.04, 0.05, height, 0x5c3f24, mx, y + 0.96, z, { delay: wait });
      const top = box(0.72, 0.4, 0.03, PAPER, mx, y + 0.96 + height - 0.55, z + 0.06, { delay: wait + 0.1, rotation: [0, 0.2, 0.06] });
      stroke(top, -0.15, 0.1, 0.05, 0.3, 0.03, DARK, 0.02);
      box(0.34, 0.42, 0.03, PAPER, mx - 0.2, y + 1.25, z + 0.06, { delay: wait + 0.15, rotation: [0, 0.2, -0.14] });
      box(0.28, 0.28, 0.03, PAPER, mx + 0.22, y + 1.38, z + 0.06, { delay: wait + 0.18, rotation: [0, 0.2, 0.22] });
      box(0.3, 0.14, 0.02, VERMILION, mx + 0.16, y + 0.96 + height, z, { delay: wait + 0.22 });
    });
    // The fools on deck, in jester hats.
    [-0.2, 0.15, 0.85].forEach((dx, i) => {
      const fx = x + dx;
      cylinder(0.07, 0.11, 0.3, i % 2 ? CYAN : ORANGE, fx, y + 0.96, z + 0.22, { delay: delay + 0.45 + i * 0.05 });
      ball(0.08, 0xe8c9a0, fx, y + 1.24, z + 0.22, { delay: delay + 0.5 + i * 0.05 });
      [-1, 1].forEach((side) =>
        cone(0.05, 0.2, side < 0 ? YELLOW : VERMILION, fx + side * 0.05, y + 1.36, z + 0.22, { delay: delay + 0.55 + i * 0.05, rotation: [0, 0, -side * 0.7] }),
      );
    });
    heave(first, 0.15, 0.0013);
  }

  function flock(delay: number) {
    // Letter stones flying in a V, swooping over the clouds.
    const count = 5 + Math.min(threat.level, 9);
    const offsets: [number, number, number][] = [];
    const stones: Group[] = [];
    for (let i = 0; i < count; i++) {
      const rank = Math.ceil(i / 2);
      const side = i % 2 ? 1 : -1;
      offsets.push([side * rank * 0.5, rank * 0.13, -rank * 0.3]);
      stones.push(letterStone(GLYPHS[(i * 5) % GLYPHS.length], 0, 0, 0, 0.7, delay + i * 0.05, i === 0 ? YELLOW : CYAN));
    }
    const fly = (t: number) => {
      const cx = Math.sin(t * 0.45) * 1.1;
      const cy = 1.3 + Math.sin(t * 0.8) * 0.25;
      const cz = 0.6 + Math.cos(t * 0.45) * 0.4;
      stones.forEach((stone, i) => {
        const [ox, oy, oz] = offsets[i];
        stone.position.set(cx + ox, cy + oy + Math.sin(t * 3 + i) * 0.06, cz + oz);
        stone.rotation.z = Math.sin(t * 2 + i) * 0.15;
      });
    };
    fly(0);
    tickers.push(fly);
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
    desert: buildDesert,
    jungle: buildJungle,
    sunken: buildSunken,
    ice: buildIce,
    japan: buildJapan,
    volcano: buildVolcano,
    belltower: buildBelltower,
    market: buildMarket,
    sea: buildSea,
    labyrinth: buildLabyrinth,
    upside: buildUpside,
    dig: buildDig,
    townhall: buildTownhall,
    ringroad: buildRingroad,
    oracle: buildOracle,
    plant: buildPlant,
    vault: buildVault,
    noon: buildNoon,
    flood: buildFlood,
    night: buildNight,
    apocalypse: buildApocalypse,
    seismo: buildSeismo,
    twin: buildTwin,
  };
  BUILDERS[threat.scene.environment]();

  // A boss's fronts: a pedestal and a lamp each, dark until someone takes the front.
  const beacons: MeshBasicMaterial[] = [];
  const beaconColors: (number | null)[] = [];
  if (threat.beacons) {
    const { count } = threat.beacons;
    for (let i = 0; i < count; i++) {
      const x = (i - (count - 1) / 2) * 0.88;
      cylinder(0.13, 0.18, 0.22, STEEL, x, 0, 1.6, { delay: 1 + i * 0.06 });
      const lamp = ball(0.15, DARK, x, 0.22, 1.6, { delay: 1.05 + i * 0.06, flat: true });
      beacons.push((lamp.children[0] as Mesh).material as MeshBasicMaterial);
      beaconColors.push(null);
    }
  }
  /** Lights the beacons as the match says; whether anything changed. */
  function lightBeacons(): boolean {
    if (!threat.beacons) return false;
    const colors = threat.beacons.colors();
    let changed = false;
    beacons.forEach((material, i) => {
      const color = colors[i] ?? null;
      if (color === beaconColors[i]) return;
      beaconColors[i] = color;
      material.color.setHex(color ?? DARK);
      changed = true;
    });
    return changed;
  }

  const distance = view.distance ?? (level >= 5 ? 10 : 9.2);
  camera.position.set(0, view.height ?? distance * 0.34, distance);
  camera.lookAt(0, view.lookY ?? (level >= 5 ? 1.2 : 0.75), 0);

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

  const shakes = level >= 5;
  let frame = 0;
  let start = 0;
  let previous = 0;
  let slowFrames = 0;
  const popMs = (Math.max(...parts.map((part) => part.delay)) + POP_SECONDS) * 1000;

  function draw(now: number, settled: boolean) {
    lightBeacons();
    const elapsed = (now - start) / 1000;
    for (const { group, delay } of parts) {
      const x = settled ? 1 : Math.min(1, Math.max(0, (elapsed - delay) / POP_SECONDS));
      const eased = x >= 1 ? 1 : easeOutBack(x);
      const wide = 1 - (1 - eased) * 0.5;
      group.scale.set(Math.max(0.001, wide), Math.max(0.001, eased), Math.max(0.001, wide));
    }
    for (const item of drifting) {
      item.mesh.visible = settled || elapsed > item.delay;
      if (item.mesh.visible) placeDrift(item, settled ? 0 : elapsed);
    }
    if (!settled) {
      for (const part of blinking) part.visible = Math.sin(now * 0.012) > -0.6;
      for (const part of spinning) part.rotation.y = now * 0.0014;
      for (const { group, base, height, speed } of bobbing) group.position.y = base + Math.abs(Math.sin(now * speed)) * height;
      for (const tick of tickers) tick(elapsed);
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
  // A still scene still shows a front being taken.
  const relight = still && threat.beacons ? setInterval(() => lightBeacons() && draw(start, true), 1000) : undefined;

  return () => {
    cancelAnimationFrame(frame);
    clearInterval(relight);
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
