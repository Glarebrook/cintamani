const CELL_SIZE = 8;      // 격자 1칸 = 8픽셀 (정사각형 보장)
const GRID_W   = 100;     // 필드 가로 격자 수
const GRID_H   = 40;      // 필드 세로 격자 수
const TICK_MS  = 100;     // 뱀 이동 간격 (ms)
const FOOD_INTERVAL_MS = 2000; // 먹이 등장 간격 (ms)
const ENEMY_SPAWN_MIN_MS = 3000; // 적 최소 생성 간격 (ms)
const ENEMY_SPAWN_MAX_MS = 7000; // 적 최대 생성 간격 (ms)
const ENEMY_MAX_COUNT = 3; // 화면 최대 적 수
const PROJECTILE_SPEED = 60; // 투사체 이동 속도 (칸/초)
const PROJECTILE_DAMAGE = 1; // 투사체 공격력
const PROJECTILE_SIZE_RATIO = 0.4; // 뱀 도트 대비 투사체 크기 비율
const ENEMY_BASE_HP = 5; // 적 기본 체력
const ENEMY_SCALE = 3; // 적 보이는 크기와 피격 판정의 공통 배율
const ENEMY_CAPTURE_ZONE_SCALE = 5; // 파란색 적의 포획 범위(회색 배경) 배율 - 적 외곽선 기준
