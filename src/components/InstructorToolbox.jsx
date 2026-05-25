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
    setMediaUpload, clearMedia, mediaType,
    handleAddSticker,
    metronomeBpm, setMetronomeBpm,
    isMetronomePlaying, setIsMetronomePlaying
  } = useAppContext();

  const fileInputRef = useRef(null);
  const [showUploadMenu, setShowUploadMenu] = useState(false);

  const availableStickers = [
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

  const handleMetronome = () => {
    if (mediaType === 'metronome') {
      clearMedia();
      setIsMetronomePlaying(false);
    } else {
      setMediaUpload('metronome', 'metronome');
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
          
          {/* Container for all buttons above Instructor Stickers */}
          <div className="ito-buttons-container">
            <button 
              className={`gb-btn ${isDoodling ? 'active' : ''}`}
              onClick={() => setIsDoodling(!isDoodling)}
              aria-pressed={isDoodling}
            >
              <Palette size={26} /> Doodling
            </button>

            <button 
              className="gb-btn"
              onClick={() => handleAddSticker('instructor', 'Confetti.svg', true)}
            >
              🎉 Confetti
            </button>

            <div className="metronome-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
              <button 
                className={`gb-btn ${mediaType === 'metronome' ? 'active' : ''}`}
                onClick={handleMetronome}
                style={{ width: '100%' }}
              >
                ⏱️ Metronome
              </button>

              {mediaType === 'metronome' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '8px', border: '1px solid var(--glass-border)', width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>BPM: {metronomeBpm}</span>
                    <button 
                      onClick={() => setIsMetronomePlaying(!isMetronomePlaying)}
                      style={{ padding: '2px 8px', borderRadius: '4px', background: isMetronomePlaying ? '#ef4444' : '#22c55e', color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      {isMetronomePlaying ? <Pause size={10} /> : <Play size={10} />}
                      {isMetronomePlaying ? 'Stop' : 'Start'}
                    </button>
                  </div>
                  
                  <input 
                    type="range"
                    min="40"
                    max="240"
                    value={metronomeBpm}
                    onChange={(e) => setMetronomeBpm(parseInt(e.target.value, 10))}
                    style={{ width: '100%', accentColor: 'var(--primary-color)' }}
                  />

                  <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
                    <input 
                      type="number" 
                      value={metronomeBpm || ''}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (isNaN(val)) setMetronomeBpm('');
                        else setMetronomeBpm(val);
                      }}
                      onBlur={() => {
                        const val = parseInt(metronomeBpm, 10);
                        if (isNaN(val) || val < 40) setMetronomeBpm(40);
                        else if (val > 240) setMetronomeBpm(240);
                      }}
                      placeholder="BPM"
                      style={{ flex: 1, padding: '4px', borderRadius: '4px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.3)', color: 'white', fontSize: '0.8rem', minWidth: '0' }}
                    />
                    <button 
                      onClick={() => {
                        const now = performance.now();
                        if (!window.tapTimes) window.tapTimes = [];
                        window.tapTimes.push(now);
                        if (window.tapTimes.length > 4) window.tapTimes.shift();
                        if (window.tapTimes.length >= 2) {
                          const intervals = [];
                          for (let i = 1; i < window.tapTimes.length; i++) {
                            intervals.push(window.tapTimes[i] - window.tapTimes[i-1]);
                          }
                          const avg = intervals.reduce((a,b)=>a+b,0) / intervals.length;
                          const calculated = Math.round(60000 / avg);
                          if (calculated >= 40 && calculated <= 240) setMetronomeBpm(calculated);
                        }
                      }}
                      style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid var(--glass-border)', cursor: 'pointer', fontSize: '0.75rem' }}
                    >
                      TAP
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button 
              className={`gb-btn ${!globalMute ? 'active' : ''}`}
              onClick={() => setGlobalMute(!globalMute)}
              aria-pressed={!globalMute}
            >
              {globalMute ? <MicOff size={26} /> : <Mic size={26} />} {globalMute ? 'Unmute' : 'Mute'}
            </button>

            <button 
              className={`gb-btn ${globalPause ? 'active' : ''}`}
              onClick={() => setGlobalPause(!globalPause)}
              aria-pressed={globalPause}
            >
              {globalPause ? <Play size={26} /> : <Pause size={26} />} Pause PEO
            </button>

            <div className="upload-wrapper" style={{ position: 'relative', width: '100%' }}>
              <button 
                className="gb-btn" 
                style={{ width: '100%' }}
                onClick={() => setShowUploadMenu(!showUploadMenu)}
              >
                <ImageIcon size={26} /> Upload
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
          <div className="ito-stickers-section">
            <h3 className="section-title">Instructor Stickers</h3>
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
              style={{ marginTop: '8px', backgroundColor: '#ff4444', color: 'white', padding: '4px 8px', fontSize: '1.35rem' }}
            >
              <X size={24} /> Undo Last Star/Heart
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
