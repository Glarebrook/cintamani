import { layers } from './layers.js';

export function render(ctx, world) {
  for (const layer of layers) {
    layer(ctx, world);
  }
}
