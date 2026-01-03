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
        className="rounded-t-2xl border border-muted/60 bg-background/95 p-0 shadow-xl backdrop-blur"
        showClose={false}
      >
        <div className="flex justify-center px-4 pt-3">
          <div className="h-1 w-12 rounded-full bg-muted-foreground/30" />
        </div>
        <div className="mt-2 flex items-center justify-between border-b bg-muted/20 px-4 py-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            className="transition-transform active:scale-95"
          >
            Reset
          </Button>
          <Button
            size="sm"
            onClick={() => onOpenChange(false)}
            className="transition-transform active:scale-95"
          >
            Done
          </Button>
        </div>
        <div className="mt-4 grid gap-4 px-4 pb-6">
          <div className="space-y-1.5">
            <Label
              htmlFor="filter-bot"
              className="text-sm font-semibold text-foreground/80"
            >
              Bot
            </Label>
            <Select value={selectedBot} onValueChange={onBotChange}>
              <SelectTrigger id="filter-bot" className="h-10">
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
            <Label className="text-sm font-semibold text-foreground/80">
              Topic
            </Label>
            <Select value={selectedTopic} onValueChange={onTopicChange}>
              <SelectTrigger className="h-10">
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
            <Label className="text-sm font-semibold text-foreground/80">
              Status
            </Label>
            <Select value={selectedStatus} onValueChange={onStatusChange}>
              <SelectTrigger className="h-10">
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
            <Label className="text-sm font-semibold text-foreground/80">
              Source
            </Label>
            <Select value={selectedSource} onValueChange={onSourceChange}>
              <SelectTrigger className="h-10">
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
            <Label
              htmlFor="filter-detail"
              className="text-sm font-semibold text-foreground/80"
            >
              Detail search
            </Label>
            <Input
              id="filter-detail"
              placeholder="Search detail"
              value={detailQuery}
              className="h-10"
              onChange={(event) => onDetailQueryChange(event.target.value)}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
