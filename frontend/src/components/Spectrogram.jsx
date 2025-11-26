import React, { useEffect, useRef } from 'react';
import './Spectrogram.css';

const Spectrogram = ({ title, spectrogramData }) => {
  const canvasRef = useRef();

  useEffect(() => {
    if (!spectrogramData || !spectrogramData.length || !spectrogramData[0].length) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Make canvas width dynamic based on spectrogram length
    const width = Math.max(600, spectrogramData[0].length);
    const height = 400;

    canvas.width = width;
    canvas.height = height;

    const rows = spectrogramData.length;
    const cols = spectrogramData[0].length;

    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    for (let y = 0; y < height; y++) {
      const rowIdx = Math.floor(y / height * rows);
      for (let x = 0; x < width; x++) {
        const colIdx = Math.floor(x / width * cols);
        let value = spectrogramData[rowIdx][colIdx];

        // Normalize and clamp
        value = Math.max(0, Math.min(1, value));

        // Viridis-like colormap
        const r = Math.floor(255 * value);
        const g = Math.floor(255 * (1 - value));
        const b = 128;

        const idx = (y * width + x) * 4;
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // Draw title
    ctx.fillStyle = '#ecf0f1';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(title, 10, 20);
  }, [spectrogramData, title]);

  return (
    <canvas
      ref={canvasRef}
      style={{ border: '1px solid #34495E', borderRadius: '4px', flexShrink: 0 }}
    />
  );
};

export default Spectrogram;
