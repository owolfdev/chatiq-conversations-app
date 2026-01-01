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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface FiltersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bots: Array<{ id: string; name: string }>;
  topics: string[];
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
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader className="text-left">
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>
        <div className="mt-4 grid gap-4">
          <div>
            <Label htmlFor="filter-bot">Bot</Label>
            <Select value={selectedBot} onValueChange={onBotChange}>
              <SelectTrigger id="filter-bot">
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

          <div>
            <Label>Topic</Label>
            <Select value={selectedTopic} onValueChange={onTopicChange}>
              <SelectTrigger>
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

          <div>
            <Label>Status</Label>
            <Select value={selectedStatus} onValueChange={onStatusChange}>
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
            <Label>Source</Label>
            <Select value={selectedSource} onValueChange={onSourceChange}>
              <SelectTrigger>
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

          <div>
            <Label htmlFor="filter-detail">Detail search</Label>
            <Input
              id="filter-detail"
              placeholder="Search detail"
              value={detailQuery}
              onChange={(event) => onDetailQueryChange(event.target.value)}
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Button variant="ghost" onClick={onReset}>
            Reset filters
          </Button>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
