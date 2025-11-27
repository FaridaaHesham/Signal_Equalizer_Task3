// EqualizerPanel.jsx
import './EqualizerPanel.css';
import ModePanel from './ModePanel';

const EqualizerPanel = ({ 
  frequencyBands, 
  onBandsChange, 
  onSave, 
  onReset,
  isProcessing,
  onCustomizeSignal,
  onFileUpload,
  currentMode,
  onModeChange,
  animalData,
  isLoadingAnimalData,
  selectedAnimals,
  onAnimalSelection,
  humanData,
  isLoadingHumanData,
  selectedHumans,
  onHumanSelection,
  instrumentData,
  isLoadingInstrumentData,
  selectedInstruments,
  onInstrumentSelection,
  isUploading, // NEW: Upload state
  uploadedFileName // NEW: File name
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

  const handleFileUpload = (event) => {
    onFileUpload(event);
  };

  const getModeTitle = () => {
    switch(currentMode) {
      case 'animals':
        return 'ANIMALS MODE';
      case 'humans':
        return 'HUMANS MODE';
      case 'instruments':
        return 'INSTRUMENTS MODE';
      default:
        return 'GENERIC MODE';
    }
  };

  const getModePanelProps = () => {
    switch(currentMode) {
      case 'animals':
        return {
          modeData: animalData,
          isLoading: isLoadingAnimalData,
          selectedItems: selectedAnimals,
          onItemSelection: onAnimalSelection,
          title: 'Select Animals'
        };
      case 'humans':
        return {
          modeData: humanData,
          isLoading: isLoadingHumanData,
          selectedItems: selectedHumans,
          onItemSelection: onHumanSelection,
          title: 'Select Human Voice Types'
        };
      case 'instruments':
        return {
          modeData: instrumentData,
          isLoading: isLoadingInstrumentData,
          selectedItems: selectedInstruments,
          onItemSelection: onInstrumentSelection,
          title: 'Select Instruments'
        };
      default:
        return null;
    }
  };

  const modePanelProps = getModePanelProps();

  return (
    <div className="equalizer-panel">
      <div className="panel-header">
        <h3>GRAPHIC EQUALIZER - {getModeTitle()}</h3>
        <div className="header-controls">
          <span className="processing-indicator">
            {isProcessing ? 'Processing...' : 'Ready'}
          </span>
          <span className="band-count">
            Bands: {frequencyBands.length}
          </span>
        </div>
      </div>
      
      {/* NEW: Upload Status Display */}
      {isUploading && (
        <div className="upload-status-panel">
          <div className="upload-loading-panel">
            <span>Uploading file...</span>
            <div className="loading-spinner-small"></div>
          </div>
        </div>
      )}

      {/* NEW: Uploaded File Name Display */}
      {uploadedFileName && !isUploading && (
        <div className="uploaded-file-info">
          <span className="file-name">File: {uploadedFileName}</span>
        </div>
      )}
      
      {/* Mode Selection */}
      <div className="mode-selection">
        <div className="mode-buttons">
          <button 
            className={`mode-btn ${currentMode === 'generic' ? 'active' : ''}`}
            onClick={() => onModeChange('generic')}
            disabled={isUploading || isProcessing}
          >
            Generic
          </button>
          <button 
            className={`mode-btn ${currentMode === 'animals' ? 'active' : ''}`}
            onClick={() => onModeChange('animals')}
            disabled={isLoadingAnimalData || !animalData || isUploading || isProcessing}
          >
            {isLoadingAnimalData ? 'Loading...' : 'Animals'}
          </button>
          <button 
            className={`mode-btn ${currentMode === 'humans' ? 'active' : ''}`}
            onClick={() => onModeChange('humans')}
            disabled={isLoadingHumanData || !humanData || isUploading || isProcessing}
          >
            {isLoadingHumanData ? 'Loading...' : 'Humans'}
          </button>
          <button 
            className={`mode-btn ${currentMode === 'instruments' ? 'active' : ''}`}
            onClick={() => onModeChange('instruments')}
            disabled={isLoadingInstrumentData || !instrumentData || isUploading || isProcessing}
          >
            {isLoadingInstrumentData ? 'Loading...' : 'Instruments'}
          </button>
        </div>
      </div>

      {/* Mode-specific Selection Panel */}
      {modePanelProps && (
        <ModePanel {...modePanelProps} maxSelection={3} />
      )}

      <div className="control-buttons">
        {currentMode === 'generic' && (
          <button onClick={addBand} className="btn btn-add" disabled={isUploading || isProcessing}>
            + Add Band
          </button>
        )}
        <button onClick={onReset} className="btn btn-reset" disabled={isUploading || isProcessing}>
          {currentMode === 'generic' ? 'Reset Bands' : 'Reset Scales'}
        </button>
        <button onClick={onCustomizeSignal} className="btn btn-generate" disabled={isUploading || isProcessing}>
          Customize Signal
        </button>
        
        {/* File Upload Button */}
        <label className={`btn btn-upload ${isUploading ? 'uploading' : ''}`} style={{ 
          background: isUploading 
            ? 'linear-gradient(135deg, #7F8C8D, #95A5A6)' 
            : 'linear-gradient(135deg, #27AE60, #2ECC71)',
          color: 'white',
          cursor: isUploading ? 'not-allowed' : 'pointer'
        }}>
          {isUploading ? 'Uploading...' : 'Upload WAV'}
          <input
            type="file"
            accept=".wav"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            disabled={isUploading || isProcessing}
          />
        </label>
        
        <button onClick={onSave} className="btn btn-save" disabled={isUploading || isProcessing}>
          Save
        </button>
      </div>
    </div>
  );
};

export default EqualizerPanel;