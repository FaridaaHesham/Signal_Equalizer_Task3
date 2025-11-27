const API_BASE = "http://localhost:5000"; // Change to match your backend port

export async function getBackendStatus() {
  const res = await fetch(`${API_BASE}/`);
  return res.json();
}

export async function pingAPI() {
  const res = await fetch(`${API_BASE}/api/ping`);
  return res.json();
}

export async function generateSyntheticSignal(frequencies, duration, sampleRate = 44100) {
  const response = await fetch(`${API_BASE}/api/synthetic-signal`, { // Added /api
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      frequencies: frequencies,
      duration: duration,
      sample_rate: sampleRate
    })
  });
  return response.json();
}

export async function uploadAudioFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/api/upload-audio`, { // Added /api
    method: 'POST',
    body: formData,
  });
  return response.json();
}

// export async function processAudio(signal, frequencyBands, sampleRate) {
//   const response = await fetch(`${API_BASE}/api/process`, { // Added /api
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({
//       signal: signal,
//       frequency_bands: frequencyBands,
//       sample_rate: sampleRate
//     })
//   });
//   return response.json();
// }

export async function getSpectrogram(signal, sampleRate) {
  const response = await fetch(`${API_BASE}/api/spectrogram`, { // Added /api
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      signal: signal, 
      sample_rate: sampleRate
    })
  });
  return response.json();
}

export async function getFrequencyResponse(signal, frequencyBands, sampleRate) {
  const response = await fetch(`${API_BASE}/api/frequency-response`, { // Added /api
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      signal: signal,
      frequency_bands: frequencyBands,
      sample_rate: sampleRate
    })
  });
  return response.json();
}

export async function saveSettings(settings, filename = 'equalizer_settings.json') {
  const response = await fetch(`${API_BASE}/api/save-settings`, { // Added /api
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      settings: settings,
      filename: filename
    })
  });
  return response.json();
}

export async function getFFTSpectrum(signal, sampleRate) {
  const response = await fetch(`${API_BASE}/api/fft-spectrum`, { // Added /api
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      signal: signal,
      sample_rate: sampleRate 
    })
  });
  return response.json();
}