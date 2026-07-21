// src/components/GuestContainer.jsx

import { Pause } from 'lucide-react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import PeoBorder from './PeoBorder';

const getGlowColor = (color) => {
  if (!color) return 'rgba(34, 197, 94, 0.45)';
  if (color.includes('185')) return '#F7F27C';
  if (color.includes('186')) return '#FC0000';
  if (color.endsWith('_2')) return color.substring(0, color.length - 2);
  return color;
};

export default function GuestContainer({ 
  participant = { id: 'blank-1', isBlank: true }, 
  isActive = false, 
  onClick, 
  onDoubleClick,
  stickers = [],
  buttons = { raiseHand: false, mute: false },
  nudges = {},
  globalPause = false,
  stream = null
}) {
  const { 
    participants = [], 
    blankCovers = {}, 
    setBlankCovers, 
    pendingRequest, 
    approveRequest, 
    denyRequest, 
    activeTheme,
    isSidebarOpen,
    setIsSidebarOpen,
    activeGuestId,
    setActiveGuestId,
    activeToolbox,
    setActiveToolbox,
    activeItoSection,
    setActiveItoSection
  } = useAppContext();

  // Ensure safe participant object reference
  const safeParticipant = participant || { id: 'blank-1', isBlank: true };
  const pId = safeParticipant.id || 'blank-1';

  const [isEditing, setIsEditing] = useState(false);
  
  // Local state for forms
  const [tempCoverUrl, setTempCoverUrl] = useState('');
  const [tempLink, setTempLink] = useState('');

  // Whisper State
  const [showWhisper, setShowWhisper] = useState(false);

  useEffect(() => {
    if (buttons?.whisper && buttons?.whisperTime) {
      const timeSince = Date.now() - buttons.whisperTime;
      if (timeSince < 10000) {
        const delayTimer = setTimeout(() => {
          setShowWhisper(true);
        }, 0);
        const timer = setTimeout(() => {
          setShowWhisper(false);
        }, 10000 - timeSince);
        return () => {
          clearTimeout(delayTimer);
          clearTimeout(timer);
        };
      } else {
        const delayTimer = setTimeout(() => {
          setShowWhisper(false);
        }, 0);
        return () => clearTimeout(delayTimer);
      }
    }
  }, [buttons?.whisper, buttons?.whisperTime]);

  // Webcams state

  const [joinedStream, setJoinedStream] = useState(null);
  const joinedVideoRef = useRef(null);

  const clickTimeoutRef = useRef(null);
  const lastClickTimeRef = useRef(0);

  const handleCellClick = (e) => {
    if (e.target.closest('.blank-peo-edit-form') || e.target.closest('.edit-blank-btn') || e.target.closest('button')) {
      return;
    }

    const now = Date.now();
    const timeSinceLastClick = now - lastClickTimeRef.current;

    if (e.detail === 2 || (timeSinceLastClick > 0 && timeSinceLastClick < 450)) {
      lastClickTimeRef.current = 0;
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
      if (onDoubleClick) {
        onDoubleClick(safeParticipant);
      }
      return;
    }

    lastClickTimeRef.current = now;

    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    clickTimeoutRef.current = setTimeout(() => {
      clickTimeoutRef.current = null;
      if (onClick) {
        onClick(safeParticipant);
      }
    }, 450);
  };

  const isInstructorClient = sessionStorage.getItem('stagetrack_role') !== 'student';
  const isClosed = globalPause || (buttons && buttons.mute) || false;

  const firstBlankId = useMemo(() => {
    if (!participants) return null;
    const blank = participants.find(p => p && p.isBlank);
    return blank ? blank.id : null;
  }, [participants]);

  const isPending = isInstructorClient && safeParticipant.isBlank && pendingRequest !== null && (
    pId === firstBlankId ||
    (!firstBlankId && pId === 'blank-1') ||
    (pId === 'portrait-blank-top') ||
    (pId === 'portrait-blank-end')
  );

  const shouldShowWebcam = !safeParticipant.isBlank && (
    (isInstructorClient && safeParticipant.isInstructor) ||
    (!isInstructorClient && pId === activeGuestId)
  );

  // Handle webcam stream for active joined participant (only for local user, fallback if no stream prop provided)
  useEffect(() => {
    let activeStream = null;
    if (shouldShowWebcam && !isClosed && !stream) {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true, audio: false })
          .then((s) => {
            activeStream = s;
            setJoinedStream(s);
          })
          .catch((err) => {
            console.log("Webcam access blocked in joined student view:", err);
          });
      }
    } else {
      const timer = setTimeout(() => {
        setJoinedStream(prev => prev === null ? prev : null);
      }, 0);
      return () => clearTimeout(timer);
    }
    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [shouldShowWebcam, isClosed, stream]);

  // Keep video source object in sync with stream prop or local stream
  useEffect(() => {
    if (joinedVideoRef.current) {
      joinedVideoRef.current.srcObject = stream || joinedStream;
    }
  }, [stream, joinedStream]);

  // Fetch current values when form is opened
  useEffect(() => {
    if (safeParticipant.isBlank) {
      const coverData = (blankCovers && blankCovers[pId]) || {};
      const targetCoverUrl = coverData.coverUrl || '';
      const targetHyperlink = coverData.hyperlink || '';
      const timer = setTimeout(() => {
        setTempCoverUrl(prev => prev === targetCoverUrl ? prev : targetCoverUrl);
        setTempLink(prev => prev === targetHyperlink ? prev : targetHyperlink);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isEditing, pId, safeParticipant.isBlank, blankCovers]);

  const canEditThisBlank = isInstructorClient;

  // RENDER BLANK SLOT
  if (safeParticipant.isBlank) {
    if (isPending) {
      return (
        <div 
          className="video-cell blank-peo-container pending-request-cell"
          style={{ 
            backgroundColor: pendingRequest?.color || '#1e293b', 
            boxShadow: '0 0 20px #fbbf24',
            cursor: 'default' 
          }}
        >
          <PeoBorder color="#fbbf24" />

          <div className="sparkle-overlay">
            <div className="sparkle" style={{ top: '15%', left: '20%', width: '25px', height: '25px', animationDelay: '0s', animationDuration: '2s' }} />
            <div className="sparkle" style={{ top: '40%', left: '75%', width: '18px', height: '18px', animationDelay: '0.5s', animationDuration: '1.8s' }} />
            <div className="sparkle" style={{ top: '75%', left: '30%', width: '22px', height: '22px', animationDelay: '1.1s', animationDuration: '2.2s' }} />
          </div>

          {pendingRequest?.selectedIcon && (
            <img 
              src={`/assets/svg_stickers/${pendingRequest.selectedIcon}`}
              alt="Selected Icon"
              className="gc-sticker pos-1"
            />
          )}

          <div className="pending-names-wrapper" style={{ zIndex: 10 }}>
            <span className="pending-label-title">Access Request</span>
            <span className="pending-adult-name">{pendingRequest?.myName || pendingRequest?.name || 'Guest'}</span>
            <span className="pending-connector">&</span>
            <span className="pending-child-name">{pendingRequest?.myLittleOne || ''}</span>
          </div>

          <div className="pending-approval-overlay" style={{ zIndex: 10 }}>
            <button className="accept-request-btn" onClick={(e) => { e.stopPropagation(); approveRequest && approveRequest(); }}>
              Accept
            </button>
            <button className="deny-request-btn" onClick={(e) => { e.stopPropagation(); denyRequest && denyRequest(); }}>
              No access
            </button>
          </div>
        </div>
      );
    }

    const coverData = (blankCovers && blankCovers[pId]) || {};
    const hasCover = !!coverData.coverUrl;

    const convertGoogleDriveLink = (url) => {
      if (!url) return '';
      if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
        const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
          return `https://lh3.googleusercontent.com/d/${match[1]}`;
        }
      }
      return url;
    };

    const handleLocalFile = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setTempCoverUrl(reader.result);
        };
        reader.readAsDataURL(file);
      }
    };

    const handleSave = () => {
      let finalCoverUrl = tempCoverUrl;
      if (tempCoverUrl && !tempCoverUrl.startsWith('data:image/')) {
        finalCoverUrl = convertGoogleDriveLink(tempCoverUrl);
      }
      setBlankCovers && setBlankCovers(prev => ({
        ...(prev || {}),
        [pId]: {
          coverUrl: finalCoverUrl,
          hyperlink: tempLink
        }
      }));
      setIsEditing(false);
    };

    const handleClear = () => {
      setBlankCovers && setBlankCovers(prev => {
        const updated = { ...(prev || {}) };
        delete updated[pId];
        return updated;
      });
      setTempCoverUrl('');
      setTempLink('');
      setIsEditing(false);
    };

    const isLocalFile = tempCoverUrl.startsWith('data:image/');
    const hasHyperlink = !!coverData.hyperlink;

    return (
      <div 
        className={`video-cell spotlight-cell blank-peo-container ${hasCover ? 'has-cover' : ''}`}
        style={hasHyperlink ? { cursor: 'pointer' } : {}}
        onClick={(e) => {
          if (hasHyperlink && !e.target.closest('.blank-peo-edit-form') && !e.target.closest('.edit-blank-btn')) {
            window.open(coverData.hyperlink, '_blank');
          }
        }}
      >
        <div className="gc-capture-wrapper" style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', overflow: 'hidden', zIndex: 1, pointerEvents: 'none' }}>
          <img 
            src="/assets/lights.png" 
            alt="Lights" 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              zIndex: 2,
              borderRadius: '12px'
            }}
          />
          {hasCover && (
            <div 
              className="peo-background-cover"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage: `url(${coverData.coverUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                zIndex: 1,
                borderRadius: '12px'
              }}
            />
          )}
        </div>

        {!isInstructorClient && (
          <div className="gc-name-badge" style={{ zIndex: 12 }}>
            Attach Link
          </div>
        )}

        {canEditThisBlank && !isEditing && (
          <button 
            className="edit-blank-btn"
            style={{ zIndex: 12 }}
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
          >
            Upload Cover
          </button>
        )}

        {isEditing && (
          <div className="blank-peo-edit-form" style={{ zIndex: 10 }} onClick={(e) => e.stopPropagation()}>
            <h4>Upload Cover & Link</h4>
            
            <div className="form-fields">
              <label className="file-input-label">
                Upload from Computer:
                {isLocalFile ? (
                  <div className="local-file-status">
                    <span>Selected local image</span>
                    <button 
                      type="button" 
                      className="remove-local-btn" 
                      onClick={() => setTempCoverUrl('')}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <input type="file" accept="image/*" onChange={handleLocalFile} />
                )}
              </label>

              {!isLocalFile && (
                <label>
                  Google Drive URL:
                  <input 
                    type="text" 
                    placeholder="https://drive.google.com/..." 
                    value={tempCoverUrl} 
                    onChange={(e) => setTempCoverUrl(e.target.value)} 
                  />
                </label>
              )}

              <label>
                PEO Hyperlink:
                <input 
                  type="text" 
                  placeholder="https://..." 
                  value={tempLink} 
                  onChange={(e) => setTempLink(e.target.value)} 
                />
              </label>
            </div>

            <div className="form-buttons">
              <button className="save-btn" onClick={handleSave}>Save</button>
              <button className="clear-btn" onClick={handleClear}>Clear</button>
              <button className="close-btn-form" onClick={() => setIsEditing(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // RENDER PARTICIPANT SLOT
  const showActiveGlow = isActive && !isClosed;
  const showRaiseHandGlow = buttons?.raiseHand && !isClosed;
  const showGreenFilter = buttons?.greenFilter && !isClosed;
  const showBlueFilter = buttons?.blueFilter && !isClosed;
  const showPurpleFilter = buttons?.purpleFilter && !isClosed;
  const showOrangeFilter = buttons?.orangeFilter && !isClosed;
  const showGrayscale = isClosed;
  const isNonInteractive = isClosed || safeParticipant.isBlank;
  const isSpotlight = safeParticipant.isBlank;

  const glowColor = getGlowColor(safeParticipant.selectedBorder);
  const borderStyle = safeParticipant.selectedBorder && !isClosed ? {
    boxShadow: showActiveGlow 
      ? `0 0 20px #ffffff, 0 0 10px ${glowColor}`
      : `0 0 12px ${glowColor}`
  } : {};

  const safeStickers = Array.isArray(stickers) ? stickers : [];

  return (
    <div 
      className={`video-cell ${showActiveGlow ? 'active-gc' : ''} ${showGrayscale ? 'grayscale-sharp' : ''} ${isNonInteractive ? 'non-interactive' : ''} ${isSpotlight ? 'spotlight-cell' : ''}`} 
      onClick={handleCellClick}
      style={borderStyle}
    >
      {safeParticipant.selectedBorder && !isClosed && (
        <PeoBorder color={safeParticipant.selectedBorder} />
      )}

      <div className="gc-capture-wrapper" style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', overflow: 'hidden', zIndex: 1, pointerEvents: 'none' }}>
        {(stream || (shouldShowWebcam && joinedStream)) && !isClosed && (
          <video 
            ref={joinedVideoRef} 
            autoPlay 
            playsInline 
            muted 
            className="gc-video-element"
          />
        )}
      </div>

      {safeParticipant.selectedIcon && (
        <img 
          src={`/assets/svg_stickers/${safeParticipant.selectedIcon}`}
          alt="Selected Icon"
          className="gc-sticker pos-1"
        />
      )}

      {safeParticipant.name && (
        <div 
          className={`gc-name-badge ${safeParticipant.isInstructor && isInstructorClient ? 'instructor-badge' : ''}`}
          style={{ 
            zIndex: 12, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: '8px',
            padding: (safeParticipant.isInstructor && isInstructorClient) ? '0px 24px' : '2px 6px',
            overflow: 'visible'
          }}
        >
          {safeParticipant.isInstructor && isInstructorClient ? (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const isStudioOpen = activeItoSection === 'studio';
                  if (isStudioOpen) {
                    setActiveItoSection && setActiveItoSection(null);
                  } else {
                    setActiveItoSection && setActiveItoSection('studio');
                    setIsSidebarOpen && setIsSidebarOpen(false);
                  }
                }}
                className="ic-toggle-btn"
                style={{
                  background: 'transparent',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: (activeItoSection === 'studio') ? '#ef4444' : 'white',
                  fontFamily: '"Risque", serif',
                  fontSize: '29px',
                  lineHeight: '1',
                  padding: '0 4px',
                  transform: 'rotate(-15deg)',
                  transition: 'all 0.2s ease',
                  textShadow: (activeItoSection === 'studio') ? '0 0 8px rgba(239, 68, 68, 0.5)' : 'none',
                  position: 'absolute',
                  left: '-12px'
                }}
                title="Toggle Instructor Tools"
              >
                I
              </button>
              
              <span
                style={{
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'inline-block',
                  textAlign: 'center'
                }}
              >
                {safeParticipant.name}
              </span>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const isStoOpen = isSidebarOpen && activeToolbox === 'student';
                  if (isStoOpen) {
                    setIsSidebarOpen && setIsSidebarOpen(false);
                    setActiveToolbox && setActiveToolbox(null);
                    setActiveGuestId && setActiveGuestId(null);
                  } else {
                    setActiveToolbox && setActiveToolbox('student');
                    if (!activeGuestId) {
                      const firstGuest = (participants || []).find(p => p && !p.isBlank && !p.isInstructor);
                      if (firstGuest) {
                        setActiveGuestId && setActiveGuestId(firstGuest.id);
                      }
                    }
                    setIsSidebarOpen && setIsSidebarOpen(true);
                  }
                }}
                className="ic-toggle-btn"
                style={{
                  background: 'transparent',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: (isSidebarOpen && activeToolbox === 'student') ? '#ef4444' : 'white',
                  fontFamily: '"Risque", serif',
                  fontSize: '29px',
                  lineHeight: '1',
                  padding: '0 4px',
                  transform: 'rotate(15deg)',
                  transition: 'all 0.2s ease',
                  textShadow: (isSidebarOpen && activeToolbox === 'student') ? '0 0 8px rgba(239, 68, 68, 0.5)' : 'none',
                  position: 'absolute',
                  right: '-12px'
                }}
                title="Toggle Student Tools"
              >
                S
              </button>
            </>
          ) : (
            safeParticipant.name
          )}
        </div>
      )}

      {showRaiseHandGlow && <div className="hand-raise-glow"></div>}
      {showGreenFilter && <div className="neon-green-overlay"></div>}
      {showBlueFilter && <div className="neon-blue-overlay"></div>}
      {showPurpleFilter && <div className="neon-purple-overlay"></div>}
      {showOrangeFilter && <div className="neon-orange-overlay"></div>}

      {globalPause && (
        <div className="peo-pause-overlay" style={{ zIndex: 12 }}>
          <Pause size={28} color="#ffffff" />
        </div>
      )}

      {showWhisper && buttons?.whisper && (
        <div className="peo-whisper-overlay" style={{ zIndex: 25 }}>
          <div className="whisper-bubble">
            {buttons.whisper}
          </div>
        </div>
      )}

      {safeStickers.filter(s => s && !(activeTheme === 'sor' && (s.position === 'confetti' || s.name === 'Confetti.svg'))).map((s) => {
        const nudge = (nudges && nudges[s.position]) || {};
        let style = {};
        
        if (s.position === 1) {
           style.marginTop = nudge.y ? `${nudge.y}px` : undefined;
           style.marginLeft = nudge.x ? `${nudge.x}px` : undefined;
        } else if (s.position === 2) {
           style.marginTop = nudge.y ? `${nudge.y}px` : undefined;
           style.marginRight = nudge.x ? `${-nudge.x}px` : undefined;
        } else if (s.position === 3) {
           style.marginBottom = nudge.y ? `${-nudge.y}px` : undefined;
           style.marginLeft = nudge.x ? `${nudge.x}px` : undefined;
        } else if (s.position === 4) {
           style.marginBottom = nudge.y ? `${-nudge.y}px` : undefined;
           style.marginRight = nudge.x ? `${-nudge.x}px` : undefined;
        }

        const isIcSticker = typeof s.position === 'string' && s.position !== 'confetti' && s.position !== 'sun' && s.position !== 'birthday' && s.position !== 'crown';

        if (isIcSticker) {
          let xTrans = '-50%';
          if (s.position === 'tl-c') xTrans = '0%';
          if (s.position === 'rc-2') xTrans = '-100%';
          const yTrans = '-50%';
          style.transform = `translate(${xTrans}, ${yTrans})`;
          style.width = '70px';
          style.height = '70px';
        }

        if (s.name === 'Drums.svg') {
          style.width = isIcSticker ? '72px' : '93px';
          style.height = isIcSticker ? '72px' : '93px';
        }

        if (s.name === 'Trumpet.svg') {
          let xT = 0;
          let yT = 0;
          let hasCustomTransform = false;

          if (s.position === 1) { xT = -65; yT = -65; hasCustomTransform = true; }
          else if (s.position === 2) { xT = 65; yT = -65; hasCustomTransform = true; }
          else if (s.position === 3) { xT = -65; yT = 0; hasCustomTransform = true; }
          else if (s.position === 4) { xT = 65; yT = 0; hasCustomTransform = true; }
          else if (s.position === 5) { xT = 50; yT = -50; hasCustomTransform = true; }
          else if (s.position === 'crown') {
            style.top = '13px';
          }
          else if (s.position === 'star') { xT = -50; yT = -50; hasCustomTransform = true; }
          else if (s.position === 'star2') { xT = 50; yT = 0; hasCustomTransform = true; }
          else if (s.position === 'heart') { xT = -50; yT = 50; hasCustomTransform = true; }
          else if (s.position === 'birthday') { xT = 50; yT = -50; hasCustomTransform = true; }
          else if (s.position === 'balloons') { xT = -50; yT = -50; hasCustomTransform = true; }
          else if (isIcSticker) {
            xT = (s.position.includes('tr-c') || s.position.startsWith('rc-')) ? 50 : -50;
            yT = -50;
            hasCustomTransform = true;
          }

          if (hasCustomTransform) {
            const xTInward = xT * 0.85;
            const yTInward = yT * 0.85;
            const rot = s.rotation || 0;
            const sc = s.scale || 1;
            style.transform = `translate(${xTInward}%, ${yTInward}%) rotate(${rot}deg) scale(${sc})`;
          }
        }

        const isLargeSticker = s.name === 'Guitar.svg' || s.name === 'Giraffe.png' || s.name === 'Trumpet.svg';
        const isTrumpet = s.name === 'Trumpet.svg';
        const isSpecialStar = s.name === 'ic star1.png' || s.name === 'ic star1_red.png' || s.name === 'ic_gold_star.png';
        const isItoSticker = isIcSticker || s.position === 'crown' || s.position === 'birthday';
        const isGiraffe = s.name === 'Giraffe.png';

        return (
          <img 
            key={s.id || `${s.name}-${s.position}`} 
            src={`/assets/svg_stickers/${s.name}`} 
            alt={s.name} 
            className={`gc-sticker pos-${s.position} ${isIcSticker ? 'ic-placed' : ''} ${(s.name === 'Sun with sunglasses.svg' && typeof s.position === 'number') ? 'sun-special' : ''} ${isLargeSticker ? 'large-sticker' : ''} ${isTrumpet ? 'trumpet-special' : ''} ${isSpecialStar ? 'ic-star-special' : ''} ${isGiraffe ? 'giraffe-special' : ''}`} 
            style={{ ...style, zIndex: (isSpecialStar || isItoSticker) ? 10000 : 11 }}
          />
        );
      })}
    </div>
  );
}