import { useState, useEffect } from 'react';

const useAnimalData = () => {
  const [animalData, setAnimalData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadAnimalData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/animals.json');
        if (!response.ok) throw new Error('Failed to load animal data');
        const data = await response.json();
        setAnimalData(data);
      } catch (err) {
        console.error('Error loading animal data:', err);
        setError(err.message);
        setAnimalData({ modes: { custom_generated: [] } });
      } finally {
        setIsLoading(false);
      }
    };

    loadAnimalData();
  }, []);

  return { animalData, isLoading, error };
};

export default useAnimalData;