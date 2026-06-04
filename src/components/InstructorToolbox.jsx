import { useRef, useState } from 'react';
import { Palette, Image as ImageIcon, X, Mic, MicOff, Pause, Play, ChevronLeft, ChevronRight, UploadCloud, HardDrive, RotateCcw, Smile, Trash2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export default function InstructorToolbox() {
  const {
    isDoodling, setIsDoodling,
    globalMute, setGlobalMute,
    globalPause, setGlobalPause,
    isSidebarOpen, setIsSidebarOpen,
    setMediaUpload, clearMedia, mediaType, mediaUrl,
    handleAddSticker, activeGuestId,
    metronomeBpm, setMetronomeBpm,
    isMetronomePlaying, setIsMetronomePlaying,
    showInstructorStickers, setShowInstructorStickers,
    activeTheme, setActiveTheme,
    resetStudentState,
    setPendingRequest
  } = useAppContext();

  const isSor = activeTheme === 'sor';
  const themeTextColor = isSor ? '#ef4444' : '#3b82f6';
  const themeSubtextColor = isSor ? 'rgba(239, 68, 68, 0.7)' : 'rgba(59, 130, 246, 0.7)';
  const themeTextShadow = isSor ? '0 0 8px rgba(239, 68, 68, 0.18)' : '0 0 8px rgba(59, 130, 246, 0.18)';

  const fileInputRef = useRef(null);
  const [showUploadMenu, setShowUploadMenu] = useState(false);

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

  const handleSimulateRequest = () => {
    const reqData = {
      myName: "Jessica",
      myLittleOne: "Danny",
      color: "hsl(140, 70%, 60%)",
      selectedIcon: "Balloons.svg",
      selectedBorder: "#00FCFC"
    };
    localStorage.setItem('stagetrack_lobby_request', JSON.stringify(reqData));
    setPendingRequest(reqData);
  };

  return (
    <div className="glass-panel sidebar instructor-toolbox" style={{ height: '100%', borderRight: 'none', position: 'relative' }}>
      <div className="toolbox-header" style={{ minHeight: '52px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '12px 16px', position: 'relative' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', textAlign: 'center', maxWidth: '160px', width: '100%', position: 'relative', left: '-20px' }}>
          <span style={{ color: '#ffffff', textShadow: themeTextShadow, fontSize: '0.92rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', width: '100%' }} title="Instructor Tools">
            Instructor Tools
          </span>
          <span style={{ fontSize: '12px', color: '#ffffff', textTransform: 'lowercase', letterSpacing: '-0.02em', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', width: '100%' }}>
            double-click for STO
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
          
          {/* ZONE 1: CLASSROOM QUICK ACTIONS (3-column layout) */}
          <div className="ito-section-label">Classroom Controls</div>
          <div className="ito-grid-3">
            <button 
              className={`ito-icon-btn ${!globalMute ? 'active' : ''}`}
              onClick={() => setGlobalMute(!globalMute)}
              aria-pressed={!globalMute}
              title={globalMute ? 'Unmute PEO' : 'Mute PEO'}
            >
              <div className="icon-wrapper">
                {globalMute ? <MicOff size={20} /> : <Mic size={20} />}
              </div>
              <span className="btn-label">{globalMute ? 'unmute' : 'mute'}</span>
            </button>

            <button 
              className={`ito-icon-btn ${globalPause ? 'active' : ''}`}
              onClick={() => setGlobalPause(!globalPause)}
              aria-pressed={globalPause}
              title={globalPause ? 'Resume PEO' : 'Pause PEO'}
            >
              <div className="icon-wrapper">
                {globalPause ? <Play size={20} /> : <Pause size={20} />}
              </div>
              <span className="btn-label">{globalPause ? 'resume' : 'pause'}</span>
            </button>

            <button 
              className="ito-icon-btn celebrate-btn"
              onClick={() => handleAddSticker('instructor', 'Confetti.svg', true)}
              title="Trigger Confetti Celebration"
            >
              <div className="icon-wrapper">
                <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>🎉</span>
              </div>
              <span className="btn-label">confetti</span>
            </button>
          </div>

          {/* ZONE 2: TEACHING & MEDIA TOOLS (3-column layout) */}
          <div className="ito-section-label">Teaching Tools</div>
          <div className="ito-grid-3">
            <button 
              className={`ito-icon-btn ${isDoodling ? 'active' : ''}`}
              onClick={() => setIsDoodling(!isDoodling)}
              aria-pressed={isDoodling}
              title="Toggle Doodling Canvas"
            >
              <div className="icon-wrapper">
                <Palette size={20} />
              </div>
              <span className="btn-label">doodle</span>
            </button>

            <button 
              className={`ito-icon-btn ${mediaType === 'metronome' ? 'active' : ''}`}
              onClick={handleMetronome}
              title="Toggle Metronome"
            >
              <div className="icon-wrapper">
                <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>⏱️</span>
              </div>
              <span className="btn-label">tempo</span>
            </button>

            <div style={{ position: 'relative' }}>
              <button 
                className={`ito-icon-btn ${mediaUrl && mediaType !== 'metronome' ? 'active' : ''}`}
                onClick={() => setShowUploadMenu(!showUploadMenu)}
                title="Upload Media (Image/Video)"
              >
                <div className="icon-wrapper">
                  <ImageIcon size={20} />
                </div>
                <span className="btn-label">upload</span>
              </button>
              
              {showUploadMenu && (
                <div className="upload-dropdown glass-panel" style={{ zIndex: 110 }}>
                  <button onClick={() => fileInputRef.current?.click()}><HardDrive size={14}/> Local Computer</button>
                  <button onClick={handleDriveUpload}><UploadCloud size={14}/> Google Drive</button>
                </div>
              )}
            </div>
            
          </div>

          {/* ZONE 3: STICKERS */}
          <div className="ito-section-label" style={{ marginTop: '20px' }}>Stickers</div>
          <div className="ito-grid-3">
            <button 
              className={`ito-icon-btn ${showInstructorStickers ? 'active' : ''}`}
              onClick={() => {
                const nextState = !showInstructorStickers;
                setShowInstructorStickers(nextState);
                if (nextState) setIsSidebarOpen(false);
              }}
              title="Toggle Sticker Deck"
            >
              <div className="icon-wrapper">
                <Smile size={20} />
              </div>
              <span className="btn-label">stickers</span>
            </button>

            <button 
              className="ito-icon-btn"
              onClick={() => {
                if (activeGuestId) handleAddSticker(activeGuestId, 'UNDO_IC', true);
                else alert("Please select a student in the grid first!");
              }}
              title="Remove Stickers"
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'center', lineHeight: '1.2' }}>
                <span className="btn-label">remove</span>
                <span className="btn-label">stickers</span>
              </div>
            </button>

            <button 
              className="ito-icon-btn"
              onClick={() => handleAddSticker('instructor', 'UNDO_ALL_PEO', true)}
              title="Remove all peo Stickers"
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'center', lineHeight: '1.2' }}>
                <span className="btn-label">remove</span>
                <span className="btn-label">all peo</span>
              </div>
            </button>
          </div>

          {/* Collapsible Metronome Drawer */}
          {mediaType === 'metronome' && (
            <div className="metronome-drawer">
              <div className="metronome-control-row">
                <span className="bpm-display">BPM: {metronomeBpm}</span>
                <button 
                  onClick={() => setIsMetronomePlaying(!isMetronomePlaying)}
                  className={`metro-play-btn ${isMetronomePlaying ? 'playing' : ''}`}
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
                className="bpm-slider"
              />

              <div className="metronome-input-row">
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
                  className="bpm-input"
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
                  className="metro-tap-btn"
                >
                  TAP
                </button>
              </div>
            </div>
          )}

          {/* Active media clear row if uploaded */}
          {mediaUrl && mediaType !== 'metronome' && (
            <div className="active-media-bar">
              <span className="media-info-text">Media Active</span>
              <button className="clear-media-btn" onClick={clearMedia} title="Clear Media">
                <X size={14} /> Clear
              </button>
            </div>
          )}

          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            accept="image/*,video/*"
            onChange={handleFileUpload}
          />

          <div style={{ width: '90%', height: '1px', background: 'var(--glass-border)', margin: '14px auto 10px auto' }} />

          {/* ZONE 3: MUTED SETTINGS & ADMIN */}
          <div className="ito-admin-section">
            <div className="ito-theme-grid">
              <button 
                className={`ito-admin-btn ${activeTheme === 'music-fun' ? 'active' : ''}`}
                onClick={() => setActiveTheme('music-fun')}
              >
                Music Theme
              </button>
              <button 
                className={`ito-admin-btn ${activeTheme === 'sor' ? 'active' : ''}`}
                onClick={() => setActiveTheme('sor')}
              >
                SOR Theme
              </button>
            </div>

            <div className="ito-utility-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              <button 
                className="ito-admin-btn"
                onClick={resetStudentState}
                title="Reset Room / Refresh Session"
              >
                Reset Room
              </button>

              <button 
                className="ito-admin-btn"
                onClick={() => handleAddSticker('instructor', 'UNDO_ALL_PEO', true)}
                title="Clear all stickers from all PEOs"
              >
                Clear Stickers
              </button>

              <button 
                className="ito-admin-btn simulate-btn"
                onClick={handleSimulateRequest}
              >
                Simulate PEO
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
