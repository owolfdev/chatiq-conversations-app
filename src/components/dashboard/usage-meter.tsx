// src/components/dashboard/usage-meter.tsx
// Reusable usage meter widget that visualizes message/doc consumption per plan
// and links to upgrade flow at 80% usage

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
// Using inline progress bar to match existing billing page style
import {
  MessageSquare,
  FileText,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { CheckoutButton } from "@/components/billing/checkout-button";
import type { PlanId } from "@/lib/teams/usage";
import type { TeamQuotaStatus } from "@/lib/plans/quotas";

interface UsageMeterProps {
  quotaStatus: TeamQuotaStatus | null;
  currentPlan: PlanId;
  isTeamOwner: boolean;
  compact?: boolean; // If true, show compact version
  // Optional: billing currency to pass through to checkout (defaults to USD)
  billingCurrency?: "usd" | "thb";
}

export function UsageMeter({
  quotaStatus,
  currentPlan,
  isTeamOwner,
  compact = false,
  billingCurrency = "usd",
}: UsageMeterProps) {
  if (!quotaStatus) {
    return null;
  }

  // Focus on AI calls and Documents (primary limits)
  const messagesQuota = quotaStatus.quotas.messagesMonthly;
  const documentsQuota = quotaStatus.quotas.documents;
  const resetDate = quotaStatus.period?.end
    ? new Date(quotaStatus.period.end).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : null;

  // Calculate percentages
  const messagesPercentage =
    messagesQuota.limit && messagesQuota.limit > 0
      ? Math.min(
          100,
          Math.round((messagesQuota.used / messagesQuota.limit) * 100)
        )
      : 0;
  const documentsPercentage =
    documentsQuota.limit && documentsQuota.limit > 0
      ? Math.min(
          100,
          Math.round((documentsQuota.used / documentsQuota.limit) * 100)
        )
      : 0;

  // Check if any resource is at or above 80% usage
  const showUpgradeCTA =
    isTeamOwner &&
    (messagesPercentage >= 80 || documentsPercentage >= 80) &&
    currentPlan !== "enterprise";

  // Determine which resources need attention
  const messagesNeedsAttention = messagesPercentage >= 80;
  const documentsNeedsAttention = documentsPercentage >= 80;
  
  // Check if any resource is exceeded
  const messagesExceeded = messagesQuota.exceeded;
  const documentsExceeded = documentsQuota.exceeded;
  const isExceeded = messagesExceeded || documentsExceeded;

  // Format numbers
  const formatNumber = (num: number | null): string => {
    if (num === null) return "Unlimited";
    return num.toLocaleString();
  };

  if (compact) {
    // Compact version for dashboard homepage
    return (
      <Card className="bg-muted border-border">
        <CardHeader>
          <CardTitle className="text-base">Usage Overview</CardTitle>
          <CardDescription className="text-xs">
            Track your plan consumption{resetDate ? ` · Resets ${resetDate}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {showUpgradeCTA && (
            <Alert
              className={
                isExceeded
                  ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"
                  : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950"
              }
            >
              <AlertTriangle
                className={`h-4 w-4 ${
                  isExceeded
                    ? "text-red-600 dark:text-red-400"
                    : "text-amber-600 dark:text-amber-400"
                }`}
              />
              <AlertDescription
                className={`text-xs ${
                  isExceeded
                    ? "text-red-800 dark:text-red-200"
                    : "text-amber-800 dark:text-amber-200"
                }`}
              >
                {isExceeded
                  ? "You've exceeded your billing period limits. "
                  : "You're approaching your billing period limits. "}
                <Link
                  href="/dashboard/billing"
                  className="font-medium underline underline-offset-2"
                >
                  Upgrade now
                </Link>{" "}
                {isExceeded
                  ? "to continue using the service."
                  : "to avoid interruptions."}
              </AlertDescription>
            </Alert>
          )}

          {/* AI Calls Usage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">AI Calls</span>
              </div>
              <div className="text-right">
                <span className="font-semibold">
                  {formatNumber(messagesQuota.used)}
                </span>
                {messagesQuota.limit !== null && (
                  <>
                    {" / "}
                    <span className="text-muted-foreground">
                      {formatNumber(messagesQuota.limit)}
                    </span>
                  </>
                )}
              </div>
            </div>
            {messagesQuota.limit !== null ? (
              <div className="h-2 rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all ${
                    messagesQuota.exceeded
                      ? "bg-red-500"
                      : messagesNeedsAttention
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                  style={{ width: `${messagesPercentage}%` }}
                />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Unlimited</p>
            )}
            {resetDate && (
              <p className="text-[11px] text-muted-foreground">
                Resets {resetDate}
              </p>
            )}
          </div>

          {/* Documents Usage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Documents</span>
              </div>
              <div className="text-right">
                <span className="font-semibold">
                  {formatNumber(documentsQuota.used)}
                </span>
                {documentsQuota.limit !== null && (
                  <>
                    {" / "}
                    <span className="text-muted-foreground">
                      {formatNumber(documentsQuota.limit)}
                    </span>
                  </>
                )}
              </div>
            </div>
            {documentsQuota.limit !== null ? (
              <div className="h-2 rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all ${
                    documentsQuota.exceeded
                      ? "bg-red-500"
                      : documentsNeedsAttention
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                  style={{ width: `${documentsPercentage}%` }}
                />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Unlimited</p>
            )}
          </div>
        </CardContent>
        {showUpgradeCTA && (
          <CardFooter className="flex-col gap-2 sm:flex-row">
            {currentPlan !== "pro" && currentPlan !== "team" && (
              <CheckoutButton
                plan="pro"
                currentPlan={currentPlan}
                className="w-full sm:w-auto"
                currency={billingCurrency}
              >
                Upgrade to Pro
              </CheckoutButton>
            )}
            {currentPlan !== "team" && (
              <CheckoutButton
                plan="team"
                currentPlan={currentPlan}
                className="w-full sm:w-auto"
                currency={billingCurrency}
              >
                Upgrade to Team
              </CheckoutButton>
            )}
            <Button variant="outline" className="w-full sm:w-auto" asChild>
              <Link href="/dashboard/billing">View Details</Link>
            </Button>
          </CardFooter>
        )}
      </Card>
    );
  }

  // Full version (for billing page or detailed views)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Usage Meter
        </CardTitle>
        <CardDescription>
          Monitor your plan consumption. Upgrade at 80% usage to avoid
          interruptions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {showUpgradeCTA && (
          <Alert
            className={
              isExceeded
                ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"
                : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950"
            }
          >
            <AlertTriangle
              className={`h-4 w-4 ${
                isExceeded
                  ? "text-red-600 dark:text-red-400"
                  : "text-amber-600 dark:text-amber-400"
              }`}
            />
            <AlertDescription
              className={
                isExceeded
                  ? "text-red-800 dark:text-red-200"
                  : "text-amber-800 dark:text-amber-200"
              }
            >
              {isExceeded
                ? "You've exceeded your billing period limits. Upgrade now to unlock more capacity and continue using the service."
                : "You're approaching your billing period limits. Upgrade now to unlock more capacity and avoid service interruptions."}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {/* AI Calls Usage Card */}
          <div className="rounded-lg border border-border/60 bg-muted/40 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">AI Calls</p>
                  <p className="text-xs text-muted-foreground">
                    AI calls processed in this billing period
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold">
                  {formatNumber(messagesQuota.used)}
                </span>
                {messagesQuota.limit !== null && (
                  <span className="text-sm text-muted-foreground">
                    / {formatNumber(messagesQuota.limit)}
                  </span>
                )}
              </div>
              {messagesQuota.limit !== null ? (
                <>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${
                        messagesQuota.exceeded
                          ? "bg-red-500"
                          : messagesNeedsAttention
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      }`}
                      style={{ width: `${messagesPercentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {messagesQuota.remaining !== null
                      ? `${formatNumber(messagesQuota.remaining)} remaining`
                      : "Unlimited"}
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Included in plan with no hard limit.
                </p>
              )}
            </div>
          </div>

          {/* Documents Usage Card */}
          <div className="rounded-lg border border-border/60 bg-muted/40 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Documents</p>
                  <p className="text-xs text-muted-foreground">
                    Knowledge base items stored for your team
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold">
                  {formatNumber(documentsQuota.used)}
                </span>
                {documentsQuota.limit !== null && (
                  <span className="text-sm text-muted-foreground">
                    / {formatNumber(documentsQuota.limit)}
                  </span>
                )}
              </div>
              {documentsQuota.limit !== null ? (
                <>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${
                        documentsQuota.exceeded
                          ? "bg-red-500"
                          : documentsNeedsAttention
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      }`}
                      style={{ width: `${documentsPercentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {documentsQuota.remaining !== null
                      ? `${formatNumber(documentsQuota.remaining)} remaining`
                      : "Unlimited"}
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Included in plan with no hard limit.
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
      {showUpgradeCTA && (
        <CardFooter className="flex-col gap-2 sm:flex-row">
          {currentPlan !== "pro" && currentPlan !== "team" && (
            <CheckoutButton
              plan="pro"
              currentPlan={currentPlan}
              currency={billingCurrency}
            >
              Upgrade to Pro
            </CheckoutButton>
          )}
          {currentPlan !== "team" && (
            <CheckoutButton
              plan="team"
              currentPlan={currentPlan}
              currency={billingCurrency}
            >
              Upgrade to Team
            </CheckoutButton>
          )}
          <Button variant="outline" asChild>
            <Link href="/dashboard/billing">View Full Details</Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
