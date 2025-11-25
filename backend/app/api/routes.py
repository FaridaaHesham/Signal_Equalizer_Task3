from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import numpy as np
import json
import os
import scipy.io.wavfile as wavfile
import io

from app.services.dsp.signal_generator import SignalGenerator
from app.services.dsp.fft_processor import FFTProcessor
from app.services.dsp.equalizer import Equalizer

router = APIRouter(prefix="/api")

# Initialize processors
signal_generator = SignalGenerator()
fft_processor = FFTProcessor()
equalizer = Equalizer()

# Pydantic models
class FrequencyBand(BaseModel):
    low_freq: float
    high_freq: float
    scale: float
    label: Optional[str] = None
    id: Optional[int] = None

class ProcessRequest(BaseModel):
    signal: List[float]
    frequency_bands: List[FrequencyBand]
    sample_rate: int = 44100

class SpectrogramRequest(BaseModel):
    signal: List[float]
    sample_rate: int = 44100

class SyntheticSignalRequest(BaseModel):
    frequencies: List[float] = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]
    duration: float = 3.0
    sample_rate: int = 44100

class SaveSettingsRequest(BaseModel):
    settings: Dict[str, Any]
    filename: str = "equalizer_settings.json"

class LoadSettingsRequest(BaseModel):
    filename: str = "equalizer_settings.json"

@router.get("/ping")
def ping():
    return {"status": "ok", "message": "Backend API reachable!"}

@router.get("/health")
def health_check():
    return {"status": "healthy", "message": "Signal Equalizer API is running"}

# ===== PROCESS SIGNAL =====
@router.post("/process")
async def process_signal(request: ProcessRequest):
    try:
        signal = np.array(request.signal)
        frequency_bands = [band.dict() for band in request.frequency_bands]
        
        print(f"Processing signal: length={len(signal)}, bands={len(frequency_bands)}")
        
        # Apply equalizer
        processed_signal = equalizer.apply_equalizer(signal, frequency_bands, request.sample_rate)
        
        print(f"Processing complete: output length={len(processed_signal)}")
        
        # Compute spectrogram of processed signal
        spectrogram_processed = fft_processor.compute_spectrogram(processed_signal, request.sample_rate)
        
        print(f"Spectrogram of processed signal: {len(spectrogram_processed)} x {len(spectrogram_processed[0]) if spectrogram_processed else 0}")

        return {
            'success': True,
            'processed_signal': processed_signal.tolist(),
            'spectrogram_processed': spectrogram_processed,
            'sample_rate': request.sample_rate
        }
    except Exception as e:
        print(f"Error in process_signal: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===== GET SPECTROGRAM =====
@router.post("/spectrogram")
async def get_spectrogram(request: SpectrogramRequest):
    try:
        signal = np.array(request.signal)
        print(f"Computing spectrogram for signal length: {len(signal)}")
        spectrogram = fft_processor.compute_spectrogram(signal, request.sample_rate)
        print(f"Spectrogram computed: {len(spectrogram)} x {len(spectrogram[0]) if spectrogram and len(spectrogram) > 0 else 0}")
        return {
            'success': True,
            'spectrogram': spectrogram,
            'sample_rate': request.sample_rate
        }
    except Exception as e:
        print(f"Spectrogram error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ===== GET FFT SPECTRUM =====
@router.post("/fft-spectrum")
async def get_fft_spectrum(request: SpectrogramRequest):
    try:
        signal = np.array(request.signal)
        spectrum_data = fft_processor.compute_fft_spectrum(signal, request.sample_rate)
        return {
            'success': True,
            'magnitude': spectrum_data['magnitude'],
            'frequencies': spectrum_data['frequencies'],
            'sample_rate': request.sample_rate
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ===== GENERATE SYNTHETIC SIGNAL =====
@router.post("/synthetic-signal")
async def generate_synthetic_signal(request: SyntheticSignalRequest):
    try:
        signal, time_axis = signal_generator.generate_synthetic_signal(
            request.frequencies, request.duration, request.sample_rate
        )
        return {
            'success': True,
            'signal': signal,
            'time_axis': time_axis,
            'frequencies': request.frequencies,
            'sample_rate': request.sample_rate,
            'duration': request.duration
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ===== UPLOAD AUDIO FILE =====
@router.post("/upload-audio")
async def upload_audio(file: UploadFile = File(...)):
    try:
        if not file.filename.lower().endswith('.wav'):
            return {'success': False, 'error': 'Only WAV files are supported'}
        contents = await file.read()
        sample_rate, audio_data = wavfile.read(io.BytesIO(contents))
        if len(audio_data.shape) > 1:
            audio_data = np.mean(audio_data, axis=1)
        audio_data = audio_data.astype(np.float32)
        if audio_data.dtype == np.int16:
            audio_data = audio_data / 32768.0
        elif audio_data.dtype == np.int32:
            audio_data = audio_data / 2147483648.0
        elif audio_data.dtype == np.float32:
            audio_data = np.clip(audio_data, -1.0, 1.0)
        max_duration = 10
        max_samples = sample_rate * max_duration
        if len(audio_data) > max_samples:
            audio_data = audio_data[:max_samples]
        time_axis = np.linspace(0, len(audio_data) / sample_rate, len(audio_data))
        return {
            'success': True,
            'signal': audio_data.tolist(),
            'time_axis': time_axis.tolist(),
            'sample_rate': sample_rate,
            'duration': len(audio_data) / sample_rate,
            'filename': file.filename
        }
    except Exception as e:
        print(f"Error processing audio file: {e}")
        return {'success': False, 'error': f'Error processing audio file: {str(e)}'}

# ===== SAVE / LOAD SETTINGS =====
@router.post("/save-settings")
async def save_settings(request: SaveSettingsRequest):
    try:
        os.makedirs('settings', exist_ok=True)
        filepath = os.path.join('settings', request.filename)
        with open(filepath, 'w') as f:
            json.dump(request.settings, f, indent=2)
        return {'success': True, 'filepath': filepath}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/load-settings")
async def load_settings(request: LoadSettingsRequest):
    try:
        filepath = os.path.join('settings', request.filename)
        if not os.path.exists(filepath):
            return {'success': False, 'error': 'Settings file not found'}
        with open(filepath, 'r') as f:
            settings = json.load(f)
        return {'success': True, 'settings': settings, 'filename': request.filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ===== FREQUENCY RESPONSE =====
@router.post("/frequency-response")
async def get_frequency_response(request: ProcessRequest):
    try:
        frequency_bands = [band.dict() for band in request.frequency_bands]
        response = equalizer.get_frequency_response(frequency_bands, request.sample_rate)
        return {'success': True, 'frequency_response': response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ===== DEFAULT BANDS =====
@router.get("/default-bands")
async def get_default_bands():
    try:
        bands = equalizer.create_default_bands(num_bands=10)
        return {'success': True, 'bands': bands}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
