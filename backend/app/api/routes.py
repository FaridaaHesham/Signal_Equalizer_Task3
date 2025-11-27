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

# In routes.py - update the process endpoint
@router.post("/process")
async def process_signal(request: ProcessRequest):
    try:
        # Always start with the original signal, not a previously processed one
        signal = np.array(request.signal, dtype=np.float32)
        frequency_bands = [band.dict() for band in request.frequency_bands]
        
        # Check signal health before processing
        signal_rms = np.sqrt(np.mean(signal**2))
        print(f"Processing signal - Length: {len(signal)}, RMS: {signal_rms:.6f}, Bands: {len(frequency_bands)}")
        
        if signal_rms < 1e-6:  # Signal is too quiet
            print("Warning: Input signal is very quiet, may result in muted output")
        
        # Apply equalizer - this should work on the ORIGINAL signal
        processed_signal = equalizer.apply_equalizer(signal, frequency_bands, request.sample_rate)
        
        # Check output signal health
        processed_rms = np.sqrt(np.mean(processed_signal**2))
        print(f"Processing complete - Output RMS: {processed_rms:.6f}, Length: {len(processed_signal)}")
        
        if processed_rms < 1e-6:
            print("WARNING: Output signal is muted!")
        
        # Compute spectrogram of processed signal
        spectrogram_processed = fft_processor.compute_spectrogram(processed_signal, request.sample_rate)
        
        print(f"Spectrogram of processed signal: {len(spectrogram_processed)} x {len(spectrogram_processed[0]) if spectrogram_processed else 0}")

        return {
            'success': True,
            'processed_signal': processed_signal.tolist(),
            'spectrogram_processed': spectrogram_processed,
            'sample_rate': request.sample_rate,
            'signal_stats': {
                'input_rms': float(signal_rms),
                'output_rms': float(processed_rms)
            }
        }
    except Exception as e:
        print(f"Error in process_signal: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# ===== GET SPECTROGRAM =====
@router.post("/spectrogram")
async def get_spectrogram(request: SpectrogramRequest):
    try:
        signal = np.array(request.signal)
        print(f"Computing spectrogram for signal length: {len(signal)}, sample_rate: {request.sample_rate}")
        
        # Ensure signal is not too long for processing
        max_samples = 60 * request.sample_rate  # 60 seconds max
        if len(signal) > max_samples:
            signal = signal[:max_samples]
            print(f"Signal truncated to {max_samples} samples")
        
        spectrogram = fft_processor.compute_spectrogram(signal, request.sample_rate)
        
        if spectrogram and len(spectrogram) > 0:
            print(f"Spectrogram computed: {len(spectrogram)} x {len(spectrogram[0])}")
            return {
                'success': True,
                'spectrogram': spectrogram,
                'sample_rate': request.sample_rate
            }
        else:
            print("Spectrogram computation returned empty result")
            return {
                'success': False,
                'error': 'Spectrogram computation returned empty result',
                'spectrogram': []
            }
    except Exception as e:
        print(f"Spectrogram error: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            'success': False,
            'error': str(e),
            'spectrogram': []
        }

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
        
        print(f"Uploaded audio - Sample rate: {sample_rate}, Shape: {audio_data.shape}, Dtype: {audio_data.dtype}")
        
        # Handle multi-channel audio
        if len(audio_data.shape) > 1:
            print(f"Converting {audio_data.shape[1]} channels to mono")
            audio_data = np.mean(audio_data, axis=1)
        
        # Convert to float32 and normalize based on data type
        if audio_data.dtype == np.int16:
            audio_data = audio_data.astype(np.float32) / 32768.0
            print("Converted from int16 to float32")
        elif audio_data.dtype == np.int32:
            audio_data = audio_data.astype(np.float32) / 2147483648.0
            print("Converted from int32 to float32")
        elif audio_data.dtype == np.uint8:
            audio_data = (audio_data.astype(np.float32) - 128) / 128.0
            print("Converted from uint8 to float32")
        elif audio_data.dtype == np.float32:
            audio_data = audio_data.astype(np.float32)
            print("Already float32, no conversion needed")
        else:
            print(f"Unsupported dtype: {audio_data.dtype}, attempting generic conversion")
            audio_data = audio_data.astype(np.float32)
            # Normalize based on max possible value for the dtype
            if np.issubdtype(audio_data.dtype, np.integer):
                info = np.iinfo(audio_data.dtype)
                audio_data = audio_data / info.max
        
        # Remove DC offset (center around zero)
        dc_offset = np.mean(audio_data)
        audio_data = audio_data - dc_offset
        print(f"Removed DC offset: {dc_offset:.6f}")
        
        # Normalize to prevent clipping (with headroom)
        max_val = np.max(np.abs(audio_data))
        print(f"Max absolute value before normalization: {max_val:.6f}")
        
        if max_val > 0:
            # Use 0.9 for headroom to prevent clipping
            audio_data = audio_data * (0.9 / max_val)
            print(f"Normalized with factor: {0.9 / max_val:.6f}")
        
        # Limit duration to prevent memory issues
        max_duration = 30  # Increased to 30 seconds
        max_samples = sample_rate * max_duration
        if len(audio_data) > max_samples:
            print(f"Truncating from {len(audio_data)} to {max_samples} samples")
            audio_data = audio_data[:max_samples]
        
        # Final audio statistics
        final_max = np.max(np.abs(audio_data))
        final_rms = np.sqrt(np.mean(audio_data**2))
        print(f"Final audio - Max: {final_max:.6f}, RMS: {final_rms:.6f}, Length: {len(audio_data)}")
        
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
        import traceback
        traceback.print_exc()
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

# ===== SOUND SEPARATION =====
# ===== SOUND SEPARATION FROM SIGNAL =====
class SeparateSoundsRequest(BaseModel):
    signal: List[float]
    sample_rate: int = 44100

# ===== SOUND SEPARATION FROM SIGNAL =====
class SeparateSoundsRequest(BaseModel):
    signal: List[float]
    sample_rate: int = 44100

@router.post("/separate-sounds-from-signal")
async def separate_sounds_from_signal(request: SeparateSoundsRequest):
    try:
        print(f"Separating sounds from signal - Length: {len(request.signal)}, Sample rate: {request.sample_rate}")
        
        # Convert signal to numpy array
        signal = np.array(request.signal, dtype=np.float32)
        
        # Run separation
        result = run_sound_separation_from_signal(signal, request.sample_rate)
        
        if result['success']:
            return {
                'success': True,
                'sound1': result['sound1'],
                'sound2': result['sound2'],
                'sample_rate': result['sample_rate'],
                'duration': result['duration']
            }
        else:
            return {'success': False, 'error': result['error']}
            
    except Exception as e:
        print(f"Error in sound separation from signal: {e}")
        import traceback
        traceback.print_exc()
        return {'success': False, 'error': f'Sound separation failed: {str(e)}'}

def run_sound_separation_from_signal(signal, original_sr):
    """Run sound separation using the trained model on existing signal data"""
    try:
        import torch
        from torch.serialization import safe_globals
        from asteroid.models import ConvTasNet
        import librosa
        import numpy as np
        from scipy.signal import butter, filtfilt
        import os
        
        # Get the current directory where routes.py is located
        current_dir = os.path.dirname(os.path.abspath(__file__))
        CKPT_PATH = os.path.join(current_dir, "model.pth")
        
        print(f"Looking for model at: {CKPT_PATH}")
        
        # Check if model file exists
        if not os.path.exists(CKPT_PATH):
            error_msg = f"Model file not found at {CKPT_PATH}. Please ensure model.pth is in the same directory as routes.py"
            print(error_msg)
            return {'success': False, 'error': error_msg}
        
        device = "cuda" if torch.cuda.is_available() else "cpu"
        TARGET_SR = 16000
        
        print(f"Loading model from {CKPT_PATH}...")
        
        # Load model
        with safe_globals([np._core.multiarray.scalar]):
            conf = torch.load(CKPT_PATH, map_location="cpu", weights_only=False)

        model_conf = conf["model_args"]
        state_dict = conf["state_dict"]

        print(f"Creating model with config: {model_conf}")
        
        model = ConvTasNet(**model_conf)
        model.load_state_dict(state_dict)
        model.to(device)
        model.eval()

        print("Model loaded successfully")

        # Use the provided signal
        data = np.array(signal, dtype=np.float32)
        
        # Check signal health
        signal_rms = np.sqrt(np.mean(data**2))
        print(f"Input signal - RMS: {signal_rms:.6f}, Length: {len(data)}")

        # Resample if needed to target sample rate
        if original_sr != TARGET_SR:
            print(f"Resampling from {original_sr}Hz to {TARGET_SR}Hz")
            data = librosa.resample(data, orig_sr=original_sr, target_sr=TARGET_SR)
        else:
            data = data.copy()

        # Ensure the signal is in the right range and clean
        peak = np.max(np.abs(data)) + 1e-8
        data = data / peak

        mix = data
        sr = TARGET_SR

        print(f"Running separation on {len(mix)} samples at {sr}Hz")

        # Run separation
        mix_t = torch.tensor(mix, dtype=torch.float32, device=device).unsqueeze(0)

        with torch.no_grad():
            est_sources = model(mix_t)

        est_sources = est_sources.squeeze(0).cpu().numpy()
        
        print(f"Separation complete - Output shapes: {est_sources.shape}")

        # Apply cleaning filters
        def spectral_gate(wav, sr, prop_decrease=0.8, n_fft=1024, hop_length=256, n_std_thresh=1.5):
            S = librosa.stft(wav, n_fft=n_fft, hop_length=hop_length)
            magnitude, phase = np.abs(S), np.angle(S)

            mag_db = librosa.amplitude_to_db(magnitude, ref=np.max)
            noise_db = np.percentile(mag_db, 10, axis=1, keepdims=True)
            thresh_db = noise_db + n_std_thresh * np.std(mag_db - noise_db, axis=1, keepdims=True)

            mask = mag_db > thresh_db
            magnitude_denoised = magnitude * (mask + prop_decrease * (~mask))

            S_denoised = magnitude_denoised * np.exp(1j * phase)
            wav_denoised = librosa.istft(S_denoised, hop_length=hop_length, length=len(wav))
            return wav_denoised

        def bandpass_for_speech(wav, sr, low_hz=80.0, high_hz=8000.0, order=6):
            nyq = 0.5 * sr
            high_hz_clamped = min(high_hz, nyq * 0.95)
            low_hz_clamped = max(low_hz, 10.0)
            low = low_hz_clamped / nyq
            high = high_hz_clamped / nyq
            if not (0 < low < high < 1):
                return wav
            b, a = butter(order, [low, high], btype="band")
            return filtfilt(b, a, wav)

        def clean_source(wav, sr):
            w = spectral_gate(wav, sr)
            w = bandpass_for_speech(w, sr)
            peak = np.max(np.abs(w)) + 1e-8
            w = w / peak * 0.9
            return w

        # Clean separated sources
        print("Cleaning separated sources...")
        spk1 = clean_source(est_sources[0], sr)
        spk2 = clean_source(est_sources[1], sr)
        
        # Resample back to original sample rate for consistency
        print(f"Resampling back to {original_sr}Hz")
        spk1_original_sr = librosa.resample(spk1, orig_sr=sr, target_sr=original_sr)
        spk2_original_sr = librosa.resample(spk2, orig_sr=sr, target_sr=original_sr)
        
        # Limit duration to prevent large data transfers
        max_duration = 30
        max_samples = original_sr * max_duration
        if len(spk1_original_sr) > max_samples:
            spk1_original_sr = spk1_original_sr[:max_samples]
            spk2_original_sr = spk2_original_sr[:max_samples]

        print(f"Separation complete - Sound1: {len(spk1_original_sr)}, Sound2: {len(spk2_original_sr)}")

        return {
            'success': True,
            'sound1': spk1_original_sr.tolist(),
            'sound2': spk2_original_sr.tolist(),
            'sample_rate': original_sr,
            'duration': len(spk1_original_sr) / original_sr
        }
        
    except Exception as e:
        print(f"Sound separation from signal error: {e}")
        import traceback
        traceback.print_exc()
        return {'success': False, 'error': str(e)}