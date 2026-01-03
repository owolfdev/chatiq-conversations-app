import Link from "next/link";

const resources = [
  { href: "https://www.chatiq.io/docs", label: "Docs" },
  { href: "https://www.chatiq.io/blog", label: "Blog" },
  { href: "https://www.chatiq.io/contact", label: "Support" },
];

export default function AppFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container mx-auto flex flex-col gap-3 px-6 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>© {new Date().getFullYear()} ChatIQ Inbox</span>
        <nav className="flex flex-wrap items-center gap-4">
          {resources.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="transition-colors hover:text-emerald-500"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
