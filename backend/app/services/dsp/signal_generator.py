import numpy as np

class SignalGenerator:
    def __init__(self):
        self.sample_rate = 44100
    
    def generate_synthetic_signal(self, frequencies, duration=3.0, sample_rate=44100):
        """
        Create test signal with multiple pure frequencies and harmonics
        """
        t = np.linspace(0, duration, int(sample_rate * duration))
        signal = np.zeros_like(t)
        
        # Add fundamental frequencies
        for i, freq in enumerate(frequencies):
            amplitude = 1.0 / len(frequencies)
            phase = np.random.random() * 2 * np.pi  # Random phase
            signal += amplitude * np.sin(2 * np.pi * freq * t + phase)
        
        # Add some harmonics for richer sound
        for freq in frequencies:
            # Second harmonic
            if freq * 2 < sample_rate / 2:
                signal += 0.3 * np.sin(2 * np.pi * freq * 2 * t)
            # Third harmonic
            if freq * 3 < sample_rate / 2:
                signal += 0.2 * np.sin(2 * np.pi * freq * 3 * t)
        
        # Add some noise for realism
        noise = np.random.normal(0, 0.02, len(signal))
        signal += noise
        
        # Normalize to prevent clipping
        signal = signal / np.max(np.abs(signal)) * 0.8
        
        return signal.tolist(), t.tolist()
    
    def generate_white_noise(self, duration=3.0, sample_rate=44100):
        """Generate white noise signal"""
        t = np.linspace(0, duration, int(sample_rate * duration))
        signal = np.random.normal(0, 0.5, len(t))
        signal = signal / np.max(np.abs(signal)) * 0.8
        return signal.tolist(), t.tolist()
    
    def generate_chirp_signal(self, start_freq=20, end_freq=20000, duration=3.0, sample_rate=44100):
        """Generate frequency sweep signal"""
        t = np.linspace(0, duration, int(sample_rate * duration))
        phase = 2 * np.pi * start_freq * t + np.pi * (end_freq - start_freq) * t**2 / duration
        signal = 0.8 * np.sin(phase)
        return signal.tolist(), t.tolist()
