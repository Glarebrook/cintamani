// 뱀의 머리가 상/하/좌/우 어디를 보고 있어도, 머리 기준 "상대적인" 몸 모양이 특정 패턴과
// 일치하는지 판정하는 회전 불변 패턴 매칭. 게임 로직에 의존하지 않는 순수 함수만 모아둔다
// (floodFill.js와 같은 위치의 이유) - content/cintamani/*.js가 여의주 스킬 발동 조건으로 쓴다.

const MARK = { BODY: '◼', HEAD: '►', EMPTY: '◻' };

// 패턴 문자열(줄바꿈으로 구분된 행, 한 글자 = 한 칸)을 파싱해서 머리 위치와 각 칸이 "몸이어야
// 하는지(mustOccupy:true)/비어있어야 하는지(false)"를 뽑아낸다. 패턴은 "머리가 오른쪽(+x)을
// 볼 때" 기준으로 그려진 것으로 간주한다 - matchesPattern()이 실제 머리 방향에 맞춰 회전시켜
// 대조한다.
export function parsePattern(text) {
  const rows = text
    .split('\n')
    .map(row => row.trim())
    .filter(row => row.length > 0);
  let headRow = -1;
  let headCol = -1;
  const cells = [];
  rows.forEach((row, r) => {
    [...row].forEach((ch, c) => {
      if (ch === MARK.HEAD) {
        headRow = r;
        headCol = c;
      } else if (ch === MARK.BODY) {
        cells.push({ row: r, col: c, mustOccupy: true });
      } else if (ch === MARK.EMPTY) {
        cells.push({ row: r, col: c, mustOccupy: false });
      }
      // 그 외 문자(공백 등)는 무시 - 패턴 문자열을 보기 좋게 들여쓰기해도 안전하게 하기 위함.
    });
  });
  if (headRow === -1) throw new Error('패턴에 머리(►) 표시가 없습니다');
  return { headRow, headCol, cells };
}

// parsePattern()의 결과가 (headX,headY)에 있고 dir 방향을 보고 있는 실제 머리를 기준으로
// 정확히 들어맞는지 확인한다. isOccupied(x,y)는 그 칸에 뱀 몸(머리 포함)이 있는지 알려주는
// 콜백 - 격자 밖 좌표에 대해 false(=비어있음)를 돌려주는 한, 격자 경계는 이 함수가 따로
// 신경 쓸 필요가 없다(mustOccupy:true 칸이 격자 밖으로 나가면 자연히 불일치로 처리됨).
//
// 회전 변환: 패턴은 "머리가 오른쪽을 볼 때" 기준이므로, forward축(전진 방향)=dir 그대로,
// right축(패턴의 세로 방향에 대응)=dir을 시계방향으로 90도 돌린 (-dir.y, dir.x)를 쓴다.
// 패턴 칸의 (row,col)을 머리 기준 상대좌표(forwardOffset=col-headCol, rightOffset=row-headRow,
// 머리보다 왼쪽/위쪽일수록 음수)로 바꾼 뒤, 실제 좌표 = 머리 + forward*forwardOffset +
// right*rightOffset로 계산한다.
export function matchesPattern(parsedPattern, headX, headY, dir, isOccupied) {
  const { headRow, headCol, cells } = parsedPattern;
  const rightX = -dir.y;
  const rightY = dir.x;
  for (const { row, col, mustOccupy } of cells) {
    const forwardOffset = col - headCol;
    const rightOffset = row - headRow;
    const x = headX + dir.x * forwardOffset + rightX * rightOffset;
    const y = headY + dir.y * forwardOffset + rightY * rightOffset;
    if (isOccupied(x, y) !== mustOccupy) return false;
  }
  return true;
}
