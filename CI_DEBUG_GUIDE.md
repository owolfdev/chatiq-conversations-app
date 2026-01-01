# CI Debugging Guide

## The Problem

**Tests work locally but fail in CI.**

This is frustrating! Here's what we know:

### ✅ What Works Locally
- `npm run typecheck` - passes
- `npm test -- --run` - passes  
- `npm run build` - works

### ❌ What Fails in CI
- All checks fail with "Process completed with exit code 1"
- We can't see the actual error messages

## Why This Happens

CI environments are **different** from your local machine:

1. **Clean environment** - No previous builds, no cached files
2. **Different Node version** - CI uses exact version, you might have different
3. **Different OS** - CI runs on Linux, you might be on Mac/Windows
4. **No .next folder** - In CI, `.next` doesn't exist until build runs
5. **Strict error handling** - CI fails fast on any error

## How to See the Real Error

The error message is there, we just need to find it:

### Step 1: Go to GitHub Actions
1. Open: `https://github.com/owolfdev/chatiq/actions`
2. Click on the failed workflow (e.g., "Simple Type Check #1")

### Step 2: Click the Failed Job
- Click on "Type Check Only" (the red ❌)

### Step 3: Expand the Failed Step
- Scroll down to see the steps
- Click the arrow (▶) next to "Run TypeScript type check"
- **This is where the real error is!**

### Step 4: Look for Red Text
- TypeScript errors will be in red
- Look for file paths and line numbers
- Copy the entire error message

## Common CI vs Local Differences

### 1. Missing Files
- **Local:** You might have generated files (`.next/`, `node_modules/`)
- **CI:** Fresh install, no generated files
- **Fix:** Make sure `tsconfig.json` doesn't require files that don't exist

### 2. Node Version
- **Local:** You have Node v20.9.0 (with warnings)
- **CI:** Uses Node v20 (exact version)
- **Fix:** Match Node versions

### 3. Environment Variables
- **Local:** You have `.env.local` with all variables
- **CI:** Only has variables we explicitly set
- **Fix:** Add all required vars to workflow

## What to Do Next

1. **See the actual error** (follow steps above)
2. **Share the error** with me
3. **Fix it together**

The error message will tell us exactly what's wrong!

## Quick Test

Try this locally to simulate CI:

```bash
# Clean everything
rm -rf node_modules .next dist build

# Fresh install
npm ci

# Run typecheck
npm run typecheck
```

If this fails locally, that's the CI issue!
If this passes locally, the issue is CI-specific (Node version, paths, etc.)

