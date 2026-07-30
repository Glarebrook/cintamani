import { getDisplaySpeedLevel } from '../core/speedLevel.js';

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
      elSnakeSpeed.textContent = getDisplaySpeedLevel(snakeSpeed);
      elTime.textContent = survivalSeconds.toFixed(1);
      elScore.textContent = Math.floor(score).toLocaleString();
    },
  };
}
