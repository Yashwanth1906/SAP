import axios from 'axios';
import { BACKEND_URL } from './config';

// Create axios instance with default configuration
export const api = axios.create({
  baseURL: BACKEND_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle common errors
    if (error.response?.status === 401) {
      // Unauthorized - clear local storage and redirect to login
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API service functions
export const apiService = {
  // Organization services
  registerOrganization: async (data: {
    name: string;
    city_country: string;
    email: string;
    password: string;
  }) => {
    const response = await api.post('/organizations/register', data);
    return response.data;
  },

  loginOrganization: async (data: {
    email: string;
    password: string;
  }) => {
    const response = await api.post('/organizations/login', data);
    return response.data;
  },

  // Model services
  uploadModel: async (data: {
    name: string;
    type: string;
    description?: string | null;
    github_url?: string | null;
    github_actions?: boolean;
    organization_id: number;
  }) => {
    const response = await api.post('/models/upload', data);
    return response.data;
  },

  getOrganizationModels: async (organizationId: number) => {
    const response = await api.get(`/models/organization/${organizationId}`);
    return response.data;
  },

  getModelVersions: async (modelId: number) => {
    const response = await api.get(`/models/${modelId}/versions`);
    return response.data;
  },

  // Model certification and publishing
  certifyModel: async (modelId: number) => {
    const response = await api.post(`/models/${modelId}/certify`);
    return response.data;
  },

  publishVersion: async (versionId: number) => {
    const response = await api.post(`/models/versions/${versionId}/publish`);
    return response.data;
  },

  // Schema services
  initializeSchema: async () => {
    const response = await api.post('/initialize-schema');
    return response.data;
  },

  clearSchema: async () => {
    const response = await api.post('/clear-schema');
    return response.data;
  },
}; 