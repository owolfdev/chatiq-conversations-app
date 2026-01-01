// src/app/dashboard/admin/costs/cost-dashboard-client.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
} from "lucide-react";
import { getCostData } from "./actions";
import { CostOverview } from "./components/cost-overview";
import { CostChart } from "./components/cost-chart";
import { CostBreakdown } from "./components/cost-breakdown";
import { CacheMetrics } from "./components/cache-metrics";
import { ModelUsage } from "./components/model-usage";
import { PricingManager } from "./components/pricing-manager";

export function CostDashboardClient() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d">("7d");

  useEffect(() => {
    loadData();
    // Refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [timeRange]);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await getCostData({ timeRange });
      setData(result);
    } catch (error) {
      console.error("Failed to load cost data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Failed to load cost data.</p>
        </CardContent>
      </Card>
    );
  }

  // Show error message if table doesn't exist
  if ((data as any).error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Setup Required</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">{(data as any).error}</p>
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm font-mono">supabase db push</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-end">
        <Tabs
          value={timeRange}
          onValueChange={(v) => setTimeRange(v as "24h" | "7d" | "30d")}
        >
          <TabsList>
            <TabsTrigger value="24h">24 Hours</TabsTrigger>
            <TabsTrigger value="7d">7 Days</TabsTrigger>
            <TabsTrigger value="30d">30 Days</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Overview Cards */}
      <CostOverview data={data.overview} />

      {/* Main Content Tabs */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Cost Trends</TabsTrigger>
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
          <TabsTrigger value="cache">Cache Performance</TabsTrigger>
          <TabsTrigger value="models">Model Usage</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <CostChart data={data.trends} timeRange={timeRange} />
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-4">
          <CostBreakdown data={data.breakdown} />
        </TabsContent>

        <TabsContent value="cache" className="space-y-4">
          <CacheMetrics data={data.cache} />
        </TabsContent>

        <TabsContent value="models" className="space-y-4">
          <ModelUsage data={data.models} />
        </TabsContent>

        <TabsContent value="pricing" className="space-y-4">
          <PricingManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
