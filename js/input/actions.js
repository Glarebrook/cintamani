// 액션 키(재시작/발사 등) 바인딩 — 활성 상태(state)가 enter/exit 시점에 스스로 bind/unbind한다.
// 이동 입력(input.js)과 분리된, 단일 바인딩 테이블 패턴.
function normalizeKey(e) {
  if (e.key === ' ' || e.code === 'Space') return 'Space';
  // 물리적 키 위치(e.code)가 알파벳 한 글자(KeyA~KeyZ)면 그걸 우선 쓴다 - 한글 입력기(IME)가
  // 켜져 있으면 e.key가 눌린 물리 키와 무관하게 조합된 한글 자모(예: 2벌식에서 P 키는 'ㅔ')로
  // 나와서, e.key만 보면 한글 입력 상태에서 P/T/L 등을 눌러도 안 먹는 문제가 있었다(실제 신고된
  // 문제). e.code는 키보드 레이아웃/입력기 상태와 무관하게 항상 같은 물리 키를 가리키므로
  // 이 문제가 없다. 테스트 스텁처럼 e.code가 없는 경우엔 그냥 통과되고 아래 e.key 경로로 간다.
  const codeMatch = /^Key([A-Z])$/.exec(e.code);
  if (codeMatch) return codeMatch[1].toLowerCase();
  // 알파벳 한 글자 키는 대소문자 구분 없이 매칭 — Shift/Caps Lock 상태와 무관하게 눌리도록.
  if (e.key.length === 1) return e.key.toLowerCase();
  return e.key;
}

function createActionBindings() {
  const bindings = new Map();

  window.addEventListener('keydown', e => {
    const handler = bindings.get(normalizeKey(e));
    if (!handler) return;
    e.preventDefault();
    handler(e);
  }, { passive: false });

  return {
    bind(key, handler) { bindings.set(key, handler); },
    unbind(key) { bindings.delete(key); },
  };
}

export const Actions = createActionBindings();
