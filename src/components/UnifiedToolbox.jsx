import { Hand, MicOff, MessageSquare, X } from 'lucide-react';

export default function UnifiedToolbox({ 
  activeGuest, 
  guestButtons, 
  toggleGuestButton, 
  onAddSticker,
  onClose
}) {
  const guestStickers = [
    "Balloons 2 2.svg",
    "Boat 2.svg",
    "Dancer 2.svg",
    "Dog 2.svg",
    "Drums 2.svg",
    "Fish 2.svg",
    "Flowers 6.svg",
    "Guitar 2.svg",
    "Kitten 2.svg",
    "Piano 2 3.svg",
    "Sun with sunglasses 2.svg",
    "Truck 2 2.svg",
    "Trumpet 2.svg",
    "Xylophone 2.svg",
    "Confetti.svg"
  ];

  if (!activeGuest) return null;

  const buttons = guestButtons[activeGuest.id] || { raiseHand: false, mute: false, chat: false };

  return (
    <div className="unified-toolbox glass-panel" style={{ height: '100%', width: '100%' }}>
      <div className="toolbox-header">
        <h2>{activeGuest.name}'s Tools</h2>
        <button onClick={onClose} className="close-btn">
          <X size={16} />
        </button>
      </div>

      <div className="toolbox-content">
        {/* Guest Tools Section */}
        <div className="toolbox-section">
          <div className="gt-buttons-col">
            <button 
              className={`gb-btn ${buttons.raiseHand ? 'active' : ''}`}
              onClick={() => toggleGuestButton(activeGuest.id, 'raiseHand')}
            >
              <Hand size={16} /> Raise Hand
            </button>
            <button 
              className={`gb-btn ${buttons.mute ? 'active' : ''}`}
              onClick={() => toggleGuestButton(activeGuest.id, 'mute')}
            >
              <MicOff size={16} /> Mute/Pause
            </button>
            <button 
              className={`gb-btn ${buttons.chat ? 'active' : ''}`}
              onClick={() => toggleGuestButton(activeGuest.id, 'chat')}
            >
              <MessageSquare size={16} /> Chat
            </button>
          </div>

          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <h3 className="section-title">Stickers</h3>
            <div className="peo-sticker-grid">
              {guestStickers.map((sticker) => (
                <div 
                  key={sticker} 
                  className="sticker-item" 
                  onClick={() => onAddSticker(activeGuest.id, sticker, false)}
                >
                  <img 
                    src={`/assets/svg_stickers/${sticker}`} 
                    alt={sticker} 
                    style={sticker.includes('Guitar') ? { transform: 'scale(1.25)' } : {}}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

