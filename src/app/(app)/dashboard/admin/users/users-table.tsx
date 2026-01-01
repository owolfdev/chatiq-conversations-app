"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, ChevronLeft, ChevronRight, RefreshCcw } from "lucide-react";
import {
  getAdminUsers,
  type AdminUserRow,
  type AdminUsersSortKey,
} from "@/app/actions/admin/get-admin-users";

type SortOption = {
  key: AdminUsersSortKey;
  direction: "asc" | "desc";
  label: string;
};

const SORT_OPTIONS: SortOption[] = [
  { key: "created_at", direction: "desc", label: "Newest users" },
  { key: "created_at", direction: "asc", label: "Oldest users" },
  { key: "bot_count", direction: "desc", label: "Most bots" },
  { key: "conversation_count", direction: "desc", label: "Most conversations" },
  { key: "document_count", direction: "desc", label: "Most documents" },
  { key: "last_active_at", direction: "desc", label: "Recently active" },
];

const PLAN_OPTIONS = [
  { value: "all", label: "All plans" },
  { value: "free", label: "Evaluation" },
  { value: "pro", label: "Pro" },
  { value: "team", label: "Team" },
  { value: "enterprise", label: "Enterprise" },
  { value: "admin", label: "Admin" },
];

export function AdminUsersTable() {
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [plan, setPlan] = useState("all");
  const [sortKey, setSortKey] = useState<AdminUsersSortKey>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const [minBots, setMinBots] = useState("");
  const [maxBots, setMaxBots] = useState("");
  const [minConversations, setMinConversations] = useState("");
  const [maxConversations, setMaxConversations] = useState("");
  const [minDocuments, setMinDocuments] = useState("");
  const [maxDocuments, setMaxDocuments] = useState("");

  const [page, setPage] = useState(1);
  const limit = 20;

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [
    total,
  ]);

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);
    setError(null);

    getAdminUsers({
      page,
      limit,
      search: searchTerm,
      plan,
      minBots: minBots ? Number(minBots) : null,
      maxBots: maxBots ? Number(maxBots) : null,
      minConversations: minConversations ? Number(minConversations) : null,
      maxConversations: maxConversations ? Number(maxConversations) : null,
      minDocuments: minDocuments ? Number(minDocuments) : null,
      maxDocuments: maxDocuments ? Number(maxDocuments) : null,
      sortKey,
      sortDirection,
    })
      .then((result) => {
        if (!isActive) return;
        setRows(result.data);
        setTotal(result.total);
      })
      .catch((fetchError) => {
        if (!isActive) return;
        console.error(fetchError);
        setError("Failed to load users. Please try again.");
      })
      .finally(() => {
        if (!isActive) return;
        setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [
    page,
    limit,
    searchTerm,
    plan,
    minBots,
    maxBots,
    minConversations,
    maxConversations,
    minDocuments,
    maxDocuments,
    sortKey,
    sortDirection,
  ]);

  const handleSearch = () => {
    setPage(1);
    setSearchTerm(searchInput.trim());
  };

  const handleSortChange = (value: string) => {
    const selected = SORT_OPTIONS.find((option) => option.label === value);
    if (!selected) return;
    setSortKey(selected.key);
    setSortDirection(selected.direction);
    setPage(1);
  };

  const handleReset = () => {
    setSearchInput("");
    setSearchTerm("");
    setPlan("all");
    setSortKey("created_at");
    setSortDirection("desc");
    setMinBots("");
    setMaxBots("");
    setMinConversations("");
    setMaxConversations("");
    setMinDocuments("");
    setMaxDocuments("");
    setPage(1);
  };

  const sortLabel = useMemo(() => {
    return (
      SORT_OPTIONS.find(
        (option) =>
          option.key === sortKey && option.direction === sortDirection
      )?.label ?? "Newest users"
    );
  }, [sortKey, sortDirection]);

  const handlePlanChange = (value: string) => {
    setPlan(value);
    setPage(1);
  };

  const handleMetricChange =
    (setter: (value: string) => void) => (value: string) => {
      setter(value);
      setPage(1);
    };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:items-end">
            <div className="flex-1">
              <label className="text-sm font-medium text-muted-foreground">
                Search
              </label>
              <div className="mt-2 flex gap-2">
                <Input
                  placeholder="Search by name, email, or ID"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                />
                <Button onClick={handleSearch} className="gap-2">
                  <Search className="h-4 w-4" />
                  Search
                </Button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Plan
              </label>
              <Select value={plan} onValueChange={handlePlanChange}>
                <SelectTrigger className="mt-2 w-[180px]">
                  <SelectValue placeholder="All plans" />
                </SelectTrigger>
                <SelectContent>
                  {PLAN_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Sort
              </label>
              <Select value={sortLabel} onValueChange={handleSortChange}>
                <SelectTrigger className="mt-2 w-[220px]">
                  <SelectValue placeholder="Newest users" />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.label} value={option.label}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RefreshCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <MetricInput
            label="Bots"
            minValue={minBots}
            maxValue={maxBots}
            onMinChange={handleMetricChange(setMinBots)}
            onMaxChange={handleMetricChange(setMaxBots)}
          />
          <MetricInput
            label="Conversations"
            minValue={minConversations}
            maxValue={maxConversations}
            onMinChange={handleMetricChange(setMinConversations)}
            onMaxChange={handleMetricChange(setMaxConversations)}
          />
          <MetricInput
            label="Documents"
            minValue={minDocuments}
            maxValue={maxDocuments}
            onMinChange={handleMetricChange(setMinDocuments)}
            onMaxChange={handleMetricChange(setMaxDocuments)}
          />
        </div>
      </div>

      <div className="rounded-lg border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b px-4 py-3 text-sm text-muted-foreground">
          <span>
            Showing {rows.length} of {total.toLocaleString()} users
          </span>
          <span>
            Page {page} of {totalPages}
          </span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead className="text-right">Bots</TableHead>
              <TableHead className="text-right">Convos</TableHead>
              <TableHead className="text-right">Docs</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">View</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center">
                  Loading users…
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center">
                  {error}
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center">
                  No users match these filters.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">
                        {user.full_name || user.email}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {user.email}
                      </div>
                      {user.team_name ? (
                        <div className="text-xs text-muted-foreground">
                          {user.team_name}
                        </div>
                      ) : null}
                      <div className="text-xs font-mono text-muted-foreground">
                        {user.id}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{user.plan}</Badge>
                      {user.role === "admin" ? (
                        <Badge variant="secondary">Admin</Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {user.bot_count}
                  </TableCell>
                  <TableCell className="text-right">
                    {user.conversation_count}
                  </TableCell>
                  <TableCell className="text-right">
                    {user.document_count}
                  </TableCell>
                  <TableCell>
                    {user.last_active_at
                      ? new Date(user.last_active_at).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/dashboard/admin/users/${user.id}`}>
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between border-t px-4 py-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page <= 1}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setPage((prev) => Math.min(totalPages, prev + 1))
            }
            disabled={page >= totalPages}
            className="gap-2"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function MetricInput({
  label,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
}: {
  label: string;
  minValue: string;
  maxValue: string;
  onMinChange: (value: string) => void;
  onMaxChange: (value: string) => void;
}) {
  return (
    <div className="rounded-md border border-dashed p-3">
      <p className="text-sm font-medium">{label}</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Input
          type="number"
          min={0}
          placeholder="Min"
          value={minValue}
          onChange={(event) => onMinChange(event.target.value)}
        />
        <Input
          type="number"
          min={0}
          placeholder="Max"
          value={maxValue}
          onChange={(event) => onMaxChange(event.target.value)}
        />
      </div>
    </div>
  );
}
