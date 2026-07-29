import { LEADERBOARD_NAME_MAX_LENGTH } from '../config/constants.js';

function formatSeconds(survivalMs) {
  return `${(survivalMs / 1000).toFixed(1)}s`;
}

// api/leaderboard.php가 각 기록에 남기는 ts(초 단위 유닉스 타임스탬프)를 로컬 시간대의
// 연월일시분초로 표시한다 - 서버는 timezone 개념 없이 서버 자체 시계로 time()만 찍으므로,
// "몇 시에 세웠는지"를 사람이 보기 좋은 형태로 바꾸는 건 클라이언트 쪽 몫이다.
function formatTimestamp(ts) {
  const d = new Date(ts * 1000);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} `
    + `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// 게임오버 화면의 이름 입력 + 리더보드 표시, 그리고 타이틀 화면에서 진입하는 순위 열람 전용
// 화면까지 공유하는 DOM 컨트롤러 — hud.js와 같은 이유로 캔버스 렌더러와 분리한다. 실제
// <input>을 쓰는 이 코드베이스 최초의 텍스트 입력 UI(한글 이름을 IME로 정상 입력하려면
// 캔버스 자체 구현이 아니라 진짜 <input>이 필요).
//
// game.js가 이 패널을 딱 한 번만 만들어서(hud와 동일한 패턴) gameOverState와
// leaderboardViewState 둘 다에 넘겨준다 — DOM 엘리먼트가 하나뿐이라 두 번 생성하면
// submit/click 리스너가 중복 등록된다. 제출/건너뛰기 핸들러는 생성 시점이 아니라
// setHandlers()로 나중에 꽂는다 - 실제로 폼을 보여주는 건 gameOverState뿐이고
// (leaderboardViewState는 showResultPhase만 써서 폼 자체를 항상 숨겨두므로 핸들러가
// 잘못 걸려도 사용자가 트리거할 방법이 없지만), 그래도 소유권을 명확히 하기 위함이다.
export function createLeaderboardPanel() {
  const overlay = document.getElementById('leaderboard-overlay');
  const form = document.getElementById('leaderboard-form');
  const nameInput = document.getElementById('leaderboard-name-input');
  const skipBtn = document.getElementById('leaderboard-skip-btn');
  const list = document.getElementById('leaderboard-list');
  const footer = document.getElementById('leaderboard-footer');

  nameInput.maxLength = LEADERBOARD_NAME_MAX_LENGTH;

  let handlers = {};

  // form submit이 Enter를 이 안에서만 처리 — input/actions.js의 전역 Enter 바인딩은
  // gameOverState가 결과 화면으로 넘어간 뒤에야 걸리므로, 이름 입력 중에는 서로 충돌하지 않는다.
  form.addEventListener('submit', e => {
    e.preventDefault();
    handlers.onSubmit?.(nameInput.value.trim());
  });
  skipBtn.addEventListener('click', () => handlers.onSkip?.());

  function renderList(entries, mineIndex) {
    list.textContent = '';
    entries.forEach((entry, i) => {
      const li = document.createElement('li');
      if (i === mineIndex) li.className = 'mine';

      const row = document.createElement('div');
      row.className = 'leaderboard-row';
      const rank = document.createElement('span');
      rank.className = 'leaderboard-name';
      rank.textContent = `${i + 1}. ${entry.name}`;
      const time = document.createElement('span');
      time.textContent = formatSeconds(entry.survivalMs);
      row.appendChild(rank);
      row.appendChild(time);

      const date = document.createElement('div');
      date.className = 'leaderboard-date';
      date.textContent = formatTimestamp(entry.ts);

      li.appendChild(row);
      li.appendChild(date);
      list.appendChild(li);
    });
  }

  return {
    setHandlers(next) { handlers = next; },
    show() { overlay.classList.remove('hidden'); },
    hide() { overlay.classList.add('hidden'); },
    showEntryPhase(entries) {
      form.classList.remove('hidden');
      footer.textContent = '';
      nameInput.value = '';
      renderList(entries, -1);
      nameInput.focus();
    },
    // 결과 단계(게임오버 후 등록/건너뛰기 완료)와 순위 열람 전용 화면(타이틀에서 진입)이
    // 시각적으로 동일해서 - 폼 숨김 + 목록 + "ENTER - 타이틀로" - 하나로 공유한다.
    showResultPhase(entries, mineIndex) {
      form.classList.add('hidden');
      footer.textContent = 'ENTER - 타이틀로';
      renderList(entries, mineIndex);
    },
  };
}
