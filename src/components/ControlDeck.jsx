import { useState, useRef } from 'react';
import { X, Sparkles } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { instructorStickers, studentStickers } from '../constants/stickers';

export default function ControlDeck() {
  const {
    isDoodling, setIsDoodling,
    setMediaUpload, clearMedia, mediaType, mediaUrl,
    handleAddSticker,
    participants, activeGuestId,
    guestButtons, handleToggleGuestButton,
    showInstructorStickers, setShowInstructorStickers,
    showStudentStickers, setShowStudentStickers,
    showStudentFilters, setShowStudentFilters,
    activeItoSection, setActiveItoSection,
    isPeoStickersOpen, setIsPeoStickersOpen,
    stageTimer, setStageTimer,
    activeTheme, setActiveTheme,
    resetStudentState,
    spotlightGuestId, setSpotlightGuestId
  } = useAppContext();

  const isInstructorClient = sessionStorage.getItem('stagetrack_role') !== 'student';
  const fileInputRef = useRef(null);
  const [activeCdTab, setActiveCdTab] = useState(null); // 'timer', 'system', 'upload', or 'activities'

  const activities = [
    { name: '1,2,3,4 Wheel', filename: '1,2,3,4_wheel.html' }
  ];

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
    }
  };

  const handleDriveUpload = () => {
    alert("Google Drive picker mock opened.");
  };

  const shouldShowStudentStickers = showStudentStickers;
  const shouldShowStudentFilters = showStudentFilters;
  const shouldShowStudioControls = isInstructorClient && (activeItoSection === 'studio' || showInstructorStickers || showStudentStickers || isPeoStickersOpen || showStudentFilters);
  // Always show instructor deck if no other specific deck is requested
  const shouldShowInstructorDeck = !isInstructorClient && showInstructorStickers && !shouldShowStudentStickers && !shouldShowStudentFilters && !isPeoStickersOpen;

  if (!shouldShowInstructorDeck && !shouldShowStudentStickers && !shouldShowStudentFilters && !isPeoStickersOpen && !shouldShowStudioControls) {
    return null;
  }

  const targetId = isInstructorClient ? activeGuest?.id : mySelf?.id;
  const targetBtns = targetId ? (guestButtons[targetId] || { raiseHand: false, mute: false, chat: false }) : { raiseHand: false, mute: false, chat: false };

  const handleStickerClick = (stickerId) => {
    if (!targetId) {
      if (isInstructorClient) alert("Please select a student in the grid first to apply rewards!");
      return;
    }
    handleAddSticker(targetId, stickerId, false);
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
                if (!shouldShowStudioControls) {
                  setActiveItoSection(null);
                }
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
          <section className="studio-controls" style={{ position: 'relative', width: '100%', boxSizing: 'border-box' }}>
            
            <button
              onClick={() => {
                setActiveItoSection(null);
                setActiveCdTab(null);
                setShowInstructorStickers(false);
                setShowStudentStickers(false);
                setShowStudentFilters(false);
                setIsPeoStickersOpen(false);
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

            {(activeCdTab !== null || showInstructorStickers || showStudentStickers || isPeoStickersOpen || showStudentFilters) && (
              <button
                onClick={() => {
                  if (activeCdTab === 'activities') {
                    setActiveCdTab('upload');
                  } else {
                    setActiveCdTab(null);
                    setShowInstructorStickers(false);
                    setShowStudentStickers(false);
                    setShowStudentFilters(false);
                    setIsPeoStickersOpen(false);
                  }
                }}
                className="cd-back-btn"
                style={{
                  position: 'absolute',
                  left: '12px',
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
                &lt;
              </button>
            )}

            <h2>
              {activeCdTab === 'timer' 
                ? 'STAGE TIMER' 
                : activeCdTab === 'system' 
                ? 'SYSTEM' 
                : activeCdTab === 'upload' 
                ? 'UPLOAD MEDIA' 
                : activeCdTab === 'activities' 
                ? 'ACTIVITIES' 
                : showInstructorStickers 
                ? 'INSTRUCTOR REWARDS' 
                : (showStudentStickers || isPeoStickersOpen)
                ? 'REACTION STICKERS'
                : showStudentFilters
                ? 'STUDENT FILTERS'
                : 'STUDIO CONTROLS'}
            </h2>

            {activeCdTab === null && !showInstructorStickers && !showStudentStickers && !isPeoStickersOpen && !showStudentFilters ? (
              <>
                <div className="controls-row top-row">
                  {/* INVITE */}
                  <button 
                    onClick={async () => {
                      const params = new URLSearchParams(window.location.search);
                      const sid = params.get('session');
                      if (!sid) {
                        alert("No active session to invite to.");
                        return;
                      }
                      const inviteUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?session=' + sid;
                      try {
                        await navigator.clipboard.writeText(inviteUrl);
                        alert("Invite link copied to clipboard!");
                      } catch {
                        prompt("Copy this link:", inviteUrl);
                      }
                    }}
                  >
                    INVITE
                  </button>

                  {/* SPOTLIGHT */}
                  <button 
                    onClick={() => {
                      if (activeGuestId) {
                        setSpotlightGuestId(spotlightGuestId === activeGuestId ? null : activeGuestId);
                      }
                    }}
                    disabled={!activeGuestId}
                    className={spotlightGuestId === activeGuestId && activeGuestId ? 'active' : ''}
                    title={activeGuestId ? "Spotlight the selected student" : "Select a student to spotlight"}
                    style={{
                      opacity: activeGuestId ? 1 : 0.5,
                      cursor: activeGuestId ? 'pointer' : 'not-allowed'
                    }}
                  >
                    SPOTLIGHT
                  </button>

                  {/* DOODLING */}
                  <button 
                    onClick={() => setIsDoodling(!isDoodling)}
                    className={isDoodling ? 'active' : ''}
                  >
                    DOODLING
                  </button>

                  {/* CONFETTI */}
                  <button 
                    onClick={() => handleAddSticker('instructor', 'Confetti.svg', true)}
                  >
                    CONFETTI
                  </button>
                </div>

                <div className="controls-row middle-row">
                  {/* UPLOAD MEDIA */}
                  <button onClick={() => setActiveCdTab('upload')}>
                    UPLOAD MEDIA
                  </button>

                  {/* STAGE TIMER */}
                  <button onClick={() => setActiveCdTab('timer')}>
                    STAGE TIMER
                  </button>

                  {/* SYSTEM */}
                  <button onClick={() => setActiveCdTab('system')}>
                    SYSTEM
                  </button>
                </div>

                <div className="controls-row bottom-row">
                  {/* STICKERS */}
                  <button 
                    onClick={() => {
                      const nextState = !showStudentStickers;
                      setShowStudentStickers(nextState);
                      if (nextState) {
                        setShowInstructorStickers(false);
                        setIsPeoStickersOpen(false);
                      }
                    }}
                    className={showStudentStickers ? 'active' : ''}
                  >
                    STICKERS
                  </button>

                  {/* IC STICKERS */}
                  <button 
                    onClick={() => {
                      const nextState = !showInstructorStickers;
                      setShowInstructorStickers(nextState);
                      if (nextState) {
                        setShowStudentStickers(false);
                        setIsPeoStickersOpen(false);
                      }
                    }}
                    className={showInstructorStickers ? 'active' : ''}
                  >
                    IC STICKERS
                  </button>
                </div>
              </>
            ) : activeCdTab === 'upload' ? (
              <div className="controls-row middle-row" style={{ width: '100%', margin: '0.5rem 0' }}>
                <button 
                  onClick={() => {
                    fileInputRef.current?.click();
                    setActiveCdTab(null);
                  }}
                >
                  Local Computer
                </button>
                <button 
                  onClick={() => {
                    setActiveCdTab('activities');
                  }}
                >
                  Activities
                </button>
                <button 
                  onClick={() => {
                    handleDriveUpload();
                    setActiveCdTab(null);
                  }}
                >
                  Google Drive
                </button>
                {mediaUrl && mediaType !== 'metronome' && (
                  <button 
                    onClick={() => {
                      clearMedia();
                      setActiveCdTab(null);
                    }}
                    style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: 'white' }}
                  >
                    Clear Media
                  </button>
                )}
              </div>
            ) : activeCdTab === 'activities' ? (
              <div className="controls-row middle-row" style={{ width: '100%', margin: '0.5rem 0' }}>
                {activities.map((act) => (
                  <button 
                    key={act.filename}
                    onClick={() => {
                      setMediaUpload(`/assets/Activities/${act.filename}`, 'iframe');
                      setActiveCdTab(null);
                    }}
                  >
                    {act.name}
                  </button>
                ))}
              </div>
            ) : activeCdTab === 'timer' ? (
              <div className="controls-row middle-row" style={{ width: '100%', margin: '0.5rem 0', gap: '8px' }}>
                {[60, 120, 300].map((sec) => (
                  <button
                    key={sec}
                    onClick={() => {
                      const endTime = Date.now() + sec * 1000;
                      setStageTimer({ endTime, duration: sec, isRunning: true });
                    }}
                  >
                    {sec / 60}m
                  </button>
                ))}
                
                <div style={{ width: '1px', height: '18px', background: 'var(--glass-border)' }} />

                <input
                  type="number"
                  placeholder="Min"
                  min="0"
                  id="cd-timer-min"
                  style={{ width: '55px', padding: '6px', borderRadius: '4px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.4)', color: 'white', fontSize: '0.85rem', textAlign: 'center', fontFamily: 'inherit' }}
                />
                <span style={{ color: 'white', fontSize: '0.85rem' }}>:</span>
                <input
                  type="number"
                  placeholder="Sec"
                  min="0"
                  max="59"
                  id="cd-timer-sec"
                  style={{ width: '55px', padding: '6px', borderRadius: '4px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.4)', color: 'white', fontSize: '0.85rem', textAlign: 'center', fontFamily: 'inherit' }}
                />
                <button
                  onClick={() => {
                    const minVal = parseInt(document.getElementById('cd-timer-min')?.value || '0', 10);
                    const secVal = parseInt(document.getElementById('cd-timer-sec')?.value || '0', 10);
                    const totalSec = minVal * 60 + secVal;
                    if (totalSec > 0) {
                      const endTime = Date.now() + totalSec * 1000;
                      setStageTimer({ endTime, duration: totalSec, isRunning: true });
                    }
                  }}
                  style={{ background: 'var(--primary-color)', color: 'white' }}
                >
                  Set
                </button>

                <div style={{ width: '1px', height: '18px', background: 'var(--glass-border)' }} />

                <span style={{ fontSize: '0.85rem', color: stageTimer.isRunning ? '#22c55e' : stageTimer.duration > 0 ? '#fbbf24' : '#94a3b8', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                  {stageTimer.isRunning ? 'Running' : stageTimer.duration > 0 ? 'Paused' : 'Off'}
                </span>

                {stageTimer.isRunning ? (
                  <button
                    onClick={() => {
                      const remaining = Math.max(0, Math.round((stageTimer.endTime - Date.now()) / 1000));
                      setStageTimer({ ...stageTimer, duration: remaining, isRunning: false });
                    }}
                    style={{ background: '#fbbf24', color: '#000000' }}
                  >
                    Pause
                  </button>
                ) : (
                  stageTimer.duration > 0 && (
                    <button
                      onClick={() => {
                        const endTime = Date.now() + stageTimer.duration * 1000;
                        setStageTimer({ ...stageTimer, endTime, isRunning: true });
                      }}
                      style={{ background: '#22c55e', color: 'white' }}
                    >
                      Resume
                    </button>
                  )
                )}

                {(stageTimer.isRunning || stageTimer.duration > 0) && (
                  <button
                    onClick={() => {
                      setStageTimer({ endTime: null, duration: 0, isRunning: false });
                    }}
                    style={{ background: '#ef4444', color: 'white' }}
                  >
                    Reset
                  </button>
                )}
              </div>
            ) : activeCdTab === 'system' ? (
              <div className="controls-row middle-row" style={{ width: '100%', margin: '0.5rem 0' }}>
                <button 
                  className={activeTheme === 'music-fun' ? 'active' : ''}
                  onClick={() => setActiveTheme('music-fun')}
                >
                  Music
                </button>
                <div style={{ width: '1px', height: '18px', background: 'var(--glass-border)' }} />
                <button 
                  onClick={resetStudentState}
                  style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: 'white' }}
                >
                  Reset Room
                </button>
                <div style={{ width: '1px', height: '18px', background: 'var(--glass-border)' }} />
                <button 
                  className={activeTheme === 'sor' ? 'active' : ''}
                  onClick={() => setActiveTheme('sor')}
                >
                  SOR
                </button>
              </div>
            ) : showInstructorStickers ? (
              <div className="controls-row middle-row" style={{ width: '100%', margin: '0.5rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
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
                      style={{ width: 'calc(var(--peo-height) * 0.45)', height: 'calc(var(--peo-height) * 0.45)', maxWidth: '61px', maxHeight: '61px', minWidth: '36px', minHeight: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px', border: 'none', background: 'transparent' }}
                    >
                      <img src={`/assets/svg_stickers/${sticker.id}`} alt={sticker.name} style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                    </button>
                  ))}
                </div>
                {activeGuest && (
                  <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 'bold' }}>
                    Target: {activeGuest.name}
                  </span>
                )}
              </div>
            ) : (showStudentStickers || isPeoStickersOpen) ? (
              <div className="controls-row middle-row" style={{ width: '100%', margin: '0.5rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, auto)', gap: '8px', justifyContent: 'center' }}>
                  {studentStickers.map((sticker) => (
                    <button 
                      key={sticker.id}
                      className="deck-sticker-btn"
                      onClick={() => handleStickerClick(sticker.id)}
                      title={`Place ${sticker.name} sticker`}
                      style={{ width: 'calc(var(--peo-height) * 0.45)', height: 'calc(var(--peo-height) * 0.45)', maxWidth: '61px', maxHeight: '61px', minWidth: '36px', minHeight: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px', border: 'none', background: 'transparent' }}
                    >
                      <img src={`/assets/svg_stickers/${sticker.id}`} alt={sticker.name} style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                    </button>
                  ))}
                </div>
                {activeGuest && (
                  <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 'bold' }}>
                    Target: {activeGuest.name}
                  </span>
                )}
              </div>
            ) : showStudentFilters ? (
              <div className="controls-row middle-row" style={{ width: '100%', margin: '0.5rem 0', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}>
                {studentFilters.map((filter) => {
                  const isActive = targetBtns[filter.id] || false;
                  return (
                    <button 
                      key={filter.id}
                      className={`deck-filter-btn ${isActive ? 'active' : ''}`}
                      onClick={() => handleFilterClick(filter.id)}
                      style={{ '--filter-color': filter.color, width: '31px', height: '31px', padding: 0 }}
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
            ) : null}
          </section>
        )}

        {shouldShowInstructorDeck && isPeoStickersOpen && (
          <div className="deck-divider-horizontal" style={{ width: '100%', height: '1px', background: 'var(--glass-border)' }} />
        )}

        {/* ROW 2: STUDENT STICKERS & FILTERS */}
        {!isInstructorClient && (isPeoStickersOpen || shouldShowStudentStickers || shouldShowStudentFilters) && (
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
