// src/lib/formatters.ts
// Shared formatting utilities for displaying currency and dates in the app.

export function formatCurrency(
  amount: number | null,
  currency: string | null,
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }
): string | null {
  if (amount === null || currency === null) {
    return null;
  }

  const cents = amount;
  const fractionDigits = cents % 100 === 0 ? 0 : 2;

  const formatter = new Intl.NumberFormat("en", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits:
      options?.minimumFractionDigits ?? options?.maximumFractionDigits ?? fractionDigits,
    maximumFractionDigits:
      options?.maximumFractionDigits ?? options?.minimumFractionDigits ?? fractionDigits,
  });

  return formatter.format(cents / 100);
}

export function formatDate(date: Date | null, locale: string = "en"): string | null {
  if (!date) {
    return null;
  }

  try {
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  } catch (error) {
    console.error("Unable to format date", error);
    return date.toISOString();
  }
}
