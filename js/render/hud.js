import { MAX_TICK_MS, FOOD_SPEED_DELTA_MS } from '../config/constants.js';

// 내부적으로 뱀 속도는 "칸당 이동 시간(ms)"이라 숫자가 작을수록 빠르다. 화면에는 그 반대로
// 빠를수록 커지는 체감 단계로 보여준다 — 한 단계 폭을 먹이 하나가 바꾸는 속도량(FOOD_SPEED_DELTA_MS)에
// 맞춰서, 속도 먹이를 먹을 때마다 화면 숫자가 딱 1씩 움직이는 걸 바로 알아챌 수 있게 한다.
function toSpeedLevel(tickMs) {
  return Math.round((MAX_TICK_MS - tickMs) / FOOD_SPEED_DELTA_MS);
}

// DOM 통계 바 업데이트 — 캔버스가 아니라 DOM이므로 renderer.js와 분리해서 둔다.
export function createHud() {
  const elSize = document.getElementById('stat-size');
  const elAttack = document.getElementById('stat-attack');
  const elSnakeSpeed = document.getElementById('stat-snake-speed');
  const elTime = document.getElementById('stat-time');

  return {
    update({ size, attack, snakeSpeed, survivalSeconds }) {
      elSize.textContent = size;
      elAttack.textContent = attack;
      elSnakeSpeed.textContent = toSpeedLevel(snakeSpeed);
      elTime.textContent = survivalSeconds.toFixed(1);
    },
  };
}
