import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import EqualizerPanel from './components/EqualizerPanel';
import SignalViewer from './components/SignalViewer';
import Spectrogram from './components/Spectrogram';
import AudioControls from './components/AudioControls';
import FrequencyResponse from './components/FrequencyResponse';
import VerticalSlider from './components/VerticalSlider';
import useAnimalData from './hooks/useAnimalData';
import { generateAnimalBands, handleAnimalSelection } from './utils/animalBandGenerator';

const API_BASE = 'http://localhost:5000/api';

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
}

function App() {
  const [originalSignal, setOriginalSignal] = useState([]);
  const [processedSignal, setProcessedSignal] = useState([]);
  const [timeAxis, setTimeAxis] = useState([]);
  const [frequencyBands, setFrequencyBands] = useState([]);
  const [sampleRate, setSampleRate] = useState(44100);
  const [inputSpectrogram, setInputSpectrogram] = useState(null);
  const [outputSpectrogram, setOutputSpectrogram] = useState(null);
  const [showSpectrograms, setShowSpectrograms] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [frequencyResponse, setFrequencyResponse] = useState(null);
  const [showSignalCustomizer, setShowSignalCustomizer] = useState(false);
  const [customFrequencies, setCustomFrequencies] = useState([32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]);
  const [signalDuration, setSignalDuration] = useState(3.0);
  const [isLoadingFrequencyResponse, setIsLoadingFrequencyResponse] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [currentMode, setCurrentMode] = useState('generic');
  const [selectedAnimals, setSelectedAnimals] = useState([]);
  const [customVoices, setCustomVoices] = useState([]);
  
  const { animalData, isLoading: isLoadingAnimalData, error: animalDataError } = useAnimalData();
  const debouncedFrequencyBands = useDebounce(frequencyBands, 300);

  // Default generic bands
  const defaultGenericBands = [
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

  // Initialize with generic bands
  useEffect(() => {
    setFrequencyBands(defaultGenericBands);
    generateSyntheticSignal();
  }, []);

  useEffect(() => {
    if (originalSignal.length && debouncedFrequencyBands.length) {
      processAudio();
      updateFrequencyResponse();
    }
  }, [debouncedFrequencyBands]);

  // Update animal bands when selection changes
  useEffect(() => {
    if (currentMode === 'animals' && selectedAnimals.length > 0) {
      const newBands = generateAnimalBands(selectedAnimals);
      setFrequencyBands(newBands);
    }
  }, [selectedAnimals, currentMode]);

  const handleAnimalSelectionWrapper = (animalLabel) => {
    setSelectedAnimals(prev => 
      handleAnimalSelection(prev, animalLabel, animalData, 3)
    );
  };

  const analyzeVoice = async (file, voiceName = "custom_voice") => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('voice_name', voiceName);

      const response = await fetch(`${API_BASE}/analyze-voice`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        alert(`Voice analysis completed! Profile "${voiceName}" has been saved.`);
        loadCustomVoices();
        return data.analysis;
      } else {
        alert('Error analyzing voice: ' + data.error);
        return null;
      }
    } catch (error) {
      console.error('Error analyzing voice:', error);
      alert('Error analyzing voice file');
      return null;
    }
  };

  const loadCustomVoices = async () => {
    try {
      const response = await fetch(`${API_BASE}/custom-voices`);
      const data = await response.json();
      if (data.success) {
        setCustomVoices(data.voices);
      }
    } catch (error) {
      console.error('Error loading custom voices:', error);
    }
  };

  // Call loadCustomVoices on component mount
  useEffect(() => {
    loadCustomVoices();
  }, []);

  const generateSyntheticSignal = async () => {
    try {
      const response = await fetch(`${API_BASE}/synthetic-signal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frequencies: [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000],
          duration: 3.0,
          sample_rate: 44100
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setOriginalSignal(data.signal);
        setProcessedSignal(data.signal);
        setTimeAxis(data.time_axis);
        setSampleRate(data.sample_rate);
        setUploadedFileName('');
        
        updateSpectrograms(data.signal, data.signal);
        updateFrequencyResponse();
      }
    } catch (error) {
      console.error('Error generating signal:', error);
    }
  };

  const generateCustomSignal = async (frequencies, duration) => {
    try {
      const response = await fetch(`${API_BASE}/synthetic-signal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frequencies: frequencies,
          duration: duration,
          sample_rate: 44100
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setOriginalSignal(data.signal);
        setProcessedSignal(data.signal);
        setTimeAxis(data.time_axis);
        setSampleRate(data.sample_rate);
        setUploadedFileName('');
        updateSpectrograms(data.signal, data.signal);
        updateFrequencyResponse();
      }
    } catch (error) {
      console.error('Error generating custom signal:', error);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.wav')) {
      alert('Please upload a WAV file');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE}/upload-audio`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        setOriginalSignal(data.signal);
        setProcessedSignal(data.signal);
        setTimeAxis(data.time_axis);
        setSampleRate(data.sample_rate);
        setUploadedFileName(file.name);
        updateSpectrograms(data.signal, data.signal);
        updateFrequencyResponse();
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file. Please try again.');
    }
  };

  const processAudio = async () => {
    if (!originalSignal.length) return;
    
    setIsProcessing(true);
    try {
      const response = await fetch(`${API_BASE}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signal: originalSignal,
          frequency_bands: frequencyBands,
          sample_rate: sampleRate
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setProcessedSignal(data.processed_signal);
        updateSpectrograms(originalSignal, data.processed_signal);
      }
    } catch (error) {
      console.error('Error processing audio:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const updateSpectrograms = async (inputSignal, outputSignal) => {
    try {
      const inputResponse = await fetch(`${API_BASE}/spectrogram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signal: inputSignal, sample_rate: sampleRate })
      });
      
      const inputData = await inputResponse.json();
      if (inputData.success) {
        setInputSpectrogram(inputData.spectrogram);
      }

      const outputResponse = await fetch(`${API_BASE}/spectrogram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signal: outputSignal, sample_rate: sampleRate })
      });
      
      const outputData = await outputResponse.json();
      if (outputData.success) {
        setOutputSpectrogram(outputData.spectrogram);
      }
    } catch (error) {
      console.error('Error updating spectrograms:', error);
    }
  };

  const updateFrequencyResponse = async () => {
    if (!frequencyBands.length) return;
    
    setIsLoadingFrequencyResponse(true);
    try {
      const response = await fetch(`${API_BASE}/frequency-response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signal: originalSignal,
          frequency_bands: frequencyBands,
          sample_rate: sampleRate
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setFrequencyResponse(data.frequency_response);
      } else {
        console.error('Backend returned success: false', data);
      }
    } catch (error) {
      console.error('Error updating frequency response:', error);
    } finally {
      setIsLoadingFrequencyResponse(false);
    }
  };

  const saveSettings = async () => {
    try {
      const response = await fetch(`${API_BASE}/save-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            frequency_bands: frequencyBands,
            version: '1.0',
            created: new Date().toISOString()
          },
          filename: 'equalizer_settings.json'
        })
      });
      
      const data = await response.json();
      if (data.success) {
        alert('Settings saved successfully!');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const response = await fetch(`${API_BASE}/load-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: 'equalizer_settings.json' })
      });
      
      const data = await response.json();
      if (data.success) {
        setFrequencyBands(data.settings.frequency_bands);
        alert('Settings loaded successfully!');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const resetEqualizer = () => {
    const resetBands = frequencyBands.map(band => ({
      ...band,
      scale: 1.0
    }));
    setFrequencyBands(resetBands);
  };

  const updateBand = (index, field, value) => {
    const newBands = [...frequencyBands];
    newBands[index] = {
      ...newBands[index],
      [field]: parseFloat(value) || 0
    };
    setFrequencyBands(newBands);
  };

  const handleSliderChange = (index, value) => {
    updateBand(index, 'scale', value);
  };

  const removeBand = (index) => {
    if (frequencyBands.length > 1) {
      const newBands = frequencyBands.filter((_, i) => i !== index);
      setFrequencyBands(newBands);
      
      // If in animal mode, update selected animals
      if (currentMode === 'animals') {
        const removedAnimal = frequencyBands[index].animal;
        if (removedAnimal) {
          setSelectedAnimals(prev => prev.filter(a => a.label !== removedAnimal.label));
        }
      }
    }
  };

  const updateBandRange = (index, lowFreq, highFreq) => {
    const newBands = [...frequencyBands];
    newBands[index] = {
      ...newBands[index],
      low_freq: parseFloat(lowFreq) || 20,
      high_freq: parseFloat(highFreq) || 20000,
      center_freq: Math.sqrt(lowFreq * highFreq),
      label: currentMode === 'animals' ? newBands[index].label : 
             (highFreq < 1000 ? 
              `${Math.round(lowFreq)}-${Math.round(highFreq)}Hz` : 
              `${Math.round(lowFreq/1000)}-${Math.round(highFreq/1000)}kHz`)
    };
    setFrequencyBands(newBands);
  };

  const formatFrequency = (freq) => {
    if (freq >= 1000) {
      return `${(freq / 1000).toFixed(1)}k`;
    }
    return `${Math.round(freq)}`;
  };

  const handleModeChange = (mode) => {
    setCurrentMode(mode);
    
    if (mode === 'generic') {
      // Reset to generic bands
      setFrequencyBands(defaultGenericBands);
      setSelectedAnimals([]);
    } else if (mode === 'animals' && animalData && animalData.modes.custom_generated.length > 0) {
      // Select first 3 animals by default and generate bands
      const initialAnimals = animalData.modes.custom_generated.slice(0, 3);
      setSelectedAnimals(initialAnimals);
      // Bands will be generated by the useEffect above
    }
  };

  return (
    <div className="App">
      <div className="main-container">
        {/* Visualization Section - Left side */}
        <div className="visualization-section">
          {/* Signal Graphs Container */}
          <div className="signal-graphs-container">
            {/* Time Domain Graphs */}
            <div className="signal-graphs-row">
              <SignalViewer
                title="Input Signal (Time Domain)"
                signal={originalSignal}
                timeAxis={timeAxis}
                color="#4A90E2"
                sampleRate={sampleRate}
                type="time"
              />
              <SignalViewer
                title="Output Signal (Time Domain)"
                signal={processedSignal}
                timeAxis={timeAxis}
                color="#50E3C2"
                sampleRate={sampleRate}
                type="time"
              />
            </div>

            {/* Frequency Domain Graphs */}
            <div className="signal-graphs-row">
              <SignalViewer
                title="Input Signal (Frequency Domain)"
                signal={originalSignal}
                timeAxis={timeAxis}
                color="#4A90E2"
                sampleRate={sampleRate}
                type="frequency"
              />
              <SignalViewer
                title="Output Signal (Frequency Domain)"
                signal={processedSignal}
                timeAxis={timeAxis}
                color="#50E3C2"
                sampleRate={sampleRate}
                type="frequency"
              />
            </div>
          </div>

          {/* Horizontal Vertical Sliders Container */}
          <div className="vertical-sliders-container">
            <div className="sliders-header">
              <h4>
                {currentMode === 'animals' ? 'Animal Frequency Range Controls' : 'Frequency Band Controls'}
              </h4>
              <p>
                {currentMode === 'animals' 
                  ? 'Adjust amplitude scales for each animal frequency range' 
                  : 'Adjust amplitude scales (0-2) for each frequency subdivision'}
              </p>
            </div>
            
            <div className="vertical-sliders-horizontal">
              {frequencyBands.map((band, index) => (
                <div key={band.id} className="band-vertical-container">
                  <VerticalSlider
                    value={band.scale}
                    onChange={(value) => handleSliderChange(index, value)}
                    label={band.label}
                    freqLabel={`${formatFrequency(band.low_freq)}-${formatFrequency(band.high_freq)}Hz`}
                    color={band.color || '#3498DB'}
                    onRemove={() => removeBand(index)}
                    showRemove={currentMode === 'generic'}
                  />
                </div>
              ))}
            </div>

            <div className="sliders-footer">
              <div className="db-scale">
                <span>+12dB</span>
                <span>0dB</span>
                <span>-12dB</span>
              </div>
              <div className="scale-info">
                Scale: 0.0 (mute) to 2.0 (+12dB boost)
              </div>
            </div>
          </div>

          <div className="spectrogram-controls">
            <button 
              onClick={() => setShowSpectrograms(!showSpectrograms)}
              className="toggle-button"
            >
              {showSpectrograms ? 'Hide Spectrograms' : 'Show Spectrograms'}
            </button>
          </div>

          {showSpectrograms && (
            <div className="spectrograms-horizontal">
              <Spectrogram
                title="Input Spectrogram"
                spectrogramData={inputSpectrogram}
              />
              <Spectrogram
                title="Output Spectrogram"
                spectrogramData={outputSpectrogram}
              />
            </div>
          )}
        </div>

        {/* Control Section - Right side */}
        <div className="control-section">
          <EqualizerPanel
            frequencyBands={frequencyBands}
            onBandsChange={setFrequencyBands}
            onSave={saveSettings}
            onLoad={loadSettings}
            onGenerateSignal={generateSyntheticSignal}
            onReset={resetEqualizer}
            isProcessing={isProcessing}
            frequencyResponse={frequencyResponse}
            onCustomizeSignal={() => setShowSignalCustomizer(true)}
            onFileUpload={handleFileUpload}
            currentMode={currentMode}
            onModeChange={handleModeChange}
            animalData={animalData}
            isLoadingAnimalData={isLoadingAnimalData}
            selectedAnimals={selectedAnimals}
            onAnimalSelection={handleAnimalSelectionWrapper}
          />
          
          {/* Frequency Response */}
          {isLoadingFrequencyResponse ? (
            <div className="controls-frequency-response">
              <div style={{textAlign: 'center', color: '#BDC3C7', padding: '20px'}}>
                Calculating Frequency Response...
              </div>
            </div>
          ) : frequencyResponse ? (
            <div className="controls-frequency-response">
              <FrequencyResponse frequencyResponse={frequencyResponse} />
            </div>
          ) : (
            <div className="controls-frequency-response">
              <div style={{textAlign: 'center', color: '#95A5A6', padding: '20px'}}>
                No Frequency Response Data
              </div>
            </div>
          )}

          {/* Audio Playback */}
          <div className="controls-audio-playback">
            <AudioControls
              inputSignal={originalSignal}
              outputSignal={processedSignal}
              sampleRate={sampleRate}
            />
          </div>
        </div>
      </div>

      {/* Signal Customizer Modal */}
      {showSignalCustomizer && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Customize Synthetic Signal</h3>

            <div className="frequency-sliders" style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#BDC3C7', fontWeight: '500' }}>
                Frequency Components (Hz):
              </label>
              {customFrequencies.map((freq, index) => (
                <div key={index} style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '0.8em', color: '#BDC3C7' }}>
                    Frequency {index + 1}: {freq}Hz
                  </label>
                  <input
                    type="range"
                    min="20"
                    max="20000"
                    step="1"
                    value={freq}
                    onChange={(e) => {
                      const newFreq = parseInt(e.target.value);
                      const newFrequencies = [...customFrequencies];
                      newFrequencies[index] = newFreq;
                      setCustomFrequencies(newFrequencies);
                    }}
                    style={{
                      width: '100%',
                      marginTop: '5px'
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="duration-input">
              <label style={{ display: 'block', marginBottom: '8px', color: '#BDC3C7', fontWeight: '500' }}>
                Duration (seconds):
              </label>
              <input
                type="range"
                min="0.1"
                max="10"
                step="0.1"
                value={signalDuration}
                onChange={(e) => setSignalDuration(parseFloat(e.target.value))}
                style={{ width: '100%', marginBottom: '5px' }}
              />
              <span style={{ color: '#3498DB', fontSize: '0.9em' }}>{signalDuration}s</span>
            </div>

            <div className="modal-buttons">
              <button onClick={() => {
                generateCustomSignal(customFrequencies, signalDuration);
                setShowSignalCustomizer(false);
              }} className="btn btn-generate" style={{padding: '4px 8px', fontSize: '0.7em'}}>
                Generate Signal
              </button>
              <button onClick={() => setShowSignalCustomizer(false)} className="btn btn-reset" style={{padding: '4px 8px', fontSize: '0.7em'}}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;