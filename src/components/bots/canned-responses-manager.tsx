// src/components/bots/canned-responses-manager.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Edit, Trash2, MessageSquare, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  getCannedResponses,
  createCannedResponse,
  updateCannedResponse,
  deleteCannedResponse,
  type CannedResponseInput,
} from "@/app/actions/bots/canned-responses";

interface CannedResponse {
  id: string;
  pattern: string;
  pattern_type: "regex" | "keyword" | "exact";
  response: string;
  action?: "human_request" | "human_takeover_on" | "human_takeover_off" | null;
  action_config?: Record<string, unknown> | null;
  case_sensitive: boolean;
  fuzzy_threshold: number;
  priority: number;
  enabled: boolean;
}

interface CannedResponsesManagerProps {
  botId: string;
}

export function CannedResponsesManager({ botId }: CannedResponsesManagerProps) {
  const [responses, setResponses] = useState<CannedResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingResponse, setEditingResponse] = useState<CannedResponse | null>(
    null
  );

  // Form state
  const [pattern, setPattern] = useState("");
  const [patternType, setPatternType] = useState<"regex" | "keyword" | "exact">(
    "regex"
  );
  const [response, setResponse] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [fuzzyThreshold, setFuzzyThreshold] = useState(1);
  const [priority, setPriority] = useState(0);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    loadResponses();
  }, [botId]);

  const loadResponses = async () => {
    setLoading(true);
    const result = await getCannedResponses(botId);
    if (result.success && result.data) {
      setResponses(result.data as CannedResponse[]);
    } else {
      toast.error(result.error || "Failed to load pre-configured responses");
    }
    setLoading(false);
  };

  const resetForm = () => {
    setPattern("");
    setPatternType("regex");
    setResponse("");
    setCaseSensitive(false);
    setFuzzyThreshold(1);
    setPriority(0);
    setEnabled(true);
    setEditingResponse(null);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      // Reset form when dialog closes
      resetForm();
    }
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (response: CannedResponse) => {
    setPattern(response.pattern);
    setPatternType(response.pattern_type);
    setResponse(response.response);
    setCaseSensitive(response.case_sensitive);
    setFuzzyThreshold(response.fuzzy_threshold);
    setPriority(response.priority);
    setEnabled(response.enabled);
    setEditingResponse(response);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent form submission if called from a button inside a form
    e.preventDefault();
    e.stopPropagation();

    if (!pattern.trim() || !response.trim()) {
      toast.error("Pattern and response are required");
      return;
    }

    const input: CannedResponseInput = {
      pattern: pattern.trim(),
      pattern_type: patternType,
      response: response.trim(),
      case_sensitive: caseSensitive,
      fuzzy_threshold: fuzzyThreshold,
      priority,
      enabled,
    };

    if (editingResponse) {
      const result = await updateCannedResponse({
        id: editingResponse.id,
        ...input,
      });
      if (result.success) {
        toast.success("Pre-configured response updated");
        setIsDialogOpen(false);
        loadResponses();
      } else {
        toast.error(result.error || "Failed to update pre-configured response");
      }
    } else {
      const result = await createCannedResponse(botId, input);
      if (result.success) {
        toast.success("Pre-configured response created");
        setIsDialogOpen(false);
        loadResponses();
      } else {
        toast.error(
          result.error || "Failed to create pre-configured response"
        );
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm("Are you sure you want to delete this pre-configured response?")
    ) {
      return;
    }

    const result = await deleteCannedResponse(id);
    if (result.success) {
      toast.success("Pre-configured response deleted");
      loadResponses();
    } else {
      toast.error(
        result.error || "Failed to delete pre-configured response"
      );
    }
  };

  const handleToggleEnabled = async (response: CannedResponse) => {
    const result = await updateCannedResponse({
      id: response.id,
      enabled: !response.enabled,
    });
    if (result.success) {
      toast.success(
        response.enabled
          ? "Pre-configured response disabled"
          : "Pre-configured response enabled"
      );
      loadResponses();
    } else {
      toast.error(
        result.error || "Failed to update pre-configured response"
      );
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Pre-configured responses provide instant, zero-cost replies to common
        queries like greetings, thanks, etc. They are checked before calling the
        LLM, saving API quota and replacing LLM responses if usage quotas are
        exceeded.
      </p>

      {/* Useful Patterns Examples */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <p className="text-xs font-medium mb-2">Useful Patterns:</p>
          <p className="text-xs text-muted-foreground mb-2">
            <code className="bg-muted px-1 py-0.5 rounded text-xs">
              Hi|Hello|Hey
            </code>{" "}
            - Greetings (regex)
          </p>
        </AlertDescription>
      </Alert>

      {/* Special System Patterns Info */}
      <Alert className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
        <Info className="h-4 w-4 text-amber-800 dark:text-amber-200" />
        <AlertDescription className="text-amber-800 dark:text-amber-200">
          <p className="text-xs font-medium mb-2">Special System Patterns:</p>
          <ul className="text-xs space-y-1 ml-4 list-disc mb-2">
            <li>
              <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">
                quota_exceeded
              </code>{" "}
              - Shown to public users when your quota is exceeded (customize the
              message they see). Takes precedence over default response.
            </li>
            <li>
              <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">
                system_unavailable
              </code>{" "}
              - Shown when the AI service is temporarily unavailable or free
              tier has expired. Takes precedence over default response.
            </li>
          </ul>
          <p className="text-xs mt-2">
            Use pattern type <strong>"exact"</strong> for these special
            patterns. These patterns are checked before the bot's default
            response field.
          </p>
        </AlertDescription>
      </Alert>

      {/* Add Response Button */}
      <div className="flex items-center justify-between">
        <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger asChild>
            <Button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openCreateDialog();
              }}
              size="sm"
              type="button"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Response
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <DialogHeader>
                <DialogTitle>
                  {editingResponse
                    ? "Edit Pre-configured Response"
                    : "Create Pre-configured Response"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="pattern">Pattern</Label>
                  <Input
                    id="pattern"
                    value={pattern}
                    onChange={(e) => setPattern(e.target.value)}
                    placeholder='e.g., "hi|hello|hey" or "thank you"'
                  />
                  <p className="text-xs text-muted-foreground">
                    Pattern to match against user input. Use regex syntax for
                    pattern_type "regex".
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pattern_type">Pattern Type</Label>
                  <Select
                    value={patternType}
                    onValueChange={(val: "regex" | "keyword" | "exact") =>
                      setPatternType(val)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="regex">Regex</SelectItem>
                      <SelectItem value="keyword">Keyword</SelectItem>
                      <SelectItem value="exact">Exact</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Regex: Pattern matching with regex. Keyword: Phrase
                    matching. Exact: Exact string match.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="response">Response</Label>
                  <Textarea
                    id="response"
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder="Response text to return when pattern matches"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Input
                      id="priority"
                      type="number"
                      value={priority}
                      onChange={(e) =>
                        setPriority(parseInt(e.target.value) || 0)
                      }
                      min={0}
                    />
                    <p className="text-xs text-muted-foreground">
                      Higher priority responses are checked first
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fuzzy_threshold">Fuzzy Threshold</Label>
                    <Input
                      id="fuzzy_threshold"
                      type="number"
                      value={fuzzyThreshold}
                      onChange={(e) =>
                        setFuzzyThreshold(
                          Math.max(
                            0,
                            Math.min(3, parseInt(e.target.value) || 0)
                          )
                        )
                      }
                      min={0}
                      max={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      Typo tolerance (0-3, 0 = disabled)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="case_sensitive"
                      checked={caseSensitive}
                      onCheckedChange={setCaseSensitive}
                    />
                    <Label htmlFor="case_sensitive">Case Sensitive</Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      id="enabled"
                      checked={enabled}
                      onCheckedChange={setEnabled}
                    />
                    <Label htmlFor="enabled">Enabled</Label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDialogOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSubmit(e);
                  }}
                >
                  {editingResponse ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {responses.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No pre-configured responses yet.</p>
          <p className="text-sm">
            Create one to provide instant responses to common queries.
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pattern</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Response</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {responses.map((resp) => (
                <TableRow key={resp.id}>
                  <TableCell className="font-mono text-sm">
                    {resp.pattern}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs px-2 py-1 bg-muted rounded">
                      {resp.pattern_type}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {resp.response}
                  </TableCell>
                  <TableCell>{resp.priority}</TableCell>
                  <TableCell>
                    <Switch
                      checked={resp.enabled}
                      onCheckedChange={() => handleToggleEnabled(resp)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openEditDialog(resp);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDelete(resp.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
