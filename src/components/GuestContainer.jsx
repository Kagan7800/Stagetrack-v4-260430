import React from 'react';
import { Mic, MicOff, Hand } from 'lucide-react';

export default function GuestContainer({ 
  participant, 
  isActive, 
  onClick, 
  stickers = [],
  buttons = { raiseHand: false, mute: false }
}) {
  return (
    <div 
      className={`video-cell ${isActive ? 'active-gc' : ''}`} 
      onClick={() => onClick(participant)}
    >
      {/* Avatar Circle */}
      <div style={{ 
        width: '40px', 
        height: '40px', 
        borderRadius: '50%', 
        background: participant.color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.2rem',
        fontWeight: 'bold',
        color: '#fff',
        boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
      }}>
        {participant.initial}
      </div>

      {/* Name Badge */}
      <div style={{ 
        position: 'absolute', 
        bottom: '4px', 
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.6)', 
        padding: '2px 6px', 
        borderRadius: '4px',
        fontSize: '0.65rem',
        maxWidth: '80%',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }}>
        {participant.name}
      </div>

      {/* Mic Status */}
      <div style={{ 
        position: 'absolute', 
        top: '4px', 
        right: '4px',
        background: 'rgba(0,0,0,0.5)',
        borderRadius: '50%',
        padding: '2px',
        display: 'flex',
        gap: '4px'
      }}>
        {buttons.raiseHand && <Hand size={10} color="#eab308" />}
        {buttons.mute ? <MicOff size={10} color="#ef4444" /> : <Mic size={10} color="#22c55e" />}
      </div>

      {/* Stickers */}
      {stickers.map((s) => (
        <img 
          key={s.id} 
          src={`/assets/svg_stickers/${s.name}`} 
          alt={s.name} 
          className={`gc-sticker pos-${s.position}`} 
        />
      ))}
    </div>
  );
}
