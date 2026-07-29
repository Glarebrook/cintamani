import { LEADERBOARD_API_URL } from '../config/constants.js';

// api/leaderboard.php와 통신하는 얇은 wrapper. 이 코드베이스 최초의 네트워크 I/O라서
// 실패에 관대하게 만든다 - NAS에 PHP 파일이 아직 안 올라갔거나 네트워크가 끊겨도
// 게임오버 화면 자체는 항상 정상 동작해야 하므로, 실패 시 예외를 던지는 대신
// 호출부가 구분할 수 있게 { ok, entries/error } 형태로 반환한다.
async function request(options) {
  try {
    const res = await fetch(LEADERBOARD_API_URL, options);
    const body = await res.json();
    if (!res.ok) return { ok: false, error: body?.error ?? `HTTP ${res.status}` };
    return { ok: true, entries: body.entries ?? [] };
  } catch (err) {
    return { ok: false, error: err?.message ?? 'network error' };
  }
}

export function fetchLeaderboard() {
  return request();
}

export function submitScore(name, survivalMs) {
  return request({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, survivalMs }),
  });
}
