// Draws the app logo and writes every icon the site and the home screen use.
// Uses the sharp copy installed with Next. Usage: node scripts/generate-icons.mjs

import sharp from "sharp";

const YELLOW = "#ffd60a";
const ORANGE = "#ff8a00";
const MAGENTA = "#ff2e6c";
const PAPER = "#fff8e7";
const CENTER = 256;

// A heavy Ω drawn as a shape, so it does not depend on an installed font.
const OMEGA =
  "M100 428H236V335L216 290A85 85 0 1 1 296 290L276 335V428H412V372H346V341A155 155 0 1 0 166 341V372H100Z";

function point(radius, degrees) {
  const angle = (degrees * Math.PI) / 180;
  return `${(CENTER + radius * Math.sin(angle)).toFixed(1)},${(CENTER - radius * Math.cos(angle)).toFixed(1)}`;
}

function rays(count) {
  const step = 360 / count;
  return Array.from(
    { length: count / 2 },
    (_, i) =>
      `<polygon fill="${ORANGE}" points="${CENTER},${CENTER} ${point(420, i * 2 * step)} ${point(420, (i * 2 + 1) * step)}"/>`,
  ).join("");
}

function burst(outer, inner, tips) {
  const step = 180 / tips;
  const points = Array.from({ length: tips * 2 }, (_, i) => point(i % 2 ? inner : outer, i * step));
  return points.join(" ");
}

/** Gold rays, a paper burst and the Ω; `scale` keeps it inside the area a launcher may crop. */
function logo(scale) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
    <rect width="512" height="512" fill="${YELLOW}"/>
    ${rays(28)}
    <g transform="translate(${CENTER} ${CENTER}) scale(${scale}) translate(${-CENTER} ${-CENTER})">
      <polygon points="${burst(246, 196, 14)}" fill="${PAPER}" stroke="#000" stroke-width="10" stroke-linejoin="round"/>
      <g transform="translate(${CENTER} ${CENTER}) skewX(-8) scale(0.88) translate(${-CENTER} -244)">
        <path d="${OMEGA}" transform="translate(18 18)" fill="#000" stroke="#000" stroke-width="20" stroke-linejoin="round"/>
        <path d="${OMEGA}" fill="${MAGENTA}" stroke="#000" stroke-width="20" stroke-linejoin="round" paint-order="stroke"/>
      </g>
    </g>
  </svg>`;
}

// Browser tabs show the icon very small: only the Ω on flat yellow stays readable.
const tabLogo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${YELLOW}"/>
  <g transform="translate(${CENTER} ${CENTER}) skewX(-8) scale(1.12) translate(${-CENTER} -244)">
    <path d="${OMEGA}" fill="#000"/>
  </g>
</svg>`;

const OUTPUTS = [
  { file: "public/icons/icon-192.png", size: 192, svg: logo(1) },
  { file: "public/icons/icon-512.png", size: 512, svg: logo(1) },
  // Android crops maskable icons to a shape: the logo stays inside the central 80%.
  { file: "public/icons/icon-maskable-512.png", size: 512, svg: logo(0.8) },
  // iOS rounds the corners itself and wants no transparency.
  { file: "src/app/apple-icon.png", size: 180, svg: logo(1) },
  { file: "src/app/icon.png", size: 64, svg: tabLogo },
];

for (const { file, size, svg } of OUTPUTS) {
  await sharp(Buffer.from(svg), { density: 300 }).resize(size, size).removeAlpha().png().toFile(file);
  console.log(`${file} (${size}x${size})`);
}
