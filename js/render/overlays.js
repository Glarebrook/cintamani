import { GRID_W, GRID_H, CELL_SIZE } from '../config/constants.js';

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
