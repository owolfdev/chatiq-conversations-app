//src/components/profile/PaginatedActivityFeed.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getUserActivityLogsClient } from "@/app/actions/activity/get-user-activity-logs-client";

interface ActivityLog {
  id: string;
  message: string;
  created_at: string;
}

interface Props {
  userId: string;
  pageSize?: number;
  initialLogs?: ActivityLog[];
}

export default function PaginatedActivityFeed({
  userId,
  pageSize = 10,
  initialLogs,
}: Props) {
  const [logs, setLogs] = useState<ActivityLog[]>(initialLogs ?? []);
  const [page, setPage] = useState(1); // starts at 1 because initialLogs is page 0

  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const hasLoadedRef = useRef(false);
  const cachedLogsRef = useRef<ActivityLog[] | null>(null);

  useEffect(() => {
    if (hasLoadedRef.current || cachedLogsRef.current) {
      if (cachedLogsRef.current) {
        setLogs(cachedLogsRef.current);
        setHasMore(false); // assume no pagination from cache
      }
      return;
    }

    loadLogs().then(() => {
      cachedLogsRef.current = logs;
    });

    hasLoadedRef.current = true;
  }, []);

  const loadLogs = async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const data = await getUserActivityLogsClient(userId, page, pageSize);
      setLogs((prev) => [...prev, ...data]);
      setPage((prev) => prev + 1);
      if (data.length < pageSize) setHasMore(false);
    } catch (e) {
      console.error("Error loading logs:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {logs.map((log) => (
        <Card key={log.id}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{log.message}</p>
                <p className="text-xs text-zinc-500">
                  {new Date(log.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      {hasMore && (
        <div className="text-center">
          <Button onClick={loadLogs} disabled={loading} variant="outline">
            {loading ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </div>
  );
}
