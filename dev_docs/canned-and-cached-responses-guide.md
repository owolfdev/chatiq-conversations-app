# Pre-configured and Cached Responses Guide

## Overview

ChatIQ uses two powerful systems to provide fast, cost-effective responses: **Pre-configured Responses** and **Response Caching**. Understanding how these work will help you optimize your chatbot's performance and reduce costs.

## What Are Pre-configured Responses?

**Pre-configured Responses** are instant, zero-cost replies that you manually configure for specific patterns or messages. They are checked **before** any AI processing happens, making them perfect for common queries like greetings, FAQs, and simple interactions.

### Key Features

- ✅ **Instant responses** (<5ms, no API calls)
- ✅ **Zero cost** (no OpenAI API usage)
- ✅ **Always available** (work even when free tier expires)
- ✅ **Unlimited** (no quota limits)
- ✅ **Customizable** (per-bot configuration)

### How They Work

1. User sends a message
2. System checks if message matches any pre-configured response pattern
3. If match found → Returns pre-configured response immediately (no LLM call)
4. If no match → Continues to cache check, then LLM

### When to Use Pre-configured Responses

**Perfect for:**
- Greetings: "Hi", "Hello", "Hey"
- Common questions: "What are your hours?", "How do I contact support?"
- Simple acknowledgments: "Thanks", "Thank you", "OK"
- Frequently asked questions with fixed answers
- Error messages or system status updates

**Not ideal for:**
- Complex questions requiring AI reasoning
- Questions that need document retrieval
- Dynamic responses that change based on context

### Setting Up Pre-configured Responses

1. Go to your bot's **Edit** page
2. Scroll to **"Pre-configured Responses"** section
3. Click **"+ Add Response"**
4. Configure:
   - **Pattern**: The text to match (e.g., "hi|hello|hey" for regex)
   - **Pattern Type**: Choose "exact", "keyword", or "regex"
   - **Response**: The message to return
   - **Priority**: Higher priority responses are checked first
   - **Fuzzy Matching**: Allow typos (Levenshtein distance 0-3)

### Pattern Types

**Exact Match**
- Matches the exact message (case-insensitive by default)
- Example: Pattern "hello" matches "Hello" but not "Hello there"

**Keyword Match**
- Matches if the pattern appears anywhere in the message
- Example: Pattern "hours" matches "What are your hours?" and "business hours"

**Regex Match**
- Full regular expression support
- Example: Pattern "hi|hello|hey" matches any of those words
- Example: Pattern "^(hi|hello)" matches messages starting with "hi" or "hello"

### Special System Patterns

These special patterns take precedence over regular pre-configured responses and the default response:

**`system_unavailable`**
- Shown when the AI service is temporarily unavailable or free tier has expired
- Use pattern type "exact" for these special patterns
- Takes precedence over the bot's default response field

**`quota_exceeded`**
- Shown to public users when your quota is exceeded
- Use pattern type "exact" for these special patterns
- Takes precedence over the bot's default response field

### Useful Patterns

Here are some common patterns you might want to use:

- **Greetings**: `Hi|Hello|Hey|Greetings` (regex)
- **Thanks**: `thanks|thank you|ty` (regex)
- **Hours**: `hours|business hours|open` (keyword)
- **Contact**: `contact|email|phone|support` (keyword)

## What Is Response Caching?

**Response Caching** automatically stores AI-generated responses and reuses them for similar questions. When a user asks a question that's similar to one asked before, the system returns the cached response instead of calling the LLM again.

### Key Features

- ✅ **Automatic** (no configuration needed)
- ✅ **Cost savings** (reduces OpenAI API calls)
- ✅ **Faster responses** (instant for cached queries)
- ✅ **Similarity matching** (uses AI embeddings to find similar questions)
- ✅ **Smart invalidation** (clears when bot settings change)

### How It Works

1. User sends a message
2. System generates an embedding (vector representation) of the message
3. System searches cache for similar messages (using vector similarity)
4. If similar message found (similarity > 85%) → Returns cached response
5. If no cache hit → Calls LLM, then saves response to cache

### Cache Invalidation

The cache is automatically cleared when:
- Bot's system prompt changes
- Bot is deleted
- Cache entry expires (30 days TTL)
- Manual cache clear (via "Clear Cache" button)

### When Caching Helps Most

**High cache hit rates occur when:**
- Multiple users ask similar questions
- Same user asks variations of the same question
- Common questions are asked repeatedly
- Bot documentation is stable (not frequently updated)

**Lower cache hit rates when:**
- Questions are highly varied
- Bot documentation changes frequently
- System prompt is updated often

## The Difference: Pre-configured vs Cached

| Feature | Pre-configured Responses | Cached Responses |
|---------|-----------------|------------------|
| **Setup** | Manual (you configure) | Automatic (no setup) |
| **Speed** | Instant (<5ms) | Instant (if cached) |
| **Cost** | Free (zero cost) | Free (if cached, saves LLM call) |
| **Matching** | Pattern-based (regex/keyword/exact) | Similarity-based (AI embeddings) |
| **Use Case** | Common, predictable queries | Similar questions asked before |
| **Availability** | Always works (even when free tier expires) | Works if previously cached |
| **Control** | Full control over patterns and responses | Automatic, based on past interactions |

## Response Flow

Here's the complete flow when a user sends a message:

```
User Message
  ↓
1. Check Pre-configured Responses
   → Match? → Return response ✅ (instant, free)
   → No match → Continue
  ↓
2. Check Response Cache
   → Similar question found? → Return cached response ✅ (instant, free)
   → No cache → Continue
  ↓
3. Check Free Tier Status (if free plan)
   → Expired? → Block LLM, show upgrade prompt ❌
   → Active → Continue
  ↓
4. Call LLM (OpenAI API)
   → Generate response
   → Save to cache for future use
   → Return response ✅
```

## Best Practices

### For Pre-configured Responses

1. **Start with common queries**: Add pre-configured responses for greetings, thanks, and your top 5-10 FAQs
2. **Use regex for variations**: Instead of multiple exact matches, use regex like `hi|hello|hey`
3. **Set priorities**: Give important responses higher priority
4. **Test patterns**: Use the bot interface to test if your patterns match correctly
5. **Keep it simple**: Don't over-complicate patterns; start simple and refine

### For Response Caching

1. **Let it work automatically**: No configuration needed, just let it run
2. **Clear cache when needed**: Use "Clear Cache" button after major bot updates
3. **Monitor cache performance**: Check if similar questions are being cached effectively
4. **Update system prompt carefully**: System prompt changes clear the cache automatically

### Combining Both

The best strategy is to use both:
- **Pre-configured responses** for predictable, common queries (greetings, simple FAQs)
- **Response caching** for AI-generated responses to similar questions
- Together, they maximize speed and minimize costs

## Default Response

In addition to pre-configured responses, you can set a **Default Response** in your bot settings. This is used when:
- No pre-configured response matches
- No cached response is available
- LLM is unavailable (API down, free tier expired, etc.)

**Setting Default Response:**
1. Go to bot **Edit** page
2. Find **"Default Response"** field (below System Prompt)
3. Enter your message (e.g., "I'm currently unable to process complex questions. Please contact support for more assistance.")
4. Save

**Note**: Special system patterns (`system_unavailable`, `quota_exceeded`) take precedence over the default response.

## Free Tier Behavior

### During Free Trial (Days 1-30)
- ✅ Pre-configured responses work
- ✅ Cached responses work
- ✅ LLM responses work

### After Free Trial Expires (Day 31+)
- ✅ Pre-configured responses still work (unlimited, free)
- ✅ Cached responses still work (if previously cached)
- ❌ LLM responses blocked (requires upgrade)

This graceful degradation ensures your bot continues to work for simple queries while encouraging upgrades for AI-powered responses.

## Troubleshooting

### Pre-configured Response Not Matching

**Problem**: Pattern doesn't match expected messages

**Solutions**:
- Check pattern type (exact vs keyword vs regex)
- Verify case sensitivity setting
- Test with actual user messages
- Use regex tester to validate patterns
- Check priority (higher priority responses checked first)

### Cache Not Working

**Problem**: Similar questions not using cached responses

**Solutions**:
- Cache requires exact or very similar questions (85%+ similarity)
- Check if cache was cleared recently
- Verify system prompt hasn't changed (clears cache)
- Wait for cache to populate (first question always calls LLM)

### Response Not Showing

**Problem**: Expected response not appearing

**Check order**:
1. Is there a pre-configured response that matches?
2. Is there a cached response for similar question?
3. Is free tier expired? (blocks LLM)
4. Is default response set?
5. Check special system patterns

## Advanced Tips

### Regex Patterns

- `^(hi|hello)` - Starts with "hi" or "hello"
- `(thanks|thank you|ty)` - Contains any of these
- `.*hours.*` - Contains "hours" anywhere
- `^(yes|y|ok|okay)$` - Exact match for any of these

### Priority Strategy

- Set high priority (e.g., 100) for critical responses
- Set medium priority (e.g., 50) for common responses
- Set low priority (e.g., 0) for fallback responses

### Cache Management

- Clear cache after major documentation updates
- Clear cache if responses seem stale
- Cache automatically expires after 30 days
- Cache is per-bot (not shared across bots)

## Summary

**Pre-configured Responses** = Manual, pattern-based, instant responses for predictable queries  
**Cached Responses** = Automatic, similarity-based, instant responses for similar past questions

Together, they provide:
- ⚡ Faster responses
- 💰 Lower costs
- 🎯 Better user experience
- 🔄 Graceful degradation when LLM is unavailable

Use pre-configured responses for common queries, let caching handle similar questions, and set a default response for edge cases. This combination maximizes your bot's efficiency and cost-effectiveness.
