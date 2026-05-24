import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { Play, Pause, Plus, Minus } from 'lucide-react';

export default function Metronome() {
  const { 
    metronomeBpm, 
    setMetronomeBpm, 
    isMetronomePlaying, 
    setIsMetronomePlaying 
  } = useAppContext();

  const [currentBeat, setCurrentBeat] = useState(-1);
  const audioCtxRef = useRef(null);
  
  // Precise Audio Scheduler variables
  const lookahead = 25.0; // How frequently to call scheduling function (in ms)
  const scheduleAheadTime = 0.1; // How far ahead to schedule audio (in sec)
  const nextNoteTimeRef = useRef(0.0); // When the next note is due
  const beatRef = useRef(0); // Current beat (0 to 3)
  const timerIdRef = useRef(null);

  // Use refs to avoid React closure capture in async scheduler loop
  const bpmRef = useRef(metronomeBpm);
  const isPlayingRef = useRef(isMetronomePlaying);

  useEffect(() => {
    bpmRef.current = Number(metronomeBpm) || 120;
  }, [metronomeBpm]);

  useEffect(() => {
    isPlayingRef.current = isMetronomePlaying;
  }, [isMetronomePlaying]);

  // Audio click synthesizer
  const playClick = useCallback((time, beatNum) => {
    if (!audioCtxRef.current) return;
    const osc = audioCtxRef.current.createOscillator();
    const gainNode = audioCtxRef.current.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(audioCtxRef.current.destination);
    
    // Beat 0 (downbeat) gets a higher pitch
    const pitch = beatNum === 0 ? 1000 : 700;
    osc.frequency.setValueAtTime(pitch, time);
    
    gainNode.gain.setValueAtTime(0.6, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    
    osc.start(time);
    osc.stop(time + 0.06);
  }, []);

  const scheduleNextNote = useCallback(() => {
    const tempo = Number(bpmRef.current) || 120;
    const secondsPerBeat = 60.0 / tempo;
    nextNoteTimeRef.current += secondsPerBeat;
    beatRef.current = (beatRef.current + 1) % 4;
  }, []);

  const scheduler = useCallback(() => {
    if (!audioCtxRef.current) return;
    
    while (nextNoteTimeRef.current < audioCtxRef.current.currentTime + scheduleAheadTime) {
      const scheduledTime = nextNoteTimeRef.current;
      const scheduledBeat = beatRef.current;
      
      playClick(scheduledTime, scheduledBeat);
      
      // Update UI beat in sync with sound
      const delayMs = Math.max(0, (scheduledTime - audioCtxRef.current.currentTime) * 1000);
      setTimeout(() => {
        if (isPlayingRef.current) {
          setCurrentBeat(scheduledBeat);
        }
      }, delayMs);

      scheduleNextNote();
    }
  }, [playClick, scheduleNextNote]);

  useEffect(() => {
    if (isMetronomePlaying) {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      
      nextNoteTimeRef.current = audioCtxRef.current.currentTime;
      beatRef.current = 0;
      setTimeout(() => {
        if (isPlayingRef.current) {
          setCurrentBeat(0);
        }
      }, 0);
      
      timerIdRef.current = setInterval(scheduler, lookahead);
    } else {
      if (timerIdRef.current) {
        clearInterval(timerIdRef.current);
      }
      setTimeout(() => {
        if (!isPlayingRef.current) {
          setCurrentBeat(-1);
        }
      }, 0);
    }

    return () => {
      if (timerIdRef.current) {
        clearInterval(timerIdRef.current);
      }
    };
  }, [isMetronomePlaying, scheduler]);

  // Tap Tempo calculation
  const tapTimesRef = useRef([]);
  const handleTapTempo = () => {
    const now = performance.now();
    const tapTimes = tapTimesRef.current;
    tapTimes.push(now);
    
    if (tapTimes.length > 4) {
      tapTimes.shift();
    }
    
    if (tapTimes.length >= 2) {
      const intervals = [];
      for (let i = 1; i < tapTimes.length; i++) {
        intervals.push(tapTimes[i] - tapTimes[i-1]);
      }
      const avgIntervalMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.round(60000 / avgIntervalMs);
      
      if (calculatedBpm >= 40 && calculatedBpm <= 240) {
        setMetronomeBpm(calculatedBpm);
      }
    }
  };

  return (
    <div className="metronome-container glass-panel">
      <div className="metronome-visual-area">
        {/* Pulsing beat dots */}
        <div className="beat-indicators">
          {[0, 1, 2, 3].map((b) => (
            <div 
              key={b} 
              className={`beat-dot ${currentBeat === b ? 'active' : ''} ${b === 0 ? 'downbeat' : ''}`}
            >
              {b + 1}
            </div>
          ))}
        </div>

        {/* Pendulum swing visual */}
        <div className="pendulum-track">
          <div 
            className={`pendulum-arm ${isMetronomePlaying ? 'swinging' : ''}`}
            style={{ 
              animationDuration: `${60 / (Number(metronomeBpm) || 120)}s` 
            }}
          />
        </div>
      </div>

      <div className="metronome-info-card">
        <span className="metronome-title">NATIVE METRONOME</span>
        <div className="metronome-bpm-display" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="bpm-number">{metronomeBpm || 120}</span>
            <span className="bpm-label">BPM</span>
          </div>
          <div style={{ width: '2px', height: '40px', background: 'rgba(255,255,255,0.1)' }}></div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span className="bpm-number" style={{ color: currentBeat === 0 ? '#22c55e' : currentBeat > 0 ? '#3b82f6' : '#64748b' }}>
              {currentBeat >= 0 ? currentBeat + 1 : '-'}
            </span>
            <span className="bpm-label">BEAT</span>
          </div>
        </div>
      </div>

      <div className="metronome-controls">
        <button 
          className="metronome-btn play-pause-btn"
          onClick={() => setIsMetronomePlaying(!isMetronomePlaying)}
          title={isMetronomePlaying ? 'Pause metronome' : 'Start metronome'}
        >
          {isMetronomePlaying ? <Pause size={24} /> : <Play size={24} />}
        </button>

        <div className="metronome-speed-adjusters">
          <button 
            className="speed-btn"
            onClick={() => setMetronomeBpm(Math.max(40, metronomeBpm - 1))}
            title="Decrease tempo by 1 BPM"
          >
            <Minus size={16} />
          </button>
          <input 
            type="range"
            min="40"
            max="240"
            value={metronomeBpm}
            onChange={(e) => setMetronomeBpm(parseInt(e.target.value, 10))}
            className="bpm-slider"
          />
          <button 
            className="speed-btn"
            onClick={() => setMetronomeBpm(Math.min(240, metronomeBpm + 1))}
            title="Increase tempo by 1 BPM"
          >
            <Plus size={16} />
          </button>
        </div>

        <button 
          className="metronome-btn tap-btn"
          onClick={handleTapTempo}
          title="Tap beat to set BPM"
        >
          TAP TEMPO
        </button>
      </div>
    </div>
  );
}
