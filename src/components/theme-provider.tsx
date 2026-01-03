// src/components/theme-provider.tsx
"use client";

import { ThemeProvider } from "next-themes";

export { useTheme } from "next-themes";

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
