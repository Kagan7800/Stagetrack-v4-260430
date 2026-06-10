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
  const shouldShowStudioControls = isInstructorClient && activeItoSection === 'studio';
  // Always show instructor deck if no other specific deck is requested
  const shouldShowInstructorDeck = isInstructorClient && showInstructorStickers && !shouldShowStudentStickers && !shouldShowStudentFilters && !isPeoStickersOpen;

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
          <div className="deck-row glass-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', position: 'relative', background: 'rgba(30, 41, 59, 0.35)', padding: '12px 50px 12px 16px', borderRadius: '12px', height: 'auto', minHeight: 'var(--peo-height)', boxSizing: 'border-box' }}>
            
            <button
              onClick={() => {
                setActiveItoSection(null);
                setActiveCdTab(null);
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

            {activeCdTab !== null && (
              <button
                onClick={() => {
                  if (activeCdTab === 'activities') {
                    setActiveCdTab('upload');
                  } else {
                    setActiveCdTab(null);
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
                    setActiveCdTab(null);
                  }}
                  title={activeCdTab === 'timer' ? "Close Stage Timer" : activeCdTab === 'system' ? "Close System Controls" : activeCdTab === 'upload' ? "Close Upload Menu" : activeCdTab === 'activities' ? "Close Activities Menu" : "Close Studio Controls"}
                >
                  {activeCdTab === 'timer' ? 'Stage Timer' : activeCdTab === 'system' ? 'System' : activeCdTab === 'upload' ? 'Upload Media' : activeCdTab === 'activities' ? 'Activities' : 'Studio Controls'}
                </span>
              </div>
              
              {activeCdTab === null ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', alignItems: 'center' }}>
                  {/* Row 1 */}
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', width: '100%', flexWrap: 'wrap' }}>
                    {/* Invite */}
                    <button 
                      className="gb-btn"
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
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '0.9rem', borderRadius: '8px', cursor: 'pointer', border: '1px solid var(--glass-border)', background: 'transparent', color: 'white' }}
                    >
                      Invite
                    </button>

                    <div style={{ width: '1px', height: '24px', background: 'var(--glass-border)' }} />

                    {/* Spotlight */}
                    <button 
                      className={`gb-btn ${spotlightGuestId === activeGuestId && activeGuestId ? 'active' : ''}`}
                      onClick={() => {
                        if (activeGuestId) {
                          setSpotlightGuestId(spotlightGuestId === activeGuestId ? null : activeGuestId);
                        }
                      }}
                      disabled={!activeGuestId}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        padding: '8px 16px', 
                        fontSize: '0.9rem', 
                        borderRadius: '8px', 
                        cursor: activeGuestId ? 'pointer' : 'not-allowed', 
                        border: '1px solid var(--glass-border)', 
                        background: (spotlightGuestId === activeGuestId && activeGuestId) ? 'rgba(250,204,21,0.2)' : 'transparent', 
                        color: (spotlightGuestId === activeGuestId && activeGuestId) ? '#facc15' : 'white',
                        opacity: activeGuestId ? 1 : 0.5 
                      }}
                      title={activeGuestId ? "Spotlight the selected student" : "Select a student to spotlight"}
                    >
                      Spotlight
                    </button>

                    <div style={{ width: '1px', height: '24px', background: 'var(--glass-border)' }} />

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
                    <button 
                      className="gb-btn"
                      onClick={() => setActiveCdTab('upload')}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '0.9rem', borderRadius: '8px', cursor: 'pointer', border: '1px solid var(--glass-border)', background: 'transparent', color: 'white' }}
                    >
                      Upload Media
                    </button>

                    <div style={{ width: '1px', height: '24px', background: 'var(--glass-border)' }} />

                    {/* Stage Timer Toggle */}
                    <button 
                      className="gb-btn"
                      onClick={() => setActiveCdTab('timer')}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '0.9rem', borderRadius: '8px', cursor: 'pointer', border: '1px solid var(--glass-border)', background: 'transparent', color: 'white' }}
                    >
                      Stage Timer
                    </button>

                    <div style={{ width: '1px', height: '24px', background: 'var(--glass-border)' }} />

                    {/* System Toggle */}
                    <button 
                      className="gb-btn"
                      onClick={() => setActiveCdTab('system')}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '0.9rem', borderRadius: '8px', cursor: 'pointer', border: '1px solid var(--glass-border)', background: 'transparent', color: 'white' }}
                    >
                      System
                    </button>
                  </div>

                  {/* Row 2 */}
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', width: '100%', marginTop: '4px' }}>
                    {/* Stickers (Student Stickers) Toggle Button */}
                    <button 
                      className={`gb-btn ${showStudentStickers ? 'active' : ''}`}
                      onClick={() => {
                        const nextState = !showStudentStickers;
                        setShowStudentStickers(nextState);
                        if (nextState) {
                          setShowInstructorStickers(false);
                          setIsPeoStickersOpen(false);
                        }
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '0.9rem', borderRadius: '8px', cursor: 'pointer', border: '1px solid var(--glass-border)', background: showStudentStickers ? 'rgba(255,255,255,0.2)' : 'transparent', color: 'white' }}
                    >
                      Stickers
                    </button>

                    <div style={{ width: '1px', height: '24px', background: 'var(--glass-border)' }} />

                    {/* IC Stickers Toggle Button */}
                    <button 
                      className={`gb-btn ${showInstructorStickers ? 'active' : ''}`}
                      onClick={() => {
                        const nextState = !showInstructorStickers;
                        setShowInstructorStickers(nextState);
                        if (nextState) {
                          setShowStudentStickers(false);
                          setIsPeoStickersOpen(false);
                        }
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '0.9rem', borderRadius: '8px', cursor: 'pointer', border: '1px solid var(--glass-border)', background: showInstructorStickers ? 'rgba(255,255,255,0.2)' : 'transparent', color: 'white' }}
                    >
                      IC Stickers
                    </button>
                  </div>
                </div>
              ) : activeCdTab === 'upload' ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', width: '100%', background: 'transparent', border: '1px solid transparent', height: '38px', boxSizing: 'border-box' }}>
                  <button 
                    onClick={() => {
                      fileInputRef.current?.click();
                      setActiveCdTab(null);
                    }}
                    style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.1)', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'white', cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    Local Computer
                  </button>
                  <button 
                    onClick={() => {
                      setActiveCdTab('activities');
                    }}
                    style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.1)', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'white', cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    Activities
                  </button>
                  <button 
                    onClick={() => {
                      handleDriveUpload();
                      setActiveCdTab(null);
                    }}
                    style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.1)', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'white', cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    Google Drive
                  </button>
                  {mediaUrl && mediaType !== 'metronome' && (
                    <button 
                      onClick={() => {
                        clearMedia();
                        setActiveCdTab(null);
                      }}
                      style={{ padding: '6px 12px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '6px', color: 'white', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                      Clear Media
                    </button>
                  )}
                </div>
              ) : activeCdTab === 'activities' ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', width: '100%', background: 'transparent', border: '1px solid transparent', height: '38px', boxSizing: 'border-box' }}>
                  {activities.map((act) => (
                    <button 
                      key={act.filename}
                      onClick={() => {
                        setMediaUpload(`/assets/Activities/${act.filename}`, 'iframe');
                        setActiveCdTab(null);
                      }}
                      style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.1)', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'white', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                      {act.name}
                    </button>
                  ))}
                </div>
              ) : activeCdTab === 'timer' ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', width: '100%', background: 'transparent', border: '1px solid transparent', height: '38px', boxSizing: 'border-box' }}>
                  {[60, 120, 300].map((sec) => (
                    <button
                      key={sec}
                      onClick={() => {
                        const endTime = Date.now() + sec * 1000;
                        setStageTimer({ endTime, duration: sec, isRunning: true });
                      }}
                      style={{
                        padding: '4px 8px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        cursor: 'pointer'
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
                    style={{ width: '35px', padding: '2px', borderRadius: '4px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.4)', color: 'white', fontSize: '0.75rem', textAlign: 'center' }}
                  />
                  <span style={{ color: 'white', fontSize: '0.75rem' }}>:</span>
                  <input
                    type="number"
                    placeholder="Sec"
                    min="0"
                    max="59"
                    id="cd-timer-sec"
                    style={{ width: '35px', padding: '2px', borderRadius: '4px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.4)', color: 'white', fontSize: '0.75rem', textAlign: 'center' }}
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
                    style={{ padding: '4px 6px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
                  >
                    Set
                  </button>

                  <div style={{ width: '1px', height: '18px', background: 'var(--glass-border)' }} />

                  <span style={{ fontSize: '0.75rem', color: stageTimer.isRunning ? '#22c55e' : stageTimer.duration > 0 ? '#fbbf24' : '#94a3b8', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                    {stageTimer.isRunning ? 'Running' : stageTimer.duration > 0 ? 'Paused' : 'Off'}
                  </span>

                  {stageTimer.isRunning ? (
                    <button
                      onClick={() => {
                        const remaining = Math.max(0, Math.round((stageTimer.endTime - Date.now()) / 1000));
                        setStageTimer({ ...stageTimer, duration: remaining, isRunning: false });
                      }}
                      style={{ padding: '4px 6px', background: '#fbbf24', color: '#000000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.75rem' }}
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
                        style={{ padding: '4px 6px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.75rem' }}
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
                      style={{ padding: '4px 6px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.75rem' }}
                    >
                      Reset
                    </button>
                  )}
                </div>
              ) : activeCdTab === 'system' ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', width: '100%', background: 'transparent', border: '1px solid transparent', height: '38px', boxSizing: 'border-box' }}>
                  <button 
                    className={`gb-btn ${activeTheme === 'music-fun' ? 'active' : ''}`}
                    onClick={() => setActiveTheme('music-fun')}
                    style={{ padding: '4px 8px', fontSize: '0.75rem', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', background: activeTheme === 'music-fun' ? 'rgba(255,255,255,0.2)' : 'transparent', color: 'white' }}
                  >
                    Music
                  </button>
                  <div style={{ width: '1px', height: '18px', background: 'var(--glass-border)' }} />
                  <button 
                    onClick={resetStudentState}
                    style={{ padding: '4px 8px', fontSize: '0.75rem', cursor: 'pointer', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '4px', color: 'white', fontWeight: 'bold' }}
                  >
                    Reset Room
                  </button>
                  <div style={{ width: '1px', height: '18px', background: 'var(--glass-border)' }} />
                  <button 
                    className={`gb-btn ${activeTheme === 'sor' ? 'active' : ''}`}
                    onClick={() => setActiveTheme('sor')}
                    style={{ padding: '4px 8px', fontSize: '0.75rem', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', background: activeTheme === 'sor' ? 'rgba(255,255,255,0.2)' : 'transparent', color: 'white' }}
                  >
                    SOR
                  </button>
                </div>
              ) : null}
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
