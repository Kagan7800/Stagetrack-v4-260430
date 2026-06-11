import { useRef, useState, useEffect, useCallback } from 'react';
import { Eraser, Undo2, Redo2, Trash2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { BanjoMascotState } from './BanjoMascotState';

const isRhythmWheelActivity = (url, type) => {
  return url && url.includes('1,2,3,4');
};

export function CentralStageDeck({ currentBeat, isPlaying, mediaUrl, onClick }) {
  return (
    <div 
      className="central-stage-deck" 
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      <div className="central-stage-inner">
        {/* LEFT COLUMN: Banjo Mascot */}
        <div className="central-stage-column">
          <BanjoMascotState currentBeat={currentBeat} isPlaying={isPlaying} style={{ marginRight: 0 }} />
        </div>

        {/* RIGHT COLUMN: The Pure Instrument Frame */}
        <div className="central-stage-column">
          <iframe 
            src={mediaUrl} 
            title="Rhythm Wheel"
            style={{ width: '45vmin', height: '45vmin', border: 'none', background: 'transparent' }}
            allowtransparency="true"
          />
        </div>
      </div>
    </div>
  );
}

export default function PresentationContainer({ 
  isDoodling, 
  mediaUrl, 
  mediaType: propMediaType
}) {
  const { drawingPaths, setDrawingPaths, mediaType: globalMediaType } = useAppContext();
  const mediaType = propMediaType || globalMediaType;

  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [redoStack, setRedoStack] = useState([]);
  const [brushSize, setBrushSize] = useState(4);

  const [selectedColor, setSelectedColor] = useState('#ec4899');
  const selectedColorRef = useRef('#ec4899');
  const currentPathRef = useRef(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && event.data.type === 'RHYTHM_UPDATE') {
        setCurrentStep(event.data.currentStep);
        setIsRunning(event.data.isRunning);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' || e.key === ' ' || e.keyCode === 32) {
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
        
        if (mediaUrl && mediaUrl.includes('1,2,3,4_click.html')) {
          e.preventDefault();
          const iframe = document.querySelector('.central-stage-deck iframe');
          if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({ type: 'ADVANCE_STEP' }, '*');
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mediaUrl]);

  const handleDeckClick = () => {
    if (mediaUrl && mediaUrl.includes('1,2,3,4_click.html')) {
      const iframe = document.querySelector('.central-stage-deck iframe');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'ADVANCE_STEP' }, '*');
      }
    }
  };

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
        contextRef.current.lineWidth = brushSize * 3;
      } else {
        contextRef.current.globalCompositeOperation = 'source-over';
        contextRef.current.strokeStyle = color;
        contextRef.current.lineWidth = brushSize;
      }
    }
  };

  const redrawCanvas = useCallback(() => {
    if (!canvasRef.current || !contextRef.current) return;
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawingPaths.forEach(path => {
      if (!path.points || path.points.length === 0) return;
      ctx.beginPath();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      if (path.color === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = path.width || 12;
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = path.color;
        ctx.lineWidth = path.width || 4;
      }
      
      const start = path.points[0];
      ctx.moveTo(start.x * canvas.width, start.y * canvas.height);
      for (let i = 1; i < path.points.length; i++) {
        const pt = path.points[i];
        ctx.lineTo(pt.x * canvas.width, pt.y * canvas.height);
      }
      ctx.stroke();
    });
    
    // Restore current settings
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (selectedColorRef.current === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = brushSize * 3;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = selectedColorRef.current;
      ctx.lineWidth = brushSize;
    }
  }, [drawingPaths, brushSize]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    contextRef.current = ctx;

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      redrawCanvas();
    };

    const observer = new ResizeObserver(() => {
      resizeCanvas();
    });

    observer.observe(canvas.parentElement);
    resizeCanvas(); // initial

    return () => observer.disconnect();
  }, [redrawCanvas]);

  const startDrawing = (e) => {
    if (!isDoodling || !contextRef.current || !canvasRef.current) return;
    const { offsetX, offsetY } = e.nativeEvent;
    const canvas = canvasRef.current;
    
    const ctx = contextRef.current;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (selectedColorRef.current === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = brushSize * 3;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = selectedColorRef.current;
      ctx.lineWidth = brushSize;
    }
    
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
    
    const xRatio = canvas.width > 0 ? offsetX / canvas.width : 0;
    const yRatio = canvas.height > 0 ? offsetY / canvas.height : 0;
    
    currentPathRef.current = {
      points: [{ x: xRatio, y: yRatio }],
      color: selectedColorRef.current,
      width: selectedColorRef.current === 'eraser' ? brushSize * 3 : brushSize
    };
    
    setIsDrawing(true);
    setRedoStack([]); // Clear redo stack on new drawing path
  };

  const draw = (e) => {
    if (!isDrawing || !isDoodling || !contextRef.current || !canvasRef.current) return;
    const { offsetX, offsetY } = e.nativeEvent;
    const canvas = canvasRef.current;
    
    contextRef.current.lineTo(offsetX, offsetY);
    contextRef.current.stroke();
    
    const xRatio = canvas.width > 0 ? offsetX / canvas.width : 0;
    const yRatio = canvas.height > 0 ? offsetY / canvas.height : 0;
    
    if (currentPathRef.current) {
      currentPathRef.current.points.push({ x: xRatio, y: yRatio });
    }
  };

  const stopDrawing = () => {
    if (!isDoodling || !contextRef.current) return;
    contextRef.current.closePath();
    setIsDrawing(false);
    
    if (currentPathRef.current && currentPathRef.current.points.length > 1) {
      setDrawingPaths(prev => [...prev, currentPathRef.current]);
    }
    currentPathRef.current = null;
  };

  const handleUndo = () => {
    if (drawingPaths.length === 0) return;
    const nextPaths = [...drawingPaths];
    const undone = nextPaths.pop();
    setRedoStack(prev => [...prev, undone]);
    setDrawingPaths(nextPaths);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const nextRedo = [...redoStack];
    const redone = nextRedo.pop();
    setRedoStack(nextRedo);
    setDrawingPaths(prev => [...prev, redone]);
  };

  const handleClear = () => {
    setDrawingPaths([]);
    setRedoStack([]);
  };

  return (
    <div className="pc-canvas-area">
      {/* Media Layer */}
      {(mediaUrl || mediaType === 'metronome') && (
        <div 
          className={`media-container ${mediaType === 'video' ? 'video-active' : ''}`}
          style={isRhythmWheelActivity(mediaUrl, mediaType) ? {
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
            zIndex: 20,
            background: 'transparent'
          } : mediaType === 'iframe' ? { 
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
          } : mediaType === 'video' || mediaType === 'metronome' ? {
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

          {isRhythmWheelActivity(mediaUrl, mediaType) ? (
            <CentralStageDeck 
              currentBeat={currentStep} 
              isPlaying={isRunning} 
              mediaUrl={mediaUrl} 
              onClick={handleDeckClick}
            />
          ) : mediaType === 'video' ? (
            <video src={mediaUrl} controls autoPlay />
          ) : mediaType === 'iframe' ? (
            <iframe 
              src={mediaUrl} 
              allowtransparency="true"
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none', background: 'transparent', backgroundColor: 'transparent' }} 
              allowFullScreen 
              loading="eager"
              fetchPriority="high"
            />
          ) : mediaType === 'metronome' ? (
            null
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

          {/* Divider */}
          <div className="picker-divider"></div>

          {/* Brush Size Slider */}
          <div className="brush-slider-wrapper" title={`Brush Size: ${brushSize}px`}>
            <input 
              type="range"
              min="2"
              max="20"
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value, 10))}
              className="brush-slider"
            />
            <span className="brush-size-text">{brushSize}px</span>
          </div>

          {/* Divider */}
          <div className="picker-divider"></div>

          {/* Undo, Redo, and Clear Buttons */}
          <button 
            onClick={handleUndo} 
            disabled={drawingPaths.length === 0} 
            className="doodle-action-btn"
            title="Undo"
          >
            <Undo2 size={14} />
          </button>
          
          <button 
            onClick={handleRedo} 
            disabled={redoStack.length === 0} 
            className="doodle-action-btn"
            title="Redo"
          >
            <Redo2 size={14} />
          </button>
          
          <button 
            onClick={handleClear} 
            disabled={drawingPaths.length === 0 && redoStack.length === 0} 
            className="doodle-action-btn clear-btn"
            title="Clear Canvas"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
