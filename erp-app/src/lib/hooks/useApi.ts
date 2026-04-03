'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * A lightweight custom hook combining GET data fetching, loading states, error states,
 * and a mutation function for POST/PUT requests using Next.js App Router API routes.
 */
export function useApi<T>(endpoint: string, initialData?: T) {
  const [data, setData] = useState<T | null>(initialData ?? null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetcher = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(endpoint);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
      }
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message || 'An error occurred while fetching data');
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  // Initial fetch
  useEffect(() => {
    if (endpoint) {
      fetcher();
    }
  }, [fetcher, endpoint]);

  // Mutation helper for POST/PUT/DELETE
  const mutate = async <R = any>(method: 'POST' | 'PUT' | 'DELETE', payload?: any): Promise<R> => {
    try {
      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: payload ? JSON.stringify(payload) : undefined,
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
      }
      
      const json = await res.json();
      
      // Auto-revalidate the GET data if it was a successful mutation
      await fetcher();
      
      return json as R;
    } catch (e: any) {
      throw new Error(e.message || `An error occurred while executing ${method}`);
    }
  };

  return {
    data,
    loading,
    error,
    mutate,
    revalidate: fetcher,
  };
}
