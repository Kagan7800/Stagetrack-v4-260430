import React, { useRef, useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { playSynthSound } from '../utils/audioSynth';

export default function PresentationContainer({ 
  isDoodling, 
  instructorStickers = [], 
  mediaUrl, 
  mediaType,
  onClearMedia
}) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [context, setContext] = useState(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    setContext(ctx);

    const resizeCanvas = () => {
      // Save current drawing
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      if (canvas.width > 0 && canvas.height > 0) {
        tempCtx.drawImage(canvas, 0, 0);
      }

      // Resize
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;

      // Restore drawing and settings
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#ec4899';
      if (tempCanvas.width > 0 && tempCanvas.height > 0) {
        ctx.drawImage(tempCanvas, 0, 0);
      }
    };

    const observer = new ResizeObserver(() => {
      resizeCanvas();
    });

    observer.observe(canvas.parentElement);
    resizeCanvas(); // initial

    return () => observer.disconnect();
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

      {/* Instructor Stickers Layer (Static border positions) */}
      {instructorStickers.map((sticker) => (
        <img 
          key={sticker.id}
          src={`/assets/svg_stickers/${sticker.name}`} 
          alt={sticker.name} 
          className={`ic-sticker pos-${sticker.position}`}
          onDoubleClick={() => handleStickerClick(sticker.name)}
        />
      ))}
    </div>
  );
}
