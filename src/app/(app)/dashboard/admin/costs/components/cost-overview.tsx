// src/app/dashboard/admin/costs/components/cost-overview.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Activity, Zap } from "lucide-react";

interface OverviewData {
  totalCost: number;
  totalTokens: number;
  cacheHitRate: number;
  projectedMonthly: number;
  cacheHits: number;
  cacheMisses: number;
}

export function CostOverview({ data }: { data: OverviewData }) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-US").format(Math.round(num));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(data.totalCost)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {formatNumber(data.totalTokens)} tokens
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Projected Monthly</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(data.projectedMonthly)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Based on current usage
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
          <Zap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.cacheHitRate.toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground mt-1">
            {data.cacheHits} hits / {data.cacheMisses} misses
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatNumber(data.cacheHits + data.cacheMisses)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            API calls tracked
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

