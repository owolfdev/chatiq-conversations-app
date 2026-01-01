"use client";

import { useState } from "react";

import type { BillingCurrency } from "@/lib/stripe";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BillingCurrencySelectorProps {
  initialCurrency: BillingCurrency;
  isTeamOwner: boolean;
}

export function BillingCurrencySelector({
  initialCurrency,
  isTeamOwner,
}: BillingCurrencySelectorProps) {
  const [currency, setCurrency] = useState<BillingCurrency>(initialCurrency);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = async (next: BillingCurrency) => {
    if (next === currency) return;
    if (!isTeamOwner) return;

    setCurrency(next);
    setIsSaving(true);

    try {
      const response = await fetch("/api/billing/currency", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ billing_currency: next }),
      });

      if (!response.ok) {
        console.error("Failed to update billing currency");
        // Revert on failure
        setCurrency(initialCurrency);
      }
    } catch (error) {
      console.error("Error updating billing currency", error);
      setCurrency(initialCurrency);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mt-6 inline-flex flex-col gap-1 rounded-md border bg-card px-4 py-3 text-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-medium">Billing currency</p>
          <p className="text-xs text-muted-foreground">
            Controls the currency for new subscriptions and invoices for this
            team.
          </p>
        </div>
        <Select
          value={currency}
          onValueChange={(value) => handleChange(value as BillingCurrency)}
          disabled={!isTeamOwner || isSaving}
        >
          <SelectTrigger
            className={cn(
              "h-9 w-[90px] rounded-md border bg-background text-sm",
              !isTeamOwner && "opacity-60 cursor-not-allowed"
            )}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="usd">USD</SelectItem>
            <SelectItem value="thb">THB</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {!isTeamOwner && (
        <p className="text-[11px] text-muted-foreground">
          Only team owners can change billing currency.
        </p>
      )}
    </div>
  );
}
