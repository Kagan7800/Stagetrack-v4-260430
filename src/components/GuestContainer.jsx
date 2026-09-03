// src/components/GuestContainer.jsx

import { Pause } from 'lucide-react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { allocate } from '../utils/stickerAllocator';
const getBorderStyle = (borderValue, innerBg = 'rgba(11, 25, 46, 0.7)') => {
  if (!borderValue) return {};
  
  let colorVal = borderValue;
  if (colorVal.endsWith('_2')) {
    colorVal = colorVal.substring(0, colorVal.length - 2);
  }

  if (colorVal === 'url(#peo-gradient-185)' || colorVal.includes('peo-gradient-185')) {
    return {
      border: '2px solid transparent',
      backgroundImage: `linear-gradient(${innerBg}, ${innerBg}), linear-gradient(135deg, #F7F27C, rgba(247, 242, 124, 0))`,
      backgroundOrigin: 'border-box',
      backgroundClip: 'padding-box, border-box'
    };
  }
  
  if (colorVal === 'url(#peo-gradient-186)' || colorVal.includes('peo-gradient-186')) {
    return {
      border: '2px solid transparent',
      backgroundImage: `linear-gradient(${innerBg}, ${innerBg}), linear-gradient(135deg, rgba(252, 0, 0, 0.59), #FBFF49)`,
      backgroundOrigin: 'border-box',
      backgroundClip: 'padding-box, border-box'
    };
  }

  return {
    border: `2px solid ${colorVal}`,
    backgroundColor: innerBg
  };
};

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
    activeGuestId,
    isInstructorVerified
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

  const isInstructorClient = isInstructorVerified;
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

  const showActiveGlow = isActive && !isClosed;
  const glowColor = getGlowColor(safeParticipant.selectedBorder);
  const hasCustomBorder = !!safeParticipant.selectedBorder && !isClosed;

  const captureWrapperStyle = {
    position: 'absolute',
    inset: '0',
    borderRadius: 'inherit',
    overflow: 'hidden',
    zIndex: 1,
    pointerEvents: 'none',
    backgroundColor: 'rgba(11, 25, 46, 0.7)'
  };

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
            boxShadow: '0 0 20px #fbbf24',
            cursor: 'default',
            border: '2px solid #fbbf24',
            backgroundColor: pendingRequest?.color || '#1e293b'
          }}
        >
          <div className="sparkle-overlay" style={{ inset: 0, borderRadius: 'inherit' }}>
            <div className="sparkle" style={{ top: '15%', left: '20%', width: '25px', height: '25px', animationDelay: '0s', animationDuration: '2s' }} />
            <div className="sparkle" style={{ top: '40%', left: '75%', width: '18px', height: '18px', animationDelay: '0.5s', animationDuration: '1.8s' }} />
            <div className="sparkle" style={{ top: '75%', left: '30%', width: '22px', height: '22px', animationDelay: '1.1s', animationDuration: '2.2s' }} />
          </div>



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
        className={`video-cell blank-peo-container ${hasCover ? 'has-cover' : ''}`}
        style={hasHyperlink ? { cursor: 'pointer' } : {}}
        onClick={(e) => {
          if (hasHyperlink && !e.target.closest('.blank-peo-edit-form') && !e.target.closest('.edit-blank-btn')) {
            window.open(coverData.hyperlink, '_blank');
          }
        }}
      >
        <div className="gc-capture-wrapper" style={captureWrapperStyle}>
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

        {canEditThisBlank && !isEditing && (
          <button 
            className="edit-blank-btn"
            style={{ zIndex: 12 }}
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
          >
            Peo box = 8
          </button>
        )}

        {isEditing && (
          <div className="blank-peo-edit-form" style={{ zIndex: 10 }} onClick={(e) => e.stopPropagation()}>
            <h4>Peo box = 8</h4>
            
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
  const showRaiseHandGlow = buttons?.raiseHand && !isClosed;
  const showGreenFilter = buttons?.greenFilter && !isClosed;
  const showBlueFilter = buttons?.blueFilter && !isClosed;
  const showPurpleFilter = buttons?.purpleFilter && !isClosed;
  const showOrangeFilter = buttons?.orangeFilter && !isClosed;
  const showGrayscale = isClosed;
  const isNonInteractive = isClosed || safeParticipant.isBlank;

  const borderStyle = hasCustomBorder ? {
    ...getBorderStyle(safeParticipant.selectedBorder, 'rgba(11, 25, 46, 0.7)'),
    boxShadow: showActiveGlow 
      ? `0 0 20px #ffffff, 0 0 10px ${glowColor}`
      : `0 0 12px ${glowColor}`
  } : {};

  const safeStickers = Array.isArray(stickers) ? stickers : [];

  const { placed, removed } = useMemo(() => {
    return allocate(
      safeStickers.filter(s => s && !(s.position === 'confetti' || s.name === 'Confetti.svg')),
      safeParticipant.selectedIcon || null
    );
  }, [safeStickers, safeParticipant.selectedIcon]);

  const hasConfetti = safeStickers.some(s => s && (s.position === 'confetti' || s.name === 'Confetti.svg'));

  return (
    <div 
      className={`video-cell tile ${showActiveGlow ? 'active-gc' : ''} ${showGrayscale ? 'grayscale-sharp' : ''} ${isNonInteractive ? 'non-interactive' : ''}`} 
      onClick={handleCellClick}
      style={borderStyle}
    >
      <div className="gc-capture-wrapper" style={captureWrapperStyle}>
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

      {safeParticipant.name && (
        <div 
          className={`gc-name-badge ${safeParticipant.isInstructor ? 'instructor-badge' : ''}`}
          style={{ 
            zIndex: 12, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center'
          }}
        >
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

      {/* Spec v3 Derived 8-Slot Placement Scalable Sticker Layer */}
      <div className="sticker-layer">
        {placed.map(({ slot, sticker }) => {
          const isCrown = sticker.kind === 'crown' || (sticker.name && sticker.name.toLowerCase().includes('crown')) || slot === 'TC';
          const isBirthday = sticker.kind === 'birthday' || (sticker.name && sticker.name.toLowerCase().includes('birthday')) || slot === 'NE';
          const isXylophone = sticker.name && sticker.name.toLowerCase().includes('xylophone');
          const isTrumpet = sticker.name && sticker.name.toLowerCase().includes('trumpet');
          const isFlower = sticker.name && sticker.name.toLowerCase().includes('flower');
          const isStar = sticker.name && sticker.name.toLowerCase().includes('star');

          let scale = sticker.scale || 1;
          if (isCrown) {
            scale = scale * 1.25;
          } else if (isBirthday) {
            scale = scale * 1.25;
          } else if (isXylophone) {
            scale = scale * 1.25;
          } else if (isTrumpet) {
            scale = scale * 1.20;
          } else if (isFlower) {
            scale = scale * 0.85;
          } else if (isStar) {
            scale = scale * 1.15;
          }

          const isSun = sticker.kind === 'sun' || (sticker.name && sticker.name.toLowerCase().includes('sun')) || slot === 'E';

          let origin = 'center center';
          if (isCrown) origin = 'center bottom';
          else if (isSun) origin = 'right center';

          return (
            <div 
              key={sticker.id || `${sticker.name}-${slot}`}
              className="sticker-item sl-placed"
              data-slot={slot}
            >
              <div 
                className="sticker-visual"
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: origin
                }}
              >
                <img 
                  src={`/assets/svg_stickers/${sticker.name}`} 
                  alt={sticker.name} 
                />
              </div>
            </div>
          );
        })}
      </div>

      {hasConfetti && (
        <img 
          src="/assets/svg_stickers/Confetti.svg" 
          alt="Confetti"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            zIndex: 50,
            pointerEvents: 'none'
          }}
        />
      )}
    </div>
  );
}