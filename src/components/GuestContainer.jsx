import { Hand, Pause } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';


export default function GuestContainer({ 
  participant, 
  isActive, 
  onClick, 
  stickers = [],
  buttons = { raiseHand: false, mute: false },
  nudges = {},
  globalPause
}) {
  const { blankCovers, setBlankCovers, MOCK_USER_COUNT, pendingRequest, approveRequest, denyRequest } = useAppContext();
  const [isEditing, setIsEditing] = useState(false);
  
  // Local state for forms
  const [tempCoverUrl, setTempCoverUrl] = useState('');
  const [tempLink, setTempLink] = useState('');

  // Webcams state
  const [pendingStream, setPendingStream] = useState(null);
  const pendingVideoRef = useRef(null);

  const [joinedStream, setJoinedStream] = useState(null);
  const joinedVideoRef = useRef(null);

  const isClosed = globalPause || (buttons && buttons.mute) || false;
  const isPending = participant.isBlank && participant.blankIndex === 1 && pendingRequest !== null;
  const isJoinedUser = !participant.isBlank && participant.id && String(participant.id).startsWith('active-joined');

  // Handle webcam stream for pending request slot (Instructor view)
  useEffect(() => {
    let activeStream = null;
    if (isPending) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then((s) => {
          activeStream = s;
          setPendingStream(s);
          if (pendingVideoRef.current) {
            pendingVideoRef.current.srcObject = s;
          }
        })
        .catch((err) => {
          console.log("Webcam access blocked in instructor pending view:", err);
        });
    } else {
      setPendingStream(null);
    }
    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isPending]);

  // Handle webcam stream for active joined participant
  useEffect(() => {
    let activeStream = null;
    if (isJoinedUser && !isClosed) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then((s) => {
          activeStream = s;
          setJoinedStream(s);
          if (joinedVideoRef.current) {
            joinedVideoRef.current.srcObject = s;
          }
        })
        .catch((err) => {
          console.log("Webcam access blocked in joined student view:", err);
        });
    } else {
      setJoinedStream(null);
    }
    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isJoinedUser, isClosed]);

  // Fetch current values when form is opened
  useEffect(() => {
    if (participant.isBlank) {
      const coverData = blankCovers[participant.id] || {};
      setTempCoverUrl(coverData.coverUrl || '');
      setTempLink(coverData.hyperlink || '');
    }
  }, [isEditing, participant.id, participant.isBlank, blankCovers]);

  const canEditBlank = Number(MOCK_USER_COUNT) === 1;

  if (participant.isBlank) {
    const isPending = participant.blankIndex === 1 && pendingRequest !== null;

    if (isPending) {
      return (
        <div 
          className="video-cell blank-peo-container pending-request-cell"
          style={{ 
            backgroundColor: pendingRequest.color, 
            borderColor: pendingRequest.selectedBorder || '#22c55e', 
            borderWidth: '3px',
            borderStyle: 'solid',
            boxShadow: pendingRequest.selectedBorder ? `0 0 15px ${pendingRequest.selectedBorder}` : '0 0 15px rgba(34, 197, 94, 0.45)',
            cursor: 'default' 
          }}
        >
          {/* Live webcam feed background */}
          {pendingStream && (
            <video 
              ref={pendingVideoRef} 
              autoPlay 
              playsInline 
              muted 
              className="gc-video-element"
            />
          )}

          {/* Sparkle glisten overlay (only visible to IC) */}
          <div className="sparkle-overlay">
            <div className="sparkle" style={{ top: '15%', left: '20%', width: '25px', height: '25px', animationDelay: '0s', animationDuration: '2s' }} />
            <div className="sparkle" style={{ top: '40%', left: '75%', width: '18px', height: '18px', animationDelay: '0.5s', animationDuration: '1.8s' }} />
            <div className="sparkle" style={{ top: '75%', left: '30%', width: '22px', height: '22px', animationDelay: '1.1s', animationDuration: '2.2s' }} />
            <div className="sparkle" style={{ top: '25%', left: '60%', width: '15px', height: '15px', animationDelay: '0.3s', animationDuration: '1.5s' }} />
            <div className="sparkle" style={{ top: '65%', left: '80%', width: '20px', height: '20px', animationDelay: '0.8s', animationDuration: '2.1s' }} />
          </div>

          {/* Icon Badge Overlay */}
          {pendingRequest.selectedIcon && (
            <img 
              src={`/assets/svg_stickers/${pendingRequest.selectedIcon}`}
              alt="Selected Icon"
              className="gc-joined-icon-badge"
            />
          )}

          <div className="pending-names-wrapper" style={{ zIndex: 10 }}>
            <span className="pending-label-title">Access Request</span>
            <span className="pending-adult-name">{pendingRequest.myName}</span>
            <span className="pending-connector">&</span>
            <span className="pending-child-name">{pendingRequest.myLittleOne}</span>
          </div>

          <div className="pending-approval-overlay" style={{ zIndex: 10 }}>
            <button className="accept-request-btn" onClick={(e) => { e.stopPropagation(); approveRequest(); }}>
              Accept
            </button>
            <button className="deny-request-btn" onClick={(e) => { e.stopPropagation(); denyRequest(); }}>
              No access
            </button>
          </div>
        </div>
      );
    }

    const coverData = blankCovers[participant.id] || {};
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
          setTempCoverUrl(reader.result); // Base64 representation of image
        };
        reader.readAsDataURL(file);
      }
    };

    const handleSave = () => {
      let finalCoverUrl = tempCoverUrl;
      if (tempCoverUrl && !tempCoverUrl.startsWith('data:image/')) {
        finalCoverUrl = convertGoogleDriveLink(tempCoverUrl);
      }
      setBlankCovers(prev => ({
        ...prev,
        [participant.id]: {
          coverUrl: finalCoverUrl,
          hyperlink: tempLink
        }
      }));
      setIsEditing(false);
    };

    const handleClear = () => {
      setBlankCovers(prev => {
        const updated = { ...prev };
        delete updated[participant.id];
        return updated;
      });
      setTempCoverUrl('');
      setTempLink('');
      setIsEditing(false);
    };

    const isLocalFile = tempCoverUrl.startsWith('data:image/');

    return (
      <div 
        className={`video-cell spotlight-cell blank-peo-container ${hasCover ? 'has-cover' : ''}`}
        style={hasCover ? { backgroundImage: `url(${coverData.coverUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', cursor: 'pointer' } : {}}
        onClick={(e) => {
          if (hasCover && coverData.hyperlink && !e.target.closest('.blank-peo-edit-form') && !e.target.closest('.edit-blank-btn')) {
            window.open(coverData.hyperlink, '_blank');
          }
        }}
      >
        {/* Label for 1st or 2nd blank PEO container */}
        {canEditBlank && !hasCover && (
          <div className="blank-peo-label">
            {participant.blankIndex === 1 ? "Upload 1" : "Upload 2"}
          </div>
        )}

        {/* Upload Cover Trigger */}
        {canEditBlank && !isEditing && (
          <button 
            className={`edit-blank-btn ${hasCover ? 'has-cover-btn' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
          >
            {hasCover ? "⚙️" : "⚙️ Upload Cover"}
          </button>
        )}

        {/* Edit Form Overlay */}
        {isEditing && (
          <div className="blank-peo-edit-form" onClick={(e) => e.stopPropagation()}>
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

  const showActiveGlow = isActive && !isClosed;
  const showRaiseHandGlow = buttons.raiseHand && !isClosed;
  const showGreenFilter = buttons.greenFilter && !isClosed;
  const showGrayscale = isClosed;
  const isNonInteractive = isClosed || participant.isBlank;
  const isSpotlight = participant.isBlank;

  const borderStyle = participant.selectedBorder && !isClosed ? {
    borderColor: participant.selectedBorder,
    borderWidth: '3px',
    borderStyle: 'solid',
    boxShadow: showActiveGlow 
      ? `0 0 20px #ffffff, 0 0 10px ${participant.selectedBorder}`
      : `0 0 12px ${participant.selectedBorder}`
  } : {};

  return (
    <div 
      className={`video-cell ${showActiveGlow ? 'active-gc' : ''} ${showGrayscale ? 'grayscale-sharp' : ''} ${isNonInteractive ? 'non-interactive' : ''} ${isSpotlight ? 'spotlight-cell' : ''}`} 
      onClick={() => onClick(participant)}
      style={borderStyle}
    >
      {/* Joined user live webcam video stream feed */}
      {isJoinedUser && !isClosed && joinedStream && (
        <video 
          ref={joinedVideoRef} 
          autoPlay 
          playsInline 
          muted 
          className="gc-video-element"
        />
      )}

      {/* Selected Icon Sticker Overlay Badge */}
      {participant.selectedIcon && (
        <img 
          src={`/assets/svg_stickers/${participant.selectedIcon}`}
          alt="Selected Icon"
          className="gc-joined-icon-badge"
        />
      )}

      {/* Name Badge */}
      {participant.name && (
        <div className="gc-name-badge" style={{ zIndex: 12 }}>
          {participant.name}
        </div>
      )}

      {/* Hand Raise Glow Layer (z-index: 15) */}
      {showRaiseHandGlow && <div className="hand-raise-glow"></div>}

      {/* Neon Green Filter Overlay (z-index: 18) */}
      {showGreenFilter && <div className="neon-green-overlay"></div>}

      {/* Status Icons (z-index: 20) */}
      {buttons.raiseHand && (
        <div className="gc-status-icons">
          <Hand size={10} color="#eab308" />
        </div>
      )}

      {/* Pause Overlay (transparent, centered pause icon) */}
      {globalPause && (
        <div className="peo-pause-overlay" style={{ zIndex: 12 }}>
          <Pause size={28} color="#ffffff" />
        </div>
      )}


      {/* Stickers */}
      {stickers.map((s) => {
        const nudge = nudges[s.position] || {};
        let style = {};
        
        if (s.position === 1) { // top-left
           style.marginTop = nudge.y ? `${nudge.y}px` : undefined;
           style.marginLeft = nudge.x ? `${nudge.x}px` : undefined;
        } else if (s.position === 2) { // top-right
           style.marginTop = nudge.y ? `${nudge.y}px` : undefined;
           style.marginRight = nudge.x ? `${-nudge.x}px` : undefined;
        } else if (s.position === 3) { // bottom-left
           style.marginBottom = nudge.y ? `${-nudge.y}px` : undefined;
           style.marginLeft = nudge.x ? `${nudge.x}px` : undefined;
        } else if (s.position === 4) { // bottom-right
           style.marginBottom = nudge.y ? `${-nudge.y}px` : undefined;
           style.marginRight = nudge.x ? `${-nudge.x}px` : undefined;
        }

        const isIcSticker = typeof s.position === 'string' && s.position !== 'confetti' && s.position !== 'sun' && s.position !== 'birthday' && s.position !== 'crown';

        if (isIcSticker) {
          let xTrans = '0%';
          let yTrans = '0%';
          if (s.position === 'tc' || s.position === 'tl-c') {
            xTrans = '-50%';
            yTrans = '0%';
          } else if (s.position === 'tr-c') {
            xTrans = '50%';
            yTrans = '0%';
          } else if (s.position === 'lc') {
            xTrans = '0%';
            yTrans = '-50%';
          } else if (s.position === 'rc-1' || s.position === 'rc-2') {
            xTrans = '0%';
            yTrans = '0%';
          }
          const rot = s.rotation || 0;
          const sc = s.scale || 1;
          style.transform = `translate(${xTrans}, ${yTrans}) rotate(${rot}deg) scale(${sc})`;
        }

        if (s.name === 'Drums 2.svg') {
          style.width = isIcSticker ? '40px' : '62px';
          style.height = isIcSticker ? '40px' : '62px';
        }

        return (
          <img 
            key={s.id} 
            src={`/assets/svg_stickers/${s.name}`} 
            alt={s.name} 
            className={`gc-sticker pos-${s.position} ${isIcSticker ? 'ic-placed' : ''} ${(s.name === 'Sun with sunglasses 2.svg' && typeof s.position === 'number') ? 'sun-special' : ''}`} 
            style={{ ...style, zIndex: 11 }}
          />
        );
      })}
    </div>
  );
}
