// App.jsx
import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import EqualizerPanel from './components/EqualizerPanel';
import SignalViewer from './components/SignalViewer';
import Spectrogram from './components/Spectrogram';
import AudioControls from './components/AudioControls';
import FrequencyResponse from './components/FrequencyResponse';
import VerticalSlider from './components/VerticalSlider';
import useModeData from './hooks/useModeData';
import SoundSeparator from './components/SoundSeparator';
import { 
  generateAnimalBands, 
  generateHumanBands, 
  generateInstrumentBands,
  handleAnimalSelection, 
  handleHumanSelection, 
  handleInstrumentSelection 
} from './utils/bandGenerator';
import {
  generateSyntheticSignal,
  uploadAudioFile,
  processAudio,
  getSpectrogram,
  getFrequencyResponse,
  saveSettings
} from './services/api';


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

// Enhanced normalization with proper error handling
const normalizeSpectrograms = (inputSpectrogram, outputSpectrogram) => {
  // Check if spectrograms are valid 2D arrays
  if (!inputSpectrogram || !outputSpectrogram || 
      !Array.isArray(inputSpectrogram) || !Array.isArray(outputSpectrogram) ||
      inputSpectrogram.length === 0 || outputSpectrogram.length === 0 ||
      !Array.isArray(inputSpectrogram[0]) || !Array.isArray(outputSpectrogram[0])) {
    console.error('Invalid spectrogram data:', {
      input: inputSpectrogram,
      output: outputSpectrogram
    });
    return { 
      normalizedInput: null, 
      normalizedOutput: null,
      differenceSpectrogram: null 
    };
  }
  
  // Ensure both spectrograms have the same dimensions
  const minRows = Math.min(inputSpectrogram.length, outputSpectrogram.length);
  const minCols = Math.min(
    inputSpectrogram[0]?.length || 0, 
    outputSpectrogram[0]?.length || 0
  );
  
  if (minRows === 0 || minCols === 0) {
    console.error('Spectrograms have zero dimensions');
    return { 
      normalizedInput: null, 
      normalizedOutput: null,
      differenceSpectrogram: null 
    };
  }
  
  console.log(`Spectrogram dimensions: ${minRows}x${minCols}`);
  
  // Convert to dB scale first for better visualization
  const toDB = (spectrogram) => {
    return spectrogram.map(row => 
      row.map(value => {
        const db = 10 * Math.log10(Math.max(1e-10, value)); // Avoid log(0)
        return Math.max(-100, Math.min(0, db)); // Clip to reasonable range
      })
    );
  };
  
  const inputDB = toDB(inputSpectrogram);
  const outputDB = toDB(outputSpectrogram);
  
  // Find global min and max across both spectrograms in dB
  let globalMin = Infinity;
  let globalMax = -Infinity;
  
  for (let i = 0; i < minRows; i++) {
    for (let j = 0; j < minCols; j++) {
      const inputVal = inputDB[i]?.[j];
      const outputVal = outputDB[i]?.[j];
      
      if (inputVal != null && !isNaN(inputVal)) {
        if (inputVal < globalMin) globalMin = inputVal;
        if (inputVal > globalMax) globalMax = inputVal;
      }
      
      if (outputVal != null && !isNaN(outputVal)) {
        if (outputVal < globalMin) globalMin = outputVal;
        if (outputVal > globalMax) globalMax = outputVal;
      }
    }
  }
  
  // If all values are the same, use default range
  if (globalMin === globalMax || !isFinite(globalMin) || !isFinite(globalMax)) {
    globalMin = -80;
    globalMax = 0;
    console.log('Using default spectrogram range');
  }
  
  console.log(`Global spectrogram range: ${globalMin.toFixed(2)} dB to ${globalMax.toFixed(2)} dB`);
  
  // Normalize dB values to [0,1]
  const normalizeDB = (dbSpectrogram) => {
    return dbSpectrogram.map(row => 
      row.map(dbValue => {
        // Convert from dB range to [0, 1]
        return (dbValue - globalMin) / (globalMax - globalMin);
      })
    );
  };
  
  const normalizedInput = normalizeDB(inputDB);
  const normalizedOutput = normalizeDB(outputDB);
  
  // Calculate difference spectrogram
  const differenceSpectrogram = [];
  for (let i = 0; i < minRows; i++) {
    const diffRow = [];
    for (let j = 0; j < minCols; j++) {
      const inputVal = inputSpectrogram[i]?.[j] || 1e-10;
      const outputVal = outputSpectrogram[i]?.[j] || 1e-10;
      
      // Calculate ratio in dB (positive = boost, negative = cut)
      const ratio = outputVal / Math.max(1e-10, inputVal);
      const diffDB = 10 * Math.log10(Math.max(1e-3, Math.min(1e3, ratio))); // Limit range
      // Normalize to [-1, 1] for visualization
      const normalizedDiff = Math.max(-1, Math.min(1, diffDB / 12)); // More sensitive scaling
      diffRow.push(normalizedDiff);
    }
    differenceSpectrogram.push(diffRow);
  }
  
  return { 
    normalizedInput, 
    normalizedOutput, 
    differenceSpectrogram 
  };
};

function App() {
  const [originalSignal, setOriginalSignal] = useState([]);
  const [processedSignal, setProcessedSignal] = useState([]);
  const [timeAxis, setTimeAxis] = useState([]);
  const [frequencyBands, setFrequencyBands] = useState([]);
  const [sampleRate, setSampleRate] = useState(44100);
  const [inputSpectrogram, setInputSpectrogram] = useState(null);
  const [outputSpectrogram, setOutputSpectrogram] = useState(null);
  const [normalizedInputSpectrogram, setNormalizedInputSpectrogram] = useState(null);
  const [normalizedOutputSpectrogram, setNormalizedOutputSpectrogram] = useState(null);
  const [differenceSpectrogram, setDifferenceSpectrogram] = useState(null);
  const [showSpectrograms, setShowSpectrograms] = useState(false);
  const [showDifference, setShowDifference] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [frequencyResponse, setFrequencyResponse] = useState(null);
  const [showSignalCustomizer, setShowSignalCustomizer] = useState(false);
  const [customFrequencies, setCustomFrequencies] = useState([32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]);
  const [signalDuration, setSignalDuration] = useState(3.0);
  const [isLoadingFrequencyResponse, setIsLoadingFrequencyResponse] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [currentMode, setCurrentMode] = useState('generic');
  const [selectedAnimals, setSelectedAnimals] = useState([]);
  const [selectedHumans, setSelectedHumans] = useState([]);
  const [selectedInstruments, setSelectedInstruments] = useState([]);
  const [isUploading, setIsUploading] = useState(false); // NEW: Upload loading state
  const [separatedSignals, setSeparatedSignals] = useState(null);

  
  // Use unified mode data hook
  const { data: animalData, isLoading: isLoadingAnimalData } = useModeData('animals');
  const { data: humanData, isLoading: isLoadingHumanData } = useModeData('humans');
  const { data: instrumentData, isLoading: isLoadingInstrumentData } = useModeData('instruments');
  const debouncedFrequencyBands = useDebounce(frequencyBands, 500);
  
  // Add refs to track the original signal and previous values
  const originalSignalRef = useRef([]);
  const prevNormalizedInputRef = useRef(null);
  const prevNormalizedOutputRef = useRef(null);
  const prevInputSpectrogramRef = useRef(null);
  const prevOutputSpectrogramRef = useRef(null);

  // Update the ref whenever originalSignal changes
  useEffect(() => {
    originalSignalRef.current = originalSignal;
  }, [originalSignal]);

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

  // Reset frequency bands to default
  const resetFrequencyBands = () => {
    setFrequencyBands(defaultGenericBands.map(band => ({ ...band, scale: 1.0 })));
  };

  // Initialize with generic bands
  useEffect(() => {
    resetFrequencyBands();
    generateInitialSignal();
  }, []);

  useEffect(() => {
    if (originalSignal.length && debouncedFrequencyBands.length) {
      processAudio();
      updateFrequencyResponse();
    }
  }, [debouncedFrequencyBands]);

  // Update bands when selection changes for each mode
  useEffect(() => {
    if (currentMode === 'animals' && selectedAnimals.length > 0) {
      const newBands = generateAnimalBands(selectedAnimals);
      setFrequencyBands(newBands);
    }
  }, [selectedAnimals, currentMode]);

  useEffect(() => {
    if (currentMode === 'humans' && selectedHumans.length > 0) {
      const newBands = generateHumanBands(selectedHumans);
      setFrequencyBands(newBands);
    }
  }, [selectedHumans, currentMode]);

  useEffect(() => {
    if (currentMode === 'instruments' && selectedInstruments.length > 0) {
      const newBands = generateInstrumentBands(selectedInstruments);
      setFrequencyBands(newBands);
    }
  }, [selectedInstruments, currentMode]);

  // Optimized: Update normalized spectrograms when raw spectrograms change
  useEffect(() => {
    if (inputSpectrogram && outputSpectrogram && 
        Array.isArray(inputSpectrogram) && Array.isArray(outputSpectrogram) &&
        inputSpectrogram.length > 0 && outputSpectrogram.length > 0) {
      
      // Check if spectrograms actually changed
      const inputChanged = inputSpectrogram !== prevInputSpectrogramRef.current;
      const outputChanged = outputSpectrogram !== prevOutputSpectrogramRef.current;
      
      if (inputChanged || outputChanged) {
        console.log('Spectrograms changed - normalizing:', { inputChanged, outputChanged });
        
        const { normalizedInput, normalizedOutput, differenceSpectrogram } = normalizeSpectrograms(inputSpectrogram, outputSpectrogram);
        
        // Only update normalized input if input spectrogram changed
        if (inputChanged && normalizedInput !== prevNormalizedInputRef.current) {
          setNormalizedInputSpectrogram(normalizedInput);
          prevNormalizedInputRef.current = normalizedInput;
        }
        
        // Only update normalized output if output spectrogram changed
        if (outputChanged && normalizedOutput !== prevNormalizedOutputRef.current) {
          setNormalizedOutputSpectrogram(normalizedOutput);
          prevNormalizedOutputRef.current = normalizedOutput;
        }
        
        setDifferenceSpectrogram(differenceSpectrogram);
        
        // Update previous references
        prevInputSpectrogramRef.current = inputSpectrogram;
        prevOutputSpectrogramRef.current = outputSpectrogram;
      } else {
        console.log('Spectrograms unchanged - skipping normalization');
      }
      
    } else {
      // Reset if spectrograms are invalid
      setNormalizedInputSpectrogram(null);
      setNormalizedOutputSpectrogram(null);
      setDifferenceSpectrogram(null);
      prevNormalizedInputRef.current = null;
      prevNormalizedOutputRef.current = null;
      prevInputSpectrogramRef.current = null;
      prevOutputSpectrogramRef.current = null;
    }
  }, [inputSpectrogram, outputSpectrogram]);

  const handleAnimalSelectionWrapper = (animalLabel) => {
    setSelectedAnimals(prev => 
      handleAnimalSelection(prev, animalLabel, animalData, 3)
    );
  };

  const handleHumanSelectionWrapper = (humanLabel) => {
    setSelectedHumans(prev => 
      handleHumanSelection(prev, humanLabel, humanData, 3)
    );
  };

  const handleInstrumentSelectionWrapper = (instrumentLabel) => {
    setSelectedInstruments(prev => 
      handleInstrumentSelection(prev, instrumentLabel, instrumentData, 3)
    );
  };

  // Generate initial signal function
  const generateInitialSignal = async () => {
    try {
      const data = await generateSyntheticSignal([32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000], 3.0, 44100);
      
      if (data.success) {
        setOriginalSignal(data.signal);
        setProcessedSignal(data.signal);
        setTimeAxis(data.time_axis);
        setSampleRate(data.sample_rate);
        setUploadedFileName('');
        
        // Update spectrograms and frequency response
        updateSpectrograms(data.signal, data.signal);
        updateFrequencyResponse();
      }
    } catch (error) {
      console.error('Error generating initial signal:', error);
    }
  };

  // Generate custom signal function
  const generateCustomSignal = async (frequencies, duration) => {
    try {
      const data = await generateSyntheticSignal(frequencies, duration, 44100);
      
      if (data.success) {
        setOriginalSignal(data.signal);
        setProcessedSignal(data.signal);
        setTimeAxis(data.time_axis);
        setSampleRate(data.sample_rate);
        setUploadedFileName('');
        
        // Update spectrograms and frequency response
        updateSpectrograms(data.signal, data.signal);
        updateFrequencyResponse();
        
        // If we're in a specific mode, reprocess with current bands
        if (currentMode !== 'generic' && frequencyBands.length > 0) {
          processAudio();
        }
      }
    } catch (error) {
      console.error('Error generating custom signal:', error);
    }
  };

  // Add a new function to reset only when explicitly switching to generic mode
  const resetToGenericMode = () => {
    resetFrequencyBands();
    setSelectedAnimals([]);
    setSelectedHumans([]);
    setSelectedInstruments([]);
  };

  // Update the handleModeChange function to use the new reset function only for generic mode:
  const handleModeChange = (mode) => {
    setCurrentMode(mode);
    
    if (mode === 'generic') {
      // Only reset when explicitly switching TO generic mode
      resetToGenericMode();
    } else if (mode === 'animals' && animalData && animalData.modes.custom_generated.length > 0) {
      // Select first 3 animals by default and generate bands
      const initialAnimals = animalData.modes.custom_generated.slice(0, 3);
      setSelectedAnimals(initialAnimals);
      // Bands will be generated by the useEffect above
    } else if (mode === 'humans' && humanData && humanData.modes.custom_generated.length > 0) {
      // Select first 3 humans by default and generate bands
      const initialHumans = humanData.modes.custom_generated.slice(0, 3);
      setSelectedHumans(initialHumans);
    } else if (mode === 'instruments' && instrumentData && instrumentData.modes.custom_generated.length > 0) {
      // Select first 3 instruments by default and generate bands
      const initialInstruments = instrumentData.modes.custom_generated.slice(0, 3);
      setSelectedInstruments(initialInstruments);
    }
  };

  // NEW: Enhanced file upload with loading state
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.wav')) {
      alert('Please upload a WAV file');
      return;
    }

    setIsUploading(true);
    try {
      const data = await uploadAudioFile(file);

      if (data.success) {
        setOriginalSignal(data.signal);
        setProcessedSignal(data.signal);
        setTimeAxis(data.time_axis);
        setSampleRate(data.sample_rate);
        setUploadedFileName(file.name);
        
        // Update spectrograms and frequency response
        updateSpectrograms(data.signal, data.signal);
        updateFrequencyResponse();
        
        // If we're in a specific mode, reprocess with current bands
        if (currentMode !== 'generic' && frequencyBands.length > 0) {
          processAudio();
        }
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

 // Update processAudio to handle completion
const processAudio = async () => {
  if (!originalSignal.length) return;
  
  setIsProcessing(true);
  try {
    console.log('Processing audio with original signal length:', originalSignal.length);
    const response = await fetch(`${API_BASE}/api/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signal: originalSignal, // Always use ORIGINAL signal, not processedSignal
        frequency_bands: frequencyBands,
        sample_rate: sampleRate
      })
    });
    
    const data = await response.json();
    if (data.success) {
      console.log('Processing complete, setting processed signal:', data.processed_signal.length);
      console.log('Signal stats:', data.signal_stats);
      setProcessedSignal(data.processed_signal);
      
      // Update spectrograms with ORIGINAL and PROCESSED signals
      updateSpectrograms(originalSignal, data.processed_signal);
    }
      } catch (error) {
    console.error('Error processing audio:', error);
  } finally {
    setIsProcessing(false);
  }
};

  const handleSeparatedSignals = async (signalData) => {
  console.log('Received separated signals data:', signalData);
  
  // Validate the data structure
  if (!signalData || !signalData.signal) {
    console.error('Invalid signal data received:', signalData);
    return;
  }

  const newSignal = signalData.signal;
  const newSampleRate = signalData.sample_rate || sampleRate;
  
  console.log('Setting separated signal:', {
    length: newSignal.length,
    sampleRate: newSampleRate
  });
  
  setOriginalSignal(newSignal);
  setProcessedSignal(newSignal);
  
  // Create proper time axis
  const newTimeAxis = Array.from(
    {length: newSignal.length}, 
    (_, i) => i / newSampleRate
  );
  setTimeAxis(newTimeAxis);
  setSampleRate(newSampleRate);
  setUploadedFileName(`separated_${Date.now()}.wav`);
  
  // Force update spectrograms with the new signal
  await updateSpectrograms(newSignal, newSignal);
  updateFrequencyResponse();
  
  console.log('Separated signal set successfully');
};

  // Modified updateSpectrograms
  const updateSpectrograms = async (inputSignal, outputSignal) => {
    try {
      console.log('Updating spectrograms - Input length:', inputSignal.length, 'Output length:', outputSignal.length);
      
      // Ensure we have valid signals
      if (!inputSignal.length || !outputSignal.length) {
        console.error('Cannot update spectrograms: empty signals');
        return;
      }

      // Check if input signal is the same as our stored original
      const isSameInput = inputSignal.length === originalSignalRef.current.length && 
                         inputSignal[0] === originalSignalRef.current[0]; // Simple check
      
      console.log('Input signal unchanged:', isSameInput, 'Input length:', inputSignal.length, 'Stored length:', originalSignalRef.current.length);

      if (!isSameInput) {
        // Update input spectrogram only if input signal is different
        const inputData = await getSpectrogram(inputSignal, sampleRate);
        
        if (inputData.success && inputData.spectrogram) {
          console.log('Input spectrogram received:', {
            rows: inputData.spectrogram.length,
            cols: inputData.spectrogram[0]?.length || 0
          });
          setInputSpectrogram(inputData.spectrogram);
        } else {
          console.error('Input spectrogram error:', inputData.error || 'No spectrogram data');
          setInputSpectrogram(null);
        }
      } else {
        console.log('Skipping input spectrogram update - signal unchanged');
      }

      // Always update output spectrogram
      const outputData = await getSpectrogram(outputSignal, sampleRate);
      
      if (outputData.success && outputData.spectrogram) {
        console.log('Output spectrogram received:', {
          rows: outputData.spectrogram.length,
          cols: outputData.spectrogram[0]?.length || 0
        });
        setOutputSpectrogram(outputData.spectrogram);
      } else {
        console.error('Output spectrogram error:', outputData.error || 'No spectrogram data');
        setOutputSpectrogram(null);
      }
    } catch (error) {
      console.error('Error updating spectrograms:', error);
      // Only reset if it's not a processing update (when input signal actually changed)
      if (!originalSignalRef.current.length || inputSignal[0] !== originalSignalRef.current[0]) {
        setInputSpectrogram(null);
      }
      setOutputSpectrogram(null);
    }
  };

  const updateFrequencyResponse = async () => {
    if (!frequencyBands.length) return;
    
    setIsLoadingFrequencyResponse(true);
    try {
      console.log('Updating frequency response with bands:', frequencyBands);
      
      const data = await getFrequencyResponse(originalSignal, frequencyBands, sampleRate);
      
      console.log('Frequency response data received:', data);
      
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
      const data = await saveSettings({
        frequency_bands: frequencyBands,
        version: '1.0',
        created: new Date().toISOString()
      }, 'equalizer_settings.json');
      
      if (data.success) {
        alert('Settings saved successfully!');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  // Also update the resetEqualizer function to preserve mode-specific bands:
  const resetEqualizer = () => {
    if (currentMode === 'generic') {
      // For generic mode, reset to default bands
      resetFrequencyBands();
    } else {
      // For mode-specific bands, reset scales to 1.0 but keep the bands
      const resetBands = frequencyBands.map(band => ({
        ...band,
        scale: 1.0
      }));
      setFrequencyBands(resetBands);
    }
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
      // If in human mode, update selected humans
      else if (currentMode === 'humans') {
        const removedHuman = frequencyBands[index].human;
        if (removedHuman) {
          setSelectedHumans(prev => prev.filter(h => h.label !== removedHuman.label));
        }
      }
      // If in instrument mode, update selected instruments
      else if (currentMode === 'instruments') {
        const removedInstrument = frequencyBands[index].instrument;
        if (removedInstrument) {
          setSelectedInstruments(prev => prev.filter(i => i.label !== removedInstrument.label));
        }
      }
    }
  };

  const formatFrequency = (freq) => {
    if (freq >= 1000) {
      return `${(freq / 1000).toFixed(1)}k`;
    }
    return `${Math.round(freq)}`;
  };

  return (
    <div className="App">
      <div className="main-container">
        {/* Visualization Section - Left side */}
        <div className="visualization-section">
          {/* NEW: Upload Status Display */}
          {isUploading && (
            <div className="upload-status">
              <div className="upload-loading">
                <span>Uploading {uploadedFileName || 'file'}...</span>
                <div className="loading-spinner"></div>
              </div>
            </div>
          )}

          {/* NEW: File Name Display */}
          {uploadedFileName && !isUploading && (
            <div className="file-name-display">
              <span>Loaded: {uploadedFileName}</span>
            </div>
          )}

          {/* NEW: Processing Status */}
          {(isProcessing) && (
            <div className="processing-status">
              <div className="processing-indicator">
                <span>
                  {'Processing audio...'}
                </span>
                <div className="loading-spinner"></div>
              </div>
            </div>
          )}
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
                {currentMode === 'animals' ? 'Animal Frequency Range Controls' : 
                 currentMode === 'humans' ? 'Human Voice Frequency Controls' :
                 currentMode === 'instruments' ? 'Instrument Frequency Controls' : 
                 'Frequency Band Controls'}
              </h4>
              <p>
                {currentMode === 'animals' 
                  ? 'Adjust amplitude scales for each animal frequency range' 
                  : currentMode === 'humans'
                  ? 'Adjust amplitude scales for each human voice frequency range'
                  : currentMode === 'instruments'
                  ? 'Adjust amplitude scales for each instrument frequency range'
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
            {showSpectrograms && (
              <button 
                onClick={() => setShowDifference(!showDifference)}
                className="toggle-button"
                style={{ marginLeft: '10px' }}
              >
                {showDifference ? 'Show Normal' : 'Show Difference'}
              </button>
            )}
          </div>

          {showSpectrograms && (
            <div className="spectrograms-horizontal">
              {showDifference ? (
                <>
                  <Spectrogram
                    title="Difference Spectrogram (Output - Input)"
                    spectrogramData={differenceSpectrogram}
                    sampleRate={sampleRate}
                    signalLength={originalSignal.length}
                  />
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px',
                    color: '#BDC3C7',
                    textAlign: 'center'
                  }}>
                    <h4>Difference Spectrogram</h4>
                    <p>Red: Frequencies boosted by equalizer</p>
                    <p>Blue: Frequencies cut by equalizer</p>
                    <p>White: No change</p>
                  </div>
                </>
              ) : (
                <>
                  <Spectrogram
                    title="Input Spectrogram"
                    spectrogramData={normalizedInputSpectrogram}
                    sampleRate={sampleRate}
                    signalLength={originalSignal.length}
                  />
                  <Spectrogram
                    title="Output Spectrogram"
                    spectrogramData={normalizedOutputSpectrogram}
                    sampleRate={sampleRate}
                    signalLength={processedSignal.length}
                  />
                </>
              )}
            </div>
          )}
        </div>

        {/* Control Section - Right side */}
        <div className="control-section">
          <EqualizerPanel
            frequencyBands={frequencyBands}
            onBandsChange={setFrequencyBands}
            onSave={saveSettings}
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
            humanData={humanData}
            isLoadingHumanData={isLoadingHumanData}
            selectedHumans={selectedHumans}
            onHumanSelection={handleHumanSelectionWrapper}
            instrumentData={instrumentData}
            isLoadingInstrumentData={isLoadingInstrumentData}
            selectedInstruments={selectedInstruments}
            onInstrumentSelection={handleInstrumentSelectionWrapper}
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
          
        {/* Sound Separation */}
        {(currentMode === 'animals' || currentMode === 'humans' || currentMode === 'instruments') && (
          <SoundSeparator
            currentMode={currentMode}
            originalSignal={originalSignal}
            sampleRate={sampleRate}
            onSeparatedSignals={handleSeparatedSignals}
          />
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
              }} className="btn btn-generate">
                Generate Signal
              </button>
              <button onClick={() => setShowSignalCustomizer(false)} className="btn btn-reset">
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