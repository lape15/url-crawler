import axios from 'axios';
import type { Credential } from '../types/auth';

export const API = axios.create({ baseURL: 'http://localhost:8000' });

export const login = (credential: Credential) => API.post('/login', credential);

export const register = (credential: Credential) =>
  API.post('/signup', credential);

API.interceptors.request.use((config) => {
  if (config.url?.startsWith('/crawler')) {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  config.headers['Content-Type'] = 'application/json';
  return config;
});
