// 새 여의주 색상을 추가하려면: 새 파일에 def를 export하고, 여기서 import + register 한 줄만
// 추가하면 된다(green은 아직 패턴/효과가 확정되지 않아 미등록 - 확정되면 이 파일에 한 줄만 추가).
import { createRegistry } from '../../core/registry.js';
import { redCintamani } from './red.js';
import { blueCintamani } from './blue.js';

export const CintamaniTypes = createRegistry();
CintamaniTypes.register(redCintamani.id, redCintamani);
CintamaniTypes.register(blueCintamani.id, blueCintamani);
