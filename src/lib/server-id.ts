// src/lib/server-id.ts

// 전역 변수에 서버 시작 시간을 기록합니다.
// (코드 수정으로 인한 '새로고침' 때는 변하지 않고, 'npm run dev'를 껐다 켤 때만 바뀝니다!)

declare global {
  var __SERVER_START_TIME__: string | undefined;
}

if (!global.__SERVER_START_TIME__) {
  global.__SERVER_START_TIME__ = Date.now().toString();
}

export const SERVER_ID = global.__SERVER_START_TIME__;