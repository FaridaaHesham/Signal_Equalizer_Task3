import numpy as np

class Equalizer:
    def __init__(self):
        self.sample_rate = 44100
    
    def apply_equalizer(self, signal, frequency_bands, sample_rate=44100):
        """
        Apply equalizer adjustments to signal using custom FFT
        """
        from app.services.dsp.fft_processor import FFTProcessor
        processor = FFTProcessor()
        
        # Convert to frequency domain
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
        
        # Ensure real output and same length as input
        processed_signal = np.real(processed_signal)
        
        # Trim to original signal length to avoid padding issues
        if len(processed_signal) > len(signal):
            processed_signal = processed_signal[:len(signal)]
        elif len(processed_signal) < len(signal):
            processed_signal = np.pad(processed_signal, (0, len(signal) - len(processed_signal)))
        
        # DEBUG: Check if signals are different when they shouldn't be
        if not bands_changed:
            max_diff = np.max(np.abs(processed_signal - signal))
            print(f"Equalizer: No bands changed, max difference: {max_diff}")
            if max_diff > 1e-10:
                print("WARNING: Signal changed even though no bands were adjusted!")
        
        return processed_signal
    
    def get_frequency_response(self, frequency_bands, sample_rate=44100, n_points=1024):
        """
        Generate frequency response curve for the equalizer settings
        """
        freqs = np.linspace(0, sample_rate/2, n_points)
        response = np.ones_like(freqs)
        
        for band in frequency_bands:
            low_freq = band['low_freq']
            high_freq = band['high_freq']
            scale = band['scale']
            
            # Find frequencies in this band
            band_mask = (freqs >= low_freq) & (freqs <= high_freq)
            response[band_mask] = scale
        
        return {
            'frequencies': freqs.tolist(),
            'magnitude': response.tolist()
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