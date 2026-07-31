// 뱀 몸통을 이어진 뱀 모양으로 그리기 위한 스프라이트시트 로더 - assets/snake/snake_spritesheet.png
// (assets/snake/snake_spritesheet_guide.md, 사용자가 제공한 원본 가이드 문서 참고). 4행×4열,
// 칸당 64×64px 그리드:
//   1행: 몸통 직선 (1~2열 = 가로, 완전히 동일한 이미지 / 3~4열 = 세로, 완전히 동일한 이미지)
//   2행: 머리 - 1열=동쪽(→), 2열=서쪽(←), 3열=북쪽(↑, 위에서 본 정수리뷰), 4열=남쪽(↓, 정수리뷰)
//   3행: 꼬리 - 머리와 똑같은 열 배치(1열=→, 2열=←, 3열=↑, 4열=↓)를 쓰되, 여기서 방향은
//        "꼬리 칸에서 바로 앞 칸(머리쪽 이웃)으로 가는 방향"이다(가이드 문서의 "진행 방향" =
//        스네이크 전체가 그 순간 향하던 방향이지, "꼬리 끝이 뾰족하게 가리키는 방향"이 아님 -
//        예: 계속 위(↑)로 이동 중이던 뱀은 꼬리가 몸통보다 아래(남쪽)에 남아있으므로, 꼬리에서
//        보면 앞 칸은 북쪽에 있다 - 이게 바로 3행3열=↑ 항목이 쓰이는 경우다). 처음 구현할 때
//        이 방향을 반대로(꼬리→그 앞 칸이 아니라 그 앞 칸→꼬리로) 계산해서 남/북이 뒤집히는
//        실수가 있었다 - render/layers.js의 resolveSpriteRect에서 prev-cur 순서를 꼭 확인할 것.
//   4행: 코너(꺾이는 구간) - 1열=남서(SW), 2열=북서(NW), 3열=북동(NE), 4열=남동(SE)
// render/statusIcons.js와 같은 "이미지 없으면 null, 호출부가 색깔 폴백" 패턴 - 헤드리스(jsc)
// 테스트 등 브라우저가 아닌 환경 방어를 위해 typeof Image !== 'undefined' 가드를 건다.
const TILE_SIZE = 64;
const SHEET_PATH = 'assets/snake/snake_spritesheet.png';

let sheet = null;
let loaded = false;
if (typeof Image !== 'undefined') {
  sheet = new Image();
  sheet.src = SHEET_PATH;
  sheet.onload = () => { loaded = true; };
  sheet.onerror = () => { loaded = false; };
}

function rect(row, col) {
  return { sx: col * TILE_SIZE, sy: row * TILE_SIZE, sw: TILE_SIZE, sh: TILE_SIZE };
}

const BODY_HORIZONTAL = rect(0, 0);
const BODY_VERTICAL = rect(0, 2);
const HEAD_BY_DIR = { E: rect(1, 0), W: rect(1, 1), N: rect(1, 2), S: rect(1, 3) };
// 머리와 열 배치가 같다(1열=E, 2열=W, 3열=N, 4열=S) - 위 모듈 설명 주석의 "진행 방향" 정의 참고.
const TAIL_BY_DIR = { E: rect(2, 0), W: rect(2, 1), N: rect(2, 2), S: rect(2, 3) };
// 정렬된 두 방향 쌍(직선 제외) -> 코너 타일. 직선(EW/NS)은 getBodyRect()가 먼저 걸러내므로
// 이 표에는 실제 코너 4가지만 둔다.
const CORNER_BY_KEY = { SW: rect(3, 0), NW: rect(3, 1), EN: rect(3, 2), ES: rect(3, 3) };

// 이 스프라이트시트가 로딩 완료됐으면 Image 엘리먼트를, 아니면 null을 돌려준다 - 호출부
// (render/layers.js의 snakeLayer)는 null이면 기존 색깔 사각형 렌더링으로 폴백한다.
export function getSnakeSpriteSheet() {
  return loaded ? sheet : null;
}

export function getHeadRect(dir) {
  return HEAD_BY_DIR[dir] ?? BODY_HORIZONTAL;
}

export function getTailRect(dir) {
  return TAIL_BY_DIR[dir] ?? BODY_HORIZONTAL;
}

// dirToPrev/dirToNext: 이 칸에서 각각 머리쪽/꼬리쪽 이웃으로 가는 방향('N'|'S'|'E'|'W').
// 마주보는 방향(직선 구간)이면 몸통 직선을, 꺾이는 지점이면 해당 코너 타일을 돌려준다.
export function getBodyRect(dirToPrev, dirToNext) {
  if ((dirToPrev === 'E' && dirToNext === 'W') || (dirToPrev === 'W' && dirToNext === 'E')) return BODY_HORIZONTAL;
  if ((dirToPrev === 'N' && dirToNext === 'S') || (dirToPrev === 'S' && dirToNext === 'N')) return BODY_VERTICAL;
  const key = [dirToPrev, dirToNext].sort().join('');
  return CORNER_BY_KEY[key] ?? BODY_HORIZONTAL;
}

// {dx,dy}(뱀은 대각선 이동이 없어 항상 -1/0/1 중 한 축만 값을 가짐) -> 방향 문자.
export function dirFromDelta(dx, dy) {
  if (dx === 1) return 'E';
  if (dx === -1) return 'W';
  if (dy === 1) return 'S';
  if (dy === -1) return 'N';
  return null;
}
