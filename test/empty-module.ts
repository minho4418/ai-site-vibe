// vitest 에서 `server-only` 를 대체하는 빈 모듈.
// `server-only` 는 RSC 가 아닌 곳에서 import 되면 throw 하도록 설계돼 있어,
// 노드 기반 테스트에서 해당 모듈을 import 하는 lib(예: rss-extract)을 테스트하려면 무력화가 필요하다.
export {};
