import axios from 'axios';
import { BACKEND_URL } from './config';


// Create axios instance with default configuration
export const api = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
    "ngrok-skip-browser-warning": "69420" 
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

  // Chat services
  sendChatMessage: async (data: {
    message: string;
    model_id?: number;
    github_url?: string;
    session_id?: string;
  }) => {
    const response = await api.post('/chat/send', data);
    return response.data;
  },

  // Streaming chat message
  sendChatMessageStream: async (data: {
    message: string;
    model_id?: number;
    github_url?: string;
    session_id?: string;
  }, onChunk: (chunk: string) => void) => {
    const response = await fetch(`${BACKEND_URL}/chat/send-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        "ngrok-skip-browser-warning": "69420"
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              return;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.chunk) {
                onChunk(parsed.chunk);
              }
            } catch (e) {
              console.warn('Failed to parse chunk:', data);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  },

  // Streaming model analysis
  analyzeModelCodeStream: async (data: {
    model_id: number;
    user_query: string;
    session_id?: string;
  }, onChunk: (chunk: string) => void) => {
    const response = await fetch(`${BACKEND_URL}/chat/analyze-model-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        "ngrok-skip-browser-warning": "69420"
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              return;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.chunk) {
                onChunk(parsed.chunk);
              }
            } catch (e) {
              console.warn('Failed to parse chunk:', data);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  },

  analyzeModelCode: async (data: {
    model_id: number;
    user_query: string;
    session_id?: string;
  }) => {
    const response = await api.post('/chat/analyze-model', data);
    return response.data;
  },

  getModelGitHubUrl: async (modelId: number) => {
    const response = await api.get(`/chat/models/${modelId}/github-url`);
    return response.data;
  },

  clearSessionContext: async (sessionId: string) => {
    const response = await api.post(`/chat/clear-session/${sessionId}`);
    return response.data;
  },

  getSessionContext: async (sessionId: string) => {
    const response = await api.get(`/chat/session/${sessionId}/context`);
    return response.data;
  },

  // Payment services
  createOrder: async (data: {
    planId: string;
    organizationId: number;
    planName: string;
    price: number;
  }) => {
    const response = await api.post('/payments/create-order', data);
    return response.data;
  },

  createSubscription: async (data: {
    planId: string;
    organizationId: number;
    planName: string;
    price: number;
  }) => {
    const response = await api.post('/payments/create-subscription', data);
    return response.data;
  },

  verifyPayment: async (data: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
    organizationId: number;
    planId: string;
    planName: string;
  }) => {
    const response = await api.post('/payments/verify-payment', data);
    return response.data;
  },

  getSubscriptionStatus: async (organizationId: number) => {
    const response = await api.get(`/payments/subscription/${organizationId}`);
    return response.data;
  },
}; 