import numpy as np

class Equalizer:
    def __init__(self):
        self.sample_rate = 44100
    
    def apply_equalizer(self, signal, frequency_bands, sample_rate=44100):
        from app.services.dsp.fft_processor import FFTProcessor
        processor = FFTProcessor()
        
        original_length = len(signal)
        freq_domain = processor.fft(signal)
        n = len(freq_domain)
        freqs = np.fft.fftfreq(n, 1/sample_rate)
        output_freq = freq_domain.copy()
        
        for band in frequency_bands:
            low_freq = band['low_freq']
            high_freq = band['high_freq']
            scale = band['scale']
            if scale == 1.0:
                continue
            pos_indices = np.where((freqs >= low_freq) & (freqs <= high_freq) & (freqs >= 0))[0]
            output_freq[pos_indices] = freq_domain[pos_indices] * scale
            neg_indices = np.where((freqs <= -low_freq) & (freqs >= -high_freq) & (freqs < 0))[0]
            output_freq[neg_indices] = freq_domain[neg_indices] * scale
        
        processed_signal = processor.ifft(output_freq)
        processed_signal = np.real(processed_signal)
        processed_signal = processed_signal[:original_length] if len(processed_signal) > original_length else processed_signal
        
        return processed_signal
    
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
