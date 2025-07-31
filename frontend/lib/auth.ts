// Simple authentication utility for localStorage management

export interface AuthUser {
  id: number;
  name: string;
  email: string;
}

export const auth = {
  // Store user data in localStorage
  login: (user: AuthUser) => {
    localStorage.setItem('organization_id', user.id.toString());
    localStorage.setItem('organization_name', user.name);
    localStorage.setItem('organization_email', user.email);
    localStorage.setItem('isAuthenticated', 'true');
  },

  // Get current user from localStorage
  getCurrentUser: (): AuthUser | null => {
    const id = localStorage.getItem('organization_id');
    const name = localStorage.getItem('organization_name');
    const email = localStorage.getItem('organization_email');
    const isAuthenticated = localStorage.getItem('isAuthenticated');

    if (!isAuthenticated || !id || !name || !email) {
      return null;
    }

    return {
      id: parseInt(id),
      name,
      email,
    };
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    return localStorage.getItem('isAuthenticated') === 'true';
  },

  // Logout - clear all auth data
  logout: () => {
    localStorage.removeItem('organization_id');
    localStorage.removeItem('organization_name');
    localStorage.removeItem('organization_email');
    localStorage.removeItem('isAuthenticated');
  },

  // Get organization ID
  getOrganizationId: (): number | null => {
    const id = localStorage.getItem('organization_id');
    return id ? parseInt(id) : null;
  },

  // Get organization name
  getOrganizationName: (): string | null => {
    return localStorage.getItem('organization_name');
  },

  // Get organization email
  getOrganizationEmail: (): string | null => {
    return localStorage.getItem('organization_email');
  },
}; 