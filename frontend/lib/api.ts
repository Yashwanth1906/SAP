import axios from 'axios';
import { BACKEND_URL } from './config';

// Create axios instance with default configuration
export const api = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API service functions
export const apiService = {
  // Organization services
  registerOrganization: async (data: {
    name: string;
    city: string;
    country: string;
    email: string;
    password: string;
    organization_type?: string;
    contact_number?: string;
    website?: string;
    registration_number?: string;
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
  certifyModel: async (
    modelId: number,
    modelFile: File,
    datasetFile: File,
    versionName: string,
    selectionData?: string,
    intentionalBias?: string
  ) => {
    const formData = new FormData();
    formData.append('model_file', modelFile);
    formData.append('dataset_file', datasetFile);
    formData.append('version_name', versionName);
    
    if (selectionData) {
      formData.append('selection_data', selectionData);
    }
    
    if (intentionalBias) {
      formData.append('intentional_bias', intentionalBias);
    }

    const response = await axios.post(`${BACKEND_URL}/models/${modelId}/certify`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
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

  // Public API services for user portal
  getAllCompanies: async () => {
    console.log('Making API call to:', `${BACKEND_URL}/api/companies`);
    const response = await api.get('/api/companies');
    return response.data;
  },

  getCompany: async (companyId: string) => {
    console.log('Making API call to:', `${BACKEND_URL}/api/companies/${companyId}`);
    const response = await api.get(`/api/companies/${companyId}`);
    return response.data;
  },

  getCompanyModels: async (companyId: string) => {
    console.log('Making API call to:', `${BACKEND_URL}/api/companies/${companyId}/models`);
    const response = await api.get(`/api/companies/${companyId}/models`);
    return response.data;
  },
}; 