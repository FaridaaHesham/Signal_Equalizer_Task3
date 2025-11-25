import React, { useEffect, useRef } from 'react';
import './Spectrogram.css';

const Spectrogram = ({ title, spectrogramData }) => {
  const canvasRef = useRef();

  useEffect(() => {
    if (!spectrogramData || !spectrogramData.length || !spectrogramData[0].length) {
      console.log('No spectrogram data available for:', title);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    const data = spectrogramData;
    const rows = data.length;
    const cols = data[0].length;

    console.log(`Spectrogram ${title}: ${rows}x${cols}`);

    // Check if this is a difference spectrogram
    const isDifference = title.toLowerCase().includes('difference');

    // Create appropriate color scale
    const getColor = (value) => {
      if (isDifference) {
        // Difference spectrogram: red for positive (boost), blue for negative (cut), green for zero
        const normalized = Math.max(-1, Math.min(1, value));
        
        if (normalized > 0) {
          // Red scale for positive differences (boost)
          const intensity = Math.min(255, Math.floor(normalized * 255));
          return `rgb(${intensity}, 50, 50)`;
        } else if (normalized < 0) {
          // Blue scale for negative differences (cut)
          const intensity = Math.min(255, Math.floor(-normalized * 255));
          return `rgb(50, 50, ${intensity})`;
        } else {
          // Green for no change
          return 'rgb(50, 150, 50)';
        }
      } else {
        // Normal spectrogram: Viridis-like colors
        const normalized = Math.max(0, Math.min(1, value));
        
        // Enhanced Viridis-like color palette with better contrast
        const colors = [
          [68, 1, 84],    // Dark purple - for low values
          [59, 82, 139],  // Purple-blue
          [33, 145, 140], // Blue-green
          [94, 201, 98],  // Green
          [253, 231, 37], // Yellow
          [255, 165, 0],  // Orange - added for better mid-range
          [255, 50, 50]   // Red - for high values
        ];
        
        const index = Math.floor(normalized * (colors.length - 1));
        const nextIndex = Math.min(index + 1, colors.length - 1);
        const blend = normalized * (colors.length - 1) - index;
        
        const r = Math.round(colors[index][0] + blend * (colors[nextIndex][0] - colors[index][0]));
        const g = Math.round(colors[index][1] + blend * (colors[nextIndex][1] - colors[index][1]));
        const b = Math.round(colors[index][2] + blend * (colors[nextIndex][2] - colors[index][2]));
        
        return `rgb(${r}, ${g}, ${b})`;
      }
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
    ctx.fillText('High Freq', width - 50, 15);
    ctx.fillText('Low Freq', width - 45, height - 5);

    // Add time axis labels
    ctx.fillText('Start', 5, height - 5);
    ctx.fillText('End', width - 25, height - 5);

    // Add colorbar for reference
    const colorbarWidth = 20;
    const colorbarHeight = 100;
    const colorbarX = width - colorbarWidth - 10;
    const colorbarY = 30;

    if (isDifference) {
      // Difference colorbar
      for (let i = 0; i < colorbarHeight; i++) {
        const normalizedValue = (i / colorbarHeight) * 2 - 1; // -1 to 1
        ctx.fillStyle = getColor(normalizedValue);
        ctx.fillRect(colorbarX, colorbarY + i, colorbarWidth, 1);
      }

      // Add colorbar labels
      ctx.fillStyle = '#bdc3c7';
      ctx.font = '8px Arial';
      ctx.fillText('+Boost', colorbarX - 35, colorbarY - 2);
      ctx.fillText('0', colorbarX - 10, colorbarY + colorbarHeight/2);
      ctx.fillText('-Cut', colorbarX - 25, colorbarY + colorbarHeight + 10);
    } else {
      // Normal spectrogram colorbar
      for (let i = 0; i < colorbarHeight; i++) {
        const normalizedValue = i / colorbarHeight;
        ctx.fillStyle = getColor(normalizedValue);
        ctx.fillRect(colorbarX, colorbarY + i, colorbarWidth, 1);
      }

      // Add colorbar labels
      ctx.fillStyle = '#bdc3c7';
      ctx.font = '8px Arial';
      ctx.fillText('High', colorbarX - 15, colorbarY - 2);
      ctx.fillText('Low', colorbarX - 12, colorbarY + colorbarHeight + 10);

      // Add dB scale reference
      ctx.fillText('0 dB', colorbarX - 25, colorbarY - 2);
      ctx.fillText('-80 dB', colorbarX - 30, colorbarY + colorbarHeight + 10);
    }

  }, [spectrogramData, title]);

  return (
    <div className="spectrogram">
      <canvas
        ref={canvasRef}
        width={600}
        height={400}
        style={{ 
          border: '1px solid #34495E',
          borderRadius: '4px'
        }}
      />
    </div>
  );
};

export default Spectrogram;