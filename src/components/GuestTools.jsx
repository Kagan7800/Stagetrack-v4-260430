import React from 'react';
import { Hand, MicOff, MessageSquare } from 'lucide-react';

export default function GuestTools({ activeGuest, guestButtons, toggleGuestButton, onAddSticker }) {
  const stickers = [
    "Balloons 2 2.svg", "Boat 2.svg", "Crown 4.svg", "Dancer 2.svg", 
    "Dog 2.svg", "Drums 2.svg", "Fish 2.svg", "Flowers 6.svg", 
    "Guitar 2.svg", "Happy Birthday 2.svg", "Kitten 2.svg", 
    "Piano 2 3.svg", "Sun with sunglasses 2.svg", "Truck 2 2.svg", 
    "Trumpet 2.svg", "Xylophone 2.svg"
  ];

  if (!activeGuest) {
    return (
      <div className="guest-tools-area" style={{ justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}>
        Select a guest container to access tools
      </div>
    );
  }

  const buttons = guestButtons[activeGuest.id] || { raiseHand: false, mute: false, chat: false };

  return (
    <div className="guest-tools-area">
      {/* Guest Buttons Row */}
      <div className="gt-buttons-row">
        <button 
          className={`gb-btn ${buttons.raiseHand ? 'active' : ''}`}
          onClick={() => toggleGuestButton(activeGuest.id, 'raiseHand')}
        >
          <Hand size={14} /> Raise Hand
        </button>
        <button 
          className={`gb-btn ${buttons.mute ? 'active' : ''}`}
          onClick={() => toggleGuestButton(activeGuest.id, 'mute')}
        >
          <MicOff size={14} /> Mute
        </button>
        <button 
          className={`gb-btn ${buttons.chat ? 'active' : ''}`}
          onClick={() => toggleGuestButton(activeGuest.id, 'chat')}
        >
          <MessageSquare size={14} /> Chat
        </button>
      </div>

      {/* Dynamic Sticker Palette */}
      <div className="gt-sticker-row">
        {stickers.map((sticker, idx) => (
          <div key={idx} className="sticker-item" onClick={() => onAddSticker(activeGuest.id, sticker, false)}>
            <img src={`/assets/svg_stickers/${sticker}`} alt={sticker} />
          </div>
        ))}
      </div>
    </div>
  );
}
