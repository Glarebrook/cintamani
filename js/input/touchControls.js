// 모바일(터치 우선 기기) 접속 시에만 화면 위에 반투명 버튼 오버레이를 띄운다. 버튼은 게임
// 로직을 직접 건드리지 않고, 진짜 키보드를 누른 것처럼 KeyboardEvent를 window에 그대로
// 발사(dispatch)하기만 한다 - input/input.js(방향키), input/actions.js(Enter/t/l),
// states/playingState.js의 onSpaceDown/onSpaceUp(스페이스바, keydown/keyup 둘 다 씀 -
// 비늘파동 충전 시간이 눌렀다 뗀 실제 간격으로 측정되므로)이 전부 이미 window의 keydown/keyup을
// 듣고 있어서, 이 모듈은 그 위에 아무 것도 새로 만들 필요가 없다 - 그냥 "이 키가 눌렸다고
// 쳐줘"라고 흉내만 낸다.
const KEY_MAP = {
  'touch-up': { key: 'ArrowUp', code: 'ArrowUp' },
  'touch-down': { key: 'ArrowDown', code: 'ArrowDown' },
  'touch-left': { key: 'ArrowLeft', code: 'ArrowLeft' },
  'touch-right': { key: 'ArrowRight', code: 'ArrowRight' },
  'touch-enter': { key: 'Enter', code: 'Enter' },
  'touch-t': { key: 't', code: 'KeyT' },
  'touch-l': { key: 'l', code: 'KeyL' },
  'touch-space': { key: ' ', code: 'Space' },
  'touch-p': { key: 'p', code: 'KeyP' },
};

// 화면(상태)마다 실제로 쓰이는 액션 버튼만 다르다 - 타이틀에선 T/L이 필요하고 게임 중엔
// 필요 없어지는 대신 P(일시정지)가 필요해지는 식. 방향키(십자패드)는 상태와 무관하게 항상
// 표시한다 - 안 쓰이는 화면에서 눌러도 해가 없어서 굳이 상태별로 가릴 필요가 없다.
const ACTION_BUTTON_IDS = ['touch-t', 'touch-l', 'touch-enter', 'touch-space', 'touch-p'];

// pointer:coarse(마우스처럼 정밀한 입력장치가 없다는 뜻 - 터치가 주 입력수단인 기기의 표준
// 신호)를 우선 쓰고, 이걸 지원 안 하는 구형 브라우저를 위해 ontouchstart 유무도 같이 본다.
// User-Agent 문자열을 직접 파싱하지 않는 이유: 기기/브라우저마다 문자열이 계속 바뀌어서
// 깨지기 쉽고, pointer:coarse가 표준 기반이라 더 안정적이다.
function isTouchPrimaryDevice() {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return true;
  return 'ontouchstart' in window;
}

function dispatchKey(type, spec) {
  window.dispatchEvent(new KeyboardEvent(type, { key: spec.key, code: spec.code, bubbles: true }));
}

export function createTouchControls() {
  const root = document.getElementById('touch-controls');
  if (!root || !isTouchPrimaryDevice()) return; // 데스크톱 등에서는 그냥 숨김 상태로 둔다

  root.classList.remove('hidden');

  for (const [id, spec] of Object.entries(KEY_MAP)) {
    const btn = document.getElementById(id);
    if (!btn) continue;
    const down = e => { e.preventDefault(); dispatchKey('keydown', spec); };
    const up = e => { e.preventDefault(); dispatchKey('keyup', spec); };
    btn.addEventListener('touchstart', down, { passive: false });
    btn.addEventListener('touchend', up, { passive: false });
    // 버튼 위에서 손가락이 미끄러져 나가는 등 touchend 없이 끝나는 경우의 방어책 - 특히
    // 스페이스바는 keyup 누락 시 비늘파동 충전이 계속 진행 중인 것처럼 멈춰버릴 수 있다.
    btn.addEventListener('touchcancel', up, { passive: false });
  }
}

// states/*.js가 각자의 enter()에서 호출해서, 그 화면에 실제로 필요한 액션 버튼만 보이게
// 한다(hud/statusPanel을 각 상태가 직접 다루는 것과 같은 패턴). document가 없는 헤드리스
// 테스트 환경에서도 각 상태의 enter()가 그대로 호출되므로 방어적으로 처리한다. 오버레이
// 자체가 숨겨진(데스크톱) 상태에서 호출돼도 그냥 아무 효과 없이 안전하다.
export function setTouchActionButtons(visibleIds) {
  if (typeof document === 'undefined') return;
  for (const id of ACTION_BUTTON_IDS) {
    const btn = document.getElementById(id);
    if (!btn) continue;
    btn.style.display = visibleIds.includes(id) ? '' : 'none';
  }
}
