import { useState, useEffect } from 'react';
import axios from 'axios';
import { mockAnomalies } from '../data/mockData';

const USE_MOCK = true;

export function useAnomalies(costData) {
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    if (!costData || costData.length === 0) return;

    const spikes = costData.filter(s =>
      s.lastWeek > 0 && (s.thisWeek - s.lastWeek) / s.lastWeek > 0.20
    );
    if (spikes.length === 0) return;

    (async () => {
      setLoading(true);
      try {
        if (USE_MOCK) {
          setAnomalies(mockAnomalies);
        } else {
          const res = await axios.post(
            `${import.meta.env.VITE_API_URL}/anomaly`, spikes
          );
          setAnomalies(res.data);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [costData]);

  return { anomalies, loading };
}