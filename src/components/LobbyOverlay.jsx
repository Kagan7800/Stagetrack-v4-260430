import { useState, useRef, useEffect, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { Loader2, ShieldAlert, Camera } from 'lucide-react';
import PeoBorder from './PeoBorder';

import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';

const BORDERS = [
  { name: 'Cyan Line', value: '#00FCFC', file: 'Line 180.svg', color: '#00FCFC' },
  { name: 'Red Line', value: '#FC0000', file: 'Line 181.svg', color: '#FC0000' },
  { name: 'Mint Line', value: '#87E9C0', file: 'Line 182.svg', color: '#87E9C0' },
  { name: 'Pink Line', value: '#EC7AD3', file: 'Line 183.svg', color: '#EC7AD3' },
  { name: 'Black Line', value: '#000000', file: 'Line 184.svg', color: '#000000' },
  { name: 'Yellow Gradient Line', value: 'url(#peo-gradient-185)', file: 'Line 185.svg', color: '#F7F27C' },
  { name: 'Red Yellow Gradient Line', value: 'url(#peo-gradient-186)', file: 'Line 186.svg', color: '#FC0000' },
  { name: 'Yellow Line 2', value: '#F7F27C_2', file: 'Line 187.svg', color: '#F7F27C' }
];

const STO_STICKERS = [
  { id: 'Sun with sunglasses.svg', name: 'Sun with sunglasses' },
  { id: 'Fish.svg', name: 'Fish' },
  { id: 'Balloons.svg', name: 'Balloons' },
  { id: 'Flowers 6.svg', name: 'Flowers' },
  { id: 'Truck.svg', name: 'Truck' },
  { id: 'Boat.svg', name: 'Boat' },
  { id: 'Dancer.svg', name: 'Dancer' },
  { id: 'Drums.svg', name: 'Drums' },
  { id: 'Guitar.svg', name: 'Guitar' },
  { id: 'Kitten.svg', name: 'Kitten' },
  { id: 'Microphone.svg', name: 'Microphone' },
  { id: 'Piano.svg', name: 'Piano' },
  { id: 'Trumpet.svg', name: 'Trumpet' },
  { id: 'Xylophone.svg', name: 'Xylophone' }
];

const VIBE_CHIPS = [
  { id: 'high_energy', emoji: '⚡', label: 'High Energy', color: '#f97316' },
  { id: 'low_energy', emoji: '🔋', label: 'Tired / Low', color: '#a855f7' },
  { id: 'gentle_warmup', emoji: '🥺', label: 'Needing Warm-Up', color: '#3b82f6' },
  { id: 'birthday', emoji: '🎉', label: 'Birthday Today!', color: '#facc15' },
  { id: 'under_weather', emoji: '🤒', label: 'Not Feeling Well', color: '#06b6d4' },
  { id: 'focused', emoji: '🧩', label: 'Deeply Focused', color: '#10b981' }
];

function LobbyVibeChips({ selectedVibeChips, setSelectedVibeChips }) {
  const toggleChip = (id) => {
    setSelectedVibeChips(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  return (
    <div className="lobby-vibe-chips-grid">
      {/* Inside divider lines with 60% opacity */}
      <div className="vibe-v-line" />
      <div className="vibe-h-line-1" />
      <div className="vibe-h-line-2" />

      {VIBE_CHIPS.map(chip => {
        const isSelected = selectedVibeChips.includes(chip.id);
        return (
          <button
            key={chip.id}
            type="button"
            className={`lobby-vibe-chip-button ${isSelected ? 'selected' : ''}`}
            style={{
              '--chip-color': chip.color,
              '--chip-bg': chip.bg
            }}
            onClick={() => toggleChip(chip.id)}
          >
            <span className="vibe-chip-emoji">{chip.emoji}</span>
            <span className="vibe-chip-label">
              <span>{chip.line1}</span>
              <span>{chip.line2}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function LobbyOverlay() {
  const { sessionId, lobbyStatus, setLobbyStatus, pendingRequest, approveRequest, isInstructorVerified } = useAppContext();
  const isInstructor = isInstructorVerified;

  const [myName, setMyName] = useState('');
  const [selectedBorder, setSelectedBorder] = useState(BORDERS[0].value);
  const [selectedIcon, setSelectedIcon] = useState(null);
  const [selectedVibeChips, setSelectedVibeChips] = useState([]);

  const [children, setChildren] = useState(['']);

  const myLittleOne = children.filter(c => c.trim()).join(' & ');

  const getChildInputStyle = (index, total) => {
    if (total === 1) {
      return {
        top: '51.313%',
        height: '6.141%',
        fontSize: 'calc(54.72px * var(--lobby-scale))',
        padding: 'calc(15px * var(--lobby-scale)) 0 0 0'
      };
    } else if (total === 2) {
      return {
        top: index === 0 ? '48.5%' : '55.5%',
        height: '4.6%',
        fontSize: 'calc(42px * var(--lobby-scale))',
        padding: 'calc(10px * var(--lobby-scale)) 0 0 0'
      };
    } else {
      // 3
      return {
        top: index === 0 ? '46.5%' : index === 1 ? '51.8%' : '57.1%',
        height: '3.6%',
        fontSize: 'calc(32px * var(--lobby-scale))',
        padding: 'calc(6px * var(--lobby-scale)) 0 0 0'
      };
    }
  };
  
  const getScale = () => {
    if (typeof window === 'undefined') return 0.3;
    const width = Math.min(window.innerWidth, window.innerHeight * (5208 / 2817));
    return width / 5208;
  };

  const [scale, setScale] = useState(getScale);

  useEffect(() => {
    const handleResize = () => {
      setScale(getScale());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
 

  // Webcam states
  const localVideoRef = useRef(null);
  const [stream, setStream] = useState(null);

  useEffect(() => {
    let activeStream = null;
    if (lobbyStatus === 'initial' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then((mediaStream) => {
          activeStream = mediaStream;
          setStream(mediaStream);
          if (localVideoRef.current) localVideoRef.current.srcObject = mediaStream;
        })
        .catch((err) => {
          console.log("Webcam access blocked or denied:", err);
        });
    }

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => {
          track.stop();
          console.log("[Lobby Overlay] Webcam track stopped:", track.label);
        });
      }
    };
  }, [lobbyStatus]);

  useEffect(() => {
    if (stream && localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
  }, [stream, lobbyStatus]);

  const handleSubmit = useCallback(async (e) => {
    if (e) e.preventDefault();
    if (!myName.trim() || !myLittleOne.trim() || !selectedIcon || !sessionId) return;

    const guestId = `active-joined-${Date.now()}`;
    sessionStorage.setItem('stagetrack_active_guest_id', guestId);
    sessionStorage.setItem('stagetrack_role', 'student');

    const reqData = {
      id: guestId,
      name: `${myName.trim()} & ${myLittleOne.trim()}`,
      myName: myName.trim(),
      myLittleOne: myLittleOne.trim(),
      selectedIcon: selectedIcon,
      selectedBorder: selectedBorder,
      color: selectedBorder,
      vibeChips: selectedVibeChips,
      timestamp: Date.now()
    };

    try {
      const sessionRef = doc(db, "sessions", sessionId);
      await updateDoc(sessionRef, {
        lobbyRequest: reqData,
        lobbyResponse: { status: 'pending' }
      });
      setLobbyStatus('pending');
    } catch (err) {
      console.error("Error submitting join request:", err);
    }
  }, [myName, myLittleOne, selectedIcon, sessionId, selectedBorder, selectedVibeChips, setLobbyStatus]);

  const handleRetry = () => {
    setLobbyStatus('initial');
  };

  const handleEnterAsInstructor = () => {
    sessionStorage.setItem('stagetrack_role', 'instructor');
    const params = new URLSearchParams(window.location.search);
    params.set('role', 'instructor');
    const searchStr = params.toString();
    window.location.href = window.location.origin + window.location.pathname + (searchStr ? '?' + searchStr : '');
  };

  // --- INSTRUCTOR HANDLER ---
  const handleAcceptGuest = async () => {
    if (!pendingRequest || !sessionId) return;
    await approveRequest();
  };

  if (isInstructor) {
    if (!pendingRequest) return null;

    return (
      <div className="lobby-overlay-backdrop" style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="lobby-modal" style={{ background: '#1e293b', padding: '30px', borderRadius: '16px', textAlign: 'center', color: '#fff', border: '2px solid #3b82f6' }}>
          <h2>Guest Waiting in Lobby</h2>
          <p style={{ fontSize: '1.2rem', margin: '15px 0' }}><strong>{pendingRequest.name}</strong> wants to join your session.</p>
          <button 
            onClick={handleAcceptGuest}
            style={{ padding: '12px 28px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '1.1rem', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Admit Guest
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="lobby-backdrop">
      {lobbyStatus === 'initial' ? (
        <div 
          className="lobby-svg-container" 
          style={{ '--lobby-scale': scale, color: 'white' }}
        >
          {/* Logo at top center */}
          <img
            src="/assets/logo-thr.png"
            className="lobby-top-logo"
            alt="Music Fun Logo"
          />
          <div className="lobby-top-logo-divider" />
          {lobbyStatus === 'initial' && (
            <button 
              type="button" 
              className="lobby-instructor-bypass-btn"
              onClick={handleEnterAsInstructor}
            >
              Enter as Instructor
            </button>
          )}
          <img src="/assets/lobby_rect.png" className="lobby-card-panel-1" alt="" />
          <img src="/assets/lobby_rect.png" className="lobby-card-panel-2" alt="" />
          <img src="/assets/lobby_rect.png" className="lobby-card-panel-3" alt="" />

          <form onSubmit={handleSubmit}>
            {/* Input 1: My Name (Adult) */}
            {!myName && (
              <div 
                style={{
                  position: 'absolute',
                  left: '4.377%',
                  top: '41.977%',
                  width: '18.683%',
                  height: '6.141%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ef4444',
                  fontSize: 'calc(54.72px * var(--lobby-scale))',
                  paddingTop: 'calc(15px * var(--lobby-scale))',
                  fontFamily: "'Risque', serif",
                  zIndex: 4,
                  pointerEvents: 'none',
                  boxSizing: 'border-box'
                }}
              >
                Adult's 1st Name
              </div>
            )}
            <input 
              type="text" 
              className="lobby-overlay-input-1"
              required 
              placeholder=""
              value={myName}
              onChange={(e) => setMyName(e.target.value.slice(0, 30))}
              maxLength={30}
            />

            {/* Plus sign button to the left of child's first name */}
            {children.length < 3 && (
              <button
                type="button"
                onClick={() => setChildren([...children, ''])}
                style={{
                  position: 'absolute',
                  left: '1.5%',
                  top: getChildInputStyle(0, children.length).top,
                  width: 'calc(100px * var(--lobby-scale))',
                  height: getChildInputStyle(0, children.length).height,
                  borderRadius: '50%',
                  background: 'transparent',
                  border: 'none',
                  color: '#F7F27C',
                  fontSize: 'calc(112.5px * var(--lobby-scale))',
                  fontWeight: '900',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 10,
                  boxShadow: 'none',
                  fontFamily: 'inherit',
                  padding: 0
                }}
                title="Add another child"
              >
                +
              </button>
            )}

            {/* Child inputs (1, 2, or 3) */}
            {children.map((childVal, i) => {
              const inputStyle = getChildInputStyle(i, children.length);
              const titleText = i === 0 
                ? "Child's 1st Name" 
                : i === 1 
                ? "2nd Child's Name" 
                : "3rd Child's Name";

              return (
                <div key={i}>
                  {!childVal && (
                    <div 
                      style={{
                        position: 'absolute',
                        left: '4.377%',
                        width: '18.683%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ef4444',
                        fontFamily: "'Risque', serif",
                        zIndex: 4,
                        pointerEvents: 'none',
                        boxSizing: 'border-box',
                        ...inputStyle
                      }}
                    >
                      {titleText}
                    </div>
                  )}
                  <input 
                    type="text" 
                    className="lobby-overlay-input-2"
                    required 
                    placeholder=""
                    value={childVal}
                    onChange={(e) => {
                      const next = [...children];
                      next[i] = e.target.value.slice(0, 30);
                      setChildren(next);
                    }}
                    maxLength={30}
                    style={{
                      position: 'absolute',
                      left: '4.377%',
                      width: '18.683%',
                      zIndex: 3,
                      ...inputStyle
                    }}
                  />
                </div>
              );
            })}

            {/* Camera feed overlay inside the container below the inputs */}
            <div className="lobby-camera-preview-container">
              {stream ? (
                <video ref={localVideoRef} autoPlay playsInline muted className="lobby-camera-video-elem" />
              ) : (
                <div className="lobby-camera-blocked-fallback">
                  <Camera className="camera-icon-fallback" />
                  <span>Webcam Preview</span>
                </div>
              )}
              {/* Name Overlay */}
              {myName && (
                <div className="lobby-camera-name-badge">
                  {myName}
                </div>
              )}
              {/* Selected Sticker Badge */}
              {selectedIcon && (
                <img 
                  src={`/assets/svg_stickers/${selectedIcon}`}
                  className="lobby-camera-icon-badge" 
                  alt="Selected Icon Badge" 
                />
              )}
              {/* SVG-based PEO Border component */}
              <PeoBorder color={selectedBorder} />
            </div>

            {/* STO Stickers selection grid mapped over Card 1 (Left Side Box) */}
            <div className="lobby-stickers-grid">
              <div className="lobby-card-title">Choose 1 sticker</div>
              <div className="lobby-stickers-container">
                {STO_STICKERS.map((sticker) => (
                  <button
                    key={sticker}
                    type="button"
                    className={`lobby-sticker-swatch ${selectedIcon === sticker ? 'selected' : ''}`}
                    onClick={() => setSelectedIcon(sticker)}
                    title={`Select ${sticker.replace('.svg', '')}`}
                  >
                    <img 
                      src={`/assets/svg_stickers/${sticker}`} 
                      className="lobby-sticker-swatch-img" 
                      alt={sticker} 
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Border Color selection grid mapped over Card 2 (Right Side Box) */}
            <div className="lobby-colors-grid">
              <div className="lobby-card-title">Choose your border color</div>
              <div className="lobby-lines-stack">
                {BORDERS.map((b) => (
                  <button
                    key={b.value}
                    type="button"
                    className={`lobby-line-button ${selectedBorder === b.value ? 'selected' : ''}`}
                    style={{ '--line-glow-color': b.color }}
                    onClick={() => setSelectedBorder(b.value)}
                    title={b.name}
                  >
                    <img 
                      src={`/assets/All/${b.file}`} 
                      className="lobby-line-img" 
                      alt={b.name} 
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Card 3: How is your Little One today? */}
            <div className="lobby-vibe-card-container">
              <div className="lobby-card-title lobby-card-3-title">How is your Little One today?</div>
              <LobbyVibeChips selectedVibeChips={selectedVibeChips} setSelectedVibeChips={setSelectedVibeChips} />
            </div>

            {/* Join Session Section */}
            <button 
              type="submit" 
              className="lobby-join-container"
              disabled={!myName.trim() || !myLittleOne.trim() || !selectedIcon}
              onClick={handleSubmit}
              title="Join Session"
            >
              <img 
                src="/assets/Lobby/Click to join session.svg" 
                className="lobby-join-title-img" 
                alt="Click to join session" 
              />
              <div className="lobby-join-arrow-button-mock">
                <img 
                  src="/assets/Lobby/Arrow.svg" 
                  className="lobby-join-arrow-img" 
                  alt="Join Session Arrow" 
                />
              </div>
            </button>
          </form>
        </div>
      ) : (
        <div className="lobby-waiting-centered-container">
          {lobbyStatus === 'pending' && (
            <div className="lobby-overlay-status waiting">
              <Loader2 className="lobby-status-spinner" />
              <h3>Waiting for approval...</h3>
              <p>The instructor will let you in shortly.</p>
            </div>
          )}

          {(lobbyStatus === 'rejected' || lobbyStatus === 'denied') && (
            <div className="lobby-overlay-status denied">
              <ShieldAlert className="lobby-status-error-icon" />
              <h3>No Access</h3>
              <p className="denied-text">Access is not available now, please contact Admin.</p>
              <button type="button" onClick={handleRetry} className="lobby-status-retry-btn">
                Try Again
              </button>
            </div>
          )}
        </div>
      )}
      

    </div>
  );
}