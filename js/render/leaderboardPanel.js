import { LEADERBOARD_NAME_MAX_LENGTH } from '../config/constants.js';

function formatScore(score) {
  return `${Math.round(score).toLocaleString()}점`;
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
// 화면까지 공유하는 DOM 컨트롤러 — 캔버스 렌더러와는 분리된 별도 DOM 계층이다. 실제
// <input>을 쓰는 이 코드베이스 최초의 텍스트 입력 UI(한글 이름을 IME로 정상 입력하려면
// 캔버스 자체 구현이 아니라 진짜 <input>이 필요).
//
// game.js가 이 패널을 딱 한 번만 만들어서(statusPanel과 동일한 패턴) gameOverState와
// leaderboardViewState 둘 다에 넘겨준다 — DOM 엘리먼트가 하나뿐이라 두 번 생성하면
// submit/click 리스너가 중복 등록된다. 제출/건너뛰기 핸들러는 생성 시점이 아니라
// setHandlers()로 나중에 꽂는다 - 실제로 폼을 보여주는 건 gameOverState뿐이고
// (leaderboardViewState는 showResultPhase만 써서 폼 자체를 항상 숨겨두므로 핸들러가
// 잘못 걸려도 사용자가 트리거할 방법이 없지만), 그래도 소유권을 명확히 하기 위함이다.
export function createLeaderboardPanel() {
  const overlay = document.getElementById('leaderboard-overlay');
  // 패치5: 점수 명세서+이름 입력 폼을 묶는 상단 구획 전체를 한 덩어리로 보이거나 숨긴다 -
  // 예전엔 form 하나만 숨겼었는데(점수 명세서는 그 안에 같이 들어있었음), 이제 점수 명세서와
  // 입력 폼이 상단에서 좌/우로 나뉜 형제 요소라 form만 숨기면 점수 명세서가 결과 단계에도
  // 계속 남아있게 된다.
  const topSection = document.getElementById('leaderboard-top');
  const form = document.getElementById('leaderboard-form');
  const myScoreTotal = document.getElementById('my-score-total');
  const myScoreBreakdown = document.getElementById('my-score-breakdown');
  const myScoreBonusDetail = document.getElementById('my-score-bonus-detail');
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

  // ul을 비우고 text 배열을 한 줄씩 <li>로 채운다 - "A + B + C"처럼 문장으로 잇지 않고
  // 영수증처럼 항목마다 줄바꿈해서 한눈에 훑어볼 수 있게 한다(가시성 피드백으로 변경).
  function renderBulletList(ul, lines) {
    ul.textContent = '';
    for (const text of lines) {
      const li = document.createElement('li');
      li.textContent = text;
      ul.appendChild(li);
    }
  }

  // 기록 하나당 한 줄 - 이름/기록은 눈에 잘 띄게 크게, 타임스탬프는 부가정보로 작게.
  function renderList(entries, mineIndex) {
    list.textContent = '';
    entries.forEach((entry, i) => {
      const li = document.createElement('li');
      if (i === mineIndex) li.className = 'mine';

      const rank = document.createElement('span');
      rank.className = 'leaderboard-name';
      rank.textContent = `${i + 1}. ${entry.name}`;
      const record = document.createElement('span');
      record.className = 'leaderboard-record';
      // score 없는 예전 기록은 서버(api/leaderboard.php)가 GET 응답 시점에 생존시간 기준으로
      // 환산해서 항상 채워 보내주므로, 여기서 survivalMs로 폴백할 필요가 없다.
      record.textContent = formatScore(entry.score);
      const date = document.createElement('span');
      date.className = 'leaderboard-date';
      date.textContent = formatTimestamp(entry.ts);

      li.appendChild(rank);
      li.appendChild(record);
      li.appendChild(date);
      list.appendChild(li);
    });
  }

  return {
    setHandlers(next) { handlers = next; },
    show() { overlay.classList.remove('hidden'); },
    hide() { overlay.classList.add('hidden'); },
    // survivalMs: 이번 판 기록 - 등록할지 말지 판단하려면 기존 순위표와 비교해볼 수 있게
    // 눈에 띄게 보여줘야 한다는 피드백으로 추가. scoreBreakdown(core/score.js의
    // getScoreBreakdown 결과)은 그 최종 점수가 어떻게 나왔는지(생존/처치/아이템/가산점) 항목별로
    // 보여주기 위함. leaderboardViewState는 특정 판의 기록이 없으므로 둘 다 안 넘기고,
    // 그 경우 자리를 비워둔다(showResultPhase는 별개로 폼 자체를 숨기므로 이 텍스트도 같이
    // 안 보이게 됨).
    showEntryPhase(entries, survivalMs, scoreBreakdown) {
      topSection.classList.remove('hidden');
      footer.textContent = '';
      if (scoreBreakdown) {
        const r = Math.round;
        myScoreTotal.textContent = `이번 기록: ${r(scoreBreakdown.total).toLocaleString()}점`;
        renderBulletList(myScoreBreakdown, [
          `· 생존 ${r(scoreBreakdown.survival)}점`,
          `· 아이템획득 ${r(scoreBreakdown.item)}점`,
          `· 적 처치 ${r(scoreBreakdown.kill)}점`,
          `· 가산점 ${r(scoreBreakdown.bonus)}점`,
        ]);
        // 가산점 세부는 위 "가산점" 한 줄을 풀어서 보여주는 하위 항목이라, 별도 목록으로
        // 들여쓰기해서(css) 시각적으로 그 아래에 딸린 항목임을 나타낸다.
        renderBulletList(myScoreBonusDetail, [
          `– 최대 길이 +${r(scoreBreakdown.lengthBonus)}점`,
          `– 최대 속도 +${r(scoreBreakdown.speedBonus)}점`,
        ]);
      } else {
        myScoreTotal.textContent = '';
        renderBulletList(myScoreBreakdown, []);
        renderBulletList(myScoreBonusDetail, []);
      }
      nameInput.value = '';
      renderList(entries, -1);
      nameInput.focus();
    },
    // 결과 단계(게임오버 후 등록/건너뛰기 완료)와 순위 열람 전용 화면(타이틀에서 진입)이
    // 시각적으로 동일해서 - 폼 숨김 + 목록 + "ENTER - 타이틀로" - 하나로 공유한다.
    showResultPhase(entries, mineIndex) {
      topSection.classList.add('hidden');
      footer.textContent = 'ENTER - 타이틀로';
      renderList(entries, mineIndex);
    },
  };
}
