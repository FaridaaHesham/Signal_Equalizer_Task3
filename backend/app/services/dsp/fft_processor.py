import numpy as np
import math

class FFTProcessor:
    def __init__(self):
        self.nyquist_limit = 0
    
    def fft(self, x):
        """
        Cooley-Tukey FFT algorithm implementation - OPTIMIZED
        """
        n = len(x)
        if n <= 1:
            return x
        
        # Check if n is power of 2, if not, zero-pad
        if n & (n - 1) != 0:
            # Find next power of 2
            next_power = 2 ** math.ceil(math.log2(n))
            x = np.pad(x, (0, next_power - n), 'constant')
            n = next_power
        
        # ALWAYS use iterative for better performance
        return self.fft_iterative(x)
    
    def fft_iterative(self, x):
        """
        Iterative FFT implementation - optimized
        """
        n = len(x)
        x = x.astype(complex)  # Ensure complex type
        
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
        
        # Iterative FFT - optimized
        length = 2
        while length <= n:
            half_len = length // 2
            # Precompute factors for better performance
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
        Inverse FFT implementation - FIXED
        """
        n = len(X)
        
        # Proper IFFT: conjugate, apply FFT, conjugate and scale
        x_conj = np.conjugate(X)
        x_fft = self.fft(x_conj)
        x = np.conjugate(x_fft) / n
        
        return np.real(x)
    
    def compute_fft_spectrum(self, signal, sample_rate):
        """
        Compute FFT spectrum optimized for visualization - SUPER FAST
        """
        try:
            # MAJOR OPTIMIZATION: Use much smaller FFT for visualization
            target_length = 1024  # Perfect for visualization
            
            if len(signal) > target_length:
                # Efficient downsampling - take every Nth sample
                step = max(1, len(signal) // target_length)
                signal = signal[::step]
            
            # Ensure signal is not empty
            if len(signal) == 0:
                return {'magnitude': [], 'frequencies': []}
            
            # Use our custom FFT
            fft_result = self.fft(signal)
            n = len(fft_result)
            
            # Calculate magnitude and frequencies
            magnitude = np.abs(fft_result[:n//2]) / n
            frequencies = np.fft.fftfreq(n, 1/sample_rate)[:n//2]
            
            # Ensure no NaN/inf values
            magnitude = np.nan_to_num(magnitude, nan=0.0, posinf=0.0, neginf=0.0)
            frequencies = np.nan_to_num(frequencies, nan=0.0, posinf=0.0, neginf=0.0)
            
            # Filter out negative frequencies
            valid_indices = frequencies > 0
            magnitude = magnitude[valid_indices]
            frequencies = frequencies[valid_indices]
            
            return {
                'magnitude': magnitude.tolist(),
                'frequencies': frequencies.tolist()
            }
        except Exception as e:
            print(f"Error in compute_fft_spectrum: {e}")
            return {
                'magnitude': [],
                'frequencies': []
            }
    
    def compute_spectrogram(self, signal, sample_rate, window_size=512, hop_size=128):  # Smaller windows for speed
        """
        Compute spectrogram using STFT with our custom FFT - OPTIMIZED
        """
        n = len(signal)
        
        # Use smaller windows for better performance
        if n < window_size:
            signal = np.pad(signal, (0, window_size - n), 'constant')
            n = window_size
        
        # Calculate number of windows
        num_windows = 1 + (n - window_size) // hop_size
        
        # Initialize spectrogram matrix
        spectrogram = []
        
        for i in range(num_windows):
            start = i * hop_size
            end = start + window_size
            
            if end > n:
                break
                
            # Extract window and apply Hamming window
            window = signal[start:end]
            window = window * np.hamming(len(window))
            
            # Compute FFT using our custom implementation
            fft_result = self.fft(window)
            magnitude = np.abs(fft_result[:window_size // 2])
            
            spectrogram.append(magnitude)
        
        # Convert to numpy array and transpose (time vs frequency)
        return np.array(spectrogram).T
    
    def get_frequency_bins(self, signal_length, sample_rate):
        """
        Get frequency bins for FFT results
        """
        freqs = np.fft.fftfreq(signal_length, 1/sample_rate)
        return freqs[:signal_length//2]  # Return only positive frequencies