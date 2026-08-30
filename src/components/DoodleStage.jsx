// src/components/DoodleStage.jsx
// Complete Doodle Time Canvas, Toolbar, and Live Sync Class Gallery

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import PermissionHeader from './PermissionHeader';
import './DoodleStage.css';

const COLORS = ['#E0546B', '#F2994A', '#F2D94E', '#2FA6A0', '#1E8ED2', '#8E6BC4'];
const STAMPS = ['⭐', '🎵', '🥁', '🌈', '🎉', '❤️'];
const BRUSH_SIZE = 20;
const ERASER_SIZE = 46;
const BG_COLOR = '#FFF9EF';

export default function DoodleStage() {
  const { 
    setIsDoodling, 
    doodleGallery, 
    handleShareDoodleToClass,
    isInstructorVerified
  } = useAppContext();

  const isInstructorClient = isInstructorVerified;

  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const isDrawingRef = useRef(false);

  const [currentColor, setCurrentColor] = useState(COLORS[0]);
  const [currentMode, setCurrentMode] = useState('brush'); // 'brush' | 'eraser' | 'stamp'
  const [selectedStamp, setSelectedStamp] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? '' : prev));
    }, 2200);
  }, []);

  // Initialize and resize canvas
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const rect = wrap.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    // Create backup of current drawing if already rendered
    let tempCanvas = null;
    if (canvas.width > 0 && canvas.height > 0) {
      tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(canvas, 0, 0);
    }

    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    if (tempCanvas) {
      ctx.drawImage(tempCanvas, 0, 0, rect.width, rect.height);
    } else {
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, rect.width, rect.height);
    }
  }, []);

  useEffect(() => {
    initCanvas();
    const handleResize = () => {
      initCanvas();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [initCanvas]);

  const getCanvasPos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const clientY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCanvasPos(e);

    if (currentMode === 'stamp' && selectedStamp) {
      ctx.font = '48px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(selectedStamp, x, y);
      // Automatically revert to brush mode after placing stamp
      setCurrentMode('brush');
      setSelectedStamp(null);
      return;
    }

    isDrawingRef.current = true;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = currentMode === 'eraser' ? ERASER_SIZE : BRUSH_SIZE;
    ctx.strokeStyle = currentMode === 'eraser' ? BG_COLOR : currentColor;
    // Draw initial dot
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerMove = (e) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCanvasPos(e);

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = (e) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.closePath();
  };

  const handleSelectColor = (color) => {
    setCurrentColor(color);
    setCurrentMode('brush');
    setSelectedStamp(null);
  };

  const handleSelectStamp = (stamp) => {
    setSelectedStamp(stamp);
    setCurrentMode('stamp');
  };

  const handleSelectEraser = () => {
    setCurrentMode('eraser');
    setSelectedStamp(null);
  };

  const handleClearConfirmed = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, rect.width, rect.height);
    setShowClearConfirm(false);
    showToast('Canvas cleared!');
  };

  const handleSavePng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.download = 'my-mfwmlo-doodle.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
    showToast('Doodle saved!');
  };

  const handleShareToGallery = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    await handleShareDoodleToClass(dataUrl);
    showToast('Shared to class gallery!');
  };

  return (
    <div className="doodle-stage-container">
      {/* Main Drawing Column */}
      <div className="doodle-canvas-col">
        {/* Header Banner with shared PermissionHeader */}
        <PermissionHeader
          title="🎨 Doodle Time!"
          subtitle="Grab a color and draw anything you like — Banjo can't wait to see it!"
          isInstructor={isInstructorClient}
          onClose={() => setIsDoodling(false)}
          closeTitle="Close Doodle Time (Instructor Only)"
          className="doodle-banner"
        />

        {/* Canvas Wrap */}
        <div className="doodle-canvas-wrap" ref={wrapRef}>
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            style={{ touchAction: 'none' }}
          />

          {/* Two-Button Confirm Clear Overlay */}
          {showClearConfirm && (
            <div className="doodle-confirm-overlay">
              <p>Clear the whole drawing?</p>
              <div className="doodle-confirm-btns">
                <button
                  type="button"
                  className="doodle-confirm-yes"
                  onClick={handleClearConfirmed}
                >
                  🗑️ Yes, clear it
                </button>
                <button
                  type="button"
                  className="doodle-confirm-no"
                  onClick={() => setShowClearConfirm(false)}
                >
                  ✋ No, keep it
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Toolbar */}
        <div className="doodle-toolbar">
          {/* Swatches */}
          <div className="doodle-swatch-row">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`doodle-swatch ${currentMode === 'brush' && currentColor === c ? 'selected' : ''}`}
                style={{ backgroundColor: c }}
                onClick={() => handleSelectColor(c)}
                title={`Select color ${c}`}
              />
            ))}
          </div>

          <div className="doodle-divider" />

          {/* Stamps */}
          <div className="doodle-stamp-row">
            {STAMPS.map((s) => (
              <button
                key={s}
                type="button"
                className={`doodle-tool-btn ${currentMode === 'stamp' && selectedStamp === s ? 'selected' : ''}`}
                onClick={() => handleSelectStamp(s)}
                title={`Place ${s} stamp`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="doodle-divider" />

          {/* Action Tools */}
          <div className="doodle-action-row">
            <button
              type="button"
              className={`doodle-tool-btn ${currentMode === 'eraser' ? 'selected' : ''}`}
              onClick={handleSelectEraser}
              title="Eraser"
            >
              🧽
            </button>
            <button
              type="button"
              className="doodle-action-btn doodle-btn-clear"
              onClick={() => setShowClearConfirm(true)}
              title="Clear canvas"
            >
              🗑️ Clear
            </button>
            <button
              type="button"
              className="doodle-action-btn doodle-btn-save"
              onClick={handleSavePng}
              title="Download drawing"
            >
              💾 Save
            </button>
            <button
              type="button"
              className="doodle-action-btn doodle-btn-share"
              onClick={handleShareToGallery}
              title="Share drawing with the class"
            >
              📤 Share to Class
            </button>
          </div>
        </div>
      </div>

      {/* Instructor-Only Class Gallery Sidebar */}
      {isInstructorClient && (
        <div className="doodle-gallery-col">
          <div className="doodle-gallery-header">
            🖼️ Class Gallery
          </div>
          <div className="doodle-gallery-grid">
            {(!doodleGallery || doodleGallery.length === 0) ? (
              <div className="doodle-gallery-empty">
                No doodles shared yet — they&apos;ll show up here as families share their drawings!
              </div>
            ) : (
              doodleGallery.slice().reverse().map((item) => (
                <div key={item.id} className="doodle-gallery-item">
                  <img src={item.dataUrl} alt={`${item.name}'s doodle`} />
                  <div className="doodle-gallery-who">{item.name}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Toast popup */}
      {toastMessage && (
        <div className="doodle-toast show">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
