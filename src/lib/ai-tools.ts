// 랭킹 소스 = "검색 ∩ awesome-list 멤버십" 하이브리드.
//  핵심: GitHub 검색이 '별순 정렬'을 효율적으로 주고, 사람이 큐레이션한 awesome-list 멤버십이
//        스팸·무관 repo(JavaGuide·n8n·Ansible 등)를 걸러낸다. 둘의 교집합 = 깨끗 + 포괄.
//  - seeds: 검색/리스트에 안 걸려도 항상 포함을 보장하는 핵심 repo
//  - awesomeLists: README 를 파싱해 멤버십 집합으로 쓸 큐레이션 리스트("owner/repo")
//  - queries: 별순 후보를 끌어올 검색어(멤버십과 교차됨)
//  - minStars: 후보 최소 별
export type CategoryKey = "skills" | "agents" | "mcp";
export type Category = {
  key: CategoryKey;
  label: string;
  seeds: string[];
  awesomeLists: string[];
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
    ],
    awesomeLists: [
      "ComposioHQ/awesome-claude-skills",
      "VoltAgent/awesome-claude-code-subagents",
      "VoltAgent/awesome-agent-skills",
      "travisvn/awesome-claude-skills",
      "hesreallyhim/awesome-claude-code",
    ],
    queries: ["claude skill in:name,description,topics", "agent skills in:name,description"],
    minStars: 300,
  },
  {
    key: "agents",
    label: "코딩·에이전트 도구",
    seeds: [
      "cline/cline",
      "Aider-AI/aider",
      "OpenHands/OpenHands",
      "aaif-goose/goose",
      "TabbyML/tabby",
      "openai/codex",
      "google-gemini/gemini-cli",
      "anthropics/claude-code",
      "stackblitz/bolt.new",
      "opencode-ai/opencode",
      "plandex-ai/plandex",
      "kilo-org/kilocode",
      "manaflow-ai/cmux",
      "smtg-ai/claude-squad",
      "charmbracelet/crush",
      "QwenLM/qwen-code",
      "SWE-agent/SWE-agent",
    ],
    awesomeLists: [
      "e2b-dev/awesome-ai-agents",
      "Jenqyang/Awesome-AI-Agents",
      "slavakurilyak/awesome-ai-agents",
      "ai-for-developers/awesome-ai-coding-tools",
      "filipecalegario/awesome-vibe-coding",
    ],
    queries: ["coding agent in:name,description", "ai code editor in:name,description"],
    minStars: 1000,
  },
  {
    key: "mcp",
    label: "MCP 서버",
    seeds: [
      "modelcontextprotocol/servers",
      "github/github-mcp-server",
      "punkpeye/awesome-mcp-servers",
    ],
    awesomeLists: [
      "punkpeye/awesome-mcp-servers",
      "wong2/awesome-mcp-servers",
      "appcypher/awesome-mcp-servers",
    ],
    queries: ["mcp in:name,description,topics"],
    minStars: 200,
  },
];

// 멤버십 안에 있어도 가짜별·오태깅이면 차단(소문자 "owner/name").
export const BLOCKLIST: string[] = [
  "affaan-m/ecc",
  "ultraworkers/claw-code",
  "multica-ai/andrej-karpathy-skills",
  "juliusbrussee/caveman",
  "nexu-io/open-design",
  "farion1231/cc-switch",
  "x1xhlol/system-prompts-and-models-of-ai-tools",
];

// awesome-list README 파싱 시 repo 가 아닌 경로(이미지·문서 등) 제외용 first-segment.
export const NON_REPO_OWNERS = new Set([
  "user-attachments",
  "sponsors",
  "marketplace",
  "features",
  "topics",
  "about",
  "pricing",
  "security",
  "login",
  "join",
  "settings",
  "notifications",
  "site",
  "contact",
  "readme",
  "search",
]);
