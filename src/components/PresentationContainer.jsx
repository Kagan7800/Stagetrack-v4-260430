import { useRef, useState, useEffect } from 'react';
import { X, Eraser } from 'lucide-react';

export default function PresentationContainer({ 
  isDoodling, 
  mediaUrl, 
  mediaType,
  onClearMedia
}) {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const [selectedColor, setSelectedColor] = useState('#ec4899');
  const selectedColorRef = useRef('#ec4899');

  const popularColors = [
    { name: 'Pink', value: '#ec4899' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Yellow', value: '#eab308' }
  ];

  const handleColorChange = (color) => {
    setSelectedColor(color);
    selectedColorRef.current = color;
    if (contextRef.current) {
      if (color === 'eraser') {
        contextRef.current.globalCompositeOperation = 'destination-out';
        contextRef.current.lineWidth = 16;
      } else {
        contextRef.current.globalCompositeOperation = 'source-over';
        contextRef.current.strokeStyle = color;
        contextRef.current.lineWidth = 4;
      }
    }
  };

  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    contextRef.current = ctx;

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
      ctx.lineCap = 'round';
      if (selectedColorRef.current === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = 16;
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = selectedColorRef.current;
        ctx.lineWidth = 4;
      }
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
    if (!isDoodling || !contextRef.current) return;
    const { offsetX, offsetY } = e.nativeEvent;
    
    if (selectedColorRef.current === 'eraser') {
      contextRef.current.globalCompositeOperation = 'destination-out';
      contextRef.current.lineWidth = 16;
    } else {
      contextRef.current.globalCompositeOperation = 'source-over';
      contextRef.current.strokeStyle = selectedColorRef.current;
      contextRef.current.lineWidth = 4;
    }
    
    contextRef.current.beginPath();
    contextRef.current.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing || !isDoodling || !contextRef.current) return;
    const { offsetX, offsetY } = e.nativeEvent;
    contextRef.current.lineTo(offsetX, offsetY);
    contextRef.current.stroke();
  };

  const stopDrawing = () => {
    if (!isDoodling || !contextRef.current) return;
    contextRef.current.closePath();
    setIsDrawing(false);
  };

  return (
    <div className="pc-canvas-area">
      {/* Media Layer */}
      {mediaUrl && (
        <div 
          className={`media-container ${mediaType === 'video' ? 'video-active' : ''}`}
          style={mediaType === 'iframe' ? { 
            position: 'absolute',
            top: '50%',
            left: 0,
            transform: 'translateY(-50%)',
            width: '100%', 
            height: 0,
            paddingBottom: '56.25%', // 16:9 aspect ratio
            maxWidth: '100%', 
            maxHeight: 'none', 
            borderRadius: 0, 
            zIndex: 20
          } : mediaType === 'video' ? {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            maxWidth: '100%',
            maxHeight: '100%',
            borderRadius: 0,
            zIndex: 20
          } : {}}
        >
          {mediaType !== 'iframe' && (
            <button className="close-media-btn" onClick={onClearMedia}>
              <X size={20} />
            </button>
          )}
          {mediaType === 'video' ? (
            <video src={mediaUrl} controls autoPlay />
          ) : mediaType === 'iframe' ? (
            <iframe 
              src={mediaUrl} 
              allowTransparency="true"
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none', background: 'transparent', backgroundColor: 'transparent' }} 
              allowFullScreen 
              loading="eager"
              fetchpriority="high"
            />
          ) : (
            <img src={mediaUrl} alt="Uploaded Media" />
          )}
        </div>
      )}

      {/* Drawing Canvas Layer */}
      <canvas
        ref={canvasRef}
        className={`doodle-canvas ${isDoodling ? 'active' : ''} ${selectedColor === 'eraser' ? 'eraser-active' : ''}`}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseOut={stopDrawing}
      />

      {/* Doodle Color Picker Overlay */}
      {isDoodling && (
        <div className="doodle-color-picker glass-panel">
          {popularColors.map((color) => (
            <button
              key={color.value}
              className={`color-dot ${selectedColor === color.value ? 'active' : ''}`}
              style={{ backgroundColor: color.value }}
              onClick={() => handleColorChange(color.value)}
              title={color.name}
              aria-label={`Select ${color.name}`}
            />
          ))}
          <button
            className={`eraser-btn ${selectedColor === 'eraser' ? 'active' : ''}`}
            onClick={() => handleColorChange('eraser')}
            title="Eraser"
            aria-label="Select Eraser"
          >
            <Eraser size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
