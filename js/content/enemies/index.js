// 새 적 타입을 추가하려면: 새 파일에 config 객체를 export하고, 여기서 import + register 한 줄만 추가하면 된다.
// managers/enemyManager.js는 이 레지스트리를 통해서만 적 타입을 알게 되므로, 특정 type id를 하드코딩하지 않는다.
import { createRegistry } from '../../core/registry.js';
import { basicEnemy } from './basic.js';
import { sentinelEnemy } from './sentinel.js';
import { chaserEnemy } from './chaser.js';
import { turretEnemy } from './turret.js';

export const EnemyTypes = createRegistry();
EnemyTypes.register(basicEnemy.id, basicEnemy);
EnemyTypes.register(sentinelEnemy.id, sentinelEnemy);
EnemyTypes.register(chaserEnemy.id, chaserEnemy);
EnemyTypes.register(turretEnemy.id, turretEnemy);
