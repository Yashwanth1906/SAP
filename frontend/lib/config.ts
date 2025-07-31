// Backend API configuration
export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';

// API endpoints
export const API_ENDPOINTS = {
  // Organization endpoints
  ORGANIZATION_REGISTER: `${BACKEND_URL}/organizations/register`,
  ORGANIZATION_LOGIN: `${BACKEND_URL}/organizations/login`,
  
  // Model endpoints
  MODEL_UPLOAD: `${BACKEND_URL}/models/upload`,
  GET_ORGANIZATION_MODELS: (orgId: number) => `${BACKEND_URL}/models/organization/${orgId}`,
  GET_MODEL_VERSIONS: (modelId: number) => `${BACKEND_URL}/models/${modelId}/versions`,
  
  // Schema endpoints
  INITIALIZE_SCHEMA: `${BACKEND_URL}/initialize-schema`,
  CLEAR_SCHEMA: `${BACKEND_URL}/clear-schema`,
} as const; 