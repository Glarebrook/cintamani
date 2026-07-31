import { BUILD_VERSION, UPDATE_CHECK_INTERVAL_MS } from '../config/constants.js';

// NAS에 새 파일을 올려도 이미 켜져 있는 브라우저 탭은 그 사실을 알 방법이 없다 - 한번 로드된
// 페이지는 그 뒤로 서버 상태와 완전히 무관하게 메모리 안에서만 돈다(유저가 직접 새로고침하지
// 않는 한 계속 옛날 코드로 실행됨, 실제로 보고된 문제). 이 모듈은 주기적으로 index.html을
// 다시 받아와서 그 안의 main.js?v=... 문자열(캐시 무효화용 버전, BUILD_VERSION과 항상 같은 값
// - CLAUDE.md 참고)을 지금 실행 중인 BUILD_VERSION과 비교하고, 다르면 자동으로 새로고침한다.
// index.html을 통째로 다시 받는 이유: 별도 버전 파일을 새로 만들면 배포 때 챙겨야 할 파일이
// 하나 더 늘어나지만(지금도 BUILD_VERSION/?v= 두 곳을 매번 같이 올려야 함), index.html은
// 이미 그 값을 담고 있는 파일이라 새로 만들 필요가 없다.
function extractVersion(html) {
  const match = html.match(/main\.js\?v=([^"']+)/);
  return match ? match[1] : null;
}

// fetch에 cache: 'no-store'를 반드시 줘야 한다 - 이 요청 자체가 브라우저 캐시에서 옛날
// index.html을 돌려받으면 버전 비교가 항상 "최신"으로 잘못 나와서 체크가 있으나 마나 해진다.
async function checkOnce() {
  try {
    const res = await fetch(`index.html?_updateCheck=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return;
    const html = await res.text();
    const serverVersion = extractVersion(html);
    if (serverVersion && serverVersion !== BUILD_VERSION) {
      window.location.reload();
    }
  } catch (e) {
    // NAS가 잠깐 응답 없거나 네트워크 문제 - 화면에 아무 영향 없이 다음 주기에 다시 시도.
  }
}

// states/titleState.js가 enter()/exit()에서 start()/stop()을 직접 호출한다 - 플레이 중에는
// 절대 새로고침되면 안 되므로(진행 중인 판이 날아감), 대기(타이틀) 화면에 있는 동안만 켜둔다.
export function createUpdateChecker() {
  let timerId = null;
  return {
    // start() 호출 즉시 한 번 바로 체크한다 - 대부분의 유저는 타이틀 화면에 60초씩 머물지
    // 않고 금방 게임을 시작하므로, 간격 타이머만 있으면 사실상 거의 발동하지 않는다.
    // 실제로 체크가 의미 있으려면 "타이틀로 돌아올 때마다"(게임오버 → 타이틀 등 포함) 확인해야
    // 해서, enter()마다 즉시 1회 + 그래도 타이틀 화면에 오래 멈춰있는 경우를 위한 백업으로
    // UPDATE_CHECK_INTERVAL_MS 간격 반복 체크를 같이 둔다.
    start() {
      if (timerId !== null) return; // 이미 실행 중이면 중복 시작 방지
      checkOnce();
      timerId = setInterval(checkOnce, UPDATE_CHECK_INTERVAL_MS);
    },
    stop() {
      if (timerId === null) return;
      clearInterval(timerId);
      timerId = null;
    },
  };
}
