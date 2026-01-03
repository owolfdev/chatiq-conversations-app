// src/components/nav/footer.tsx
import {
  Bot,
  Facebook,
  Github,
  Instagram,
  Linkedin,
  Twitter,
  X,
} from "lucide-react";
import Link from "next/link";
import { headers } from "next/headers";
import { ModeToggle } from "./mode-toggle";
import { navLinks } from "./constants/nav-links";
// Removed faulty import of XLogo
import { XLogo } from "@/components/icons/XLogo";

export default async function Footer() {
  const headersList = await headers();
  const host = headersList.get("host") ?? "";
  const isAppHost = host.startsWith("app.") || host.startsWith("inbox.");

  const toSiteHref = (href: string) => href;
  const toAppHref = (href: string) => href;

  const socialLinks = [
    {
      icon: <XLogo className="h-4 w-4" />,
      href: "https://x.com/Chatiqhq",
      label: "X",
    },
    // {
    //   icon: <Facebook className="h-4 w-4" />,
    //   href: "https://facebook.com",
    //   label: "Facebook",
    // },
    // {
    //   icon: <Instagram className="h-4 w-4" />,
    //   href: "https://instagram.com",
    //   label: "Instagram",
    // },
    {
      icon: <Linkedin className="h-4 w-4" />,
      href: "https://www.linkedin.com/company/chatiqhq",
      label: "LinkedIn",
    },
    // {
    //   icon: <Github className="h-4 w-4" />,
    //   href: "https://github.com",
    //   label: "GitHub",
    // },
  ];

  const productLinks = navLinks.filter((link) =>
    ["Features", "Pricing", "Demo"].includes(link.label)
  );

  const resourceLinks = navLinks.filter((link) =>
    ["Docs", "Blog", "Contact"].includes(link.label)
  );

  const legalLinks = [
    { href: "/legal/terms", label: "Terms of Service" },
    { href: "/legal/privacy", label: "Privacy Policy" },
    { href: "/legal/security", label: "Security" },
  ];

  return (
    <footer className="bg-muted/40 dark:bg-muted/30 border-t border-border">
      <div className="container mx-auto flex flex-col gap-10 px-6 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Bot className="h-6 w-6 text-emerald-500" />
              <span className="text-lg font-semibold tracking-tight">
                ChatIQ Inbox
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Build reliable AI chatbots powered by your team’s knowledge.
              Secure multi-tenant architecture, instant document ingestion, and
              guided analytics out of the box.
            </p>
            <div className="flex items-center gap-3">
              {socialLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  aria-label={link.label}
                  className="text-muted-foreground transition-colors hover:text-emerald-500"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {link.icon}
                </Link>
              ))}
            </div>
          </div>

          <div className="space-y-3 text-sm text-right md:text-right">
            <span className="text-sm font-semibold uppercase tracking-wide text-foreground">
              Product
            </span>
            <div className="flex flex-col gap-2 text-muted-foreground pt-2">
              <Link
                href={toSiteHref("/product")}
                className="transition-colors hover:text-emerald-500"
              >
                How it works
              </Link>
              {productLinks.map((link) => (
                <Link
                  key={link.href}
                  href={toSiteHref(link.href)}
                  className="transition-colors hover:text-emerald-500"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="space-y-3 text-sm text-right md:text-right">
            <span className="text-sm font-semibold uppercase tracking-wide text-foreground">
              Resources
            </span>
            <div className="flex flex-col gap-2 text-muted-foreground pt-2">
              {resourceLinks.map((link) => (
                <Link
                  key={link.href}
                  href={toSiteHref(link.href)}
                  className="transition-colors hover:text-emerald-500"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href={toAppHref("/conversations")}
                className="transition-colors hover:text-emerald-500"
              >
                Conversations
              </Link>
            </div>
          </div>

          <div className="space-y-3 text-sm text-right md:text-right">
            <span className="text-sm font-semibold uppercase tracking-wide text-foreground md:text-right">
              Legal &amp; Preferences
            </span>
            <div className="flex flex-col gap-2 text-muted-foreground pt-2 md:items-end">
              {legalLinks.map((link) => (
                <Link
                  key={link.href}
                  href={toSiteHref(link.href)}
                  className="transition-colors hover:text-emerald-500 md:text-right"
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="pt-2 md:flex md:justify-end">
              <ModeToggle />
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-border pt-6 text-sm text-muted-foreground md:flex-row">
          <span>© {new Date().getFullYear()} ChatIQ Inbox. All rights reserved.</span>
          <span>Made with care in distributed workspaces worldwide.</span>
        </div>
      </div>
    </footer>
  );
}
