import axios from 'axios';
import { clearSession, isSessionExpired, markActivity } from '../auth/session';

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
});

http.interceptors.request.use((config) => {
  if (isSessionExpired()) {
    clearSession();
    if (window.location.pathname !== '/login') {
      window.location.replace('/login');
    }
    return Promise.reject(new Error('Session expired'));
  }
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    markActivity();
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearSession();
      if (window.location.pathname !== '/login') {
        window.location.replace('/login');
      }
    }
    return Promise.reject(error);
  },
);
