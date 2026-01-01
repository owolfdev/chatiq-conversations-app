// src/lib/audit/constants.ts

export const AUDIT_ACTION = {
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
  ROTATE: "rotate",
  ACTIVATE: "activate",
  DEACTIVATE: "deactivate",
  BILLING_UPDATE: "billing.update",
  BILLING_PORTAL: "billing.portal",
  BILLING_PAYMENT_METHOD: "billing.payment_method",
  MODERATION_FLAGGED: "moderation.flagged",
  RATE_LIMIT_WARNING: "rate_limit.warning",
  RATE_LIMIT_BLOCKED: "rate_limit.blocked",
} as const;

export type AuditAction = (typeof AUDIT_ACTION)[keyof typeof AUDIT_ACTION];

export const AUDIT_RESOURCE = {
  BOT: "bot",
  DOCUMENT: "document",
  API_KEY: "api_key",
  COLLECTION: "collection",
  CONVERSATION: "conversation",
  BILLING: "billing",
  TEAM: "team",
  TEAM_INVITE: "team_invite",
  TEAM_MEMBER: "team_member",
  USER: "user",
  RATE_LIMIT: "rate_limit",
} as const;

export type AuditResourceType =
  (typeof AUDIT_RESOURCE)[keyof typeof AUDIT_RESOURCE];
