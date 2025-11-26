import React from 'react';
import './AnimalModePanel.css';

const AnimalModePanel = ({ 
  animalData, 
  isLoadingAnimalData, 
  selectedAnimals, 
  onAnimalSelection,
  maxSelection = 3 
}) => {
  if (!animalData) return null;

  return (
    <div className="animal-selection">
      <h4>Select Animals (Max {maxSelection})</h4>
      <div className="animal-buttons">
        {animalData.modes.custom_generated.map(animal => (
          <button
            key={animal.label}
            className={`animal-btn ${
              selectedAnimals.some(a => a.label === animal.label) ? 'selected' : ''
            }`}
            onClick={() => onAnimalSelection(animal.label)}
            disabled={!selectedAnimals.some(a => a.label === animal.label) && selectedAnimals.length >= maxSelection}
            style={{
              borderLeft: `3px solid ${animal.color}`
            }}
          >
            {animal.label}
          </button>
        ))}
      </div>
      {selectedAnimals.length > 0 && (
        <div className="animal-info">
          <p>Selected: {selectedAnimals.map(a => a.label).join(', ')}</p>
        </div>
      )}
    </div>
  );
};

export default AnimalModePanel;