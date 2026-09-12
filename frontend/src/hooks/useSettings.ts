import { useState, useEffect } from 'react';
import { api } from '../api';

export function useSettings<T>(category: string, defaultValues: T) {
  const [data, setData] = useState<T>(defaultValues);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<{ field?: string, message: string, type?: 'auth' | 'generic' | 'validation' }[] | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get(`/settings/${category}`);
        setData({ ...defaultValues, ...response.data });
      } catch (err: any) {
        console.error(`Error fetching ${category} settings`, err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [category]);

  const save = async (payload: Partial<T>) => {
    setSaving(true);
    setError(null);
    const previousData = { ...data };
    
    // Optimistic update
    setData({ ...data, ...payload });

    try {
      const response = await api.put(`/settings/${category}`, payload);
      setData({ ...defaultValues, ...response.data });
      setLastSaved(new Date());
      return true;
    } catch (err: any) {
      // Rollback
      setData(previousData);
      console.error(`[Settings Save Error] ${category}:`, err.response || err);
      
      if (err.response?.status === 401) {
        setError([{ message: "Your session expired. Log in again.", type: 'auth' }]);
      } else if (err.response?.status === 422 && Array.isArray(err.response.data.detail)) {
        // Parse FastAPI validation errors
        const validationErrors = err.response.data.detail.map((d: any) => {
          if (d.loc && Array.isArray(d.loc)) {
            // FastAPI native 422 format
            return { field: d.loc[d.loc.length - 1], message: d.msg, type: 'validation' };
          }
          // Custom validation format
          return { field: d.field, message: d.message, type: 'validation' };
        });
        setError(validationErrors);
      } else if (err.response?.status === 403) {
        setError([{ message: "You do not have permission to modify these settings.", type: 'generic' }]);
      } else {
        setError([{ message: "Failed to save settings.", type: 'generic' }]);
      }
      return false;
    } finally {
      setSaving(false);
    }
  };

  return { data, loading, saving, error, lastSaved, save, setData };
}
