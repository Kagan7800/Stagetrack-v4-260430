import { useEffect, useRef, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';

export default function Metronome() {
  const { 
    metronomeBpm, 
    isMetronomePlaying,
    setIsMetronomePlaying
  } = useAppContext();

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
      
      timerIdRef.current = setInterval(scheduler, lookahead);
    } else {
      if (timerIdRef.current) {
        clearInterval(timerIdRef.current);
      }
    }

    return () => {
      if (timerIdRef.current) {
        clearInterval(timerIdRef.current);
      }
    };
  }, [isMetronomePlaying, scheduler]);

  return (
    <div 
      onClick={() => setIsMetronomePlaying(!isMetronomePlaying)}
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 20, cursor: 'pointer' }}
    >
      <iframe 
        src="https://www.figma.com/proto/jiqvv9jZCykXIhtfocAbBO/Metronome?node-id=2-42&embed-host=share&hide-ui=1&hide-controls=1&hide-toolbar=1&scaling=scale-down-width&content-scaling=fixed&frame=0&margin=0"
        allowTransparency="true"
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none', background: 'transparent', backgroundColor: 'transparent', pointerEvents: 'none' }} 
        allowFullScreen 
        loading="eager"
        fetchpriority="high"
      />
    </div>
  );
}
