import { GRID_W, GRID_H, CELL_SIZE } from '../config/constants.js';
import { drawIcon } from './statusIcons.js';
import { versionLayer } from './layers.js';

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
  ctx.font = `bold ${Math.floor(ch * 0.12)}px CintamaniFont, monospace`;
  ctx.fillText('CINTAMANI', cw / 2, ch / 2);

  // 세 선택지를 하나의 덩어리로 보고 위아래로 통통 튀는 느낌을 준다 — 개별 줄마다
  // 따로 튀면 줄 사이 간격이 흔들려 보이므로, 같은 오프셋을 함께 적용한다.
  const bounce = Math.sin(performance.now() / 200) * (ch * 0.02);
  ctx.font = `${Math.floor(ch * 0.035)}px CintamaniFont, monospace`;
  ctx.fillText('ENTER - GAME START', cw / 2, ch * 0.72 + bounce);
  ctx.fillText('T - TEST MODE', cw / 2, ch * 0.79 + bounce);
  ctx.fillText('L - LEADERBOARD', cw / 2, ch * 0.86 + bounce);

  versionLayer(ctx);
}

// 타이틀에서 L을 눌러 진입하는 순위 열람 전용 화면의 배경 — 실제 목록/이름 등은
// leaderboardPanel.js의 DOM 오버레이가 그 위에 겹쳐 그린다. 캔버스 쪽은 어두운
// 배경 + 짧은 안내 문구만 담당한다.
export function renderLeaderboardViewBackground(ctx) {
  const cw = GRID_W * CELL_SIZE;
  const ch = GRID_H * CELL_SIZE;
  ctx.fillStyle = '#111111';
  ctx.fillRect(0, 0, cw, ch);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.floor(ch * 0.06)}px CintamaniFont, monospace`;
  ctx.fillText('LEADERBOARD', cw / 2, ch * 0.1);

  versionLayer(ctx);
}

// 일시정지 오버레이 - P/ESC로 states/playingState.js가 토글하는 paused 플래그가 true인 동안
// 매 프레임 마지막 게임 화면 위에 겹쳐 그린다(게임오버 오버레이와 같은 어둡게+텍스트 방식).
export function renderPauseOverlay(ctx) {
  const cw = GRID_W * CELL_SIZE;
  const ch = GRID_H * CELL_SIZE;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, cw, ch);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.floor(ch * 0.08)}px CintamaniFont, monospace`;
  ctx.fillText('PAUSE', cw / 2, ch / 2 - ch * 0.05);
  ctx.font = `${Math.floor(ch * 0.03)}px CintamaniFont, monospace`;
  ctx.fillText('P 또는 ESC로 재개', cw / 2, ch / 2 + ch * 0.05);
}

// 독침/비늘파동 잠금 해제 튜토리얼 팝업 - states/playingState.js가 관련 조건(길이 8 최초
// 도달, 3번적 처치 스택 5)을 충족한 순간 게임을 멈추고 이걸 띄운다.
// { icon, iconColor, title, lines }:
//   icon - 텍스트 위에 작게 그릴 아이콘 이미지(assets/weapons/*.png, 없으면 null).
//   iconColor - icon이 없을 때 대신 그릴 원의 색(무기별 상징색) - 없으면 원도 안 그림.
//   title - 굵고 큰 글씨 한 줄(예: "이무기가 독침발사를 배웠다!").
//   lines - title 아래 작은 글씨로 한 줄씩 그리는 문자열 배열(기존 기능 설명).
// ESC/화살표 등 아무 키나 눌러도 닫히던 예전 방식은, 방향키를 눌렀다가 본인도 모르게
// 팝업이 넘어가버리는 문제가 있어서 폐기됐다 - 이제 states/playingState.js가 Enter 키에만
// dismissTutorial을 바인딩한다(Actions.bindAny가 아니라 Actions.bind('Enter', ...)).
export function renderTutorialPopup(ctx, { icon, iconColor, title, lines }) {
  const cw = GRID_W * CELL_SIZE;
  const ch = GRID_H * CELL_SIZE;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(0, 0, cw, ch);

  const lineHeight = ch * 0.065; // 글씨가 너무 작다는 피드백으로 0.05에서 상향 - 이 값 하나로
  // 아이콘/제목/본문/하단 안내 글씨와 박스 크기가 전부 같은 비율로 같이 커진다.
  const iconSize = lineHeight * 1.7;
  const iconBlockH = (icon || iconColor) ? iconSize + lineHeight * 0.5 : 0;
  const titleH = lineHeight * 1.3;
  const boxW = cw * 0.64;
  const boxH = iconBlockH + titleH + lineHeight * lines.length + lineHeight * 1.5;
  const boxX = (cw - boxW) / 2;
  const boxY = (ch - boxH) / 2;

  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(boxX, boxY, boxW, boxH);
  ctx.strokeStyle = '#ffd54f';
  ctx.lineWidth = 2;
  ctx.strokeRect(boxX, boxY, boxW, boxH);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let cursorY = boxY + lineHeight * 0.7;

  if (icon || iconColor) {
    if (icon) {
      drawIcon(ctx, icon, cw / 2 - iconSize / 2, cursorY, iconSize, iconSize);
    } else {
      ctx.fillStyle = iconColor;
      ctx.beginPath();
      ctx.arc(cw / 2, cursorY + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    cursorY += iconBlockH;
  }

  ctx.fillStyle = '#ffd54f';
  ctx.font = `bold ${Math.floor(lineHeight * 0.8)}px CintamaniFont, monospace`;
  ctx.fillText(title, cw / 2, cursorY + titleH / 2);
  cursorY += titleH;

  ctx.fillStyle = '#ffffff';
  ctx.font = `${Math.floor(lineHeight * 0.5)}px CintamaniFont, monospace`;
  lines.forEach((line, i) => {
    ctx.fillText(line, cw / 2, cursorY + lineHeight * (i + 0.5));
  });

  ctx.fillStyle = '#999999';
  ctx.font = `${Math.floor(lineHeight * 0.4)}px CintamaniFont, monospace`;
  ctx.fillText('ENTER를 눌러 닫기', cw / 2, boxY + boxH - lineHeight * 0.4);
}

// 비늘파동 충전 게이지 - 스페이스바를 누르고 있는 동안 뱀 머리 바로 위에 작게 그린다.
// ratio: 0~1(충전 진행률), full: 완전 충전 여부(true면 색이 바뀜 - 이 상태에서 손을 떼야 발사됨).
export function renderChargeGauge(ctx, headX, headY, ratio, full) {
  const C = CELL_SIZE;
  const gaugeW = C * 2;
  const gaugeH = 3;
  const x = headX * C + C / 2 - gaugeW / 2;
  const y = headY * C - gaugeH - 3;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(x - 1, y - 1, gaugeW + 2, gaugeH + 2);

  ctx.fillStyle = full ? '#ffd54f' : '#4fa8ff';
  ctx.fillRect(x, y, gaugeW * Math.min(1, ratio), gaugeH);
}

export function renderGameOverOverlay(ctx) {
  const cw = GRID_W * CELL_SIZE;
  const ch = GRID_H * CELL_SIZE;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, cw, ch);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.floor(ch * 0.06)}px CintamaniFont, monospace`;
  ctx.fillText('GAME OVER', cw / 2, ch / 2 - ch * 0.05);
  ctx.font = `${Math.floor(ch * 0.03)}px CintamaniFont, monospace`;
  ctx.fillText('Press Enter to restart', cw / 2, ch / 2 + ch * 0.05);
}
