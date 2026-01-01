#!/usr/bin/env node
/**
 * Script to generate ChatIQ logo as PNG
 * Requires: puppeteer or playwright
 * 
 * Usage:
 *   npm install puppeteer
 *   node scripts/generate-logo-png.js
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function generateLogo() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Set viewport size
  await page.setViewport({ width: 800, height: 300, deviceScaleFactor: 2 });
  
  // Create HTML content
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@700&display=swap" rel="stylesheet">
      <style>
        body {
          margin: 0;
          padding: 0;
          background: transparent;
          display: flex;
          justify-content: center;
          align-items: center;
          width: 800px;
          height: 300px;
        }
        .logo-text {
          font-family: 'IBM Plex Sans', sans-serif;
          font-weight: 700;
          font-size: 120px;
          color: #10b981;
          letter-spacing: -0.02em;
          margin: 0;
          line-height: 1;
        }
      </style>
    </head>
    <body>
      <h1 class="logo-text">ChatIQ</h1>
    </body>
    </html>
  `;
  
  await page.setContent(html, { waitUntil: 'networkidle0' });
  
  // Wait for fonts to load
  await page.evaluateHandle(() => document.fonts.ready);
  
  // Take screenshot
  const logoElement = await page.$('h1');
  const outputPath = path.join(__dirname, '..', 'public', 'chatiq-logo.png');
  
  await logoElement.screenshot({
    path: outputPath,
    type: 'png',
    omitBackground: true, // Transparent background
  });
  
  console.log(`✅ Logo generated: ${outputPath}`);
  
  await browser.close();
}

// Check if puppeteer is available
try {
  require.resolve('puppeteer');
  generateLogo().catch(console.error);
} else {
  console.log('📦 Installing puppeteer...');
  console.log('Run: npm install puppeteer');
  console.log('Then run: node scripts/generate-logo-png.js');
  console.log('');
  console.log('Or use the HTML file:');
  console.log('1. Open scripts/generate-logo-png.html in a browser');
  console.log('2. Take a screenshot with transparent background');
  console.log('3. Save as public/chatiq-logo.png');
}

