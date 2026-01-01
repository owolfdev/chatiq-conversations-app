// src/components/nav/components/main-nav.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Bot, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import UserMenu from "./user-menu";
import { BetaIndicator } from "./beta-indicator";

interface MainNavProps {
  user?: { name?: string } | null;
  logout?: () => void;
  isAppHost?: boolean;
}

export default function MainNav({ user, logout, isAppHost = false }: MainNavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const toAppHref = (path: string) => path;

  const siteLinks = [
    { href: "/#features", label: "Features" },
    { href: "/#pricing", label: "Pricing" },
    { href: "/#demo", label: "Demo" },
    { href: "/blog", label: "Blog" },
    { href: "/docs", label: "Docs" },
    { href: "/contact", label: "Contact" },
  ];

  const toSiteHref = (href: string) => href;

  const siteLinksForHost = siteLinks.map((link) => ({
    ...link,
    href: toSiteHref(link.href),
  }));

  const appLinks = [
    ...(pathname === "/dashboard" ? [] : [{ href: "/dashboard", label: "Dashboard" }]),
    { href: "/docs", label: "Docs" },
  ];

  const links = isAppHost
    ? user
      ? appLinks
      : [...siteLinksForHost, { href: "/dashboard", label: "Dashboard" }]
    : [...siteLinks, { href: toAppHref("/dashboard"), label: "Dashboard" }];

  return (
    <header className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto px-4">
        <nav className="flex items-center justify-between h-16">
          <div className="flex items-center w-full gap-8">
            <Link href={isAppHost ? "/dashboard" : "/"} className="flex items-center gap-2">
              <Bot className="h-6 w-6 text-emerald-500" />
              <span className="font-bold text-xl">ChatIQ</span>
              <BetaIndicator />
            </Link>
            <div className="hidden md:flex items-center space-x-8">
              {links.map(({ href, label }) => (
                <Link
                  key={label}
                  href={href}
                  className="text-muted-foreground hover:text-emerald-500 transition-colors"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <UserMenu name={user.name} />
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link href={toAppHref("/sign-in")}>Sign in</Link>
                </Button>
                <Button className="bg-emerald-500 hover:bg-emerald-600" asChild>
                  <Link href={toAppHref("/sign-up")}>
                    Sign up
                  </Link>
                </Button>
              </>
            )}
          </div>

          <button
            type="button"
            className="md:hidden text-muted-foreground hover:text-emerald-500"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </nav>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-muted border-b border-border">
          <div className="container mx-auto px-4 py-4 flex flex-col space-y-4">
            {links.map(({ href, label }) => (
              <Link
                key={label}
                href={href}
                className="text-muted-foreground hover:text-emerald-500 transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                {label}
              </Link>
            ))}
            <div className="flex flex-col space-y-2 pt-2 border-t border-border">
              {user && logout ? (
                <form action={logout}>
                  <Button
                    variant="ghost"
                    className="justify-start w-full"
                    type="submit"
                  >
                    Sign out
                  </Button>
                </form>
              ) : (
                <>
                  <Button variant="ghost" className="justify-start" asChild>
                    <Link href={toAppHref("/sign-in")}>Sign in</Link>
                  </Button>
                  <Button
                    className="bg-emerald-500 hover:bg-emerald-600"
                    asChild
                  >
                    <Link href={toAppHref("/sign-up")}>
                      Sign up
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
