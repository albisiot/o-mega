import {
  AmbientLight,
  BackSide,
  Box3,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DataTexture,
  DirectionalLight,
  ExtrudeGeometry,
  Group,
  InstancedMesh,
  Material,
  MathUtils,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  NearestFilter,
  type Object3D,
  OctahedronGeometry,
  PerspectiveCamera,
  RedFormat,
  RingGeometry,
  Scene,
  SphereGeometry,
  Vector3,
  WebGLRenderer,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { Font, type FontData } from "three/addons/loaders/FontLoader.js";
import { NAME_FONTS, nameStyle } from "@/lib/card-names";
import { DIORAMAS, type DioramaBuilder } from "@/lib/diorama-index";
import { octagonBase, type Framing, type Kit } from "@/lib/diorama-kit";

// Scontro a squadre (docs/COMBAT.md): the battlefield in 3D. Every character stands on the board
// as its whole diorama (src/lib/dioramas), the enemy far, the player's team near, front lines in
// the middle; each base has a plate in front with the character's name in 3D letters, in the
// colours and typeface of the card's name. Ten dioramas drawn part by part would be thousands of
// draws a frame, too many for a phone: the parts that never move are merged, colour by colour,
// into a few meshes per diorama, and only the moving ones (a flashing beacon, a swinging lure)
// stay apart. The screen (src/components/combat-board.tsx) draws the life bars and the numbers
// over it, where this module says each character stands.

/** A character on the board: `player` for the player's side; places 0-1 front line, 2-4 back. */
export type BoardFighter = { key: string; code: string | null; name: string; player: boolean; position: number };
/** How a character looks at a step of the battle. */
export type BoardLook = { key: string; acting: boolean; targetable: boolean; struck: boolean; down: boolean };
/** Where a character is on the canvas, in CSS pixels: under its plate, its middle, and its whole box. */
export type BoardAnchor = {
  key: string;
  hud: { x: number; y: number };
  middle: { x: number; y: number };
  box: { x: number; y: number; width: number; height: number };
};
export type CombatBoard = {
  /** The looks at a step; a struck character shakes again at every new step. */
  show(looks: BoardLook[], step: number): void;
  dispose(): void;
};

const STEP_X = 5.75;
const ROW_STEP = 8.4;
const HALF_GAP = 4.6;
const BASE_RADIUS = 2.62;
const PLATE_WIDTH = 4.8;
const REST_YAW = -0.35;
const FOV = 20;
const ELEVATION = MathUtils.degToRad(52);
/** Room left under the lowest plates for their life bars, in CSS pixels. */
const HUD_ROOM = 30;
const PLAYER_COLOR = 0x16c8ff;
const ENEMY_COLOR = 0xff2e6c;
const FRAME_MS = 1000 / 30;
const FRAME_MARGIN_MS = 4;
const SLOW_FRAME_MS = 66;
const SLOW_FRAMES_LIMIT = 20;
const POP_SECONDS = 0.45;
const POP_STAGGER = 0.07;
const SHAKE_SECONDS = 0.45;
/** Times at which the diorama's own motion is sampled to find the parts that move. */
const SAMPLE_TIMES = [0.4, 1.3, 2.2, 3.7, 5.9, 8.3];

/** Where a place is on the board (its base's centre on the floor). */
export function boardSlot(player: boolean, position: number): { x: number; z: number } {
  const front = position < 2;
  const x = front ? (position - 0.5) * STEP_X : (position - 3) * STEP_X;
  const depth = front ? HALF_GAP : HALF_GAP + ROW_STEP;
  return { x, z: player ? depth : -depth };
}

/** The first hex colour in a CSS paint, for the face of the 3D letters. */
export function firstHex(css: string, fallback: string): string {
  return css.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/)?.[0] ?? fallback;
}

type Speck = { mesh: InstancedMesh; start: Float32Array; speed: Float32Array; bottom: number; top: number; delay: number };

/** A diorama built for the board: still parts merged, moving parts and specks on their own. */
export type BoardDiorama = {
  root: Group;
  framing: Framing;
  tickers: ((elapsed: number) => void)[];
  specks: Speck[];
  /** Parts drawn on their own because they move. */
  live: Group[];
  /** The merged still parts, and the draws they replaced. */
  merged: Mesh[];
  parts: number;
  geometries: BufferGeometry[];
  materials: Material[];
};

/** Swaps the second and third corner of every triangle, after a mirroring transform. */
function flipWinding(geometry: BufferGeometry) {
  const index = geometry.index;
  if (index) {
    for (let i = 0; i < index.count; i += 3) {
      const b = index.getX(i + 1);
      index.setX(i + 1, index.getX(i + 2));
      index.setX(i + 2, b);
    }
    index.needsUpdate = true;
    return;
  }
  for (const attribute of Object.values(geometry.attributes)) {
    const size = attribute.itemSize;
    const array = attribute.array;
    for (let i = 0; i + 2 < attribute.count; i += 3) {
      for (let k = 0; k < size; k++) {
        const b = array[(i + 1) * size + k];
        array[(i + 1) * size + k] = array[(i + 2) * size + k];
        array[(i + 2) * size + k] = b;
      }
    }
    attribute.needsUpdate = true;
  }
}

/** What the diorama's motion may change on an object: its place, visibility and colour. */
function ownState(object: Object3D): string {
  const values: number[] = [object.visible ? 1 : 0, ...object.position.toArray(), object.rotation.x, object.rotation.y, object.rotation.z, ...object.scale.toArray()];
  const material = (object as Mesh).material;
  if (material && !Array.isArray(material)) {
    const color = (material as MeshBasicMaterial).color;
    if (color) values.push(color.r, color.g, color.b);
    values.push(material.opacity, material.visible ? 1 : 0);
  }
  return values.map((value) => value.toFixed(4)).join(",");
}

/**
 * Builds a character's diorama for the board, finished (no pop-up of its parts): the parts its
 * own motion never touches are merged into one mesh per kind of material, with their colours in
 * the vertices; the others stay apart and keep moving.
 */
export function buildBoardDiorama(build: DioramaBuilder, toonSteps: DataTexture, ink: MeshBasicMaterial): BoardDiorama {
  const root = new Group();
  const parts: Group[] = [];
  const tickers: ((elapsed: number) => void)[] = [];
  const specks: Speck[] = [];
  const geometries: BufferGeometry[] = [];
  const materials: Material[] = [];
  const matrix = new Matrix4();

  const add: Kit["add"] = (geometry, color, x, y, z, options) => {
    geometry.computeBoundingBox();
    const lift = -(geometry.boundingBox?.min.y ?? 0);
    geometry.translate(0, lift, 0);
    geometries.push(geometry);
    const group = new Group();
    group.position.set(x, y, z);
    if (options.rotation) group.rotation.set(...options.rotation);
    const material = options.flat ? new MeshBasicMaterial({ color }) : new MeshToonMaterial({ color, gradientMap: toonSteps });
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
    root.add(group);
    parts.push(group);
    return group;
  };
  const kit: Kit = {
    add,
    box: (w, h, d, color, x, y, z, options) => add(new BoxGeometry(w, h, d), color, x, y, z, options),
    cylinder: (top, bottom, h, color, x, y, z, options, sides = 14) => add(new CylinderGeometry(top, bottom, h, sides), color, x, y, z, options),
    ball: (radius, color, x, y, z, options) => add(new SphereGeometry(radius, 16, 12), color, x, y, z, options),
    decorate(part, geometry, color, spots) {
      const material = new MeshBasicMaterial({ color });
      geometries.push(geometry);
      materials.push(material);
      for (const [x, y, z, lean = 0] of spots) {
        const mesh = new Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.rotation.z = lean;
        part.add(mesh);
      }
      return material;
    },
    tick: (update) => tickers.push(update),
    motes(count, color, size, from, to, delay) {
      const geometry = new OctahedronGeometry(size);
      const material = new MeshBasicMaterial({ color });
      geometries.push(geometry);
      materials.push(material);
      const mesh = new InstancedMesh(geometry, material, count);
      const start = new Float32Array(count * 3);
      const speed = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        // Spread by a fixed pattern: the same specks on every phone.
        const r = (n: number) => {
          const v = Math.sin((i + 1) * 127.1 + n * 311.7) * 43758.5453;
          return v - Math.floor(v);
        };
        start[i * 3] = MathUtils.lerp(from[0], to[0], r(1));
        start[i * 3 + 1] = MathUtils.lerp(from[1], to[1], r(2));
        start[i * 3 + 2] = MathUtils.lerp(from[2], to[2], r(3));
        speed[i] = 0.12 + r(4) * 0.18;
        mesh.setMatrixAt(i, matrix.makeTranslation(start[i * 3], start[i * 3 + 1], start[i * 3 + 2]));
      }
      root.add(mesh);
      specks.push({ mesh, start, speed, bottom: from[1], top: to[1], delay });
    },
  };
  const framing = build(kit);

  // What the diorama's own motion changes: run it at a few moments and note every object whose
  // place, visibility or colour moves. Whatever never changes is merged, as far up as it can be:
  // the still parts all together, and inside a part that moves (a wall that shakes, an arm that
  // waves) all it holds that never changes on its own.
  const objects: Object3D[] = [];
  root.traverse((object) => objects.push(object));
  const first = objects.map(ownState);
  const changes = new Set<Object3D>();
  for (const at of SAMPLE_TIMES) {
    for (const update of tickers) update(at);
    objects.forEach((object, i) => {
      if (!changes.has(object) && ownState(object) !== first[i]) changes.add(object);
    });
  }
  for (const update of tickers) update(0);
  root.updateMatrixWorld(true);
  const settled = new Map<Object3D, boolean>();
  /** Whether nothing under an object (the object itself aside) ever changes. */
  const settledInside = (object: Object3D): boolean => {
    if (!settled.has(object)) settled.set(object, object.children.every((child) => !changes.has(child) && settledInside(child)));
    return settled.get(object)!;
  };
  const canMerge = (mesh: Mesh) => {
    const material = mesh.material;
    return !(mesh as InstancedMesh).isInstancedMesh && !Array.isArray(material) && !material.transparent && (material === ink || material.side !== BackSide);
  };

  const color = new Color();
  const merged: Mesh[] = [];
  /**
   * Merges meshes into the frame `toFrame` maps their world space to, one mesh per kind (lit or
   * flat, indexed or not) with the colours in the vertices. The ink outlines go with the lit ones:
   * black and turned inside out, they draw the same as on their own.
   */
  const mergeInto = (meshes: Mesh[], toFrame: Matrix4, parent: Object3D) => {
    const buckets = new Map<string, BufferGeometry[]>();
    const transform = new Matrix4();
    for (const mesh of meshes) {
      const material = mesh.material as MeshBasicMaterial | MeshToonMaterial;
      const outline = material === ink;
      const kind = outline || (material as MeshToonMaterial).isMeshToonMaterial ? "toon" : "flat";
      const geometry = mesh.geometry.clone();
      geometry.clearGroups();
      for (const name of Object.keys(geometry.attributes)) {
        if (name !== "position" && !(name === "normal" && kind === "toon")) geometry.deleteAttribute(name);
      }
      geometry.morphAttributes = {};
      if (kind === "toon" && !geometry.getAttribute("normal")) geometry.computeVertexNormals();
      transform.multiplyMatrices(toFrame, mesh.matrixWorld);
      geometry.applyMatrix4(transform);
      if (transform.determinant() < 0 !== outline) flipWinding(geometry);
      if (outline) color.setRGB(0, 0, 0);
      else color.copy(material.color);
      const colors = new Float32Array(geometry.getAttribute("position").count * 3);
      for (let i = 0; i < colors.length; i += 3) colors.set([color.r, color.g, color.b], i);
      geometry.setAttribute("color", new BufferAttribute(colors, 3));
      const key = `${kind}:${geometry.index ? "i" : "n"}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(geometry);
    }
    for (const [key, list] of buckets) {
      const geometry = mergeGeometries(list, false);
      list.forEach((piece) => piece.dispose());
      if (!geometry) continue;
      const material = key.startsWith("toon")
        ? new MeshToonMaterial({ color: 0xffffff, vertexColors: true, gradientMap: toonSteps })
        : new MeshBasicMaterial({ color: 0xffffff, vertexColors: true });
      materials.push(material);
      geometries.push(geometry);
      const mesh = new Mesh(geometry, material);
      mesh.userData.colors = (geometry.getAttribute("color").array as Float32Array).slice();
      merged.push(mesh);
      parent.add(mesh);
    }
  };

  /** Merges what never changes under a node into its frame, and goes down into what does. */
  const compact = (node: Object3D) => {
    const fixed: Mesh[] = [];
    const gone: Object3D[] = [];
    for (const child of [...node.children]) {
      if (!changes.has(child) && settledInside(child)) {
        const meshes: Mesh[] = [];
        let whole = true;
        // An object never shown is dropped: nothing ever makes it visible.
        child.traverseVisible((object) => {
          const mesh = object as Mesh;
          if (!mesh.isMesh) return;
          if (canMerge(mesh)) meshes.push(mesh);
          else whole = false;
        });
        if (whole) {
          fixed.push(...meshes);
          gone.push(child);
          continue;
        }
      }
      if (child.children.length) compact(child);
    }
    if (fixed.length) mergeInto(fixed, node.matrixWorld.clone().invert(), node);
    for (const child of gone) node.remove(child);
  };
  compact(root);
  const live = root.children.filter((child): child is Group => (child as Group).isGroup === true);
  return { root, framing, tickers, specks, live, merged, parts: parts.length, geometries, materials };
}

/** A base with nothing on it, for a character without a diorama. */
const emptyBase: DioramaBuilder = (kit) => {
  octagonBase(kit, 0x2d2a38);
  return { width: 5.4, height: 1, lookY: 0.4 };
};

const fonts = new Map<string, Promise<Font>>();
function loadFont(url: string): Promise<Font> {
  if (!fonts.has(url)) {
    const pending = fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`Name font failed: ${response.status}`);
        return response.json() as Promise<FontData>;
      })
      .then((data) => new Font(data));
    pending.catch(() => fonts.delete(url));
    fonts.set(url, pending);
  }
  return fonts.get(url)!;
}

/** The plate at the front of a base: the name in 3D letters on a dark slab edged in the team's colour. */
function namePlate(name: string, code: string | null, font: Font, team: number, toonSteps: DataTexture, ink: MeshBasicMaterial, own: { geometries: BufferGeometry[]; materials: Material[] }): Group {
  const style = nameStyle({ code: code ?? undefined, faction: "neutrals" });
  const text = NAME_FONTS[style.font].mixedCase ? name : name.toUpperCase();
  const toon = (value: string | number) => {
    const material = new MeshToonMaterial({ color: value, gradientMap: toonSteps });
    own.materials.push(material);
    return material;
  };
  const plate = new Group();
  const slabGeometry = new BoxGeometry(PLATE_WIDTH, 0.9, 0.3);
  own.geometries.push(slabGeometry);
  plate.add(new Mesh(slabGeometry, toon(0x15131d)));
  const slabInk = new Mesh(slabGeometry, ink);
  slabInk.scale.set(1.02, 1.08, 1.1);
  plate.add(slabInk);
  const edgeGeometry = new BoxGeometry(PLATE_WIDTH + 0.04, 0.07, 0.32);
  const edgeMaterial = new MeshBasicMaterial({ color: team });
  own.geometries.push(edgeGeometry);
  own.materials.push(edgeMaterial);
  for (const y of [-0.45, 0.45]) {
    const edge = new Mesh(edgeGeometry, edgeMaterial);
    edge.position.y = y;
    plate.add(edge);
  }
  const shapes = font.generateShapes(text, 1);
  if (shapes.length) {
    const depth = 0.24;
    const letters = new ExtrudeGeometry(shapes, { depth, curveSegments: 4, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.02, bevelSegments: 2 });
    own.geometries.push(letters);
    letters.computeBoundingBox();
    const bounds = letters.boundingBox!;
    letters.translate(-(bounds.min.x + bounds.max.x) / 2, -(bounds.min.y + bounds.max.y) / 2, -depth);
    const scale = Math.min((PLATE_WIDTH * 0.88) / Math.max(0.01, bounds.max.x - bounds.min.x), 0.6 / Math.max(0.01, bounds.max.y - bounds.min.y));
    const word = new Mesh(letters, [toon(firstHex(style.fill, "#ffffff")), toon(style.side[0])]);
    word.scale.setScalar(scale);
    word.position.z = 0.15 + depth * scale;
    plate.add(word);
  }
  plate.position.set(0, -0.25, BASE_RADIUS + 0.12);
  plate.rotation.x = -0.45;
  return plate;
}

type Piece = {
  fighter: BoardFighter;
  holder: Group;
  diorama: BoardDiorama;
  plate: Group;
  rest: Vector3;
  /** The box round the diorama and its plate at rest, for the camera and the taps. */
  box: Box3;
  height: number;
  acting: Mesh;
  target: Mesh;
  /** Toon materials that flash red when struck. */
  flash: MeshToonMaterial[];
  look: BoardLook;
  struckAt: number;
  grey: boolean;
  lift: number;
  sunk: number;
};

/** Turns a piece grey (down) or back to its colours. */
function paintDown(piece: Piece, down: boolean) {
  if (piece.grey === down) return;
  piece.grey = down;
  const dim = (color: Color) => {
    const luma = color.r * 0.3 + color.g * 0.59 + color.b * 0.11;
    color.setRGB(luma * 0.55, luma * 0.55, luma * 0.6);
  };
  for (const top of [piece.diorama.root, piece.plate]) {
    top.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      const colors = mesh.geometry.getAttribute("color") as BufferAttribute | undefined;
      const original = mesh.userData.colors as Float32Array | undefined;
      if (colors && original) {
        const array = colors.array as Float32Array;
        if (!down) array.set(original);
        else {
          for (let i = 0; i < array.length; i += 3) {
            const luma = original[i] * 0.3 + original[i + 1] * 0.59 + original[i + 2] * 0.11;
            array[i] = luma * 0.55;
            array[i + 1] = luma * 0.55;
            array[i + 2] = luma * 0.6;
          }
        }
        colors.needsUpdate = true;
        return;
      }
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        const color = (material as MeshBasicMaterial).color;
        if (!color || material.side === BackSide || material.vertexColors) continue;
        if (down) {
          material.userData.color ??= color.getHex();
          dim(color);
        } else if (material.userData.color !== undefined) color.setHex(material.userData.color);
      }
    });
  }
}

/**
 * Draws the board on the canvas: loads the ten dioramas and the name fonts, then pops them up one
 * by one. Calls onAnchors with where each character is whenever the canvas changes size. Throws
 * if WebGL is not available.
 */
export async function mountCombatBoard(
  canvas: HTMLCanvasElement,
  fighters: BoardFighter[],
  options: { fontUrl: (font: string) => string; onAnchors: (anchors: BoardAnchor[]) => void; onLost: () => void; isCancelled: () => boolean },
): Promise<CombatBoard | null> {
  const builders = await Promise.all(
    fighters.map((fighter) => {
      const entry = fighter.code ? DIORAMAS.find((diorama) => diorama.code === fighter.code) : undefined;
      return entry ? entry.load().catch(() => emptyBase) : Promise.resolve(emptyBase);
    }),
  );
  const fontsOf = await Promise.all(fighters.map((fighter) => loadFont(options.fontUrl(nameStyle({ code: fighter.code ?? undefined, faction: "neutrals" }).font))));
  if (options.isCancelled()) return null;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 0.1, 800);
  scene.add(new AmbientLight(0xffffff, 1.7));
  const sun = new DirectionalLight(0xffffff, 2.8);
  sun.position.set(4, 8, 5);
  scene.add(sun);

  const toonSteps = new DataTexture(new Uint8Array([90, 170, 255]), 3, 1, RedFormat);
  toonSteps.minFilter = toonSteps.magFilter = NearestFilter;
  toonSteps.needsUpdate = true;
  const ink = new MeshBasicMaterial({ color: 0x000000, side: BackSide });
  const own = { geometries: [] as BufferGeometry[], materials: [ink] as Material[] };
  const ringGeometry = new RingGeometry(BASE_RADIUS + 0.25, BASE_RADIUS + 0.55, 48);
  const actingMaterial = new MeshBasicMaterial({ color: 0xffd60a, transparent: true, opacity: 0.95, depthWrite: false });
  const targetMaterial = new MeshBasicMaterial({ color: 0x16c8ff, transparent: true, opacity: 0.9, depthWrite: false });
  own.geometries.push(ringGeometry);
  own.materials.push(actingMaterial, targetMaterial);

  const pieces: Piece[] = [];
  for (let i = 0; i < fighters.length; i++) {
    const fighter = fighters[i];
    const diorama = buildBoardDiorama(builders[i], toonSteps, ink);
    const holder = new Group();
    diorama.root.rotation.y = REST_YAW;
    holder.add(diorama.root);
    const team = fighter.player ? PLAYER_COLOR : ENEMY_COLOR;
    const plate = namePlate(fighter.name, fighter.code, fontsOf[i], team, toonSteps, ink, own);
    holder.add(plate);
    const ring = (material: MeshBasicMaterial) => {
      const mesh = new Mesh(ringGeometry, material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = -0.43;
      mesh.visible = false;
      holder.add(mesh);
      return mesh;
    };
    const acting = ring(actingMaterial);
    const target = ring(targetMaterial);
    const slot = boardSlot(fighter.player, fighter.position);
    const rest = new Vector3(slot.x, 0, slot.z);
    holder.position.copy(rest);
    scene.add(holder);
    holder.updateMatrixWorld(true);
    const box = new Box3().setFromObject(diorama.root).union(new Box3().setFromObject(plate));
    const flash: MeshToonMaterial[] = [];
    holder.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        if ((material as MeshToonMaterial).isMeshToonMaterial && !flash.includes(material as MeshToonMaterial)) flash.push(material as MeshToonMaterial);
      }
    });
    holder.scale.setScalar(0.001);
    pieces.push({
      fighter,
      holder,
      diorama,
      plate,
      rest,
      box,
      height: Math.min(diorama.framing.height, 2.6),
      acting,
      target,
      flash,
      look: { key: fighter.key, acting: false, targetable: false, struck: false, down: false },
      struckAt: -Infinity,
      grey: false,
      lift: 0,
      sunk: 0,
    });
    // A breath between dioramas, so the page stays responsive while they are built.
    await new Promise((done) => setTimeout(done, 0));
    if (options.isCancelled()) {
      renderer.dispose();
      renderer.forceContextLoss();
      return null;
    }
  }

  // The camera: from the player's side, high, as close as keeps every base and plate in view,
  // with room under the lowest plates for the life bars.
  const direction = new Vector3(0, Math.sin(ELEVATION), Math.cos(ELEVATION));
  const corners = pieces.flatMap(({ box }) =>
    [0, 1, 2, 3, 4, 5, 6, 7].map((i) => new Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z)),
  );
  const center = new Box3().setFromPoints(corners).getCenter(new Vector3());
  let width = 1;
  let height = 1;
  const project = (point: Vector3) => {
    const p = point.clone().project(camera);
    return { x: ((p.x + 1) / 2) * width, y: ((1 - p.y) / 2) * height };
  };
  function fit() {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    const margin = (HUD_ROOM / height) * 2;
    const target = center.clone();
    let distance = 10;
    for (let round = 0; round < 4; round++) {
      // The nearest distance that keeps every corner in: a coarse then a fine search.
      const fits = (d: number) => {
        camera.position.copy(target).addScaledVector(direction, d);
        camera.lookAt(target);
        camera.updateMatrixWorld();
        camera.updateProjectionMatrix();
        return corners.every((corner) => {
          const p = corner.clone().project(camera);
          return Math.abs(p.x) <= 0.99 && p.y <= 0.98 && p.y >= -0.98 + margin;
        });
      };
      let low = 5;
      let high = 600;
      for (let k = 0; k < 30; k++) {
        const middle = (low + high) / 2;
        if (fits(middle)) high = middle;
        else low = middle;
      }
      distance = high;
      fits(distance);
      // Centre the board between the top and the room left for the bars, then fit again.
      const ys = corners.map((corner) => corner.clone().project(camera).y);
      const offset = (Math.max(...ys) + Math.min(...ys)) / 2 - margin / 2;
      const up = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
      target.addScaledVector(up, offset * Math.tan(MathUtils.degToRad(FOV / 2)) * distance);
    }
    options.onAnchors(
      pieces.map((piece) => {
        const points = [0, 1, 2, 3, 4, 5, 6, 7].map((i) =>
          project(new Vector3(i & 1 ? piece.box.max.x : piece.box.min.x, i & 2 ? piece.box.max.y : piece.box.min.y, i & 4 ? piece.box.max.z : piece.box.min.z)),
        );
        const xs = points.map((p) => p.x);
        const ys = points.map((p) => p.y);
        // Under the plate, as if the holder were at rest and full size.
        const under = new Vector3(0, -0.5, 0.2).applyEuler(piece.plate.rotation).add(piece.plate.position).add(piece.rest);
        return {
          key: piece.fighter.key,
          hud: project(under),
          middle: project(piece.rest.clone().add(new Vector3(0, piece.height * 0.6, 0))),
          box: { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) },
        };
      }),
    );
  }

  let still = reduced;
  let frame = 0;
  let previous = 0;
  let slowFrames = 0;
  const start = performance.now();
  const popEnd = (pieces.length * POP_STAGGER + POP_SECONDS) * 1000;

  /** Whether anything moves: the pop-up, a shake, a step forward, the dioramas' own motion. */
  function moving(now: number): boolean {
    if (now - start < popEnd + 50) return true;
    if (pieces.some((piece) => now - piece.struckAt < SHAKE_SECONDS * 1000)) return true;
    if (pieces.some((piece) => Math.abs(piece.lift - (piece.look.acting ? 1 : 0)) > 0.01 || Math.abs(piece.sunk - (piece.look.down ? 1 : 0)) > 0.01)) return true;
    if (still) return false;
    return pieces.some((piece) => piece.look.targetable || (!piece.look.down && (piece.diorama.tickers.length > 0 || piece.diorama.specks.length > 0)));
  }

  const speckMatrix = new Matrix4();
  function draw(now: number) {
    // The first frame's timestamp can come a moment before `start`: time never runs below zero,
    // or a diorama that reads a curve by time would read outside it.
    const elapsed = Math.max(0, (now - start) / 1000);
    pieces.forEach((piece, index) => {
      const { holder, diorama, look } = piece;
      // Pop up like a pop-up book, one after another.
      const x = Math.min(1, Math.max(0, (elapsed - index * POP_STAGGER) / POP_SECONDS));
      const eased = x >= 1 ? 1 : 1 + 2.9 * (x - 1) ** 3 + 1.9 * (x - 1) ** 2;
      const wide = 1 - (1 - eased) * 0.5;
      holder.scale.set(Math.max(0.001, wide), Math.max(0.001, eased), Math.max(0.001, wide));
      // The one acting rises a little (its life bar stays where it was); one down sinks and leans back.
      piece.lift += ((look.acting ? 1 : 0) - piece.lift) * (reduced ? 1 : 0.2);
      piece.sunk += ((look.down ? 1 : 0) - piece.sunk) * (reduced ? 1 : 0.15);
      const shake = now - piece.struckAt < SHAKE_SECONDS * 1000 && !reduced ? Math.sin(now * 0.06) * 0.35 * (1 - (now - piece.struckAt) / (SHAKE_SECONDS * 1000)) : 0;
      holder.position.set(piece.rest.x + shake, piece.lift * 0.4 - piece.sunk * 0.3, piece.rest.z);
      diorama.root.rotation.x = -piece.sunk * 0.12;
      const flash = Math.max(0, 1 - (now - piece.struckAt) / (SHAKE_SECONDS * 1000));
      for (const material of piece.flash) {
        // A red glow that fades: strong enough to see who was hit, not so strong it hides the diorama.
        material.emissive.setRGB(flash * flash * 0.4, 0, flash * flash * 0.06);
      }
      if (!still && !look.down) {
        for (const update of [...diorama.tickers]) {
          try {
            update(elapsed);
          } catch (cause) {
            // A motion that fails stops; the battle goes on.
            console.error("Diorama motion failed", cause);
            diorama.tickers.splice(diorama.tickers.indexOf(update), 1);
          }
        }
        for (const item of diorama.specks) {
          item.mesh.visible = elapsed >= item.delay;
          if (!item.mesh.visible) continue;
          const t = elapsed - item.delay;
          const span = item.top - item.bottom;
          for (let i = 0; i < item.speed.length; i++) {
            const y = item.start[i * 3 + 1] + item.speed[i] * t;
            const wrapped = item.bottom + ((((y - item.bottom) % span) + span) % span);
            item.mesh.setMatrixAt(i, speckMatrix.makeTranslation(item.start[i * 3] + Math.sin(t * 0.9 + i) * 0.06, wrapped, item.start[i * 3 + 2]));
          }
          item.mesh.instanceMatrix.needsUpdate = true;
        }
      }
    });
    targetMaterial.opacity = still ? 0.9 : 0.55 + 0.4 * Math.abs(Math.sin(now * 0.004));
    renderer.render(scene, camera);
  }

  function loop(now: number) {
    frame = requestAnimationFrame(loop);
    const delta = now - previous;
    if (delta < FRAME_MS - FRAME_MARGIN_MS) return;
    previous = now;
    // Too slow for this phone: no more motion of their own, only what the battle needs.
    slowFrames = delta > SLOW_FRAME_MS && delta < 500 ? slowFrames + 1 : 0;
    if (slowFrames >= SLOW_FRAMES_LIMIT) still = true;
    draw(now);
    if (!moving(now)) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  }
  const wake = () => {
    if (!frame) {
      previous = 0;
      frame = requestAnimationFrame(loop);
    }
  };

  const observer = new ResizeObserver(() => {
    fit();
    draw(performance.now());
  });
  const onLost = (event: Event) => {
    event.preventDefault();
    options.onLost();
  };
  canvas.addEventListener("webglcontextlost", onLost);
  observer.observe(canvas);
  fit();
  wake();

  let lastStep = -1;
  return {
    show(looks, step) {
      const now = performance.now();
      for (const piece of pieces) {
        const look = looks.find((entry) => entry.key === piece.fighter.key);
        if (!look) continue;
        if (look.struck && (step !== lastStep || !piece.look.struck)) piece.struckAt = now;
        piece.look = look;
        piece.acting.visible = look.acting && !look.down;
        piece.target.visible = look.targetable;
        paintDown(piece, look.down);
      }
      lastStep = step;
      draw(now);
      wake();
    },
    dispose() {
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener("webglcontextlost", onLost);
      for (const piece of pieces) {
        piece.diorama.geometries.forEach((geometry) => geometry.dispose());
        piece.diorama.materials.forEach((material) => material.dispose());
      }
      own.geometries.forEach((geometry) => geometry.dispose());
      own.materials.forEach((material) => material.dispose());
      toonSteps.dispose();
      renderer.dispose();
      // iOS allows few live WebGL contexts.
      renderer.forceContextLoss();
    },
  };
}
