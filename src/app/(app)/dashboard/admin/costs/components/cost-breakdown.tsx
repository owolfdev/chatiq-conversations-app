// src/app/dashboard/admin/costs/components/cost-breakdown.tsx
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface BreakdownData {
  teams: Array<{ team_id: string; cost_usd: number; total_tokens: number }>;
  bots: Array<{ bot_id: string; cost_usd: number; total_tokens: number }>;
}

export function CostBreakdown({ data }: { data: BreakdownData }) {
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

  // Aggregate and sort teams
  const teamAggregated = data.teams.reduce((acc, row) => {
    const id = row.team_id;
    if (!acc[id]) {
      acc[id] = { team_id: id, cost_usd: 0, total_tokens: 0 };
    }
    acc[id].cost_usd += Number(row.cost_usd || 0);
    acc[id].total_tokens += Number(row.total_tokens || 0);
    return acc;
  }, {} as Record<string, { team_id: string; cost_usd: number; total_tokens: number }>);

  const topTeams = Object.values(teamAggregated)
    .sort((a, b) => b.cost_usd - a.cost_usd)
    .slice(0, 10);

  // Aggregate and sort bots
  const botAggregated = data.bots.reduce((acc, row) => {
    const id = row.bot_id;
    if (!acc[id]) {
      acc[id] = { bot_id: id, cost_usd: 0, total_tokens: 0 };
    }
    acc[id].cost_usd += Number(row.cost_usd || 0);
    acc[id].total_tokens += Number(row.total_tokens || 0);
    return acc;
  }, {} as Record<string, { bot_id: string; cost_usd: number; total_tokens: number }>);

  const topBots = Object.values(botAggregated)
    .sort((a, b) => b.cost_usd - a.cost_usd)
    .slice(0, 10);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Top Teams by Cost</CardTitle>
          <CardDescription>Highest spending teams</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team ID</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Tokens</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topTeams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No data available
                  </TableCell>
                </TableRow>
              ) : (
                topTeams.map((team) => (
                  <TableRow key={team.team_id}>
                    <TableCell className="font-mono text-xs">
                      {team.team_id.substring(0, 8)}...
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(team.cost_usd)}</TableCell>
                    <TableCell className="text-right">{formatNumber(team.total_tokens)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Bots by Cost</CardTitle>
          <CardDescription>Highest spending bots</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bot ID</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Tokens</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topBots.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No data available
                  </TableCell>
                </TableRow>
              ) : (
                topBots.map((bot) => (
                  <TableRow key={bot.bot_id}>
                    <TableCell className="font-mono text-xs">
                      {bot.bot_id.substring(0, 8)}...
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(bot.cost_usd)}</TableCell>
                    <TableCell className="text-right">{formatNumber(bot.total_tokens)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

