// src/app/dashboard/bots/[slug]/edit/page.tsx
import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function LegacyEditRedirect({ params }: Props) {
  const { slug } = await params;
  redirect(`/dashboard/bots/${slug}/settings`);
}
