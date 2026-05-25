import { Hand, Pause } from 'lucide-react';
import { useState, useEffect } from 'react';
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
  const { blankCovers, setBlankCovers, MOCK_USER_COUNT } = useAppContext();
  const [isEditing, setIsEditing] = useState(false);
  
  // Local state for forms
  const [tempCoverUrl, setTempCoverUrl] = useState('');
  const [tempLink, setTempLink] = useState('');

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

  const isClosed = globalPause || buttons.mute;
  const showActiveGlow = isActive && !isClosed;
  const showRaiseHandGlow = buttons.raiseHand && !isClosed;
  const showGreenFilter = buttons.greenFilter && !isClosed;
  const showGrayscale = isClosed;
  const isNonInteractive = isClosed || participant.isBlank;
  const isSpotlight = participant.isBlank;

  return (
    <div 
      className={`video-cell ${showActiveGlow ? 'active-gc' : ''} ${showGrayscale ? 'grayscale-sharp' : ''} ${isNonInteractive ? 'non-interactive' : ''} ${isSpotlight ? 'spotlight-cell' : ''}`} 
      onClick={() => onClick(participant)}
    >


      {/* Name Badge */}
      {participant.name && (
        <div className="gc-name-badge">
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
        <div className="peo-pause-overlay">
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
          const xTrans = (s.position.includes('tr-c') || s.position.startsWith('rc-')) ? '50%' : '-50%';
          const yTrans = '-50%';
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
            style={style}
          />
        );
      })}
    </div>
  );
}
