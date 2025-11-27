import React, { useState, useRef } from 'react';
import './SoundSeparator.css';

const API_BASE = 'http://localhost:5000/api';

function SoundSeparator({ 
  currentMode, 
  originalSignal,
  sampleRate,
  onSeparatedSignals 
}) {
  const [isSeparating, setIsSeparating] = useState(false);
  const [separatedSignals, setSeparatedSignals] = useState(null);
  const [error, setError] = useState('');
  const [playingSignal, setPlayingSignal] = useState(null); // Track which signal is playing
  const audioContextRef = useRef(null);
  const sourceRef = useRef(null);

  const separateSounds = async () => {
    if (!originalSignal || originalSignal.length === 0) {
      setError('Please load a signal first (upload or generate)');
      return;
    }

    setIsSeparating(true);
    setError('');

    try {
      console.log('Starting sound separation with signal length:', originalSignal.length);
      
      const response = await fetch(`${API_BASE}/separate-sounds-from-signal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signal: originalSignal,
          sample_rate: sampleRate
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        console.log('Sound separation successful:', {
          sound1_length: data.sound1?.length,
          sound2_length: data.sound2?.length,
          sample_rate: data.sample_rate
        });
        
        // Validate the response data
        if (!data.sound1 || !data.sound2) {
          setError('Separation returned incomplete data');
          return;
        }
        
        setSeparatedSignals(data);
      } else {
        setError(data.error || 'Separation failed');
      }
    } catch (error) {
      console.error('Error separating sounds:', error);
      setError(`Error separating sounds: ${error.message}`);
    } finally {
      setIsSeparating(false);
    }
  };

  const playSeparatedSignal = async (signal, signalName, sr) => {
    if (!signal || !signal.length) {
      setError('No signal data to play');
      return;
    }

    // Stop any currently playing audio
    stopAudioPlayback();

    try {
      // Create audio context
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const buffer = audioContextRef.current.createBuffer(1, signal.length, sr);
      const channelData = buffer.getChannelData(0);
      
      // Copy signal data to audio buffer
      for (let i = 0; i < signal.length; i++) {
        channelData[i] = signal[i];
      }

      // Create and play audio source
      sourceRef.current = audioContextRef.current.createBufferSource();
      sourceRef.current.buffer = buffer;
      sourceRef.current.connect(audioContextRef.current.destination);
      
      // Set up event listener for when playback ends
      sourceRef.current.onended = () => {
        setPlayingSignal(null);
        sourceRef.current = null;
      };
      
      sourceRef.current.start();
      setPlayingSignal(signalName);
      
      console.log('Playing separated signal:', signalName, 'length:', signal.length);
    } catch (error) {
      console.error('Error playing separated signal:', error);
      setError(`Playback error: ${error.message}`);
      setPlayingSignal(null);
    }
  };

  const stopAudioPlayback = () => {
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
        sourceRef.current = null;
      } catch (error) {
        console.log('Audio source already stopped');
      }
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setPlayingSignal(null);
  };

  const useSeparatedSignal = (signal, signalName) => {
    console.log('Using separated signal:', { signalName, signalLength: signal?.length });
    
    if (!signal || !signal.length) {
      setError(`No data for ${signalName}`);
      return;
    }

    if (onSeparatedSignals) {
      const timeAxis = Array.from({length: signal.length}, (_, i) => i / sampleRate);
      onSeparatedSignals({
        signal: signal,
        time_axis: timeAxis,
        sample_rate: sampleRate,
        duration: signal.length / sampleRate,
        source: `separated_${signalName}`
      });
    }
  };

  // Show in all specialized modes (Animals, Humans, Instruments)
  const showSeparator = ['animals', 'humans', 'instruments'].includes(currentMode);
  
  if (!showSeparator) {
    return null;
  }

  const hasSignal = originalSignal && originalSignal.length > 0;

  // Get mode-specific description
  const getModeDescription = () => {
    switch(currentMode) {
      case 'animals':
        return 'Separate different animal sounds from mixed audio';
      case 'humans':
        return 'Separate different human voices or speech from mixed audio';
      case 'instruments':
        return 'Separate different musical instruments from mixed audio';
      default:
        return 'Separate mixed sounds using deep learning model';
    }
  };

  const getSignalLabel = (signalNumber) => {
    switch(currentMode) {
      case 'instruments':
        return `Instrument ${signalNumber}`;
      case 'humans':
        return `Voice ${signalNumber}`;
      case 'animals':
        return `Sound ${signalNumber}`;
      default:
        return `Sound ${signalNumber}`;
    }
  };

  return (
    <div className="sound-separator">
      <h4>AI Sound Separation</h4>
      <p>{getModeDescription()}</p>
      
      <div className="separation-info">
        <div className="signal-status">
          Status: {hasSignal ? `Ready (${originalSignal.length} samples)` : 'No signal loaded'}
        </div>
        {hasSignal && (
          <div className="signal-duration">
            Duration: {(originalSignal.length / sampleRate).toFixed(2)}s
          </div>
        )}
      </div>
      
      <button 
        onClick={separateSounds}
        disabled={isSeparating || !hasSignal}
        className="separate-button"
      >
        {isSeparating ? 'Separating Sounds...' : 'Separate Sounds'}
      </button>

      {error && (
        <div className="separator-error">
          {error}
        </div>
      )}

      {separatedSignals && (
        <div className="separated-signals">
          <h5>Separated Sounds:</h5>
          
          <div className="signal-player">
            <div className="signal-control">
              <span>{getSignalLabel(1)}</span>
              <div className="playback-controls">
                <button 
                  onClick={() => playSeparatedSignal(
                    separatedSignals.sound1, 
                    'sound1',
                    separatedSignals.sample_rate
                  )}
                  disabled={playingSignal === 'sound1'}
                  className="play-button"
                >
                  {playingSignal === 'sound1' ? '▶ Playing' : 'Play'}
                </button>
                <button 
                  onClick={stopAudioPlayback}
                  disabled={playingSignal !== 'sound1'}
                  className="stop-button"
                >
                  Stop
                </button>
              </div>
              <div className="signal-length">
                {separatedSignals.sound1.length} samples
              </div>
            </div>
            
            <div className="signal-control">
              <span>{getSignalLabel(2)}</span>
              <div className="playback-controls">
                <button 
                  onClick={() => playSeparatedSignal(
                    separatedSignals.sound2, 
                    'sound2',
                    separatedSignals.sample_rate
                  )}
                  disabled={playingSignal === 'sound2'}
                  className="play-button"
                >
                  {playingSignal === 'sound2' ? '▶ Playing' : 'Play'}
                </button>
                <button 
                  onClick={stopAudioPlayback}
                  disabled={playingSignal !== 'sound2'}
                  className="stop-button"
                >
                  Stop
                </button>
              </div>
              <div className="signal-length">
                {separatedSignals.sound2.length} samples
              </div>
            </div>
          </div>

          <div className="signal-actions">
            <button 
              onClick={() => useSeparatedSignal(separatedSignals.sound1, 'sound1')}
              className="use-signal-button"
            >
              Use {getSignalLabel(1)}
            </button>
            <button 
              onClick={() => useSeparatedSignal(separatedSignals.sound2, 'sound2')}
              className="use-signal-button"
            >
              Use {getSignalLabel(2)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SoundSeparator;