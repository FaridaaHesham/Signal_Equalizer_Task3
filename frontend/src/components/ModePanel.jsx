// ModePanel.jsx
import React from 'react';
import './ModePanel.css';

const ModePanel = ({ 
  modeData, 
  isLoading, 
  selectedItems, 
  onItemSelection,
  maxSelection = 3,
  title = "Select Items"
}) => {
  if (!modeData) return null;

  return (
    <div className="mode-selection-panel">
      <h4>{title} (Max {maxSelection})</h4>
      <div className="mode-buttons">
        {modeData.modes.custom_generated.map(item => (
          <button
            key={item.label}
            className={`mode-btn ${
              selectedItems.some(selected => selected.label === item.label) ? 'selected' : ''
            }`}
            onClick={() => onItemSelection(item.label)}
            disabled={!selectedItems.some(selected => selected.label === item.label) && selectedItems.length >= maxSelection}
            style={{
              borderLeft: `3px solid ${item.color}`
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      {selectedItems.length > 0 && (
        <div className="mode-info">
          <p>Selected: {selectedItems.map(item => item.label).join(', ')}</p>
        </div>
      )}
    </div>
  );
};

export default ModePanel;