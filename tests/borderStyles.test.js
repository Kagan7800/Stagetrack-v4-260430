import test from 'node:test';
import assert from 'node:assert/strict';
import { getBorderStyle, getGlowColor } from '../src/utils/borderStyles.js';

test('getBorderStyle returns solid border for standard hex colors', () => {
  const style = getBorderStyle('#00FCFC');
  assert.equal(style.border, '2px solid #00FCFC');
  assert.equal(style.backgroundColor, 'rgba(11, 25, 46, 0.7)');
});

test('getBorderStyle strips _2 duplicate suffix', () => {
  const style = getBorderStyle('#F7F27C_2');
  assert.equal(style.border, '2px solid #F7F27C');
});

test('getBorderStyle returns background-clip gradient for gradient-185', () => {
  const style = getBorderStyle('url(#peo-gradient-185)');
  assert.equal(style.border, '2px solid transparent');
  assert.ok(style.backgroundImage.includes('#F7F27C'));
  assert.equal(style.backgroundOrigin, 'border-box');
  assert.equal(style.backgroundClip, 'padding-box, border-box');
});

test('getBorderStyle returns background-clip gradient for gradient-186', () => {
  const style = getBorderStyle('url(#peo-gradient-186)');
  assert.equal(style.border, '2px solid transparent');
  assert.ok(style.backgroundImage.includes('rgba(252, 0, 0, 0.59)'));
  assert.equal(style.backgroundOrigin, 'border-box');
  assert.equal(style.backgroundClip, 'padding-box, border-box');
});

test('getBorderStyle returns empty object for null/empty input', () => {
  assert.deepEqual(getBorderStyle(null), {});
  assert.deepEqual(getBorderStyle(''), {});
});

test('getGlowColor resolves correct glow colors', () => {
  assert.equal(getGlowColor('#00FCFC'), '#00FCFC');
  assert.equal(getGlowColor('url(#peo-gradient-185)'), '#F7F27C');
  assert.equal(getGlowColor('url(#peo-gradient-186)'), '#FC0000');
  assert.equal(getGlowColor('#F7F27C_2'), '#F7F27C');
  assert.equal(getGlowColor(null), 'rgba(34, 197, 94, 0.45)');
});
