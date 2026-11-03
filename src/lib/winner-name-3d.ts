import {
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  ClampToEdgeWrapping,
  Color,
  DirectionalLight,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  InstancedMesh,
  Material,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NeutralToneMapping,
  Object3D,
  OctahedronGeometry,
  PerspectiveCamera,
  PMREMGenerator,
  PointLight,
  RingGeometry,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { Font, type FontData } from "three/addons/loaders/FontLoader.js";
import { NAME_FONTS, type NameStyle } from "@/lib/card-names";

/**
 * The round winner's name as real 3D letters, in the colors and typeface of its card name
 * (card-names.ts): glossy, deep letters slam onto the screen one after another, the word lands
 * with a flash and sparks, then sways under a passing glint and can be turned with a finger,
 * like the threat dioramas. Returns the cleanup function. Throws if WebGL is not available.
 */
export type WinnerNameInput = {
  name: string;
  style: NameStyle;
  font: FontData;
  /** performance.now() time at which the letters start flying in; until then the strip is empty. */
  startAt?: number;
};

const POP_SECONDS = 0.5;
const LETTER_DELAY = 0.065;
const FRAME_MS = 1000 / 30;
const FRAME_MARGIN_MS = 4;
const SLOW_FRAME_MS = 66;
const SLOW_FRAMES_LIMIT = 20;
const FOV = 30;
/** The 2D extrusion step (0.035em) in 3D depth units, letters being 1 unit tall. */
const DEPTH_PER_STEP = 0.065;
const CAP_HEIGHT = 0.72;
const BEVEL = 0.06;
const SPARKS = 40;
const SPARK_SECONDS = 0.9;
const GLINT_EVERY = 3.4;
const GLINT_SECONDS = 1.1;

function easeOutBack(x: number): number {
  const c = 1.7;
  return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2;
}

// In the card name the capitals cover about 14%-86% of the painted box: the face texture covers them only.
const CAP_TOP = 0.14;
const CAP_SPAN = 0.72;

/**
 * The face of the letters: the style's base gradient (its last linear-gradient, stops included),
 * drawn top to bottom, or left to right across the word. Patterns on top of it are left out.
 */
function faceTexture(fill: string): { texture: CanvasTexture; across: boolean; colors: string[] } {
  const gradients = fill.split(/(?=(?:repeating-)?linear-gradient\()/).filter((part) => part.startsWith("linear-gradient("));
  const base = gradients.at(-1) ?? "linear-gradient(180deg, #ffffff, #c8c8c8)";
  const across = base.startsWith("linear-gradient(90deg");
  const stops = [...base.matchAll(/(#[0-9a-f]{6})((?:\s+[\d.]+%?)*)/gi)].map(([, color, positions]) => ({
    color,
    positions: positions.trim() ? positions.trim().split(/\s+/).map((value) => parseFloat(value) / 100) : [],
  }));
  const canvas = document.createElement("canvas");
  canvas.width = across ? 256 : 2;
  canvas.height = across ? 2 : 256;
  const context = canvas.getContext("2d")!;
  const gradient = across ? context.createLinearGradient(0, 0, 256, 0) : context.createLinearGradient(0, 0, 0, 256);
  let last = 0;
  stops.forEach(({ color, positions }, index) => {
    // CSS spreads stops without a position evenly between their neighbors; the ends default to 0 and 1.
    const fallback = index === 0 ? 0 : index === stops.length - 1 ? 1 : Math.max(last, index / (stops.length - 1));
    for (const position of positions.length ? positions : [fallback]) {
      const t = across ? position : (position - CAP_TOP) / CAP_SPAN;
      last = Math.max(last, Math.min(1, Math.max(0, t)));
      gradient.addColorStop(last, color);
    }
  });
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = texture.wrapT = ClampToEdgeWrapping;
  return { texture, across, colors: stops.map(({ color }) => color) };
}

/** "rgb(r g b / a)", "#rrggbb" or "transparent" to a color and an opacity. */
function paint(css: string): { color: Color; opacity: number } {
  const rgb = css.match(/rgb\((\d+) (\d+) (\d+)(?: \/ ([\d.]+))?\)/);
  if (rgb) {
    const color = new Color().setRGB(+rgb[1] / 255, +rgb[2] / 255, +rgb[3] / 255, "srgb");
    return { color, opacity: rgb[4] === undefined ? 1 : +rgb[4] };
  }
  if (css === "transparent") return { color: new Color(), opacity: 0 };
  return { color: new Color(css), opacity: 1 };
}

function sample(colors: Color[], t: number, target: Color): Color {
  if (colors.length === 1) return target.copy(colors[0]);
  const position = Math.min(1, Math.max(0, t)) * (colors.length - 1);
  const index = Math.min(colors.length - 2, Math.floor(position));
  return target.lerpColors(colors[index], colors[index + 1], position - index);
}

/** A pseudo-random sequence: the same name always throws the same sparks. */
function seededRandom(seed: string): () => number {
  let state = [...seed].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7);
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function mountWinnerName(canvas: HTMLCanvasElement, input: WinnerNameInput, onContextLost: () => void): () => void {
  const { style } = input;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = NeutralToneMapping;

  const scene = new Scene();
  // A soft studio around the letters: their glossy faces and bevels reflect it.
  const pmrem = new PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = environment;
  const camera = new PerspectiveCamera(FOV, 1, 0.1, 100);
  scene.add(new AmbientLight(0xffffff, 0.7));
  const key = new DirectionalLight(0xffffff, 1.8);
  key.position.set(-2.5, 4, 5);
  scene.add(key);
  // A colored light from behind outlines the sides.
  const back = new DirectionalLight(new Color(style.side[0]).lerp(new Color(0xffffff), 0.4), 2.5);
  back.position.set(3, -2, -4);
  scene.add(back);
  const glint = new PointLight(0xffffff, 0, 0, 1.2);
  scene.add(glint);

  const geometries: BufferGeometry[] = [];
  const materials: Material[] = [];
  const glow = style.glow ? paint(style.glow) : null;
  const face = faceTexture(style.fill);
  // Glossy but true to the card name's colors: the reflections stay a highlight, not a wash.
  const glowColor = glow ? glow.color : new Color(0x000000);
  const glowIntensity = glow ? glow.opacity * 0.35 : 0;
  const front = new MeshStandardMaterial({
    map: face.texture,
    roughness: 0.32,
    metalness: 0.05,
    envMapIntensity: 0.4,
    emissive: glowColor.clone(),
    emissiveIntensity: glowIntensity,
  });
  const sidesMaterial = new MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.4,
    metalness: 0.3,
    envMapIntensity: 0.6,
    emissive: glowColor.clone(),
    emissiveIntensity: glowIntensity,
  });
  const white = new Color(0xffffff);
  const rim = new MeshBasicMaterial({ color: new Color(style.rim) });
  materials.push(front, sidesMaterial, rim);
  const ghosts = (style.split ?? [])
    .map((css, index) => ({ ...paint(css), side: index === 0 ? -1 : 1 }))
    .filter(({ opacity }) => opacity > 0)
    .map(({ color, opacity, side }) => {
      const material = new MeshBasicMaterial({ color, transparent: true, opacity: opacity * 0.8, depthWrite: false });
      materials.push(material);
      return { material, side };
    });

  const font = new Font(input.font);
  const text = NAME_FONTS[style.font].mixedCase ? input.name : input.name.toUpperCase();
  const scale = 1 / input.font.resolution;
  const depth = (style.depth ?? 8) * DEPTH_PER_STEP;
  const lean = Math.tan(((style.slant ?? 0) * Math.PI) / 180);
  const shear = new Matrix4().set(1, lean, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
  const sides = [new Color(style.side[0]), new Color(style.side[1])];

  type Letter = { group: Group; delay: number; x: number; y: number; spin: number };
  const letters: Letter[] = [];
  const root = new Group();
  scene.add(root);

  // Lay the letters out first: the face gradient may run across the whole word.
  const glyphs = font.data.glyphs;
  const placed: { character: string; x: number }[] = [];
  let cursor = 0;
  for (const character of text) {
    const glyph = glyphs[character] ?? glyphs[" "];
    if (character !== " " && glyphs[character]) placed.push({ character, x: cursor });
    cursor += (glyph?.ha ?? input.font.resolution * 0.3) * scale + (style.tracking ?? 0);
  }
  const width = cursor - (style.tracking ?? 0);

  /** Face texture coordinates on the caps, side colors from front to back on the walls. */
  function paintGeometry(geometry: BufferGeometry, offsetX: number) {
    const position = geometry.getAttribute("position");
    const uv = geometry.getAttribute("uv");
    const colors = new Float32Array(position.count * 3);
    const color = new Color();
    const caps = geometry.groups[0];
    for (let i = 0; i < position.count; i++) {
      // The geometry is already centered: y runs from about -CAP_HEIGHT/2 to +CAP_HEIGHT/2,
      // z from the front face (+BEVEL) to the back (-depth - BEVEL).
      if (caps && i >= caps.start && i < caps.start + caps.count) {
        if (face.across) uv.setXY(i, (position.getX(i) + offsetX) / width, 0.5);
        else uv.setXY(i, 0.5, 0.5 + position.getY(i) / CAP_HEIGHT);
      } else {
        sample(sides, (BEVEL - position.getZ(i)) / (depth + BEVEL * 2), color);
      }
      colors.set([color.r, color.g, color.b], i * 3);
    }
    uv.needsUpdate = true;
    geometry.setAttribute("color", new BufferAttribute(colors, 3));
  }

  placed.forEach(({ character, x }, index) => {
    const shapes = font.generateShapes(character, 1);
    // Deep letters with rounded, light-catching edges, on a dark backing that outlines them.
    const solid = new ExtrudeGeometry(shapes, {
      depth,
      curveSegments: 6,
      bevelEnabled: true,
      bevelThickness: BEVEL,
      bevelSize: 0.03,
      bevelSegments: 3,
    });
    const outline = new ExtrudeGeometry(shapes, {
      depth: depth * 0.6,
      curveSegments: 6,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.075,
      bevelSegments: 1,
    });
    for (const geometry of [solid, outline]) geometry.applyMatrix4(shear);
    solid.computeBoundingBox();
    const box = solid.boundingBox!;
    const centerX = (box.min.x + box.max.x) / 2;
    for (const geometry of [solid, outline]) geometry.translate(-centerX, -CAP_HEIGHT / 2, -depth);
    paintGeometry(solid, x + centerX);
    geometries.push(solid, outline);

    const group = new Group();
    group.add(new Mesh(solid, [front, sidesMaterial]));
    const backing = new Mesh(outline, rim);
    backing.position.z = -0.06;
    group.add(backing);
    for (const ghost of ghosts) {
      const copy = new Mesh(solid, ghost.material);
      copy.position.set(ghost.side * 0.13, 0, -0.1);
      group.add(copy);
    }
    const [rotation, rise] = style.jitter ? style.jitter[index % style.jitter.length] : [0, 0];
    group.rotation.z = (-rotation * Math.PI) / 180;
    const restX = x + centerX - width / 2;
    group.position.set(restX, rise, 0);
    root.add(group);
    letters.push({ group, delay: index * LETTER_DELAY, x: restX, y: rise, spin: index % 2 ? 1 : -1 });
  });

  // The landing: a shock ring behind the word and a burst of sparks in its colors.
  const ringGeometry = new RingGeometry(0.42, 0.5, 64);
  const ringMaterial = new MeshBasicMaterial({
    color: glow ? glow.color : new Color(face.colors[0] ?? "#ffffff"),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: DoubleSide,
  });
  const ring = new Mesh(ringGeometry, ringMaterial);
  ring.position.z = -depth - 0.3;
  ring.scale.set(0.001, 0.001, 1);
  scene.add(ring);
  const sparkGeometry = new OctahedronGeometry(0.075);
  const sparkMaterial = new MeshBasicMaterial({ color: 0xffffff });
  const sparks = new InstancedMesh(sparkGeometry, sparkMaterial, SPARKS);
  const random = seededRandom(input.name);
  const sparkPalette = [...face.colors.slice(0, 1), ...face.colors.slice(-1), "#ffffff", style.side[0]];
  const flights = Array.from({ length: SPARKS }, (_, index) => {
    const angle = random() * Math.PI * 2;
    const speed = 2.2 + random() * 2.8;
    sparks.setColorAt(index, new Color(sparkPalette[index % sparkPalette.length]));
    return {
      from: new Vector3((random() - 0.5) * width, (random() - 0.5) * CAP_HEIGHT, 0.2),
      velocity: new Vector3(Math.cos(angle) * speed, Math.sin(angle) * speed * 0.7 + 1, (random() - 0.3) * 2),
      spin: random() * 10,
    };
  });
  sparks.visible = false;
  scene.add(sparks);
  geometries.push(ringGeometry, sparkGeometry);
  materials.push(ringMaterial, sparkMaterial);
  const dummy = new Object3D();

  // The extrusion shows in the direction the card name casts it: look from that side.
  const angle = ((style.angle ?? 60) * Math.PI) / 180;
  const look = { x: Math.cos(angle) * 0.26, y: -Math.sin(angle) * 0.26 };
  let distance = 6;

  const resize = () => {
    const { clientWidth, clientHeight } = canvas;
    if (!clientWidth || !clientHeight) return;
    renderer.setSize(clientWidth, clientHeight, false);
    camera.aspect = clientWidth / clientHeight;
    const tan = Math.tan(((FOV / 2) * Math.PI) / 180);
    // As big as the strip allows: the word fills the width, a short one the height.
    const span = width * 1.1 + Math.abs(lean) * CAP_HEIGHT + 0.5 + (ghosts.length ? 0.3 : 0);
    distance = Math.max(span / 2 / tan / camera.aspect, 1.3 / 2 / tan);
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  let yaw = 0;
  let targetYaw = 0;
  let dragX: number | null = null;
  const onDown = (event: PointerEvent) => {
    dragX = event.clientX;
    canvas.setPointerCapture(event.pointerId);
  };
  const onMove = (event: PointerEvent) => {
    if (dragX === null) return;
    targetYaw = Math.max(-1.1, Math.min(1.1, targetYaw + (event.clientX - dragX) * 0.012));
    dragX = event.clientX;
  };
  const onUp = () => {
    dragX = null;
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);

  let frame = 0;
  let start = 0;
  let previous = 0;
  let slowFrames = 0;
  // The word lands when the last letter does.
  const landing = (letters.at(-1)?.delay ?? 0) + POP_SECONDS * 0.6;
  const popMs = (landing + SPARK_SECONDS) * 1000;

  function draw(now: number, settled: boolean) {
    const elapsed = settled ? landing + SPARK_SECONDS + 1 : (now - start) / 1000;
    for (const { group, delay, x, y, spin } of letters) {
      const progress = Math.min(1, Math.max(0, (elapsed - delay) / POP_SECONDS));
      const eased = progress >= 1 ? 1 : easeOutBack(progress);
      // Each letter slams in from right in front of the camera, big and turning.
      const near = 1 - eased;
      group.visible = progress > 0;
      group.scale.setScalar(Math.max(0.001, 1 + near * 1.6));
      group.position.set(x * (1 + near * 0.4), y + near * 0.8, near * 3);
      group.rotation.x = near * -0.9;
      group.rotation.y = near * spin * 0.9;
    }

    const sinceLanding = elapsed - landing;
    const impact = sinceLanding >= 0 && sinceLanding < SPARK_SECONDS;
    // The faces flash white as the word lands.
    const flash = settled || sinceLanding < 0 ? 0 : Math.max(0, 1 - sinceLanding / 0.3);
    for (const material of [front, sidesMaterial]) {
      material.emissive.lerpColors(glowColor, white, flash);
      material.emissiveIntensity = glowIntensity + flash * 0.9;
    }
    ring.visible = impact;
    sparks.visible = impact;
    if (impact) {
      const t = sinceLanding / SPARK_SECONDS;
      const grow = 1 - (1 - Math.min(1, t * 1.6)) ** 3;
      ring.scale.set(grow * width * 0.75, grow * width * 0.3, 1);
      ringMaterial.opacity = 0.85 * (1 - Math.min(1, t * 1.4));
      for (const [index, flight] of flights.entries()) {
        const s = sinceLanding;
        dummy.position.set(
          flight.from.x + flight.velocity.x * s,
          flight.from.y + flight.velocity.y * s - 4 * s * s,
          flight.from.z + flight.velocity.z * s,
        );
        dummy.rotation.set(flight.spin * s, flight.spin * s * 0.7, 0);
        dummy.scale.setScalar(Math.max(0.001, 1 - t));
        dummy.updateMatrix();
        sparks.setMatrixAt(index, dummy.matrix);
      }
      sparks.instanceMatrix.needsUpdate = true;
    }

    // A glint passes over the letters now and then.
    const cycle = settled ? 0.5 : ((elapsed - landing) % GLINT_EVERY) / GLINT_SECONDS;
    const sweeping = elapsed > landing && cycle < 1;
    glint.intensity = sweeping ? Math.sin(cycle * Math.PI) * 9 : 0;
    glint.position.set((cycle - 0.5) * (width + 2), 0.35, 1.1);

    if (!settled && dragX === null) targetYaw += (Math.sin(now * 0.0007) * 0.22 - targetYaw) * 0.03;
    yaw += (targetYaw - yaw) * 0.12;
    root.rotation.y = yaw;
    root.position.y = settled ? 0 : Math.sin(now * 0.0016) * 0.035;

    // The landing shakes the camera a little.
    const shake = impact && !settled ? Math.max(0, 1 - sinceLanding / 0.35) * 0.05 : 0;
    camera.position.set(
      look.x * distance + Math.sin(now * 0.09) * shake,
      look.y * distance + Math.cos(now * 0.11) * shake,
      distance,
    );
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  }

  function loop(now: number) {
    frame = requestAnimationFrame(loop);
    const delta = now - previous;
    // Full display rate while the letters arrive or a finger turns the word, half rate after.
    const atRest = now - start > popMs && dragX === null;
    if (atRest && delta < FRAME_MS - FRAME_MARGIN_MS) return;
    previous = now;
    // Too slow for this phone: stop on the finished word. Long gaps are a hidden tab.
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

  previous = performance.now();
  start = Math.max(previous, input.startAt ?? 0);
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
    sparks.dispose();
    face.texture.dispose();
    environment.dispose();
    pmrem.dispose();
    renderer.dispose();
    // iOS allows few live WebGL contexts: a match opens one for each round.
    renderer.forceContextLoss();
  };
}
