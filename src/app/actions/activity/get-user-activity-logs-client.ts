//src/app/actions/activity/get-user-activity-logs-client.ts
"use server";

import { getUserActivityLogs } from "./get-user-activity-logs";

export async function getUserActivityLogsClient(
  userId: string,
  page = 0,
  pageSize = 10
) {
  const offset = page * pageSize;
  return await getUserActivityLogs(userId, offset, pageSize);
}
