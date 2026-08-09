// 테스트 모드 "빌드 선택" 화면(states/testBuildSelectState.js)에서 고를 수 있는 실험 후보
// 목록 - patchNotes.js와 같은 정신으로, 새 실험을 추가하려면 이 배열에 항목 하나만 추가하면
// 된다. 테스트 모드의 공통 기본값(시작 길이 TEST_MODE_INITIAL_LENGTH, 속도
// TEST_MODE_TICK_MS, 1/2/3 여의주 디버그 키 등)은 모든 빌드에서 그대로 유지되고, 여기 적은
// overrides만 그 위에 한 번 더 덮어써진다(game.js의 world.reset 참고) - "baseline"처럼
// overrides가 비어 있으면 순수 테스트 모드 기본값 그대로 플레이하게 된다.
//
// - statsOverrides: world.stats의 필드를 덮어쓴다(예: 몹 생성 간격) - 키 이름이
//   world.stats의 실제 필드 이름과 정확히 일치해야 한다.
// - viewportOverrides: 화면 배율/시야(core/viewportConfig.js가 관리)를 덮어쓴다. 캔버스
//   실제 픽셀 크기(main.js가 페이지 로딩 시 한 번 고정하는 값, 현재 768x576)는 안 바뀌므로,
//   여기 넣는 값은 항상 viewportCols*8*cameraZoom === 768, viewportRows*8*cameraZoom === 576이
//   되도록 맞춰야 한다(core/viewportConfig.js 참고) - 안 맞으면 캔버스 크기와 그려지는 필드
//   범위가 어긋나 보인다.
export const TEST_BUILDS = [
  {
    id: 'baseline',
    version: '기본값',
    description: '실험 없이 테스트 모드 기본값 그대로',
    statsOverrides: {},
    viewportOverrides: {},
  },
  {
    id: 'passthrough-grace-buffer',
    version: '실험: 포획 후 무적 버퍼',
    description: '적을 감싸서 없앤 뒤 3틱 동안은 고리 안 어디를 밟든 상관없이 몸에 부딪혀도 안 죽음(무적 상태는 뱀 전체가 반투명 흰색/골드로 표시됨)',
    statsOverrides: {
      passThroughGraceTicks: 3,
    },
    viewportOverrides: {},
  },
  {
    id: 'wide-view',
    version: '실험: 시야 확대',
    description: '화면 배율을 낮춰 더 넓은 범위가 한눈에 보이도록 함',
    statsOverrides: {},
    viewportOverrides: {
      cameraZoom: 1,
      viewportCols: 96,
      viewportRows: 72,
    },
  },
];
