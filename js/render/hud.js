// DOM 통계 바 업데이트 — 캔버스가 아니라 DOM이므로 renderer.js와 분리해서 둔다.
export function createHud() {
  const elSize = document.getElementById('stat-size');
  const elSpeed = document.getElementById('stat-speed');
  const elAttack = document.getElementById('stat-attack');
  const elSnakeSpeed = document.getElementById('stat-snake-speed');
  const elTime = document.getElementById('stat-time');

  return {
    update({ size, speed, attack, snakeSpeed, survivalSeconds }) {
      elSize.textContent = size;
      elSpeed.textContent = speed;
      elAttack.textContent = attack;
      elSnakeSpeed.textContent = snakeSpeed;
      elTime.textContent = survivalSeconds.toFixed(1);
    },
  };
}
