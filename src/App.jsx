import React, { useState } from 'react';
import PresentationContainer from './components/PresentationContainer';
import Toolbar from './components/Toolbar';
import Chat from './components/Chat';
import People from './components/People';

function App() {
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [isDoodling, setIsDoodling] = useState(false);
  const [stickersOnCanvas, setStickersOnCanvas] = useState([]);
  const [mediaUrl, setMediaUrl] = useState(null);
  const [mediaType, setMediaType] = useState(null); // 'image' or 'video'

  const handleAddSticker = (stickerName) => {
    setStickersOnCanvas(prev => [
      ...prev, 
      { id: Date.now() + Math.random(), name: stickerName }
    ]);
  };

  const handleMediaUpload = (url, type) => {
    setMediaUrl(url);
    setMediaType(type);
  };

  const handleClearMedia = () => {
    setMediaUrl(null);
    setMediaType(null);
  };

  return (
    <div className="app-container">
      {isHandRaised && (
        <div className="raise-hand-indicator">
          <span style={{ fontSize: '1.2rem' }}>✋</span> Hand Raised
        </div>
      )}

      <div className="pc-wrapper">
        <PresentationContainer 
          isDoodling={isDoodling}
          stickersOnCanvas={stickersOnCanvas}
          mediaUrl={mediaUrl}
          mediaType={mediaType}
          onClearMedia={handleClearMedia}
        />
        <Toolbar 
          isDoodling={isDoodling}
          setIsDoodling={setIsDoodling}
          onAddSticker={handleAddSticker}
          onMediaUpload={handleMediaUpload}
        />
      </div>

      <div className="right-sidebar">
        <People />
        <Chat isHandRaised={isHandRaised} setIsHandRaised={setIsHandRaised} />
      </div>
    </div>
  );
}

export default App;
