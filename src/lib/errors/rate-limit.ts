import type { PlanId } from "@/lib/plans/quotas";

interface RateLimitErrorOptions {
  teamId: string | null;
  plan: PlanId;
  limit: number;
  usage: number;
  increment?: number;
}

export class RateLimitExceededError extends Error {
  readonly teamId: string | null;
  readonly plan: PlanId;
  readonly limit: number;
  readonly usage: number;
  readonly increment: number;

  constructor(
    message: string,
    { teamId, plan, limit, usage, increment }: RateLimitErrorOptions
  ) {
    super(message);
    this.name = "RateLimitExceededError";
    this.teamId = teamId;
    this.plan = plan;
    this.limit = limit;
    this.usage = usage;
    this.increment = increment ?? 1;
  }
}
