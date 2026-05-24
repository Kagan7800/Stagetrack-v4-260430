import { Hand, MicOff, Pause } from 'lucide-react';

export default function GuestContainer({ 
  participant, 
  isActive, 
  onClick, 
  stickers = [],
  buttons = { raiseHand: false, mute: false },
  nudges = {},
  globalMute,
  globalPause
}) {
  const isMuted = buttons.mute || globalMute;
  const isPaused = buttons.mute || globalPause;
  const showGrayscale = buttons.mute;

  return (
    <div 
      className={`video-cell ${isActive ? 'active-gc' : ''} ${showGrayscale ? 'grayscale-sharp' : ''}`} 
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

      {/* Pause Overlay (transparent, centered pause icon) */}
      {isPaused && (
        <div className="peo-pause-overlay">
          <Pause size={28} color="#ffffff" />
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

        const isIcSticker = typeof s.position === 'string' && s.position !== 'confetti';

        if (isIcSticker) {
          const xTrans = s.position.includes('tr-c') || s.position.includes('rc-a') || s.position.includes('br-n') || s.position.includes('rc-b') ? '50%' : '-50%';
          const yTrans = s.position.includes('br-n') || s.position.includes('bl-n') ? '50%' : '-50%';
          const rot = s.rotation || 0;
          const sc = s.scale || 1;
          style.transform = `translate(${xTrans}, ${yTrans}) rotate(${rot}deg) scale(${sc})`;
        }

        return (
          <img 
            key={s.id} 
            src={`/assets/svg_stickers/${s.name}`} 
            alt={s.name} 
            className={`gc-sticker pos-${s.position} ${isIcSticker ? 'ic-placed' : ''} ${(s.name === 'Sun with sunglasses 2.svg' && typeof s.position === 'number') ? 'sun-special' : ''}`} 
            style={style}
          />
        );
      })}
    </div>
  );
}
