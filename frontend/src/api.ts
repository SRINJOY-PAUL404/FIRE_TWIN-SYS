import axios from 'axios';
import type { Extinguisher, MaintenanceLog, Location, AdminUser } from './types';
import { API_BASE_URL } from './env';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Send and receive httpOnly cookies for refresh token
});

// Auth disabled — no token management needed
export const setAuthToken = (_token: string | null) => {};
export const getAuthToken = (): string | null => null;


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
