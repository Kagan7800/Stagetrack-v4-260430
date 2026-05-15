import React, { useRef } from 'react';
import { Palette, Image as ImageIcon } from 'lucide-react';

export default function Toolbar({ isDoodling, setIsDoodling, onMediaUpload }) {
  const fileInputRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const type = file.type.startsWith('video/') ? 'video' : 'image';
      onMediaUpload(url, type);
    }
  };

  return (
    <div className="glass-panel toolbar">
      <button 
        className={`icon-btn ${isDoodling ? 'active' : ''}`}
        onClick={() => setIsDoodling(!isDoodling)}
        title="Doodle Tool"
      >
        <Palette size={20} />
      </button>

      <div className="toolbar-divider" />

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
  );
}
