// icon.svg → favicon.ico (16/32/48 멀티사이즈, PNG-in-ICO 컨테이너).
// 네이버·다음 등 SVG 파비콘을 못 읽는 검색엔진이 폴백 지구본 대신 Knewit 로고를 쓰게 한다.
// 로고(icon.svg) 변경 시 재실행: node scripts/gen-favicon.mjs
import sharp from "sharp";
import { readFileSync, writeFileSync } from "node:fs";

const svg = readFileSync("src/app/icon.svg");
const sizes = [16, 32, 48];

const pngs = await Promise.all(sizes.map((s) => sharp(svg).resize(s, s).png().toBuffer()));

// ICONDIR 헤더(6) + ICONDIRENTRY(16*N) + 각 PNG 데이터
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: 1 = icon
header.writeUInt16LE(pngs.length, 4); // 이미지 개수

const entries = Buffer.alloc(16 * pngs.length);
let offset = 6 + 16 * pngs.length;
pngs.forEach((png, i) => {
  const b = i * 16;
  const dim = sizes[i] >= 256 ? 0 : sizes[i]; // 256 은 0 으로 표기
  entries.writeUInt8(dim, b); // width
  entries.writeUInt8(dim, b + 1); // height
  entries.writeUInt8(0, b + 2); // 팔레트 색 수(트루컬러=0)
  entries.writeUInt8(0, b + 3); // reserved
  entries.writeUInt16LE(1, b + 4); // color planes
  entries.writeUInt16LE(32, b + 6); // bits per pixel
  entries.writeUInt32LE(png.length, b + 8); // 데이터 크기
  entries.writeUInt32LE(offset, b + 12); // 데이터 오프셋
  offset += png.length;
});

writeFileSync("src/app/favicon.ico", Buffer.concat([header, entries, ...pngs]));
console.log(`favicon.ico 생성 완료: ${sizes.join("/")}px, ${offset} bytes`);
