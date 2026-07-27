export const CELL_SIZE = 8;      // 격자 1칸 = 8픽셀 (정사각형 보장)
export const GRID_W   = 100;     // 필드 가로 격자 수
export const GRID_H   = 40;      // 필드 세로 격자 수
export const TICK_MS  = 100;     // 뱀 이동 간격 (ms)
export const FOOD_INTERVAL_MS = 2000; // 먹이 등장 간격 (ms)
export const FOOD_MAX_COUNT = 10; // 화면 최대 먹이 수
export const ENEMY_SPAWN_MIN_MS = 3000; // 적 최소 생성 간격 (ms)
export const ENEMY_SPAWN_MAX_MS = 7000; // 적 최대 생성 간격 (ms)
export const PROJECTILE_SPEED = 60; // 투사체 이동 속도 (칸/초)
export const PROJECTILE_DAMAGE = 1; // 투사체 공격력
export const PROJECTILE_SIZE_RATIO = 0.4; // 뱀 도트 대비 투사체 크기 비율
export const ENEMY_BASE_HP = 5; // 적 기본 체력
export const ENEMY_SCALE = 3; // 적 보이는 크기와 피격 판정의 공통 배율
export const ENEMY_CAPTURE_ZONE_SCALE = 5; // 파란색 적의 포획 범위(회색 배경) 배율 - 적 외곽선 기준

// 화면 우측 하단에 표시되는 빌드 표시 — index.html의 캐시 무효화 ?v= 값과 항상 같이 올린다.
// 코드를 바꿀 때마다 갱신해서, 새로고침한 화면이 실제로 최신 코드인지 눈으로 바로 확인할 수 있게 한다.
export const BUILD_VERSION = '20260727-7';
