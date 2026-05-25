import { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Loader2, ShieldAlert } from 'lucide-react';

const PALETTE = [
  { name: 'Pink Glow', value: 'hsl(330, 85%, 60%)' },
  { name: 'Electric Blue', value: 'hsl(210, 85%, 60%)' },
  { name: 'Neon Green', value: 'hsl(140, 80%, 55%)' },
  { name: 'Sunshine', value: 'hsl(45, 90%, 55%)' },
  { name: 'Purple Ray', value: 'hsl(270, 85%, 65%)' },
  { name: 'Sunset', value: 'hsl(15, 90%, 60%)' },
  { name: 'Cyan Breeze', value: 'hsl(180, 80%, 50%)' },
  { name: 'Ruby Red', value: 'hsl(0, 80%, 60%)' }
];

export default function LobbyOverlay() {
  const { lobbyStatus, requestAccess, setLobbyStatus } = useAppContext();
  const [myName, setMyName] = useState('');
  const [myLittleOne, setMyLittleOne] = useState('');
  const [selectedColor, setSelectedColor] = useState(PALETTE[0].value);
  
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);

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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!myName.trim() || !myLittleOne.trim()) return;
    requestAccess(myName.trim(), myLittleOne.trim(), selectedColor);
  };

  const handleRetry = () => {
    setLobbyStatus('initial');
  };

  return (
    <div className="lobby-backdrop">
      <div 
        className="lobby-svg-container" 
        ref={containerRef}
        style={{ '--lobby-scale': scale }}
      >
        <img src="/assets/Lobby.svg" className="lobby-svg-img" alt="Lobby Background" />

        {lobbyStatus === 'initial' && (
          <form onSubmit={handleSubmit}>
            {/* Input 1: My Name (Adult) */}
            <input 
              type="text" 
              className="lobby-overlay-input-1"
              required 
              placeholder="Enter Adult Name" 
              value={myName}
              onChange={(e) => setMyName(e.target.value.slice(0, 15))}
              maxLength={15}
            />

            {/* Input 2: My Little One (Child) */}
            <input 
              type="text" 
              className="lobby-overlay-input-2"
              required 
              placeholder="Enter Child Name" 
              value={myLittleOne}
              onChange={(e) => setMyLittleOne(e.target.value.slice(0, 15))}
              maxLength={15}
            />

            {/* Color Swatches Grid */}
            <div className="lobby-overlay-colors">
              {PALETTE.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  className={`color-swatch-circle ${selectedColor === color.value ? 'selected' : ''}`}
                  style={{ backgroundColor: color.value, '--glow-color': color.value }}
                  onClick={() => setSelectedColor(color.value)}
                  title={color.name}
                />
              ))}
            </div>

            {/* Request Access Button */}
            <button 
              type="submit" 
              className="lobby-overlay-btn"
              disabled={!myName.trim() || !myLittleOne.trim()}
            >
              Request Access
            </button>
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
