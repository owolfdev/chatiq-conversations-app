import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { BookingsList } from "@/components/bookings/list";

export const metadata: Metadata = {
  title: "Bookings",
};

export default async function BookingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/sign-in?redirect=/bookings");
  }

  return <BookingsList />;
}
