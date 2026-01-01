# Conversation Topics (Heuristic v1)

## Overview
- We are introducing `topic` labels for conversations (instead of relying on `title`).
- Topics are derived from recent user messages using heuristics/keywords.
- Titles remain in the database for now and are not modified.

## Goals
- Help teams identify conversations quickly (topic + date + status later).
- Keep runtime overhead low (no LLM calls in v1).
- Allow future evolution to LLM classification and team-specific overrides.

## Data model
Added to `bot_conversations`:
- `topic` (text)
- `topic_source` (text) - currently `heuristic`
- `topic_confidence` (numeric)
- `topic_updated_at` (timestamp)

Migration: `supabase/migrations/20251231000001_add_conversation_topics.sql`

## Topic set (service-business default)
- Greeting / Small Talk
- Booking / Reservation / Appointment
- Availability / Hours / Location
- Pricing / Fees / Quotes
- Order Status / ETA
- Cancellation / Reschedule / Refunds
- Complaint / Dissatisfaction
- Product / Service Inquiry
- Payment Issues
- General Inquiry (fallback)

## Heuristic classification
Implementation: `src/lib/conversations/topic-classifier.ts`

Rules:
- Use last 2–3 user messages (combined, normalized).
- Score topics by keyword matches (weights).
- Pick the highest score if >= 1.5; otherwise use General Inquiry.
- Greeting only wins if no stronger topic is found.

## Update triggers
Implementation: `src/lib/conversations/update-conversation-topic.ts`

Trigger on new user messages when:
- There are at least 2 user messages total, OR
- The latest user message is "substantial" (>= 40 chars or >= 8 words).

Topic update rules:
- If a stronger topic exists, update `topic`.
- Greeting never overrides a non-greeting topic.
- If the topic is unchanged, skip update.

## Where updates happen
- Web chat saves: `src/lib/chat/save-chat.ts`
- LINE integration messages: `src/lib/integrations/line/process-line-events.ts`

## UI changes
- Conversations list shows Topic in place of Title:
  `src/app/(app)/dashboard/conversations/conversations-client.tsx`
- Data fetch includes `topic`:
  `src/app/actions/conversations/get-conversations.ts`

## Future improvements (not implemented)
- LLM-based topic classification for higher accuracy.
- Team-specific keyword overrides (per team).
- Topic history or timeline.
- Urgency/status classification and badges.

## Conversation resolution status
- New conversations default to `unresolved`.
- Humans can toggle status between `resolved` and `unresolved`.
- Data field: `bot_conversations.resolution_status`.
- API route: `src/app/api/conversations/[id]/status/route.ts`.
- UI:
  - List badge in `src/app/(app)/dashboard/conversations/conversations-client.tsx`.
  - Toggle in `src/components/chat/conversation-viewer.tsx`.
