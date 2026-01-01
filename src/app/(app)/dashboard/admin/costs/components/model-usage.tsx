// src/app/dashboard/admin/costs/components/model-usage.tsx
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ModelData {
  model: string;
  cost_usd: number;
  total_tokens: number;
  cost_type: string;
}

export function ModelUsage({ data }: { data: ModelData[] }) {
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

  // Aggregate by model
  const modelAggregated = data.reduce((acc, row) => {
    const model = row.model;
    if (!acc[model]) {
      acc[model] = { model, cost_usd: 0, total_tokens: 0, cost_type: row.cost_type };
    }
    acc[model].cost_usd += Number(row.cost_usd || 0);
    acc[model].total_tokens += Number(row.total_tokens || 0);
    return acc;
  }, {} as Record<string, { model: string; cost_usd: number; total_tokens: number; cost_type: string }>);

  const models = Object.values(modelAggregated).sort((a, b) => b.cost_usd - a.cost_usd);

  const totalCost = models.reduce((sum, m) => sum + m.cost_usd, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Model Usage Breakdown</CardTitle>
        <CardDescription>
          Cost and token usage by OpenAI model
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Model</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Tokens</TableHead>
              <TableHead className="text-right">% of Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {models.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No data available
                </TableCell>
              </TableRow>
            ) : (
              models.map((model) => (
                <TableRow key={model.model}>
                  <TableCell className="font-medium">{model.model}</TableCell>
                  <TableCell>
                    <span className="text-xs px-2 py-1 rounded bg-muted">
                      {model.cost_type}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(model.cost_usd)}</TableCell>
                  <TableCell className="text-right">{formatNumber(model.total_tokens)}</TableCell>
                  <TableCell className="text-right">
                    {totalCost > 0 ? ((model.cost_usd / totalCost) * 100).toFixed(1) : 0}%
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

