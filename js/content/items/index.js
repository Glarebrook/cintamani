// 새 아이템 타입을 추가하려면: 새 파일에 def를 export하고, 여기서 import + register 한 줄만 추가하면 된다.
import { createRegistry } from '../../core/registry.js';
import { foodItem } from './food.js';

export const ItemTypes = createRegistry();
ItemTypes.register(foodItem.id, foodItem);
