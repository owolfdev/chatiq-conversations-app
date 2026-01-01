#!/usr/bin/env node
/**
 * Generate test document content for moderation testing
 * Usage: node scripts/generate-test-document.js [category]
 * 
 * Categories: hate, violence, self-harm, sexual, harassment, clean
 */

const testContent = {
  hate: `This document contains test content that may trigger hate speech moderation flags.
The content includes discriminatory language and references that are inappropriate.
This is for testing purposes only in development environments.`,

  violence: `This document contains test content that may trigger violence moderation flags.
The content includes references to harmful acts and violent behavior.
This is for testing purposes only in development environments.`,

  "self-harm": `This document contains test content that may trigger self-harm moderation flags.
The content includes references to self-injury and harmful behaviors.
This is for testing purposes only in development environments.`,

  sexual: `This document contains test content that may trigger sexual content moderation flags.
The content includes explicit language and inappropriate references.
This is for testing purposes only in development environments.`,

  harassment: `This document contains test content that may trigger harassment moderation flags.
The content includes threatening language and inappropriate behavior references.
This is for testing purposes only in development environments.`,

  clean: `This is a clean test document that should not trigger any moderation flags.
It contains normal, appropriate content suitable for a knowledge base.
This document discusses technical topics and best practices.`,
};

const category = process.argv[2] || "clean";

if (!testContent[category]) {
  console.error(`Unknown category: ${category}`);
  console.error(`Available categories: ${Object.keys(testContent).join(", ")}`);
  process.exit(1);
}

console.log(`# Test Document Content (${category})`);
console.log(`# Copy this content to test document moderation\n`);
console.log(testContent[category]);
console.log(`\n# Note: OpenAI's moderation API is ML-based, so results may vary.`);
console.log(`# This content may or may not trigger flags depending on the model.`);

