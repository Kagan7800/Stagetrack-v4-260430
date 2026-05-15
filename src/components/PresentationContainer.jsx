import React, { useRef, useState, useEffect } from 'react';
import Draggable from 'react-draggable';
import { X } from 'lucide-react';
import { playSynthSound } from '../utils/audioSynth';

export default function PresentationContainer({ 
  isDoodling, 
  stickersOnCanvas, 
  mediaUrl, 
  mediaType,
  onClearMedia
}) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [context, setContext] = useState(null);

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      const ctx = canvas.getContext('2d');
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#ec4899';
      setContext(ctx);
    }
  }, []);

  const startDrawing = (e) => {
    if (!isDoodling || !context) return;
    const { offsetX, offsetY } = e.nativeEvent;
    context.beginPath();
    context.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing || !isDoodling || !context) return;
    const { offsetX, offsetY } = e.nativeEvent;
    context.lineTo(offsetX, offsetY);
    context.stroke();
  };

  const stopDrawing = () => {
    if (!isDoodling || !context) return;
    context.closePath();
    setIsDrawing(false);
  };

  const handleStickerClick = (stickerName) => {
    const name = stickerName.toLowerCase();
    if (name.includes('piano')) playSynthSound('piano');
    else if (name.includes('trumpet')) playSynthSound('trumpet');
    else if (name.includes('drum')) playSynthSound('drums');
    else if (name.includes('guitar')) playSynthSound('guitar');
    else if (name.includes('xylophone')) playSynthSound('xylophone');
    else playSynthSound('default');
  };

  return (
    <div className="pc-canvas-area">
      {/* Media Layer */}
      {mediaUrl && (
        <div className="media-container">
          <button className="close-media-btn" onClick={onClearMedia}>
            <X size={20} />
          </button>
          {mediaType === 'video' ? (
            <video src={mediaUrl} controls autoPlay />
          ) : (
            <img src={mediaUrl} alt="Uploaded Media" />
          )}
        </div>
      )}

      {/* Drawing Canvas Layer */}
      <canvas
        ref={canvasRef}
        className={`doodle-canvas ${isDoodling ? 'active' : ''}`}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseOut={stopDrawing}
      />

      {/* Stickers Layer */}
      {stickersOnCanvas.map((sticker) => (
        <Draggable key={sticker.id} disabled={isDoodling} bounds="parent">
          <div 
            className="canvas-sticker"
            onDoubleClick={() => handleStickerClick(sticker.name)}
          >
            <img src={`/assets/svg_stickers/${sticker.name}`} alt={sticker.name} style={{ width: '100%', height: '100%', pointerEvents: 'none' }} />
          </div>
        </Draggable>
      ))}
    </div>
  );
}
