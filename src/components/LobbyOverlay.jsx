import { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Loader2, ShieldAlert, Camera } from 'lucide-react';
import PeoBorder from './PeoBorder';

const BORDERS = [
  { name: 'Yellow Line', value: '#F7F27C', file: 'Line 179.svg', color: '#F7F27C' },
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
  'Balloons 2 2.svg',
  'Boat 2.svg',
  'Dancer 2.svg',
  'Dog 2.svg',
  'Drums 2.svg',
  'Fish 2.svg',
  'Flowers 6.svg',
  'Guitar 2.svg',
  'Kitten 2.svg',
  'Piano 2 3.svg',
  'Sun with sunglasses 2.svg',
  'Truck 2 2.svg',
  'Trumpet 2.svg',
  'Xylophone 2.svg'
];

export default function LobbyOverlay() {
  const { lobbyStatus, requestAccess, setLobbyStatus, resetStudentState } = useAppContext();
  const [myName, setMyName] = useState('');
  const [myLittleOne, setMyLittleOne] = useState('');
  const [selectedBorder, setSelectedBorder] = useState(BORDERS[0].value);
  const [selectedIcon, setSelectedIcon] = useState(null);
  
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);

  // Webcam states
  const localVideoRef = useRef(null);
  const [stream, setStream] = useState(null);

  // ResizeObserver for scale calculations
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width } = entry.contentRect;
        setScale(width / 5208);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Request webcam access
  useEffect(() => {
    let activeStream = null;
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then((mediaStream) => {
        activeStream = mediaStream;
        setStream(mediaStream);
        if (localVideoRef.current) localVideoRef.current.srcObject = mediaStream;
      })
      .catch((err) => {
        console.log("Webcam access blocked:", err);
      });

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [lobbyStatus]);

  // Sync video stream when elements mount/lobbyStatus transitions
  useEffect(() => {
    if (stream) {
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    }
  }, [stream, lobbyStatus]);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!myName.trim() || !myLittleOne.trim()) return;
    // Request access with name info, selected border color, and selected icon
    requestAccess(myName.trim(), myLittleOne.trim(), selectedBorder, selectedIcon, selectedBorder);
  };

  const handleRetry = () => {
    resetStudentState();
  };

  const selectedIconFile = selectedIcon;

  return (
    <div className="lobby-backdrop">
      <div 
        className="lobby-svg-container" 
        ref={containerRef}
        style={{ '--lobby-scale': scale }}
      >
        <img src="/assets/Lobby.svg?v=2" className="lobby-svg-img" alt="Lobby Background" />
        <img src="/assets/lobby_rect.png" className="lobby-card-panel-1" alt="" />
        <img src="/assets/lobby_rect.png" className="lobby-card-panel-2" alt="" />

        {lobbyStatus === 'initial' && (
          <form onSubmit={handleSubmit}>
             {/* Input 1: My Name (Adult) */}
            <input 
              type="text" 
              className="lobby-overlay-input-1"
              required 
              placeholder="Adult's 1st Name"
              value={myName}
              onChange={(e) => setMyName(e.target.value.slice(0, 15))}
              maxLength={15}
            />

            {/* Input 2: My Little One (Child) */}
            <input 
              type="text" 
              className="lobby-overlay-input-2"
              required 
              placeholder="Child's 1st Name"
              value={myLittleOne}
              onChange={(e) => setMyLittleOne(e.target.value.slice(0, 15))}
              maxLength={15}
            />

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

              {/* Join Session Section (moved inside border color card) */}
              <div className="lobby-join-container">
                <img 
                  src="/assets/Lobby/Click to join session.svg" 
                  className="lobby-join-title-img" 
                  alt="Click to join session" 
                />
                <button 
                  type="submit" 
                  className="lobby-join-arrow-button"
                  disabled={!myName.trim() || !myLittleOne.trim() || !selectedIcon}
                  title="Join Session"
                >
                  <img 
                    src="/assets/Lobby/Arrow.svg" 
                    className="lobby-join-arrow-img" 
                    alt="Join Arrow" 
                  />
                </button>
              </div>
            </div>
          </form>
        )}

        {lobbyStatus === 'waiting' && (
          <div className="lobby-overlay-status waiting">
            <Loader2 className="lobby-status-spinner" />
            <h3>Waiting for approval...</h3>
            <p>The instructor will let you in shortly.</p>
          </div>
        )}

        {lobbyStatus === 'denied' && (
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
    </div>
  );
}
