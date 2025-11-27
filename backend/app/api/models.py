import torchaudio
import torch


bundle = torchaudio.pipelines.CONVTASNET_BASE_LIBRI2MIX
model = bundle.get_model()

# Load audio file
waveform, sr = torchaudio.load("people.wav")

# ConvTasNet expects shape: [batch, channel=1, frames]
# After load: waveform = [channels, frames]
if waveform.ndim == 2:
    waveform = waveform.unsqueeze(0)  # -> [1, channels, frames]

# If stereo → convert to mono
if waveform.shape[1] == 2:
    waveform = waveform.mean(dim=1, keepdim=True)  # -> [1, 1, frames]

# Run model
with torch.no_grad():
    estimates = model(waveform)

# estimates shape: [1, 2, frames]
torchaudio.save("speaker1.wav", estimates[0, 0].unsqueeze(0), sr)
torchaudio.save("speaker2.wav", estimates[0, 1].unsqueeze(0), sr)

print("DONE — Files saved as speaker1.wav & speaker2.wav")
