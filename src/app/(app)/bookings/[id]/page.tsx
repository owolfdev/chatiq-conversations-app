import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { BookingDetailView } from "@/components/bookings/detail";

export const metadata: Metadata = {
  title: "Booking",
};

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/sign-in?redirect=/bookings");
  }

  const { id } = await params;

  return <BookingDetailView bookingId={id} />;
}
