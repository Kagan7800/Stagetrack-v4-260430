import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Loader2, ShieldAlert, Sparkles } from 'lucide-react';

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
      <div className="lobby-card glass-panel">
        
        {/* Banner Logo */}
        <div className="lobby-logo-wrapper">
          <div className="lobby-brand">
            <img src="/greenStagetrack_studio.png" alt="Stagetrack Studio" className="lobby-brand-img" />
            <img src="/new_logo.png" alt="Music Fun" className="lobby-main-logo" />
          </div>
        </div>

        {lobbyStatus === 'initial' && (
          <form onSubmit={handleSubmit} className="lobby-form">
            <h2>Welcome to the Studio <Sparkles className="lobby-icon-sparkle" size={20} /></h2>
            <p className="lobby-subtitle">Please enter details and select a color to request session entry.</p>

            <div className="lobby-inputs">
              <label>
                My Name (Adult)
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Sarah Smith" 
                  value={myName}
                  onChange={(e) => setMyName(e.target.value.slice(0, 18))}
                  maxLength={18}
                />
              </label>

              <label>
                My Little One (Child)
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Leo" 
                  value={myLittleOne}
                  onChange={(e) => setMyLittleOne(e.target.value.slice(0, 18))}
                  maxLength={18}
                />
              </label>
            </div>

            <div className="lobby-color-section">
              <span className="color-label">Pick Your Avatar Color:</span>
              <div className="lobby-color-grid">
                {PALETTE.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={`color-swatch ${selectedColor === color.value ? 'selected' : ''}`}
                    style={{ backgroundColor: color.value, '--glow-color': color.value }}
                    onClick={() => setSelectedColor(color.value)}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            <button 
              type="submit" 
              className="lobby-enter-btn" 
              disabled={!myName.trim() || !myLittleOne.trim()}
            >
              Request Access
            </button>
          </form>
        )}

        {lobbyStatus === 'waiting' && (
          <div className="lobby-status-view waiting">
            <Loader2 className="lobby-spinner" size={64} />
            <h3>Waiting for Instructor approval...</h3>
            <p>Your request has been submitted. The instructor will grant you access shortly.</p>
          </div>
        )}

        {lobbyStatus === 'denied' && (
          <div className="lobby-status-view denied">
            <ShieldAlert className="lobby-error-icon" size={64} />
            <h3>Access is not available now</h3>
            <p className="denied-instructions">Please contact Admin.</p>
            <button type="button" onClick={handleRetry} className="lobby-retry-btn">
              Try Again
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
