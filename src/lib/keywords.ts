import type { Article } from "./types";

// 제목에서 잡아낼 핵심 키워드 사전.
// label = 칩에 보일 문자열, re = 제목 매칭용(별칭 포함), q = 칩 클릭 시 검색에 넣을 문자열(없으면 label).
// 종합 피드라 제목만 본다(요약까지 보면 노이즈가 큼). 새 토픽이 생기면 여기에 한 줄 추가하면 된다.
type KeywordDef = { label: string; re: RegExp; q?: string };

const KEYWORD_DEFS: KeywordDef[] = [
  // ── 모델 ──
  { label: "GPT", re: /\bgpt(-?\d\w*)?\b/i },
  { label: "ChatGPT", re: /chatgpt/i },
  { label: "Claude", re: /\bclaude\b|클로드/i, q: "claude" },
  { label: "Gemini", re: /\bgemini\b|제미나이/i, q: "gemini" },
  { label: "Llama", re: /\bllama\b|라마/i, q: "llama" },
  { label: "DeepSeek", re: /deepseek|딥시크/i, q: "deepseek" },
  { label: "Qwen", re: /\bqwen\b|큐원/i, q: "qwen" },
  { label: "Mistral", re: /mistral/i },
  { label: "Grok", re: /\bgrok\b|그록/i, q: "grok" },
  { label: "Sora", re: /\bsora\b|소라/i, q: "sora" },
  // ── 기업 ──
  { label: "OpenAI", re: /open\s?ai|오픈ai/i, q: "openai" },
  { label: "Anthropic", re: /anthropic|앤트로픽/i, q: "anthropic" },
  { label: "구글", re: /\bgoogle\b|구글|딥마인드|deepmind/i, q: "구글" },
  { label: "메타", re: /\bmeta\b|메타(?!데이터|인지|버스)/i, q: "meta" },
  { label: "마이크로소프트", re: /microsoft|마이크로소프트|코파일럿|copilot/i, q: "마이크로소프트" },
  { label: "엔비디아", re: /nvidia|엔비디아/i, q: "엔비디아" },
  { label: "애플", re: /\bapple\b|애플/i, q: "애플" },
  // ── 개념·토픽 ──
  { label: "에이전트", re: /agent(ic)?|에이전트/i, q: "에이전트" },
  { label: "RAG", re: /\brag\b/i },
  { label: "MCP", re: /\bmcp\b/i },
  { label: "오픈소스", re: /오픈\s?소스|open[-\s]?source|오픈\s?웨이트/i, q: "오픈소스" },
  { label: "파인튜닝", re: /fine-?tun\w*|파인튜닝/i, q: "파인튜닝" },
  { label: "멀티모달", re: /멀티모달|multimodal/i, q: "멀티모달" },
  { label: "이미지생성", re: /이미지\s?생성|text-to-image|확산\s?모델|diffusion/i, q: "이미지" },
  { label: "영상생성", re: /영상\s?생성|동영상\s?생성|비디오\s?생성|text-to-video|\bveo\b/i, q: "영상" },
  { label: "음성AI", re: /음성|\btts\b|whisper|voice\s?ai/i, q: "음성" },
  { label: "바이브코딩", re: /바이브\s?코딩|vibe\s?coding/i, q: "바이브" },
  { label: "코딩툴", re: /\b(cursor|claude code|codex|windsurf|copilot)\b|코딩\s?(어시스턴트|도구|툴)/i, q: "코딩" },
  { label: "벤치마크", re: /벤치마크|benchmark|\bsota\b/i, q: "벤치마크" },
  { label: "논문", re: /논문|arxiv|\bpaper\b|neurips|icml|iclr/i, q: "논문" },
  { label: "로봇", re: /로봇|robot|휴머노이드|humanoid/i, q: "로봇" },
  { label: "자율주행", re: /자율\s?주행|self-?driving|autonomous/i, q: "자율주행" },
  { label: "반도체", re: /반도체|semiconductor|\bhbm\d?\b|tsmc|파운드리/i, q: "반도체" },
  { label: "GPU", re: /\bgpu\b|그래픽\s?카드/i, q: "gpu" },
  { label: "스타트업", re: /스타트업|startup/i, q: "스타트업" },
  { label: "투자", re: /투자\s?유치|시드\s?투자|시리즈\s?[a-d]\b|funding\s?round/i, q: "투자" },
  { label: "규제", re: /규제|regulation|\bai\s?act\b|저작권|copyright/i, q: "규제" },
  { label: "보안", re: /보안|security|취약점|해킹|프롬프트\s?인젝션/i, q: "보안" },
];

// re = 카운트에 쓴 바로 그 정규식. 칩 클릭 시 이 re 를 제목에 그대로 적용해야
// "보이는 숫자 = 실제로 걸러지는 카드 수"가 정확히 일치한다.
export type KeywordStat = { label: string; count: number; re: RegExp };

/**
 * 기사 목록에서 키워드별 등장 빈도를 집계해 상위 limit 개를 반환.
 * weight 를 주면 점수는 가중 합으로 정렬하되, count 는 항상 "제목에 등장한 기사 수"다.
 */
export function topKeywords(
  articles: Article[],
  opts: { limit?: number; weight?: (a: Article) => number } = {},
): KeywordStat[] {
  const { limit = 12, weight } = opts;
  const stat = new Map<string, { label: string; re: RegExp; count: number; score: number }>();

  for (const a of articles) {
    const text = a.title;
    const w = weight ? weight(a) : 1;
    for (const def of KEYWORD_DEFS) {
      if (!def.re.test(text)) continue;
      const cur = stat.get(def.label) ?? { label: def.label, re: def.re, count: 0, score: 0 };
      cur.count += 1;
      cur.score += w;
      stat.set(def.label, cur);
    }
  }

  return [...stat.values()]
    .sort((a, b) => b.score - a.score || b.count - a.count)
    .slice(0, limit)
    .map(({ label, re, count }) => ({ label, re, count }));
}
