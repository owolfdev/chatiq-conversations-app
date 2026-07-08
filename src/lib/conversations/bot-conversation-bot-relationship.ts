/**
 * PostgREST embed hint for bot_conversations → bot_bots.
 *
 * After `active_demo_bot_id` was added, bot_conversations has two FKs to bot_bots.
 * Unqualified `bot_bots!inner(...)` fails with "more than one relationship was found".
 */
export const CONVERSATION_HOST_BOT_EMBED =
  "bot_bots!bot_conversations_bot_id_fkey!inner";
