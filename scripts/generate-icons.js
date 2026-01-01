#!/usr/bin/env node

/**
 * Generate favicon and app icons from SVG
 * This script uses sharp to convert the SVG icon to various sizes
 * 
 * Install dependencies: npm install sharp --save-dev
 * Run: node scripts/generate-icons.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const iconSvgPath = path.join(__dirname, '../src/app/icon.svg');
const outputDir = path.join(__dirname, '../src/app');

const sizes = {
  'favicon.ico': [16, 32], // Multi-size ICO
  'icon.png': 512,
  'apple-icon.png': 180,
  'icon-192.png': 192,
  'icon-512.png': 512,
};

async function generateIcons() {
  if (!fs.existsSync(iconSvgPath)) {
    console.error('icon.svg not found at:', iconSvgPath);
    process.exit(1);
  }

  console.log('Generating icons from:', iconSvgPath);

  // Generate PNG icons
  for (const [filename, size] of Object.entries(sizes)) {
    try {
      if (Array.isArray(size)) {
        // For ICO, we'll create a 32x32 PNG and let the system handle ICO
        // (ICO generation requires additional libraries)
        await sharp(iconSvgPath)
          .resize(32, 32)
          .png()
          .toFile(path.join(outputDir, filename.replace('.ico', '.png')));
        console.log(`✓ Generated ${filename.replace('.ico', '.png')} (32x32)`);
      } else {
        await sharp(iconSvgPath)
          .resize(size, size)
          .png()
          .toFile(path.join(outputDir, filename));
        console.log(`✓ Generated ${filename} (${size}x${size})`);
      }
    } catch (error) {
      console.error(`✗ Failed to generate ${filename}:`, error.message);
    }
  }

  console.log('\nIcons generated successfully!');
  console.log('\nNote: For favicon.ico, you may need to use an online converter');
  console.log('or install a tool like "to-ico" to convert the PNG to ICO format.');
}

generateIcons().catch(console.error);

