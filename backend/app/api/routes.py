from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import numpy as np
import json
import os

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

@router.post("/process")
async def process_signal(request: ProcessRequest):
    try:
        signal = np.array(request.signal)
        frequency_bands = [band.dict() for band in request.frequency_bands]
        
        # Apply equalizer
        processed_signal = equalizer.apply_equalizer(signal, frequency_bands, request.sample_rate)
        
        return {
            'success': True,
            'processed_signal': processed_signal.tolist(),
            'sample_rate': request.sample_rate
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/spectrogram")
async def get_spectrogram(request: SpectrogramRequest):
    try:
        signal = np.array(request.signal)
        
        # Generate spectrogram
        spectrogram = fft_processor.compute_spectrogram(signal, request.sample_rate)
        
        return {
            'success': True,
            'spectrogram': spectrogram.tolist(),
            'sample_rate': request.sample_rate
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/fft-spectrum")
async def get_fft_spectrum(request: SpectrogramRequest):
    """
    Get FFT frequency spectrum for signal visualization using our custom FFT
    """
    try:
        signal = np.array(request.signal)
        
        # Use optimized FFT spectrum method
        spectrum_data = fft_processor.compute_fft_spectrum(signal, request.sample_rate)
        
        return {
            'success': True,
            'magnitude': spectrum_data['magnitude'],
            'frequencies': spectrum_data['frequencies'],
            'sample_rate': request.sample_rate
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

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

@router.post("/save-settings")
async def save_settings(request: SaveSettingsRequest):
    try:
        # Ensure settings directory exists
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
            
        return {
            'success': True,
            'settings': settings,
            'filename': request.filename
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/frequency-response")
async def get_frequency_response(request: ProcessRequest):
    try:
        print(f"Frequency response request received with {len(request.frequency_bands)} bands")
        
        frequency_bands = [band.dict() for band in request.frequency_bands]
        response = equalizer.get_frequency_response(frequency_bands, request.sample_rate)
        
        print(f"Generated frequency response with {len(response['frequencies'])} points")
        
        return {
            'success': True,
            'frequency_response': response
        }
    except Exception as e:
        print(f"Error in frequency response: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/default-bands")
async def get_default_bands():
    """Get professionally spaced frequency bands"""
    try:
        bands = equalizer.create_default_bands(num_bands=10)
        return {
            'success': True,
            'bands': bands
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))