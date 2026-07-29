import { GRID_W, GRID_H, CELL_SIZE } from '../config/constants.js';

// 타이틀 화면은 아직 world가 시작 전이라 그 위에 겹쳐 그리는 오버레이가 아니라
// 화면 전체를 단독으로 채운다 — 배경색은 layers.js의 backgroundLayer와 동일하게 맞춘다.
export function renderTitleScreen(ctx) {
  const cw = GRID_W * CELL_SIZE;
  const ch = GRID_H * CELL_SIZE;

  ctx.fillStyle = '#111111';
  ctx.fillRect(0, 0, cw, ch);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.floor(ch * 0.12)}px monospace`;
  ctx.fillText('CINTAMANI', cw / 2, ch / 2);

  // 두 선택지를 하나의 덩어리로 보고 위아래로 통통 튀는 느낌을 준다 — 개별 줄마다
  // 따로 튀면 두 줄 사이 간격이 흔들려 보이므로, 같은 오프셋을 함께 적용한다.
  const bounce = Math.sin(performance.now() / 200) * (ch * 0.02);
  ctx.font = `${Math.floor(ch * 0.035)}px monospace`;
  ctx.fillText('ENTER - GAME START', cw / 2, ch * 0.76 + bounce);
  ctx.fillText('T - TEST MODE', cw / 2, ch * 0.84 + bounce);
}

// 향후 Paused/Menu 오버레이도 이 파일에 나란히 추가한다.
export function renderGameOverOverlay(ctx) {
  const cw = GRID_W * CELL_SIZE;
  const ch = GRID_H * CELL_SIZE;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, cw, ch);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.floor(ch * 0.06)}px monospace`;
  ctx.fillText('GAME OVER', cw / 2, ch / 2 - ch * 0.05);
  ctx.font = `${Math.floor(ch * 0.03)}px monospace`;
  ctx.fillText('Press Enter to restart', cw / 2, ch / 2 + ch * 0.05);
}
