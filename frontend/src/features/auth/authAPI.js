import axios from 'axios';

const DEFAULT_API_BASE_URL = 'http://localhost:4000/api/v1';

function resolveApiBaseUrl() {
  if (typeof process !== 'undefined' && typeof process.env?.NEXT_PUBLIC_API_URL === 'string') {
    const value = process.env.NEXT_PUBLIC_API_URL.trim();
    if (value.length > 0) {
      return value;
    }
  }

  if (typeof globalThis !== 'undefined') {
    const runtimeConfig = globalThis.__NEXT_DATA__?.runtimeConfig;
    const publicRuntime = runtimeConfig?.publicRuntimeConfig?.NEXT_PUBLIC_API_URL;

    if (typeof publicRuntime === 'string' && publicRuntime.trim().length > 0) {
      return publicRuntime.trim();
    }
  }

  try {
    // eslint-disable-next-line no-undef
    const viteUrl = import.meta?.env?.VITE_API_URL;
    if (typeof viteUrl === 'string' && viteUrl.trim().length > 0) {
      return viteUrl.trim();
    }
  } catch {
    // ignore - we're likely not running in a Vite environment
  }

  return DEFAULT_API_BASE_URL;
}

const rawBaseUrl = resolveApiBaseUrl();
const apiClient = axios.create({
  baseURL: `${rawBaseUrl.replace(/\/+$/, '')}/`,
  withCredentials: true,
});

export const API_BASE_URL = apiClient.defaults.baseURL.replace(/\/$/, '');

export const registerUser = async (userData) => {
  const response = await apiClient.post('users/register', userData);
  return response.data;
};

export const loginUser = async (credentials) => {
  const response = await apiClient.post('users/login', credentials);
  return response.data;
};

export const requestOtp = async ({ email }) => {
  const response = await apiClient.post('auth/request-otp', { email });
  return response.data;
};

export const requestMagicLink = async ({ email, redirectTo } = {}) => {
  const payload = { email };

  if (redirectTo) {
    payload.redirectTo = redirectTo;
  }

  const response = await apiClient.post('auth/request-magic-link', payload);
  return response.data;
};

export const verifyOtp = async ({ email, otp, token } = {}) => {
  const payload = {};

  if (token) {
    payload.token = token;
  } else {
    if (email) {
      payload.email = email;
    }

    if (otp) {
      payload.otp = otp;
    }
  }

  const response = await apiClient.post('auth/verify-otp', payload);
  return response.data;
};

export const refreshAuthTokens = async ({ refreshToken } = {}) => {
  const payload = {};

  if (refreshToken) {
    payload.refreshToken = refreshToken;
  }

  const response = await apiClient.post('auth/refresh', payload);
  return response.data;
};

export const fetchSession = async () => {
  const response = await apiClient.get('auth/session');
  return response.data;
};

export const logoutUser = async () => {
  await apiClient.post('auth/logout');
};

export const submitOnboarding = async (onboardingData) => {
  const response = await apiClient.post('users/onboarding/complete', onboardingData);
  return response.data;
};
