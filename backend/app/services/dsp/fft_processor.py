import numpy as np
import math

class FFTProcessor:
    def __init__(self):
        self.nyquist_limit = 0
    
    # =========================
    # FFT / IFFT
    # =========================
    def fft(self, x):
        """
        Cooley-Tukey FFT algorithm (optimized).
        Pads signal to next power of 2 if needed.
        """
        n = len(x)
        if n <= 1:
            return x
        
        # Zero-pad to next power of 2 if necessary
        if n & (n - 1) != 0:
            next_power = 2 ** math.ceil(math.log2(n))
            x = np.pad(x, (0, next_power - n), 'constant')
            n = next_power
        
        # Use iterative FFT
        return self.fft_iterative(x)
    
    def fft_iterative(self, x):
        """
        Iterative FFT implementation.
        """
        n = len(x)
        x = x.astype(complex)
        
        # Bit-reversal permutation
        j = 0
        for i in range(1, n):
            bit = n >> 1
            while j >= bit:
                j -= bit
                bit >>= 1
            j += bit
            if i < j:
                x[i], x[j] = x[j], x[i]
        
        # Iterative FFT computation
        length = 2
        while length <= n:
            half_len = length // 2
            factors = np.exp(-2j * np.pi * np.arange(half_len) / length)
            for i in range(0, n, length):
                for j in range(half_len):
                    idx = i + j
                    u = x[idx]
                    v = factors[j] * x[idx + half_len]
                    x[idx] = u + v
                    x[idx + half_len] = u - v
            length <<= 1
        
        return x
    
    def ifft(self, X):
        """
        Compute inverse FFT.
        """
        n = len(X)
        x_conj = np.conjugate(X)
        x_fft = self.fft(x_conj)
        x = np.conjugate(x_fft) / n
        return np.real(x)
    
    # =========================
    # FFT Spectrum
    # =========================
    def compute_fft_spectrum(self, signal, sample_rate, target_length=1024):
        """
        Compute FFT magnitude spectrum for visualization.
        Returns positive frequencies only.
        """
        try:
            signal = np.array(signal, dtype=np.float32)
        
            # Remove DC offset
            signal = signal - np.mean(signal)
        
            # Apply windowing to reduce spectral leakage
            window = np.hanning(len(signal))
            signal = signal * window
        
            # Downsample signal if too long for visualization
            if len(signal) > target_length:
                step = max(1, len(signal) // target_length)
                signal = signal[::step]
        
            if len(signal) == 0:
                return {'magnitude': [], 'frequencies': []}
        
            fft_result = self.fft(signal)
            n = len(fft_result)
        
            # Compute magnitude spectrum
            magnitude = np.abs(fft_result[:n//2]) / n
            frequencies = np.fft.fftfreq(n, 1/sample_rate)[:n//2]
        
            # Keep only positive frequencies and apply smoothing
            valid_indices = (frequencies > 0) & (frequencies <= sample_rate/2)
            magnitude = np.nan_to_num(magnitude[valid_indices], nan=0.0, posinf=0.0, neginf=0.0)
            frequencies = np.nan_to_num(frequencies[valid_indices], nan=0.0, posinf=0.0, neginf=0.0)
        
            # Apply logarithmic scaling for better visualization
            magnitude = 20 * np.log10(magnitude + 1e-10)  # Add small value to avoid log(0)
            magnitude = np.clip(magnitude, -80, 0)  # Clip to reasonable range
            magnitude = (magnitude + 80) / 80  # Normalize to 0-1
        
            return {'magnitude': magnitude.tolist(), 'frequencies': frequencies.tolist()}
    
        except Exception as e:
            print(f"Error in compute_fft_spectrum: {e}")
            import traceback
            traceback.print_exc()
            return {'magnitude': [], 'frequencies': []}
    
    # =========================
    # Spectrogram
    # =========================
    def compute_spectrogram(self, signal, sample_rate, n_fft=1024, hop_length=None):
        """
        Compute magnitude spectrogram (time x frequency bins) of a signal.
        Returns a 2D list (frames x frequency bins).
        """
        try:
            signal = np.array(signal, dtype=float)
            hop_length = hop_length or n_fft // 2  # 50% overlap

            # Pad signal to fit last frame
            pad_width = (n_fft - len(signal) % hop_length) % hop_length
            signal = np.pad(signal, (0, pad_width), mode='constant')

            frames = []
            for start in range(0, len(signal) - n_fft + 1, hop_length):
                frame = signal[start:start+n_fft] * np.hanning(n_fft)
                fft_frame = np.fft.fft(frame)[:n_fft//2]
                magnitude = np.abs(fft_frame)
                frames.append(magnitude.tolist())

            return frames
        except Exception as e:
            print(f"Error in compute_spectrogram: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    def normalize_spectrogram(self, spectrogram):
        """
        Normalize spectrogram to [0,1] for visualization.
        """
        spec = np.array(spectrogram)
        spec -= spec.min()
        if spec.max() > 0:
            spec /= spec.max()
        return spec.tolist()
    
    # =========================
    # Frequency bins
    # =========================
    def get_frequency_bins(self, signal_length, sample_rate):
        """
        Return positive frequency bins for a given signal length and sample rate.
        """
        freqs = np.fft.fftfreq(signal_length, 1/sample_rate)
        return np.array([f for f in freqs if f >= 0])
