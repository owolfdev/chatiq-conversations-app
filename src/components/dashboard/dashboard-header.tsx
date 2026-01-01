"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { TeamSwitcher } from "@/components/dashboard/team-switcher";
import { BetaIndicator } from "@/components/nav/components/beta-indicator";
import { TrialHeaderIndicatorClient } from "@/components/dashboard/trial-header-indicator-client";

// Map route segments to friendly names
const routeLabels: Record<string, string> = {
  dashboard: "Dashboard",
  bots: "My Bots",
  documents: "Documents",
  conversations: "Conversations",
  "api-keys": "API Keys",
  analytics: "Analytics",
  billing: "Billing",
  settings: "Settings",
  admin: "Admin Panel",
  team: "Team",
  new: "Create",
  edit: "Edit",
  messages: "Messages",
};

// Special labels for specific routes
const specialLabels: Record<string, string> = {
  "/dashboard/bots/new": "Create Bot",
  "/dashboard/documents/new": "Create Document",
};

export function DashboardHeader() {
  const pathname = usePathname();

  // Generate breadcrumbs from pathname
  const generateBreadcrumbs = () => {
    if (!pathname) return [];

    // Check for special labels first
    if (specialLabels[pathname]) {
      return [
        { label: "Dashboard", href: "/dashboard" },
        { label: specialLabels[pathname], href: pathname },
      ];
    }

    const segments = pathname.split("/").filter(Boolean);
    const breadcrumbs: { label: string; href: string }[] = [];

    // Always start with Dashboard
    if (segments.length > 0 && segments[0] === "dashboard") {
      breadcrumbs.push({ label: "Dashboard", href: "/dashboard" });

      // Build up path progressively
      let currentPath = "/dashboard";

      for (let i = 1; i < segments.length; i++) {
        const segment = segments[i];
        currentPath += `/${segment}`;

        // Skip dynamic segments (UUIDs, slugs) or show them as-is
        const isDynamicSegment =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            segment
          ) || segment.length > 20; // Likely a slug or dynamic ID

        let label: string;
        if (isDynamicSegment) {
          // For dynamic segments, use a generic label or the segment itself
          // You could enhance this by fetching the actual name
          const parent = segments[i - 1];
          if (parent === "bots" || parent === "edit") {
            label = "Bot";
          } else if (parent === "documents") {
            label = "Document";
          } else if (parent === "messages") {
            label = "Message";
          } else {
            label = segment.substring(0, 8) + "...";
          }
        } else {
          label =
            routeLabels[segment] ||
            segment.charAt(0).toUpperCase() +
              segment.slice(1).replace(/-/g, " ");
        }

        breadcrumbs.push({ label, href: currentPath });
      }

      // If we're on the dashboard root, show "Overview"
      if (breadcrumbs.length === 1) {
        breadcrumbs.push({ label: "Overview", href: "/dashboard" });
      }
    }

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/80">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <div className="flex flex-1 items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1;

                return (
                  <React.Fragment key={`${crumb.href}-${index}`}>
                    {index > 0 && (
                      <BreadcrumbSeparator className="hidden sm:block" />
                    )}
                    <BreadcrumbItem
                      className={index === 0 ? "hidden md:block" : ""}
                    >
                      {isLast ? (
                        <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link href={crumb.href}>{crumb.label}</Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </React.Fragment>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
          <BetaIndicator />
        </div>
        <div className="flex items-center gap-3">
          <TrialHeaderIndicatorClient />
          <TeamSwitcher />
        </div>
      </div>
    </header>
  );
}
