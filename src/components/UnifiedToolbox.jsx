import { useRef } from 'react';
import { Hand, MicOff, MessageSquare, Palette, Image as ImageIcon, X } from 'lucide-react';

export default function UnifiedToolbox({ 
  activeGuest, 
  guestButtons, 
  toggleGuestButton, 
  onAddSticker,
  isInstructor,
  isDoodling,
  setIsDoodling,
  onMediaUpload,
  onClose
}) {
  const fileInputRef = useRef(null);

  const guestStickers = [
    "Balloons 2 2.svg", "Boat 2.svg", "Dancer 2.svg", 
    "Dog 2.svg", "Drums 2.svg", "Fish 2.svg", "Flowers 6.svg", 
    "Guitar 2.svg", "Kitten 2.svg", 
    "Piano 2 3.svg", "Sun with sunglasses 2.svg", "Truck 2 2.svg", 
    "Trumpet 2.svg", "Xylophone 2.svg", "Confetti.svg"
  ];

  const instructorStickers = [
    "Balloons 2 2.svg", "Crown 4.svg", "Dancer 2.svg", "Drums 2.svg", 
    "Guitar 2.svg", "Happy Birthday 2.svg", "Piano 2 3.svg", 
    "Sun with sunglasses 2.svg", "Trumpet 2.svg"
  ];

  if (!activeGuest) return null;

  const buttons = guestButtons[activeGuest.id] || { raiseHand: false, mute: false, chat: false };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const type = file.type.startsWith('video/') ? 'video' : 'image';
      onMediaUpload(url, type);
    }
  };

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
              <MicOff size={16} /> Mute
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
            <div className="gt-sticker-grid">
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

        {/* Instructor Tools Section */}
        {isInstructor && (
          <div className="toolbox-section ic-section">
            <h3 className="section-title">Instructor Tools</h3>
            
            <div className="ic-tools-row">
              <button 
                className={`icon-btn ${isDoodling ? 'active' : ''}`}
                onClick={() => setIsDoodling(!isDoodling)}
                title="Doodle Tool"
              >
                <Palette size={20} />
              </button>
              
              <button 
                className="icon-btn" 
                onClick={() => fileInputRef.current?.click()}
                title="Upload Media"
              >
                <ImageIcon size={20} />
              </button>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                accept="image/*,video/*"
                onChange={handleFileUpload}
              />
            </div>

            <h3 className="section-title">Global Stickers</h3>
            <div className="gt-sticker-grid">
              {instructorStickers.map((sticker) => (
                <div 
                  key={sticker} 
                  className="sticker-item" 
                  onClick={() => onAddSticker('instructor', sticker, true)}
                >
                  <img src={`/assets/svg_stickers/${sticker}`} alt={sticker} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
