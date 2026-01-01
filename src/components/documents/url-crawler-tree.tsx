"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChevronDown, ChevronRight, Link as LinkIcon, Loader2, Search } from "lucide-react";
import MultiSelect from "@/components/custom-fields/multi-select";
import { createClient } from "@/utils/supabase/client";

type UrlNode = {
  url: string;
  title?: string;
  description?: string;
  children: UrlNode[];
};

type FailedItem = {
  id: string;
  url: string;
  error?: string | null;
};

type JobSummary = {
  id: string;
  status: string;
  totalCount: number;
  processedCount: number;
  successCount: number;
  failureCount: number;
};

interface UrlCrawlerTreeProps {
  isEnabled: boolean;
  documentLimit: number | null;
  currentDocuments: number;
}

function flattenNodes(node: UrlNode): UrlNode[] {
  const nodes: UrlNode[] = [node];
  for (const child of node.children) {
    nodes.push(...flattenNodes(child));
  }
  return nodes;
}

function filterTree(node: UrlNode, query: string): UrlNode | null {
  if (!query) return node;
  const match =
    node.title?.toLowerCase().includes(query) ||
    node.url.toLowerCase().includes(query) ||
    node.description?.toLowerCase().includes(query);
  const filteredChildren = node.children
    .map((child) => filterTree(child, query))
    .filter((child): child is UrlNode => child !== null);
  if (match || filteredChildren.length > 0) {
    return { ...node, children: filteredChildren };
  }
  return null;
}

function getDefaultPathPrefix(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.pathname || "/";
  } catch {
    return "/docs";
  }
}

export function UrlCrawlerTree({
  isEnabled,
  documentLimit,
  currentDocuments,
}: UrlCrawlerTreeProps) {
  const supabase = createClient();
  const [baseUrl, setBaseUrl] = useState("");
  const [pathPrefix, setPathPrefix] = useState("");
  const [maxDepth, setMaxDepth] = useState(3);
  const [useSitemap, setUseSitemap] = useState(true);
  const [tree, setTree] = useState<UrlNode | null>(null);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoverError, setDiscoverError] = useState<string | null>(null);
  const [jobSummary, setJobSummary] = useState<JobSummary | null>(null);
  const [failedItems, setFailedItems] = useState<FailedItem[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [isGlobal, setIsGlobal] = useState(false);
  const [linkedBots, setLinkedBots] = useState<string[]>([]);
  const [availableBots, setAvailableBots] = useState<
    { id: string; name: string }[]
  >([]);

  useEffect(() => {
    if (!baseUrl.trim()) {
      setPathPrefix("");
      return;
    }
    setPathPrefix(getDefaultPathPrefix(baseUrl.trim()));
  }, [baseUrl]);

  useEffect(() => {
    (async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;
      const { data } = await supabase
        .from("bot_bots")
        .select("id, name")
        .eq("user_id", user.id)
        .eq("status", "active");
      if (data) setAvailableBots(data);
    })();
  }, [supabase]);

  const filteredTree = useMemo(() => {
    if (!tree) return null;
    const query = searchQuery.trim().toLowerCase();
    return filterTree(tree, query);
  }, [tree, searchQuery]);

  const flatUrls = useMemo(() => {
    if (!tree) return [];
    return flattenNodes(tree).map((node) => node.url);
  }, [tree]);

  const selectedCount = selectedUrls.size;
  const projectedTotal = currentDocuments + selectedCount;
  const remainingQuota =
    documentLimit === null ? null : Math.max(documentLimit - currentDocuments, 0);

  const toggleSelect = (url: string) => {
    setSelectedUrls((prev) => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else {
        next.add(url);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedUrls(new Set(flatUrls));
  };

  const deselectAll = () => {
    setSelectedUrls(new Set());
  };

  const toggleExpanded = (url: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else {
        next.add(url);
      }
      return next;
    });
  };

  const handleDiscover = async () => {
    if (!baseUrl.trim()) {
      setDiscoverError("Enter a base URL to crawl.");
      return;
    }
    setIsDiscovering(true);
    setDiscoverError(null);
    setTree(null);
    setSelectedUrls(new Set());
    setExpanded(new Set());
    setJobSummary(null);
    setFailedItems([]);

    try {
      const response = await fetch("/api/documents/discover-urls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: baseUrl.trim(),
          maxDepth,
          allowPathPrefix: pathPrefix.trim() || undefined,
          useSitemap,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message =
          (payload as { error?: { message?: string } })?.error?.message ||
          "Failed to discover URLs.";
        throw new Error(message);
      }

      const payload = (await response.json()) as {
        root: UrlNode;
        total: number;
        errors?: string[];
      };

      setTree(payload.root);
      setExpanded(new Set([payload.root.url]));
      setSelectedUrls(new Set(flattenNodes(payload.root).map((node) => node.url)));

      if (payload.errors && payload.errors.length > 0) {
        setDiscoverError(
          `Some pages could not be reached (${payload.errors.length}).`
        );
      }
    } catch (error) {
      setDiscoverError(
        error instanceof Error ? error.message : "Failed to discover URLs."
      );
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleStartImport = async () => {
    if (!tree || selectedCount === 0) {
      setImportError("Select at least one page to import.");
      return;
    }
    setImportError(null);
    setIsImporting(true);
    setFailedItems([]);

    try {
      const response = await fetch("/api/documents/import-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: baseUrl.trim(),
          urls: Array.from(selectedUrls),
          isGlobal,
          linkedBotIds: linkedBots.length > 0 ? linkedBots : undefined,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message =
          (payload as { error?: { message?: string } })?.error?.message ||
          "Failed to create import job.";
        throw new Error(message);
      }

      const payload = (await response.json()) as { id: string };
      await processJob(payload.id);
    } catch (error) {
      setImportError(
        error instanceof Error ? error.message : "Failed to start import."
      );
      setIsImporting(false);
    }
  };

  const processJob = async (jobId: string) => {
    try {
      const response = await fetch("/api/documents/import-jobs/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, batchSize: 5 }),
      });
      if (!response.ok) {
        throw new Error("Failed to process import job.");
      }
      const payload = (await response.json()) as { job: JobSummary };
      setJobSummary(payload.job);

      if (payload.job.status !== "completed") {
        setTimeout(() => processJob(jobId), 2000);
        return;
      }

      const detailsResponse = await fetch(
        `/api/documents/import-jobs/${jobId}`
      );
      if (detailsResponse.ok) {
        const details = (await detailsResponse.json()) as {
          failedItems?: FailedItem[];
        };
        setFailedItems(details.failedItems ?? []);
      }
      setIsImporting(false);
    } catch (error) {
      setImportError(
        error instanceof Error ? error.message : "Import failed."
      );
      setIsImporting(false);
    }
  };

  const renderNode = (node: UrlNode, depth: number) => {
    const isExpanded = expanded.has(node.url);
    const hasChildren = node.children.length > 0;

    return (
      <div key={node.url} className="space-y-1">
        <div className="flex items-start gap-2" style={{ paddingLeft: depth * 16 }}>
          {hasChildren ? (
            <button
              type="button"
              onClick={() => toggleExpanded(node.url)}
              className="mt-0.5 text-muted-foreground hover:text-foreground"
              aria-label="Toggle children"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <span className="mt-0.5 h-4 w-4" />
          )}
          <Checkbox
            checked={selectedUrls.has(node.url)}
            onCheckedChange={() => toggleSelect(node.url)}
            className="mt-0.5"
          />
          <div className="space-y-1">
            <p className="text-sm font-medium">{node.title || node.url}</p>
            {node.description && (
              <p className="text-xs text-muted-foreground">
                {node.description}
              </p>
            )}
            <p className="text-xs text-muted-foreground">{node.url}</p>
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div className="space-y-2">
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LinkIcon className="h-5 w-5" />
          Import a Site
          <Badge variant="secondary">Pro+</Badge>
        </CardTitle>
        <CardDescription>
          Discover pages from any site, approve the ones you want, and import them in the background.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isEnabled && (
          <Alert>
            <AlertDescription>
              Upgrade to Pro to crawl and import full documentation sites.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Base URL</label>
            <Input
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              placeholder="https://example.com/docs"
              disabled={!isEnabled || isDiscovering}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Path filter</label>
            <Input
              value={pathPrefix}
              onChange={(event) => setPathPrefix(event.target.value)}
              placeholder="/docs"
              disabled={!isEnabled || isDiscovering}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Depth</label>
            <Input
              type="number"
              min={1}
              max={5}
              value={maxDepth}
              onChange={(event) => setMaxDepth(Number(event.target.value))}
              className="w-20"
              disabled={!isEnabled || isDiscovering}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={useSitemap}
              onCheckedChange={setUseSitemap}
              disabled={!isEnabled || isDiscovering}
            />
            <span className="text-sm">Use sitemap if available</span>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={isGlobal}
              onCheckedChange={setIsGlobal}
              disabled={!isEnabled || isImporting}
            />
            <span className="text-sm">Make available to all bots</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Link to bots</label>
          <MultiSelect
            value={linkedBots}
            onChange={setLinkedBots}
            options={availableBots.map((bot) => ({
              id: bot.id,
              name: bot.name,
            }))}
            placeholder="Select bots to link"
          />
          <p className="text-xs text-muted-foreground">
            Imported pages will be linked to the selected bots.
          </p>
        </div>

        <Button onClick={handleDiscover} disabled={!isEnabled || isDiscovering}>
          {isDiscovering ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Discovering...
            </>
          ) : (
            "Discover pages"
          )}
        </Button>

        {discoverError && (
          <Alert variant="destructive">
            <AlertDescription>{discoverError}</AlertDescription>
          </Alert>
        )}

        {tree && filteredTree && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Filter pages"
                  className="w-64"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  Select all
                </Button>
                <Button variant="ghost" size="sm" onClick={deselectAll}>
                  Deselect all
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-border p-4 space-y-3">
              {renderNode(filteredTree, 0)}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  Selected pages: {selectedCount}
                </p>
                <p className="text-xs text-muted-foreground">
                  Will create {selectedCount} documents
                </p>
                {documentLimit !== null && (
                  <p className="text-xs text-muted-foreground">
                    {remainingQuota} of {documentLimit} documents remaining • After import: {projectedTotal}
                  </p>
                )}
              </div>
              <Button
                onClick={handleStartImport}
                disabled={!isEnabled || isImporting || selectedCount === 0}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  "Approve & import"
                )}
              </Button>
            </div>
          </div>
        )}

        {importError && (
          <Alert variant="destructive">
            <AlertDescription>{importError}</AlertDescription>
          </Alert>
        )}

        {jobSummary && (
          <Alert>
            <AlertDescription>
              {jobSummary.status === "completed"
                ? `Import complete: ${jobSummary.successCount} succeeded, ${jobSummary.failureCount} failed.`
                : `Importing ${jobSummary.processedCount}/${jobSummary.totalCount}... ${jobSummary.successCount} succeeded, ${jobSummary.failureCount} failed.`}
            </AlertDescription>
          </Alert>
        )}

        {failedItems.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Failed pages</p>
            <div className="rounded-lg border border-border p-3 space-y-2">
              {failedItems.map((item) => (
                <div key={item.id} className="text-xs text-muted-foreground">
                  {item.url}
                  {item.error ? ` — ${item.error}` : ""}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
