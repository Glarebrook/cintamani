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

  fitGameWrapperToViewport();
  window.addEventListener('resize', fitGameWrapperToViewport);
});

// 화면(뷰포트)이 게임의 고정 내부 해상도보다 작은 기기에서 사용자가 직접 브라우저 배율을
// 축소해야 했던 문제 대응. 캔버스 내부 해상도(위 width/height, 게임 좌표 변환이 전제하는
// 값)는 절대 건드리지 않고, CSS transform으로 "화면에 보여지는 크기"만 뷰포트에 맞게
// 줄인다. 확대는 하지 않는다(scale 상한 1) - 큰 모니터에서 픽셀아트가 실제보다 더 크게
// 늘어나 뭉개지는 걸 막기 위함이며, 애초에 큰 화면에서는 원본 크기 그대로도 이미 충분히
// 쾌적하다는 전제.
function fitGameWrapperToViewport() {
  const wrapper = document.getElementById('game-wrapper');
  const BODY_PADDING = 24; // css/style.css의 body { padding: 24px }와 값을 맞춤(좌우/상하 각각)
  const availableWidth = window.innerWidth - BODY_PADDING * 2;
  const availableHeight = window.innerHeight - BODY_PADDING * 2;

  // offsetWidth/offsetHeight는 CSS transform의 영향을 받지 않는 "원본" 레이아웃 크기이므로,
  // 이전에 적용된 scale과 무관하게 매번 그대로 다시 읽어도 안전하다(누적 오차 없음).
  const scale = Math.min(1, availableWidth / wrapper.offsetWidth, availableHeight / wrapper.offsetHeight);

  wrapper.style.transform = scale < 1 ? `scale(${scale})` : '';
}
