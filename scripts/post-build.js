// Post-build script to work around Next.js 16/Vercel proxy/middleware file tracing issues
// Next.js 16 uses proxy.ts (replaces middleware.ts) and compiles to edge/chunks/
// Vercel's file tracing looks for .next/server/middleware.js.nft.json. This script creates the nft.json file.

const fs = require('fs');
const path = require('path');

// Create the nft.json file that Vercel expects for file tracing
const nftFilePath = path.join(process.cwd(), '.next', 'server', 'middleware.js.nft.json');
const nftDir = path.dirname(nftFilePath);

if (!fs.existsSync(nftDir)) {
  fs.mkdirSync(nftDir, { recursive: true });
}

if (!fs.existsSync(nftFilePath)) {
  fs.writeFileSync(nftFilePath, JSON.stringify({
    version: 1,
    files: [],
  }, null, 2));
  console.log('Created middleware.js.nft.json workaround file');
}

// Preserve the middleware.js that Next.js generates so the edge handler can run normally.
// We only create the nft marker; altering middleware.js can cause runtime launch errors.
const serverMiddlewarePath = path.join(process.cwd(), '.next', 'server', 'middleware.js');
if (fs.existsSync(serverMiddlewarePath)) {
  console.log('middleware.js present – leaving the generated handler untouched');
} else {
  console.warn('middleware.js not found after build (expected on some Next.js versions)');
  console.warn('If Vercel complains about middleware tracing, ensure the build produced edge chunks.');
}
