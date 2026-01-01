import { describe, expect, it, vi, afterEach } from "vitest";

import { validateContent } from "@/lib/middleware/moderation";
import { AUDIT_ACTION, AUDIT_RESOURCE } from "@/lib/audit/constants";

const mockLogAuditEvent = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/audit/log-event", () => ({
  logAuditEvent: (...args: unknown[]) => mockLogAuditEvent(...args),
}));

describe("moderation middleware", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockLogAuditEvent.mockClear();
  });

  it("throws a structured error and logs audit data when content is flagged", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            flagged: true,
            categories: { hate: true },
            category_scores: { hate: 0.98 },
          },
        ],
      }),
    } as unknown as Response);

    await expect(
      validateContent("forbidden content", {
        userId: "user-123",
        teamId: "team-123",
        botId: "bot-456",
        ipAddress: "127.0.0.1",
        userAgent: "Vitest",
      })
    ).rejects.toMatchObject({
      code: "MODERATION_FLAGGED",
      flaggedCategories: ["hate"],
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AUDIT_ACTION.MODERATION_FLAGGED,
        resourceType: AUDIT_RESOURCE.CONVERSATION,
        teamId: "team-123",
        userId: "user-123",
        metadata: expect.objectContaining({
          message_preview: "forbidden content",
          flagged_categories: ["hate"],
        }),
      })
    );
  });

  it("allows content to proceed when not flagged", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            flagged: false,
            categories: { hate: false },
            category_scores: { hate: 0.01 },
          },
        ],
      }),
    } as unknown as Response);

    await expect(
      validateContent("hello world", {
        userId: "user-123",
        teamId: "team-123",
        botId: "bot-456",
      })
    ).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mockLogAuditEvent).not.toHaveBeenCalled();
  });
});

