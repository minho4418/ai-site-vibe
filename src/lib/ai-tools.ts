// 랭킹 카테고리 + 큐레이션 repo 목록.
// ※ GitHub 토픽 자동 검색(하이브리드)을 시도했으나, topic:mcp 에 n8n·dify·JavaGuide 등
//    무관 repo 가, agents/skills 에도 가짜별 repo 가 대거 섞여 품질이 안 나왔다.
//    → 신뢰할 수 있는 큐레이션 목록으로 운영한다. 새 repo 는 해당 카테고리에 "owner/name" 한 줄 추가.
//    (사라지거나 slug 가 틀린 repo 는 수집 시 자동으로 건너뜀)
export type CategoryKey = "skills" | "agents" | "mcp";
export type Category = { key: CategoryKey; label: string; repos: string[] };

export const CATEGORIES: Category[] = [
  {
    key: "skills",
    label: "스킬·프레임워크",
    repos: [
      "obra/superpowers",
      "anthropics/skills",
      "ComposioHQ/awesome-claude-skills",
      "addyosmani/agent-skills",
      "hesreallyhim/awesome-claude-code",
      "anthropics/claude-cookbooks",
      "getAsterisk/claudia",
    ],
  },
  {
    key: "agents",
    label: "코딩·에이전트 도구",
    repos: [
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
  },
  {
    key: "mcp",
    label: "MCP 서버",
    repos: [
      "modelcontextprotocol/servers",
      "punkpeye/awesome-mcp-servers",
      "github/github-mcp-server",
      "modelcontextprotocol/python-sdk",
      "modelcontextprotocol/typescript-sdk",
      "wong2/awesome-mcp-servers",
    ],
  },
];
