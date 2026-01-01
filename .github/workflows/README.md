# GitHub Actions Workflows

This directory contains CI/CD workflows for automated testing and quality checks.

## Available Workflows

### 1. `pr-checks.yml` - Fast PR Validation
**When it runs:** On every pull request and push to main

**What it does:**
- ✅ Linting (code style)
- ✅ Type checking
- ✅ Unit tests (Vitest)
- ✅ Build check

**Time:** ~2-5 minutes

**Use this for:** Quick feedback on PRs

---

### 2. `e2e-tests.yml` - End-to-End Tests
**When it runs:** On every pull request, push to main, or manual trigger

**What it does:**
- ✅ Runs Playwright E2E tests
- ✅ Uploads test reports as artifacts

**Time:** ~10-20 minutes

**Use this for:** Comprehensive user flow testing

---

### 3. `ci.yml` - Combined CI Pipeline
**When it runs:** On every pull request and push to main

**What it does:**
- Runs all checks from `pr-checks.yml` in parallel
- Then runs E2E tests after fast checks pass
- All-in-one workflow

**Time:** ~15-25 minutes total

**Use this for:** Complete validation in one workflow

---

## Setup Instructions

### 1. Choose Your Workflow Strategy

**Option A: Separate Workflows (Recommended)**
- Use `pr-checks.yml` for fast feedback
- Use `e2e-tests.yml` for comprehensive testing
- Faster PR feedback, E2E runs separately

**Option B: Combined Workflow**
- Use `ci.yml` for everything
- Simpler, but slower PR feedback

### 2. Configure GitHub Secrets

Go to: **Repository Settings → Secrets and variables → Actions**

Add these secrets:

**Required for E2E tests:**
- `TEST_USER_EMAIL` - Test user email for authentication
- `TEST_USER_PASSWORD` - Test user password
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for admin operations)

**Optional (if tests need them):**
- `OPENAI_API_KEY` - For tests that hit OpenAI (consider mocking instead)

### 3. Enable Branch Protection (Optional but Recommended)

Go to: **Repository Settings → Branches → Add rule**

For `main` branch:
- ✅ Require status checks to pass before merging
- Select: `lint`, `typecheck`, `unit-tests`, `build` (and `e2e-tests` if using combined workflow)
- ✅ Require branches to be up to date before merging

This prevents merging broken code!

---

## Workflow Status Badges

Add these to your README.md to show test status:

```markdown
![CI](https://github.com/your-username/your-repo/workflows/CI/badge.svg)
![PR Checks](https://github.com/your-username/your-repo/workflows/PR%20Checks/badge.svg)
![E2E Tests](https://github.com/your-username/your-repo/workflows/E2E%20Tests/badge.svg)
```

Replace `your-username` and `your-repo` with your actual GitHub username and repository name.

---

## Troubleshooting

### Tests failing in CI but passing locally?
- Check environment variables are set correctly
- Verify test database/credentials are accessible
- Check Playwright browser installation

### Workflow not running?
- Check workflow file syntax (YAML is sensitive to indentation)
- Verify workflow is in `.github/workflows/` directory
- Check branch names match your repository

### Slow E2E tests?
- Consider running only critical tests on PRs
- Use test sharding to parallelize
- Cache Playwright browsers between runs

---

## Next Steps

1. ✅ Choose your workflow strategy
2. ✅ Set up GitHub Secrets
3. ✅ Push code and watch workflows run
4. ✅ Add status badges to README
5. ✅ Enable branch protection rules

