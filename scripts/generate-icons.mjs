import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'assets', 'images');

const BG_COLOR = '#050507'; // slightly darker than app bg #09090B
const PURPLE = '#A855F7';

// The icon: a backwards-Z connected to a T — like a step/zigzag pulse
// Design on a 512x512 canvas, centered in safe zone
function createIconSVG(size, padding) {
  const s = size;
  const p = padding;
  const area = s - p * 2; // drawing area
  const cx = s / 2;
  const cy = s / 2;

  // The shape: a rectangular zigzag (like a backwards Z) flowing into a T
  // Think of it as: top-right bar → diagonal down-left → bottom bar with T stem
  const strokeW = area * 0.09;
  const halfW = area * 0.32; // half-width of the shape
  const halfH = area * 0.34; // half-height of the shape

  // Points for the zigzag-T shape:
  // Start top-right, go left-diagonal, then T at bottom
  const x1 = cx + halfW;       // top right
  const y1 = cy - halfH;
  const x2 = cx - halfW * 0.3; // middle left (zigzag vertex)
  const y2 = cy + halfH * 0.1;
  const x3 = cx + halfW * 0.3; // middle right (zigzag vertex)
  const y3 = cy - halfH * 0.1;
  const x4 = cx - halfW;       // bottom left
  const y4 = cy + halfH;

  // T crossbar
  const tLeft = cx - halfW;
  const tRight = cx + halfW;
  const tY = cy + halfH;

  // T stem going down
  const stemBottom = cy + halfH + area * 0.18;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
    <!-- Zigzag path: top-right → mid-left → mid-right → bottom-left -->
    <polyline
      points="${x1},${y1} ${x2},${y2}"
      fill="none"
      stroke="${PURPLE}"
      stroke-width="${strokeW}"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <polyline
      points="${x2},${y2} ${x3},${y3}"
      fill="none"
      stroke="${PURPLE}"
      stroke-width="${strokeW}"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <polyline
      points="${x3},${y3} ${x4},${y4}"
      fill="none"
      stroke="${PURPLE}"
      stroke-width="${strokeW}"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <!-- T crossbar at bottom -->
    <line
      x1="${tLeft}" y1="${tY}"
      x2="${tRight}" y2="${tY}"
      stroke="${PURPLE}"
      stroke-width="${strokeW}"
      stroke-linecap="round"
    />
    <!-- T stem -->
    <line
      x1="${cx}" y1="${tY}"
      x2="${cx}" y2="${stemBottom}"
      stroke="${PURPLE}"
      stroke-width="${strokeW}"
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
  const padding = size * 0.15;
  const iconSvgInner = createIconSVG(size, padding);
  // Composite: bg + icon
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <rect width="${size}" height="${size}" rx="${size * 0.18}" fill="${BG_COLOR}"/>
    ${iconSvgInner.replace(/<\/?svg[^>]*>/g, '')}
  </svg>`;
}

async function generate() {
  // Android adaptive icon foreground (432x432, icon in center 288x288 safe zone)
  const fgSvg = createIconSVG(432, 72);
  await sharp(Buffer.from(fgSvg))
    .png()
    .toFile(path.join(OUT, 'android-icon-foreground.png'));
  console.log('✓ android-icon-foreground.png');

  // Android adaptive icon background (432x432, solid color)
  const bgSvg = createBgSVG(432);
  await sharp(Buffer.from(bgSvg))
    .png()
    .toFile(path.join(OUT, 'android-icon-background.png'));
  console.log('✓ android-icon-background.png');

  // Android monochrome (432x432, white on transparent)
  const monoSvg = createIconSVG(432, 72).replace(new RegExp(PURPLE, 'g'), '#FFFFFF');
  await sharp(Buffer.from(monoSvg))
    .png()
    .toFile(path.join(OUT, 'android-icon-monochrome.png'));
  console.log('✓ android-icon-monochrome.png');

  // Main icon (1024x1024 with rounded rect bg)
  const mainSvg = createFullIconSVG(1024);
  await sharp(Buffer.from(mainSvg))
    .png()
    .toFile(path.join(OUT, 'icon.png'));
  console.log('✓ icon.png');

  // Favicon (48x48)
  const favSvg = createFullIconSVG(48);
  await sharp(Buffer.from(favSvg))
    .png()
    .toFile(path.join(OUT, 'favicon.png'));
  console.log('✓ favicon.png');

  // Splash icon (200x200, just the icon on transparent)
  const splashSvg = createIconSVG(200, 20);
  await sharp(Buffer.from(splashSvg))
    .png()
    .toFile(path.join(OUT, 'splash-icon.png'));
  console.log('✓ splash-icon.png');

  console.log('\nAll icons generated!');
}

generate().catch(console.error);
