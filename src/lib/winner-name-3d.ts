import {
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  ClampToEdgeWrapping,
  Color,
  DataTexture,
  DirectionalLight,
  ExtrudeGeometry,
  Group,
  Material,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  NearestFilter,
  PerspectiveCamera,
  RedFormat,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from "three";
import { Font, type FontData } from "three/addons/loaders/FontLoader.js";
import { NAME_FONTS, type NameStyle } from "@/lib/card-names";

/**
 * The round winner's name as real 3D letters, in the colors and typeface of its card name
 * (card-names.ts): the letters fly in one after another, then the word sways and can be
 * turned with a finger, like the threat dioramas. Returns the cleanup function.
 * Throws if WebGL is not available.
 */
export type WinnerNameInput = { name: string; style: NameStyle; font: FontData };

const POP_SECONDS = 0.55;
const LETTER_DELAY = 0.075;
const FRAME_MS = 1000 / 30;
const FRAME_MARGIN_MS = 4;
const SLOW_FRAME_MS = 66;
const SLOW_FRAMES_LIMIT = 20;
const FOV = 30;
/** The 2D extrusion step (0.035em) in 3D depth units, letters being 1 unit tall. */
const DEPTH_PER_STEP = 0.04;

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
function faceTexture(fill: string): { texture: CanvasTexture; across: boolean } {
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
  return { texture, across };
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

export function mountWinnerName(canvas: HTMLCanvasElement, input: WinnerNameInput, onContextLost: () => void): () => void {
  const { style } = input;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 0.1, 100);
  scene.add(new AmbientLight(0xffffff, 1.9));
  const sun = new DirectionalLight(0xffffff, 2.6);
  sun.position.set(-3, 5, 6);
  scene.add(sun);

  const toonSteps = new DataTexture(new Uint8Array([110, 185, 255]), 3, 1, RedFormat);
  toonSteps.minFilter = toonSteps.magFilter = NearestFilter;
  toonSteps.needsUpdate = true;

  const geometries: BufferGeometry[] = [];
  const materials: Material[] = [];
  const glow = style.glow ? paint(style.glow) : null;
  const face = faceTexture(style.fill);
  const lit = {
    gradientMap: toonSteps,
    emissive: glow ? glow.color : new Color(0x000000),
    emissiveIntensity: glow ? glow.opacity * 0.5 : 0,
  };
  const front = new MeshToonMaterial({ ...lit, map: face.texture });
  const sidesMaterial = new MeshToonMaterial({ ...lit, vertexColors: true });
  const rim = new MeshBasicMaterial({ color: new Color(style.rim) });
  materials.push(front, sidesMaterial, rim);
  const ghosts = (style.split ?? [])
    .map(paint)
    .filter(({ opacity }) => opacity > 0)
    .map(({ color, opacity }, index) => {
      const material = new MeshBasicMaterial({ color, transparent: true, opacity: opacity * 0.8, depthWrite: false });
      materials.push(material);
      return { material, side: style.split && paint(style.split[0]).opacity > 0 && index === 0 ? -1 : 1 };
    });

  const font = new Font(input.font);
  const mixedCase = NAME_FONTS[style.font].mixedCase;
  const text = mixedCase ? input.name : input.name.toUpperCase();
  const scale = 1 / input.font.resolution;
  const capHeight = 0.72;
  const depth = (style.depth ?? 8) * DEPTH_PER_STEP;
  const bevel = 0.035;
  const lean = Math.tan(((style.slant ?? 0) * Math.PI) / 180);
  const shear = new Matrix4().set(1, lean, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
  const sides = [new Color(style.side[0]), new Color(style.side[1])];

  type Letter = { group: Group; delay: number; x: number; y: number; spin: number };
  const letters: Letter[] = [];
  const root = new Group();
  scene.add(root);
  const word = new Group();
  root.add(word);

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
      // The geometry is already centered: y runs from about -capHeight/2 to +capHeight/2,
      // z from the front face (+bevel) to the back (-depth - bevel).
      if (caps && i >= caps.start && i < caps.start + caps.count) {
        if (face.across) uv.setXY(i, (position.getX(i) + offsetX) / width, 0.5);
        else uv.setXY(i, 0.5, 0.5 + position.getY(i) / capHeight);
      } else {
        sample(sides, (bevel - position.getZ(i)) / (depth + bevel * 2), color);
      }
      colors.set([color.r, color.g, color.b], i * 3);
    }
    uv.needsUpdate = true;
    geometry.setAttribute("color", new BufferAttribute(colors, 3));
  }

  placed.forEach(({ character, x }, index) => {
    const shapes = font.generateShapes(character, 1);
    const solid = new ExtrudeGeometry(shapes, {
      depth,
      curveSegments: 5,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: 0.02,
      bevelSegments: 2,
    });
    const outline = new ExtrudeGeometry(shapes, {
      depth: depth * 0.7,
      curveSegments: 5,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.065,
      bevelSegments: 1,
    });
    for (const geometry of [solid, outline]) geometry.applyMatrix4(shear);
    solid.computeBoundingBox();
    const box = solid.boundingBox!;
    const centerX = (box.min.x + box.max.x) / 2;
    for (const geometry of [solid, outline]) geometry.translate(-centerX, -capHeight / 2, -depth);
    paintGeometry(solid, x + centerX);
    geometries.push(solid, outline);

    const group = new Group();
    group.add(new Mesh(solid, [front, sidesMaterial]));
    const backing = new Mesh(outline, rim);
    backing.position.z = -0.04;
    group.add(backing);
    for (const ghost of ghosts) {
      const copy = new Mesh(solid, ghost.material);
      copy.position.set(ghost.side * 0.13, 0, -0.08);
      group.add(copy);
    }
    const [rotation, rise] = style.jitter ? style.jitter[index % style.jitter.length] : [0, 0];
    group.rotation.z = (-rotation * Math.PI) / 180;
    const restX = x + centerX - width / 2;
    const restY = rise;
    group.position.set(restX, restY, 0);
    word.add(group);
    letters.push({ group, delay: index * LETTER_DELAY, x: restX, y: restY, spin: index % 2 ? 1 : -1 });
  });

  // The extrusion shows in the direction the card name casts it: look from that side.
  const angle = ((style.angle ?? 60) * Math.PI) / 180;
  const look = { x: Math.cos(angle) * 0.22, y: -Math.sin(angle) * 0.22 };

  const resize = () => {
    const { clientWidth, clientHeight } = canvas;
    if (!clientWidth || !clientHeight) return;
    renderer.setSize(clientWidth, clientHeight, false);
    camera.aspect = clientWidth / clientHeight;
    const tan = Math.tan(((FOV / 2) * Math.PI) / 180);
    // Room for the sway and the lean on top of the word itself.
    const span = width * 1.12 + Math.abs(lean) * capHeight + 0.6;
    const distance = Math.max(span / 2 / tan / camera.aspect, 1.6 / 2 / tan);
    camera.position.set(look.x * distance, look.y * distance, distance);
    camera.lookAt(0, 0, 0);
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
  const popMs = ((letters.at(-1)?.delay ?? 0) + POP_SECONDS) * 1000;

  function draw(now: number, settled: boolean) {
    const elapsed = (now - start) / 1000;
    for (const { group, delay, x, y, spin } of letters) {
      const progress = settled ? 1 : Math.min(1, Math.max(0, (elapsed - delay) / POP_SECONDS));
      const eased = progress >= 1 ? 1 : easeOutBack(progress);
      // Each letter flies in from behind the card, turning to face the camera.
      group.scale.setScalar(Math.max(0.001, eased));
      group.position.set(x, y + (1 - eased) * 0.6, (1 - eased) * -4);
      group.rotation.y = (1 - eased) * spin * 1.4;
    }
    if (!settled && dragX === null) targetYaw += (Math.sin(now * 0.0007) * 0.28 - targetYaw) * 0.03;
    yaw += (targetYaw - yaw) * 0.12;
    root.rotation.y = yaw;
    root.position.y = settled ? 0 : Math.sin(now * 0.0016) * 0.04;
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

  start = previous = performance.now();
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
    face.texture.dispose();
    renderer.dispose();
    // iOS allows few live WebGL contexts: a match opens one for each round.
    renderer.forceContextLoss();
  };
}
