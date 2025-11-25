import numpy as np

class Equalizer:
    def __init__(self):
        self.sample_rate = 44100
    
    def apply_equalizer(self, signal, frequency_bands, sample_rate=44100):
        """
        Apply equalizer adjustments to signal using custom FFT - FIXED
        """
        from app.services.dsp.fft_processor import FFTProcessor
        processor = FFTProcessor()
        
        # Store original signal length for later
        original_length = len(signal)
        print(f"Original signal length: {original_length}")
        
        # Convert to frequency domain - use exact length, no padding for now
        freq_domain = processor.fft(signal)
        n = len(freq_domain)
        
        # Create frequency axis
        freqs = np.fft.fftfreq(n, 1/sample_rate)
        
        # Create output frequency domain (copy of input)
        output_freq = freq_domain.copy()
        
        # DEBUG: Check if we're making any changes
        bands_changed = False
        for band in frequency_bands:
            if band['scale'] != 1.0:
                bands_changed = True
                break
        
        print(f"Equalizer: Processing {n} points, bands changed: {bands_changed}")
        
        # Apply scaling for each frequency band ONLY if scale != 1.0
        for band in frequency_bands:
            low_freq = band['low_freq']
            high_freq = band['high_freq']
            scale = band['scale']
            
            # Skip if no change needed (scale = 1.0)
            if scale == 1.0:
                continue
                
            # Find indices in this frequency range (positive frequencies)
            pos_indices = np.where((freqs >= low_freq) & (freqs <= high_freq) & (freqs >= 0))[0]
            
            # Apply scaling to positive frequencies
            output_freq[pos_indices] = freq_domain[pos_indices] * scale
            
            # Apply same scaling to corresponding negative frequencies (for real signals)
            neg_indices = np.where((freqs <= -low_freq) & (freqs >= -high_freq) & (freqs < 0))[0]
            output_freq[neg_indices] = freq_domain[neg_indices] * scale
        
        # Convert back to time domain
        processed_signal = processor.ifft(output_freq)
        
        # Ensure real output and trim to EXACT original signal length (no padding)
        processed_signal = np.real(processed_signal)
        
        # CRITICAL FIX: Trim to exact original length
        if len(processed_signal) > original_length:
            processed_signal = processed_signal[:original_length]
        elif len(processed_signal) < original_length:
            # This shouldn't happen, but pad if necessary
            processed_signal = np.pad(processed_signal, (0, original_length - len(processed_signal)))
        
        print(f"Processed signal length: {len(processed_signal)}")
        
        # DEBUG: Check if signals are actually different
        if bands_changed:
            max_diff = np.max(np.abs(processed_signal - signal))
            rms_diff = np.sqrt(np.mean((processed_signal - signal)**2))
            print(f"Equalizer: Signals are different - Max diff: {max_diff:.6f}, RMS diff: {rms_diff:.6f}")
        else:
            max_diff = np.max(np.abs(processed_signal - signal))
            print(f"Equalizer: No bands changed, max difference: {max_diff}")
            if max_diff > 1e-10:
                print("WARNING: Signal changed even though no bands were adjusted!")
        
        return processed_signal
    
    def get_frequency_response(self, frequency_bands, sample_rate=44100, n_points=1024):
        """
        Generate frequency response curve for the equalizer settings
        """
        try:
            print(f"Generating frequency response for {len(frequency_bands)} bands")
            
            # Create frequency axis from 20Hz to 20kHz (audible range)
            freqs = np.linspace(20, 20000, n_points)  # Start from 20Hz, not 0
            response = np.ones_like(freqs)  # Start with flat response
            
            for i, band in enumerate(frequency_bands):
                low_freq = band['low_freq']
                high_freq = band['high_freq']
                scale = band['scale']
                
                print(f"Band {i+1}: {low_freq}-{high_freq}Hz, scale: {scale}")
                
                # Find frequencies in this band
                band_mask = (freqs >= low_freq) & (freqs <= high_freq)
                response[band_mask] = scale  # Apply the scale factor
            
            # Return the data
            result = {
                'frequencies': freqs.tolist(),
                'magnitude': response.tolist()
            }
            
            print(f"Generated frequency response with {len(result['frequencies'])} points")
            return result
            
        except Exception as e:
            print(f"Error in get_frequency_response: {e}")
            return {
                'frequencies': [],
                'magnitude': []
            }
    
    def create_default_bands(self, num_bands=10, min_freq=20, max_freq=20000):
        """
        Create logarithmically spaced frequency bands like professional equalizers
        """
        # Logarithmic spacing for frequency bands (like audio equalizers)
        min_log, max_log = np.log10(min_freq), np.log10(max_freq)
        log_freqs = np.logspace(min_log, max_log, num_bands + 1)
        
        bands = []
        for i in range(num_bands):
            low_freq = log_freqs[i]
            high_freq = log_freqs[i + 1]
            
            # Format frequency labels like professional EQs
            if high_freq < 1000:
                label = f"{int(low_freq)}-{int(high_freq)}Hz"
            else:
                label = f"{int(low_freq/1000)}-{int(high_freq/1000)}kHz"
            
            bands.append({
                'id': i + 1,
                'low_freq': low_freq,
                'high_freq': high_freq,
                'scale': 1.0,
                'label': label,
                'center_freq': np.sqrt(low_freq * high_freq)
            })
        
        return bands