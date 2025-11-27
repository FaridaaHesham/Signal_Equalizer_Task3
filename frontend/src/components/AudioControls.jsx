import React, { useRef, useState, useEffect } from 'react';
import './AudioControls.css';

const AudioControls = ({ inputSignal, outputSignal, sampleRate }) => {
  // Add proper validation with default values
  const safeInputSignal = inputSignal || [];
  const safeOutputSignal = outputSignal || [];
  const safeSampleRate = sampleRate || 44100;
  
  const audioContextRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentSignal, setCurrentSignal] = useState(null);
  const animationRef = useRef(null);

  // Calculate duration when signals change
  useEffect(() => {
    if (safeInputSignal.length > 0) {
      setDuration(safeInputSignal.length / safeSampleRate);
    }
  }, [safeInputSignal, safeSampleRate]);

  const playSignal = async (signal, signalType) => {
    if (!signal || !signal.length) {
      console.error('No signal to play');
      return;
    }

    // Stop any currently playing audio
    stopAudio();

    try {
      // Create or reuse AudioContext
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;
      
      // Resume context if it's suspended (browser autoplay policy)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const buffer = audioContext.createBuffer(1, signal.length, safeSampleRate);
      const channelData = buffer.getChannelData(0);
      
      // Copy signal to audio buffer
      for (let i = 0; i < signal.length; i++) {
        channelData[i] = signal[i];
      }

      // Create and play source
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      
      // Set up playback tracking
      const startTime = audioContext.currentTime;
      setCurrentSignal(signalType);
      setIsPlaying(true);
      setCurrentTime(0);

      // Animation loop for real-time playback visualization
      const animate = () => {
        const elapsed = audioContext.currentTime - startTime;
        setCurrentTime(elapsed);
        
        if (elapsed < duration && isPlaying) {
          animationRef.current = requestAnimationFrame(animate);
        } else if (elapsed >= duration) {
          setIsPlaying(false);
          setCurrentTime(0);
          setCurrentSignal(null);
        }
      };

      // Set up event listeners
      source.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        setCurrentSignal(null);
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
      
      source.start();
      animate();
      
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
      setCurrentSignal(null);
    }
  };

  const stopAudio = () => {
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setCurrentSignal(null);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="audio-controls">
      <h3>Audio Playback</h3>
      <div className="audio-status">
        Status: <span className={isPlaying ? 'status-playing' : 'status-stopped'}>
          {isPlaying ? `PLAYING ${currentSignal?.toUpperCase()}` : 'STOPPED'}
        </span>
      </div>
      
      {/* Playback Progress */}
      <div className="playback-progress">
        <div className="time-display">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>
      </div>

      <div className="audio-buttons">
        <button 
          onClick={() => playSignal(safeInputSignal, 'input')} 
          disabled={!safeInputSignal.length || isPlaying}
          className="btn btn-audio btn-input"
        >
          Play Input
        </button>
        <button 
          onClick={() => playSignal(safeOutputSignal, 'output')} 
          disabled={!safeOutputSignal.length || isPlaying}
          className="btn btn-audio btn-output"
        >
          Play Output
        </button>
        <button 
          onClick={stopAudio}
          disabled={!isPlaying}
          className="btn btn-audio btn-stop"
        >
          Stop
        </button>
      </div>

      {/* Real-time Waveform Visualization */}
      <div className="playback-waveform">
        <h4>Now Playing: {currentSignal ? `${currentSignal.toUpperCase()} Signal` : 'None'}</h4>
        <div className="waveform-container">
          {currentSignal && (
            <WaveformVisualizer 
              signal={currentSignal === 'input' ? safeInputSignal : safeOutputSignal}
              currentTime={currentTime}
              duration={duration}
              sampleRate={safeSampleRate}
              isPlaying={isPlaying}
            />
          )}
        </div>
      </div>

      <div className="audio-info">
        <p>Sample Rate: {safeSampleRate} Hz</p>
        <p>Duration: {duration.toFixed(2)}s</p>
        <p>Input Samples: {safeInputSignal.length}</p>
        <p>Output Samples: {safeOutputSignal.length}</p>
      </div>
    </div>
  );
};

// New Component for Real-time Waveform Visualization
const WaveformVisualizer = ({ signal, currentTime, duration, sampleRate, isPlaying }) => {
  const canvasRef = useRef(null);
  const [windowSize, setWindowSize] = useState(1024); // Samples to show

  useEffect(() => {
    if (!canvasRef.current || !signal || !signal.length) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate current position in samples
    const currentSample = Math.floor(currentTime * sampleRate);
    const startSample = Math.max(0, currentSample - windowSize / 2);
    const endSample = Math.min(signal.length, startSample + windowSize);
    
    // Draw background
    ctx.fillStyle = '#2C3E50';
    ctx.fillRect(0, 0, width, height);

    // Draw waveform
    ctx.strokeStyle = isPlaying ? '#3498DB' : '#7F8C8D';
    ctx.lineWidth = 2;
    ctx.beginPath();

    const samplesToShow = endSample - startSample;
    
    for (let i = 0; i < width; i++) {
      const sampleIndex = startSample + Math.floor((i / width) * samplesToShow);
      if (sampleIndex >= signal.length) break;
      
      const x = i;
      const y = (1 - (signal[sampleIndex] + 1) / 2) * height; // Convert -1 to 1 range to 0 to height
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    
    ctx.stroke();

    // Draw playhead (current position)
    if (duration > 0) {
      const playheadX = (currentTime / duration) * width;
      ctx.strokeStyle = '#E74C3C';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();

      // Draw time indicator
      ctx.fillStyle = '#ECF0F1';
      ctx.font = '12px Arial';
      ctx.fillText(formatTime(currentTime), playheadX + 5, 15);
    }

  }, [signal, currentTime, duration, sampleRate, isPlaying, windowSize]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${mins}:${secs.padStart(4, '0')}`;
  };

  return (
    <div className="real-time-waveform">
      <canvas
        ref={canvasRef}
        width={400}
        height={120}
      />
      <div className="waveform-controls">
        <label>Zoom: </label>
        <select 
          value={windowSize} 
          onChange={(e) => setWindowSize(Number(e.target.value))}
        >
          <option value={512}>512 samples</option>
          <option value={1024}>1024 samples</option>
          <option value={2048}>2048 samples</option>
          <option value={4096}>4096 samples</option>
        </select>
      </div>
    </div>
  );
};

export default AudioControls;