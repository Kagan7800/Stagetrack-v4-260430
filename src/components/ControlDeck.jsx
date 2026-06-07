import React, { useState, useRef } from 'react';
import { X, Sparkles } from 'lucide-react';
import html2canvas from 'html2canvas';
import { useAppContext } from '../context/AppContext';
import { instructorStickers, studentStickers } from '../constants/stickers';

export default function ControlDeck() {
  const {
    isDoodling, setIsDoodling,
    globalMute, setGlobalMute,
    globalPause, setGlobalPause,
    setMediaUpload, clearMedia, mediaType, mediaUrl,
    handleAddSticker, guestStickers,
    metronomeBpm, setMetronomeBpm,
    isMetronomePlaying, setIsMetronomePlaying,
    activeTheme, setActiveTheme,
    resetStudentState,
    participants, activeGuestId, setActiveGuestId,
    guestButtons, handleToggleGuestButton,
    setIsChatOpen, setIsSidebarOpen,
    showInstructorStickers, setShowInstructorStickers,
    showStudentStickers, setShowStudentStickers,
    showStudentFilters, setShowStudentFilters,
    activeItoSection, setActiveItoSection,
    isPeoStickersOpen, setIsPeoStickersOpen
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

        // Create a mirrored canvas
        const mirrorCanvas = document.createElement('canvas');
        mirrorCanvas.width = canvas.width;
        mirrorCanvas.height = canvas.height;
        const ctx = mirrorCanvas.getContext('2d');
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(canvas, 0, 0);

        const image = mirrorCanvas.toDataURL('image/png');
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

  const shouldShowStudentStickers = showStudentStickers;
  const shouldShowStudentFilters = showStudentFilters;
  const shouldShowStudioControls = isInstructorClient && activeItoSection === 'studio';
  // Always show instructor deck if no other specific deck is requested
  const shouldShowInstructorDeck = isInstructorClient && showInstructorStickers && !shouldShowStudentStickers && !shouldShowStudentFilters && !isPeoStickersOpen;

  if (!shouldShowInstructorDeck && !shouldShowStudentStickers && !shouldShowStudentFilters && !isPeoStickersOpen && !shouldShowStudioControls) {
    return null;
  }

  const targetId = isInstructorClient ? activeGuest?.id : mySelf?.id;
  const stickerCount = targetId && guestStickers[targetId] ? guestStickers[targetId].length : 0;
  const targetBtns = targetId ? (guestButtons[targetId] || { raiseHand: false, mute: false, chat: false }) : { raiseHand: false, mute: false, chat: false };

  const handleStickerClick = (stickerId) => {
    if (!targetId) {
      if (isInstructorClient) alert("Please select a student in the grid first to apply rewards!");
      return;
    }
    handleAddSticker(targetId, stickerId, false);
  };

  const handleUndoSticker = () => {
    if (targetId) handleAddSticker(targetId, 'UNDO_LAST_PEO', false);
  };

  const handleFilterClick = (filterId) => {
    if (targetId) handleToggleGuestButton(targetId, filterId);
  };

  const handleClearFilters = () => {
    if (targetId) {
      ['greenFilter', 'blueFilter', 'purpleFilter', 'orangeFilter'].forEach(fId => {
        if (targetBtns[fId]) handleToggleGuestButton(targetId, fId);
      });
    }
  };

  return (
    <div className="control-deck-outer" style={{ zIndex: 50, position: 'relative', marginBottom: '5px' }}>
      <div className="control-deck" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '0', boxSizing: 'border-box', position: 'relative' }}>
        
        {/* ROW 1: INSTRUCTOR STICKERS */}
        {shouldShowInstructorDeck && (
          <div className="deck-row glass-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', position: 'relative', background: 'rgba(30, 41, 59, 0.35)', padding: '10px 50px 8px 16px', borderRadius: '12px', height: 'var(--peo-height)', boxSizing: 'border-box' }}>
            
            <button
              onClick={() => {
                setShowInstructorStickers(false);
                setActiveItoSection(null);
              }}
              className="cd-close-btn"
              style={{
                position: 'absolute',
                right: '12px',
                top: '4px',
                transform: 'rotate(-15deg)',
                background: 'transparent',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'white',
                transition: 'all 0.2s ease',
                zIndex: 10,
                fontFamily: '"Risque", serif',
                fontSize: '36px',
                lineHeight: '1',
                padding: '4px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#ef4444';
                e.currentTarget.style.transform = 'rotate(-15deg) scale(1.1)';
                e.currentTarget.style.textShadow = '0 0 10px rgba(239, 68, 68, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.transform = 'rotate(-15deg) scale(1)';
                e.currentTarget.style.textShadow = 'none';
              }}
            >
              X
            </button>

            <div className="deck-group rewards-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '8px', height: '100%', position: 'relative' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '8px', marginBottom: '5px' }}>
                <span 
                  className="group-label" 
                  style={{ textAlign: 'center', visibility: 'hidden', pointerEvents: 'none' }}
                >
                  Instructor Stickers {activeGuest ? `- ${activeGuest.name} of peo` : ''}
                </span>
                <span 
                  className="group-label" 
                  style={{ 
                    position: 'absolute', 
                    top: '10px', 
                    left: '50%', 
                    transform: 'translateX(-50%)', 
                    textAlign: 'center', 
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    zIndex: 5,
                    visibility: 'visible'
                  }}
                  onClick={() => {
                    setShowInstructorStickers(false);
                    setActiveItoSection(null);
                  }}
                  title="Close Instructor Stickers"
                >
                  Instructor Stickers {activeGuest ? `- ${activeGuest.name} of peo` : ''}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
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
                    style={{ opacity: 1, width: 'calc(var(--peo-height) * 0.45)', height: 'calc(var(--peo-height) * 0.45)', maxWidth: '61px', maxHeight: '61px', minWidth: '36px', minHeight: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px' }}
                  >
                    <img src={`/assets/svg_stickers/${sticker.id}`} alt={sticker.name} style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                  </button>
                ))}
              </div>
              <button
                onClick={() => setIsPeoStickersOpen(!isPeoStickersOpen)}
                style={{
                  background: 'transparent',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '11px',
                  whiteSpace: 'nowrap',
                  padding: '4px 12px',
                  opacity: 0.8,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                Open PEO Stickers
              </button>
            </div>
          </div>
        )}

        {/* ROW 1B: STUDIO CONTROLS */}
        {shouldShowStudioControls && (
          <div className="deck-row glass-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', position: 'relative', background: 'rgba(30, 41, 59, 0.35)', padding: '10px 50px 8px 16px', borderRadius: '12px', height: 'var(--peo-height)', boxSizing: 'border-box' }}>
            
            <button
              onClick={() => {
                setActiveItoSection(null);
              }}
              className="cd-close-btn"
              style={{
                position: 'absolute',
                right: '12px',
                top: '4px',
                transform: 'rotate(-15deg)',
                background: 'transparent',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'white',
                transition: 'all 0.2s ease',
                zIndex: 10,
                fontFamily: '"Risque", serif',
                fontSize: '36px',
                lineHeight: '1',
                padding: '4px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#ef4444';
                e.currentTarget.style.transform = 'rotate(-15deg) scale(1.1)';
                e.currentTarget.style.textShadow = '0 0 10px rgba(239, 68, 68, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.transform = 'rotate(-15deg) scale(1)';
                e.currentTarget.style.textShadow = 'none';
              }}
            >
              X
            </button>

            <div className="deck-group studio-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '8px', height: '100%', position: 'relative' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '8px', marginBottom: '5px' }}>
                <span 
                  className="group-label" 
                  style={{ textAlign: 'center', visibility: 'hidden', pointerEvents: 'none' }}
                >
                  Studio Controls
                </span>
                <span 
                  className="group-label" 
                  style={{ 
                    position: 'absolute', 
                    top: '10px', 
                    left: '50%', 
                    transform: 'translateX(-50%)', 
                    textAlign: 'center', 
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    zIndex: 5,
                    visibility: 'visible'
                  }}
                  onClick={() => {
                    setActiveItoSection(null);
                  }}
                  title="Close Studio Controls"
                >
                  Studio Controls
                </span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', width: '100%' }}>
                {/* Doodling */}
                <button 
                  className={`gb-btn ${isDoodling ? 'active' : ''}`}
                  onClick={() => setIsDoodling(!isDoodling)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '0.9rem', borderRadius: '8px', cursor: 'pointer', border: '1px solid var(--glass-border)', background: isDoodling ? 'rgba(255,255,255,0.2)' : 'transparent', color: 'white' }}
                >
                  Doodling
                </button>

                <div style={{ width: '1px', height: '24px', background: 'var(--glass-border)' }} />

                {/* Confetti */}
                <button 
                  className="gb-btn"
                  onClick={() => handleAddSticker('instructor', 'Confetti.svg', true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '0.9rem', borderRadius: '8px', cursor: 'pointer', border: '1px solid var(--glass-border)', background: 'transparent', color: 'white' }}
                >
                  Confetti
                </button>

                <div style={{ width: '1px', height: '24px', background: 'var(--glass-border)' }} />

                {/* Upload Media */}
                <div style={{ position: 'relative' }}>
                  <button 
                    className="gb-btn"
                    onClick={() => setShowUploadMenu(!showUploadMenu)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '0.9rem', borderRadius: '8px', cursor: 'pointer', border: '1px solid var(--glass-border)', background: 'transparent', color: 'white' }}
                  >
                    Upload Media
                  </button>
                  
                  {showUploadMenu && (
                    <div className="upload-dropdown glass-panel" style={{ 
                      position: 'absolute', 
                      bottom: '100%', 
                      left: 0, 
                      width: '160px',
                      backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                      border: '1px solid var(--glass-border)', 
                      borderRadius: '6px', 
                      zIndex: 110, 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '4px', 
                      padding: '4px',
                      marginBottom: '8px'
                    }}>
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: '0.85rem', textAlign: 'left', width: '100%' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        Local Computer
                      </button>
                      <button 
                        onClick={handleDriveUpload}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: '0.85rem', textAlign: 'left', width: '100%' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        Google Drive
                      </button>
                    </div>
                  )}
                </div>

                {/* Clear Media Status indicator if media is active */}
                {mediaUrl && mediaType !== 'metronome' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '6px', padding: '4px 8px', fontSize: '0.8rem' }}>
                    <span style={{ color: '#ef4444', fontWeight: 'bold' }}>Media Active</span>
                    <button 
                      onClick={clearMedia}
                      style={{ background: '#ef4444', border: 'none', color: 'white', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '2px' }}
                    >
                      Clear
                    </button>
                  </div>
                )}

                <div style={{ width: '1px', height: '24px', background: 'var(--glass-border)' }} />

                {/* Metronome Toggle */}
                <button 
                  className={`gb-btn ${mediaType === 'metronome' ? 'active' : ''}`}
                  onClick={handleMetronomeToggle}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '0.9rem', borderRadius: '8px', cursor: 'pointer', border: '1px solid var(--glass-border)', background: mediaType === 'metronome' ? 'rgba(255,255,255,0.2)' : 'transparent', color: 'white' }}
                >
                  Metronome
                </button>

                {/* Metronome Controls (Visible when metronome is active) */}
                {mediaType === 'metronome' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(0,0,0,0.25)', padding: '4px 12px', borderRadius: '8px', border: '1px solid var(--glass-border)', height: '38px', boxSizing: 'border-box' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 'bold', whiteSpace: 'nowrap' }}>BPM: {metronomeBpm}</span>
                      <input 
                        type="range"
                        min="40"
                        max="240"
                        value={metronomeBpm || 120}
                        onChange={(e) => setMetronomeBpm(parseInt(e.target.value, 10))}
                        style={{ width: '80px', accentColor: 'var(--primary-color)', cursor: 'pointer' }}
                      />
                    </div>

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
                      style={{ width: '50px', padding: '4px', borderRadius: '4px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.4)', color: 'white', fontSize: '0.8rem', textAlign: 'center' }}
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
                      style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid var(--glass-border)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
                    >
                      TAP
                    </button>

                    <button 
                      onClick={() => setIsMetronomePlaying(!isMetronomePlaying)}
                      style={{ padding: '4px 8px', borderRadius: '4px', background: isMetronomePlaying ? '#ef4444' : '#22c55e', color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}
                    >
                      {isMetronomePlaying ? 'Stop' : 'Start'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {shouldShowInstructorDeck && isPeoStickersOpen && (
          <div className="deck-divider-horizontal" style={{ width: '100%', height: '1px', background: 'var(--glass-border)' }} />
        )}

        {/* ROW 2: STUDENT STICKERS & FILTERS */}
        {(isPeoStickersOpen || shouldShowStudentStickers || shouldShowStudentFilters) && (
          <div className="deck-row glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%', position: 'relative', background: 'rgba(30, 41, 59, 0.35)', padding: '10px 50px 8px 16px', borderRadius: '12px', height: 'var(--peo-height)', boxSizing: 'border-box' }}>
            
            <div style={{ display: 'flex', flex: 1, height: '100%', alignItems: 'center', gap: '16px', position: 'relative' }}>
              
              <span 
                className="group-label" 
                style={{ 
                  position: 'absolute', 
                  top: '10px', 
                  left: '50%', 
                  transform: 'translateX(-50%)', 
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  zIndex: 5,
                  visibility: 'visible'
                }}
              >
                {isPeoStickersOpen || shouldShowStudentStickers
                  ? `Stickers ${targetId ? `- ${activeGuest?.name || participants.find(p => p.id === targetId)?.name || targetId}` : ''}`
                  : `Filters ${targetId ? `- ${activeGuest?.name || participants.find(p => p.id === targetId)?.name || targetId}` : ''}`}
              </span>

              {(isPeoStickersOpen || shouldShowStudentStickers) && (
                <div className="deck-group reactions-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '8px', height: '100%' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '8px', marginBottom: '5px', visibility: 'hidden', pointerEvents: 'none' }}>
                    <span className="group-label" style={{ textAlign: 'center' }}>
                      Stickers
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, auto)', gap: '8px', justifyContent: 'center' }}>
                    {studentStickers.map((sticker) => (
                      <button 
                        key={sticker.id}
                        className="deck-sticker-btn"
                        onClick={() => handleStickerClick(sticker.id)}
                        title={`Place ${sticker.name} sticker`}
                        style={{ width: 'calc(var(--peo-height) * 0.45)', height: 'calc(var(--peo-height) * 0.45)', maxWidth: '61px', maxHeight: '61px', minWidth: '36px', minHeight: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px' }}
                      >
                        <img src={`/assets/svg_stickers/${sticker.id}`} alt={sticker.name} style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(isPeoStickersOpen || shouldShowStudentStickers) && shouldShowStudentFilters && (
                <div className="deck-divider" />
              )}

              {shouldShowStudentFilters && (
                <div className="deck-group filters-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '8px', height: '100%' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '8px', marginBottom: '5px', visibility: 'hidden', pointerEvents: 'none' }}>
                    <span className="group-label" style={{ textAlign: 'center' }}>
                      Filters
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', alignItems: 'center', marginTop: '10px' }}>
                    {studentFilters.map((filter) => {
                      const isActive = targetBtns[filter.id] || false;
                      return (
                        <button 
                          key={filter.id}
                          className={`deck-filter-btn ${isActive ? 'active' : ''}`}
                          onClick={() => handleFilterClick(filter.id)}
                          style={{ '--filter-color': filter.color, width: '31px', height: '31px' }}
                          title={`Toggle ${filter.name} Filter`}
                        >
                          <Sparkles size={16} color="#ffffff" />
                        </button>
                      );
                    })}
                    {targetId && (targetBtns.greenFilter || targetBtns.blueFilter || targetBtns.purpleFilter || targetBtns.orangeFilter) && (
                      <button 
                        className="deck-btn clear-filters-btn"
                        onClick={handleClearFilters}
                        title="Remove Filters"
                        style={{ width: '31px', height: '31px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>
                </div>
              )}

            </div>

            {isPeoStickersOpen && (
              <button
                onClick={() => {
                  setIsPeoStickersOpen(false);
                  setShowInstructorStickers(false);
                  setShowStudentStickers(false);
                  setShowStudentFilters(false);
                }}
                className="cd-close-btn"
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '4px',
                  transform: 'rotate(-15deg)',
                  background: 'transparent',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'white',
                  transition: 'all 0.2s ease',
                  zIndex: 10,
                  fontFamily: '"Risque", serif',
                  fontSize: '36px',
                  lineHeight: '1',
                  padding: '4px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#ef4444';
                  e.currentTarget.style.transform = 'rotate(-15deg) scale(1.1)';
                  e.currentTarget.style.textShadow = '0 0 10px rgba(239, 68, 68, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.transform = 'rotate(-15deg) scale(1)';
                  e.currentTarget.style.textShadow = 'none';
                }}
              >
                X
              </button>
            )}
            
          </div>
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
