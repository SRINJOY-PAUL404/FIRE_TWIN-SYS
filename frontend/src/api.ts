import axios from 'axios';
import type { Extinguisher, MaintenanceLog, Location, AdminUser } from './types';
import { API_BASE_URL } from './env';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Send and receive httpOnly cookies for refresh token
});

// In-memory access token storage (reduces XSS risk compared to localStorage)
let inMemoryAccessToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  inMemoryAccessToken = token;
};

export const getAuthToken = (): string | null => {
  return inMemoryAccessToken;
};

// Request Interceptor: Attach in-memory JWT Access Token
api.interceptors.request.use((config) => {
  if (inMemoryAccessToken) {
    config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
  }
  return config;
});

// Response Interceptor: Silent refresh on 401
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Skip retry on login, register, or refresh endpoints to avoid infinite loops
    const isAuthRoute =
      originalRequest.url?.includes('/api/auth/login') ||
      originalRequest.url?.includes('/api/auth/register') ||
      originalRequest.url?.includes('/api/auth/refresh') ||
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/register') ||
      originalRequest.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newAccessToken = refreshResponse.data.access_token;
        setAuthToken(newAccessToken);
        processQueue(null, newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        setAuthToken(null);
        // Force redirect to login on refresh failure
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// -------------------------------------------------------------
// Core API Calls
// -------------------------------------------------------------

export const getExtinguishers = async (): Promise<Extinguisher[]> => {
  const response = await api.get('/extinguishers/');
  return response.data;
};

export const getRecentTelemetry = async (limit: number = 20): Promise<any[]> => {
  const response = await api.get('/extinguishers/telemetry/recent', { params: { limit } });
  return response.data;
};

export const getExtinguisher = async (id: number): Promise<Extinguisher> => {
  const response = await api.get(`/extinguishers/${id}`);
  return response.data;
};

export const createExtinguisher = async (payload: Partial<Extinguisher>): Promise<Extinguisher> => {
  const response = await api.post('/extinguishers/', payload);
  return response.data;
};

export const updateExtinguisher = async (id: number, payload: Partial<Extinguisher>): Promise<Extinguisher> => {
  const response = await api.put(`/extinguishers/${id}`, payload);
  return response.data;
};

export const getLocations = async (): Promise<Location[]> => {
  const response = await api.get('/buildings/locations');
  return response.data;
};

export const predictMaintenance = async (id: number): Promise<any> => {
  const response = await api.get(`/ai/predict/${id}`);
  return response.data;
};

export const performMaintenance = async (id: number): Promise<Extinguisher> => {
  const response = await api.post(`/extinguishers/${id}/maintain`);
  return response.data;
};

export const performAIInspection = async (id: number): Promise<{ extinguisher: Extinguisher; analysis: any }> => {
  const response = await api.post(`/extinguishers/${id}/ai-inspect`);
  return response.data;
};

// -------------------------------------------------------------
// Maintenance API Calls
// -------------------------------------------------------------

export const getMaintenanceLogs = async (status?: string): Promise<MaintenanceLog[]> => {
  const params = status ? { status } : {};
  const response = await api.get('/api/maintenance/logs', { params });
  return response.data;
};

export const runAIInspect = async (
  logId: number
): Promise<{
  maintenance_log_id: number;
  extinguisher_id: number;
  fault_description: string;
  root_cause: string;
  confidence: number;
}> => {
  const response = await api.post(`/api/maintenance/${logId}/inspect`);
  return response.data;
};

export const completeMaintenance = async (logId: number, fixNotes: string): Promise<MaintenanceLog> => {
  const response = await api.post(`/api/maintenance/${logId}/complete`, { fix_notes: fixNotes });
  return response.data;
};

export const generateFixPlan = async (
  logId: number
): Promise<{
  maintenance_log_id: number;
  extinguisher_id: number;
  fix_plan: MaintenanceLog['fix_plan'];
}> => {
  const response = await api.post(`/api/maintenance/${logId}/fix-plan`);
  return response.data;
};

// -------------------------------------------------------------
// Multi-Admin Management API Calls (Super Admin Only)
// -------------------------------------------------------------

export const getAdmins = async (): Promise<AdminUser[]> => {
  const response = await api.get('/api/admins/');
  return response.data;
};

export const createAdmin = async (payload: {
  name: string;
  email: string;
  password: string;
  role: string;
  status?: string;
}): Promise<AdminUser> => {
  const response = await api.post('/api/admins/', payload);
  return response.data;
};

export const updateAdmin = async (
  id: number,
  payload: Partial<AdminUser> & { password?: string }
): Promise<AdminUser> => {
  const response = await api.patch(`/api/admins/${id}`, payload);
  return response.data;
};

export const deleteAdmin = async (id: number): Promise<{ message: string }> => {
  const response = await api.delete(`/api/admins/${id}`);
  return response.data;
};

export const getCurrentUser = async (): Promise<AdminUser> => {
  const response = await api.get('/api/auth/me');
  return response.data;
};

export const registerUser = async (payload: {
  name: string;
  email: string;
  password: string;
  role?: string;
}): Promise<{ access_token: string; token_type: string; user: AdminUser }> => {
  const response = await api.post('/api/auth/register', payload);
  return response.data;
};
