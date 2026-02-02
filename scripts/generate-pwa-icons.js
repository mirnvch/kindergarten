#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Generate PWA icons from SVG source
 *
 * Usage:
 *   npm install sharp --save-dev
 *   node scripts/generate-pwa-icons.js
 *
 * Or use https://realfavicongenerator.net for production icons
 */

const fs = require('fs');
const path = require('path');

async function generateIcons() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.error('Please install sharp: npm install sharp --save-dev');
    console.log('\nAlternatively, use https://realfavicongenerator.net to generate icons');
    process.exit(1);
  }

  const svgPath = path.join(__dirname, '../public/icons/icon.svg');
  const outputDir = path.join(__dirname, '../public/icons');

  const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

  const svgBuffer = fs.readFileSync(svgPath);

  console.log('Generating PWA icons...');

  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);

    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`  Created: icon-${size}x${size}.png`);
  }

  // Generate favicon
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(__dirname, '../public/favicon.ico'));
  console.log('  Created: favicon.ico');

  // Generate Apple touch icon
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(__dirname, '../public/apple-touch-icon.png'));
  console.log('  Created: apple-touch-icon.png');

  console.log('\nDone! Icons generated successfully.');
}

generateIcons().catch(console.error);
