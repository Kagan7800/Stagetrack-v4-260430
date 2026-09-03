// tests/stickerAllocator.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { allocate, SLOTS, SUN_SLOT, CROWN_SLOT, BIRTHDAY_SLOT, TOKENS, SMALLEST_TILE_EDGE } from '../src/utils/stickerAllocator.js';

test('sun always lands in E', () => {
  const stickers = [
    { id: '1', name: 'Truck.svg', addedAt: 100 },
    { id: '2', name: 'Sun with sunglasses.svg', kind: 'sun', addedAt: 200 }
  ];
  const { placed } = allocate(stickers);
  const sunPlacement = placed.find(p => p.sticker.name.includes('Sun'));
  assert.ok(sunPlacement);
  assert.equal(sunPlacement.slot, SUN_SLOT);
});

test('crown always lands in TC (top center)', () => {
  const stickers = [
    { id: '1', name: 'Truck.svg', addedAt: 100 },
    { id: '2', name: 'RealCrown.png', kind: 'crown', addedAt: 200 }
  ];
  const { placed } = allocate(stickers);
  const crownPlacement = placed.find(p => p.sticker.name.includes('Crown'));
  assert.ok(crownPlacement);
  assert.equal(crownPlacement.slot, CROWN_SLOT);
});

test('happy birthday claims right corner (NE) and includes crown at TC', () => {
  const stickers = [
    { id: '1', name: 'Truck.svg', addedAt: 100 },
    { id: '2', name: 'Happy_Birthday.png', kind: 'birthday', addedAt: 200 }
  ];
  const { placed } = allocate(stickers);
  const hbPlacement = placed.find(p => p.sticker.name.includes('Birthday'));
  const crownPlacement = placed.find(p => p.sticker.name.includes('Crown'));
  
  assert.ok(hbPlacement);
  assert.equal(hbPlacement.slot, BIRTHDAY_SLOT);
  assert.ok(crownPlacement);
  assert.equal(crownPlacement.slot, CROWN_SLOT);
});

test('IC stickers allocate clean perimeter slots without colliding', () => {
  const stickers = [
    { id: '1', name: 'ic star1.png', isInstructor: true, addedAt: 100 },
    { id: '2', name: 'ic star2.png', isInstructor: true, addedAt: 200 }
  ];
  const { placed } = allocate(stickers);
  assert.equal(placed.length, 2);
  const slots = placed.map(p => p.slot);
  const uniqueSlots = new Set(slots);
  assert.equal(slots.length, uniqueSlots.size);
});

test('no stickers ever land in S (bottom center)', () => {
  const stickers = [
    { id: '1', name: 's1.svg', addedAt: 1 },
    { id: '2', name: 's2.svg', addedAt: 2 },
    { id: '3', name: 's3.svg', addedAt: 3 },
    { id: '4', name: 's4.svg', addedAt: 4 },
    { id: '5', name: 's5.svg', addedAt: 5 },
    { id: '6', name: 's6.svg', addedAt: 6 },
    { id: '7', name: 's7.svg', addedAt: 7 },
    { id: '8', name: 's8.svg', addedAt: 8 }
  ];
  const { placed } = allocate(stickers);
  const hasBottomCenter = placed.some(p => p.slot === 'S');
  assert.equal(hasBottomCenter, false);
});

test('zero collisions: all placed stickers occupy unique discrete slots', () => {
  const stickers = [
    { id: '1', name: 'Truck.svg', addedAt: 100 },
    { id: '2', name: 'Guitar.svg', addedAt: 200 },
    { id: '3', name: 'Sun with sunglasses.svg', kind: 'sun', addedAt: 300 },
    { id: '4', name: 'Happy_Birthday.png', kind: 'birthday', addedAt: 400 },
    { id: '5', name: 'ic star1.png', isInstructor: true, addedAt: 500 }
  ];
  const { placed } = allocate(stickers);
  const slots = placed.map(p => p.slot);
  const uniqueSlots = new Set(slots);
  assert.equal(slots.length, uniqueSlots.size);
});

test('selectedIcon exclusively claims NW and prevents other stickers from taking NW', () => {
  const stickers = [
    { id: '1', name: 'Guitar.svg', addedAt: 100 },
    { id: '2', name: 'Truck.svg', addedAt: 200 }
  ];
  const { placed } = allocate(stickers, 'Flowers.svg');
  const nwItem = placed.find(p => p.slot === 'NW');
  assert.ok(nwItem);
  assert.equal(nwItem.sticker.name, 'Flowers.svg');
  
  // Guitar and Truck must take other slots, never NW
  const otherSlots = placed.filter(p => p.slot !== 'NW').map(p => p.slot);
  assert.equal(otherSlots.length, 2);
  assert.ok(!otherSlots.includes('NW'));
});

test('gutter clears two facing protrusions plus buffers', () => {
  const clearanceNeeded = TOKENS.protrusion * 2 + TOKENS.buffer * 2;
  assert.ok(TOKENS.gutter >= clearanceNeeded, `Gutter ${TOKENS.gutter}px must be >= ${clearanceNeeded}px`);
});

test('sticker size never exceeds one third of the smallest tile edge', () => {
  const maxS = TOKENS.maxSize;
  assert.ok(3 * maxS <= SMALLEST_TILE_EDGE, `3 * ${maxS} (${3 * maxS}) must be <= ${SMALLEST_TILE_EDGE}`);
});
