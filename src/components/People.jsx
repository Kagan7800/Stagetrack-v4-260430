import React from 'react';
import { Mic, MicOff } from 'lucide-react';

export default function People() {
  // Generate 16 participants for the grid layout
  const participants = Array.from({ length: 16 }, (_, i) => ({
    id: i + 1,
    name: i === 0 ? "You" : `Student ${i}`,
    isMuted: i !== 0 && Math.random() > 0.3, // Randomly mute some students
    color: `hsl(${(i * 137.5) % 360}, 70%, 60%)`, // Unique color per student
    initial: i === 0 ? "Y" : "S"
  }));

  return (
    <div className="glass-panel sidebar people-container" style={{ marginBottom: '16px', flex: '1', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--glass-border)' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: '600' }}>Class Grid (16)</h2>
      </div>
      
      {/* 4x4 Grid Layout */}
      <div className="people-grid" style={{ 
        padding: '12px', 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)', 
        gridTemplateRows: 'repeat(4, 1fr)',
        gap: '8px',
        flex: 1,
        overflowY: 'auto'
      }}>
        {participants.map(p => (
          <div key={p.id} className="video-cell" style={{ 
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '8px',
            border: '1px solid var(--glass-border)',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            aspectRatio: '1',
            overflow: 'hidden'
          }}>
            {/* Avatar Circle */}
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '50%', 
              background: p.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              color: '#fff',
              boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
            }}>
              {p.initial}
            </div>

            {/* Name Badge */}
            <div style={{ 
              position: 'absolute', 
              bottom: '4px', 
              left: '4px', 
              background: 'rgba(0,0,0,0.6)', 
              padding: '2px 6px', 
              borderRadius: '4px',
              fontSize: '0.65rem',
              maxWidth: '80%',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {p.name}
            </div>

            {/* Mic Status */}
            <div style={{ 
              position: 'absolute', 
              top: '4px', 
              right: '4px',
              background: 'rgba(0,0,0,0.5)',
              borderRadius: '50%',
              padding: '2px'
            }}>
              {p.isMuted ? <MicOff size={10} color="#ef4444" /> : <Mic size={10} color="#22c55e" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
