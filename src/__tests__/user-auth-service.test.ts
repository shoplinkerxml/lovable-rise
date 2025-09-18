import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UserAuthError } from '../lib/user-auth-schemas';

// Mock Supabase client
const mockSupabase = {
  auth: {
    signUp: vi.fn(),
    getSession: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn()
  },
  from: vi.fn()
};

// Mock the supabase client
vi.mock('@/integrations/supabase/client', () => ({
  get supabase() {
    return mockSupabase;
  }
}));

// Mock ProfileService
const mockProfileService = {
  getProfile: vi.fn(),
  getProfileByEmail: vi.fn(),
  createProfileWithAuth: vi.fn()
};

vi.mock('../lib/profile-service', () => ({
  get ProfileService() {
    return mockProfileService;
  }
}));

// Import UserAuthService after mocks are set up
import { UserAuthService } from '../lib/user-auth-service';

describe('UserAuthService', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        origin: 'http://localhost:3000',
        search: ''
      },
      writable: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('register', () => {
    it('should store name in user metadata with redundancy', async () => {
      const mockAuthData = {
        user: { id: 'user123', email: 'test@example.com' },
        session: null
      };
      
      mockSupabase.auth.signUp.mockResolvedValue({ data: mockAuthData, error: null });
      mockProfileService.getProfileByEmail.mockResolvedValue(null);

      const registrationData = {
        name: 'John Doe',
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        acceptTerms: true
      };

      await UserAuthService.register(registrationData);

      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          emailRedirectTo: 'http://localhost:3000/auth/callback',
          data: {
            name: 'John Doe',
            full_name: 'John Doe'
          }
        }
      });
    });

    it('should return EMAIL_CONFIRMATION_REQUIRED when no session is returned', async () => {
      const mockAuthData = {
        user: { id: 'user123', email: 'test@example.com', email_confirmed_at: null },
        session: null
      };
      
      mockSupabase.auth.signUp.mockResolvedValue({ data: mockAuthData, error: null });
      mockProfileService.getProfileByEmail.mockResolvedValue(null);

      const registrationData = {
        name: 'John Doe',
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        acceptTerms: true
      };

      const result = await UserAuthService.register(registrationData);

      expect(result.error).toBe(UserAuthError.EMAIL_CONFIRMATION_REQUIRED);
    });
  });

  describe('handleOAuthCallback', () => {
    it('should extract name with fallbacks from user metadata', async () => {
      const mockSession = {
        user: {
          id: 'user123',
          email: 'test@example.com',
          user_metadata: {
            name: 'John Doe'
          }
        },
        access_token: 'token123'
      };
      
      mockSupabase.auth.getSession.mockResolvedValue({ data: { session: mockSession } });
      mockProfileService.getProfile.mockResolvedValue(null);
      mockProfileService.createProfileWithAuth.mockResolvedValue({
        id: 'user123',
        email: 'test@example.com',
        name: 'John Doe',
        role: 'user',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      const result = await UserAuthService.handleOAuthCallback();

      expect(mockProfileService.createProfileWithAuth).toHaveBeenCalledWith(
        {
          id: 'user123',
          email: 'test@example.com',
          name: 'John Doe'
        },
        'token123'
      );
      expect(result.error).toBeNull();
    });

    it('should use full_name as fallback when name is not available', async () => {
      const mockSession = {
        user: {
          id: 'user123',
          email: 'test@example.com',
          user_metadata: {
            full_name: 'John Doe'
          }
        },
        access_token: 'token123'
      };
      
      mockSupabase.auth.getSession.mockResolvedValue({ data: { session: mockSession } });
      mockProfileService.getProfile.mockResolvedValue(null);
      mockProfileService.createProfileWithAuth.mockResolvedValue({
        id: 'user123',
        email: 'test@example.com',
        name: 'John Doe',
        role: 'user',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      await UserAuthService.handleOAuthCallback();

      expect(mockProfileService.createProfileWithAuth).toHaveBeenCalledWith(
        {
          id: 'user123',
          email: 'test@example.com',
          name: 'John Doe'
        },
        'token123'
      );
    });

    it('should use email prefix as fallback when name and full_name are not available', async () => {
      const mockSession = {
        user: {
          id: 'user123',
          email: 'test@example.com',
          user_metadata: {}
        },
        access_token: 'token123'
      };
      
      mockSupabase.auth.getSession.mockResolvedValue({ data: { session: mockSession } });
      mockProfileService.getProfile.mockResolvedValue(null);
      mockProfileService.createProfileWithAuth.mockResolvedValue({
        id: 'user123',
        email: 'test@example.com',
        name: 'test',
        role: 'user',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      await UserAuthService.handleOAuthCallback();

      expect(mockProfileService.createProfileWithAuth).toHaveBeenCalledWith(
        {
          id: 'user123',
          email: 'test@example.com',
          name: 'test'
        },
        'token123'
      );
    });
  });

  describe('login', () => {
    it('should extract name with fallbacks during login when profile does not exist', async () => {
      const mockAuthData = {
        user: {
          id: 'user123',
          email: 'test@example.com',
          user_metadata: {
            name: 'John Doe'
          }
        },
        session: {
          access_token: 'token123'
        }
      };
      
      mockSupabase.auth.signInWithPassword.mockResolvedValue({ data: mockAuthData, error: null });
      mockProfileService.getProfile.mockResolvedValue(null);
      mockProfileService.createProfileWithAuth.mockResolvedValue({
        id: 'user123',
        email: 'test@example.com',
        name: 'John Doe',
        role: 'user',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const result = await UserAuthService.login(loginData);

      expect(mockProfileService.createProfileWithAuth).toHaveBeenCalledWith(
        {
          id: 'user123',
          email: 'test@example.com',
          name: 'John Doe'
        },
        'token123'
      );
      expect(result.error).toBeNull();
    });
  });
});