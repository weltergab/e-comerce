'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api/client';

export function useStock() {
  const [stockLevels, setStockLevels] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const fetchStock = async () => {
    try {
      const response = await apiFetch('/api/stock', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      const data = await response.json();
      if (data.stock) {
        setStockLevels(data.stock);
        console.log('📦 Stock updated:', data.stock);
      }
    } catch (error) {
      console.error('Failed to fetch stock:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStock();
  }, []);

  return { stockLevels, loading, refetch: fetchStock };
}
