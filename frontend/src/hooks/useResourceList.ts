import { useState, useEffect } from 'react';
import { api } from '../api';

export function useResourceList<T extends { id: number }>(resource: string) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | 'create' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/${resource}/`);
      setItems(response.data);
    } catch (err: any) {
      console.error(`Error fetching ${resource}`, err);
      setError("Failed to load list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [resource]);

  const create = async (payload: Omit<T, 'id'>) => {
    setActionLoading('create');
    setError(null);
    try {
      const response = await api.post(`/${resource}/`, payload);
      setItems(prev => [...prev, response.data]);
      return true;
    } catch (err: any) {
        if (err.response?.status === 403) {
            setError("You do not have permission to create this resource.");
        } else {
            setError("Failed to create item.");
        }
      return false;
    } finally {
      setActionLoading(null);
    }
  };

  const update = async (id: number, payload: Partial<T>) => {
    setActionLoading(id);
    setError(null);
    try {
      const response = await api.put(`/${resource}/${id}`, payload);
      setItems(prev => prev.map(item => item.id === id ? response.data : item));
      return true;
    } catch (err: any) {
        if (err.response?.status === 403) {
            setError("You do not have permission to modify this resource.");
        } else {
            setError("Failed to update item.");
        }
      return false;
    } finally {
      setActionLoading(null);
    }
  };

  const remove = async (id: number) => {
    setActionLoading(id);
    setError(null);
    try {
      await api.delete(`/${resource}/${id}`);
      setItems(prev => prev.filter(item => item.id !== id));
      return true;
    } catch (err: any) {
        if (err.response?.status === 403) {
            setError("You do not have permission to delete this resource.");
        } else {
            setError("Failed to delete item.");
        }
      return false;
    } finally {
      setActionLoading(null);
    }
  };

  return { items, loading, actionLoading, error, create, update, remove, refetch: fetchItems };
}
