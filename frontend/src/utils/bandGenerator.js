// bandGenerator.js
export const generateBands = (items, modeType) => {
  if (!items || items.length === 0) {
    console.log(`No ${modeType} selected for band generation`);
    return [];
  }
  
  return items.map((item, index) => {
    const mainRange = item.ranges[0];
    const lowFreq = mainRange[0];
    const highFreq = mainRange[1];
    
    const band = {
      id: index + 1,
      low_freq: lowFreq,
      high_freq: highFreq,
      scale: 1.0,
      label: item.label,
      center_freq: Math.sqrt(lowFreq * highFreq),
      color: item.color
    };
    
    // Add mode-specific property
    band[modeType] = item;
    
    return band;
  });
};

export const handleItemSelection = (currentItems, newItemLabel, modeData, maxSelection = 3) => {
  if (!modeData) return currentItems;
  
  const item = modeData.modes.custom_generated.find(i => i.label === newItemLabel);
  if (!item) return currentItems;

  const isSelected = currentItems.some(i => i.label === newItemLabel);
  
  if (isSelected) {
    return currentItems.length > 1 
      ? currentItems.filter(i => i.label !== newItemLabel)
      : currentItems;
  } else {
    if (currentItems.length < maxSelection) {
      return [...currentItems, item];
    } else {
      return [...currentItems.slice(0, maxSelection - 1), item];
    }
  }
};

// Convenience functions for specific modes
export const generateAnimalBands = (animals) => generateBands(animals, 'animal');
export const generateHumanBands = (humans) => generateBands(humans, 'human');
export const generateInstrumentBands = (instruments) => generateBands(instruments, 'instrument');

export const handleAnimalSelection = (currentAnimals, newAnimalLabel, animalData, maxSelection = 3) => 
  handleItemSelection(currentAnimals, newAnimalLabel, animalData, maxSelection);

export const handleHumanSelection = (currentHumans, newHumanLabel, humanData, maxSelection = 3) => 
  handleItemSelection(currentHumans, newHumanLabel, humanData, maxSelection);

export const handleInstrumentSelection = (currentInstruments, newInstrumentLabel, instrumentData, maxSelection = 3) => 
  handleItemSelection(currentInstruments, newInstrumentLabel, instrumentData, maxSelection);