"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getUser } from "@/app/actions/auth/get-user";
import type { BillingPlan, BillingCurrency } from "@/lib/stripe";
import { UpgradeConfirmationDialog } from "@/components/billing/upgrade-confirmation-dialog";
import { DowngradeConfirmationDialog } from "@/components/billing/downgrade-confirmation-dialog";

const PLAN_LABELS: Record<string, string> = {
  free: "Evaluation",
  pro: "Pro",
  team: "Team",
  enterprise: "Business (Custom)",
};

interface PricingCardButtonProps {
  plan?: "free" | "pro" | "team" | "enterprise";
  buttonText: string;
  buttonVariant?: "default" | "outline";
  currency?: BillingCurrency;
  currentPlan?: string;
}

export function PricingCardButton({
  plan,
  buttonText,
  buttonVariant = "default",
  currency = "usd",
  currentPlan,
}: PricingCardButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showDowngradeDialog, setShowDowngradeDialog] = useState(false);
  const [userCurrentPlan, setUserCurrentPlan] = useState<string | null>(null);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(false);

  useEffect(() => {
    getUser().then((user) => {
      setIsLoggedIn(!!user);
      
      // If logged in and no currentPlan prop provided, fetch it
      if (user && !currentPlan) {
        setIsCheckingSubscription(true);
        fetch("/api/billing/check-subscription")
          .then((res) => res.json())
          .then((data) => {
            if (data.currentPlan) {
              setUserCurrentPlan(data.currentPlan);
            }
          })
          .catch((error) => {
            console.error("Failed to check subscription:", error);
          })
          .finally(() => {
            setIsCheckingSubscription(false);
          });
      } else if (currentPlan) {
        setUserCurrentPlan(currentPlan);
      }
    });
  }, [currentPlan]);

  // Check if this is an upgrade scenario (user has existing subscription)
  const effectiveCurrentPlan = currentPlan || userCurrentPlan;
  const isCurrentPlan = effectiveCurrentPlan && effectiveCurrentPlan === plan;
  
  // Plan hierarchy for determining upgrades vs downgrades
  const PLAN_HIERARCHY: Record<string, number> = {
    free: 0,
    pro: 1,
    team: 2,
    enterprise: 3,
  };
  
  const isUpgrade = effectiveCurrentPlan && 
    plan &&
    effectiveCurrentPlan !== "free" && 
    effectiveCurrentPlan !== plan &&
    PLAN_HIERARCHY[effectiveCurrentPlan.toLowerCase()] < PLAN_HIERARCHY[plan];
  
  const isDowngrade = effectiveCurrentPlan && 
    plan &&
    effectiveCurrentPlan !== "free" && 
    effectiveCurrentPlan !== plan &&
    PLAN_HIERARCHY[effectiveCurrentPlan.toLowerCase()] > PLAN_HIERARCHY[plan];

  const handleClick = async (e: React.MouseEvent) => {
    // Always prevent default to avoid navigation issues
    e.preventDefault();
    
    // If this is the user's current plan, do nothing (button is disabled)
    if (isCurrentPlan) {
      return;
    }
    
    // For Free and Enterprise plans, always redirect to sign-up or contact
    if (!plan || plan === "free" || plan === "enterprise") {
      if (plan === "enterprise") {
        router.push("/contact");
        return;
      }
      // Free plan - navigate to sign-up or quick start
      const href = getHref();
      router.push(href);
      return;
    }

    // For Pro and Team plans, check if user is logged in
    // If still checking, proceed anyway - the server will verify auth
    if (isLoggedIn === false) {
      // Confirmed not logged in, navigate to sign-up
      router.push("/sign-up");
      return;
    }

    // User is logged in (or still checking) - proceed with checkout
    // The server-side checkout API will handle subscription checks
    // If we detect an upgrade/downgrade scenario client-side, show confirmation dialog
    // Otherwise, proceed to checkout (server will handle upgrade vs new subscription)
    if (isUpgrade && isLoggedIn) {
      // Only show dialog if we're confirmed logged in and it's an upgrade
      setShowUpgradeDialog(true);
    } else if (isDowngrade && isLoggedIn) {
      // Show downgrade confirmation dialog
      setShowDowngradeDialog(true);
    } else {
      // New subscription or still checking - proceed to checkout
      // Server will determine if it's an upgrade and handle accordingly
      handleCheckout();
    }
  };

  const handleCheckout = async () => {
    if (!plan || plan === "free" || plan === "enterprise") {
      return;
    }

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
          plan: plan as BillingPlan,
          currency: currency,
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
        if (data.upgraded || data.downgraded || data.alreadySubscribed) {
          window.location.href = data.url;
        } else {
          // New checkout session - redirect to Stripe checkout
          window.location.href = data.url;
        }
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Checkout failed:", error);
      alert("Failed to start checkout. Please try again later.");
      setIsLoading(false);
    }
  };

  // Determine the href based on plan and login status
  const getHref = () => {
    if (plan === "enterprise") {
      return "/contact";
    }
    if (isLoggedIn && (plan === "pro" || plan === "team")) {
      // Will be handled by onClick
      return "#";
    }
    if (isLoggedIn && plan === "free") {
      // Logged in users on free plan should go to quick start guide
      return "/docs/quick-start";
    }
    // Not logged in - go to sign up
    return "/sign-up";
  };

  // Determine button text based on plan relationship
  const getDisplayText = () => {
    if (isCurrentPlan) {
      return "Current Plan";
    }
    if (isLoading) {
      return "Loading...";
    }
    if (isDowngrade && effectiveCurrentPlan) {
      // Show "Change Subscription To Pro" for downgrades
      return `Change Subscription To ${PLAN_LABELS[plan] || plan}`;
    }
    return buttonText;
  };
  
  const displayText = getDisplayText();
  
  const isDisabled = Boolean(isLoading || isCurrentPlan);

  return (
    <>
      <Button
        className={
          isCurrentPlan
            ? "w-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 cursor-not-allowed"
            : buttonVariant === "outline"
            ? "w-full border-emerald-500 text-emerald-500 hover:bg-emerald-950"
            : "w-full bg-emerald-500 hover:bg-emerald-600"
        }
        variant={isCurrentPlan ? "secondary" : buttonVariant}
        disabled={isDisabled}
        onClick={handleClick}
        asChild={false}
      >
        <span>{displayText}</span>
      </Button>

      {isUpgrade && isLoggedIn && (plan === "pro" || plan === "team") && effectiveCurrentPlan && (
        <UpgradeConfirmationDialog
          open={showUpgradeDialog}
          onOpenChange={setShowUpgradeDialog}
          currentPlan={effectiveCurrentPlan}
          targetPlan={plan as BillingPlan}
          currency={currency}
          onConfirm={handleCheckout}
          isLoading={isLoading}
        />
      )}

      {isDowngrade && isLoggedIn && (plan === "pro" || plan === "team") && effectiveCurrentPlan && (
        <DowngradeConfirmationDialog
          open={showDowngradeDialog}
          onOpenChange={setShowDowngradeDialog}
          currentPlan={effectiveCurrentPlan}
          targetPlan={plan as BillingPlan}
          currency={currency}
          onConfirm={handleCheckout}
          isLoading={isLoading}
        />
      )}
    </>
  );
}
