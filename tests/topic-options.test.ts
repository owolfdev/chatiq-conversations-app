import { describe, expect, it } from "vitest";

import {
  deriveTopicFilterOptions,
  getMergedTopicLabels,
  parseBotTopicsPayload,
} from "@/lib/conversations/topic-options";

describe("topic options utilities", () => {
  it("parses enabled topics, trims labels, orders by priority, and dedupes", () => {
    const parsed = parseBotTopicsPayload({
      topics: [
        { label: "  VIP Escalation  ", priority: 3, enabled: true },
        { label: "General Help", priority: 1, enabled: true },
        { label: "Billing", priority: "2", enabled: true },
        { label: "General Help", priority: 99, enabled: true },
        { label: "Disabled Topic", priority: 0, enabled: false },
        { label: " ", priority: 4, enabled: true },
      ],
    });

    expect(parsed).toEqual([
      { label: "General Help", priority: 1 },
      { label: "Billing", priority: 2 },
      { label: "VIP Escalation", priority: 3 },
    ]);
  });

  it("adds current historical topic when it is not in enabled options", () => {
    const merged = getMergedTopicLabels(
      [
        { label: "Support", priority: 1 },
        { label: "Billing", priority: 2 },
      ],
      "Legacy Topic"
    );

    expect(merged).toEqual(["Support", "Billing", "Legacy Topic"]);
  });

  it("derives filter options dynamically without hardcoded legacy topics", () => {
    const options = deriveTopicFilterOptions([
      "Billing",
      null,
      "Support",
      "Billing",
      "  Escalations ",
      "",
    ]);

    expect(options).toEqual(["Billing", "Escalations", "Support"]);
  });
});
