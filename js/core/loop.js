// rAF 기반 프레임 루프 + 고정 간격(tickMs) 누적기.
// onFrame은 매 프레임, onTick은 누적 시간이 tickMs를 넘을 때 프레임당 최대 1회 호출된다
// (V1의 "if (elapsed >= TICK_MS)" 방식과 동일 — 밀린 틱을 한 번에 몰아서 처리하는 while-루프가 아님).
export function createGameLoop({ tickMs, onFrame, onTick, onRender }) {
  let lastTick = null;
  let lastFrame = null;
  let rafId = null;

  function frame(timestamp) {
    const dt = lastFrame !== null ? timestamp - lastFrame : 0;
    lastFrame = timestamp;
    if (lastTick === null) lastTick = timestamp;

    onFrame(dt);

    if (timestamp - lastTick >= tickMs) {
      lastTick += tickMs;
      onTick();
    }

    onRender();

    rafId = requestAnimationFrame(frame);
  }

  return {
    start() {
      lastTick = null;
      lastFrame = null;
      rafId = requestAnimationFrame(frame);
    },
    stop() {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
    },
  };
}
