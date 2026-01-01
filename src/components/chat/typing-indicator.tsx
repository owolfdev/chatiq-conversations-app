// src/components/chat/TypingIndicator.tsx
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type TypingIndicatorVariant = "pill" | "inline";

interface TypingIndicatorProps {
  variant?: TypingIndicatorVariant;
  className?: string;
}

export function TypingIndicator({
  variant = "pill",
  className,
}: TypingIndicatorProps) {
  const wrapperClass =
    variant === "pill"
      ? "flex items-center gap-1 px-2 py-2 pt-3 rounded-xl bg-zinc-100 dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 shadow w-fit"
      : "flex items-center gap-1 text-current py-0.5";

  const dotClass =
    variant === "pill"
      ? "w-2 h-2 bg-zinc-700 dark:bg-white rounded-full"
      : "w-1.5 h-1.5 bg-current/70 rounded-full";

  return (
    <div className={cn(wrapperClass, className)}>
      <motion.span
        className={dotClass}
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
      />
      <motion.span
        className={dotClass}
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
      />
      <motion.span
        className={dotClass}
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
      />
    </div>
  );
}
