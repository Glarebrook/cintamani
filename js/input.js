const Input = (() => {
  const DIR = {
    ArrowUp:    { x:  0, y: -1 },
    ArrowDown:  { x:  0, y:  1 },
    ArrowLeft:  { x: -1, y:  0 },
    ArrowRight: { x:  1, y:  0 },
  };

  let pending = null;
  let applied = { x: 1, y: 0 }; // 초기 방향: 오른쪽

  window.addEventListener('keydown', e => {
    const d = DIR[e.key];
    if (!d) return;
    e.preventDefault();
    // 현재 적용 방향의 반대 방향 입력 무시
    if (d.x === -applied.x && d.y === -applied.y) return;
    pending = d;
  }, { passive: false });

  return {
    // 틱 직전에 호출 — 마지막 입력을 소비해 방향 반환
    consume() {
      if (pending) applied = pending;
      pending = null;
      return applied;
    },
  };
})();
