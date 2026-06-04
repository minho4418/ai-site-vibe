import type { CategoryId } from "./categories";

type Cat = Exclude<CategoryId, "all">;

// GeekNews·요즘IT 같은 종합 개발 피드에서 비(非) AI 글을 걸러내기 위한 신호.
// 이 정규식에 안 걸리면 "AI 뉴스"가 아니라고 보고 수집에서 제외한다 (feed.aiOnly === true 일 때만).
const AI_SIGNAL =
  /\b(a\.?i\.?|llm|gpt|claude|gemini|llama|mistral|deepseek|qwen|genai|rag|mcp|agent(ic)?)\b|인공지능|머신러닝|딥러닝|생성형|언어\s?모델|에이전트|챗봇|파인튜닝|임베딩|오픈ai|앤트로픽|코파일럿|바이브\s?코딩/i;

// 우선순위가 곧 분류 순서다: 공모전 > 창업 > 채용 > 개발툴 > 실무·구축 > 모델·LLM.
// (특수·구체 키워드를 먼저 잡고, 넓은 모델 키워드는 마지막 fallback 으로 둔다)
const RULES: Array<[Cat, RegExp]> = [
  [
    "Contest",
    /공모전|해커톤|\bhackathon\b|경진\s?대회|경연|챌린지|\bchallenge\b|캐글|\bkaggle\b|아이디어\s?(공모|대회)|수상작?/i,
  ],
  [
    "Startup",
    /창업|스타트업|\bstartup\b|투자\s?유치|시드\s?투자|시리즈\s?[a-d]\b|액셀러레이터|벤처\s?캐피탈|\bvc\b|유니콘|\b(funding round|seed round)\b/i,
  ],
  [
    "Career",
    /채용|연봉|취업|커리어|이직|일자리|구조조정|감원|개발자\s?수요|노동\s?시장|몸값|\b(hiring|layoffs?|recruit\w*|job market)\b/i,
  ],
  [
    "Tools",
    /\b(cursor|claude code|copilot|codex|windsurf|antigravity|kiro|vs ?code)\b|코파일럿|바이브\s?코딩|코딩\s?(어시스턴트|도구|에이전트|툴)|ai\s?코딩|코드\s?어시스턴트/i,
  ],
  [
    "Practice",
    /\b(rag|mcp|langchain|langgraph|crewai|autogen|embeddings?|vector|inference|fine-?tun\w*|on-?prem\w*)\b|에이전트|파인튜닝|임베딩|벡터\s?(db|디비|스토어)|프롬프트|파이프라인|아키텍처|프로덕션|온프레미스|도입\s?사례/i,
  ],
  [
    "LLM",
    /\b(gpt|claude|gemini|llama|mistral|deepseek|qwen|llm|sonnet|opus)\b|언어\s?모델|거대언어모델|벤치마크|파운데이션\s?모델|모델\s?(출시|공개|발표)|오픈ai|앤트로픽/i,
  ],
];

/** 종합 피드에서 AI 관련 글인지 판별. */
export function isAiRelated(text: string): boolean {
  return AI_SIGNAL.test(text);
}

/**
 * 제목+요약 텍스트로 카테고리를 추론한다.
 * 어떤 규칙에도 안 걸리면 null → 호출부에서 feed.category 를 fallback 으로 쓴다.
 */
export function classifyCategory(text: string): Cat | null {
  for (const [cat, re] of RULES) {
    if (re.test(text)) return cat;
  }
  return null;
}
