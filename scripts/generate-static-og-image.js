#!/usr/bin/env node
/**
 * Script to generate a static Open Graph image
 * This saves the dynamically generated image as a static PNG file
 * 
 * Usage: node scripts/generate-static-og-image.js
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const outputPath = path.join(process.cwd(), 'public', 'og-image.png');
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const imageUrl = `${appUrl}/api/og-image`;

console.log(`Generating static OG image from ${imageUrl}...`);

const protocol = appUrl.startsWith('https') ? https : http;

const request = protocol.get(imageUrl, (response) => {
  if (response.statusCode !== 200) {
    console.error(`Error: Received status code ${response.statusCode}`);
    process.exit(1);
  }

  const contentType = response.headers['content-type'];
  if (!contentType || !contentType.startsWith('image/')) {
    console.error(`Error: Expected image, got ${contentType}`);
    process.exit(1);
  }

  const fileStream = fs.createWriteStream(outputPath);
  response.pipe(fileStream);

  fileStream.on('finish', () => {
    fileStream.close();
    const stats = fs.statSync(outputPath);
    console.log(`✅ Static OG image saved to: ${outputPath}`);
    console.log(`   File size: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`\n💡 You can now reference this file as /og-image.png in your metadata`);
  });
});

request.on('error', (error) => {
  console.error(`Error fetching image: ${error.message}`);
  console.error(`\nMake sure your dev server is running (npm run dev)`);
  console.error(`Or set NEXT_PUBLIC_APP_URL to your production URL`);
  process.exit(1);
});

request.end();

