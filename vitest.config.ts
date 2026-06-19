import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// 순수 함수(서버/DOM 비의존) 단위 테스트용 설정.
// - `server-only` 는 RSC 전용이라 노드 테스트 환경에선 import 만 해도 throw → 빈 모듈로 alias 한다.
// - `@/` 별칭을 tsconfig 와 동일하게 매핑해 소스와 같은 import 경로를 쓸 수 있게 한다.
export default defineConfig({
  resolve: {
    alias: {
      "server-only": fileURLToPath(new URL("./test/empty-module.ts", import.meta.url)),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
