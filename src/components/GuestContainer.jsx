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
      <div className="gc-avatar" style={{ background: participant.color }}>
        {participant.initial}
      </div>

      {/* Name Badge */}
      <div className="gc-name-badge">
        {participant.name}
      </div>

      {/* Hand Raise Glow Layer (z-index: 15) */}
      {buttons.raiseHand && <div className="hand-raise-glow"></div>}

      {/* Mic / Hand Status (z-index: 20) */}
      <div className="gc-status-icons">
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
