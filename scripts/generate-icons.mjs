import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'assets', 'images');

const BG_COLOR = '#050507';
const PURPLE = '#A855F7';

// Icon: "5T" centered, connected via shared vertical stroke in the middle
function createIconSVG(size, padding) {
  const s = size;
  const p = padding;
  const sw = Math.round(s * 0.065); // stroke width

  // Center the whole glyph
  const cx = s / 2;
  const cy = s / 2;
  const totalW = (s - p * 2) * 0.6; // total width of 5T
  const totalH = (s - p * 2) * 0.55; // total height of 5T

  const left = cx - totalW / 2;
  const right = cx + totalW / 2;
  const top = cy - totalH / 2;
  const bottom = cy + totalH / 2;
  const midY = cy;

  // Shared center vertical line where 5 meets T
  const center = cx;

  // "5" on the left side: top bar, down left, mid bar to center, down right to bottom, bottom bar left
  // T on the right: top bar from center to right, stem down from midpoint of that bar

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
    <!-- 5: continuous path -->
    <polyline
      points="${center},${top} ${left},${top} ${left},${midY} ${center},${midY} ${center},${bottom} ${left},${bottom}"
      fill="none"
      stroke="${PURPLE}"
      stroke-width="${sw}"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <!-- T crossbar: from center to right at top -->
    <line
      x1="${center}" y1="${top}"
      x2="${right}" y2="${top}"
      stroke="${PURPLE}"
      stroke-width="${sw}"
      stroke-linecap="round"
    />
    <!-- T stem: down from middle of crossbar -->
    <line
      x1="${(center + right) / 2}" y1="${top}"
      x2="${(center + right) / 2}" y2="${bottom}"
      stroke="${PURPLE}"
      stroke-width="${sw}"
      stroke-linecap="round"
    />
  </svg>`;
}

function createBgSVG(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <rect width="${size}" height="${size}" fill="${BG_COLOR}"/>
  </svg>`;
}

function createFullIconSVG(size) {
  const padding = size * 0.18;
  const innerSvg = createIconSVG(size, padding);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <rect width="${size}" height="${size}" rx="${size * 0.18}" fill="${BG_COLOR}"/>
    ${innerSvg.replace(/<\/?svg[^>]*>/g, '')}
  </svg>`;
}

async function generate() {
  // Android adaptive foreground (432x432, safe zone 288x288 centered)
  const fgSvg = createIconSVG(432, 72);
  await sharp(Buffer.from(fgSvg)).png().toFile(path.join(OUT, 'android-icon-foreground.png'));
  console.log('✓ android-icon-foreground.png');

  // Android adaptive background
  const bgSvg = createBgSVG(432);
  await sharp(Buffer.from(bgSvg)).png().toFile(path.join(OUT, 'android-icon-background.png'));
  console.log('✓ android-icon-background.png');

  // Monochrome (white on transparent)
  const monoSvg = createIconSVG(432, 72).replace(new RegExp(PURPLE, 'g'), '#FFFFFF');
  await sharp(Buffer.from(monoSvg)).png().toFile(path.join(OUT, 'android-icon-monochrome.png'));
  console.log('✓ android-icon-monochrome.png');

  // Main icon 1024x1024
  const mainSvg = createFullIconSVG(1024);
  await sharp(Buffer.from(mainSvg)).png().toFile(path.join(OUT, 'icon.png'));
  console.log('✓ icon.png');

  // Favicon 48x48
  const favSvg = createFullIconSVG(48);
  await sharp(Buffer.from(favSvg)).png().toFile(path.join(OUT, 'favicon.png'));
  console.log('✓ favicon.png');

  // Splash icon 200x200
  const splashSvg = createIconSVG(200, 20);
  await sharp(Buffer.from(splashSvg)).png().toFile(path.join(OUT, 'splash-icon.png'));
  console.log('✓ splash-icon.png');

  console.log('\nAll icons generated!');
}

generate().catch(console.error);
