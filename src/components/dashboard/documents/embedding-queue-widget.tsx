"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { getEmbeddingQueueStats, type EmbeddingQueueStats } from "@/app/actions/documents/get-embedding-queue-stats";
import { retryFailedEmbeddings } from "@/app/actions/documents/retry-failed-embeddings";

export function EmbeddingQueueWidget() {
  const [stats, setStats] = useState<EmbeddingQueueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await getEmbeddingQueueStats();
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch queue stats", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRetryFailed = async () => {
    setRetrying(true);
    try {
      const result = await retryFailedEmbeddings();
      if (result.success) {
        // Refresh stats after retry
        setTimeout(fetchStats, 2000);
      } else {
        console.error("Failed to retry jobs", result.error);
      }
    } catch (error) {
      console.error("Failed to retry jobs", error);
    } finally {
      setRetrying(false);
    }
  };

  if (loading && !stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Embedding Queue Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading queue status...</p>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  const hasIssues = stats.failed > 0 || stats.stuckJobs > 0;
  const hasPending = stats.pending > 0 || stats.processing > 0;

  return (
    <Card className={hasIssues ? "border-warning" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>Embedding Queue Status</CardTitle>
            <Badge
              variant={
                stats.status === "error"
                  ? "destructive"
                  : stats.status === "warning"
                  ? "default"
                  : "secondary"
              }
              className="ml-2"
            >
              {stats.status === "error" && (
                <>
                  <AlertCircle className="mr-1 h-3 w-3" />
                  Issues
                </>
              )}
              {stats.status === "warning" && (
                <>
                  <Clock className="mr-1 h-3 w-3" />
                  Warning
                </>
              )}
              {stats.status === "healthy" && (
                <>
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Healthy
                </>
              )}
            </Badge>
          </div>
          {hasIssues && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetryFailed}
              disabled={retrying}
            >
              {retrying ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Retrying...
                </>
              ) : (
                "Retry Failed Jobs"
              )}
            </Button>
          )}
        </div>
        <CardDescription>
          Status of document embedding processing jobs
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Pending
            </div>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {stats.processing > 0 ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Clock className="h-4 w-4" />
              )}
              Processing
            </div>
            <div className="text-2xl font-bold">{stats.processing}</div>
            {stats.stuckJobs > 0 && (
              <div className="text-xs text-destructive">
                {stats.stuckJobs} stuck
              </div>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <XCircle className="h-4 w-4" />
              Failed
            </div>
            <div className="text-2xl font-bold text-destructive">
              {stats.failed}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4" />
              Rate
            </div>
            <div className="text-2xl font-bold">{stats.processingRate}</div>
            <div className="text-xs text-muted-foreground">jobs/hour</div>
          </div>
        </div>

        {hasPending && !hasIssues && (
          <div className="mt-4 rounded-lg bg-muted p-3 text-sm">
            <p className="text-muted-foreground">
              Your documents are being processed. Embeddings will be ready shortly.
            </p>
          </div>
        )}

        {hasIssues && (
          <div className="mt-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm">
            <p className="text-destructive">
              {stats.failed > 0 && `${stats.failed} job(s) failed. `}
              {stats.stuckJobs > 0 &&
                `${stats.stuckJobs} job(s) appear to be stuck. `}
              Click "Retry Failed Jobs" to attempt processing again.
            </p>
          </div>
        )}

        {!hasPending && !hasIssues && (
          <div className="mt-4 rounded-lg bg-muted p-3 text-sm">
            <p className="text-muted-foreground">
              All embedding jobs are complete. Your documents are ready for use.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

