import { getUserBotsWithCounts } from "@/app/actions/bots/get-user-bots-with-counts";
import BotsGallery from "./bots-gallery";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bots",
};

export default async function BotsPage() {
  const { team, personal } = await getUserBotsWithCounts();

  return (
    <BotsGallery
      teamName={team.name}
      teamBots={team.bots}
      personalBots={personal.bots}
    />
  );
}
