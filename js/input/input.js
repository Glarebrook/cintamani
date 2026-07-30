// 이동 입력 버퍼링 — V1의 Input IIFE를 그대로 포팅했었으나, 슬롯 하나짜리 pending이
// 한 틱(짧으면 40ms) 안에 두 번 이상 눌린 입력 중 마지막 것만 남기고 나머지를 조용히
// 버리는 문제(사용자 제보: 방향키 연타 시 입력이 씹힘)가 있어 짧은 큐로 교체했다.
const DIR = {
  ArrowUp:    { x:  0, y: -1 },
  ArrowDown:  { x:  0, y:  1 },
  ArrowLeft:  { x: -1, y:  0 },
  ArrowRight: { x:  1, y:  0 },
};

// 한 번에 이만큼만 선입력을 버퍼링한다 - 상한이 없으면, 예를 들어 화면과 무관하게 방향키를
// 마구 눌러둔 게 한참 뒤 엉뚱한 타이밍에 순차적으로 튀어나오는 것처럼 느껴질 수 있다.
const MAX_QUEUE = 2;

let queue = [];
let applied = { x: 1, y: 0 }; // 초기 방향: 오른쪽

function isReverse(a, b) {
  return a.x === -b.x && a.y === -b.y;
}

window.addEventListener('keydown', e => {
  const d = DIR[e.key];
  if (!d) return;
  e.preventDefault();
  // 역주행 방지 기준은 "마지막으로 적용된 방향(applied)"이 아니라 "큐에 이미 쌓여있는
  // 가장 최근 예약 방향"이어야 한다 - applied만 기준으로 삼으면, 아직 적용 전인 큐 속
  // 방향을 기준으로는 역주행인 입력이 (applied 기준으로는 역주행이 아니라서) 그대로
  // 통과해버릴 수 있다(예: 오른쪽 이동 중 위→왼쪽을 한 틱 안에 연달아 누르면, "왼쪽"은
  // 아직 적용 전인 "위" 기준으로는 역주행이 아니지만 그 다음 예약된 "위"가 적용된 직후
  // 몸이 위쪽으로 꺾인 상태이므로 왼쪽은 정상 회전이다 - 반대로 이 기준을 안 쓰면
  // 최신 큐 항목이 아니라 오래된 applied만 보고 잘못 막거나 잘못 통과시키게 된다).
  const reference = queue.length > 0 ? queue[queue.length - 1] : applied;
  if (isReverse(d, reference)) return;
  if (queue.length >= MAX_QUEUE) return; // 큐가 꽉 찼으면 더 받지 않는다(오래된 예약 유지)
  queue.push(d);
}, { passive: false });

export const Input = {
  // 틱 직전에 호출 — 큐에 쌓인 입력이 있으면 하나 꺼내 적용하고, 없으면 마지막 적용
  // 방향을 그대로 유지해서 반환한다.
  consume() {
    if (queue.length > 0) applied = queue.shift();
    return applied;
  },
  // 새 판이 시작될 때(states/playingState.js의 enter()) 호출 — 이전 판에서 남아있던 방향/큐를
  // 지우고 기본 방향(오른쪽)으로 되돌린다. Input은 world와 무관하게 페이지가 떠 있는 내내
  // 살아있는 싱글턴이라 world.reset()만으로는 절대 같이 초기화되지 않는다 - 이걸 안 하면,
  // 게임오버 화면 등에서 무심코 눌러둔 방향키가 다음 판 시작과 동시에(플레이어가 새로
  // 아무것도 안 눌렀는데도) 그대로 적용돼 예상치 못한 방향으로 돌진하다 죽는 문제가 있었다.
  reset() {
    queue = [];
    applied = { x: 1, y: 0 };
  },
};
