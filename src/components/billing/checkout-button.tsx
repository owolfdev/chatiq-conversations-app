"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { BillingCurrency, BillingPlan } from "@/lib/stripe";
import { UpgradeConfirmationDialog } from "./upgrade-confirmation-dialog";
import { DowngradeConfirmationDialog } from "./downgrade-confirmation-dialog";

interface CheckoutButtonProps {
  plan: BillingPlan;
  currentPlan?: string;
  children: React.ReactNode;
  variant?:
    | "default"
    | "outline"
    | "destructive"
    | "ghost"
    | "link"
    | "secondary";
  className?: string;
  currency?: BillingCurrency;
}

// Plan hierarchy: free < pro < team < enterprise
const PLAN_HIERARCHY: Record<string, number> = {
  free: 0,
  pro: 1,
  team: 2,
  enterprise: 3,
};

export function CheckoutButton({
  plan,
  currentPlan,
  children,
  variant = "outline",
  className,
  currency = "usd",
}: CheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showDowngradeDialog, setShowDowngradeDialog] = useState(false);

  // Don't show checkout for the current plan
  if (currentPlan === plan) {
    return null;
  }

  // Determine if this is an upgrade or downgrade
  let isUpgrade = false;
  let isDowngrade = false;
  
  if (currentPlan) {
    const currentTier = PLAN_HIERARCHY[currentPlan.toLowerCase()] ?? -1;
    const targetTier = PLAN_HIERARCHY[plan] ?? -1;

    if (targetTier > currentTier) {
      isUpgrade = true;
    } else if (targetTier < currentTier && currentPlan !== "free") {
      isDowngrade = true;
    } else {
      // Same tier or invalid - don't show
      return null;
    }
  }

  const handleClick = () => {
    // If upgrading from an existing subscription, show upgrade confirmation dialog
    if (isUpgrade) {
      setShowUpgradeDialog(true);
    } else if (isDowngrade) {
      // If downgrading, show downgrade confirmation dialog
      setShowDowngradeDialog(true);
    } else {
      // New subscription - proceed directly (will go through Stripe checkout)
      handleCheckout();
    }
  };

  const handleCheckout = async () => {
    setIsLoading(true);
    setShowUpgradeDialog(false);
    setShowDowngradeDialog(false);

    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan,
          currency,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.error("Checkout error:", error);
        alert(
          error.error || "Failed to start checkout. Please try again later."
        );
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      if (data.url) {
        // If subscription was changed directly (upgrade/downgrade, no checkout needed), redirect to billing page
        // The API returns a billing page URL with success params
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Checkout failed:", error);
      alert("Failed to start checkout. Please try again later.");
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        className={className}
        disabled={isLoading}
        onClick={handleClick}
      >
        {isLoading ? "Loading..." : children}
      </Button>

      {isUpgrade && currentPlan && (
        <UpgradeConfirmationDialog
          open={showUpgradeDialog}
          onOpenChange={setShowUpgradeDialog}
          currentPlan={currentPlan}
          targetPlan={plan}
          currency={currency}
          onConfirm={handleCheckout}
          isLoading={isLoading}
        />
      )}

      {isDowngrade && currentPlan && (
        <DowngradeConfirmationDialog
          open={showDowngradeDialog}
          onOpenChange={setShowDowngradeDialog}
          currentPlan={currentPlan}
          targetPlan={plan}
          currency={currency}
          onConfirm={handleCheckout}
          isLoading={isLoading}
        />
      )}
    </>
  );
}
