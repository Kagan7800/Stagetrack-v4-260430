import React from 'react';

// Helper function to resolve the color/gradient value
const resolveStrokeColor = (color) => {
  if (!color) return '#22c55e';
  // Strip duplicate yellow line suffix if present
  if (color.endsWith('_2')) {
    return color.substring(0, color.length - 2);
  }
  return color;
};

export default function PeoBorder({ color }) {
  const strokeColor = resolveStrokeColor(color);

  return (
    <svg 
      className="peo-border-svg" 
      viewBox="0 0 100 100" 
      preserveAspectRatio="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 5,
        borderRadius: 'inherit',
        overflow: 'hidden'
      }}
    >
      <defs>
        {/* Define the gradients used in the design */}
        <linearGradient id="peo-gradient-185" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F7F27C" />
          <stop offset="100%" stopColor="#F7F27C" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="peo-gradient-186" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FC0000" stopOpacity="0.59" />
          <stop offset="100%" stopColor="#FBFF49" />
        </linearGradient>
      </defs>

      {/* 
        All border lines are grouped into a single <g> element.
        Instead of applying stroke to each path individually, we apply it to the group.
        The strokeWidth is set to 10px (with scale fallback) and vectorEffect ensures it doesn't scale with size.
      */}
      <g 
        stroke={strokeColor} 
        fill="none"
        style={{
          strokeWidth: 'calc(10px * var(--lobby-scale, 1))',
          vectorEffect: 'non-scaling-stroke'
        }}
      >
        <line x1="0" y1="5" x2="100" y2="5" />
        <line x1="95" y1="0" x2="95" y2="100" />
        <line x1="100" y1="95" x2="0" y2="95" />
        <line x1="5" y1="100" x2="5" y2="0" />
      </g>
    </svg>
  );
}
