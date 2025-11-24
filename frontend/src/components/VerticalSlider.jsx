import React, { useState, useRef } from 'react';
import './VerticalSlider.css';

const VerticalSlider = ({ value, min = 0, max = 2, onChange, label, freqLabel }) => {
  const [showValue, setShowValue] = useState(false);
  const sliderRef = useRef(null);

  const handleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setShowValue(true);

    const handleMouseMove = (moveEvent) => {
      if (!sliderRef.current) return;
      
      const rect = sliderRef.current.getBoundingClientRect();
      const y = rect.bottom - moveEvent.clientY;
      const percentage = Math.max(0, Math.min(1, y / rect.height));
      const newValue = min + percentage * (max - min);
      
      onChange(newValue);
    };

    const handleMouseUp = () => {
      setShowValue(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    // Update on initial click
    handleMouseMove(e);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const percentage = ((value - min) / (max - min)) * 100;
  const dbValue = ((value - 1) * 12).toFixed(1);

  return (
    <div className="slider-container">
      <div className="slider-wrapper">
        <div 
          ref={sliderRef}
          className="slider-track"
          onMouseDown={handleMouseDown}
        >
          <div 
            className="slider-thumb"
            style={{ bottom: `${percentage}%` }}
            onMouseDown={handleMouseDown}
          />
          {showValue && (
            <div 
              className="slider-value-tooltip"
              style={{ bottom: `${percentage}%` }}
            >
              {dbValue} dB
            </div>
          )}
        </div>
        <div className="slider-labels">
          <span className="db-value">{dbValue}dB</span>
          <span className="freq-label">{freqLabel}</span>
          <span className="band-label">{label}</span>
        </div>
      </div>
    </div>
  );
};

export default VerticalSlider;