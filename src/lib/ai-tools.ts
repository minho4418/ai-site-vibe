// 랭킹 소스 = 하이브리드(카테고리별 전략).
//  - seeds: 항상 포함을 보장하는 큐레이션 repo
//  - queries: GitHub 이름/설명 검색으로 자동 발굴할 쿼리(목록 밖 새 repo도 잡힘). 빈 배열이면 자동 OFF.
//  - minStars: 검색 결과 최소 별(소형 정크 컷)
//  실측 결과: MCP 는 "mcp in:name" 검색이 깨끗(playwright-mcp 등)해서 자동 ON.
//            스킬은 자동+블록리스트로 운영. 에이전트는 깨끗한 자동 신호가 없어(ansible 등 오검출) 큐레이션만.
//  BLOCKLIST: 가짜별(star-farming)·오태깅으로 상위를 더럽히는 repo 차단.
export type CategoryKey = "skills" | "agents" | "mcp";
export type Category = {
  key: CategoryKey;
  label: string;
  seeds: string[];
  queries: string[];
  minStars: number;
};

export const CATEGORIES: Category[] = [
  {
    key: "skills",
    label: "스킬·프레임워크",
    seeds: [
      "obra/superpowers",
      "anthropics/skills",
      "ComposioHQ/awesome-claude-skills",
      "addyosmani/agent-skills",
      "hesreallyhim/awesome-claude-code",
      "anthropics/claude-cookbooks",
      "getAsterisk/claudia",
    ],
    queries: ["claude skill in:name,description", "agent skills in:name,description"],
    minStars: 5000,
  },
  {
    key: "agents",
    label: "코딩·에이전트 도구",
    seeds: [
      "cline/cline",
      "RooCodeInc/Roo-Code",
      "Aider-AI/aider",
      "continuedev/continue",
      "All-Hands-AI/OpenHands",
      "OpenInterpreter/open-interpreter",
      "block/goose",
      "TabbyML/tabby",
      "openai/codex",
      "google-gemini/gemini-cli",
      "sst/opencode",
      "anthropics/claude-code",
      "getcursor/cursor",
      "voideditor/void",
      "stackblitz/bolt.new",
      "gpt-engineer-org/gpt-engineer",
      "Pythagora-io/gpt-pilot",
      "plandex-ai/plandex",
      "kilo-org/kilocode",
    ],
    queries: [], // 자동 검색은 ansible 등 오검출이 심해 끔 — 큐레이션만.
    minStars: 0,
  },
  {
    key: "mcp",
    label: "MCP 서버",
    seeds: [
      "modelcontextprotocol/servers",
      "github/github-mcp-server",
      "punkpeye/awesome-mcp-servers",
    ],
    queries: ["mcp in:name", "mcp server in:name,description"],
    minStars: 800,
  },
];

// 가짜별·오태깅 repo 차단(소문자 "owner/name").
export const BLOCKLIST: string[] = [
  "affaan-m/ecc",
  "ultraworkers/claw-code",
  "multica-ai/andrej-karpathy-skills",
  "juliusbrussee/caveman",
  "nexu-io/open-design",
  "farion1231/cc-switch",
  "nousresearch/hermes-agent",
  "egonex-ai/understand-anything",
  "nextlevelbuilder/ui-ux-pro-max-skill",
  "code-yeongyu/oh-my-openagent",
  "x1xhlol/system-prompts-and-models-of-ai-tools",
  "voltagent/awesome-design-md",
  "voltagent/awesome-openclaw-skills",
  "shareai-lab/learn-claude-code",
  "ansible/ansible",
  "thedotmack/claude-mem",
];
