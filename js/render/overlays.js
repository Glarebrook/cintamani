import { drawIcon } from './statusIcons.js';
import { versionLayer } from './layers.js';
import { toScreenX, toScreenY, screenCellSize, getViewportPixelSize } from '../core/gridMath.js';

// 타이틀/일시정지/게임오버 등 화면 전체를 채우는 오버레이들은 필드 전체 크기(GRID_W*CELL_SIZE)가
// 아니라 뷰포트(실제 캔버스) 픽셀 크기를 써야 한다 - 필드가 카메라 뷰포트보다 커지면 이 둘이
// 달라진다(core/gridMath.js의 getViewportPixelSize 참고).

// 타이틀 화면은 아직 world가 시작 전이라 그 위에 겹쳐 그리는 오버레이가 아니라
// 화면 전체를 단독으로 채운다 — 배경색은 layers.js의 backgroundLayer와 동일하게 맞춘다.
export function renderTitleScreen(ctx) {
  const { width: cw, height: ch } = getViewportPixelSize();

  ctx.fillStyle = '#111111';
  ctx.fillRect(0, 0, cw, ch);

  // 타이틀 화면에서는 statusPanel.setMerged(true)로 좌측 상태창 캔버스와 이 게임 캔버스가
  // 경계 없이 이어져 하나의 넓은 화면처럼 보인다(states/titleState.js 참고) - 하지만 이
  // ctx는 여전히 게임 캔버스(오른쪽 부분, 너비 cw)만의 좌표계라, 상태창 캔버스 쪽 픽셀에는
  // 직접 그릴 수 없다(별개의 캔버스 엘리먼트). 그래서 로고/메뉴는 이 게임 캔버스 자체의
  // 왼쪽으로 최대한 붙이고(logoX), 남는 오른쪽 공간은 render/patchNotesPanel.js의 DOM
  // 오버레이(스크롤 가능한 패치노트 목록)가 차지한다 - 캔버스가 아니라 DOM인 이유는
  // 리더보드 이름 입력과 같은 이유(진짜 스크롤 동작이 필요한 UI는 캔버스로 직접 구현하기
  // 번거로움).
  const titleFontSize = Math.floor(ch * 0.12);
  ctx.font = `bold ${titleFontSize}px CintamaniFont, monospace`;
  const titleWidth = ctx.measureText('CINTAMANI').width;
  // 로고가 잘리지 않는 한도 내에서 최대한 왼쪽으로 - 텍스트 폭의 절반 + 여백보다 왼쪽으로
  // 가면 왼쪽 가장자리가 캔버스 밖으로 잘려나간다.
  const logoX = Math.max(titleWidth / 2 + 24, cw * 0.22);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CINTAMANI', logoX, ch * 0.4);

  // 세 선택지를 하나의 덩어리로 보고 위아래로 통통 튀는 느낌을 준다 — 개별 줄마다
  // 따로 튀면 줄 사이 간격이 흔들려 보이므로, 같은 오프셋을 함께 적용한다.
  const bounce = Math.sin(performance.now() / 200) * (ch * 0.02);
  ctx.font = `${Math.floor(ch * 0.035)}px CintamaniFont, monospace`;
  ctx.fillText('ENTER - GAME START', logoX, ch * 0.62 + bounce);
  ctx.fillText('T - TEST MODE', logoX, ch * 0.69 + bounce);
  ctx.fillText('L - LEADERBOARD', logoX, ch * 0.76 + bounce);

  versionLayer(ctx);
}

// 타이틀에서 L을 눌러 진입하는 순위 열람 전용 화면의 배경 — 실제 목록/이름 등은
// leaderboardPanel.js의 DOM 오버레이가 그 위에 겹쳐 그린다. 캔버스 쪽은 어두운
// 배경 + 짧은 안내 문구만 담당한다.
export function renderLeaderboardViewBackground(ctx) {
  const { width: cw, height: ch } = getViewportPixelSize();
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
  const { width: cw, height: ch } = getViewportPixelSize();
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
// 도달, 3번적 처치 스택 5)을 충족한 순간 게임을 멈추고 이걸 띄운다. 이후 추가되는 다른 잠금
// 해제 안내창도 전부 이 하나의 틀을 그대로 재사용한다(showTutorial 호출부만 늘리면 됨).
// { icon, iconColor, title, lines }:
//   icon - 왼쪽에 그릴 아이콘 이미지(assets/weapons/*.png, 없으면 null).
//   iconColor - icon이 없을 때 대신 그릴 원의 색(무기별 상징색) - 없으면 원도 안 그림.
//   title - 굵고 큰 글씨 한 줄(예: "이무기가 독침발사를 배웠다!").
//   lines - title 아래 작은 글씨로 한 줄씩 그리는 문자열 배열(기존 기능 설명).
// ESC/화살표 등 아무 키나 눌러도 닫히던 예전 방식은, 방향키를 눌렀다가 본인도 모르게
// 팝업이 넘어가버리는 문제가 있어서 폐기됐다 - 이제 states/playingState.js가 Enter 키에만
// dismissTutorial을 바인딩한다(Actions.bindAny가 아니라 Actions.bind('Enter', ...)).
// 레이아웃: 아이콘은 왼쪽에(세로 중앙 정렬), 제목/설명/하단 안내문구는 그 오른쪽에 전부
// 왼쪽 정렬로 세로 배치한다 - 제목만 도드라지고 설명/안내문구는 상대적으로 너무 작다는
// 피드백으로, 설명/안내문구 글씨는 각각 기존 대비 20% 키웠다(제목 크기는 그대로).
export function renderTutorialPopup(ctx, { icon, iconColor, title, lines }) {
  const { width: cw, height: ch } = getViewportPixelSize();

  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(0, 0, cw, ch);

  const lineHeight = ch * 0.065; // 이 값 하나로 아이콘/제목/본문/하단 안내 글씨와 박스 크기가
  // 전부 같은 비율로 같이 커진다.
  const titleFontSize = lineHeight * 0.8;
  const linesFontSize = lineHeight * 0.6;  // 기존 0.5에서 20% 상향
  const footerFontSize = lineHeight * 0.48; // 기존 0.4에서 20% 상향

  const iconSize = lineHeight * 1.7;
  const hasIcon = !!(icon || iconColor);
  const pad = lineHeight * 1.0; // 아이콘 왼쪽 여백이 좁다는 피드백으로 0.7에서 상향
  const iconGap = lineHeight * 1.0; // 아이콘-텍스트 사이 간격도 0.6에서 상향
  const iconColW = hasIcon ? iconSize + iconGap : 0;

  const titleH = lineHeight * 1.3;
  const textBlockH = titleH + lineHeight * lines.length + lineHeight * 1.5;
  const boxH = Math.max(textBlockH, hasIcon ? iconSize + pad * 2 : 0);

  // 아이콘이 왼쪽으로 빠지고 텍스트가 오른쪽 칸에서 왼쪽 정렬되는 배치라, 글이 길면 상자
  // 너비(기본 cw*0.64)를 벗어날 수 있다 - 제목/각 줄/안내문구 중 가장 넓은 폭을 실제로 재서
  // 필요하면 상자를 넓힌다(화면의 92%는 넘지 않음).
  ctx.font = `bold ${Math.floor(titleFontSize)}px CintamaniFont, monospace`;
  let maxTextW = ctx.measureText(title).width;
  ctx.font = `${Math.floor(linesFontSize)}px CintamaniFont, monospace`;
  for (const line of lines) maxTextW = Math.max(maxTextW, ctx.measureText(line).width);
  ctx.font = `${Math.floor(footerFontSize)}px CintamaniFont, monospace`;
  maxTextW = Math.max(maxTextW, ctx.measureText('ENTER를 눌러 닫기').width);

  const boxW = Math.min(cw * 0.92, Math.max(cw * 0.64, pad * 2 + iconColW + maxTextW));
  const boxX = (cw - boxW) / 2;
  const boxY = (ch - boxH) / 2;

  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(boxX, boxY, boxW, boxH);
  ctx.strokeStyle = '#ffd54f';
  ctx.lineWidth = 2;
  ctx.strokeRect(boxX, boxY, boxW, boxH);

  if (hasIcon) {
    const iconX = boxX + pad;
    const iconY = boxY + (boxH - iconSize) / 2;
    if (icon) {
      drawIcon(ctx, icon, iconX, iconY, iconSize, iconSize);
    } else {
      ctx.fillStyle = iconColor;
      ctx.beginPath();
      ctx.arc(iconX + iconSize / 2, iconY + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const textX = boxX + pad + iconColW;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  let cursorY = boxY + lineHeight * 0.7;

  ctx.fillStyle = '#ffd54f';
  ctx.font = `bold ${Math.floor(titleFontSize)}px CintamaniFont, monospace`;
  ctx.fillText(title, textX, cursorY + titleH / 2);
  cursorY += titleH;

  ctx.fillStyle = '#ffffff';
  ctx.font = `${Math.floor(linesFontSize)}px CintamaniFont, monospace`;
  lines.forEach((line, i) => {
    ctx.fillText(line, textX, cursorY + lineHeight * (i + 0.5));
  });

  ctx.fillStyle = '#999999';
  ctx.font = `${Math.floor(footerFontSize)}px CintamaniFont, monospace`;
  ctx.fillText('ENTER를 눌러 닫기', textX, boxY + boxH - lineHeight * 0.4);
}

// 비늘파동 충전 게이지 - 스페이스바를 누르고 있는 동안 뱀 머리 바로 위에 작게 그린다.
// ratio: 0~1(충전 진행률), full: 완전 충전 여부(true면 색이 바뀜 - 이 상태에서 손을 떼야 발사됨).
// headX/headY는 격자 좌표 - 카메라를 거쳐야 화면 어디에 그릴지 알 수 있다(다른 세계 공간
// 그리기와 동일한 원칙 - render/layers.js 참고).
export function renderChargeGauge(ctx, headX, headY, ratio, full, camera) {
  const C = screenCellSize();
  const gaugeW = C * 2;
  const gaugeH = 3;
  const x = toScreenX(headX, camera) + C / 2 - gaugeW / 2;
  const y = toScreenY(headY, camera) - gaugeH - 3;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(x - 1, y - 1, gaugeW + 2, gaugeH + 2);

  ctx.fillStyle = full ? '#ffd54f' : '#4fa8ff';
  ctx.fillRect(x, y, gaugeW * Math.min(1, ratio), gaugeH);
}

export function renderGameOverOverlay(ctx) {
  const { width: cw, height: ch } = getViewportPixelSize();
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
