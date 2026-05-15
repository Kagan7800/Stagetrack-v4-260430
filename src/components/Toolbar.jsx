import React, { useRef } from 'react';
import { MousePointer2, PenTool, Image as ImageIcon, Video, Trash2 } from 'lucide-react';

const STICKERS = [
  "Balloons 2 2.svg", "Balloons 32 2.svg", "Boat 2.svg", "Crown 4.svg", 
  "Dancer 2.svg", "Dog 2.svg", "Drums 2.svg", "Fish 2.svg", 
  "Flowers 6.svg", "Guitar 2.svg", "Happy Birthday 2.svg", "Kitten 2.svg", 
  "Piano 2 3.svg", "Piano 2 4.svg", "Sun with sunglasses 2.svg", 
  "Truck 2 2.svg", "Truck 3.svg", "Trumpet 2.svg", "Xylophone 2.svg"
];

export default function Toolbar({ 
  isDoodling, 
  setIsDoodling, 
  onAddSticker, 
  onMediaUpload 
}) {
  const fileInputRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const type = file.type.startsWith('video/') ? 'video' : 'image';
      onMediaUpload(url, type);
    }
  };

  return (
    <div className="glass-panel toolbar">
      <button 
        className={`icon-btn ${!isDoodling ? 'active' : ''}`}
        onClick={() => setIsDoodling(false)}
        title="Select Tool"
      >
        <MousePointer2 size={20} />
      </button>
      <button 
        className={`icon-btn ${isDoodling ? 'active' : ''}`}
        onClick={() => setIsDoodling(true)}
        title="Doodle Tool"
      >
        <PenTool size={20} />
      </button>

      <div className="toolbar-divider" />

      <input 
        type="file" 
        accept="image/*,video/*" 
        style={{ display: 'none' }} 
        ref={fileInputRef}
        onChange={handleFileUpload}
      />
      <button 
        className="icon-btn"
        onClick={() => fileInputRef.current.click()}
        title="Upload Image"
      >
        <ImageIcon size={20} />
      </button>

      <div className="toolbar-divider" />

      {/* Mini Sticker Tray in Toolbar (Hover or Click to add) */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', maxWidth: '300px', alignItems: 'center' }}>
        {STICKERS.map((sticker, idx) => (
          <div 
            key={idx} 
            className="sticker-item" 
            style={{ width: '40px', height: '40px', padding: '4px', flexShrink: 0 }}
            onClick={() => onAddSticker(sticker)}
            title={`Add ${sticker.split('.')[0]}`}
          >
            <img src={`/assets/svg_stickers/${sticker}`} alt={sticker} />
          </div>
        ))}
      </div>
    </div>
  );
}
