/**
 * Generate all app icons and splash screens from the master 1024x1024 PNG.
 *
 * Run: node scripts/generate-icons.mjs
 */

import sharp from 'sharp';
import { mkdir, copyFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SRC = resolve(ROOT, 'kaduna-wdc-app-icon-1024.png');

// Brand palette derived from the icon
const BG_DARK = '#1F4438';    // dark forest green (icon background)
const BG_LIGHT = '#2A6048';   // lighter green for gradient
const ACCENT = '#C9A66B';     // golden dot
const CREAM = '#F5EDDD';      // off-white letter colour

if (!existsSync(SRC)) {
  console.error(`Source icon not found at ${SRC}`);
  process.exit(1);
}

async function ensureDir(p) {
  await mkdir(p, { recursive: true });
}

// ───── Web (public/icons) ─────────────────────────────────────────────────────
async function buildWebIcons() {
  const publicIcons = resolve(ROOT, 'public', 'icons');
  await ensureDir(publicIcons);

  const sizes = [
    { name: 'icon-192.png', size: 192 },
    { name: 'icon-512.png', size: 512 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'favicon-32.png', size: 32 },
    { name: 'favicon-16.png', size: 16 },
  ];

  for (const { name, size } of sizes) {
    await sharp(SRC).resize(size, size).png().toFile(resolve(publicIcons, name));
    console.log(`✓ public/icons/${name}`);
  }

  // Also drop a high-res favicon directly in public/
  await sharp(SRC).resize(64, 64).png().toFile(resolve(ROOT, 'public', 'favicon.png'));
  console.log('✓ public/favicon.png');
}

// ───── Android launcher icons ─────────────────────────────────────────────────
async function buildAndroidIcons() {
  const res = resolve(ROOT, 'android', 'app', 'src', 'main', 'res');
  if (!existsSync(res)) {
    console.warn('  android/app/src/main/res not found — skipping Android');
    return;
  }

  // Standard launcher icons (ic_launcher.png) — sized per density
  const densities = [
    { dir: 'mipmap-mdpi',    size: 48 },
    { dir: 'mipmap-hdpi',    size: 72 },
    { dir: 'mipmap-xhdpi',   size: 96 },
    { dir: 'mipmap-xxhdpi',  size: 144 },
    { dir: 'mipmap-xxxhdpi', size: 192 },
  ];

  for (const { dir, size } of densities) {
    const targetDir = resolve(res, dir);
    await ensureDir(targetDir);
    // Square launcher icon
    await sharp(SRC).resize(size, size).png()
      .toFile(resolve(targetDir, 'ic_launcher.png'));
    // Round launcher icon — Android handles the circle mask via adaptive XML,
    // so we just provide the same square here; the mipmap-anydpi-v26 XML
    // applies the round mask.
    await sharp(SRC).resize(size, size).png()
      .toFile(resolve(targetDir, 'ic_launcher_round.png'));
    // Foreground for adaptive icons — should fill 108dp safe area at 192/108=1.78x
    // So foreground PNG is sized (size * 108 / 48) to match the safe zone.
    const fgSize = Math.round(size * 108 / 48);
    await sharp(SRC).resize(fgSize, fgSize)
      // Pad to 108dp viewport (transparent edges) — keep full art visible
      .extend({
        top: Math.round(fgSize * 0.16),
        bottom: Math.round(fgSize * 0.16),
        left: Math.round(fgSize * 0.16),
        right: Math.round(fgSize * 0.16),
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(resolve(targetDir, 'ic_launcher_foreground.png'));
    console.log(`✓ android/${dir}/ic_launcher*.png (${size}px)`);
  }

  // Adaptive icon background — replace the teal grid with our brand green
  const bgXml = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path android:fillColor="${BG_DARK}" android:pathData="M0,0h108v108h-108z" />
</vector>
`;
  await writeFile(resolve(res, 'drawable', 'ic_launcher_background.xml'), bgXml);
  console.log('✓ android/res/drawable/ic_launcher_background.xml (brand green)');

  // colors.xml for theme tinting
  const valuesDir = resolve(res, 'values');
  await ensureDir(valuesDir);
  const colorsXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="colorPrimary">${BG_DARK}</color>
    <color name="colorPrimaryDark">${BG_DARK}</color>
    <color name="colorAccent">${ACCENT}</color>
    <color name="ic_launcher_background">${BG_DARK}</color>
    <color name="splash_background">${BG_DARK}</color>
</resources>
`;
  await writeFile(resolve(valuesDir, 'colors.xml'), colorsXml);
  console.log('✓ android/res/values/colors.xml (brand colours)');
}

// ───── Android splash screens ─────────────────────────────────────────────────
async function buildAndroidSplash() {
  const res = resolve(ROOT, 'android', 'app', 'src', 'main', 'res');
  if (!existsSync(res)) return;

  // Splash dimensions per density (portrait/landscape)
  const splashes = [
    { dir: 'drawable',                   w: 480,  h: 320  }, // default
    { dir: 'drawable-port-mdpi',         w: 320,  h: 480  },
    { dir: 'drawable-port-hdpi',         w: 480,  h: 800  },
    { dir: 'drawable-port-xhdpi',        w: 720,  h: 1280 },
    { dir: 'drawable-port-xxhdpi',       w: 960,  h: 1600 },
    { dir: 'drawable-port-xxxhdpi',      w: 1280, h: 1920 },
    { dir: 'drawable-land-mdpi',         w: 480,  h: 320  },
    { dir: 'drawable-land-hdpi',         w: 800,  h: 480  },
    { dir: 'drawable-land-xhdpi',        w: 1280, h: 720  },
    { dir: 'drawable-land-xxhdpi',       w: 1600, h: 960  },
    { dir: 'drawable-land-xxxhdpi',      w: 1920, h: 1280 },
  ];

  // Generate a square logo (35% of shortest side) centred on a flat brand-green canvas
  for (const { dir, w, h } of splashes) {
    const targetDir = resolve(res, dir);
    await ensureDir(targetDir);
    const logoSize = Math.round(Math.min(w, h) * 0.35);
    const logoBuf = await sharp(SRC).resize(logoSize, logoSize).png().toBuffer();
    await sharp({
      create: {
        width: w,
        height: h,
        channels: 4,
        background: BG_DARK,
      },
    })
      .composite([{ input: logoBuf, gravity: 'center' }])
      .png()
      .toFile(resolve(targetDir, 'splash.png'));
  }
  console.log(`✓ android splash.png × ${splashes.length} densities (${BG_DARK})`);
}

async function run() {
  console.log(`Building icons from ${SRC}\n`);
  await buildWebIcons();
  await buildAndroidIcons();
  await buildAndroidSplash();
  console.log('\nAll icons generated.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
