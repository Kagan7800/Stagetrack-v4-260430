import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Hand, MicOff, MessageSquare, X, Camera, Sparkles, Smile, Trash2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { useAppContext } from '../context/AppContext';

export default function UnifiedToolbox({ 
  activeGuest, 
  guestButtons, 
  toggleGuestButton, 
  onAddSticker,
  onClose
}) {
  const { setIsChatOpen, setIsSidebarOpen, activeTheme } = useAppContext();
  const isInstructorClient = sessionStorage.getItem('stagetrack_role') !== 'student';

  const isSor = activeTheme === 'sor';
  const themeTextColor = isSor ? '#ef4444' : '#3b82f6';
  const themeSubtextColor = isSor ? 'rgba(239, 68, 68, 0.7)' : 'rgba(59, 130, 246, 0.7)';
  const themeTextShadow = isSor ? '0 0 8px rgba(239, 68, 68, 0.18)' : '0 0 8px rgba(59, 130, 246, 0.18)';
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showFilterPicker, setShowFilterPicker] = useState(false);
  const timerRef = useRef(null);
  const filterTimerRef = useRef(null);

  const resetInactivityTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setShowStickerPicker(false);
    }, 20000);
  }, []);

  const resetFilterInactivityTimer = useCallback(() => {
    if (filterTimerRef.current) clearTimeout(filterTimerRef.current);
    filterTimerRef.current = setTimeout(() => {
      setShowFilterPicker(false);
    }, 20000);
  }, []);

  useEffect(() => {
    if (showStickerPicker) {
      resetInactivityTimer();
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [showStickerPicker, resetInactivityTimer]);

  useEffect(() => {
    if (showFilterPicker) {
      resetFilterInactivityTimer();
    } else {
      if (filterTimerRef.current) clearTimeout(filterTimerRef.current);
    }
    return () => {
      if (filterTimerRef.current) clearTimeout(filterTimerRef.current);
    };
  }, [showFilterPicker, resetFilterInactivityTimer]);

  const handleScreenshot = () => {
    const target = document.querySelector('.app-container');
    if (!target) return;

    // Select the panels to hide immediately on the screen before the picture is taken
    const toolbox = document.querySelector('.toolbox-panel');
    const chatSidebar = document.querySelector('.right-sidebar');
    const itoSidebar = document.querySelector('.instructor-left-sidebar');
    const closeMedia = document.querySelector('.close-media-btn');
    
    if (toolbox) toolbox.style.display = 'none';
    if (chatSidebar) chatSidebar.style.display = 'none';
    if (itoSidebar) itoSidebar.style.display = 'none';
    if (closeMedia) closeMedia.style.display = 'none';

    setTimeout(() => {
      html2canvas(target, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#090d16',
        scale: 2
      }).then((canvas) => {
        // Restore DOM styles in case of re-render/cleanup
        if (toolbox) toolbox.style.display = '';
        if (chatSidebar) chatSidebar.style.display = '';
        if (itoSidebar) itoSidebar.style.display = '';
        if (closeMedia) closeMedia.style.display = '';

        // Close them on their screen permanently
        onClose(); // Closes STO
        setIsChatOpen(false); // Closes chat
        setIsSidebarOpen(false); // Closes ITO

        const image = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `screenshot-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
        link.href = image;
        link.click();
      }).catch((err) => {
        console.error("Screenshot failed:", err);
        if (toolbox) toolbox.style.display = '';
        if (chatSidebar) chatSidebar.style.display = '';
        if (itoSidebar) itoSidebar.style.display = '';
        if (closeMedia) closeMedia.style.display = '';
      });
    }, 50);
  };

  const guestStickers = [
    "Balloons.svg",
    "Boat.svg",
    "Dancer.svg",
    "Dog.svg",
    "Fish.svg",
    "Flowers 6.svg",
    "Kitten.svg",
    "Piano.svg",
    "Sun with sunglasses.svg",
    "Truck.svg",
    "Xylophone.svg",
    "Confetti.svg"
  ];

  const specialStickers = [
    "Drums.svg",
    "Guitar.svg",
    "Microphone.svg",
    "Trumpet.svg"
  ];

  if (!activeGuest) return null;

  const buttons = guestButtons[activeGuest.id] || { raiseHand: false, mute: false, chat: false };

  return (
    <div className="unified-toolbox glass-panel" style={{ height: '100%', width: '100%' }}>
      <div className="toolbox-header" style={{ minHeight: '52px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '12px 16px', position: 'relative' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', textAlign: 'center' }}>
          <span style={{ color: '#ffffff', textShadow: themeTextShadow, fontSize: '1.08rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {activeGuest && !activeGuest.isInstructor ? `${activeGuest.name}'s Tools` : "Student Tools"}
          </span>
          {isInstructorClient && (
            <span style={{ fontSize: '12px', color: '#ffffff', textTransform: 'lowercase', letterSpacing: '-0.02em', fontWeight: 500 }}>
              double-click for ITO
            </span>
          )}
        </div>
        <button onClick={onClose} className="close-btn" style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg 
            width="32" 
            height="32" 
            viewBox="0 0 328 259" 
            style={{ 
              transform: 'rotate(180deg)',
              objectFit: 'contain'
            }}
          >
            <path 
              d="M 154.88 17.14 L 163.26 21.57 L 301.25 123.09 L 311.60 133.94 L 309.63 138.86 L 162.28 241.86 L 158.83 240.88 L 157.35 235.95 L 152.91 234.96 L 150.94 231.51 L 162.28 174.35 L 31.18 188.15 L 24.78 187.65 L 22.81 182.72 L 18.86 181.74 L 16.40 178.29 L 16.89 77.26 L 23.79 75.29 L 163.75 90.07 L 150.94 22.56 L 151.93 18.62 L 154.39 17.63 Z" 
              fill={themeTextColor} 
              stroke="#fbbf24" 
              strokeWidth="20" 
              strokeLinejoin="round" 
              strokeLinecap="round" 
            />
          </svg>
        </button>
      </div>

      <div className="toolbox-content">
        {/* Guest Tools Section */}
        <div className="toolbox-section">
          <div className="gt-buttons-col">
            <button 
              className={`gb-btn ${buttons.raiseHand ? 'active' : ''}`}
              onClick={() => toggleGuestButton(activeGuest.id, 'raiseHand')}
            >
              <Hand size={18} />
              <span>Raise Hand</span>
            </button>
            <button 
              className={`gb-btn ${buttons.mute ? 'active' : ''}`}
              onClick={() => toggleGuestButton(activeGuest.id, 'mute')}
            >
              <MicOff size={18} />
              <span>Mute/Pause</span>
            </button>
            <button 
              className={`gb-btn ${buttons.chat ? 'active' : ''}`}
              onClick={() => toggleGuestButton(activeGuest.id, 'chat')}
            >
              <MessageSquare size={18} />
              <span>Chat</span>
            </button>
            <button 
              className={`gb-btn ${showStickerPicker ? 'active' : ''}`}
              onClick={() => {
                setShowStickerPicker(!showStickerPicker);
                setShowFilterPicker(false);
              }}
            >
              <Smile size={18} />
              <span>Stickers</span>
            </button>
            <button 
              className={`gb-btn ${(showFilterPicker || buttons.greenFilter || buttons.blueFilter || buttons.purpleFilter || buttons.orangeFilter) ? 'active' : ''}`}
              onClick={() => {
                setShowFilterPicker(!showFilterPicker);
                setShowStickerPicker(false);
              }}
            >
              <Sparkles size={18} />
              <span>Filters</span>
            </button>
            <button 
              className="gb-btn screenshot-btn"
              onClick={handleScreenshot}
            >
              <Camera size={18} />
              <span>Take a Picture</span>
            </button>
          </div>

          {showStickerPicker && (
            <div 
              className="sticker-picker-popover" 
              onClick={resetInactivityTimer}
            >
              <div className="sticker-picker-header">
                <h4>Select a Sticker</h4>
                <button 
                  className="sticker-picker-close" 
                  onClick={() => setShowStickerPicker(false)}
                >
                  <X size={16} />
                </button>
              </div>
              
              <div className="sticker-picker-content">
                {/* Unique Box for Special Rewards & Instruments */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  padding: '10px',
                  boxShadow: 'inset 0 0 10px rgba(255, 255, 255, 0.02)'
                }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#ffd700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    ✨ Instruments
                  </div>
                  <div className="peo-sticker-grid">
                    {specialStickers.map((sticker) => (
                      <div 
                        key={sticker} 
                        className="sticker-item" 
                        onClick={() => {
                          onAddSticker(activeGuest.id, sticker, false);
                          resetInactivityTimer();
                        }}
                      >
                        <img 
                          src={`/assets/svg_stickers/${sticker}`} 
                          alt={sticker} 
                          style={
                            sticker.includes('Guitar') || sticker.includes('Drums') || sticker.includes('Trumpet') || sticker.includes('Microphone') 
                              ? { transform: 'scale(1.25)' } 
                              : {}
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Standard Stickers Grid */}
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 'bold', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Stickers
                  </div>
                  <div className="peo-sticker-grid">
                    {guestStickers.map((sticker) => (
                      <div 
                        key={sticker} 
                        className="sticker-item" 
                        onClick={() => {
                          onAddSticker(activeGuest.id, sticker, false);
                          resetInactivityTimer();
                        }}
                      >
                        <img 
                          src={`/assets/svg_stickers/${sticker}`} 
                          alt={sticker} 
                          style={sticker.includes('Guitar') ? { transform: 'scale(1.25)' } : {}}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {showFilterPicker && (
            <div 
              className="sticker-picker-popover" 
              onClick={resetFilterInactivityTimer}
              style={{ bottom: '120px' }} // Adjusted height to stay nicely visible above buttons
            >
              <div className="sticker-picker-header">
                <h4>Select a Filter</h4>
                <button 
                  className="sticker-picker-close" 
                  onClick={() => setShowFilterPicker(false)}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="peo-sticker-grid">
                {[
                  { id: 'greenFilter', name: 'Green Filter', color: '#39ff14', glow: 'rgba(57, 255, 20, 0.5)' },
                  { id: 'blueFilter', name: 'Blue Filter', color: '#00bfff', glow: 'rgba(0, 191, 255, 0.5)' },
                  { id: 'purpleFilter', name: 'Purple Filter', color: '#ba55d3', glow: 'rgba(186, 85, 211, 0.5)' },
                  { id: 'orangeFilter', name: 'Orange Filter', color: '#ff8c00', glow: 'rgba(255, 140, 0, 0.5)' }
                ].map((filter) => {
                  const isActive = buttons[filter.id] || false;
                  return (
                    <div 
                      key={filter.id} 
                      className="sticker-item" 
                      onClick={() => {
                        toggleGuestButton(activeGuest.id, filter.id);
                        resetFilterInactivityTimer();
                      }}
                      style={{
                        background: filter.color,
                        boxShadow: isActive ? `0 0 12px ${filter.color}` : 'none',
                        border: isActive ? '3px solid #ffffff' : '1px solid var(--glass-border)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        aspectRatio: '1',
                        transition: 'all 0.2s ease',
                        boxSizing: 'border-box'
                      }}
                      title={filter.name}
                    >
                      <Sparkles size={18} color="#ffffff" style={{ filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.5))' }} />
                    </div>
                  );
                })}
              </div>
              <button
                className="clear-filters-btn"
                onClick={() => {
                  ['greenFilter', 'blueFilter', 'purpleFilter', 'orangeFilter'].forEach(fId => {
                    if (buttons[fId]) {
                      toggleGuestButton(activeGuest.id, fId);
                    }
                  });
                  resetFilterInactivityTimer();
                }}
              >
                <Trash2 size={14} />
                <span>Remove Filter</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

