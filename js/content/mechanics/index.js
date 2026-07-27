// 새 포획/봉쇄류 메커니즘을 추가하려면: 새 파일에 { id, tick(world, outlineCells), suppressesSelfCollision }를
// export하고, 여기서 import + register 한 줄만 추가하면 된다. systems/collision.js는 이 레지스트리를
// 순회할 뿐, encirclement를 특별 취급하지 않는다.
import { createRegistry } from '../../core/registry.js';
import { encirclementMechanic } from './encirclement.js';

export const Mechanics = createRegistry();
Mechanics.register(encirclementMechanic.id, encirclementMechanic);
