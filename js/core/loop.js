// rAF 기반 프레임 루프 + 고정 간격(tickMs) 누적기.
// onFrame은 매 프레임, onTick은 누적 시간이 tickMs를 넘을 때 프레임당 최대 1회 호출된다
// (V1의 "if (elapsed >= TICK_MS)" 방식과 동일 — 밀린 틱을 한 번에 몰아서 처리하는 while-루프가 아님).
// tickMs 대신 getTickMs()를 매 프레임 호출하는 이유: 속도 먹이로 뱀 이동 간격이
// 게임 도중 바뀔 수 있어서, 루프 시작 시점에 값 하나를 캡처해두면 안 되고 그때그때 최신값을 읽어야 한다.
// 탭이 백그라운드로 가거나 컴퓨터가 잠들었다 돌아오면 두 프레임 사이 실제 간격이 수 초~수십
// 초로 벌어질 수 있다. 이 공백을 그대로 반영하면 onFrame(dt)에 비정상적으로 큰 dt가 들어가는
// 것도 문제지만, 더 심각한 건 onTick 판정(timestamp - lastTick >= tickMs)이 한동안 계속 참이
// 돼서 이후 여러 프레임에 걸쳐 "밀린 틱"이 (위 주석의 if-not-while 규칙 때문에) 프레임당 최대
// 1개씩 계속 나가버리는 것 — 그 몇 초 동안 뱀이 매 프레임(예: 16ms)마다 한 칸씩 움직이게 돼서
// (정상은 tickMs=120ms마다 한 칸), 순식간에 여러 칸을 이동해 벽/자기 몸에 부딪혀 죽어버린다.
// 실제로 "게임오버 화면에서 한참 놔뒀다가 재시작하면 시작하자마자 충돌사한다"는 제보의 원인이
// 이거였다 - 밀린 틱이 게임오버 화면(onTick이 아무것도 안 함)에서 다 안 풀리고 재시작 직후까지
// 넘어온 것. 그래서 한 프레임의 실제 경과시간이 MAX_FRAME_GAP_MS를 넘으면 그 공백을 몰아서
// 처리하지 않고 그냥 버린다 - 이건 위에서 경고하는 "catch-up while-루프"를 추가하는 것과
// 정반대다: 밀린 걸 나중에 다 처리하는 게 아니라 애초에 밀린 것 자체를 없었던 일로 만든다.
const MAX_FRAME_GAP_MS = 250;

export function createGameLoop({ getTickMs, onFrame, onTick, onRender }) {
  let lastTick = null;
  let lastFrame = null;
  let rafId = null;

  function frame(timestamp) {
    const rawDt = lastFrame !== null ? timestamp - lastFrame : 0;
    const gapTooLarge = rawDt > MAX_FRAME_GAP_MS;
    const dt = gapTooLarge ? MAX_FRAME_GAP_MS : rawDt;
    lastFrame = timestamp;
    if (lastTick === null) lastTick = timestamp;
    if (gapTooLarge) lastTick = timestamp - dt;

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
