// src/app/dashboard/admin/costs/components/cache-metrics.tsx
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface CacheData {
  hitRate: number;
  hits: number;
  misses: number;
  costSavings: number;
}

export function CacheMetrics({ data }: { data: CacheData }) {
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Cache Hit Rate</CardTitle>
          <CardDescription>Percentage of requests served from cache</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{data.hitRate.toFixed(1)}%</div>
          <p className="text-sm text-muted-foreground mt-2">
            {formatNumber(data.hits)} hits / {formatNumber(data.misses)} misses
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cost Savings</CardTitle>
          <CardDescription>Estimated savings from cache hits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-600">
            {formatCurrency(data.costSavings)}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Avoided OpenAI API costs
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cache Efficiency</CardTitle>
          <CardDescription>Cache performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Requests:</span>
              <span className="text-sm font-medium">
                {formatNumber(data.hits + data.misses)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Cache Hits:</span>
              <span className="text-sm font-medium text-green-600">
                {formatNumber(data.hits)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Cache Misses:</span>
              <span className="text-sm font-medium text-orange-600">
                {formatNumber(data.misses)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

