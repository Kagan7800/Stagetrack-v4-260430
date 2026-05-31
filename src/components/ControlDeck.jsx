import React, { useState, useRef } from 'react';
import { Palette, Image as ImageIcon, X, Mic, MicOff, Pause, Play, UploadCloud, HardDrive, RotateCcw, Hand, MessageSquare, Camera, Sparkles, Smile } from 'lucide-react';
import html2canvas from 'html2canvas';
import { useAppContext } from '../context/AppContext';

export default function ControlDeck() {
  const {
    isDoodling, setIsDoodling,
    globalMute, setGlobalMute,
    globalPause, setGlobalPause,
    setMediaUpload, clearMedia, mediaType, mediaUrl,
    handleAddSticker,
    metronomeBpm, setMetronomeBpm,
    isMetronomePlaying, setIsMetronomePlaying,
    activeTheme, setActiveTheme,
    resetStudentState,
    participants, activeGuestId, setActiveGuestId,
    guestButtons, handleToggleGuestButton,
    setIsChatOpen, setIsSidebarOpen
  } = useAppContext();

  const isInstructorClient = sessionStorage.getItem('stagetrack_role') !== 'student';
  const fileInputRef = useRef(null);
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [showMetronomePopover, setShowMetronomePopover] = useState(false);

  // Find targeted guest for instructor rewards
  const activeGuest = participants.find(p => p.id === activeGuestId);

  // Find self for student reactions/actions
  const mySelf = participants.find(p => p.id && String(p.id).startsWith('active-joined')) || 
                 participants.find(p => !p.isInstructor && !p.isBlank) || 
                 participants[1]; // fallback

  const instructorStickers = [
    { id: 'Heart.png', name: 'Heart' },
    { id: 'RealCrown.png', name: 'Crown' },
    { id: 'Happy_Birthday.png', name: 'Birthday' },
    { id: 'Star.png', name: 'Star' },
    { id: 'ic_gold_star.png', name: 'Gold Star' }
  ];

  const studentStickers = [
    { id: 'Balloons.svg', name: 'Balloons' },
    { id: 'Boat.svg', name: 'Boat' },
    { id: 'Dog.svg', name: 'Dog' },
    { id: 'Fish.svg', name: 'Fish' },
    { id: 'Kitten.svg', name: 'Kitten' },
    { id: 'Piano.svg', name: 'Piano' }
  ];

  const studentFilters = [
    { id: 'greenFilter', name: 'Green', color: '#39ff14' },
    { id: 'blueFilter', name: 'Blue', color: '#00bfff' },
    { id: 'purpleFilter', name: 'Purple', color: '#ba55d3' },
    { id: 'orangeFilter', name: 'Orange', color: '#ff8c00' }
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

  const handleMetronomeToggle = () => {
    if (mediaType === 'metronome') {
      clearMedia();
      setIsMetronomePlaying(false);
      setShowMetronomePopover(false);
    } else {
      setMediaUpload('metronome', 'metronome');
      setShowMetronomePopover(true);
    }
  };

  const handleScreenshot = () => {
    const target = document.querySelector('.app-container');
    if (!target) return;

    const deck = document.querySelector('.control-deck-outer');
    const sidebars = document.querySelectorAll('.sidebar, .right-sidebar');
    
    if (deck) deck.style.display = 'none';
    sidebars.forEach(s => s.style.display = 'none');

    setTimeout(() => {
      html2canvas(target, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#090d16',
        scale: 2
      }).then((canvas) => {
        if (deck) deck.style.display = '';
        sidebars.forEach(s => s.style.display = '');

        const image = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `screenshot-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
        link.href = image;
        link.click();
      }).catch((err) => {
        console.error("Screenshot failed:", err);
        if (deck) deck.style.display = '';
        sidebars.forEach(s => s.style.display = '');
      });
    }, 50);
  };

  const handleStudentFilterToggle = (filterId) => {
    if (!mySelf) return;
    handleToggleGuestButton(mySelf.id, filterId);
  };

  const handleStudentStickerAdd = (stickerId) => {
    if (!mySelf) return;
    handleAddSticker(mySelf.id, stickerId, false);
  };

  const selfButtons = mySelf ? (guestButtons[mySelf.id] || { raiseHand: false, mute: false, chat: false }) : { raiseHand: false, mute: false, chat: false };

  return (
    <div className="control-deck-outer" style={{ width: '100%', marginTop: '12px', zIndex: 50, position: 'relative' }}>
      <div className="control-deck glass-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', borderRadius: '12px', boxSizing: 'border-box', gap: '16px' }}>
        
        {isInstructorClient ? (
          /* INSTRUCTOR CONTROL DECK */
          <>
            {/* Group 1: Classroom Controls */}
            <div className="deck-group">
              <button 
                className={`deck-btn ${!globalMute ? 'active' : ''}`}
                onClick={() => setGlobalMute(!globalMute)}
                title={globalMute ? 'Unmute Classroom' : 'Mute Classroom'}
              >
                {globalMute ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
              
              <button 
                className={`deck-btn ${globalPause ? 'active' : ''}`}
                onClick={() => setGlobalPause(!globalPause)}
                title={globalPause ? 'Resume PEOs' : 'Pause PEOs'}
              >
                {globalPause ? <Play size={16} /> : <Pause size={16} />}
              </button>

              <button 
                className="deck-btn celebrate-btn"
                onClick={() => handleAddSticker('instructor', 'Confetti.svg', true)}
                title="Trigger Confetti 🎉"
              >
                <span>🎉</span>
              </button>
            </div>

            <div className="deck-divider" />

            {/* Group 2: Teaching Tools */}
            <div className="deck-group">
              <button 
                className={`deck-btn ${isDoodling ? 'active' : ''}`}
                onClick={() => setIsDoodling(!isDoodling)}
                title="Toggle Drawing Canvas"
              >
                <Palette size={16} />
              </button>

              <div style={{ position: 'relative' }}>
                <button 
                  className={`deck-btn ${mediaType === 'metronome' ? 'active' : ''}`}
                  onClick={handleMetronomeToggle}
                  title="Toggle Metronome"
                >
                  <span>⏱️</span>
                </button>
                {mediaType === 'metronome' && showMetronomePopover && (
                  <div className="metronome-popover glass-panel">
                    <div className="popover-header">
                      <span>Metronome Settings</span>
                      <button onClick={() => setShowMetronomePopover(false)} className="close-pop-btn"><X size={12} /></button>
                    </div>
                    <div className="popover-body">
                      <div className="tempo-row">
                        <span className="bpm-label">BPM: {metronomeBpm}</span>
                        <button 
                          onClick={() => setIsMetronomePlaying(!isMetronomePlaying)}
                          className={`metro-play-btn ${isMetronomePlaying ? 'playing' : ''}`}
                        >
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
                    </div>
                  </div>
                )}
              </div>

              <div style={{ position: 'relative' }}>
                <button 
                  className={`deck-btn ${mediaUrl && mediaType !== 'metronome' ? 'active' : ''}`}
                  onClick={() => setShowUploadMenu(!showUploadMenu)}
                  title="Upload Media (Image/Video)"
                >
                  <ImageIcon size={16} />
                </button>
                {showUploadMenu && (
                  <div className="upload-dropdown glass-panel" style={{ bottom: '40px', top: 'auto', left: '0', zIndex: 110 }}>
                    <button onClick={() => fileInputRef.current?.click()}><HardDrive size={14}/> Local Computer</button>
                    <button onClick={handleDriveUpload}><UploadCloud size={14}/> Google Drive</button>
                  </div>
                )}
              </div>

              {mediaUrl && (
                <button className="deck-btn clear-media-btn" onClick={clearMedia} title="Clear Media">
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="deck-divider" />

            {/* Group 3: Reward Stickers (Requires active guest selected) */}
            <div className="deck-group rewards-group" style={{ flex: 1, justifyContent: 'flex-start' }}>
              <span className="group-label">Sticker Deck:</span>
              {instructorStickers.map((sticker) => (
                <button 
                  key={sticker.id}
                  className="deck-sticker-btn"
                  onClick={() => {
                    if (!activeGuest) {
                      alert("Please select a student in the grid first to apply rewards!");
                      return;
                    }
                    handleAddSticker(activeGuest.id, sticker.id, true);
                  }}
                  title={activeGuest ? `Reward ${activeGuest.name} with ${sticker.name}` : `Select student to reward with ${sticker.name}`}
                  style={{ opacity: activeGuest ? 1 : 0.4 }}
                >
                  <img src={`/assets/svg_stickers/${sticker.id}`} alt={sticker.name} />
                </button>
              ))}
              {activeGuest && (
                <>
                  <div className="deck-sub-divider" />
                  <button 
                    className="deck-btn undo-btn"
                    onClick={() => handleAddSticker(activeGuest.id, 'UNDO_IC', true)}
                    title="Undo Last Reward on Selected Student"
                  >
                    <RotateCcw size={14} />
                  </button>
                </>
              )}
            </div>

            {/* Target name indicator */}
            <div className="active-student-indicator">
              {activeGuest ? (
                <span className="active-student-name">targeting: {activeGuest.name}</span>
              ) : (
                <span className="active-student-hint">select student to reward</span>
              )}
            </div>
          </>
        ) : (
          /* STUDENT CONTROL DECK */
          <>
            {/* Group 1: Student Quick Controls */}
            <div className="deck-group">
              <button 
                className={`deck-btn ${selfButtons.raiseHand ? 'active' : ''}`}
                onClick={() => mySelf && handleToggleGuestButton(mySelf.id, 'raiseHand')}
                title="Raise Hand"
              >
                <Hand size={16} />
              </button>

              <button 
                className={`deck-btn ${selfButtons.mute ? 'active' : ''}`}
                onClick={() => mySelf && handleToggleGuestButton(mySelf.id, 'mute')}
                title="Mute/Unmute Webcam"
              >
                {selfButtons.mute ? <MicOff size={16} /> : <Mic size={16} />}
              </button>

              <button 
                className={`deck-btn ${selfButtons.chat ? 'active' : ''}`}
                onClick={() => setIsChatOpen(!selfButtons.chat)}
                title="Open Chat"
              >
                <MessageSquare size={16} />
              </button>

              <button 
                className="deck-btn screenshot-btn"
                onClick={handleScreenshot}
                title="Take a Picture"
              >
                <Camera size={16} />
              </button>
            </div>

            <div className="deck-divider" />

            {/* Group 2: My Reactions (Stickers) */}
            <div className="deck-group reactions-group" style={{ flex: 1, justifyContent: 'flex-start' }}>
              <span className="group-label">Reactions:</span>
              {studentStickers.map((sticker) => (
                <button 
                  key={sticker.id}
                  className="deck-sticker-btn"
                  onClick={() => handleStudentStickerAdd(sticker.id)}
                  title={`Place ${sticker.name} sticker`}
                >
                  <img src={`/assets/svg_stickers/${sticker.id}`} alt={sticker.name} />
                </button>
              ))}
              {mySelf && (
                <>
                  <div className="deck-sub-divider" />
                  <button 
                    className="deck-btn undo-btn"
                    onClick={() => handleAddSticker(mySelf.id, 'UNDO_LAST_PEO', false)}
                    title="Undo My Last Reaction"
                  >
                    <RotateCcw size={14} />
                  </button>
                </>
              )}
            </div>

            <div className="deck-divider" />

            {/* Group 3: My Filters */}
            <div className="deck-group filters-group">
              <span className="group-label">Filters:</span>
              {studentFilters.map((filter) => {
                const isActive = selfButtons[filter.id] || false;
                return (
                  <button 
                    key={filter.id}
                    className={`deck-filter-btn ${isActive ? 'active' : ''}`}
                    onClick={() => handleStudentFilterToggle(filter.id)}
                    style={{ '--filter-color': filter.color }}
                    title={`Toggle ${filter.name} Filter`}
                  >
                    <Sparkles size={12} color="#ffffff" />
                  </button>
                );
              })}
              {mySelf && (buttons.greenFilter || buttons.blueFilter || buttons.purpleFilter || buttons.orangeFilter) && (
                <button 
                  className="deck-btn clear-filters-btn"
                  onClick={() => {
                    ['greenFilter', 'blueFilter', 'purpleFilter', 'orangeFilter'].forEach(fId => {
                      if (selfButtons[fId]) handleStudentFilterToggle(fId);
                    });
                  }}
                  title="Remove Filters"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </>
        )}

        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept="image/*,video/*"
          onChange={handleFileUpload}
        />
      </div>
    </div>
  );
}
