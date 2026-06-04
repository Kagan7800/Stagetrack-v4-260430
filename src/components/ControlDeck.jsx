import React, { useState, useRef } from 'react';
import { Palette, Image as ImageIcon, X, Mic, MicOff, Pause, Play, UploadCloud, HardDrive, RotateCcw, Hand, MessageSquare, Camera, Sparkles, Smile, Trash2 } from 'lucide-react';
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
    showInstructorStickers,
    showStudentStickers,
    showStudentFilters
  } = useAppContext();

  const isInstructorClient = sessionStorage.getItem('stagetrack_role') !== 'student';
  const fileInputRef = useRef(null);
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [showMetronomePopover, setShowMetronomePopover] = useState(false);
  const [isPeoStickersOpen, setIsPeoStickersOpen] = useState(false);

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
  const shouldShowInstructorDeck = isInstructorClient && showInstructorStickers && !shouldShowStudentStickers && !shouldShowStudentFilters && !isPeoStickersOpen;

  if (!shouldShowInstructorDeck && !shouldShowStudentStickers && !shouldShowStudentFilters && !isPeoStickersOpen) {
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
    <div className="control-deck-outer" style={{ width: '100%', marginTop: '12px', zIndex: 50, position: 'relative' }}>
      <div className="control-deck" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px 16px', borderRadius: '12px', boxSizing: 'border-box', background: 'transparent', border: 'none', boxShadow: 'none' }}>
        
        {/* ROW 1: INSTRUCTOR STICKERS */}
        {shouldShowInstructorDeck && (
          <div className="deck-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div className="deck-group rewards-group" style={{ flex: 1, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                <span className="group-label" style={{ textAlign: 'center' }}>Instructor Stickers {activeGuest ? `- ${activeGuest.name} of peo` : ''}</span>
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
                    style={{ opacity: 1 }}
                  >
                    <img src={`/assets/svg_stickers/${sticker.id}`} alt={sticker.name} />
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
                  fontSize: '13px',
                  whiteSpace: 'nowrap',
                  padding: '4px 12px',
                  opacity: 0.8,
                  fontWeight: 500
                }}
              >
                Open PEO Stickers
              </button>
            </div>
          </div>
        )}

        {shouldShowInstructorDeck && isPeoStickersOpen && (
          <div className="deck-divider-horizontal" style={{ width: '100%', height: '1px', background: 'var(--glass-border)' }} />
        )}

        {/* ROW 2: STUDENT STICKERS & FILTERS */}
        {(isPeoStickersOpen || shouldShowStudentStickers || shouldShowStudentFilters) && (
          <div className="deck-row" style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%' }}>
            
            {(isPeoStickersOpen || shouldShowStudentStickers) && (
              <div className="deck-group reactions-group" style={{ flex: 1, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '8px' }}>
                  <span className="group-label" style={{ textAlign: 'center' }}>
                    Stickers - {targetId ? (activeGuest?.name || participants.find(p => p.id === targetId)?.name || targetId) : 'identifying name or #'}
                  </span>
                  {isPeoStickersOpen && (
                    <button
                      onClick={() => setIsPeoStickersOpen(false)}
                      style={{
                        background: 'transparent',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '13px',
                        whiteSpace: 'nowrap',
                        padding: '4px 12px',
                        opacity: 0.8,
                        fontWeight: 500
                      }}
                    >
                      Close PEO Stickers
                    </button>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, auto)', gap: '8px', justifyContent: 'center' }}>
                  {studentStickers.map((sticker) => (
                    <button 
                      key={sticker.id}
                      className="deck-sticker-btn"
                      onClick={() => handleStickerClick(sticker.id)}
                      title={`Place ${sticker.name} sticker`}
                      style={{ width: '61px', height: '61px' }}
                    >
                      <img src={`/assets/svg_stickers/${sticker.id}`} alt={sticker.name} style={{ width: '46px', height: '46px' }} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(isPeoStickersOpen || shouldShowStudentStickers) && shouldShowStudentFilters && (
              <div className="deck-divider" />
            )}

            {shouldShowStudentFilters && (
              <div className="deck-group filters-group" style={{ flex: 1, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '8px', marginBottom: isPeoStickersOpen ? '32px' : '0' }}>
                  <span className="group-label" style={{ textAlign: 'center' }}>
                    Filters - {targetId ? (activeGuest?.name || participants.find(p => p.id === targetId)?.name || targetId) : 'identifying name or #'}
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
