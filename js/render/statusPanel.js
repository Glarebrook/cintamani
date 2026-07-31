// 게임 캔버스 왼쪽의 별도 캔버스(#status-canvas)에 그리는 좌측 상태창 - 위에서 아래로
// 점수+미니맵 / STATUS / KILL STACK / CINTAMANI 4개 구획을 세로로 쌓는다(예전 가로 배치의
// 하단 상태창 시절엔 좌우로 나열됐지만, 좌측 사이드바로 레이아웃을 바꾸면서 세로 스택으로
// 재배치했다). 게임 캔버스와는 분리된 자기만의 캔버스에 그리는 패턴은 그대로 유지한다.
// 코드 상 식별자는 "여의주"의 음역(yeouiju)이 아니라 "cintamani"(여의주의 산스크리트/영문
// 명칭, 이 게임 이름과 동일)를 쓴다 - 표기가 두 개로 갈리면 나중에 헷갈릴 수 있어서 게임
// 제목과 통일했다.
// STATUS/KILL STACK/CINTAMANI 구획은 모두 같은 "아이콘 위 + 수치 아래" 스타일로 통일돼
// 있다 - 속도/길이는 항상 표시, 독침/비늘파동 데미지는 각각 world.stats.venomUnlocked/
// scaleWaveUnlocked가 켜진 뒤에만(그 무기를 실제로 획득한 뒤에만) 칸이 나타난다.
import { STATUS_PANEL_WIDTH, MINIMAP_WIDTH_PX, MINIMAP_HEIGHT_PX } from '../config/constants.js';
import { getViewportPixelSize } from '../core/gridMath.js';
import { getDisplaySpeedLevel } from '../core/speedLevel.js';
import { getTotalScore } from '../core/score.js';
import { EnemyTypes } from '../content/enemies/index.js';
import { getEnemyIcon, getCintamaniIcon, getWeaponIcon, getStatIcon, drawIcon } from './statusIcons.js';
import { renderMinimap } from './minimap.js';

const BG_COLOR = '#d9b98a';                 // 밝은 가죽색
const PATTERN_COLOR = 'rgba(92, 67, 38, 0.28)'; // 배경의 짙은 갈색 가는 선(가죽 질감)
const DIVIDER_COLOR = '#5c4326';            // 구획 구분선
const TEXT_COLOR = '#4a2f18';

const CINTAMANI_ORDER = ['red', 'blue', 'green', 'yellow'];
const CINTAMANI_COLOR = {
  red: '#c0392b',
  blue: '#2f6fb0',
  green: '#2f8f4e',
  yellow: '#d4a017',
};

// 1열 스탯 칸의 이미지 없을 때 폴백 원 색 - 독침/비늘파동은 각 무기 튜토리얼 팝업에서 이미
// 쓰던 상징색(overlays.js 참고)을 그대로 맞춘다.
const STAT_FALLBACK_COLOR = {
  speed: '#3fa7d6',
  length: '#4caf7d',
  venomDamage: '#f5d742',
  scaleWaveDamage: '#ffffff',
};

// STATUS/KILL STACK/CINTAMANI 각 구획 맨 위에 붙는 제목 높이 - 이만큼 그 구획의 실제
// 내용물이 아래로 밀린다. 패치4(폰트 30% 확대)로 제목 글자가 커진 만큼 18->22로 살짝 키워서
// 여유를 뒀다.
const SECTION_TITLE_HEIGHT = 22;
// 맨 위 점수+미니맵 구획 안쪽 여백(점수 텍스트 위/미니맵 아래/미니맵 좌우 공통) 및 점수
// 텍스트 자체가 차지하는 높이 - 어두운 패널(drawDarkPanel) 크기를 이 값들로부터 계산한다.
// 패치4로 점수 글자가 커진 만큼 26->30으로 살짝 키움.
const SCORE_ROW_HEIGHT = 30;
const SECTION_PADDING = 10;

// 패치4: 상태창의 모든 폰트를 기존보다 약 30% 크게 - 제목/칸별 수치는 11px->14px,
// 점수는 15px->20px. 세 곳에 흩어져 있던 폰트 크기를 여기 한 곳으로 모아, 나중에 또
// 조정하게 되더라도 값 하나만 바꾸면 되게 했다.
const TITLE_FONT_SIZE = 14;
const ITEM_FONT_SIZE = 14;
const SCORE_FONT_SIZE = 20;

function drawSectionTitle(ctx, text, y, width) {
  ctx.fillStyle = TEXT_COLOR;
  ctx.font = `bold ${TITLE_FONT_SIZE}px UIFont, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, y);
}

function drawBackground(ctx, w, h) {
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, w, h);

  // 짙은 갈색 가는 대각선을 일정 간격으로 그려 가죽 질감의 배경 패턴을 낸다.
  ctx.strokeStyle = PATTERN_COLOR;
  ctx.lineWidth = 1;
  const gap = 10;
  ctx.beginPath();
  for (let x = -h; x < w; x += gap) {
    ctx.moveTo(x, h);
    ctx.lineTo(x + h, 0);
  }
  ctx.stroke();
}

// 점수+미니맵 구획 전용 - 가죽 배경 위에서 흰 점수/미니맵 점들이 잘 안 보인다는 피드백으로
// 이 구획에만 어두운 패널을 깔고 그 위에 점수/미니맵을 그린다.
function drawDarkPanel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(20, 16, 12, 0.78)';
  ctx.fillRect(x, y, w, h);
}

// boundaries: 구분선을 그을 y좌표 배열(위쪽부터) - 세로로 쌓인 구획 사이를 가로 선으로 나눈다.
function drawSectionDividers(ctx, w, boundaries) {
  ctx.strokeStyle = DIVIDER_COLOR;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const boundary of boundaries) {
    const y = Math.round(boundary) + 0.5; // 반픽셀 보정 - 1px 선이 흐리게 안 번지도록
    ctx.moveTo(4, y);
    ctx.lineTo(w - 4, y);
  }
  ctx.stroke();
}

// 이미지가 아직 없는 항목(assets/enemies, assets/cintamani에 파일을 안 넣은 상태)을 위한
// 대체 표시 - 해당 항목의 색으로 된 원.
function drawIconOrFallback(ctx, icon, cx, cy, radius, fallbackColor) {
  if (icon) {
    const size = radius * 2;
    drawIcon(ctx, icon, cx - radius, cy - radius, size, size);
    return;
  }
  ctx.fillStyle = fallbackColor;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
}

// STATUS 구획 - 뱀 기본 스테이터스, 아래 두 구획과 같은 아이콘-위/수치-아래 스타일. x/width는
// 이제 항상 전체 폭(사이드바 하나뿐이라 좌우로 나눌 열이 없음), contentTop/contentH는 이
// 구획의 제목(SECTION_TITLE_HEIGHT)을 뺀 실제 내용 영역이다. 속도/길이는 항상 표시하고,
// 독침/비늘파동 데미지는 각 무기를 실제로 획득(unlocked)한 뒤에만 칸이 추가된다 - 아직 못
// 배운 무기의 수치를 미리 보여주는 건 스포일러라 숨긴다.
function drawSnakeStatsColumn(ctx, world, x, width, contentTop, contentH) {
  const items = [
    { icon: getStatIcon('speed'), fallback: STAT_FALLBACK_COLOR.speed, value: getDisplaySpeedLevel(world.stats.tickMs) },
    { icon: getStatIcon('length'), fallback: STAT_FALLBACK_COLOR.length, value: world.snake.segments.length },
  ];
  if (world.stats.venomUnlocked) {
    items.push({ icon: getWeaponIcon('venom'), fallback: STAT_FALLBACK_COLOR.venomDamage, value: world.stats.attackDamage });
  }
  if (world.stats.scaleWaveUnlocked) {
    items.push({ icon: getWeaponIcon('scaleWave'), fallback: STAT_FALLBACK_COLOR.scaleWaveDamage, value: world.stats.scaleWaveDamage });
  }

  const slotWidth = width / items.length;
  const iconRadius = 12;
  const iconCy = contentTop + contentH * 0.36;
  const textCy = contentTop + contentH * 0.74;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  items.forEach((item, i) => {
    const slotCx = x + slotWidth * i + slotWidth / 2;
    drawIconOrFallback(ctx, item.icon, slotCx, iconCy, iconRadius, item.fallback);

    ctx.fillStyle = TEXT_COLOR;
    ctx.font = `bold ${ITEM_FONT_SIZE}px UIFont, sans-serif`;
    ctx.fillText(String(item.value), slotCx, textCy);
  });
}

// KILL STACK 구획 - 적1~5 이번 판 킬 스택. world.stats.killsByType는 판마다 리셋되는 이번
// 판 전적이다(game.js의 world.reset() 참고) - 여러 판에 걸친 영구 누적은 지금은 하지 않는다.
function drawEnemyKillsColumn(ctx, world, x, width, contentTop, contentH) {
  const ids = EnemyTypes.all().map(def => def.id).sort((a, b) => a - b);
  const slotWidth = width / ids.length;
  const iconRadius = 12;
  const iconCy = contentTop + contentH * 0.36;
  const textCy = contentTop + contentH * 0.74;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const slotCx = x + slotWidth * i + slotWidth / 2;
    const def = EnemyTypes.get(id);
    drawIconOrFallback(ctx, getEnemyIcon(id), slotCx, iconCy, iconRadius, def.color);

    ctx.fillStyle = TEXT_COLOR;
    ctx.font = `bold ${ITEM_FONT_SIZE}px UIFont, sans-serif`;
    const count = world.stats.killsByType[id] || 0;
    ctx.fillText(String(count), slotCx, textCy);
  }
}

// CINTAMANI 구획 - 여의주(cintamani) 4종, 1x4 한 줄 배치(위 KILL STACK 구획과 같은
// 아이콘-위/수치-아래 스타일로 통일).
function drawCintamaniColumn(ctx, world, x, width, contentTop, contentH) {
  const slotWidth = width / CINTAMANI_ORDER.length;
  const iconRadius = 12;
  const iconCy = contentTop + contentH * 0.36;
  const textCy = contentTop + contentH * 0.74;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < CINTAMANI_ORDER.length; i++) {
    const key = CINTAMANI_ORDER[i];
    const slotCx = x + slotWidth * i + slotWidth / 2;

    drawIconOrFallback(ctx, getCintamaniIcon(key), slotCx, iconCy, iconRadius, CINTAMANI_COLOR[key]);

    ctx.fillStyle = TEXT_COLOR;
    ctx.font = `bold ${ITEM_FONT_SIZE}px UIFont, sans-serif`;
    ctx.fillText(`×${world.stats.cintamani[key]}`, slotCx, textCy);
  }
}

// 맨 위 구획의 실시간 점수 - 원래 상단 DOM 통계바에 있던 실시간 점수를 여기로 옮겼다(생존
// 시간 표시는 점수만으로 체감 가능하다는 판단으로 별도 이전 없이 그냥 없앰). 어두운 패널
// (drawDarkPanel) 위에 그려지므로 눈에 잘 띄게 점수 강조색(골드)을 쓴다.
function drawScore(ctx, world, width, y) {
  ctx.fillStyle = '#ffd54f';
  ctx.font = `bold ${SCORE_FONT_SIZE}px UIFont, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(Math.floor(getTotalScore(world)).toLocaleString(), width / 2, y);
}

// render/overlays.js의 renderTitleScreen/renderLeaderboardViewBackground가 쓰는 배경색과
// 반드시 같아야 한다 - 합쳐진 모드에서 두 캔버스가 이어진 하나의 화면처럼 보이려면 두 캔버스의
// 배경색이 정확히 일치해야 하기 때문(공유 상수로 뽑기엔 이 한 곳 값만 맞으면 되는 정도라 과함).
const TITLE_BG_COLOR = '#111111';

export function createStatusPanel() {
  const canvas = document.getElementById('status-canvas');
  const ctx = canvas.getContext('2d');
  const playArea = document.getElementById('play-area');
  const w = STATUS_PANEL_WIDTH;
  // 높이는 고정값이 아니라 게임 캔버스와 항상 같다(main.js가 두 캔버스 높이를 함께 맞춘다) -
  // 나란히 붙어 하나의 세로 프레임처럼 보이려면 반드시 일치해야 한다.
  const h = getViewportPixelSize().height;

  // 맨 위 점수+미니맵 구획의 전체 높이 - 점수 텍스트 한 줄 + 위/아래/미니맵 하단 여백 +
  // 미니맵 높이. 나머지(STATUS/KILL STACK/CINTAMANI)는 이 구획을 뺀 나머지 높이를 똑같이
  // 3등분해서 쓴다(REMAINING_H/3) - 상수 하나(VIEWPORT_ROWS)만 바뀌어도 전체 레이아웃이
  // 자동으로 다시 맞춰지도록 픽셀을 하드코딩하지 않고 계산한다.
  const scoreMinimapH = SECTION_PADDING + SCORE_ROW_HEIGHT + SECTION_PADDING + MINIMAP_HEIGHT_PX + SECTION_PADDING;
  const remainingH = h - scoreMinimapH;
  const sectionH = remainingH / 3;
  const statusY = scoreMinimapH;
  const killStackY = statusY + sectionH;
  const cintamaniY = killStackY + sectionH;
  const minimapX = (w - MINIMAP_WIDTH_PX) / 2;
  const minimapY = SECTION_PADDING + SCORE_ROW_HEIGHT + SECTION_PADDING;

  return {
    render(world) {
      drawBackground(ctx, w, h);

      drawDarkPanel(ctx, 0, 0, w, scoreMinimapH);
      drawScore(ctx, world, w, SECTION_PADDING + SCORE_ROW_HEIGHT / 2);
      renderMinimap(ctx, world, minimapX, minimapY);

      drawSectionTitle(ctx, 'STATUS', statusY + SECTION_TITLE_HEIGHT / 2, w);
      drawSectionTitle(ctx, 'KILL STACK', killStackY + SECTION_TITLE_HEIGHT / 2, w);
      drawSectionTitle(ctx, 'CINTAMANI', cintamaniY + SECTION_TITLE_HEIGHT / 2, w);
      drawSnakeStatsColumn(ctx, world, 0, w, statusY + SECTION_TITLE_HEIGHT, sectionH - SECTION_TITLE_HEIGHT);
      drawEnemyKillsColumn(ctx, world, 0, w, killStackY + SECTION_TITLE_HEIGHT, sectionH - SECTION_TITLE_HEIGHT);
      drawCintamaniColumn(ctx, world, 0, w, cintamaniY + SECTION_TITLE_HEIGHT, sectionH - SECTION_TITLE_HEIGHT);

      drawSectionDividers(ctx, w, [statusY, killStackY, cintamaniY]);
    },
    // 타이틀/리더보드 열람 화면(아직 world 통계가 의미 없는 상태)에서 게임 캔버스의 배경과
    // 이어지도록 단색만 채운다 - 가죽 배경/구획 구분선 등 게임 중 전용 장식은 안 그린다.
    renderBlank() {
      ctx.fillStyle = TITLE_BG_COLOR;
      ctx.fillRect(0, 0, w, h);
    },
    // 일시정지 중 - render(world)로 평소대로 다 그린 위에 반투명 검은색을 덧씌워 어둡게 한다.
    // render/overlays.js의 renderPauseOverlay와 같은 어둡기(0.55)로 맞춘다.
    renderDimOverlay() {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(0, 0, w, h);
    },
    // merged=true: 타이틀/리더보드 열람 화면 - 게임 캔버스와 상태창 캔버스 사이 여백/경계선을
    // 없애 하나의 화면처럼 보이게 한다(css/style.css의 #play-area.merged 참고).
    // merged=false: 실제 플레이 중 - 원래대로 두 영역을 명확히 구분해서 보여준다.
    setMerged(merged) {
      if (merged) playArea.classList.add('merged');
      else playArea.classList.remove('merged');
    },
  };
}
