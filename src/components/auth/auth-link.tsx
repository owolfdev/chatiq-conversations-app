"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getUser } from "@/app/actions/auth/get-user";
import { Button } from "@/components/ui/button";

export function AuthLink({ children }: { children: React.ReactNode }) {
  const [href, setHref] = useState("/sign-in");

  useEffect(() => {
    getUser().then((user) => {
      if (user) setHref("/conversations");
    });
  }, []);

  return (
    <Link href={href}>
      <Button
        size="lg"
        variant="outline"
        className="border-emerald-500 text-emerald-500 hover:bg-emerald-950"
      >
        {children}
      </Button>
    </Link>
  );
}
