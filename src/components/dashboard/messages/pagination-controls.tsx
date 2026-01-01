// src/components/dashboard/pagination-controls.tsx
"use client";

import { Button } from "@/components/ui/button";

export function PaginationControls({
  page,
  onPageChange,
  hasNext,
}: {
  page: number;
  onPageChange: (newPage: number) => void;
  hasNext: boolean;
}) {
  if (page === 1 && !hasNext) return null;

  return (
    <div className="flex justify-between pt-4">
      <Button
        variant="ghost"
        size="sm"
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={!hasNext}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </Button>
    </div>
  );
}
