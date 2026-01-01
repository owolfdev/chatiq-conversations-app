"use client";

import { useState } from "react";
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
import { ArrowRight, CreditCard } from "lucide-react";
import type { BillingPlan, BillingCurrency } from "@/lib/stripe";

interface UpgradeConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan: string;
  targetPlan: BillingPlan;
  currency: BillingCurrency;
  onConfirm: () => void;
  isLoading?: boolean;
}

const PLAN_LABELS: Record<string, string> = {
  free: "Evaluation",
  pro: "Pro",
  team: "Team",
  enterprise: "Enterprise",
};

const PLAN_DESCRIPTIONS: Record<string, string> = {
  free: "Evaluation plan with limited usage caps",
  pro: "Pro plan with higher limits",
  team: "Team plan with collaboration features",
  enterprise: "Enterprise plan with custom features",
};

export function UpgradeConfirmationDialog({
  open,
  onOpenChange,
  currentPlan,
  targetPlan,
  currency,
  onConfirm,
  isLoading = false,
}: UpgradeConfirmationDialogProps) {
  const currentPlanLabel = PLAN_LABELS[currentPlan.toLowerCase()] || currentPlan;
  const targetPlanLabel = PLAN_LABELS[targetPlan] || targetPlan;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-emerald-500" />
            Confirm Subscription Upgrade
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4 pt-2">
            <p className="text-sm">
              You're about to upgrade your subscription. This will immediately
              charge your payment method on file.
            </p>

            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    Current Plan
                  </p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    {PLAN_DESCRIPTIONS[currentPlan.toLowerCase()] || "Current subscription"}
                  </p>
                </div>
                <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  {currentPlanLabel}
                </p>
              </div>

              <div className="flex items-center justify-center">
                <ArrowRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                    New Plan
                  </p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    {PLAN_DESCRIPTIONS[targetPlan] || "Upgraded subscription"}
                  </p>
                </div>
                <p className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">
                  {targetPlanLabel}
                </p>
              </div>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                💳 Payment Information
              </p>
              <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1 list-disc list-inside">
                <li>
                  You'll be charged a prorated amount immediately for the
                  remainder of your billing cycle
                </li>
                <li>
                  Your next full billing cycle will be charged at the new plan
                  rate
                </li>
                <li>
                  The upgrade takes effect immediately after confirmation
                </li>
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel disabled={isLoading} onClick={() => onOpenChange(false)}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700"
          >
            {isLoading ? "Upgrading..." : "Confirm Upgrade"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
