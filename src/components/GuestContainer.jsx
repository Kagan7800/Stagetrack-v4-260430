import { Hand } from 'lucide-react';

export default function GuestContainer({ 
  participant, 
  isActive, 
  onClick, 
  stickers = [],
  buttons = { raiseHand: false, mute: false },
  nudges = {}
}) {
  return (
    <div 
      className={`video-cell ${isActive ? 'active-gc' : ''}`} 
      onClick={() => onClick(participant)}
    >


      {/* Name Badge */}
      <div className="gc-name-badge">
        {participant.name}
      </div>

      {/* Hand Raise Glow Layer (z-index: 15) */}
      {buttons.raiseHand && <div className="hand-raise-glow"></div>}

      {/* Hand Status (z-index: 20) */}
      {buttons.raiseHand && (
        <div className="gc-status-icons">
          <Hand size={10} color="#eab308" />
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
            className={`gc-sticker pos-${s.position}`} 
            style={style}
          />
        );
      })}
    </div>
  );
}
