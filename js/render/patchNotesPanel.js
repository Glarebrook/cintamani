import { PATCH_NOTES } from '../config/patchNotes.js';

// 타이틀 화면 우측의 패치노트 패널 - 실제 <input>/스크롤이 필요한 리더보드 패널과 같은
// "캔버스 렌더러와 분리된 DOM 컨트롤러" 패턴이다. game.js가 한 번만 만들어서 titleState에
// 넘겨준다(다른 상태는 이 패널을 쓰지 않으므로 넘길 필요 없음).
export function createPatchNotesPanel() {
  const overlay = document.getElementById('patch-notes-overlay');
  const list = document.getElementById('patch-notes-list');

  // patchNotes.js 내용은 정적 데이터라 매 프레임 다시 그릴 필요가 없다(캔버스 레이어들과
  // 다른 점) - 모듈이 로드되는 시점에 한 번만 DOM을 채워두면, 이후 스크롤 등은 브라우저가
  // 알아서 처리한다. visible:false인 항목은 목록에서 제외한다(config/patchNotes.js 참고 -
  // "이 버전은 사용자에게 노출하지 마" 같은 지시를 받았을 때 그 항목만 끄기 위한 속성).
  function populate() {
    list.textContent = '';
    for (const entry of PATCH_NOTES) {
      if (entry.visible === false) continue;

      const wrapper = document.createElement('div');
      wrapper.className = 'patch-note-entry';

      const version = document.createElement('div');
      version.className = 'patch-note-version';
      version.textContent = `v${entry.version}`;

      const meta = document.createElement('div');
      meta.className = 'patch-note-meta';
      meta.textContent = entry.datetime;

      const lines = document.createElement('ul');
      lines.className = 'patch-note-lines';
      for (const line of entry.lines) {
        const li = document.createElement('li');
        li.textContent = `· ${line}`;
        lines.appendChild(li);
      }

      wrapper.appendChild(version);
      wrapper.appendChild(meta);
      wrapper.appendChild(lines);
      list.appendChild(wrapper);
    }
  }

  populate();

  return {
    show() { overlay.classList.remove('hidden'); },
    hide() { overlay.classList.add('hidden'); },
  };
}
