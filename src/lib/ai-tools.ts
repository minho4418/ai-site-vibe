// 랭킹에 올릴 AI 코딩·에이전트 도구 큐레이션 목록.
// repo = "owner/name" (GitHub). 새 도구는 여기에 한 줄 추가하면 된다.
// slug 가 틀리거나 사라진 repo 는 수집 시 자동으로 건너뛴다(404 → 목록에서 제외).
export type AiTool = { repo: string; label: string; blurb: string };

export const AI_TOOLS: AiTool[] = [
  { repo: "cline/cline", label: "Cline", blurb: "VS Code 자율 코딩 에이전트" },
  { repo: "RooCodeInc/Roo-Code", label: "Roo Code", blurb: "Cline 기반 멀티모드 코딩 에이전트" },
  { repo: "Aider-AI/aider", label: "Aider", blurb: "터미널에서 페어 프로그래밍하는 AI" },
  { repo: "continuedev/continue", label: "Continue", blurb: "IDE용 오픈소스 AI 코드 어시스턴트" },
  { repo: "All-Hands-AI/OpenHands", label: "OpenHands", blurb: "자율 소프트웨어 개발 에이전트" },
  { repo: "block/goose", label: "Goose", blurb: "로컬에서 도는 온디바이스 코딩 에이전트" },
  { repo: "TabbyML/tabby", label: "Tabby", blurb: "셀프호스팅 코드 자동완성" },
  { repo: "openai/codex", label: "Codex CLI", blurb: "OpenAI의 터미널 코딩 에이전트" },
  { repo: "google-gemini/gemini-cli", label: "Gemini CLI", blurb: "Google Gemini 터미널 에이전트" },
  { repo: "sst/opencode", label: "opencode", blurb: "터미널용 오픈소스 AI 코딩 에이전트" },
  { repo: "anthropics/claude-code", label: "Claude Code", blurb: "Anthropic 터미널 코딩 에이전트" },
  { repo: "getcursor/cursor", label: "Cursor", blurb: "AI 네이티브 코드 에디터" },
  { repo: "voideditor/void", label: "Void", blurb: "오픈소스 AI 코드 에디터(Cursor 대안)" },
  { repo: "stackblitz/bolt.new", label: "bolt.new", blurb: "브라우저에서 풀스택 앱을 만드는 AI" },
  { repo: "gpt-engineer-org/gpt-engineer", label: "GPT Engineer", blurb: "프롬프트로 코드베이스 생성" },
  { repo: "Pythagora-io/gpt-pilot", label: "GPT Pilot", blurb: "앱을 처음부터 짓는 AI 개발자" },
  { repo: "plandex-ai/plandex", label: "Plandex", blurb: "대규모 작업용 터미널 코딩 에이전트" },
  { repo: "kilo-org/kilocode", label: "Kilo Code", blurb: "오픈소스 AI 코딩 에이전트" },
];
