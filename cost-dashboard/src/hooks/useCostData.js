import { useState, useEffect } from 'react';
import axios from 'axios';
import { mockCostData } from '../data/mockData';

const USE_MOCK = true;

export function useCostData() {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    (async () => {
      try {
        if (USE_MOCK) {
          setData(mockCostData);
        } else {
          const res = await axios.get(`${import.meta.env.VITE_API_URL}/cost`);
          setData(res.data);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { data, loading, error };
}