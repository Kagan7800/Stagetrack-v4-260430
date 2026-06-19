import { useRef, useState, useEffect, useCallback } from 'react';
import { Eraser, Undo2, Redo2, Trash2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { syncWheelBeatToFirebase } from '../firebase';

const isRhythmWheelActivity = (url) => {
  return url && url.includes('1,2,3,4_wheel');
};

export function CentralStageDeck({ mediaUrl, onClick }) {
  return (
    <div 
      className="central-stage-deck" 
      onClick={onClick}
      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div className="central-stage-inner" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%', maxWidth: 'none', gap: 0 }}>
        {/* Centered wheel frame */}
        <div className="central-stage-column" style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <iframe 
            src={mediaUrl} 
            title="Rhythm Wheel"
            style={{ 
              height: '100%', 
              aspectRatio: '1 / 1', 
              maxWidth: '100%', 
              maxHeight: '100%', 
              border: 'none', 
              background: 'transparent',
              overflow: 'visible'
            }}
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
  const { drawingPaths, setDrawingPaths, mediaType: globalMediaType, sessionId, rhythmBeat } = useAppContext();
  const mediaType = propMediaType || globalMediaType;

  const displayUrl = mediaUrl || '/assets/MF_images/Music_Fun_with_my_Little_One.jpg';
  const displayType = mediaUrl ? mediaType : (mediaType === 'metronome' ? 'metronome' : 'image');

  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [redoStack, setRedoStack] = useState([]);
  const [brushSize, setBrushSize] = useState(4);

  const [selectedColor, setSelectedColor] = useState('#ec4899');
  const selectedColorRef = useRef('#ec4899');
  const currentPathRef = useRef(null);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && event.data.type === 'RHYTHM_UPDATE') {
        // Sync to Firebase if we are the instructor client
        const isInstructorClient = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('stagetrack_role') !== 'student' : true;
        if (isInstructorClient && sessionId) {
          syncWheelBeatToFirebase(event.data.currentStep, sessionId);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [sessionId]);

  // Student Sync: Snap iframe step when Firestore updates
  useEffect(() => {
    const isStudent = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('stagetrack_role') === 'student' : false;
    if (isStudent && rhythmBeat !== undefined) {
      const iframe = document.querySelector('.media-container iframe');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'SET_STEP', step: rhythmBeat }, '*');
      }
    }
  }, [rhythmBeat]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' || e.key === ' ' || e.keyCode === 32) {
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
        
        if (displayUrl && (displayUrl.includes('1,2,3,4_click.html') || displayUrl.includes('mode=spacebar'))) {
          e.preventDefault();
          const iframe = document.querySelector('.media-container iframe');
          if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({ type: 'ADVANCE_STEP' }, '*');
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [displayUrl]);

  const handleDeckClick = () => {
    if (isDoodling) return;
    if (displayUrl && (displayUrl.includes('1,2,3,4_click.html') || displayUrl.includes('mode=spacebar'))) {
      const iframe = document.querySelector('.media-container iframe');
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
    <div className="pc-canvas-area" onClick={handleDeckClick}>
      {/* Media Layer */}
      {(displayUrl || displayType === 'metronome') && (
        <div 
          className={`media-container ${displayType === 'video' ? 'video-active' : ''} ${displayType === 'image' ? 'instructor-view-tile' : ''}`}
          style={isRhythmWheelActivity(displayUrl, displayType) ? {
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
            background: 'transparent',
            overflow: 'visible'
          } : displayType === 'iframe' ? { 
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
          } : displayType === 'video' || displayType === 'metronome' ? {
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

          {isRhythmWheelActivity(displayUrl, displayType) ? (
            <CentralStageDeck 
              mediaUrl={displayUrl} 
              onClick={handleDeckClick}
            />
          ) : displayType === 'video' ? (
            <video src={displayUrl} controls autoPlay />
          ) : displayType === 'iframe' ? (
            <iframe 
              src={displayUrl} 
              allowtransparency="true"
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none', background: 'transparent', backgroundColor: 'transparent' }} 
              allowFullScreen 
              loading="eager"
              fetchPriority="high"
            />
          ) : displayType === 'metronome' ? (
            null
          ) : (
            <img 
              src={displayUrl} 
              alt="Uploaded Media" 
            />
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
