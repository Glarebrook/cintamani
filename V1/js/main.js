window.addEventListener('load', () => {
  const canvas = document.getElementById('game-canvas');
  canvas.width  = GRID_W * CELL_SIZE;   // 내부 해상도
  canvas.height = GRID_H * CELL_SIZE;
  // CSS 표시 크기를 내부 해상도와 1:1로 고정 → 항상 정사각형 픽셀
  canvas.style.width  = canvas.width  + 'px';
  canvas.style.height = canvas.height + 'px';

  const game = new Game(canvas);
  window.__game = game;
  game.start();
});