import { createAdminClient } from "@/utils/supabase/admin";
import { logger } from "@/lib/logger";
import type { AuditAction, AuditResourceType } from "./constants";

type Nullable<T> = T | null | undefined;

export interface AuditLogEvent {
  teamId?: Nullable<string>;
  userId?: Nullable<string>;
  action: AuditAction | string;
  resourceType: AuditResourceType | string;
  resourceId?: Nullable<string>;
  metadata?: Record<string, unknown> | null;
  ipAddress?: Nullable<string>;
  userAgent?: Nullable<string>;
  createdAt?: Date;
}

export async function logAuditEvent(event: AuditLogEvent): Promise<void> {
  try {
    const admin = createAdminClient();

    const payload = {
      team_id: event.teamId ?? null,
      user_id: event.userId ?? null,
      action: event.action,
      resource_type: event.resourceType,
      resource_id: event.resourceId ?? null,
      metadata: event.metadata ?? null,
      ip_address: event.ipAddress ?? null,
      user_agent: event.userAgent ?? null,
      ...(event.createdAt
        ? { created_at: event.createdAt.toISOString() }
        : null),
    };

    const { error } = await admin.from("bot_audit_log").insert(payload);

    if (error) {
      logger.error("Failed to write audit log entry", error, {
        action: event.action,
        resourceType: event.resourceType,
        resourceId: event.resourceId,
        teamId: event.teamId,
        userId: event.userId,
      });
    }
  } catch (error) {
    logger.error("Unexpected error while logging audit event", error, {
      action: event.action,
      resourceType: event.resourceType,
    });
  }
}
