import { HomeClient } from "@/components/HomeClient";
import { getArticles } from "@/lib/articles";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { articles, usingMock } = await getArticles();
  return <HomeClient articles={articles} usingMock={usingMock} />;
}
