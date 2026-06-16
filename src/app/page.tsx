import { HomeClient } from "@/components/HomeClient";
import { getArticles } from "@/lib/articles";
import { getLatestBriefing } from "@/lib/briefings";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [{ articles, usingMock }, briefing] = await Promise.all([
    getArticles(),
    // 최신 오늘의 브리핑(DB). 없으면 null → 히어로 미표시.
    getLatestBriefing(),
  ]);
  return <HomeClient articles={articles} usingMock={usingMock} briefing={briefing} />;
}
