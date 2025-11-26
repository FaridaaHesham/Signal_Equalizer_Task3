export const generateAnimalBands = (animals) => {
  if (!animals || animals.length === 0) {
    console.log('No animals selected for band generation');
    return [];
  }
  
  return animals.map((animal, index) => {
    const mainRange = animal.ranges[0];
    const lowFreq = mainRange[0];
    const highFreq = mainRange[1];
    
    return {
      id: index + 1,
      low_freq: lowFreq,
      high_freq: highFreq,
      scale: 1.0,
      label: animal.label,
      center_freq: Math.sqrt(lowFreq * highFreq),
      animal: animal,
      color: animal.color
    };
  });
};

export const handleAnimalSelection = (currentAnimals, newAnimalLabel, animalData, maxSelection = 3) => {
  if (!animalData) return currentAnimals;
  
  const animal = animalData.modes.custom_generated.find(a => a.label === newAnimalLabel);
  if (!animal) return currentAnimals;

  const isSelected = currentAnimals.some(a => a.label === newAnimalLabel);
  
  if (isSelected) {
    // Remove animal if already selected (but ensure at least one remains)
    return currentAnimals.length > 1 
      ? currentAnimals.filter(a => a.label !== newAnimalLabel)
      : currentAnimals;
  } else {
    // Add animal if not selected (respect max selection limit)
    if (currentAnimals.length < maxSelection) {
      return [...currentAnimals, animal];
    } else {
      // Replace the last one if we already have max
      return [...currentAnimals.slice(0, maxSelection - 1), animal];
    }
  }
};