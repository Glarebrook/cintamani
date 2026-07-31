import { STATUS_PANEL_WIDTH } from './config/constants.js';
import { getViewportPixelSize } from './core/gridMath.js';
import { createGame } from './game.js';
import { createTouchControls } from './input/touchControls.js';

window.addEventListener('load', () => {
  const viewport = getViewportPixelSize();

  const canvas = document.getElementById('game-canvas');
  canvas.width  = viewport.width;   // 내부 해상도 - 필드 전체(GRID_W*CELL_SIZE)가 아니라
  canvas.height = viewport.height;  // 화면에 "보이는" 뷰포트 크기(카메라가 그 안을 스크롤함)
  // CSS 표시 크기를 내부 해상도와 1:1로 고정 → 항상 정사각형 픽셀
  canvas.style.width  = canvas.width  + 'px';
  canvas.style.height = canvas.height + 'px';

  // 좌측 상태창 캔버스 - 너비는 고정(STATUS_PANEL_WIDTH), 높이는 게임 캔버스와 항상 같게
  // 맞춘다 - 두 캔버스가 나란히 붙어 하나의 프레임처럼 보이려면 높이가 일치해야 한다.
  const statusCanvas = document.getElementById('status-canvas');
  statusCanvas.width  = STATUS_PANEL_WIDTH;
  statusCanvas.height = viewport.height;
  statusCanvas.style.width  = statusCanvas.width  + 'px';
  statusCanvas.style.height = statusCanvas.height + 'px';

  const game = createGame(canvas);
  window.__game = game;
  game.start();

  createTouchControls();
});
