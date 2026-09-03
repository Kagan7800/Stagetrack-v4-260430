// src/utils/stickerAllocator.js

export const CROWN_SLOT = 'TC';
export const BIRTHDAY_SLOT = 'NE';
export const SUN_SLOT = 'E';

/**
 * Clean 7-slot perimeter layout:
 * - Top edge (3 max): NW (0%), TC (50%), NE (100%)
 * - Right edge (3 max): NE (top), E (center 50%), SE (bottom)
 * - Left edge (3 max): NW (top), W (center 50%), SW (bottom)
 * - Bottom edge: SW (left), SE (right), with clear space in middle for name badge
 *
 * Guaranteed spacing: min 20px between any 2 adjacent stickers on a 265px tile.
 */
export const SLOTS = ['NW', 'TC', 'NE', 'E', 'SE', 'SW', 'W'];

export const TOKENS = {
  protrusion: 10,
  buffer: 5,
  minSize: 48,
  maxSize: 84,
  ideal: '26cqw',
  gutter: 32,
};

export const SMALLEST_TILE_EDGE = 252;

/**
 * Pure slot allocation function per Spec v3 & Collision Prevention Rules.
 *
 * @param {Array<{ id: string, name: string, kind?: string, isInstructor?: boolean, addedAt?: number }>} stickers
 * @param {string|null} selectedIcon
 * @returns {{ placed: Array<{ slot: string, sticker: any }>, removed: Array<any> }}
 */
export function allocate(stickers = [], selectedIcon = null) {
  const safeStickers = Array.isArray(stickers) ? stickers : [];
  const occupied = new Map();
  const removed = [];

  // 1. If selectedIcon is present, it claims NW exclusively
  if (selectedIcon) {
    occupied.set('NW', {
      id: `selected-icon-${selectedIcon}`,
      name: selectedIcon,
      kind: 'selectedIcon',
      isIcon: true
    });
  }

  // Filter out any duplicates of selectedIcon that might be in stickers array
  const cleanStickers = safeStickers.filter(s => s && s.name && s.name !== selectedIcon);
  const byAge = [...cleanStickers].sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0));

  const isBirthday = (s) => s.kind === 'birthday' || s.name === 'Happy_Birthday.png' || (s.name && s.name.toLowerCase().includes('birthday'));
  const isCrown = (s) => s.kind === 'crown' || s.name === 'RealCrown.png' || (s.name && s.name.toLowerCase().includes('crown'));
  const isSun = (s) => s.kind === 'sun' || s.name === 'Sun with sunglasses.svg' || (s.name && s.name.toLowerCase().includes('sun'));

  const birthdaySticker = byAge.find(isBirthday);
  const crownSticker = byAge.find(isCrown);
  const sunSticker = byAge.find(isSun);

  // 2. Happy Birthday claims NE unconditionally (superseding any prior NE occupant)
  if (birthdaySticker) {
    occupied.set(BIRTHDAY_SLOT, birthdaySticker);
  }

  // 3. Crown claims TC unconditionally
  if (crownSticker) {
    occupied.set(CROWN_SLOT, crownSticker);
  } else if (birthdaySticker) {
    occupied.set(CROWN_SLOT, {
      id: `auto-crown-${birthdaySticker.id || Date.now()}`,
      name: 'RealCrown.png',
      kind: 'crown',
      isInstructor: true
    });
  }

  // 4. Sun claims E unconditionally
  if (sunSticker) {
    occupied.set(SUN_SLOT, sunSticker);
  }

  // 5. Distribute remaining stickers across remaining available slots in clean perimeter order
  const specialPlaced = new Set([birthdaySticker, crownSticker, sunSticker].filter(Boolean));
  const remaining = byAge.filter(s => !specialPlaced.has(s));

  // Balanced slot priority order: corners & sides first, avoiding overcrowding
  const slotPriority = ['W', 'SW', 'SE', 'NW', 'NE', 'E', 'TC'];

  for (const sticker of remaining) {
    const freeSlot = slotPriority.find(slot => !occupied.has(slot));
    if (freeSlot) {
      occupied.set(freeSlot, sticker);
    } else {
      removed.push(sticker);
    }
  }

  return {
    placed: [...occupied.entries()].map(([slot, sticker]) => ({ slot, sticker })),
    removed,
  };
}

