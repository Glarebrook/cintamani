import { SPEED_LEVEL_DISPLAY_OFFSET } from '../config/constants.js';
import { getSpeedLevel } from '../core/speedLevel.js';

// 화면 표시 전용 - 내부 계산(core/speedLevel.js의 getSpeedLevel)은 그대로 두고, 시작값이
// 16이 아니라 20으로 보이도록 보정치만 더한다(점수 계산에는 이 보정치가 안 들어간다).
function toDisplaySpeedLevel(tickMs) {
  return getSpeedLevel(tickMs) + SPEED_LEVEL_DISPLAY_OFFSET;
}

// DOM 통계 바 업데이트 — 캔버스가 아니라 DOM이므로 renderer.js와 분리해서 둔다.
export function createHud() {
  const elSize = document.getElementById('stat-size');
  const elAttack = document.getElementById('stat-attack');
  const elSnakeSpeed = document.getElementById('stat-snake-speed');
  const elTime = document.getElementById('stat-time');
  const elScore = document.getElementById('stat-score');

  return {
    update({ size, attack, snakeSpeed, survivalSeconds, score }) {
      elAttack.textContent = attack;
      elSize.textContent = size;
      elSnakeSpeed.textContent = toDisplaySpeedLevel(snakeSpeed);
      elTime.textContent = survivalSeconds.toFixed(1);
      elScore.textContent = Math.floor(score).toLocaleString();
    },
  };
}
