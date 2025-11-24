import React, { useEffect, useRef } from 'react';
// Import specific D3 modules
import { max } from 'd3';
import './Spectrogram.css';

const Spectrogram = ({ title, spectrogramData }) => {
  const canvasRef = useRef();

  useEffect(() => {
    if (!spectrogramData || !spectrogramData.length) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    const data = spectrogramData;
    const rows = data.length;
    const cols = data[0].length;

    // Find maximum value for normalization
    const maxVal = max(data.flat());
    if (maxVal === 0) return;

    // Create color scale manually (Viridis-like colors)
    const getColor = (value) => {
      const normalized = value / maxVal;
      // Simple viridis-like color gradient
      if (normalized < 0.25) return `rgb(68, 1, 84, ${normalized * 4})`;
      if (normalized < 0.5) return `rgb(59, 82, 139, ${normalized * 4})`;
      if (normalized < 0.75) return `rgb(33, 145, 140, ${normalized * 4})`;
      return `rgb(94, 201, 98, ${normalized * 4})`;
    };

    // Draw spectrogram
    const cellWidth = width / cols;
    const cellHeight = height / rows;

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const value = data[i][j];
        ctx.fillStyle = getColor(value);
        ctx.fillRect(j * cellWidth, (rows - i - 1) * cellHeight, cellWidth, cellHeight);
      }
    }

    // Add border
    ctx.strokeStyle = '#34495E';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, width, height);

    // Add title
    ctx.fillStyle = '#ecf0f1';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(title, 10, 20);

    // Add frequency axis labels
    ctx.font = '10px Arial';
    ctx.fillStyle = '#bdc3c7';
    ctx.fillText('High', width - 30, 15);
    ctx.fillText('Low', width - 30, height - 5);

    // Add time axis labels
    ctx.fillText('Start', 5, height - 5);
    ctx.fillText('End', width - 20, height - 5);

  }, [spectrogramData, title]);

  return (
    <div className="spectrogram">
      <canvas
        ref={canvasRef}
        width={500}
        height={300}
      />
    </div>
  );
};

export default Spectrogram;