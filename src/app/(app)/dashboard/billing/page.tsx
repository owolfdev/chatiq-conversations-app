//src/app/dashboard/billing/page.tsx

import type Stripe from "stripe";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Calendar,
  CreditCard,
  DollarSign,
  Download,
  MessageSquare,
  TrendingUp,
} from "lucide-react";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getUserTeamId } from "@/lib/teams/get-user-team-id";
import {
  BillingPlan,
  type BillingCurrency,
  getPlanFromPriceId,
  getStripeClient,
  isLiveMode,
} from "@/lib/stripe";
import { fetchPlanPrice, formatPriceDisplay } from "@/lib/pricing";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { getTeamQuotaStatus, type PlanId } from "@/lib/teams/usage";
import { CheckoutButton } from "@/components/billing/checkout-button";

export const metadata: Metadata = {
  title: "Billing",
};
import { BillingCurrencySelector } from "@/components/billing/billing-currency-selector";

type PlanKey = "free" | "pro" | "team" | "enterprise" | "admin";

interface PlanDetail {
  label: string;
  description: string;
  defaultPriceDisplay: string;
  messageLimit: number | null;
}

const PLAN_DETAILS: Record<PlanKey, PlanDetail> = {
  free: {
    label: "Evaluation",
    description: "Evaluate ChatIQ with core features and limited usage.",
    defaultPriceDisplay: "$0 / evaluation",
    messageLimit: 100,
  },
  pro: {
    label: "Pro",
    description: "Unlock higher message limits and advanced tooling.",
    defaultPriceDisplay: "$19 / month",
    messageLimit: 2000,
  },
  team: {
    label: "Team",
    description: "Collaborate with your team and scale usage confidently.",
    defaultPriceDisplay: "$49 / month",
    messageLimit: 10000,
  },
  enterprise: {
    label: "Enterprise",
    description:
      "Custom plans with dedicated support, SSO, and security reviews.",
    defaultPriceDisplay: "Custom pricing",
    messageLimit: 100000,
  },
  admin: {
    label: "Admin",
    description: "Administrator account with Team plan limits (no subscription required).",
    defaultPriceDisplay: "N/A",
    messageLimit: 100000,
  },
};

function capitalize(value: string | null | undefined) {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

type PaymentSummary = {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
};

function isDeletedStripeCustomer(
  customer: Stripe.Customer | Stripe.DeletedCustomer
): customer is Stripe.DeletedCustomer {
  return "deleted" in customer && customer.deleted === true;
}

export default async function BillingPage() {
  const headersList = await headers();
  const supabase = await createClient();
  // Dev-only override to skip Stripe sync and prevent plan auto-reset.
  const bypassStripeBilling =
    process.env.BYPASS_STRIPE_BILLING === "1" ||
    process.env.BYPASS_STRIPE_BILLING === "true";
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const teamId = await getUserTeamId(user.id);

  let plan: PlanKey = "free";
  let billingCurrency: BillingCurrency = "usd";
  let stripeCustomerId: string | null = null;
  let teamName: string | null = null;
  let isTeamOwner = false;
  let shouldUpdateCurrency = false;
  let teamCreatedAt: string | null = null;

  if (teamId) {
    const [{ data: team, error }, { data: membership }] = await Promise.all([
      supabase
        .from("bot_teams")
        .select("plan, stripe_customer_id, name, billing_currency, created_at")
        .eq("id", teamId)
        .maybeSingle(),
      supabase
        .from("bot_team_members")
        .select("role")
        .eq("team_id", teamId)
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    if (!error && team) {
      if (team.plan && PLAN_DETAILS[team.plan as PlanKey]) {
        plan = team.plan as PlanKey;
      }
      // Treat legacy bad values like 'NULL' as missing customer IDs
      if (team.stripe_customer_id && team.stripe_customer_id !== "NULL") {
        stripeCustomerId = team.stripe_customer_id;
      } else {
        stripeCustomerId = null;
      }
      teamName = team.name;
      teamCreatedAt = team.created_at ?? null;
      if (team.billing_currency === "thb" || team.billing_currency === "usd") {
        billingCurrency = team.billing_currency;
      } else {
        // Auto-detect currency if not set
        const { detectCurrencyFromHeaders } = await import("@/lib/geo/currency");
        billingCurrency = detectCurrencyFromHeaders(headersList);
        shouldUpdateCurrency = true;
      }
    }

    // Check if user is team owner
    isTeamOwner = membership?.role === "owner";
  }

  let stripeSubscription: Stripe.Subscription | null = null;
  let invoices: Stripe.Invoice[] = [];
  let paymentSummary: PaymentSummary | null = null;

  // If no stripe_customer_id, ensure plan is set to free (unless admin)
  if (
    !bypassStripeBilling &&
    !stripeCustomerId &&
    plan !== "free" &&
    plan !== "admin"
  ) {
    // Customer was deleted but plan wasn't updated - fix it
    const admin = createAdminClient();
    if (teamId) {
      await admin
        .from("bot_teams")
        .update({ plan: "free", updated_at: new Date().toISOString() })
        .eq("id", teamId);
      plan = "free";
    }
  }

  if (stripeCustomerId && !bypassStripeBilling) {
    try {
      const stripe = getStripeClient(isLiveMode());

      const [subscriptionList, invoiceList, customer] = await Promise.all([
        stripe.subscriptions.list({
          customer: stripeCustomerId,
          status: "all", // Get all subscriptions to check for canceled ones
          expand: ["data.items.data.price"],
          limit: 10,
        }),
        stripe.invoices.list({
          customer: stripeCustomerId,
          limit: 10,
        }),
        stripe.customers.retrieve(stripeCustomerId, {
          expand: ["invoice_settings.default_payment_method"],
        }),
      ]);

      // Get active subscriptions, including those that are canceled but still active until period end
      const activeSubscriptions = subscriptionList.data
        .filter((sub) => {
          // Include active, trialing subscriptions
          // Also include subscriptions that are active but scheduled to cancel
          return sub.status === "active" || sub.status === "trialing";
        })
        .sort((a, b) => (b.created ?? 0) - (a.created ?? 0));

      stripeSubscription = activeSubscriptions[0] ?? null;

      // If we have a subscription, check if billing_currency matches subscription currency
      // This handles cases where subscription was created before billing_currency was set
      if (stripeSubscription && teamId && !shouldUpdateCurrency && isTeamOwner) {
        const priceCurrency = stripeSubscription.items.data[0]?.price?.currency;
        const subscriptionCurrency = priceCurrency === "thb" ? "thb" : priceCurrency === "usd" ? "usd" : null;

        if (subscriptionCurrency && subscriptionCurrency !== billingCurrency) {
          // Subscription currency doesn't match team's billing_currency - sync it
          billingCurrency = subscriptionCurrency;
          shouldUpdateCurrency = true;
        }
      }

      // If we have a subscription, retrieve it fully to ensure we have all fields
      // including cancel_at_period_end which might not be in the list response
      if (stripeSubscription) {
        try {
          const fullSubscription = await stripe.subscriptions.retrieve(
            stripeSubscription.id,
            { expand: ["items.data.price"] }
          );
          stripeSubscription = fullSubscription;

          // Debug: Log subscription details to help troubleshoot cancellation detection
          console.log("[billing] Subscription details:", {
            id: stripeSubscription.id,
            status: stripeSubscription.status,
            cancel_at_period_end: stripeSubscription.cancel_at_period_end,
            cancel_at: stripeSubscription.cancel_at,
            current_period_end: (stripeSubscription as any).current_period_end,
            canceled_at: stripeSubscription.canceled_at,
          });
        } catch (error) {
          console.error(
            "[billing] Failed to retrieve full subscription:",
            error
          );
        }
      }
      invoices = invoiceList.data;

      if (stripeSubscription) {
        const price = stripeSubscription.items.data[0]?.price;
        if (price) {
          const planFromPrice = getPlanFromPriceId(price.id);
          if (planFromPrice && PLAN_DETAILS[planFromPrice as PlanKey]) {
            plan = planFromPrice as PlanKey;
          }
        }
      }

      if (!isDeletedStripeCustomer(customer)) {
        const paymentMethod = customer.invoice_settings?.default_payment_method;
        if (paymentMethod && typeof paymentMethod === "object") {
          if (paymentMethod.object === "payment_method" && paymentMethod.card) {
            paymentSummary = {
              brand: paymentMethod.card.brand,
              last4: paymentMethod.card.last4,
              expMonth: paymentMethod.card.exp_month,
              expYear: paymentMethod.card.exp_year,
            };
          }
        }
      }
    } catch (error) {
      console.error("Failed to load Stripe subscription details", error);
    }

    // Auto-update currency if needed (after subscription is loaded)
    if (shouldUpdateCurrency && isTeamOwner && teamId) {
      const admin = createAdminClient();
      await admin
        .from("bot_teams")
        .update({
          billing_currency: billingCurrency,
          updated_at: new Date().toISOString(),
        })
        .eq("id", teamId);
    }
  }

  const planDetail = PLAN_DETAILS[plan];
  const planId = plan as PlanId;

  let fallbackPriceDisplay = planDetail.defaultPriceDisplay;

  if (plan === "pro" || plan === "team" || plan === "admin") {
    const fallbackPrice = await fetchPlanPrice({
      plan: plan as BillingPlan,
      currency: billingCurrency,
      useLive: isLiveMode(),
    });

    fallbackPriceDisplay =
      formatPriceDisplay(fallbackPrice, {
        fallback: planDetail.defaultPriceDisplay,
      }) ?? planDetail.defaultPriceDisplay;
  }

  const stripePrice = stripeSubscription?.items.data[0]?.price ?? null;

  const priceDisplay =
    formatPriceDisplay(
      stripePrice
        ? {
            priceId: stripePrice.id,
            unitAmount: stripePrice.unit_amount ?? null,
            currency: stripePrice.currency ?? null,
            interval: stripePrice.recurring?.interval ?? null,
          }
        : null,
      { fallback: fallbackPriceDisplay }
    ) ?? fallbackPriceDisplay;

  // Calculate next billing date or cancellation date
  // A subscription is canceled if:
  // 1. cancel_at_period_end is true, OR
  // 2. cancel_at is set (timestamp when it will be canceled)
  // This means it will remain active until the period ends
  const isCanceled = Boolean(
    stripeSubscription?.cancel_at_period_end || stripeSubscription?.cancel_at
  );

  // Get the cancellation date - prefer cancel_at if set, otherwise use current_period_end
  const cancelAt = stripeSubscription?.cancel_at
    ? new Date(stripeSubscription.cancel_at * 1000)
    : (stripeSubscription as any)?.current_period_end
    ? new Date((stripeSubscription as any).current_period_end * 1000)
    : null;

  const nextBillingDate =
    isCanceled && cancelAt
      ? formatDate(cancelAt)
      : formatDate(
          stripeSubscription?.billing_cycle_anchor
            ? new Date(stripeSubscription.billing_cycle_anchor * 1000)
            : null
        ) ?? "Not scheduled";

  const subscriptionStatus =
    stripeSubscription !== null
      ? isCanceled
        ? "Canceling"
        : capitalize(stripeSubscription.status)
      : plan === "free"
      ? "Evaluation"
      : plan === "admin"
      ? "Admin"
      : "Active";

  const messageLimitDisplay =
    planDetail.messageLimit === null
      ? "Unlimited"
      : planDetail.messageLimit.toLocaleString();

  const invoicesToDisplay = invoices.sort(
    (a, b) => (b.created ?? 0) - (a.created ?? 0)
  );

  const quotaStatus =
    teamId !== null ? await getTeamQuotaStatus(teamId, planId) : null;

  const quotaEntries = quotaStatus
    ? [
        {
          key: "documents" as const,
          label: "Documents",
          helper: "Knowledge base items stored for your team",
          unit: "items",
        },
        {
          key: "messagesMonthly" as const,
          label: "AI Calls",
          helper: "AI calls processed in this billing period",
          unit: "calls",
        },
      ].map((entry) => {
        const status = quotaStatus.quotas[entry.key];
        const limitLabel =
          status.limit === null ? "Unlimited" : status.limit.toLocaleString();
        const usedLabel = status.used.toLocaleString();
        const remainingLabel =
          status.remaining === null
            ? "Unlimited"
            : status.remaining.toLocaleString();
        const progress =
          status.limit && status.limit > 0
            ? Math.min(100, Math.round((status.used / status.limit) * 100))
            : 0;

        return {
          ...entry,
          status,
          limitLabel,
          usedLabel,
          remainingLabel,
          progress,
        };
      })
    : [];

  const exceededResources = quotaEntries
    .filter((entry) => entry.status.exceeded)
    .map((entry) => entry.label);
  const reachedResources = quotaEntries
    .filter(
      (entry) =>
        !entry.status.exceeded &&
        entry.status.limit !== null &&
        entry.status.used >= entry.status.limit
    )
    .map((entry) => entry.label);
  const warningResources = quotaEntries
    .filter(
      (entry) =>
        entry.status.warning &&
        !entry.status.exceeded &&
        !(
          entry.status.limit !== null &&
          entry.status.used >= entry.status.limit
        )
    )
    .map((entry) => entry.label);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Billing &amp; Subscription</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          {teamName
            ? `Manage subscription, usage, and billing history for ${teamName}.`
            : "Manage your subscription, usage, and billing history for your team."}
        </p>
        {teamName && (
          <div className="mt-2">
            <Badge variant="outline" className="text-sm">
              {teamName}
            </Badge>
          </div>
        )}
        {!isTeamOwner && teamId && (
          <Alert className="mt-4">
            <AlertTitle>Read-only access</AlertTitle>
            <AlertDescription>
              Only team owners can manage subscriptions and billing. Contact
              your team owner to make changes.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {teamId && (
        <BillingCurrencySelector
          initialCurrency={billingCurrency}
          isTeamOwner={isTeamOwner}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Current Subscription
          </CardTitle>
          <CardDescription>{planDetail.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isCanceled && cancelAt && (
            <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
              <AlertTitle className="text-amber-900 dark:text-amber-100">
                Subscription Canceling
              </AlertTitle>
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                Your subscription will remain active until{" "}
                {formatDate(cancelAt)}. You'll continue to have access to all{" "}
                {planDetail.label} plan features until then.
              </AlertDescription>
            </Alert>
          )}
          <div
            className={`flex flex-col gap-4 rounded-lg border p-6 md:flex-row md:items-center md:justify-between ${
              isCanceled
                ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950"
                : "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950"
            }`}
          >
            <div>
              <h3
                className={`text-xl font-bold ${
                  isCanceled
                    ? "text-amber-900 dark:text-amber-100"
                    : "text-emerald-900 dark:text-emerald-100"
                }`}
              >
                {planDetail.label} Plan
              </h3>
              <p
                className={
                  isCanceled
                    ? "text-amber-700 dark:text-amber-300"
                    : "text-emerald-700 dark:text-emerald-300"
                }
              >
                {priceDisplay}
              </p>
              {(plan !== "free" && plan !== "admin") || isCanceled ? (
                <p
                  className={`text-sm mt-1 ${
                    isCanceled
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {isCanceled
                    ? `Service ends: ${nextBillingDate}`
                    : `Next billing: ${nextBillingDate}`}
                </p>
              ) : null}
            </div>
            <Badge
              className={
                isCanceled
                  ? "bg-amber-600 text-white"
                  : "bg-emerald-600 text-white"
              }
            >
              {subscriptionStatus}
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-zinc-200 p-4 text-center dark:border-zinc-700">
              <MessageSquare className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
              <p className="text-2xl font-bold">{messageLimitDisplay}</p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {planDetail.label} plan AI call allowance
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 p-4 text-center dark:border-zinc-700">
              <TrendingUp className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
              <p className="text-2xl font-bold">Usage insights</p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Detailed analytics coming soon
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 p-4 text-center dark:border-zinc-700">
              <DollarSign className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
              <p className="text-2xl font-bold">{priceDisplay}</p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Estimated monthly cost
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">
          {/* Only show billing actions to team owners */}
          {isTeamOwner ? (
            <>
              {/* Admin plan doesn't need subscription management */}
              {plan === "admin" ? (
                <p className="text-sm text-muted-foreground">
                  Admin accounts have Team plan limits and don't require a subscription.
                </p>
              ) : (
                <>
                  {/* Show upgrade options for plans higher than current */}
                  {plan === "free" && (
                <CheckoutButton
                  plan="pro"
                  currentPlan={plan}
                  currency={billingCurrency}
                >
                  Upgrade to Pro
                </CheckoutButton>
              )}
              {(plan === "free" || plan === "pro") && (
                <CheckoutButton
                  plan="team"
                  currentPlan={plan}
                  currency={billingCurrency}
                >
                  Upgrade to Team
                </CheckoutButton>
              )}
              {/* Show downgrade option for Team → Pro */}
              {plan === "team" && (
                <CheckoutButton
                  plan="pro"
                  currentPlan={plan}
                  currency={billingCurrency}
                >
                  Change Subscription To Pro
                </CheckoutButton>
              )}
              {plan !== "enterprise" && (
                <Button variant="outline" asChild>
                  <a href="https://www.chatiq.io/contact">Contact Sales (Enterprise)</a>
                </Button>
              )}
              {stripeCustomerId ? (
                <Button variant="outline" asChild>
                  <a href="/api/billing/portal">Manage Billing</a>
                </Button>
              ) : null}
              {stripeCustomerId && !isCanceled && plan !== "free" ? (
                <Button
                  variant="outline"
                  className="text-red-600 hover:text-red-700"
                  asChild
                >
                  <a href="/api/billing/portal">Cancel Subscription</a>
                </Button>
              ) : null}
              {stripeCustomerId && isCanceled && plan !== "free" ? (
                <Button
                  variant="outline"
                  className="text-emerald-600 hover:text-emerald-700"
                  asChild
                >
                  <a href="/api/billing/portal">Reactivate Subscription</a>
                </Button>
              ) : null}
                </>
              )}
            </>
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Only team owners can manage subscriptions and billing.
            </p>
          )}
        </CardFooter>
      </Card>

      {quotaEntries.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Usage &amp; Limits</CardTitle>
            <CardDescription>
              Track how your team is consuming its allocation for this plan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(exceededResources.length > 0 ||
              reachedResources.length > 0 ||
              warningResources.length > 0) && (
              <Alert
                variant={
                  exceededResources.length > 0 ? "destructive" : "default"
                }
              >
                <AlertTitle>
                  {exceededResources.length > 0
                    ? "Quota exceeded"
                    : reachedResources.length > 0
                    ? "Quota limit reached"
                    : "Approaching quota"}
                </AlertTitle>
                <AlertDescription>
                  {exceededResources.length > 0
                    ? `You've exceeded the ${exceededResources.join(
                        ", "
                      )} quota. Upgrade your plan to unlock more capacity.`
                    : reachedResources.length > 0
                    ? `You've reached the ${reachedResources.join(
                        ", "
                      )} quota. Upgrade your plan to unlock more capacity.`
                    : `You're nearing the limit for ${warningResources.join(
                        ", "
                      )}. Consider upgrading to avoid interruptions.`}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              {quotaEntries.map((entry) => (
                <div
                  key={entry.key}
                  className="rounded-lg border border-border/60 bg-muted/40 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {entry.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {entry.helper}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-semibold text-foreground">
                        {entry.usedLabel}
                        {entry.status.limit !== null
                          ? ` / ${entry.limitLabel}`
                          : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {entry.status.limit === null
                          ? "Unlimited"
                          : `${entry.remainingLabel} ${entry.unit} remaining`}
                      </p>
                    </div>
                  </div>

                  {entry.status.limit !== null ? (
                    <div className="mt-3 h-2 rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full transition-all ${
                          entry.status.exceeded
                            ? "bg-red-500"
                            : entry.status.warning ||
                              entry.status.used >= (entry.status.limit ?? 0)
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${entry.progress}%` }}
                      />
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Included in plan with no hard limit.
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="justify-end gap-2">
            {/* Only show upgrade options to team owners */}
            {isTeamOwner ? (
              <>
                {/* Only show upgrade options for plans higher than current */}
                {plan === "free" && (
                  <CheckoutButton plan="pro" currentPlan={plan}>
                    Upgrade to Pro
                  </CheckoutButton>
                )}
                {(plan === "free" || plan === "pro") && (
                  <CheckoutButton plan="team" currentPlan={plan}>
                    Upgrade to Team
                  </CheckoutButton>
                )}
                {plan !== "enterprise" && plan !== "admin" && (
                  <Button variant="outline" asChild>
                    <a href="https://www.chatiq.io/contact">Contact Sales (Enterprise)</a>
                  </Button>
                )}
              </>
            ) : (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Only team owners can upgrade plans.
              </p>
            )}
          </CardFooter>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Payment Method</CardTitle>
          <CardDescription>
            {paymentSummary
              ? "Your default payment method on file"
              : "Add a payment method to enable automatic renewals"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paymentSummary ? (
            <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
              <div>
                <p className="font-medium">
                  {paymentSummary.brand.toUpperCase()} ••••{" "}
                  {paymentSummary.last4}
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Expires {paymentSummary.expMonth.toString().padStart(2, "0")}/
                  {paymentSummary.expYear}
                </p>
              </div>
              {isTeamOwner && (
                <Button variant="outline" size="sm" asChild>
                  <a href="/dashboard/billing/payment">Update</a>
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
              No default payment method on file.
            </div>
          )}
        </CardContent>
        <CardFooter>
          {isTeamOwner ? (
            <Button variant="outline" asChild>
              <a href="/dashboard/billing/payment">Add Payment Method</a>
            </Button>
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Only team owners can manage payment methods.
            </p>
          )}
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Billing History
          </CardTitle>
          <CardDescription>
            Access receipts and invoice PDFs for your past payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invoicesToDisplay.length === 0 ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No invoices yet. Complete a checkout to generate your first
              invoice.
            </p>
          ) : (
            <div className="space-y-3">
              {invoicesToDisplay.map((invoice) => {
                const amount = formatCurrency(
                  invoice.amount_due ?? null,
                  invoice.currency ?? null
                );
                const created = formatDate(
                  invoice.created ? new Date(invoice.created * 1000) : null
                );
                return (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 dark:border-zinc-700"
                  >
                    <div>
                      <p className="font-medium">
                        {invoice.number ?? invoice.id}
                      </p>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {created ?? "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-medium">{amount ?? "—"}</p>
                        <Badge
                          variant={
                            invoice.status === "paid" ? "default" : "secondary"
                          }
                        >
                          {invoice.status
                            ? capitalize(invoice.status)
                            : "Pending"}
                        </Badge>
                      </div>
                      {invoice.hosted_invoice_url ? (
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={invoice.hosted_invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Download className="mr-2 h-4 w-4" />
                            View
                          </a>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
