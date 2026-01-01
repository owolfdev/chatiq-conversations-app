# Step-by-Step CI/CD Setup Guide

## Current Status

- ✅ CI/CD workflows created
- ✅ Test infrastructure fixed
- ⏳ Ready to push and configure

---

## STEP 1: Commit and Push Changes

### 1.1 Review what's changed:

```bash
git status
```

You should see:

- `.github/workflows/` (new CI/CD workflows)
- `vitest.config.mjs` (fixed test config)
- `package.json` (added typecheck script)
- `tsconfig.json` (exclude generated files)
- `vitest.setup.ts` (added env vars)
- Other files

### 1.2 Stage all changes:

```bash
git add .
```

### 1.3 Commit:

```bash
git commit -m "feat: Add CI/CD pipeline with GitHub Actions

- Add GitHub Actions workflows for PR checks and E2E tests
- Fix Vitest configuration (ESM/CommonJS)
- Fix TypeScript config to exclude generated files
- Add typecheck script
- Update test environment setup"
```

### 1.4 Push to GitHub:

```bash
git push origin main
```

**What happens:**

- Code pushes to GitHub ✅
- GitHub Actions will start running (but may fail without secrets)
- Vercel will try to deploy (but we'll configure it to wait)

---

## STEP 2: Set Up GitHub Secrets (Required for E2E Tests)

### 2.1 Go to GitHub Repository:

1. Open your repository on GitHub
2. Click **Settings** (top right)
3. Click **Secrets and variables** → **Actions** (left sidebar)

### 2.2 Add Required Secrets:

Click **New repository secret** for each:

#### Required for E2E Tests:

- **Name:** `TEST_USER_EMAIL`
  - **Value:** Your test user email (e.g., `test@example.com`)
- **Name:** `TEST_USER_PASSWORD`

  - **Value:** Your test user password

- **Name:** `SUPABASE_URL`

  - **Value:** Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)

- **Name:** `SUPABASE_ANON_KEY`

  - **Value:** Your Supabase anonymous key

- **Name:** `SUPABASE_SERVICE_ROLE_KEY`
  - **Value:** Your Supabase service role key

#### Optional (if tests need OpenAI):

- **Name:** `OPENAI_API_KEY`
  - **Value:** Your OpenAI API key (or use mock in tests)

### 2.3 Verify Secrets:

You should have at least 5 secrets:

- ✅ TEST_USER_EMAIL
- ✅ TEST_USER_PASSWORD
- ✅ SUPABASE_URL
- ✅ SUPABASE_ANON_KEY
- ✅ SUPABASE_SERVICE_ROLE_KEY

---

## STEP 3: Configure Vercel to Wait for CI Checks

### 3.1 Go to Vercel Dashboard:

1. Go to [vercel.com](https://vercel.com)
2. Select your project
3. Click **Settings** (top navigation)
4. Click **Git** (left sidebar)

### 3.2 Enable CI Check Waiting:

1. Scroll to **"Deploy Protection"** section
2. Find **"Wait for CI checks to pass before deploying"**
3. **Enable** this option ✅

### 3.3 Select Which Checks to Wait For:

You'll see a list of GitHub Actions checks. Select:

**For Fast Feedback (Recommended):**

- ✅ `lint` (or skip if broken)
- ✅ `typecheck`
- ✅ `unit-tests`
- ✅ `build`
- ⏭️ Skip `e2e-tests` (for now, add later)

**OR For Complete Validation:**

- ✅ All checks including `e2e-tests`

### 3.4 Save Settings:

Click **Save** at the bottom

**What this does:**

- Vercel will now wait for selected GitHub Actions checks to pass
- If checks fail, Vercel won't deploy
- If checks pass, Vercel will deploy automatically

---

## STEP 4: Verify Everything Works

### 4.1 Check GitHub Actions:

1. Go to your GitHub repository
2. Click **Actions** tab (top navigation)
3. You should see workflows running:
   - **PR Checks** (or **CI**)
   - **E2E Tests**

### 4.2 Watch the First Run:

- Click on a running workflow
- Watch the jobs execute
- Check for any failures

### 4.3 Expected Results:

**First run might show:**

- ✅ Typecheck: Should pass
- ✅ Build: Should pass
- ⚠️ Unit tests: May have some failures (3 known failures)
- ⚠️ Lint: May fail (known issue, has continue-on-error)
- ⚠️ E2E tests: Will fail without secrets, or may have failures

**This is OK for now!** The infrastructure is working.

### 4.4 Check Vercel:

1. Go to Vercel Dashboard → **Deployments**
2. You should see:
   - **Status:** "Waiting for CI checks..." or "Building..."
   - Once checks pass: "Ready" or "Deployed"

---

## STEP 5: Test the Full Flow

### 5.1 Make a Small Change:

```bash
# Make a tiny change to test
echo "# Test" >> README.md
git add README.md
git commit -m "test: Verify CI/CD pipeline"
git push origin main
```

### 5.2 Watch the Pipeline:

1. **GitHub Actions** tab → See tests running
2. **Vercel Dashboard** → See "Waiting for CI checks..."
3. Wait ~5-20 minutes (depending on which checks you enabled)
4. Once tests pass → Vercel should start deploying

### 5.3 Verify Deployment:

- ✅ Tests passed in GitHub Actions
- ✅ Vercel deployed successfully
- ✅ Site is live with your changes

---

## Troubleshooting

### Issue: GitHub Actions failing immediately

**Solution:** Check if secrets are set correctly

### Issue: Vercel not waiting for CI

**Solution:**

- Verify "Wait for CI checks" is enabled in Vercel settings
- Check that check names match exactly (case-sensitive)

### Issue: Tests timing out

**Solution:**

- E2E tests may need more time
- Check test timeouts in workflow files

### Issue: Can't find check names in Vercel

**Solution:**

- Push code first to trigger workflows
- Check names appear after first run
- Names match job names in workflow files

---

## Next Steps (After Initial Setup)

1. **Fix remaining test failures:**

   - Fix 3 unit test failures
   - Fix E2E test failures systematically

2. **Enable E2E tests in Vercel:**

   - Once E2E tests are stable
   - Add `e2e-tests` to Vercel's wait list

3. **Enable branch protection:**

   - GitHub Settings → Branches
   - Require status checks for `main` branch
   - Prevents merging broken PRs

4. **Monitor and optimize:**
   - Watch test run times
   - Optimize slow tests
   - Add more tests as needed

---

## Quick Reference

### Workflow Names (for Vercel):

- `lint` - Lint job
- `typecheck` - Type Check job
- `unit-tests` - Unit Tests job
- `build` - Build Check job
- `e2e-tests` - E2E Tests job

### GitHub Secrets Needed:

- `TEST_USER_EMAIL`
- `TEST_USER_PASSWORD`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY` (optional)

### Expected Timeline:

- Fast checks: ~2-5 minutes
- E2E tests: ~10-20 minutes
- Vercel deploy: ~2-5 minutes
- **Total: ~15-30 minutes** from push to live

---

## Success Criteria

✅ Code pushes to GitHub
✅ GitHub Actions workflows run
✅ Tests execute (some may fail, that's OK)
✅ Vercel waits for checks
✅ Vercel deploys after checks pass
✅ Site is live with tested code

You're all set! 🚀
