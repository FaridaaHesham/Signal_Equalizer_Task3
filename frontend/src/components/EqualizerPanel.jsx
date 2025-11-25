import React from 'react';
import './EqualizerPanel.css';

const EqualizerPanel = ({ 
  frequencyBands, 
  onBandsChange, 
  onSave, 
  onLoad, 
  onGenerateSignal,
  onReset,
  isProcessing,
  frequencyResponse,
  onCustomizeSignal,
  onFileUpload
}) => {

  const addBand = () => {
    const maxFreq = frequencyBands.length > 0 
      ? Math.max(...frequencyBands.map(band => band.high_freq))
      : 20;
    const newHighFreq = Math.min(maxFreq * 1.5, 20000);
    
    const newBand = {
      id: Date.now(),
      low_freq: maxFreq,
      high_freq: newHighFreq,
      scale: 1.0,
      label: `${Math.round(maxFreq)}-${Math.round(newHighFreq)}Hz`,
      center_freq: Math.sqrt(maxFreq * newHighFreq)
    };
    onBandsChange([...frequencyBands, newBand]);
  };

  const resetToDefaultBands = () => {
    const defaultBands = [
      { id: 1, low_freq: 20, high_freq: 60, scale: 1.0, label: '32Hz', center_freq: 32 },
      { id: 2, low_freq: 60, high_freq: 90, scale: 1.0, label: '64Hz', center_freq: 64 },
      { id: 3, low_freq: 90, high_freq: 175, scale: 1.0, label: '125Hz', center_freq: 125 },
      { id: 4, low_freq: 175, high_freq: 350, scale: 1.0, label: '250Hz', center_freq: 250 },
      { id: 5, low_freq: 350, high_freq: 700, scale: 1.0, label: '500Hz', center_freq: 500 },
      { id: 6, low_freq: 700, high_freq: 1400, scale: 1.0, label: '1kHz', center_freq: 1000 },
      { id: 7, low_freq: 1400, high_freq: 2800, scale: 1.0, label: '2kHz', center_freq: 2000 },
      { id: 8, low_freq: 2800, high_freq: 5600, scale: 1.0, label: '4kHz', center_freq: 4000 },
      { id: 9, low_freq: 5600, high_freq: 11200, scale: 1.0, label: '8kHz', center_freq: 8000 },
      { id: 10, low_freq: 11200, high_freq: 20000, scale: 1.0, label: '16kHz', center_freq: 16000 }
    ];
    onBandsChange(defaultBands);
  };

  const handleFileUpload = (event) => {
    onFileUpload(event);
  };

  return (
    <div className="equalizer-panel">
      <div className="panel-header">
        <h3>GRAPHIC EQUALIZER - GENERIC MODE</h3>
        <div className="header-controls">
          <span className="processing-indicator">
            {isProcessing ? 'Processing...' : 'Ready'}
          </span>
          <span className="band-count">
            Bands: {frequencyBands.length}
          </span>
        </div>
      </div>
      
      <div className="control-buttons">
        <button onClick={addBand} className="btn btn-add">
          + Add Band
        </button>
        <button onClick={resetToDefaultBands} className="btn btn-reset">
          Default Bands
        </button>
        <button onClick={onReset} className="btn btn-reset">
          Reset Scales
        </button>
        <button onClick={onCustomizeSignal} className="btn btn-generate">
          Customize Signal
        </button>
        <button onClick={onGenerateSignal} className="btn btn-generate">
          New Signal
        </button>
        
        {/* File Upload Button */}
        <label className="btn btn-upload" style={{ 
          background: 'linear-gradient(135deg, #27AE60, #2ECC71)',
          color: 'white',
          cursor: 'pointer'
        }}>
          Upload WAV
          <input
            type="file"
            accept=".wav"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </label>
        
        <button onClick={onSave} className="btn btn-save">
          Save
        </button>
        <button onClick={onLoad} className="btn btn-load">
          Load
        </button>
      </div>

      {/* REMOVED: Frequency Response placeholder from here */}
    </div>
  );
};

export default EqualizerPanel;