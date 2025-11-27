# equalizer.py
import numpy as np
from app.services.dsp.fft_processor import FFTProcessor  # Import your FFT processor

class Equalizer:
    def __init__(self):
        self.sample_rate = 44100
        self.fft_processor = FFTProcessor()  # Initialize your FFT processor
    
    def apply_equalizer(self, signal, frequency_bands, sample_rate=44100):
        """
        Apply equalizer with proper signal preservation using custom FFT
        """
        try:
            # Always work with the original signal, don't accumulate processing
            signal = np.array(signal, dtype=np.float64)  # Use float64 for precision
            original_length = len(signal)
            
            print(f"Equalizer processing - Signal length: {original_length}, RMS: {np.sqrt(np.mean(signal**2)):.6f}")
            
            # Only apply windowing if we're doing FFT on the entire signal
            # For equalization, we need to preserve the original signal shape
            if len(signal) < 2048:  # Only window short signals
                window = np.hanning(original_length)
                windowed_signal = signal * window
            else:
                windowed_signal = signal.copy()
            
            # Compute FFT using YOUR CUSTOM IMPLEMENTATION
            freq_domain = self.fft_processor.fft(windowed_signal)
            n = len(freq_domain)
            
            # Create frequency array manually (since we're not using np.fft.fftfreq)
            freqs = np.array([(k * sample_rate) / n for k in range(n)])
            # Shift frequencies to match np.fft.fftfreq format (negative then positive)
            freqs = np.where(freqs > sample_rate/2, freqs - sample_rate, freqs)
            
            # Create output frequency domain
            output_freq = freq_domain.copy()
            
            # Track if any bands actually modify the signal
            bands_applied = 0
            
            # Apply frequency band adjustments
            for band in frequency_bands:
                low_freq = band['low_freq']
                high_freq = band['high_freq']
                scale = band['scale']
                
                if scale == 1.0:
                    continue
                    
                bands_applied += 1
                    
                # Apply to positive frequencies
                pos_mask = (freqs >= low_freq) & (freqs <= high_freq) & (freqs >= 0)
                output_freq[pos_mask] = freq_domain[pos_mask] * scale
                
                # Apply to negative frequencies (symmetric)
                neg_mask = (freqs <= -low_freq) & (freqs >= -high_freq) & (freqs < 0)
                output_freq[neg_mask] = freq_domain[neg_mask] * scale
            
            print(f"Bands applied: {bands_applied}")
            
            # Only do IFFT if bands were actually applied
            if bands_applied > 0:
                # Use your custom IFFT implementation
                processed_signal = self.fft_processor.ifft(output_freq)
            else:
                processed_signal = signal.copy()  # Return original if no changes
            
            # Remove any windowing effects by ensuring proper scaling
            if len(signal) < 2048:
                # Compensate for windowing
                processed_signal = processed_signal / window
                # Remove any infinities from division
                processed_signal = np.nan_to_num(processed_signal, nan=0.0, posinf=0.0, neginf=0.0)
            
            # Ensure proper length
            if len(processed_signal) > original_length:
                processed_signal = processed_signal[:original_length]
            elif len(processed_signal) < original_length:
                processed_signal = np.pad(processed_signal, (0, original_length - len(processed_signal)))
            
            # Preserve original signal level - don't over-normalize
            original_rms = np.sqrt(np.mean(signal**2))
            processed_rms = np.sqrt(np.mean(processed_signal**2))
            
            if processed_rms > 0 and original_rms > 0:
                # Maintain similar RMS level to original
                level_ratio = original_rms / processed_rms
                if 0.1 < level_ratio < 10:  # Only adjust if within reasonable range
                    processed_signal = processed_signal * level_ratio
            
            # Gentle limiting instead of hard normalization
            max_val = np.max(np.abs(processed_signal))
            if max_val > 0.95:
                # Soft clipping to preserve dynamics
                processed_signal = np.tanh(processed_signal * 0.9) * 0.95
            
            final_rms = np.sqrt(np.mean(processed_signal**2))
            print(f"Equalizer complete - Output RMS: {final_rms:.6f}, Max: {np.max(np.abs(processed_signal)):.6f}")
            
            return processed_signal.astype(np.float32)  # Convert back to float32 for transmission
            
        except Exception as e:
            print(f"Error in equalizer: {e}")
            import traceback
            traceback.print_exc()
            return signal.astype(np.float32)  # Return original signal on error
    
    def get_frequency_response(self, frequency_bands, sample_rate=44100, n_points=1024):
        freqs = np.linspace(20, 20000, n_points)
        response = np.ones_like(freqs)
        for band in frequency_bands:
            mask = (freqs >= band['low_freq']) & (freqs <= band['high_freq'])
            response[mask] = band['scale']
        return {'frequencies': freqs.tolist(), 'magnitude': response.tolist()}
    
    def create_default_bands(self, num_bands=10, min_freq=20, max_freq=20000):
        min_log, max_log = np.log10(min_freq), np.log10(max_freq)
        log_freqs = np.logspace(min_log, max_log, num_bands + 1)
        bands = []
        for i in range(num_bands):
            bands.append({
                'id': i+1,
                'low_freq': log_freqs[i],
                'high_freq': log_freqs[i+1],
                'scale': 1.0,
                'label': f"{int(log_freqs[i])}-{int(log_freqs[i+1])}Hz",
                'center_freq': np.sqrt(log_freqs[i]*log_freqs[i+1])
            })
        return bands