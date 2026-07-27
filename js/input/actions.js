// 액션 키(재시작/발사 등) 바인딩 — 활성 상태(state)가 enter/exit 시점에 스스로 bind/unbind한다.
// 이동 입력(input.js)과 분리된, 단일 바인딩 테이블 패턴.
function normalizeKey(e) {
  if (e.key === ' ' || e.code === 'Space') return 'Space';
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
