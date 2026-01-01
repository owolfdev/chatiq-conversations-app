// src/app/dashboard/admin/costs/components/cost-chart.tsx
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface TrendData {
  timestamp?: string;
  cost_usd?: number;
}

export function CostChart({
  data,
  timeRange,
}: {
  data: TrendData[];
  timeRange: "24h" | "7d" | "30d";
}) {
  // Simple chart placeholder - you can integrate a charting library like recharts
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost Trends</CardTitle>
        <CardDescription>
          Cost over time ({timeRange === "24h" ? "Hourly" : "Daily"} view)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 flex items-center justify-center border rounded-lg bg-muted/50">
          <p className="text-muted-foreground">
            Chart visualization coming soon. Data available: {data.length} data points
          </p>
          {/* TODO: Integrate recharts or similar for visualization */}
        </div>
      </CardContent>
    </Card>
  );
}

