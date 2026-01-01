// src/components/dashboard/free-tier-trial-banner.tsx
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Clock, Sparkles, AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import {
  isFreeTierExpired,
  getFreeTierDaysRemaining,
  isInFreeTierWarningPhase,
  FREE_TIER_TRIAL_DAYS,
} from "@/lib/plans/free-tier-expiry";

interface FreeTierTrialBannerProps {
  teamCreatedAt: string | null;
  teamTrialEndsAt?: string | null;
  currentPlan: string;
}

export function FreeTierTrialBanner({
  teamCreatedAt,
  teamTrialEndsAt,
  currentPlan,
}: FreeTierTrialBannerProps) {
  // Only show for evaluation plan users (not admin)
  if (currentPlan !== "free" || !teamCreatedAt) {
    return null;
  }

  const daysRemaining = getFreeTierDaysRemaining(
    teamCreatedAt,
    teamTrialEndsAt
  );
  const isExpired = isFreeTierExpired(teamCreatedAt, teamTrialEndsAt);
  const isWarningPhase = isInFreeTierWarningPhase(
    teamCreatedAt,
    teamTrialEndsAt
  );
  const clampedDaysRemaining = Math.min(
    Math.max(daysRemaining, 0),
    FREE_TIER_TRIAL_DAYS
  );

  const cta = (
    <div className="flex flex-wrap gap-2">
      <Button
        asChild
        size="sm"
        className="bg-emerald-600 hover:bg-emerald-700 text-white"
      >
        <Link href="/pricing">
          View plans <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </div>
  );

  // Expired state
  if (isExpired) {
    return (
      <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/60 w-full max-w-3xl flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-amber-100 p-2 dark:bg-amber-900">
            <AlertCircle className="h-4 w-4 text-amber-700 dark:text-amber-200" />
          </div>
          <div className="space-y-1">
            <AlertTitle className="text-amber-900 dark:text-amber-100 text-sm font-semibold">
              Evaluation period ended. Upgrade to keep AI responses running.
            </AlertTitle>
            <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm">
              API and embeds are paused. Pre-configured and cached responses
              still work in the dashboard until you upgrade.
            </AlertDescription>
          </div>
        </div>
        {cta}
      </Alert>
    );
  }

  // Warning phase (last 7 days)
  if (isWarningPhase) {
    return (
      <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/60 w-full max-w-3xl flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-amber-100 p-2 dark:bg-amber-900">
            <Clock className="h-4 w-4 text-amber-700 dark:text-amber-200" />
          </div>
          <div className="space-y-1">
            <AlertTitle className="text-amber-900 dark:text-amber-100 text-sm font-semibold">
              {daysRemaining === 1
                ? "Evaluation Mode: last day. Upgrade today."
                : `Evaluation Mode: ${daysRemaining} days left.`}
            </AlertTitle>
            <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm">
              Keep full AI responses by upgrading before the evaluation ends.
            </AlertDescription>
          </div>
        </div>
        {cta}
      </Alert>
    );
  }

  // Active trial (more than 7 days remaining)
  return (
    <Alert className="border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/60 w-full flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-emerald-100 p-2 dark:bg-emerald-900">
          <Sparkles className="h-4 w-4 text-emerald-700 dark:text-emerald-200" />
        </div>
        <div className="space-y-1">
          <AlertTitle className="text-emerald-900 dark:text-emerald-100 text-sm font-semibold">
            Evaluation Mode: {clampedDaysRemaining} days left.
          </AlertTitle>
          <AlertDescription className="text-emerald-800 dark:text-emerald-200 text-sm">
            Enjoy full AI responses now. Upgrade to keep them running after the
            evaluation.
          </AlertDescription>
        </div>
      </div>
      {cta}
    </Alert>
  );
}
