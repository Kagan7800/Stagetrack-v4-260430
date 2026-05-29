import { useRef, useState } from 'react';
import { Palette, Image as ImageIcon, X, Mic, MicOff, Pause, Play, ChevronLeft, ChevronRight, UploadCloud, HardDrive, RotateCw } from 'lucide-react';
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
    setMediaUpload, clearMedia, mediaType, mediaUrl,
    handleAddSticker,
    metronomeBpm, setMetronomeBpm,
    isMetronomePlaying, setIsMetronomePlaying,
    activeTheme, setActiveTheme,
    resetStudentState
  } = useAppContext();

  const isSor = activeTheme === 'sor';
  const themeTextColor = isSor ? '#ef4444' : '#3b82f6';
  const themeSubtextColor = isSor ? 'rgba(239, 68, 68, 0.7)' : 'rgba(59, 130, 246, 0.7)';
  const themeTextShadow = isSor ? '0 0 8px rgba(239, 68, 68, 0.18)' : '0 0 8px rgba(59, 130, 246, 0.18)';

  const fileInputRef = useRef(null);
  const [showUploadMenu, setShowUploadMenu] = useState(false);

  const availableStickers = [
    { id: 'Heart.png', src: heartPng, isSmall: true },
    { id: 'RealCrown.png', src: crownPng }, 
    { id: 'Happy_Birthday.png', src: birthdayPng }, 
    { id: 'Star.png', src: starPng },
    { id: 'Piano.svg', src: '/assets/svg_stickers/Piano.svg' },
    { id: 'ic star1.png', src: '/assets/svg_stickers/ic star1.png' },
    { id: 'ic star1_red.png', src: '/assets/svg_stickers/ic star1_red.png' },
    { id: 'ic_gold_star.png', src: '/assets/svg_stickers/ic_gold_star.png' }
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

  return (
    <div className="glass-panel sidebar instructor-toolbox" style={{ height: '100%', borderRight: 'none', position: 'relative' }}>
      <div className="toolbox-header" style={{ minHeight: '52px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '12px 16px', position: 'relative' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', textAlign: 'center' }}>
          <span style={{ color: themeTextColor, textShadow: themeTextShadow, fontSize: '1.08rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Instructor Tools
          </span>
          <span style={{ fontSize: '12px', color: themeSubtextColor, textTransform: 'lowercase', letterSpacing: '-0.02em', fontWeight: 500 }}>
            double-click your box to select STO
          </span>
        </div>
        <button onClick={() => setIsSidebarOpen(false)} className="close-btn" style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg 
            width="32" 
            height="32" 
            viewBox="0 0 328 259" 
            style={{ 
              transform: 'rotate(180deg)',
              objectFit: 'contain'
            }}
          >
            <path 
              d="M 154.88 17.14 L 163.26 21.57 L 301.25 123.09 L 311.60 133.94 L 309.63 138.86 L 162.28 241.86 L 158.83 240.88 L 157.35 235.95 L 152.91 234.96 L 150.94 231.51 L 162.28 174.35 L 31.18 188.15 L 24.78 187.65 L 22.81 182.72 L 18.86 181.74 L 16.40 178.29 L 16.89 77.26 L 23.79 75.29 L 163.75 90.07 L 150.94 22.56 L 151.93 18.62 L 154.39 17.63 Z" 
              fill={themeTextColor} 
              stroke="#fbbf24" 
              strokeWidth="20" 
              strokeLinejoin="round" 
              strokeLinecap="round" 
            />
          </svg>
        </button>
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
              {globalMute ? <MicOff size={18} /> : <Mic size={18} />} {globalMute ? 'Unmute' : 'Mute'}
            </button>

            <button 
              className={`gb-btn ${globalPause ? 'active' : ''}`}
              onClick={() => setGlobalPause(!globalPause)}
              aria-pressed={globalPause}
            >
              {globalPause ? <Play size={18} /> : <Pause size={18} />} Pause PEO
            </button>

            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
              <div className="upload-wrapper" style={{ position: 'relative', flex: 1 }}>
                <button 
                  className="gb-btn" 
                  style={{ width: '100%' }}
                  onClick={() => setShowUploadMenu(!showUploadMenu)}
                >
                  <ImageIcon size={18} /> Upload
                </button>
                {showUploadMenu && (
                  <div className="upload-dropdown glass-panel" style={{ zIndex: 110 }}>
                    <button onClick={() => fileInputRef.current?.click()}><HardDrive size={14}/> Local Computer</button>
                    <button onClick={handleDriveUpload}><UploadCloud size={14}/> Google Drive</button>
                  </div>
                )}
              </div>
              {mediaUrl && (
                <button 
                  className="gb-btn"
                  onClick={clearMedia}
                  style={{ width: 'auto', padding: '0 16px', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#ff4444', color: 'white' }}
                  title="Clear Media"
                >
                  <X size={18} />
                </button>
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
            
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px', width: '100%' }}>
              <button 
                className="gb-btn"
                onClick={() => handleAddSticker('instructor', 'UNDO_IC', true)}
                style={{ flex: 1, padding: '8px 4px', fontSize: '0.85rem', whiteSpace: 'normal', height: 'auto', minWidth: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center', lineHeight: '1.2' }}
              >
                Undo Last Sticker
              </button>
              <button 
                className="gb-btn"
                onClick={() => handleAddSticker('instructor', 'UNDO_ALL_IC', true)}
                style={{ flex: 1, padding: '8px 4px', fontSize: '0.85rem', whiteSpace: 'normal', height: 'auto', minWidth: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center', lineHeight: '1.2' }}
              >
                Undo all Stickers
              </button>
              <button 
                className="gb-btn"
                onDoubleClick={() => handleAddSticker('instructor', 'UNDO_ALL_PEO', true)}
                style={{ flex: 1, padding: '8px 4px', fontSize: '0.85rem', whiteSpace: 'normal', height: 'auto', minWidth: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center', lineHeight: '1.2' }}
                title="Double click to clear all PEO stickers"
              >
                Undo all peo
              </button>
            </div>
          </div>

          {/* --- STUDIO THEME SELECTOR --- */}
          <div className="ito-theme-selector-container" style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%', marginTop: '0px', paddingTop: '1px' }}>
            <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
              <button 
                className={`gb-btn ${activeTheme === 'music-fun' ? 'active active-music' : ''}`}
                onClick={() => setActiveTheme('music-fun')}
                style={{ flex: 1, padding: '6px 4px', fontSize: '0.78rem', whiteSpace: 'nowrap', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2px', border: 'none' }}
              >
                Music
              </button>
              <button 
                className={`gb-btn ${activeTheme === 'sor' ? 'active active-sor' : ''}`}
                onClick={() => setActiveTheme('sor')}
                style={{ flex: 1, padding: '6px 4px', fontSize: '0.78rem', whiteSpace: 'nowrap', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2px', border: 'none' }}
              >
                SOR
              </button>
            </div>
            <button 
              className="gb-btn"
              onClick={resetStudentState}
              style={{ width: 'auto', padding: '6px 10px', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: '4px', border: 'none' }}
              title="Reset Room / Refresh Session"
            >
              <RotateCw size={16} />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
