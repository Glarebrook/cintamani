// 게임 캔버스 아래 별도의 캔버스(#status-canvas)에 그리는 하단 상태창 - 가로 4열:
// 1열 뱀 기본 스테이터스(속도/길이/독침 데미지), 2열 적1~5 이번 판 킬 스택(이미지+수치),
// 3열 여의주(cintamani) 4종 2x2(이미지+개수, 아직 게임에 없는 개념이라 항상 0), 4열은 향후
// 확장을 위해 지금은 비워둠. hud.js(DOM 통계 바)와 같은 "게임 캔버스와는 분리된 자기만의
// 캔버스" 패턴. 코드 상 식별자는 "여의주"의 음역(yeouiju)이 아니라 "cintamani"(여의주의
// 산스크리트/영문 명칭, 이 게임 이름과 동일)를 쓴다 - 표기가 두 개로 갈리면 나중에 헷갈릴 수
// 있어서 게임 제목과 통일했다.
import { GRID_W, CELL_SIZE, STATUS_PANEL_HEIGHT } from '../config/constants.js';
import { getDisplaySpeedLevel } from '../core/speedLevel.js';
import { EnemyTypes } from '../content/enemies/index.js';
import { getEnemyIcon, getCintamaniIcon, drawIcon } from './statusIcons.js';

const BG_COLOR = '#d9b98a';                 // 밝은 가죽색
const PATTERN_COLOR = 'rgba(92, 67, 38, 0.28)'; // 배경의 짙은 갈색 가는 선(가죽 질감)
const DIVIDER_COLOR = '#5c4326';            // 열 구분선
const TEXT_COLOR = '#4a2f18';

const CINTAMANI_ORDER = ['red', 'blue', 'green', 'yellow'];
const CINTAMANI_COLOR = {
  red: '#c0392b',
  blue: '#2f6fb0',
  green: '#2f8f4e',
  yellow: '#d4a017',
};

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

function drawColumnDividers(ctx, w, h, columnWidth) {
  ctx.strokeStyle = DIVIDER_COLOR;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 1; i < 4; i++) {
    const x = Math.round(columnWidth * i) + 0.5; // 반픽셀 보정 - 1px 선이 흐리게 안 번지도록
    ctx.moveTo(x, 4);
    ctx.lineTo(x, h - 4);
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

// 1열 - 뱀 기본 스테이터스: 속도/길이/독침(투사체) 데미지.
function drawSnakeStatsColumn(ctx, world, x, columnWidth, h) {
  const cx = x + columnWidth / 2;
  const rows = [
    `속도 ${getDisplaySpeedLevel(world.stats.tickMs)}`,
    `길이 ${world.snake.segments.length}`,
    `독침 데미지 ${world.stats.attackDamage}`,
  ];
  ctx.fillStyle = TEXT_COLOR;
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const rowHeight = h / rows.length;
  rows.forEach((text, i) => {
    ctx.fillText(text, cx, rowHeight * i + rowHeight / 2);
  });
}

// 2열 - 적1~5 이번 판 킬 스택. world.stats.killsByType는 판마다 리셋되는 이번 판 전적이다
// (game.js의 world.reset() 참고) - 여러 판에 걸친 영구 누적은 지금은 하지 않는다.
function drawEnemyKillsColumn(ctx, world, x, columnWidth, h) {
  const ids = EnemyTypes.all().map(def => def.id).sort((a, b) => a - b);
  const slotWidth = columnWidth / ids.length;
  const iconRadius = 12;
  const iconCy = h * 0.36;
  const textCy = h * 0.74;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const slotCx = x + slotWidth * i + slotWidth / 2;
    const def = EnemyTypes.get(id);
    drawIconOrFallback(ctx, getEnemyIcon(id), slotCx, iconCy, iconRadius, def.color);

    ctx.fillStyle = TEXT_COLOR;
    ctx.font = 'bold 11px monospace';
    const count = world.stats.killsByType[id] || 0;
    ctx.fillText(String(count), slotCx, textCy);
  }
}

// 3열 - 여의주(cintamani) 4종, 2x2 배치. world.stats.cintamani는 아직 게임에 없는 개념이라
// 항상 0 - 자리만 미리 잡아둔 것(game.js 참고).
function drawCintamaniColumn(ctx, world, x, columnWidth, h) {
  const cellW = columnWidth / 2;
  const cellH = h / 2;
  const iconRadius = 12;

  ctx.textBaseline = 'middle';
  for (let i = 0; i < CINTAMANI_ORDER.length; i++) {
    const key = CINTAMANI_ORDER[i];
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cellCx = x + cellW * col + cellW / 2;
    const cellCy = cellH * row + cellH / 2;
    const iconCx = cellCx - 18;

    drawIconOrFallback(ctx, getCintamaniIcon(key), iconCx, cellCy, iconRadius, CINTAMANI_COLOR[key]);

    ctx.fillStyle = TEXT_COLOR;
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`×${world.stats.cintamani[key]}`, iconCx + iconRadius + 6, cellCy);
  }
}

// render/overlays.js의 renderTitleScreen/renderLeaderboardViewBackground가 쓰는 배경색과
// 반드시 같아야 한다 - 합쳐진 모드에서 두 캔버스가 이어진 하나의 화면처럼 보이려면 두 캔버스의
// 배경색이 정확히 일치해야 하기 때문(공유 상수로 뽑기엔 이 한 곳 값만 맞으면 되는 정도라 과함).
const TITLE_BG_COLOR = '#111111';

export function createStatusPanel() {
  const canvas = document.getElementById('status-canvas');
  const ctx = canvas.getContext('2d');
  const playArea = document.getElementById('play-area');
  const w = GRID_W * CELL_SIZE;
  const h = STATUS_PANEL_HEIGHT;
  const columnWidth = w / 4;

  return {
    render(world) {
      drawBackground(ctx, w, h);
      drawSnakeStatsColumn(ctx, world, 0, columnWidth, h);
      drawEnemyKillsColumn(ctx, world, columnWidth, columnWidth, h);
      drawCintamaniColumn(ctx, world, columnWidth * 2, columnWidth, h);
      // 4열(x = columnWidth*3 ~ columnWidth*4)은 지금은 배경만 두고 비워둔다 - 향후 확장 예정.
      drawColumnDividers(ctx, w, h, columnWidth);
    },
    // 타이틀/리더보드 열람 화면(아직 world 통계가 의미 없는 상태)에서 게임 캔버스의 배경과
    // 이어지도록 단색만 채운다 - 가죽 배경/열 구분선 등 게임 중 전용 장식은 안 그린다.
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
