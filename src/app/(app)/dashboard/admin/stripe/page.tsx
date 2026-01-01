// src/app/dashboard/admin/stripe/page.tsx
// Stripe Diagnostic Tool - Admin Only

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle, Loader2, CreditCard } from "lucide-react";
import { getStripeDiagnostics } from "@/app/actions/admin/get-stripe-diagnostics";

export default async function StripeDiagnosticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from("bot_user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin") {
    redirect("/not-authorized");
  }

  const diagnostics = await getStripeDiagnostics();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="container mx-auto px-4 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <CreditCard className="h-8 w-8" />
            Stripe Diagnostics
          </h1>
          <p className="text-muted-foreground">
            Comprehensive Stripe configuration and connectivity diagnostics
          </p>
        </div>

        {/* Environment Status */}
        <Card>
          <CardHeader>
            <CardTitle>Environment Variables</CardTitle>
            <CardDescription>
              Status of Stripe-related environment variables
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Test Mode</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <EnvVarStatus
                    name="NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
                    status={diagnostics.env.test.publishableKey}
                  />
                  <EnvVarStatus
                    name="STRIPE_SECRET_KEY"
                    status={diagnostics.env.test.secretKey}
                    masked
                  />
                  <EnvVarStatus
                    name="STRIPE_WEBHOOK_SECRET"
                    status={diagnostics.env.test.webhookSecret}
                    masked
                  />
                  <EnvVarStatus
                    name="STRIPE_PRICE_PRO_USD"
                    value={diagnostics.env.test.prices.proUsd}
                  />
                  <EnvVarStatus
                    name="STRIPE_PRICE_TEAM_USD"
                    value={diagnostics.env.test.prices.teamUsd}
                  />
                  <EnvVarStatus
                    name="STRIPE_PRICE_PRO_THB"
                    value={diagnostics.env.test.prices.proThb}
                  />
                  <EnvVarStatus
                    name="STRIPE_PRICE_TEAM_THB"
                    value={diagnostics.env.test.prices.teamThb}
                  />
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Live Mode</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <EnvVarStatus
                    name="NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE"
                    status={diagnostics.env.live.publishableKey}
                  />
                  <EnvVarStatus
                    name="STRIPE_SECRET_KEY_LIVE"
                    status={diagnostics.env.live.secretKey}
                    masked
                  />
                  <EnvVarStatus
                    name="STRIPE_WEBHOOK_SECRET_LIVE"
                    status={diagnostics.env.live.webhookSecret}
                    masked
                  />
                  <EnvVarStatus
                    name="STRIPE_PRICE_PRO_USD_LIVE"
                    value={diagnostics.env.live.prices.proUsd}
                  />
                  <EnvVarStatus
                    name="STRIPE_PRICE_TEAM_USD_LIVE"
                    value={diagnostics.env.live.prices.teamUsd}
                  />
                  <EnvVarStatus
                    name="STRIPE_PRICE_PRO_THB_LIVE"
                    value={diagnostics.env.live.prices.proThb}
                  />
                  <EnvVarStatus
                    name="STRIPE_PRICE_TEAM_THB_LIVE"
                    value={diagnostics.env.live.prices.teamThb}
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Live Mode Configured:</span>
                  {diagnostics.env.liveModeConfigured ? (
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Yes
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <XCircle className="h-3 w-3 mr-1" />
                      No
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Connectivity */}
        <Card>
          <CardHeader>
            <CardTitle>API Connectivity</CardTitle>
            <CardDescription>
              Test Stripe API connectivity for both test and live modes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <ConnectivityTest
                mode="Test"
                status={diagnostics.connectivity.test}
                error={diagnostics.connectivity.testError}
              />
              <ConnectivityTest
                mode="Live"
                status={diagnostics.connectivity.live}
                error={diagnostics.connectivity.liveError}
              />
            </div>
          </CardContent>
        </Card>

        {/* Price Validation */}
        <Card>
          <CardHeader>
            <CardTitle>Price Validation</CardTitle>
            <CardDescription>
              Verify configured price IDs exist in Stripe and retrieve their details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Test Mode Prices</h3>
                <div className="space-y-3">
                  {diagnostics.prices.test.map((price) => (
                    <PriceStatus key={price.key} price={price} />
                  ))}
                </div>
              </div>

              {diagnostics.env.liveModeConfigured && (
                <div>
                  <h3 className="font-semibold mb-3">Live Mode Prices</h3>
                  <div className="space-y-3">
                    {diagnostics.prices.live.map((price) => (
                      <PriceStatus key={price.key} price={price} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>
              Current runtime environment and mode detection
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <StatusRow
                label="Node Environment"
                value={diagnostics.system.nodeEnv}
              />
              <StatusRow
                label="Next.js Phase"
                value={diagnostics.system.nextPhase || "Not set"}
              />
              <StatusRow
                label="Is Build Time"
                value={diagnostics.system.isBuildTime ? "Yes" : "No"}
              />
              <StatusRow
                label="Current Stripe Mode"
                value={diagnostics.system.currentMode}
              />
              <StatusRow
                label="Will Use Live Mode"
                value={diagnostics.system.willUseLiveMode ? "Yes" : "No"}
              />
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function EnvVarStatus({
  name,
  status,
  value,
  masked = false,
}: {
  name: string;
  status?: boolean;
  value?: string | null;
  masked?: boolean;
}) {
  const isSet = status !== undefined ? status : !!value;
  const displayValue = masked && value ? `${value.substring(0, 12)}...` : value || undefined;

  return (
    <div className="flex items-center justify-between p-2 rounded border">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-mono truncate">{name}</div>
        {displayValue && (
          <div className="text-xs text-muted-foreground truncate">
            {displayValue}
          </div>
        )}
      </div>
      <div className="ml-2">
        {isSet ? (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        ) : (
          <XCircle className="h-5 w-5 text-red-500" />
        )}
      </div>
    </div>
  );
}

function ConnectivityTest({
  mode,
  status,
  error,
}: {
  mode: string;
  status: "success" | "error" | "not_configured";
  error?: string;
}) {
  return (
    <div className="p-4 rounded border">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold">{mode} Mode</span>
        {status === "success" && (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        )}
        {status === "error" && (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        )}
        {status === "not_configured" && (
          <Badge variant="secondary">
            <AlertCircle className="h-3 w-3 mr-1" />
            Not Configured
          </Badge>
        )}
      </div>
      {error && (
        <div className="text-sm text-destructive font-mono mt-2 p-2 bg-destructive/10 rounded">
          {error}
        </div>
      )}
    </div>
  );
}

function PriceStatus({
  price,
}: {
  price: {
    key: string;
    plan: string;
    currency: string;
    priceId: string | null;
    status: "success" | "error" | "not_configured";
    error?: string;
    details?: {
      unitAmount: number | null;
      currency: string | null;
      interval: string | null;
      active: boolean;
    };
  };
}) {
  return (
    <div className="p-4 rounded border">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="font-semibold">
            {price.plan.toUpperCase()} - {price.currency.toUpperCase()}
          </div>
          <div className="text-sm text-muted-foreground font-mono">
            {price.priceId || "Not configured"}
          </div>
        </div>
        <div>
          {price.status === "success" && (
            <Badge variant="default" className="bg-green-500">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Valid
            </Badge>
          )}
          {price.status === "error" && (
            <Badge variant="destructive">
              <XCircle className="h-3 w-3 mr-1" />
              Invalid
            </Badge>
          )}
          {price.status === "not_configured" && (
            <Badge variant="secondary">
              <AlertCircle className="h-3 w-3 mr-1" />
              Missing
            </Badge>
          )}
        </div>
      </div>

      {price.error && (
        <div className="text-sm text-destructive font-mono mt-2 p-2 bg-destructive/10 rounded">
          {price.error}
        </div>
      )}

      {price.details && (
        <div className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount:</span>
            <span className="font-mono">
              {price.details.unitAmount
                ? `$${(price.details.unitAmount / 100).toFixed(2)}`
                : "N/A"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Interval:</span>
            <span className="font-mono">
              {price.details.interval || "N/A"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Active:</span>
            <span>
              {price.details.active ? (
                <Badge variant="default" className="bg-green-500 text-xs">
                  Yes
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  No
                </Badge>
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b last:border-0">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-mono font-semibold">{value}</span>
    </div>
  );
}

