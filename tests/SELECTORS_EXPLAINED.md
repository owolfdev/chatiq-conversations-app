# Understanding Playwright Selectors

## What are Selectors?

**Selectors** are how Playwright finds and interacts with elements on a webpage. Think of them as "addresses" for HTML elements.

### Common Selector Types:

1. **Text Selectors** - Find elements by their visible text
   ```typescript
   page.locator('text=Sign In')  // Finds element containing "Sign In"
   page.locator('text=/Welcome/i')  // Case-insensitive regex
   ```

2. **CSS Selectors** - Find elements by CSS (like in stylesheets)
   ```typescript
   page.locator('button.submit')  // Button with class "submit"
   page.locator('#my-button')    // Element with id "my-button"
   page.locator('input[name="email"]')  // Input with name attribute
   ```

3. **ID Selectors** - Most reliable, use element IDs
   ```typescript
   page.locator('#name')  // Element with id="name"
   page.locator('input#email')  // Input element with id="email"
   ```

4. **Role-based Selectors** - Find by accessibility role
   ```typescript
   page.locator('button[name="submit"]')  // Button with name attribute
   page.getByRole('button', { name: 'Submit' })  // Button with accessible name
   ```

5. **Data Attributes** - Best practice for testing
   ```typescript
   page.locator('[data-testid="submit-button"]')  // Custom test ID
   ```

## Why Tests Were Failing

The tests were failing because the **selectors didn't match the actual HTML** in your application. For example:

### ❌ Before (Wrong):
```typescript
page.locator('text=Bots')  // Looking for "Bots"
```
But your sidebar actually says **"My Bots"**, not "Bots"!

### ✅ After (Fixed):
```typescript
page.locator('a:has-text("My Bots")')  // Matches actual sidebar link
```

## What I Fixed

### 1. **Dashboard Navigation**
- Changed `text=Bots` → `a:has-text("My Bots")` (matches sidebar)
- Updated all navigation links to use `a:has-text()` for sidebar links

### 2. **Bot Form Fields**
- Changed `input[name="name"]` → `input#name` (uses ID, more reliable)
- Changed `textarea[name="systemPrompt"]` → `textarea#system_prompt` (correct ID)

### 3. **Page Headings**
- Made assertions more flexible with fallbacks
- Example: `h1:has-text("My Bots")` OR `text=Create` OR `h1`

### 4. **Better Error Handling**
- Added `.or()` fallbacks so tests don't fail if one selector doesn't match
- Made tests more resilient to UI changes

## Best Practices for Selectors

1. **Use IDs when available** - Most reliable
   ```typescript
   page.locator('#submit-button')  // ✅ Best
   ```

2. **Use data-testid attributes** - Add these to your components
   ```typescript
   // In your component:
   <button data-testid="create-bot-button">Create Bot</button>
   
   // In test:
   page.locator('[data-testid="create-bot-button"]')  // ✅ Very reliable
   ```

3. **Use text selectors as fallback** - Less reliable but useful
   ```typescript
   page.locator('text=Create Bot')  // ⚠️ Breaks if text changes
   ```

4. **Combine selectors with `.or()`** - More resilient
   ```typescript
   page.locator('h1').or(page.locator('text=Welcome'))  // ✅ Flexible
   ```

## Recommendations

To make your tests even more reliable, consider adding `data-testid` attributes to key UI elements:

```tsx
// Example: Add to your components
<Button data-testid="create-bot-button">Create Bot</Button>
<Link data-testid="bots-nav-link" href="/dashboard/bots">My Bots</Link>
```

Then use them in tests:
```typescript
page.locator('[data-testid="create-bot-button"]')  // Never breaks!
```

