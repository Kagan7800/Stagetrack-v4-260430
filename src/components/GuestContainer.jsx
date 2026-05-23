import { Hand, MicOff } from 'lucide-react';

export default function GuestContainer({ 
  participant, 
  isActive, 
  onClick, 
  stickers = [],
  buttons = { raiseHand: false, mute: false },
  nudges = {},
  globalMute
}) {
  const isMuted = buttons.mute || globalMute;

  return (
    <div 
      className={`video-cell ${isActive ? 'active-gc' : ''} ${isMuted ? 'muted-grayscale' : ''}`} 
      onClick={() => onClick(participant)}
    >


      {/* Name Badge */}
      <div className="gc-name-badge">
        {participant.name}
      </div>

      {/* Hand Raise Glow Layer (z-index: 15) */}
      {buttons.raiseHand && <div className="hand-raise-glow"></div>}

      {/* Status Icons (z-index: 20) */}
      {(buttons.raiseHand || isMuted) && (
        <div className="gc-status-icons">
          {buttons.raiseHand && <Hand size={10} color="#eab308" />}
          {isMuted && <MicOff size={10} color="#ef4444" />}
        </div>
      )}


      {/* Stickers */}
      {stickers.map((s) => {
        const nudge = nudges[s.position] || {};
        let style = {};
        
        if (s.position === 1) { // top-left
           style.marginTop = nudge.y ? `${nudge.y}px` : undefined;
           style.marginLeft = nudge.x ? `${nudge.x}px` : undefined;
        } else if (s.position === 2) { // top-right
           style.marginTop = nudge.y ? `${nudge.y}px` : undefined;
           style.marginRight = nudge.x ? `${-nudge.x}px` : undefined;
        } else if (s.position === 3) { // bottom-left
           style.marginBottom = nudge.y ? `${-nudge.y}px` : undefined;
           style.marginLeft = nudge.x ? `${nudge.x}px` : undefined;
        } else if (s.position === 4) { // bottom-right
           style.marginBottom = nudge.y ? `${-nudge.y}px` : undefined;
           style.marginRight = nudge.x ? `${-nudge.x}px` : undefined;
        }

        return (
          <img 
            key={s.id} 
            src={`/assets/svg_stickers/${s.name}`} 
            alt={s.name} 
            className={`gc-sticker pos-${s.position} ${s.name === 'Sun with sunglasses 2.svg' ? 'sun-special' : ''}`} 
            style={style}
          />
        );
      })}
    </div>
  );
}
