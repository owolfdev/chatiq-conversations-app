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
import { ArrowDown, AlertTriangle, CreditCard } from "lucide-react";
import type { BillingPlan, BillingCurrency } from "@/lib/stripe";

interface DowngradeConfirmationDialogProps {
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

const PLAN_FEATURES: Record<string, string[]> = {
  team: [
    "10,000 AI calls per month",
    "100 documents",
    "Team collaboration",
    "Analytics dashboard",
    "Webhook + API access",
  ],
  pro: [
    "2,000 AI calls per month",
    "25 documents",
    "API access",
    "Priority support",
  ],
};

export function DowngradeConfirmationDialog({
  open,
  onOpenChange,
  currentPlan,
  targetPlan,
  currency,
  onConfirm,
  isLoading = false,
}: DowngradeConfirmationDialogProps) {
  const currentPlanLabel = PLAN_LABELS[currentPlan.toLowerCase()] || currentPlan;
  const targetPlanLabel = PLAN_LABELS[targetPlan] || targetPlan;
  const lostFeatures = PLAN_FEATURES[currentPlan.toLowerCase()] || [];
  const gainedFeatures = PLAN_FEATURES[targetPlan] || [];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Confirm Subscription Downgrade
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4 pt-2">
            <p className="text-sm">
              You're about to downgrade your subscription. This will reduce your
              plan limits and may affect your current usage.
            </p>

            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    Current Plan
                  </p>
                </div>
                <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  {currentPlanLabel}
                </p>
              </div>

              <div className="flex items-center justify-center">
                <ArrowDown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                    New Plan
                  </p>
                </div>
                <p className="text-lg font-semibold text-amber-900 dark:text-amber-100">
                  {targetPlanLabel}
                </p>
              </div>
            </div>

            {lostFeatures.length > 0 && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3 space-y-2">
                <p className="text-xs font-medium text-red-800 dark:text-red-300">
                  ⚠️ You will lose access to:
                </p>
                <ul className="text-xs text-red-700 dark:text-red-400 space-y-1 list-disc list-inside">
                  {lostFeatures.map((feature, index) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                💳 Billing Information
              </p>
              <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1 list-disc list-inside">
                <li>
                  You'll receive a prorated credit for the remainder of your
                  current billing cycle
                </li>
                <li>
                  The downgrade takes effect immediately after confirmation
                </li>
                <li>
                  Your next billing cycle will be charged at the new plan rate
                </li>
                <li>
                  If you're currently using features that exceed Pro plan limits,
                  you may need to reduce usage
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
            className="bg-amber-600 hover:bg-amber-700 focus:ring-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700"
          >
            {isLoading ? "Downgrading..." : "Confirm Downgrade"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
