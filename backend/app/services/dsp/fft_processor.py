import numpy as np
import math

class FFTProcessor:
    def __init__(self):
        self.nyquist_limit = 0

    # ============================================================
    #  FFT / IFFT
    # ============================================================
    def fft(self, x):
        """Cooley–Tukey FFT with automatic zero-padding."""
        n = len(x)
        if n <= 1:
            return x.astype(complex)

        # Zero-pad to next power of 2
        if (n & (n - 1)) != 0:
            next_pow = 2 ** math.ceil(math.log2(n))
            x = np.pad(x, (0, next_pow - n), mode="constant")
            n = next_pow

        return self.fft_iterative(x)

    def fft_iterative(self, x):
        """Iterative radix-2 FFT."""
        n = len(x)
        x = x.astype(complex)

        # ----- Bit-reversal -----
        j = 0
        for i in range(1, n):
            bit = n >> 1
            while j & bit:
                j ^= bit
                bit >>= 1
            j ^= bit
            if i < j:
                x[i], x[j] = x[j], x[i]

        # ----- Butterfly stages -----
        length = 2
        while length <= n:
            half = length // 2
            w = np.exp(-2j * np.pi * np.arange(half) / length)
            for start in range(0, n, length):
                for k in range(half):
                    u = x[start + k]
                    v = w[k] * x[start + k + half]
                    x[start + k] = u + v
                    x[start + k + half] = u - v
            length <<= 1

        return x

    def ifft(self, X):
        """Inverse FFT using conjugate symmetry."""
        X = np.asarray(X, dtype=complex)
        n = len(X)
        return np.real(self.fft(np.conjugate(X)).conjugate() / n)

    # ============================================================
    #  FFT SPECTRUM
    # ============================================================
    def compute_fft_spectrum(self, signal, sample_rate, target_length=1024):
        try:
            signal = np.array(signal, dtype=np.float64)

            # Remove DC
            signal = signal - np.mean(signal)

            # Windowing
            signal *= np.hanning(len(signal))

            # Downsample for visualization
            if len(signal) > target_length:
                step = max(1, len(signal) // target_length)
                signal = signal[::step]

            if len(signal) == 0:
                return {"magnitude": [], "frequencies": []}

            # Apply FFT (your FFT)
            fft_result = self.fft(signal)
            n = len(fft_result)

            # Positive frequencies only
            mag = np.abs(fft_result[:n // 2]) / (len(signal))  # normalize correctly
            freqs = np.array([(k * sample_rate) / n for k in range(n // 2)])

            # Only 0 < f <= Nyquist
            valid = (freqs > 0) & (freqs <= sample_rate / 2)
            mag = mag[valid]
            freqs = freqs[valid]

            # Convert to dB scale
            mag = 20 * np.log10(mag + 1e-12)
            mag = np.clip(mag, -80, 0)
            mag = (mag + 80) / 80

            return {"magnitude": mag.tolist(), "frequencies": freqs.tolist()}

        except Exception as e:
            print("Error in compute_fft_spectrum:", e)
            return {"magnitude": [], "frequencies": []}

    # ============================================================
    #  SPECTROGRAM
    # ============================================================
    def compute_spectrogram(self, signal, sample_rate, n_fft=1024, hop_length=None):
        """Spectrogram using your OWN FFT implementation."""
        try:
            signal = np.array(signal, dtype=float)
            hop = hop_length or n_fft // 2

            # Pad so last frame fits
            pad = (n_fft - (len(signal) % hop)) % hop
            signal = np.pad(signal, (0, pad), mode="constant")

            frames = []
            for start in range(0, len(signal) - n_fft + 1, hop):
                frame = signal[start:start + n_fft]
                frame *= np.hanning(n_fft)

                fft_frame = self.fft(frame)[:n_fft // 2]
                mag = np.abs(fft_frame)

                frames.append(mag.tolist())

            return frames

        except Exception as e:
            print("Error in compute_spectrogram:", e)
            return []

    # ============================================================
    #  SPECTROGRAM NORMALIZATION
    # ============================================================
    def normalize_spectrogram(self, spectrogram):
        spec = np.array(spectrogram)
        spec = spec - spec.min()
        maxv = spec.max()
        if maxv > 0:
            spec = spec / maxv
        return spec.tolist()

    # ============================================================
    #  FREQUENCY BINS
    # ============================================================
    def get_frequency_bins(self, signal_length, sample_rate):
        """Return positive bins matching your FFT (no numpy)."""
        n = signal_length
        return np.array([(k * sample_rate) / n for k in range(n // 2)])
