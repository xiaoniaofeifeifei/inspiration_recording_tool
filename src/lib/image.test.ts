import { describe, expect, it } from 'vitest';
import { computeTargetSize } from './image';

describe('computeTargetSize', () => {
  it('长边超过上限时按比例缩到上限', () => {
    expect(computeTargetSize(3200, 1600, 1600)).toEqual({ width: 1600, height: 800 });
    expect(computeTargetSize(1600, 3200, 1600)).toEqual({ width: 800, height: 1600 });
  });

  it('小图保持原尺寸', () => {
    expect(computeTargetSize(800, 600, 1600)).toEqual({ width: 800, height: 600 });
    expect(computeTargetSize(1600, 1600, 1600)).toEqual({ width: 1600, height: 1600 });
  });

  it('极端长条图不会被压成 0 像素', () => {
    const size = computeTargetSize(10_000, 12, 1600);
    expect(size.width).toBe(1600);
    expect(size.height).toBeGreaterThanOrEqual(1);
  });
});
