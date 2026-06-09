import type { CategoryId } from "./categories";

type Cat = Exclude<CategoryId, "all">;

// GeekNews·요즘IT 같은 종합 개발 피드에서 비(非) AI 글을 걸러내기 위한 신호.
// 이 정규식에 안 걸리면 "AI 뉴스"가 아니라고 보고 수집에서 제외한다 (feed.aiOnly === true 일 때만).
const AI_SIGNAL =
  /\b(a\.?i\.?|llm|gpt|claude|gemini|llama|mistral|deepseek|qwen|genai|rag|mcp|agent(ic)?)\b|인공지능|머신러닝|딥러닝|생성형|언어\s?모델|에이전트|챗봇|파인튜닝|임베딩|오픈ai|앤트로픽|코파일럿|바이브\s?코딩/i;

// 우선순위가 곧 분류 순서다(위에서부터 먼저 매칭): 공모전 > 창업 > 채용 > 인프라·HW >
// 개발툴 > 오픈소스 > 연구·논문 > 실무·구축 > 모델·LLM.
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
  // 인프라·HW: GPU/반도체/데이터센터/추론비용. 모델·실무 키워드보다 먼저 잡아야 "엔비디아 H200" 류가 LLM 으로 안 샌다.
  [
    "Infra",
    /\b(gpu|tpu|npu|cuda|hbm\d?|h100|h200|gb200|b200|blackwell|asic|tsmc)\b|엔비디아|\bnvidia\b|반도체|그래픽\s?카드|데이터\s?센터|\bdata\s?center\b|추론\s?비용|파운드리|전력\s?(소비|효율)/i,
  ],
  [
    "Tools",
    /\b(cursor|claude code|copilot|codex|windsurf|antigravity|kiro|vs ?code)\b|코파일럿|바이브\s?코딩|코딩\s?(어시스턴트|도구|에이전트|툴)|ai\s?코딩|코드\s?어시스턴트/i,
  ],
  // 오픈소스: 명시적 OSS 신호(오픈소스/오픈웨이트/깃허브/허깅페이스/라이선스)만 잡아 일반 모델뉴스(LLM)를 안 훔치게 한다.
  [
    "OpenSource",
    /오픈\s?소스|오픈\s?웨이트|\bopen[-\s]?(source|weights?)\b|\bgithub\b|깃허브|허깅\s?페이스|\bhugging\s?face\b|공개\s?(모델|가중치|소스코드)|오픈\s?모델|아파치\s?라이선스|\bapache\s?license\b/i,
  ],
  // 연구·논문: 논문/학회/연구성과 신호. '연구' 단독은 과매칭이라 뒤 접미사·복합어로만 매칭.
  [
    "Research",
    /\b(arxiv|sota|neurips|icml|iclr|cvpr|acl|emnlp|state-of-the-art)\b|논문|연구\s?(진|팀|결과|성과|소)|연구\s?개발|학회|네이처지|사이언스지/i,
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
