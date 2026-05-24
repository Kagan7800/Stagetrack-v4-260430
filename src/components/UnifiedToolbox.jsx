import { Hand, MicOff, MessageSquare, X, Camera } from 'lucide-react';
import html2canvas from 'html2canvas';

export default function UnifiedToolbox({ 
  activeGuest, 
  guestButtons, 
  toggleGuestButton, 
  onAddSticker,
  onClose
}) {
  const handleScreenshot = () => {
    const target = document.querySelector('.app-container');
    if (!target) return;

    const toolbox = document.querySelector('.toolbox-panel');
    const closeMedia = document.querySelector('.close-media-btn');
    
    if (toolbox) toolbox.style.visibility = 'hidden';
    if (closeMedia) closeMedia.style.visibility = 'hidden';

    setTimeout(() => {
      html2canvas(target, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#090d16',
        scale: 2
      }).then((canvas) => {
        if (toolbox) toolbox.style.visibility = 'visible';
        if (closeMedia) closeMedia.style.visibility = 'visible';

        const image = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `screenshot-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
        link.href = image;
        link.click();
      }).catch((err) => {
        console.error("Screenshot failed:", err);
        if (toolbox) toolbox.style.visibility = 'visible';
        if (closeMedia) closeMedia.style.visibility = 'visible';
      });
    }, 50);
  };

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
            <button 
              className="gb-btn screenshot-btn"
              onClick={handleScreenshot}
            >
              <Camera size={16} /> Screenshot
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

