// src/utils/borderStyles.js

/**
 * Resolves the CSS border, background, and gradient styles matching session video cells.
 *
 * @param {string|null} borderValue - The selected border color or gradient token.
 * @param {string} innerBg - Inner container background color.
 * @returns {object} CSS style object.
 */
export const getBorderStyle = (borderValue, innerBg = 'rgba(11, 25, 46, 0.7)') => {
  if (!borderValue) return {};
  
  let colorVal = borderValue;
  if (colorVal.endsWith('_2')) {
    colorVal = colorVal.substring(0, colorVal.length - 2);
  }

  if (colorVal === 'url(#peo-gradient-185)' || colorVal.includes('peo-gradient-185')) {
    return {
      border: '2px solid transparent',
      backgroundImage: `linear-gradient(${innerBg}, ${innerBg}), linear-gradient(135deg, #F7F27C, rgba(247, 242, 124, 0))`,
      backgroundOrigin: 'border-box',
      backgroundClip: 'padding-box, border-box'
    };
  }
  
  if (colorVal === 'url(#peo-gradient-186)' || colorVal.includes('peo-gradient-186')) {
    return {
      border: '2px solid transparent',
      backgroundImage: `linear-gradient(${innerBg}, ${innerBg}), linear-gradient(135deg, rgba(252, 0, 0, 0.59), #FBFF49)`,
      backgroundOrigin: 'border-box',
      backgroundClip: 'padding-box, border-box'
    };
  }

  return {
    border: `2px solid ${colorVal}`,
    backgroundColor: innerBg
  };
};

/**
 * Resolves the glow/shadow color matching session video cells.
 *
 * @param {string|null} color - The selected border color or gradient token.
 * @returns {string} Color string for box-shadow.
 */
export const getGlowColor = (color) => {
  if (!color) return 'rgba(34, 197, 94, 0.45)';
  if (color.includes('185')) return '#F7F27C';
  if (color.includes('186')) return '#FC0000';
  if (color.endsWith('_2')) return color.substring(0, color.length - 2);
  return color;
};
