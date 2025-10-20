import axios from 'axios';

const DEFAULT_API_BASE_URL = 'http://localhost:4000/api/v1';
const rawBaseUrl = import.meta.env.VITE_API_URL ?? DEFAULT_API_BASE_URL;

const api = axios.create({
  baseURL: `${rawBaseUrl.replace(/\/+$/, '')}/`,
  withCredentials: true,
});

export default api;
