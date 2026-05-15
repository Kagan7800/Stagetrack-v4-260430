import React from 'react';

export default function InstructorToolbox({ onAddSticker }) {
  const stickers = [
    "Balloons 2 2.svg", "Crown 4.svg", "Dancer 2.svg", "Drums 2.svg", 
    "Guitar 2.svg", "Happy Birthday 2.svg", "Piano 2 3.svg", 
    "Sun with sunglasses 2.svg", "Trumpet 2.svg"
  ];

  return (
    <div className="glass-panel sidebar" style={{ flex: 1 }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--glass-border)', textAlign: 'center' }}>
        <h2 style={{ fontSize: '0.9rem', fontWeight: '600' }}>Toolbox</h2>
      </div>
      
      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', overflowY: 'auto' }}>
        {stickers.map((sticker, idx) => (
          <div 
            key={idx} 
            className="sticker-item" 
            style={{ width: '50px', height: '50px' }}
            onClick={() => onAddSticker('instructor', sticker, true)}
          >
            <img src={`/assets/svg_stickers/${sticker}`} alt={sticker} />
          </div>
        ))}
      </div>
    </div>
  );
}
