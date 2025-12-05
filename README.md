# Project Overview

***

## Core Technical Architecture(Shared across all 3 modes)

#### Signal Processing Pipeline
- Custom Cooley-Tukey FFT/IFFT engine with zero-padding and radix-2 optimization.
- Multi-band frequency-domain equalization with RMS normalization and soft clipping.
- Real-time spectrogram generation and frequency response visualization.

#### AI Sound Separation
- ConvTasNet deep learning model for source separation (up to 2 simultaneous sources).
- Spectral gating and bandpass filtering with artifact reduction.
- Mode-adaptive model weights for optimal performance.

  <img width="606" height="474" alt="Image" src="https://github.com/user-attachments/assets/5275097e-21b4-489c-a349-9766662eb126" />
  
#### Configuration & Real-time Framework
- Dynamic JSON configuration for frequency bands and processing parameters.

  <img width="643" height="251" alt="Image" src="https://github.com/user-attachments/assets/09275e85-38e1-4249-b2d4-b3010292bfda" />
  
#### Visualization Tools
- Input and output time and frequency domains graphs.
- Spectrogram for comparison.
- Frequency response graph.
***

## Animal Mode

### Overview

Animal Mode focuses on natural animal vocalizations and bioacoustic signals. Frequency bands are dynamically created based on animal vocalization ranges to optimize processing for different species and sound types.

<img width="1911" height="891" alt="Image" src="https://github.com/user-attachments/assets/046eb685-587e-4c8b-a0a4-724f17454865" />

***

## Human Mode

### Overview

Human Mode targets speech and vocal content, delivering advanced speech processing, speaker separation, and voice enhancement tailored to male, female, and child voices.
<img width="1913" height="893" alt="Image" src="https://github.com/user-attachments/assets/b9ed5827-a47b-4a72-9c85-d8181da2a1dc" />
***

## Instruments Mode

### Overview

Instruments Mode provides tailored processing for musical instruments, emphasizing polyphonic separation, timbre preservation, and accurate transient and harmonic handling.
<img width="1917" height="893" alt="Image" src="https://github.com/user-attachments/assets/9ca22243-891a-45f2-afdb-28bdcdbc9edf" />
***
