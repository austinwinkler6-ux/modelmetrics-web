import SportPageContent from "@/components/SportPageContent";
import { SPORT_KEYS } from "@/lib/sportConstants";

// Real, required for a real static export — tells Next.js to pre-
// build one real, separate static page per real sport at BUILD time
// (e.g. /mlb, /nba-points, /lol), rather than trying to handle an
// arbitrary real URL at request time, which a static export can't do.
export function generateStaticParams() {
  return SPORT_KEYS.map((sport) => ({ sport }));
}

export default async function SportPage({ params }: { params: Promise<{ sport: string }> }) {
  const { sport } = await params;
  return <SportPageContent sportKey={sport} />;
}
