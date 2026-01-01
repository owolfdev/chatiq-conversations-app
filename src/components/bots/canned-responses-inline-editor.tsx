// src/components/bots/canned-responses-inline-editor.tsx
"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  getCannedResponses,
  createCannedResponse,
  updateCannedResponse,
  deleteCannedResponse,
} from "@/app/actions/bots/canned-responses";
import { suggestCannedPattern } from "@/app/actions/bots/suggest-canned-pattern";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type EditableResponse = {
  id?: string;
  tempId?: string;
  pattern: string;
  pattern_type: "regex" | "keyword" | "exact";
  response: string;
  action?: "human_request" | "human_takeover_on" | "human_takeover_off" | null;
  action_config?: {
    takeover_hours?: number;
    quick_reply_human_label?: string;
    quick_reply_bot_label?: string;
  } | null;
  case_sensitive: boolean;
  fuzzy_threshold: number;
  priority: number;
  enabled: boolean;
  created_at?: string;
};

function createEmptyResponse(): EditableResponse {
  return {
    tempId: `temp-${Math.random().toString(36).slice(2, 9)}`,
    pattern: "",
    pattern_type: "keyword",
    response: "",
    action: null,
    action_config: null,
    case_sensitive: false,
    fuzzy_threshold: 0,
    priority: 0,
    enabled: true,
  };
}

type SortMode = "newest" | "priority" | "alpha";

function sortResponses(list: EditableResponse[], mode: SortMode) {
  return [...list].sort((a, b) => {
    // Keep unsaved rows at the very top
    if (!a.id && a.tempId && (b.id || b.tempId)) return -1;
    if (!b.id && b.tempId && (a.id || a.tempId)) return 1;

    if (mode === "priority") {
      return (b.priority ?? 0) - (a.priority ?? 0);
    }

    if (mode === "alpha") {
      return (a.pattern || "").localeCompare(b.pattern || "");
    }

    const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
    if (aDate !== bDate) return bDate - aDate;

    const priorityDiff = (b.priority ?? 0) - (a.priority ?? 0);
    return priorityDiff;
  });
}

function clampFuzzyThreshold(value: number) {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(3, value));
}

function normalizeTakeoverHours(value: unknown) {
  if (typeof value === "number" && !Number.isNaN(value)) {
    return Math.max(1, Math.min(72, value));
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return Math.max(1, Math.min(72, parsed));
    }
  }
  return 15;
}

function buildActionConfig(response: EditableResponse) {
  if (response.action === "human_takeover_on") {
    const hours = normalizeTakeoverHours(
      response.action_config?.takeover_hours
    );
    return { takeover_hours: hours };
  }
  return null;
}

function serializeActionConfig(response: EditableResponse) {
  return JSON.stringify(buildActionConfig(response));
}

export function CannedResponsesInlineEditor({ botId }: { botId: string }) {
  const [responses, setResponses] = useState<EditableResponse[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EditableResponse | null>(
    null
  );
  const [originalResponses, setOriginalResponses] = useState<
    Record<string, EditableResponse>
  >({});
  const [helperInput, setHelperInput] = useState("");
  const [helperResult, setHelperResult] = useState<{
    pattern: string;
    pattern_type: "regex" | "keyword" | "exact";
    explanation?: string;
  } | null>(null);
  const [helperError, setHelperError] = useState<string | null>(null);
  const [isSuggesting, startSuggesting] = useTransition();
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    void loadResponses(false);
  }, [botId]);

  const hasUnsaved = useMemo(() => {
    return responses.some((r) => !r.id && (r.pattern || r.response));
  }, [responses]);

  async function loadResponses(background = true) {
    if (!background) {
      setInitialLoading(true);
    } else {
      setRefreshing(true);
    }
    const result = await getCannedResponses(botId);
    if (result.success && result.data) {
      const incoming = result.data as EditableResponse[];
      setResponses(sortResponses(incoming, sortMode));
      const baseline = (result.data as EditableResponse[]).reduce(
        (acc, item) => {
          if (item.id) acc[item.id] = item;
          return acc;
        },
        {} as Record<string, EditableResponse>
      );
      setOriginalResponses(baseline);
    } else {
      toast.error(result.error || "Failed to load pre-configured responses");
    }
    setInitialLoading(false);
    setRefreshing(false);
  }

  const updateLocal = (
    targetId: string,
    changes: Partial<EditableResponse>
  ) => {
    setResponses((prev) =>
      prev.map((r) => {
        if (r.id === targetId || r.tempId === targetId) {
          return { ...r, ...changes };
        }
        return r;
      })
    );
  };

  const removeLocal = (targetId: string) => {
    setResponses((prev) =>
      prev.filter((r) => r.id !== targetId && r.tempId !== targetId)
    );
  };

  const isDirty = (response: EditableResponse) => {
    if (!response.id) return true; // Newly added, not saved yet
    const baseline = originalResponses[response.id];
    if (!baseline) return true;
    return (
      response.pattern !== baseline.pattern ||
      response.pattern_type !== baseline.pattern_type ||
      response.response !== baseline.response ||
      response.action !== baseline.action ||
      serializeActionConfig(response) !== serializeActionConfig(baseline) ||
      response.case_sensitive !== baseline.case_sensitive ||
      response.fuzzy_threshold !== baseline.fuzzy_threshold ||
      response.priority !== baseline.priority ||
      response.enabled !== baseline.enabled
    );
  };

  const addSuggestedResponse = (
    pattern: string,
    pattern_type: "regex" | "keyword" | "exact"
  ) => {
    const newResponse: EditableResponse = {
      ...createEmptyResponse(),
      pattern,
      pattern_type,
    };
    setResponses((prev) => [newResponse, ...prev]);
    toast.success("Added pattern to a new response row");
  };

  const handleSuggestPattern = () => {
    if (!helperInput.trim()) {
      setHelperError("Describe the user intent to get a pattern.");
      return;
    }

    startSuggesting(async () => {
      setHelperError(null);
      const result = await suggestCannedPattern({ intent: helperInput });
      if (result.success && result.data) {
        setHelperResult(result.data as {
          pattern: string;
          pattern_type: "regex" | "keyword" | "exact";
          explanation?: string;
        });
        toast.success("Suggested pattern ready");
      } else {
        setHelperResult(null);
        setHelperError(result.error || "Failed to generate a pattern.");
      }
    });
  };

  const handleCopyPattern = async (pattern: string) => {
    try {
      await navigator.clipboard.writeText(pattern);
      toast.success("Pattern copied");
    } catch (error) {
      console.error("Failed to copy pattern", error);
      toast.error("Copy failed. Try again.");
    }
  };

  const handleSave = async (response: EditableResponse) => {
    const { id, tempId, pattern, pattern_type, case_sensitive, enabled } =
      response;
    const fuzzy_threshold = clampFuzzyThreshold(response.fuzzy_threshold);
    const priority = Number.isNaN(response.priority)
      ? 0
      : response.priority ?? 0;
    const action = response.action ?? null;
    const action_config = buildActionConfig(response);

    if (!pattern.trim() || !response.response.trim()) {
      toast.error("Pattern and response are required");
      return;
    }

    const payload = {
      pattern: pattern.trim(),
      pattern_type,
      response: response.response.trim(),
      action,
      action_config,
      case_sensitive,
      fuzzy_threshold,
      priority,
      enabled,
    };

    setSavingId(id ?? tempId ?? null);

    const result = id
      ? await updateCannedResponse({ id, ...payload })
      : await createCannedResponse(botId, payload);

    if (result.success) {
      toast.success(id ? "Pre-configured response saved" : "Pre-configured response created");
      const saved = (result.data as EditableResponse | undefined) ?? {
        ...response,
        ...payload,
      };

      setResponses((prev) => {
        const targetKey = id ?? tempId ?? "";
        const withoutTarget = prev.filter((r) => {
          if (id) return r.id !== id;
          return r.tempId !== tempId;
        });

        const merged = {
          ...saved,
          id: saved.id ?? id,
          tempId,
        } as EditableResponse;

        return sortResponses([...withoutTarget, merged], sortMode);
      });

      if ((saved as EditableResponse).id) {
        const savedId = (saved as EditableResponse).id as string;
        setOriginalResponses((prev) => ({
          ...prev,
          [savedId]: { ...(saved as EditableResponse), id: savedId },
        }));
      }
      setHelperResult(null);
      setHelperInput("");
    } else {
      toast.error(result.error || "Failed to save pre-configured response");
    }

    setSavingId(null);
  };

  const handleDelete = (response: EditableResponse) => {
    setDeleteTarget(response);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    const targetId = deleteTarget.id ?? deleteTarget.tempId ?? null;
    setSavingId(targetId);

    if (!deleteTarget.id) {
      removeLocal(deleteTarget.tempId ?? "");
      setSavingId(null);
      setDeleteTarget(null);
      return;
    }

    const result = await deleteCannedResponse(deleteTarget.id);
    if (result.success) {
      toast.success("Pre-configured response deleted");
      await loadResponses(true);
    } else {
      toast.error(result.error || "Failed to delete pre-configured response");
    }

    setSavingId(null);
    setDeleteTarget(null);
  };

  if (initialLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading pre-configured responses...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-dashed border-muted-foreground/30 bg-muted/30 p-4 space-y-3">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">Pattern helper (AI)</p>
          <p className="text-xs text-muted-foreground">
            Describe the user intent and get a regex/keyword/exact pattern back. Quick examples:{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">hi|hello|hey</code>{" "}
            (keyword),{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              ^(hi|hello|hey)[!. ]*$
            </code>{" "}
            (regex),{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">reset password</code>{" "}
            (exact).
          </p>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <Input
            value={helperInput}
            onChange={(e) => setHelperInput(e.target.value)}
            placeholder='e.g., "questions about pricing or cost"'
          />
          <Button
            type="button"
            size="sm"
            onClick={handleSuggestPattern}
            disabled={isSuggesting}
          >
            {isSuggesting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Suggest pattern
          </Button>
        </div>

        {helperError && (
          <p className="text-xs text-amber-600">{helperError}</p>
        )}

        {helperResult && (
          <div className="rounded-md border bg-background p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="uppercase">
                {helperResult.pattern_type}
              </Badge>
              <code className="rounded bg-muted px-2 py-1 text-xs">
                {helperResult.pattern}
              </code>
            </div>
            {helperResult.explanation && (
              <p className="mt-2 text-xs text-muted-foreground">
                {helperResult.explanation}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleCopyPattern(helperResult.pattern)}
              >
                Copy pattern
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() =>
                  addSuggestedResponse(
                    helperResult.pattern,
                    helperResult.pattern_type
                  )
                }
              >
                Add as new response
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            Pre-configured responses run before the LLM to handle obvious,
            low-effort prompts. Keep triggers narrow for high-confidence matches.
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
          {refreshing && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Updating...
            </div>
          )}
          <Button
            type="button"
            size="sm"
            onClick={() =>
            setResponses((prev) =>
              sortResponses([createEmptyResponse(), ...prev], sortMode)
            )
          }
          >
            <Plus className="h-4 w-4 mr-2" />
            Add pre-configured response
          </Button>
        </div>
      </div>

      <div className="text-sm font-semibold text-foreground">My Responses</div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="md:col-span-2">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patterns or responses"
          />
        </div>
        <div>
          <Select
            value={sortMode}
            onValueChange={(val: SortMode) => {
              setSortMode(val);
              setResponses((prev) => sortResponses(prev, val));
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Sort: Newest</SelectItem>
              <SelectItem value="priority">Sort: Priority</SelectItem>
              <SelectItem value="alpha">Sort: A-Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        {responses
          .filter((r) => {
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            return (
              r.pattern.toLowerCase().includes(q) ||
              r.response.toLowerCase().includes(q)
            );
          })
          .map((response) => {
          const targetId = response.id ?? response.tempId ?? "";
          const saving = savingId === targetId;
          const dirty = isDirty(response);
          const takeoverHours = normalizeTakeoverHours(
            response.action_config?.takeover_hours
          );

          return (
            <Card
              key={targetId}
              className={`p-4 space-y-3 ${
                dirty ? "border-emerald-200 ring-1 ring-emerald-100" : ""
              }`}
            >
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="space-y-2">
                  <Label>Pattern</Label>
                  <Input
                    value={response.pattern}
                    onChange={(e) =>
                      updateLocal(targetId, { pattern: e.target.value })
                    }
                    placeholder='e.g., "hi|hello|hey" or "contact"'
                  />
                  <p className="text-xs text-muted-foreground">
                    Use regex for complex variants, keyword for simple phrases,
                    exact for precise strings.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Response</Label>
                  <Textarea
                    rows={3}
                    className={`${
                      !response.response.trim()
                        ? "ring-1 ring-emerald-200"
                        : ""
                    }`}
                    value={response.response}
                    onChange={(e) =>
                      updateLocal(targetId, { response: e.target.value })
                    }
                    placeholder="Text returned when pattern matches"
                  />
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label>Pattern type</Label>
                  <Select
                    value={response.pattern_type}
                    onValueChange={(val: "regex" | "keyword" | "exact") =>
                      updateLocal(targetId, { pattern_type: val })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="keyword">Keyword</SelectItem>
                      <SelectItem value="regex">Regex</SelectItem>
                      <SelectItem value="exact">Exact</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Input
                    type="number"
                    value={response.priority}
                    onChange={(e) =>
                      updateLocal(targetId, {
                        priority: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    min={0}
                  />
                  <p className="text-xs text-muted-foreground">
                    Higher values run first.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Fuzzy threshold</Label>
                  <Input
                    type="number"
                    value={response.fuzzy_threshold}
                    onChange={(e) =>
                      updateLocal(targetId, {
                        fuzzy_threshold: clampFuzzyThreshold(
                          parseInt(e.target.value, 10) || 0
                        ),
                      })
                    }
                    min={0}
                    max={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    Typo tolerance (0-3). Keep low for precision.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Action</Label>
                  <Select
                    value={response.action ?? "none"}
                    onValueChange={(
                      val:
                        | "none"
                        | "human_request"
                        | "human_takeover_on"
                        | "human_takeover_off"
                    ) => {
                      if (val === "none") {
                        updateLocal(targetId, {
                          action: null,
                          action_config: null,
                        });
                        return;
                      }
                      if (val === "human_takeover_on") {
                        updateLocal(targetId, {
                          action: val,
                          action_config: {
                            takeover_hours: takeoverHours,
                          },
                        });
                        return;
                      }
                      updateLocal(targetId, {
                        action: val,
                        action_config: null,
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="human_request">
                        Request human
                      </SelectItem>
                      <SelectItem value="human_takeover_on">
                        Enable human takeover
                      </SelectItem>
                      <SelectItem value="human_takeover_off">
                        Disable human takeover
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {response.action === "human_takeover_on" && (
                    <div className="mt-2 space-y-1">
                      <Label>Takeover hours</Label>
                      <Input
                        type="number"
                        value={takeoverHours}
                        min={1}
                        max={72}
                        onChange={(e) =>
                          updateLocal(targetId, {
                            action_config: {
                              takeover_hours:
                                parseInt(e.target.value, 10) || 1,
                            },
                          })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        How long the bot stays silent.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-4">
                <div className="space-y-2 lg:col-span-1">
                  <Label>Flags</Label>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`${targetId}-enabled`}
                        checked={response.enabled}
                        onCheckedChange={(checked) =>
                          updateLocal(targetId, { enabled: checked })
                        }
                      />
                      <Label htmlFor={`${targetId}-enabled`}>Enabled</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`${targetId}-case-sensitive`}
                        checked={response.case_sensitive}
                        onCheckedChange={(checked) =>
                          updateLocal(targetId, { case_sensitive: checked })
                        }
                      />
                      <Label htmlFor={`${targetId}-case-sensitive`}>
                        Case sensitive
                      </Label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div
                  className={`text-sm font-medium ${
                    response.id
                      ? dirty
                        ? "text-emerald-700"
                        : "text-muted-foreground"
                      : "text-emerald-700"
                  }`}
                >
                  {response.id
                    ? dirty
                      ? "Edited — save to apply"
                      : "Saved"
                    : "New response (unsaved)"}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(response)}
                    disabled={saving}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleSave(response)}
                    disabled={saving || !dirty}
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {dirty ? "Save changes" : "Save"}
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}

        {responses.length === 0 && (
          <div className="rounded-md border border-dashed border-muted-foreground/30 p-4 text-sm text-muted-foreground">
            No pre-configured responses yet. Add your first response to handle common
            prompts before they reach the LLM.
          </div>
        )}
      </div>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete pre-configured response?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-1">
              <p>This action cannot be undone. The pre-configured response will be removed immediately.</p>
              {deleteTarget?.pattern && (
                <p className="text-sm">
                  Pattern: <span className="font-semibold">{deleteTarget.pattern}</span>
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setDeleteTarget(null)}
              disabled={Boolean(savingId)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={Boolean(savingId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
