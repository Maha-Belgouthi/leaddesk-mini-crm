import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Bearer Access Token to outgoing requests
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('leaddesk_access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Single in-flight promise for refresh token rotation to prevent race condition storms
let refreshPromise: Promise<string | null> | null = null;

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If 401 Unauthorized and not already retried
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('leaddesk_refresh_token');
      if (!refreshToken) {
        localStorage.removeItem('leaddesk_access_token');
        localStorage.removeItem('leaddesk_refresh_token');
        localStorage.removeItem('leaddesk_user');
        window.dispatchEvent(new Event('auth:logout'));
        return Promise.reject(error);
      }

      if (!refreshPromise) {
        refreshPromise = (async () => {
          try {
            const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
              refreshToken,
            });
            localStorage.setItem('leaddesk_access_token', data.accessToken);
            localStorage.setItem('leaddesk_refresh_token', data.refreshToken);
            return data.accessToken as string;
          } catch {
            localStorage.removeItem('leaddesk_access_token');
            localStorage.removeItem('leaddesk_refresh_token');
            localStorage.removeItem('leaddesk_user');
            window.dispatchEvent(new Event('auth:logout'));
            return null;
          } finally {
            refreshPromise = null;
          }
        })();
      }

      const newAccessToken = await refreshPromise;
      if (newAccessToken && originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      }
    }

    return Promise.reject(error);
  },
);
