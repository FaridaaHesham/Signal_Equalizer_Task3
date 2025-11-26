// useModeData.js
import { useState, useEffect } from 'react';

const useModeData = (dataType) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/${dataType}.json`);
        if (!response.ok) throw new Error(`Failed to load ${dataType} data`);
        const jsonData = await response.json();
        setData(jsonData);
      } catch (err) {
        console.error(`Error loading ${dataType} data:`, err);
        setError(err.message);
        setData({ modes: { custom_generated: [] } });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [dataType]);

  return { data, isLoading, error };
};

export default useModeData;