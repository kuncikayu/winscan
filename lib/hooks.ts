'use client';
import { useState, useEffect, useRef } from 'react';
import { fetchWithCache, CACHE_CONFIG } from './apiCache';
export function useCachedFetch<T>(
  url: string | null,
  options?: RequestInit,
  ttl?: number
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!url) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetchWithCache<T>(url, options, ttl)
      .then((result) => {
        if (mounted.current) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted.current) {
          setError(err);
          setLoading(false);
        }
      });
  }, [url, ttl]);
  return { data, loading, error };
}
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}
export function useIntersectionObserver(
  callback: () => void,
  options?: IntersectionObserverInit
) {
  const targetRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          callback();
        }
      });
    }, options);
    observer.observe(target);
    return () => {
      observer.disconnect();
    };
  }, [callback, options]);
  return targetRef;
}
export function useInfiniteScroll<T>(
  fetchMore: () => Promise<T[]>,
  hasMore: boolean
) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const loadMore = async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const newItems = await fetchMore();
      setItems((prev) => [...prev, ...newItems]);
      setPage((prev) => prev + 1);
    } catch (error) {
      console.error('Error loading more items:', error);
    } finally {
      setLoading(false);
    }
  };
  const targetRef = useIntersectionObserver(loadMore, {
    threshold: 0.5,
  });
  return { items, loading, targetRef, loadMore, page };
}
export function useWindowSize() {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });
  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return windowSize;
}
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error loading localStorage key "${key}":`, error);
      return initialValue;
    }
  });
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.warn(`Error saving localStorage key "${key}":`, error);
    }
  };
  return [storedValue, setValue] as const;
}
