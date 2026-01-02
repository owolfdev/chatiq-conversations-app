// src/app/dashboard/conversations/conversations-client.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bot, ExternalLink, Trash2, FileDown } from "lucide-react";
import Link from "next/link";
import { deleteConversation } from "@/app/actions/chat/delete-conversation";
import { deleteConversations } from "@/app/actions/conversations/delete-conversations";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ConversationListItem } from "@/types/conversations";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CONVERSATION_SOURCE_OPTIONS } from "@/lib/conversations/source-options";

interface ConversationsClientProps {
  initialConversations: ConversationListItem[];
  teamName: string | null;
  teamId: string | null;
  initialBots: Array<{ id: string; name: string }>;
}

export default function ConversationsClient({
  initialConversations,
  teamName,
  teamId,
  initialBots,
}: ConversationsClientProps) {
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedBot, setSelectedBot] = useState<string>("all");
  const [selectedTopic, setSelectedTopic] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [userQuery, setUserQuery] = useState<string>("");
  const [debouncedUserQuery, setDebouncedUserQuery] = useState<string>("");
  const [detailQuery, setDetailQuery] = useState<string>("");
  const [debouncedDetailQuery, setDebouncedDetailQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<
    "last_message_at" | "message_count" | "topic" | "source" | "status" | "user"
  >("last_message_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingSelected, setIsExportingSelected] = useState(false);
  const [bots] = useState<Array<{ id: string; name: string }>>(initialBots);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const loadConversations = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "50");
      if (selectedBot !== "all") {
        params.set("botId", selectedBot);
      }
      if (selectedTopic !== "all") {
        params.set("topic", selectedTopic);
      }
      if (selectedStatus !== "all") {
        params.set("status", selectedStatus);
      }
      if (selectedSource !== "all") {
        params.set("source", selectedSource);
      }
      if (debouncedUserQuery.trim()) {
        params.set("userQuery", debouncedUserQuery.trim());
      }
      if (debouncedDetailQuery.trim()) {
        params.set("detailQuery", debouncedDetailQuery.trim());
      }
      params.set("sortBy", sortBy);
      params.set("sortDir", sortDir);

      const response = await fetch(
        `/api/conversations?${params.toString()}`,
        { credentials: "include" }
      );
      if (!response.ok) {
        throw new Error("Failed to fetch conversations.");
      }
      const payload = (await response.json().catch(() => null)) as {
        conversations?: ConversationListItem[];
      } | null;
      setConversations(payload?.conversations ?? []);
    } finally {
      setIsLoading(false);
    }
  }, [
    selectedBot,
    selectedTopic,
    selectedStatus,
    selectedSource,
    debouncedUserQuery,
    debouncedDetailQuery,
    sortBy,
    sortDir,
  ]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedUserQuery(userQuery);
    }, 300);
    return () => {
      window.clearTimeout(handle);
    };
  }, [userQuery]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedDetailQuery(detailQuery);
    }, 300);
    return () => {
      window.clearTimeout(handle);
    };
  }, [detailQuery]);

  useEffect(() => {
    // Reload conversations when filters change
    loadConversations();
  }, [loadConversations]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadConversations();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExport = async (format: "csv" | "json") => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams({
        format,
      });

      if (teamId) {
        params.append("teamId", teamId);
      }
      if (selectedBot !== "all") {
        params.append("botId", selectedBot);
      }
      if (startDate) {
        params.append("startDate", startDate);
      }
      if (endDate) {
        params.append("endDate", endDate);
      }

      const response = await fetch(
        `/api/conversations/export?${params.toString()}`,
        { credentials: "include" }
      );
      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `conversations-export-${
        new Date().toISOString().split("T")[0]
      }.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Export error:", error);
      alert("Failed to export conversations. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const parseAsUtc = (value: string) => {
    const hasTimezone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(value);
    const normalized = hasTimezone ? value : `${value}Z`;
    return new Date(normalized);
  };

  const formatDate = (dateString: string) => {
    return parseAsUtc(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPreview = (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length <= 140) {
      return trimmed;
    }
    return `${trimmed.slice(0, 140)}…`;
  };

  const getCustomerProfile = (sourceDetail: ConversationListItem["source_detail"]) => {
    if (!sourceDetail || typeof sourceDetail !== "object") {
      return null;
    }
    const detail = sourceDetail as Record<string, unknown>;
    const name =
      typeof detail.line_display_name === "string"
        ? detail.line_display_name
        : null;
    const avatarUrl =
      typeof detail.line_picture_url === "string"
        ? detail.line_picture_url
        : null;
    if (!name && !avatarUrl) {
      return null;
    }
    return { name: name || "Customer", avatarUrl };
  };

  const sourceOptions = [
    ...CONVERSATION_SOURCE_OPTIONS,
    ...Array.from(
      new Set(conversations.map((conv) => conv.source).filter(Boolean))
    )
      .filter(
        (source) =>
          !CONVERSATION_SOURCE_OPTIONS.some((option) => option.value === source)
      )
      .map((source) => ({
        value: source as string,
        label: source as string,
      })),
  ];

  const topicOptions = [
    "Greeting / Small Talk",
    "Booking / Reservation / Appointment",
    "Availability / Hours / Location",
    "Pricing / Fees / Quotes",
    "Order Status / ETA",
    "Cancellation / Reschedule / Refunds",
    "Complaint / Dissatisfaction",
    "Product / Service Inquiry",
    "Payment Issues",
    "General Inquiry",
  ];

  const handleSort = (
    key:
      | "last_message_at"
      | "message_count"
      | "topic"
      | "source"
      | "status"
      | "user"
  ) => {
    if (sortBy === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(key);
    setSortDir(key === "last_message_at" ? "desc" : "asc");
  };

  const renderSortIndicator = (
    key: "last_message_at" | "message_count" | "topic" | "source" | "status" | "user"
  ) => {
    if (sortBy !== key) {
      return null;
    }
    return sortDir === "asc" ? "▲" : "▼";
  };

  const handleExportSingle = async (
    conversationId: string,
    format: "csv" | "json"
  ) => {
    try {
      const response = await fetch(
        `/api/conversations/${conversationId}/export?format=${format}`,
        { credentials: "include" }
      );
      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `conversation-${conversationId.substring(0, 8)}-${
        new Date().toISOString().split("T")[0]
      }.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Conversation exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export conversation");
    }
  };

  const handleExportSelected = async (format: "csv" | "json") => {
    if (selectedIds.size === 0) return;
    setIsExportingSelected(true);
    try {
      const response = await fetch(`/api/conversations/export-selected`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          format,
          conversationIds: Array.from(selectedIds),
        }),
      });
      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `conversations-selected-${
        new Date().toISOString().split("T")[0]
      }.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Conversations exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export conversations");
    } finally {
      setIsExportingSelected(false);
    }
  };

  const handleDelete = async (conversationId: string) => {
    setDeletingId(conversationId);
    try {
      await deleteConversation(conversationId);
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(conversationId);
        return next;
      });
      toast.success("Conversation deleted successfully");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete conversation"
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    setIsBulkDeleting(true);
    try {
      const idsToDelete = Array.from(selectedIds);
      await deleteConversations(idsToDelete);
      setConversations((prev) => prev.filter((c) => !selectedIds.has(c.id)));
      setSelectedIds(new Set());
      toast.success(
        `Successfully deleted ${idsToDelete.length} conversation${
          idsToDelete.length > 1 ? "s" : ""
        }`
      );
    } catch (error) {
      console.error("Bulk delete error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete conversations"
      );
    } finally {
      setIsBulkDeleting(false);
      setShowBulkDeleteDialog(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === conversations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(conversations.map((c) => c.id)));
    }
  };

  const isAllSelected =
    conversations.length > 0 && selectedIds.size === conversations.length;
  const isIndeterminate =
    selectedIds.size > 0 && selectedIds.size < conversations.length;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold mb-2">Conversations</h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              View and export conversation history
            {teamName && (
              <>
                {" "}
                for{" "}
                <Badge variant="outline" className="ml-1">
                  {teamName}
                </Badge>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("json")}
            disabled={isExporting}
          >
            Export All JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("csv")}
            disabled={isExporting}
          >
            Export All CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 p-4 border rounded-lg bg-zinc-50 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFiltersOpen((prev) => !prev)}
          >
            {filtersOpen ? "Hide Search Filters" : "Show Search Filters"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedBot("all");
              setSelectedTopic("all");
              setSelectedStatus("all");
              setSelectedSource("all");
              setUserQuery("");
              setDetailQuery("");
              setStartDate("");
              setEndDate("");
              setSortBy("last_message_at");
              setSortDir("desc");
            }}
          >
            Reset Filters
          </Button>
        </div>
        {filtersOpen && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <Label
              htmlFor="bot-filter"
              className="text-sm font-medium mb-2 block"
            >
              Bot
            </Label>
            <Select value={selectedBot} onValueChange={setSelectedBot}>
              <SelectTrigger id="bot-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Bots</SelectItem>
                {bots.map((bot) => (
                  <SelectItem key={bot.id} value={bot.id}>
                    {bot.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-medium mb-2 block">Topic</Label>
            <Select value={selectedTopic} onValueChange={setSelectedTopic}>
              <SelectTrigger>
                <SelectValue placeholder="All topics" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Topics</SelectItem>
                {topicOptions.map((topic) => (
                  <SelectItem key={topic} value={topic}>
                    {topic}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-medium mb-2 block">Status</Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="unresolved">Unresolved</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-medium mb-2 block">Source</Label>
            <Select value={selectedSource} onValueChange={setSelectedSource}>
              <SelectTrigger>
                <SelectValue placeholder="All sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {sourceOptions.map((source) => (
                  <SelectItem key={source.value} value={source.value}>
                    {source.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="user-filter" className="text-sm font-medium mb-2 block">
              User
            </Label>
            <Input
              id="user-filter"
              placeholder="Search user"
              value={userQuery}
              onChange={(event) => setUserQuery(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="detail-filter" className="text-sm font-medium mb-2 block">
              Detail
            </Label>
            <Input
              id="detail-filter"
              placeholder="Search detail"
              value={detailQuery}
              onChange={(event) => setDetailQuery(event.target.value)}
            />
          </div>
          <div className="md:col-span-3 lg:col-span-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label
                  htmlFor="start-date"
                  className="text-sm font-medium mb-2 block"
                >
                  Start Date
                </Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div>
                <Label
                  htmlFor="end-date"
                  className="text-sm font-medium mb-2 block"
                >
                  End Date
                </Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-4 border rounded-lg bg-muted">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {selectedIds.size} conversation{selectedIds.size > 1 ? "s" : ""}{" "}
              selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isExportingSelected}
              onClick={() => handleExportSelected("json")}
            >
              {isExportingSelected ? "Exporting..." : "Export JSON"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isExportingSelected}
              onClick={() => handleExportSelected("csv")}
            >
              {isExportingSelected ? "Exporting..." : "Export CSV"}
            </Button>
            <AlertDialog
              open={showBulkDeleteDialog}
              onOpenChange={setShowBulkDeleteDialog}
            >
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isBulkDeleting}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Selected
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Delete Selected Conversations
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete {selectedIds.size}{" "}
                    conversation{selectedIds.size > 1 ? "s" : ""}? This action
                    cannot be undone and will permanently delete all messages in
                    these conversations.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleBulkDelete}
                    disabled={isBulkDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isBulkDeleting ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      {/* Conversations Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={isAllSelected || isIndeterminate}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  className="flex items-center gap-2"
                  onClick={() => handleSort("topic")}
                >
                  Topic {renderSortIndicator("topic")}
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  className="flex items-center gap-2"
                  onClick={() => handleSort("status")}
                >
                  Status {renderSortIndicator("status")}
                </button>
              </TableHead>
              <TableHead>Bot</TableHead>
              <TableHead>
                <button
                  type="button"
                  className="flex items-center gap-2"
                  onClick={() => handleSort("user")}
                >
                  User {renderSortIndicator("user")}
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  className="flex items-center gap-2"
                  onClick={() => handleSort("source")}
                >
                  Source {renderSortIndicator("source")}
                </button>
              </TableHead>
              <TableHead>Detail</TableHead>
              <TableHead>
                <button
                  type="button"
                  className="flex items-center gap-2"
                  onClick={() => handleSort("message_count")}
                >
                  Messages {renderSortIndicator("message_count")}
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  className="flex items-center gap-2"
                  onClick={() => handleSort("last_message_at")}
                >
                  Last Message {renderSortIndicator("last_message_at")}
                </button>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="text-center text-zinc-500 py-8"
                >
                  <div className="space-y-3 py-2">
                    <Skeleton className="h-5 w-3/4 mx-auto" />
                    <Skeleton className="h-5 w-2/3 mx-auto" />
                    <Skeleton className="h-5 w-4/5 mx-auto" />
                  </div>
                </TableCell>
              </TableRow>
            ) : conversations.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={11}
                  className="text-center text-zinc-500 py-8"
                >
                  No conversations found
                </TableCell>
              </TableRow>
            ) : (
              conversations.map((conv) => (
                <TableRow key={conv.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(conv.id)}
                      onCheckedChange={() => toggleSelect(conv.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link
                          href={`/chat/${conv.bot_slug}?conversationId=${conv.id}`}
                          className="hover:underline"
                        >
                          {conv.topic || "General Inquiry"}
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent
                        className="max-w-xs text-sm bg-emerald-100 text-zinc-900 border-emerald-200"
                        arrowClassName="bg-emerald-100 fill-emerald-100"
                      >
                        {conv.topic_message_preview ? (
                          <div className="space-y-1">
                            <div>{formatPreview(conv.topic_message_preview)}</div>
                            {conv.topic_message_at ? (
                              <div className="text-xs text-zinc-500">
                                {formatDate(conv.topic_message_at)}
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <span>No preview yet</span>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        conv.resolution_status === "resolved"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-amber-200 bg-amber-50 text-amber-900"
                      }
                    >
                      {conv.resolution_status === "resolved"
                        ? "Resolved"
                        : "Unresolved"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 text-zinc-400" />
                      <span>{conv.bot_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const customer = getCustomerProfile(conv.source_detail);
                      if (!customer) {
                        return "—";
                      }
                      return (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarImage
                              src={customer.avatarUrl || undefined}
                              alt={customer.name}
                            />
                            <AvatarFallback>
                              {customer.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span>{customer.name}</span>
                        </div>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    {conv.source ? (
                      <Badge variant="outline" className="capitalize">
                        {conv.source}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-zinc-600 dark:text-zinc-300">
                    {typeof conv.source_detail?.label === "string"
                      ? conv.source_detail.label
                      : conv.source === "line"
                      ? "Line Official Account"
                      : typeof conv.source_detail?.origin === "string"
                      ? conv.source_detail.origin
                      : "—"}
                  </TableCell>
                  <TableCell>{conv.message_count}</TableCell>
                  <TableCell>
                    {conv.last_message_at
                      ? formatDate(conv.last_message_at)
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="h-8 w-8 p-0"
                      >
                        <Link
                          href={`/chat/${conv.bot_slug}?conversationId=${conv.id}`}
                          title="Open conversation"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() =>
                          handleExportSingle(conv.id, "json")
                        }
                        title="Export conversation"
                      >
                        <FileDown className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            disabled={deletingId === conv.id}
                            title="Delete conversation"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Delete Conversation
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this conversation?
                              This action cannot be undone and will permanently
                              delete all messages in this conversation.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(conv.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
