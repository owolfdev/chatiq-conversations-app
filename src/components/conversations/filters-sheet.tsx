"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface FiltersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bots: Array<{ id: string; name: string }>;
  topics: readonly string[];
  sources: Array<{ value: string; label: string }>;
  selectedBot: string;
  onBotChange: (value: string) => void;
  selectedTopic: string;
  onTopicChange: (value: string) => void;
  selectedStatus: string;
  onStatusChange: (value: string) => void;
  selectedSource: string;
  onSourceChange: (value: string) => void;
  detailQuery: string;
  onDetailQueryChange: (value: string) => void;
  onReset: () => void;
}

export function FiltersSheet({
  open,
  onOpenChange,
  bots,
  topics,
  sources,
  selectedBot,
  onBotChange,
  selectedTopic,
  onTopicChange,
  selectedStatus,
  onStatusChange,
  selectedSource,
  onSourceChange,
  detailQuery,
  onDetailQueryChange,
  onReset,
}: FiltersSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl p-0"
        showClose={false}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <Button variant="ghost" size="sm" onClick={onReset}>
            Reset
          </Button>
          <Button size="sm" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
        <div className="mt-3 grid gap-3 px-4 pb-4">
          <div className="space-y-1.5">
            <Label htmlFor="filter-bot" className="text-xs text-muted-foreground">
              Bot
            </Label>
            <Select value={selectedBot} onValueChange={onBotChange}>
              <SelectTrigger id="filter-bot" className="h-9">
                <SelectValue placeholder="All bots" />
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

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Topic</Label>
            <Select value={selectedTopic} onValueChange={onTopicChange}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All topics" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Topics</SelectItem>
                {topics.map((topic) => (
                  <SelectItem key={topic} value={topic}>
                    {topic}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={selectedStatus} onValueChange={onStatusChange}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="unresolved">Unresolved</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Source</Label>
            <Select value={selectedSource} onValueChange={onSourceChange}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {sources.map((source) => (
                  <SelectItem key={source.value} value={source.value}>
                    {source.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="filter-detail" className="text-xs text-muted-foreground">
              Detail search
            </Label>
            <Input
              id="filter-detail"
              placeholder="Search detail"
              value={detailQuery}
              className="h-9"
              onChange={(event) => onDetailQueryChange(event.target.value)}
            />
          </div>
        </div>

      </SheetContent>
    </Sheet>
  );
}
