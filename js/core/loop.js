// rAF 기반 프레임 루프 + 고정 간격(tickMs) 누적기.
// onFrame은 매 프레임, onTick은 누적 시간이 tickMs를 넘을 때 프레임당 최대 1회 호출된다
// (V1의 "if (elapsed >= TICK_MS)" 방식과 동일 — 밀린 틱을 한 번에 몰아서 처리하는 while-루프가 아님).
// tickMs 대신 getTickMs()를 매 프레임 호출하는 이유: 속도 먹이로 뱀 이동 간격이
// 게임 도중 바뀔 수 있어서, 루프 시작 시점에 값 하나를 캡처해두면 안 되고 그때그때 최신값을 읽어야 한다.
export function createGameLoop({ getTickMs, onFrame, onTick, onRender }) {
  let lastTick = null;
  let lastFrame = null;
  let rafId = null;

  function frame(timestamp) {
    const dt = lastFrame !== null ? timestamp - lastFrame : 0;
    lastFrame = timestamp;
    if (lastTick === null) lastTick = timestamp;

    onFrame(dt);

    const tickMs = getTickMs();
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
