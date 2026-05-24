import { Hand, MicOff, MessageSquare, X, Camera, Sparkles } from 'lucide-react';
import html2canvas from 'html2canvas';
import { useAppContext } from '../context/AppContext';

export default function UnifiedToolbox({ 
  activeGuest, 
  guestButtons, 
  toggleGuestButton, 
  onAddSticker,
  onClose
}) {
  const { setIsChatOpen, setIsSidebarOpen } = useAppContext();

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
    "Balloons 2 2.svg",
    "Boat 2.svg",
    "Dancer 2.svg",
    "Dog 2.svg",
    "Drums 2.svg",
    "Fish 2.svg",
    "Flowers 6.svg",
    "Guitar 2.svg",
    "Kitten 2.svg",
    "Piano 2 3.svg",
    "Sun with sunglasses 2.svg",
    "Truck 2 2.svg",
    "Trumpet 2.svg",
    "Xylophone 2.svg",
    "Confetti.svg"
  ];

  if (!activeGuest) return null;

  const buttons = guestButtons[activeGuest.id] || { raiseHand: false, mute: false, chat: false };

  return (
    <div className="unified-toolbox glass-panel" style={{ height: '100%', width: '100%' }}>
      <div className="toolbox-header">
        <h2>{activeGuest.name}'s Tools</h2>
        <button onClick={onClose} className="close-btn">
          <X size={16} />
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
              className={`gb-btn ${buttons.greenFilter ? 'active' : ''}`}
              onClick={() => toggleGuestButton(activeGuest.id, 'greenFilter')}
            >
              <Sparkles size={18} />
              <span>Green Filter</span>
            </button>
            <button 
              className="gb-btn screenshot-btn"
              onClick={handleScreenshot}
            >
              <Camera size={18} />
              <span>Take a Picture</span>
            </button>
          </div>

          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <h3 className="section-title">Stickers</h3>
            <div className="peo-sticker-grid">
              {guestStickers.map((sticker) => (
                <div 
                  key={sticker} 
                  className="sticker-item" 
                  onClick={() => onAddSticker(activeGuest.id, sticker, false)}
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
    </div>
  );
}

