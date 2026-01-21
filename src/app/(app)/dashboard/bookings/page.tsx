import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bookings",
};

export default async function DashboardBookingsPage() {
  redirect("/bookings");
}
