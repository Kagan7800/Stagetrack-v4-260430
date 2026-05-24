import { useRef, useState } from 'react';
import { Palette, Image as ImageIcon, X, Mic, MicOff, Pause, Play, ChevronLeft, ChevronRight, UploadCloud, HardDrive } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import heartPng from '../assets/RealHeart.png';
import crownPng from '../assets/RealCrown.png';
import birthdayPng from '../assets/Happy_Birthday.png';
import starPng from '../assets/Star.png';

export default function InstructorToolbox() {
  const {
    isDoodling, setIsDoodling,
    globalMute, setGlobalMute,
    globalPause, setGlobalPause,
    isSidebarOpen, setIsSidebarOpen,
    setMediaUpload, clearMedia, mediaUrl, mediaType,
    handleAddSticker
  } = useAppContext();

  const fileInputRef = useRef(null);
  const [showUploadMenu, setShowUploadMenu] = useState(false);

  const availableStickers = [
    { id: 'RealHeart.png', src: heartPng },
    { id: 'Heart2.png', src: heartPng, isSmall: true },
    { id: 'RealCrown.png', src: crownPng }, 
    { id: 'Happy_Birthday.png', src: birthdayPng }, 
    { id: 'Star.png', src: starPng },
    { id: 'Star2.png', src: starPng, isSmall: true },
    { id: 'Star_LightBlue.svg', src: '/assets/svg_stickers/Star_LightBlue.svg' },
    { id: 'Star_Green.svg', src: '/assets/svg_stickers/Star_Green.svg' },
    { id: 'Star_Pink.svg', src: '/assets/svg_stickers/Star_Pink.svg' },
    { id: 'Star_Silver.svg', src: '/assets/svg_stickers/Star_Silver.svg' },
    { id: 'Star_Gold.svg', src: '/assets/svg_stickers/Star_Gold.svg' }
  ];

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const type = file.type.startsWith('video/') ? 'video' : 'image';
      setMediaUpload(url, type);
      setShowUploadMenu(false);
    }
  };

  const handleDriveUpload = () => {
    alert("Google Drive picker mock opened.");
    setShowUploadMenu(false);
  };

  const [showBpmInput, setShowBpmInput] = useState(false);
  const [bpmValue, setBpmValue] = useState('');

  const handleMetronome = () => {
    if (mediaType === 'iframe' && mediaUrl && mediaUrl.includes('figma.com')) {
      clearMedia();
      setShowBpmInput(false);
      return;
    }
    setShowBpmInput(!showBpmInput);
  };

  const submitBpm = () => {
    if (bpmValue) {
      setMediaUpload('https://www.figma.com/proto/jiqvv9jZCykXIhtfocAbBO/Metronome?node-id=2-42&embed-host=share&hide-ui=1&hide-controls=1&hide-toolbar=1&scaling=scale-down-width&content-scaling=fixed&frame=0&margin=0', 'iframe');
      setShowBpmInput(false);
      setBpmValue('');
    }
  };

  if (!isSidebarOpen) {
    return (
      <div className="sidebar-handle closed" onClick={() => setIsSidebarOpen(true)} role="button" aria-label="Open Instructor Toolbox" tabIndex={0}>
        <ChevronRight size={20} />
      </div>
    );
  }

  return (
    <div className="glass-panel sidebar instructor-toolbox" style={{ height: '100%', borderRight: '1px solid var(--glass-border)', position: 'relative' }}>
      
      {/* Handle to close */}
      <div className="sidebar-handle open" onClick={() => setIsSidebarOpen(false)} role="button" aria-label="Close Instructor Toolbox" tabIndex={0}>
        <ChevronLeft size={20} />
      </div>

      <div className="toolbox-header">
        <h2>Instructor Tools</h2>
      </div>

      <div className="toolbox-content" style={{ paddingRight: '8px' }}>
        <div className="toolbox-section">
          
          {/* Instructor Tools Button Group */}
          <div className="gb-btn-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button 
              className={`gb-btn ${isDoodling ? 'active' : ''}`}
              onClick={() => setIsDoodling(!isDoodling)}
              aria-pressed={isDoodling}
            >
              <Palette size={16} /> Doodling
            </button>

            <button 
              className="gb-btn"
              onClick={() => handleAddSticker('instructor', 'Confetti.svg', true)}
            >
              🎉 Confetti
            </button>

            <button 
              className={`gb-btn ${mediaType === 'iframe' && mediaUrl?.includes('figma.com') ? 'active' : ''}`}
              onClick={handleMetronome}
            >
              ⏱️ Metronome
            </button>

            {showBpmInput && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                <span style={{ fontSize: '0.8rem', textAlign: 'center' }}>BPM:</span>
                <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
                  <input 
                    type="number" 
                    value={bpmValue}
                    onChange={(e) => setBpmValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitBpm();
                    }}
                    placeholder="#"
                    style={{ flex: 1, padding: '4px', borderRadius: '4px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.3)', color: 'white', minWidth: '0' }}
                  />
                  <button 
                    onClick={submitBpm}
                    style={{ padding: '4px 8px', borderRadius: '4px', background: 'var(--primary-color)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
                  >
                    Start
                  </button>
                </div>
              </div>
            )}

            <button 
              className={`gb-btn ${globalMute ? 'active' : ''}`}
              onClick={() => setGlobalMute(!globalMute)}
              aria-pressed={globalMute}
            >
              {globalMute ? <MicOff size={16} /> : <Mic size={16} />} Mute All / Unmute All
            </button>

            <button 
              className={`gb-btn ${globalPause ? 'active' : ''}`}
              onClick={() => setGlobalPause(!globalPause)}
              aria-pressed={globalPause}
            >
              {globalPause ? <Play size={16} /> : <Pause size={16} />} Pause PEO
            </button>
          </div>

          {/* Program Activity (Upload) Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', width: '100%' }}>
              <button 
                className="gb-btn" 
                style={{ margin: '0 auto', width: '100%' }}
                onClick={() => setShowUploadMenu(!showUploadMenu)}
              >
                <ImageIcon size={16} /> Upload
              </button>
              {showUploadMenu && (
                <div className="upload-dropdown glass-panel" style={{ zIndex: 110 }}>
                  <button onClick={() => fileInputRef.current?.click()}><HardDrive size={14}/> Local Computer</button>
                  <button onClick={handleDriveUpload}><UploadCloud size={14}/> Google Drive</button>
                </div>
              )}
            </div>

            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              accept="image/*,video/*"
              onChange={handleFileUpload}
            />
          </div>

          {/* Instructor Stickers Section */}
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: '8px', minHeight: 0 }}>
            <h3 className="section-title" style={{ margin: '4px 0', paddingBottom: '4px', fontSize: '0.75rem' }}>Instructor Stickers</h3>
            <div className="ito-sticker-grid">
              {availableStickers.map((sticker) => (
                <div 
                  key={sticker.id} 
                  className="sticker-item" 
                  onClick={() => handleAddSticker('instructor', sticker.id, true)}
                  role="button"
                  aria-label={`Add ${sticker.id}`}
                >
                  <img 
                    src={sticker.src} 
                    alt={sticker.id} 
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'contain',
                      ...(sticker.isSmall ? { transform: 'scale(0.7)' } : {})
                    }} 
                  />
                </div>
              ))}
            </div>
            
            <button 
              className="gb-btn"
              onClick={() => handleAddSticker('instructor', 'UNDO_IC', true)}
              style={{ marginTop: '8px', backgroundColor: '#ff4444', color: 'white', padding: '4px 8px', fontSize: '0.8rem' }}
            >
              <X size={14} /> Undo Last Star/Heart
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
