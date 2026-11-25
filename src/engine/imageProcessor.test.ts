import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCssFilterString,
  buildOutputFilename,
  computeCropRectForAspect,
  computeOutputDimensions,
  computeWatermarkCenter,
  getOrientedDimensions,
} from './imageProcessor.ts';
import { DEFAULT_COLOR_SETTINGS } from '../types/editor.ts';

test('getOrientedDimensions swaps width and height on 90/270 rotation', () => {
  assert.deepEqual(getOrientedDimensions(1600, 900, 0), { width: 1600, height: 900 });
  assert.deepEqual(getOrientedDimensions(1600, 900, 90), { width: 900, height: 1600 });
  assert.deepEqual(getOrientedDimensions(1600, 900, 180), { width: 1600, height: 900 });
  assert.deepEqual(getOrientedDimensions(1600, 900, 270), { width: 900, height: 1600 });
});

test('computeCropRectForAspect centers 1:1 crop inside 16:9 image', () => {
  const rect = computeCropRectForAspect(1600, 900, '1:1');
  assert.equal(rect.y, 0);
  assert.equal(rect.height, 1);
  assert.ok(Math.abs(rect.width - 900 / 1600) < 1e-6);
  assert.ok(Math.abs(rect.x - (1 - rect.width) / 2) < 1e-6);
});

test('computeOutputDimensions handles original, scale, and aspect-locked dimensions', () => {
  assert.deepEqual(
    computeOutputDimensions(1000, 500, {
      mode: 'original',
      scalePercent: 50,
      width: 400,
      height: 400,
      lockAspect: true,
    }),
    { width: 1000, height: 500 }
  );

  assert.deepEqual(
    computeOutputDimensions(1000, 500, {
      mode: 'scale',
      scalePercent: 50,
      width: 400,
      height: 400,
      lockAspect: true,
    }),
    { width: 500, height: 250 }
  );

  assert.deepEqual(
    computeOutputDimensions(1000, 500, {
      mode: 'dimensions',
      scalePercent: 100,
      width: 600,
      height: 600,
      lockAspect: true,
    }),
    { width: 600, height: 300 }
  );
});

test('computeWatermarkCenter positions box inside margins', () => {
  const topLeft = computeWatermarkCenter(1000, 800, 200, 40, 'top-left', 20);
  assert.deepEqual(topLeft, { cx: 120, cy: 40 });

  const bottomRight = computeWatermarkCenter(1000, 800, 200, 40, 'bottom-right', 20);
  assert.deepEqual(bottomRight, { cx: 880, cy: 760 });
});

test('buildCssFilterString and buildOutputFilename produce expected outputs', () => {
  const filter = buildCssFilterString({ ...DEFAULT_COLOR_SETTINGS, brightness: 120, blur: 2 }, 0.5);
  assert.ok(filter.includes('brightness(120%)'));
  assert.ok(filter.includes('blur(1.00px)'));

  assert.equal(buildOutputFilename('photo.sunset.png', 'edited_', 'image/webp'), 'edited_photo.sunset.webp');
  assert.equal(buildOutputFilename('avatar.jpg', '', 'image/png'), 'avatar.png');
});
