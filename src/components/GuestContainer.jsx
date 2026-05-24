import { Hand, Pause } from 'lucide-react';

export default function GuestContainer({ 
  participant, 
  isActive, 
  onClick, 
  stickers = [],
  buttons = { raiseHand: false, mute: false },
  nudges = {},
  globalPause
}) {
  const isClosed = globalPause || buttons.mute;
  const showActiveGlow = isActive && !isClosed;
  const showRaiseHandGlow = buttons.raiseHand && !isClosed;
  const showGreenFilter = buttons.greenFilter && !isClosed;
  const showGrayscale = isClosed;
  const isNonInteractive = isClosed || participant.isBlank;

  return (
    <div 
      className={`video-cell ${showActiveGlow ? 'active-gc' : ''} ${showGrayscale ? 'grayscale-sharp' : ''} ${isNonInteractive ? 'non-interactive' : ''}`} 
      onClick={() => onClick(participant)}
    >


      {/* Name Badge */}
      <div className="gc-name-badge">
        {participant.name}
      </div>

      {/* Hand Raise Glow Layer (z-index: 15) */}
      {showRaiseHandGlow && <div className="hand-raise-glow"></div>}

      {/* Neon Green Filter Overlay (z-index: 18) */}
      {showGreenFilter && <div className="neon-green-overlay"></div>}

      {/* Status Icons (z-index: 20) */}
      {buttons.raiseHand && (
        <div className="gc-status-icons">
          <Hand size={10} color="#eab308" />
        </div>
      )}

      {/* Pause Overlay (transparent, centered pause icon) */}
      {globalPause && (
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

        const isIcSticker = typeof s.position === 'string' && s.position !== 'confetti' && s.position !== 'sun' && s.position !== 'birthday' && s.position !== 'crown';

        if (isIcSticker) {
          const xTrans = (s.position.includes('tr-c') || s.position.startsWith('rc-')) ? '50%' : '-50%';
          const yTrans = '-50%';
          const rot = s.rotation || 0;
          const sc = s.scale || 1;
          style.transform = `translate(${xTrans}, ${yTrans}) rotate(${rot}deg) scale(${sc})`;
        }

        if (s.name === 'Drums 2.svg') {
          style.width = isIcSticker ? '40px' : '62px';
          style.height = isIcSticker ? '40px' : '62px';
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
